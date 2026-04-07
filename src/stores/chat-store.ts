/**
 * Chat Store — manages conversations and streaming SSE.
 * Uses SQLite for persistence + in-memory streaming state.
 * Generation logic extracted to chat-generation.ts.
 */
import { create } from "zustand";
import type { Message, Conversation, ReasoningEffort } from "../types";
import { type StreamingState } from "./chat-generation";
import { dispatchMessageGeneration, runAutoDiscuss } from "./chat-dispatch";
import {
  createConversationDraft,
  deleteConversationRecord,
  deleteAllConversationRecords,
  deriveConversationViewState,
  getDefaultConversationTitle,
  persistConversationRecord,
  stopConversationGeneration,
} from "./chat-store-core";
import {
  branchFromMessage,
  clearConversationMessages,
  deleteMessageById,
  duplicateConversation,
  editUserMessage,
  regenerateAssistantMessage,
  renameConversation,
  searchAllMessages,
  togglePinConversation,
  updateConversationModel,
  updateConversationReasoningEffort,
} from "./chat-store-actions";

const _abortControllers = new Map<string, AbortController>();
const _streamingMessages = new Map<string, StreamingState>();

export interface ChatState {
  currentConversationId: string | null;
  isGenerating: boolean;
  activeBranchId: string | null;
  autoDiscussRemaining: number;
  autoDiscussTotalRounds: number;
  draftConversations: Record<string, Conversation>;
  streamingMessages: StreamingState[];
  createConversation: (modelId: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  deleteAllConversations: () => Promise<void>;
  setCurrentConversation: (id: string | null) => void;
  sendMessage: (
    text: string,
    images?: string[],
    options?: {
      reuseUserMessageId?: string;
      contextUntilMessageId?: string;
    },
  ) => Promise<void>;
  stopGeneration: () => void;
  startAutoDiscuss: (rounds: number, topicText?: string) => Promise<void>;
  stopAutoDiscuss: () => void;
  regenerateMessage: (messageId: string) => Promise<void>;
  duplicateConversation: (conversationId: string) => Promise<Conversation | null>;
  branchFromMessage: (messageId: string, messages: Message[]) => Promise<string>;
  switchBranch: (branchId: string | null) => void;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessageById: (messageId: string) => Promise<void>;
  clearConversationMessages: (conversationId: string) => Promise<void>;
  searchAllMessages: (query: string) => Promise<Message[]>;
  updateConversationModel: (conversationId: string, modelId: string) => Promise<void>;
  renameConversation: (conversationId: string, title: string) => Promise<void>;
  togglePinConversation: (conversationId: string) => Promise<void>;
  updateConversationReasoningEffort: (
    conversationId: string,
    reasoningEffort: ReasoningEffort | undefined,
  ) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentConversationId: null,
  isGenerating: false,
  activeBranchId: null,
  autoDiscussRemaining: 0,
  autoDiscussTotalRounds: 0,
  streamingMessages: [],
  draftConversations: {},

  createConversation: async (modelId: string) => {
    const conversation = createConversationDraft(modelId);
    set(() => ({
      currentConversationId: conversation.id,
      draftConversations: {
        [conversation.id]: conversation,
      },
    }));
    return conversation;
  },

  deleteConversation: async (id: string) => {
    const draft = get().draftConversations[id];
    if (draft) {
      set((state) => {
        const nextDrafts = { ...state.draftConversations };
        delete nextDrafts[id];
        return {
          draftConversations: nextDrafts,
          currentConversationId:
            state.currentConversationId === id ? null : state.currentConversationId,
        };
      });
      return;
    }
    await deleteConversationRecord(id);
    if (get().currentConversationId === id) {
      set({ currentConversationId: null });
    }
  },

  deleteAllConversations: async () => {
    await deleteAllConversationRecords();
    set({ currentConversationId: null, activeBranchId: null, draftConversations: {} });
  },

  setCurrentConversation: (id: string | null) => {
    const currentConversationId = get().currentConversationId;
    const currentDrafts = get().draftConversations;
    const shouldPruneDrafts = Boolean(
      Object.keys(currentDrafts).length > 0 && id && id !== currentConversationId,
    );
    const next = deriveConversationViewState(
      id,
      currentConversationId,
      _abortControllers,
      _streamingMessages,
    );
    if (!next && !shouldPruneDrafts) return;
    set((state) => {
      const partial = next ?? {};
      if (!shouldPruneDrafts) return partial;
      return {
        ...partial,
        draftConversations: Object.fromEntries(
          Object.entries(state.draftConversations).filter(([draftId]) => draftId === id),
        ),
      };
    });
  },

  sendMessage: async (
    text: string,
    images?: string[],
    options?: {
      reuseUserMessageId?: string;
      contextUntilMessageId?: string;
    },
  ) => {
    const conversationId = get().currentConversationId;
    if (!conversationId) return;
    const draftConversation = get().draftConversations[conversationId];
    if (draftConversation) {
      await persistConversationRecord(draftConversation);
      set((state) => {
        const nextDrafts = { ...state.draftConversations };
        delete nextDrafts[conversationId];
        return { draftConversations: nextDrafts };
      });
    }
    await dispatchMessageGeneration({
      conversationId,
      text,
      images,
      options,
      activeBranchId: get().activeBranchId,
      getCurrentConversationId: () => get().currentConversationId,
      abortControllers: _abortControllers,
      streamingMessages: _streamingMessages,
      setStoreState: (partial) => set(partial),
    });
  },

  stopGeneration: () => {
    const next = stopConversationGeneration(get().currentConversationId, _abortControllers);
    if (next) set(next);
  },

  startAutoDiscuss: async (rounds: number, topicText?: string) => {
    await runAutoDiscuss({
      rounds,
      topicText,
      currentConversationId: get().currentConversationId,
      isGenerating: () => get().isGenerating,
      autoDiscussRemaining: () => get().autoDiscussRemaining,
      setStoreState: (partial) => set(partial),
      sendMessage: get().sendMessage,
    });
  },

  stopAutoDiscuss: () => {
    set({ autoDiscussRemaining: 0 });
    get().stopGeneration();
  },

  regenerateMessage: async (messageId: string) => {
    await regenerateAssistantMessage(
      get().currentConversationId ?? "",
      get().activeBranchId,
      get().isGenerating,
      messageId,
      get().sendMessage,
    );
  },

  duplicateConversation: async (conversationId: string) => {
    const conversation = await duplicateConversation(conversationId);
    if (conversation) set({ currentConversationId: conversation.id, activeBranchId: null });
    return conversation;
  },

  editMessage: async (messageId: string, newContent: string) => {
    await editUserMessage(
      get().currentConversationId ?? "",
      get().activeBranchId,
      get().isGenerating,
      messageId,
      newContent,
      get().sendMessage,
    );
  },

  deleteMessageById: async (messageId: string) => {
    await deleteMessageById(messageId, get().currentConversationId);
  },

  clearConversationMessages: async (conversationId: string) => {
    if (get().draftConversations[conversationId]) {
      return;
    }
    await clearConversationMessages(conversationId);
  },

  updateConversationModel: async (conversationId: string, modelId: string) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      set((state) => ({
        draftConversations: {
          ...state.draftConversations,
          [conversationId]: {
            ...draft,
            modelId,
            title:
              draft.title === getDefaultConversationTitle(draft.modelId)
                ? getDefaultConversationTitle(modelId)
                : draft.title,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      return;
    }
    await updateConversationModel(conversationId, modelId);
  },

  renameConversation: async (conversationId: string, title: string) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      set((state) => ({
        draftConversations: {
          ...state.draftConversations,
          [conversationId]: {
            ...draft,
            title,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      return;
    }
    await renameConversation(conversationId, title);
  },

  togglePinConversation: async (conversationId: string) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      set((state) => ({
        draftConversations: {
          ...state.draftConversations,
          [conversationId]: {
            ...draft,
            pinned: !draft.pinned,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      return;
    }
    await togglePinConversation(conversationId);
  },

  updateConversationReasoningEffort: async (
    conversationId: string,
    reasoningEffort: ReasoningEffort | undefined,
  ) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      set((state) => ({
        draftConversations: {
          ...state.draftConversations,
          [conversationId]: {
            ...draft,
            reasoningEffort,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      return;
    }
    await updateConversationReasoningEffort(conversationId, reasoningEffort);
  },

  branchFromMessage: async (messageId: string, messages: Message[]) => {
    return branchFromMessage(
      messageId,
      messages,
      (branchId) => set({ activeBranchId: branchId }),
      get().currentConversationId,
    );
  },

  switchBranch: (branchId: string | null) => {
    set({ activeBranchId: branchId });
  },

  searchAllMessages: async (query: string) => {
    return searchAllMessages(query);
  },
}));
