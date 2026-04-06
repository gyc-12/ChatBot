import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CopyPlus, Download, Eraser, Pin, PencilLine, Trash2 } from "lucide-react";
import { ChatView } from "../shared/ChatView";
import { ModelPicker } from "../shared/ModelPicker";
import { ChatShellHeader } from "../shared/ChatShellHeader";
import { useChatPanelState } from "../../hooks/useChatPanelState";
import { useChatStore } from "../../stores/chat-store";
import { useConfirm } from "../shared/ConfirmDialogProvider";
import { exportConversationAsMarkdown, exportConversationAsPdf } from "../../services/export";
import type { ReasoningEffort } from "../../types";
import { getReasoningControlState } from "../../lib/reasoning-control-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function DesktopChatPanel({ conversationId }: { conversationId: string }) {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const {
    conv,
    messages,
    model,
    currentParticipant,
    showModelPicker,
    setShowModelPicker,
    isExporting,
    setIsExporting,
    handleModelPickerSelect,
    clearConversationMessages,
    duplicateConversation,
    updateParticipantReasoningEffort,
  } = useChatPanelState(conversationId);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const renameConversation = useChatStore((state) => state.renameConversation);
  const togglePinConversation = useChatStore((state) => state.togglePinConversation);

  const reasoningHint = useMemo(
    () =>
      messages.some((message) => !!message.reasoningContent)
        ? "Enhanced reasoning active"
        : undefined,
    [messages],
  );
  const { canConfigureReasoning, reasoningEffort } = useMemo(
    () => getReasoningControlState(model, currentParticipant),
    [currentParticipant, model],
  );

  const handleSelectReasoningEffort = useCallback(async (value: ReasoningEffort | undefined) => {
    if (!currentParticipant || !canConfigureReasoning) return;
    await updateParticipantReasoningEffort(
      conversationId,
      currentParticipant.id,
      value,
    );
  }, [
    canConfigureReasoning,
    conversationId,
    currentParticipant,
    updateParticipantReasoningEffort,
  ]);

  if (!conv || !currentParticipant) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--background)]">
      <div className="flex items-center justify-between">
        <ChatShellHeader
          modelName={model?.displayName ?? t("chat.selectModel")}
          tokenText={undefined}
          reasoningHint={reasoningHint}
          onModelClick={() => setShowModelPicker(true)}
          onMoreClick={() => {}}
        />
        <div className="mr-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]">
                •••
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-[min(24rem,calc(100vw-32px))] rounded-[28px] border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--card)_94%,white_6%)] p-2 shadow-[0px_20px_56px_rgba(25,28,29,0.16)] backdrop-blur-xl"
            >
              <DropdownMenuItem
                onClick={() => setShowModelPicker(true)}
                className="min-h-12 rounded-2xl px-4 py-3 text-[15px] font-semibold text-[var(--foreground)] [&_svg]:size-[18px]"
              >
                <PencilLine size={14} />
                {t("chat.selectModel")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => togglePinConversation(conversationId)}
                className="min-h-12 rounded-2xl px-4 py-3 text-[15px] font-semibold text-[var(--foreground)] [&_svg]:size-[18px]"
              >
                <Pin size={14} />
                {conv.pinned ? t("chat.unpinConversation") : t("chat.pinConversation")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await duplicateConversation(conversationId);
                }}
                className="min-h-12 rounded-2xl px-4 py-3 text-[15px] font-semibold text-[var(--foreground)] [&_svg]:size-[18px]"
              >
                <CopyPlus size={14} />
                {t("chat.duplicateConversation", { defaultValue: "Duplicate" })}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const nextTitle = window.prompt(t("chat.rename"), conv.title);
                  if (nextTitle && nextTitle.trim()) {
                    renameConversation(conversationId, nextTitle.trim());
                  }
                }}
                className="min-h-12 rounded-2xl px-4 py-3 text-[15px] font-semibold text-[var(--foreground)] [&_svg]:size-[18px]"
              >
                <PencilLine size={14} />
                {t("chat.rename")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="mx-2 my-1 bg-[color:var(--border)]" />
              <DropdownMenuItem
                disabled={isExporting || messages.length === 0}
                onClick={async () => {
                  if (messages.length === 0) return;
                  setIsExporting(true);
                  try {
                    exportConversationAsMarkdown({
                      conversation: conv,
                      messages,
                      titleFallback: t("chat.chatTitle"),
                      youLabel: t("chat.you"),
                      thoughtProcessLabel: t("chat.thoughtProcess"),
                    });
                  } finally {
                    setIsExporting(false);
                  }
                }}
                className="min-h-12 rounded-2xl px-4 py-3 text-[15px] font-semibold text-[var(--foreground)] [&_svg]:size-[18px]"
              >
                <Download size={14} />
                {t("chat.exportMarkdown", { defaultValue: "Export Markdown" })}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isExporting || messages.length === 0}
                onClick={async () => {
                  if (messages.length === 0) return;
                  setIsExporting(true);
                  try {
                    await exportConversationAsPdf({
                      conversation: conv,
                      messages,
                      titleFallback: t("chat.chatTitle"),
                      youLabel: t("chat.you"),
                      thoughtProcessLabel: t("chat.thoughtProcess"),
                    });
                  } finally {
                    setIsExporting(false);
                  }
                }}
                className="min-h-12 rounded-2xl px-4 py-3 text-[15px] font-semibold text-[var(--foreground)] [&_svg]:size-[18px]"
              >
                <Download size={14} />
                {t("chat.exportPdf", { defaultValue: "Export HTML" })}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="mx-2 my-1 bg-[color:var(--border)]" />
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => {
                  const ok = await confirm({
                    title: t("chat.deleteConversation"),
                    description: t("chat.deleteConversationConfirm"),
                    destructive: true,
                  });
                  if (ok) {
                    await deleteConversation(conversationId);
                  }
                }}
                className="min-h-12 rounded-2xl px-4 py-3 text-[15px] font-semibold [&_svg]:size-[18px]"
              >
                <Trash2 size={14} />
                {t("chat.deleteConversation")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => {
                  const ok = await confirm({
                    title: t("chat.clearHistory"),
                    description: t("chat.clearHistoryConfirm", {
                      defaultValue: "Clear all messages in this conversation?",
                    }),
                    destructive: true,
                  });
                  if (ok) {
                    await clearConversationMessages(conversationId);
                  }
                }}
                className="min-h-12 rounded-2xl px-4 py-3 text-[15px] font-semibold [&_svg]:size-[18px]"
              >
                <Eraser size={14} />
                {t("chat.clearHistory")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ChatView
        conversationId={conversationId}
        modelName={model?.displayName}
        onSwitchModel={() => setShowModelPicker(true)}
        reasoningEffort={reasoningEffort}
        onSelectReasoningEffort={canConfigureReasoning ? handleSelectReasoningEffort : undefined}
      />

      <ModelPicker
        open={showModelPicker}
        onClose={() => setShowModelPicker(false)}
        onSelect={handleModelPickerSelect}
        selectedModelId={model?.id}
      />
    </div>
  );
}
