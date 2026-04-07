import type { Conversation } from "../types";
import {
  deleteConversation as dbDeleteConversation,
  deleteAllConversations as dbDeleteAllConversations,
  insertConversation,
} from "../storage/database";
import { notifyDbChange } from "../hooks/useDatabase";
import { useProviderStore } from "./provider-store";
import { generateId } from "../lib/id";
import i18n from "../i18n";
import type { StreamingState } from "./chat-generation";
import { createSingleConversationDraft } from "../lib/conversation-single";

export function autoTitle(modelId: string): string {
  const providerStore = useProviderStore.getState();
  return providerStore.getModelById(modelId)?.displayName ?? modelId;
}

export function getDefaultConversationTitle(modelId?: string): string {
  const providerStore = useProviderStore.getState();
  return (
    (modelId ? providerStore.getModelById(modelId)?.displayName : null) ??
    i18n.t("chats.newChat", { defaultValue: "New Chat" })
  );
}

export function createConversationDraft(modelId: string): Conversation {
  const now = new Date().toISOString();
  return createSingleConversationDraft({
    id: generateId(),
    modelId,
    title: getDefaultConversationTitle(modelId),
    now,
  });
}

export async function persistConversationRecord(conversation: Conversation): Promise<void> {
  await insertConversation(conversation);
  notifyDbChange("conversations");
}

export async function createConversationRecord(
  modelId: string,
): Promise<Conversation> {
  const conversation = createConversationDraft(modelId);

  await persistConversationRecord(conversation);
  return conversation;
}

export async function deleteConversationRecord(id: string): Promise<void> {
  await dbDeleteConversation(id);
  notifyDbChange("conversations");
}

export async function deleteAllConversationRecords(): Promise<void> {
  await dbDeleteAllConversations();
  notifyDbChange("all");
}

export function deriveConversationViewState(
  id: string | null,
  currentConversationId: string | null,
  abortControllers: Map<string, AbortController>,
  streamingMessages: Map<string, StreamingState>,
): {
  currentConversationId: string | null;
  isGenerating: boolean;
  streamingMessages: StreamingState[];
} | null {
  if (id === currentConversationId) return null;
  return {
    currentConversationId: id,
    isGenerating: id ? abortControllers.has(id) : false,
    streamingMessages: id
      ? Array.from(streamingMessages.values()).filter((state) => state.cid === id)
      : [],
  };
}

export function stopConversationGeneration(
  currentConversationId: string | null,
  abortControllers: Map<string, AbortController>,
): { autoDiscussRemaining: number } | null {
  if (!currentConversationId) return null;
  const controller = abortControllers.get(currentConversationId);
  if (!controller) return null;
  controller.abort();
  abortControllers.delete(currentConversationId);
  return { autoDiscussRemaining: 0 };
}
