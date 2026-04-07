import type { Conversation, Message, ReasoningEffort } from "../types";
import {
  clearMessages as dbClearMessages,
  deleteMessage as dbDeleteMessage,
  getConversation,
  getRecentMessages,
  insertMessages,
  insertConversation,
  updateConversation,
  updateMessage,
} from "../storage/database";
import { notifyDbChange } from "../hooks/useDatabase";
import { useProviderStore } from "./provider-store";
import { generateId } from "../lib/id";

export async function regenerateAssistantMessage(
  conversationId: string,
  activeBranchId: string | null,
  isGenerating: boolean,
  messageId: string,
  resend: (
    content: string,
    images?: string[],
    options?: {
      reuseUserMessageId?: string;
      contextUntilMessageId?: string;
    },
  ) => Promise<void>,
): Promise<void> {
  if (!conversationId || isGenerating) return;
  const messages = await getRecentMessages(conversationId, activeBranchId, 200);
  const message = messages.find((item) => item.id === messageId);
  if (!message || message.role !== "assistant") return;

  const messageIndex = messages.findIndex((item) => item.id === messageId);
  const previousUserMessage = messages
    .slice(0, messageIndex)
    .reverse()
    .find((item) => item.role === "user");
  if (!previousUserMessage) return;

  await dbDeleteMessage(messageId);
  notifyDbChange("messages", conversationId);

  await resend(previousUserMessage.content, previousUserMessage.images, {
    reuseUserMessageId: previousUserMessage.id,
  });
}

export async function editUserMessage(
  conversationId: string,
  activeBranchId: string | null,
  isGenerating: boolean,
  messageId: string,
  newContent: string,
  resend: (
    content: string,
    images?: string[],
    options?: {
      reuseUserMessageId?: string;
      contextUntilMessageId?: string;
    },
  ) => Promise<void>,
): Promise<void> {
  if (!conversationId || isGenerating) return;

  const messages = await getRecentMessages(conversationId, activeBranchId, 200);
  const messageIndex = messages.findIndex((item) => item.id === messageId);
  if (messageIndex < 0) return;

  const message = messages[messageIndex];
  if (message.role !== "user") return;

  await updateMessage(messageId, { content: newContent });

  const messagesToReplace: Message[] = [];
  for (const candidate of messages.slice(messageIndex + 1)) {
    if (candidate.role === "user") break;
    messagesToReplace.push(candidate);
  }

  for (const replacedMessage of messagesToReplace) {
    await dbDeleteMessage(replacedMessage.id);
  }
  notifyDbChange("messages", conversationId);

  await resend(newContent, message.images, {
    reuseUserMessageId: messageId,
    contextUntilMessageId: messageId,
  });
}

export async function deleteMessageById(
  messageId: string,
  conversationId: string | null,
): Promise<void> {
  await dbDeleteMessage(messageId);
  if (conversationId) notifyDbChange("messages", conversationId);
  else notifyDbChange("all");
}

export async function clearConversationMessages(conversationId: string): Promise<void> {
  await dbClearMessages(conversationId);
  await updateConversation(conversationId, { lastMessage: null, lastMessageAt: null });
  notifyDbChange("messages", conversationId);
  notifyDbChange("conversations");
}

export async function updateConversationModel(
  conversationId: string,
  modelId: string,
): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) return;
  const providerStore = useProviderStore.getState();
  const model = providerStore.getModelById(modelId);
  await updateConversation(conversationId, {
    modelId,
    title: model?.displayName ?? conversation.title,
  });
  notifyDbChange("conversations");
}

export async function updateConversationReasoningEffort(
  conversationId: string,
  reasoningEffort: ReasoningEffort | undefined,
): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) return;
  await updateConversation(conversationId, { reasoningEffort });
  notifyDbChange("conversations");
}

export async function renameConversation(conversationId: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) return;
  await updateConversation(conversationId, { title: trimmed });
  notifyDbChange("conversations");
}

export async function togglePinConversation(conversationId: string): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) return;
  await updateConversation(conversationId, { pinned: !conversation.pinned });
  notifyDbChange("conversations");
}

export async function branchFromMessage(
  messageId: string,
  messages: Message[],
  setActiveBranchId: (branchId: string) => void,
  currentConversationId: string | null,
): Promise<string> {
  const branchId = generateId();
  const messageIndex = messages.findIndex((message) => message.id === messageId);
  if (messageIndex < 0) return branchId;
  const branchedMessages = messages.slice(0, messageIndex + 1).map((message) => ({
    ...message,
    id: generateId(),
    branchId,
  }));
  await insertMessages(branchedMessages);
  setActiveBranchId(branchId);
  if (currentConversationId) notifyDbChange("messages", currentConversationId);
  return branchId;
}

export async function searchAllMessages(query: string): Promise<Message[]> {
  const { searchMessages } = await import("../storage/database");
  return searchMessages(query);
}

export async function duplicateConversation(conversationId: string): Promise<Conversation | null> {
  const conversation = await getConversation(conversationId);
  if (!conversation) return null;

  const duplicated: Conversation = {
    ...conversation,
    id: generateId(),
    lastMessage: null,
    lastMessageAt: null,
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await insertConversation(duplicated);
  notifyDbChange("conversations");
  return duplicated;
}
