/**
 * Chat Store — manages conversations and streaming SSE.
 * Uses SQLite for persistence + in-memory streaming state.
 * Generation logic extracted to chat-generation.ts.
 */
import { create } from "zustand";
import type {
  Message,
  Conversation,
  ConversationParticipant,
  SpeakingOrder,
  ReasoningEffort,
} from "../types";
import { getConversation } from "../storage/database";
import { generateId } from "../lib/id";
import { type StreamingState } from "./chat-generation";
import { dispatchMessageGeneration, runAutoDiscuss } from "./chat-dispatch";
import {
  autoTitle,
  createConversationDraft,
  deleteConversationRecord,
  deleteAllConversationRecords,
  deriveConversationViewState,
  getDefaultConversationTitle,
  persistConversationRecord,
  stopConversationGeneration,
} from "./chat-store-core";
import {
  addParticipant,
  addParticipants,
  branchFromMessage,
  clearConversationMessages,
  deleteMessageById,
  duplicateConversation,
  editUserMessage,
  regenerateAssistantMessage,
  removeParticipant,
  renameConversation,
  reorderParticipants,
  searchAllMessages,
  togglePinConversation,
  updateGroupSystemPrompt,
  updateParticipantIdentity,
  updateParticipantModel,
  updateParticipantReasoningEffort,
  updateSpeakingOrder,
} from "./chat-store-actions";

// Per-conversation generation tracking (module-level to avoid zustand serialization)
const _abortControllers = new Map<string, AbortController>();
const _streamingMessages = new Map<string, StreamingState>();

export interface ChatState {
  currentConversationId: string | null;
  isGenerating: boolean;
  activeBranchId: string | null;
  autoDiscussRemaining: number;
  autoDiscussTotalRounds: number;
  draftConversations: Record<string, Conversation>;

  // In-memory streaming state — not persisted, used for rAF updates
  streamingMessages: StreamingState[];

  createConversation: (
    modelId: string,
    extraModelIds?: string[],
    membersWithIdentity?: { modelId: string; identityId: string | null }[],
  ) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  deleteAllConversations: () => Promise<void>;
  setCurrentConversation: (id: string | null) => void;
  sendMessage: (
    text: string,
    images?: string[],
    options?: {
      reuseUserMessageId?: string;
      mentionedParticipantIds?: string[];
      targetParticipantIds?: string[];
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
  updateParticipantIdentity: (
    conversationId: string,
    participantId: string,
    identityId: string | null,
  ) => Promise<void>;
  updateParticipantModel: (
    conversationId: string,
    participantId: string,
    modelId: string,
  ) => Promise<void>;
  addParticipant: (
    conversationId: string,
    modelId: string,
    identityId?: string | null,
  ) => Promise<void>;
  addParticipants: (
    conversationId: string,
    members: { modelId: string; identityId: string | null }[],
  ) => Promise<void>;
  removeParticipant: (conversationId: string, participantId: string) => Promise<void>;
  renameConversation: (conversationId: string, title: string) => Promise<void>;
  togglePinConversation: (conversationId: string) => Promise<void>;
  updateSpeakingOrder: (conversationId: string, order: SpeakingOrder) => Promise<void>;
  updateGroupSystemPrompt: (conversationId: string, prompt: string) => Promise<void>;
  reorderParticipants: (conversationId: string, participantIds: string[]) => Promise<void>;
  updateParticipantReasoningEffort: (
    conversationId: string,
    participantId: string,
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

  createConversation: async (
    modelId: string,
    extraModelIds?: string[],
    membersWithIdentity?: { modelId: string; identityId: string | null }[],
  ) => {
    const conversation = createConversationDraft(modelId, extraModelIds, membersWithIdentity);
    set((state) => ({
      currentConversationId: conversation.id,
      draftConversations: {
        // Only keep the fresh draft to avoid leaving abandoned blank conversations in memory.
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
      mentionedParticipantIds?: string[];
      targetParticipantIds?: string[];
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

  updateParticipantIdentity: async (
    conversationId: string,
    participantId: string,
    identityId: string | null,
  ) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      const participants = draft.participants.map((participant) =>
        participant.id === participantId ? { ...participant, identityId } : participant,
      );
      const previousAutoTitle = getDefaultConversationTitle(draft.participants);
      const nextTitle =
        draft.title === previousAutoTitle ? getDefaultConversationTitle(participants) : draft.title;
      set((state) => ({
        draftConversations: {
          ...state.draftConversations,
          [conversationId]: {
            ...draft,
            participants,
            title: nextTitle,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      return;
    }
    await updateParticipantIdentity(conversationId, participantId, identityId);
  },

  updateParticipantModel: async (
    conversationId: string,
    participantId: string,
    modelId: string,
  ) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      const participants = draft.participants.map((participant) =>
        participant.id === participantId ? { ...participant, modelId } : participant,
      );
      const previousAutoTitle = getDefaultConversationTitle(draft.participants);
      const nextTitle =
        draft.title === previousAutoTitle ? getDefaultConversationTitle(participants) : draft.title;
      set((state) => ({
        draftConversations: {
          ...state.draftConversations,
          [conversationId]: {
            ...draft,
            participants,
            title: nextTitle,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      return;
    }
    await updateParticipantModel(conversationId, participantId, modelId);
  },

  addParticipant: async (conversationId: string, modelId: string, identityId?: string | null) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      const participants: ConversationParticipant[] = [
        ...draft.participants,
        { id: generateId(), modelId, identityId: identityId ?? null },
      ];
      const previousAutoTitle =
        draft.participants.length > 1
          ? autoTitle(draft.participants)
          : getDefaultConversationTitle(draft.participants);
      const nextTitle =
        draft.title === previousAutoTitle ? getDefaultConversationTitle(participants) : draft.title;
      set((state) => ({
        draftConversations: {
          ...state.draftConversations,
          [conversationId]: {
            ...draft,
            participants,
            type: participants.length > 1 ? "group" : "single",
            title: nextTitle,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      return;
    }
    await addParticipant(conversationId, modelId, identityId);
  },

  addParticipants: async (
    conversationId: string,
    members: { modelId: string; identityId: string | null }[],
  ) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      const participants: ConversationParticipant[] = [
        ...draft.participants,
        ...members.map((member) => ({
          id: generateId(),
          modelId: member.modelId,
          identityId: member.identityId,
        })),
      ];
      const previousAutoTitle =
        draft.participants.length > 1
          ? autoTitle(draft.participants)
          : getDefaultConversationTitle(draft.participants);
      const nextTitle =
        draft.title === previousAutoTitle ? getDefaultConversationTitle(participants) : draft.title;
      set((state) => ({
        draftConversations: {
          ...state.draftConversations,
          [conversationId]: {
            ...draft,
            participants,
            type: participants.length > 1 ? "group" : "single",
            title: nextTitle,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      return;
    }
    await addParticipants(conversationId, members);
  },

  removeParticipant: async (conversationId: string, participantId: string) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      const participants = draft.participants.filter(
        (participant) => participant.id !== participantId,
      );
      const previousAutoTitle =
        draft.participants.length > 1
          ? autoTitle(draft.participants)
          : getDefaultConversationTitle(draft.participants);
      const nextTitle =
        draft.title === previousAutoTitle ? getDefaultConversationTitle(participants) : draft.title;
      set((state) => ({
        draftConversations: {
          ...state.draftConversations,
          [conversationId]: {
            ...draft,
            participants,
            type: participants.length > 1 ? "group" : "single",
            title: nextTitle,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      return;
    }
    await removeParticipant(conversationId, participantId);
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

  updateSpeakingOrder: async (conversationId: string, order) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      set((state) => ({
        draftConversations: {
          ...state.draftConversations,
          [conversationId]: {
            ...draft,
            speakingOrder: order,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      return;
    }
    await updateSpeakingOrder(conversationId, order);
  },

  updateGroupSystemPrompt: async (conversationId: string, prompt: string) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      set((state) => ({
        draftConversations: {
          ...state.draftConversations,
          [conversationId]: {
            ...draft,
            groupSystemPrompt: prompt,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      return;
    }
    await updateGroupSystemPrompt(conversationId, prompt);
  },

  reorderParticipants: async (conversationId: string, participantIds: string[]) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      const participantMap = new Map(
        draft.participants.map((participant) => [participant.id, participant]),
      );
      const participants = participantIds
        .map((participantId) => participantMap.get(participantId))
        .filter((participant): participant is ConversationParticipant => !!participant);
      if (participants.length === draft.participants.length) {
        set((state) => ({
          draftConversations: {
            ...state.draftConversations,
            [conversationId]: {
              ...draft,
              participants,
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      }
      return;
    }
    await reorderParticipants(conversationId, participantIds);
  },

  updateParticipantReasoningEffort: async (
    conversationId: string,
    participantId: string,
    reasoningEffort: ReasoningEffort | undefined,
  ) => {
    const draft = get().draftConversations[conversationId];
    if (draft) {
      const participants = draft.participants.map((participant) =>
        participant.id === participantId ? { ...participant, reasoningEffort } : participant,
      );
      set((state) => ({
        draftConversations: {
          ...state.draftConversations,
          [conversationId]: {
            ...draft,
            participants,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      return;
    }
    await updateParticipantReasoningEffort(conversationId, participantId, reasoningEffort);
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
