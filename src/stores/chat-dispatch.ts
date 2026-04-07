import type { Conversation, Message } from "../types";
import { MessageStatus } from "../types";
import { buildApiMessagesForConversation, createUserMessage } from "./chat-message-builder";
import {
  getConversation,
  getRecentMessages,
  insertMessage,
  updateConversation,
} from "../storage/database";
import { notifyDbChange } from "../hooks/useDatabase";
import { useProviderStore } from "./provider-store";
import { buildProviderHeaders } from "../services/provider-headers";
import { useSettingsStore } from "./settings-store";
import {
  generateForParticipant,
  type GenerationContext,
  type StreamingState,
} from "./chat-generation";
import { estimateMessagesTokens, compressIfNeeded } from "../lib/context-compression";
import { generateId } from "../lib/id";
import i18n from "../i18n";
import { buildWorkspaceContextBundle } from "../services/workspace";

const MAX_HISTORY = 200;

export async function preComputeCompression(
  cid: string,
  conversation: Conversation,
  userMsg: Message,
  abortController: AbortController,
  activeBranchId: string | null,
  sourceMessages?: Message[],
  workspaceContext?: { tree?: string; files: Array<{ path: string; content: string }> },
): Promise<string | null> {
  const compressionSettings = useSettingsStore.getState().settings;
  if (!compressionSettings.contextCompressionEnabled) return null;

  const providerStore = useProviderStore.getState();
  const model = providerStore.getModelById(conversation.modelId);
  const provider = model ? providerStore.getProviderById(model.providerId) : null;
  if (!model || !provider || provider.type !== "openai") return null;

  const allMsgs = sourceMessages ?? (await getRecentMessages(cid, activeBranchId, MAX_HISTORY));
  const filtered = allMsgs.filter(
    (message) => message.status === MessageStatus.SUCCESS || message.id === userMsg.id,
  );
  const sampleApiMessages = buildApiMessagesForConversation(filtered, conversation, {
    workspaceTree: workspaceContext?.tree,
    workspaceFiles: workspaceContext?.files,
  });
  const tokenCount = estimateMessagesTokens(sampleApiMessages);
  if (tokenCount <= compressionSettings.contextCompressionThreshold) return null;

  const baseUrl = provider.baseUrl.replace(/\/+$/, "");
  const headers = buildProviderHeaders(provider, { "Content-Type": "application/json" });
  const result = await compressIfNeeded(sampleApiMessages, {
    maxTokens: compressionSettings.contextCompressionThreshold,
    keepRecentCount: 6,
    baseUrl,
    headers,
    model: model.modelId,
    apiFormat: provider.apiFormat,
    signal: abortController.signal,
  });
  if (!result.compressed) return null;

  const summaryMsg = result.messages.find(
    (message) =>
      typeof message.content === "string" &&
      (message.content as string).startsWith("[Previous conversation summary]"),
  );
  return summaryMsg ? (summaryMsg.content as string) : null;
}

export async function dispatchMessageGeneration(args: {
  conversationId: string;
  text: string;
  images?: string[];
  options?: {
    reuseUserMessageId?: string;
    contextUntilMessageId?: string;
  };
  activeBranchId: string | null;
  getCurrentConversationId: () => string | null;
  abortControllers: Map<string, AbortController>;
  streamingMessages: Map<string, StreamingState>;
  setStoreState: (partial: {
    isGenerating?: boolean;
    streamingMessages?: StreamingState[];
  }) => void;
}): Promise<void> {
  const {
    conversationId,
    text,
    images,
    options,
    activeBranchId,
    getCurrentConversationId,
    abortControllers,
    streamingMessages,
    setStoreState,
  } = args;

  const conversation = await getConversation(conversationId);
  if (!conversation) return;
  const cid = conversationId;

  let userMsg: Message;
  let sourceMessages: Message[] | undefined;

  if (options?.reuseUserMessageId) {
    const allMessages = await getRecentMessages(conversationId, activeBranchId, MAX_HISTORY);
    const existing = allMessages.find((message) => message.id === options.reuseUserMessageId);
    if (!existing || existing.role !== "user") return;
    userMsg = existing;
    if (options.contextUntilMessageId) {
      const contextEndIndex = allMessages.findIndex(
        (message) => message.id === options.contextUntilMessageId,
      );
      if (contextEndIndex >= 0) {
        sourceMessages = allMessages.slice(0, contextEndIndex + 1);
      }
    }
  } else {
    userMsg = createUserMessage(generateId(), cid, text, images ?? [], activeBranchId);
    await insertMessage(userMsg);
    updateConversation(cid, { lastMessage: text, lastMessageAt: userMsg.createdAt }).catch(
      () => {},
    );
    notifyDbChange("messages", cid);
    notifyDbChange("conversations");
  }

  const abortController = new AbortController();
  abortControllers.set(cid, abortController);
  if (cid === getCurrentConversationId()) setStoreState({ isGenerating: true });

  const workspaceContext = conversation.workspaceDir
    ? await buildWorkspaceContextBundle(conversation.workspaceDir, text, { includeTree: true })
    : { files: [] as Array<{ path: string; content: string }>, tree: undefined };
  const cachedCompressionSummary = await preComputeCompression(
    cid,
    conversation,
    userMsg,
    abortController,
    activeBranchId,
    sourceMessages,
    workspaceContext,
  );
  const compressionSettings = useSettingsStore.getState().settings;

  const ctx: GenerationContext = {
    cid,
    conversation,
    userMsg,
    activeBranchId,
    abortController,
    cachedCompressionSummary,
    compressionEnabled: compressionSettings.contextCompressionEnabled,
    compressionThreshold: compressionSettings.contextCompressionThreshold,
    streamingMessages,
    getCurrentConversationId,
    setStoreState: (partial) => setStoreState(partial),
    workspaceTree: workspaceContext.tree,
    workspaceFiles: workspaceContext.files,
    isRetry: !!options?.reuseUserMessageId,
    sourceMessages,
  };

  try {
    if (!abortController.signal.aborted) {
      await generateForParticipant(ctx, 0);
    }
  } finally {
    abortControllers.delete(cid);
    for (const [key, value] of streamingMessages) {
      if (value.cid === cid) streamingMessages.delete(key);
    }
    if (cid === getCurrentConversationId()) {
      setStoreState({ isGenerating: false, streamingMessages: [] });
    }
  }
}

export async function runAutoDiscuss(args: {
  rounds: number;
  topicText?: string;
  currentConversationId: string | null;
  isGenerating: () => boolean;
  autoDiscussRemaining: () => number;
  setStoreState: (partial: {
    autoDiscussRemaining?: number;
    autoDiscussTotalRounds?: number;
  }) => void;
  sendMessage: (
    text: string,
    images?: string[],
    options?: {
      reuseUserMessageId?: string;
      contextUntilMessageId?: string;
    },
  ) => Promise<void>;
}): Promise<void> {
  const { rounds, topicText } = args;
  const convId = args.currentConversationId;
  if (!convId) return;

  const conversation = await getConversation(convId);
  if (!conversation) return;

  args.setStoreState({ autoDiscussRemaining: rounds, autoDiscussTotalRounds: rounds });

  while (args.isGenerating()) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (args.autoDiscussRemaining() <= 0) return;
  }

  const continuePrompt = i18n.t("chat.continue", { defaultValue: "Continue" });

  if (topicText?.trim()) {
    await args.sendMessage(topicText.trim());
  }
  args.setStoreState({ autoDiscussRemaining: rounds - 1 });

  for (let round = 1; round < rounds; round++) {
    if (args.autoDiscussRemaining() <= 0) break;
    await args.sendMessage(continuePrompt);
    args.setStoreState({ autoDiscussRemaining: Math.max(0, rounds - round - 1) });
  }

  args.setStoreState({ autoDiscussRemaining: 0, autoDiscussTotalRounds: 0 });
}
