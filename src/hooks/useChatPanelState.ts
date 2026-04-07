import { useCallback, useMemo, useState } from "react";
import { useConversations, useMessages } from "./useDatabase";
import { useProviderStore } from "../stores/provider-store";
import { useChatStore, type ChatState } from "../stores/chat-store";
import type { Conversation, Message, Model } from "../types";

type ChatStoreState = ReturnType<typeof useChatStore.getState>;

export function useChatPanelState(conversationId: string): {
  conversations: Conversation[];
  messages: Message[];
  conv: Conversation | undefined;
  getModelById: (id: string) => Model | undefined;
  clearConversationMessages: ChatState["clearConversationMessages"];
  updateConversationModel: ChatState["updateConversationModel"];
  updateConversationReasoningEffort: ChatState["updateConversationReasoningEffort"];
  duplicateConversation: ChatState["duplicateConversation"];
  model: Model | null;
  showModelPicker: boolean;
  setShowModelPicker: React.Dispatch<React.SetStateAction<boolean>>;
  isExporting: boolean;
  setIsExporting: React.Dispatch<React.SetStateAction<boolean>>;
  handleModelPickerSelect: (modelId: string) => void;
} {
  const conversations = useConversations();
  const activeBranchId = useChatStore((s: ChatStoreState) => s.activeBranchId);
  const draftConversation = useChatStore(
    (s: ChatStoreState) => s.draftConversations[conversationId],
  );
  const messages = useMessages(conversationId, activeBranchId);

  const conv = useMemo(
    () =>
      (conversations ?? []).find(
        (conversation: Conversation) => conversation.id === conversationId,
      ) ?? draftConversation,
    [conversations, conversationId, draftConversation],
  );

  const getModelById = useProviderStore((s) => s.getModelById);
  const clearConversationMessages = useChatStore((s: ChatState) => s.clearConversationMessages);
  const updateConversationModel = useChatStore((s: ChatState) => s.updateConversationModel);
  const updateConversationReasoningEffort = useChatStore(
    (s: ChatState) => s.updateConversationReasoningEffort,
  );
  const duplicateConversation = useChatStore((s: ChatState) => s.duplicateConversation);

  const [showModelPicker, setShowModelPicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const model = conv ? (getModelById(conv.modelId) ?? null) : null;

  const handleModelPickerSelect = useCallback(
    (modelId: string) => {
      setShowModelPicker(false);
      if (conv) {
        updateConversationModel(conversationId, modelId);
      }
    },
    [conv, conversationId, updateConversationModel],
  );

  return {
    conversations,
    messages,
    conv,
    getModelById,
    clearConversationMessages,
    updateConversationModel,
    updateConversationReasoningEffort,
    duplicateConversation,
    model,
    showModelPicker,
    setShowModelPicker,
    isExporting,
    setIsExporting,
    handleModelPickerSelect,
  };
}
