import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, ChevronDown, Loader2, Mic, Paperclip, Sparkles, Square, X } from "lucide-react";
import { appAlert } from "./ConfirmDialogProvider";
import { startVoiceRecording, isVoiceRecordingSupported } from "../../services/voice-recorder";
import { transcribeAudio } from "../../services/voice-client";
import { isSttConfigured } from "../../services/voice-api";
import { useSettingsStore } from "../../stores/settings-store";
import { REASONING_EFFORT_LEVELS, type ReasoningEffort } from "../../types";
import {
  getReasoningEffortI18nKey,
  getReasoningEffortTitleI18nKey,
} from "../../lib/reasoning-utils";
import {
  buildFileContext,
  formatFileSize,
  parseFile,
  type ParsedFile,
} from "../../lib/file-parser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const isMac = navigator.userAgent.toLowerCase().includes("mac");

interface ChatInputProps {
  onSend: (text: string, images?: string[]) => void;
  isGenerating: boolean;
  onStop: () => void;
  placeholder?: string;
  floatingBadgeText?: string;
  reasoningEffort?: ReasoningEffort | undefined;
  onSelectReasoningEffort?: (value: ReasoningEffort | undefined) => void;
  modelName?: string;
  onSwitchModel?: () => void;
  isMobile?: boolean;
  hasMessages?: boolean;
  onStartAutoDiscuss?: (rounds: number, topicText?: string) => void;
  onStopAutoDiscuss?: () => void;
  autoDiscussRemaining?: number;
  autoDiscussTotalRounds?: number;
  externalFiles?: { images: string[]; files: ParsedFile[] } | null;
  onExternalFilesConsumed?: () => void;
  keyboardInset?: number;
}

export const ChatInput = memo(function ChatInput({
  onSend,
  isGenerating,
  onStop,
  placeholder,
  floatingBadgeText,
  reasoningEffort,
  onSelectReasoningEffort,
  isMobile = false,
  externalFiles,
  onExternalFilesConsumed,
  keyboardInset = 0,
}: ChatInputProps) {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const enterToSend = settings.enterToSend;
  const basePlaceholder = placeholder ?? t("chat.message");
  const sendKey = enterToSend ? "Enter" : isMac ? "Cmd+Enter" : "Ctrl+Enter";
  const newLineKey = enterToSend ? "Shift+Enter" : "Enter";
  const resolvedPlaceholder = isMobile
    ? basePlaceholder
    : `${basePlaceholder}  (${sendKey}${t("chat.send")}· ${newLineKey} ${t("chat.newLine")})`;
  const reasoningBadgeText = useMemo(() => {
    if (reasoningEffort === undefined && !onSelectReasoningEffort) return undefined;
    return `${t(getReasoningEffortTitleI18nKey())} ${t(getReasoningEffortI18nKey(reasoningEffort))}`;
  }, [onSelectReasoningEffort, reasoningEffort, t]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<ParsedFile[]>([]);
  const [isParsingFiles, setIsParsingFiles] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingSessionRef = useRef<Awaited<ReturnType<typeof startVoiceRecording>> | null>(null);

  const visualFiles = useMemo(
    () => [
      ...attachedFiles,
      ...(externalFiles?.files ?? []),
      ...(externalFiles?.images ?? []).map(
        (content, index) =>
          ({
            name: `image-${index + 1}.png`,
            type: "image",
            content,
            size: 0,
          }) satisfies ParsedFile,
      ),
    ],
    [attachedFiles, externalFiles],
  );

  useEffect(() => {
    if (!externalFiles) return;
    onExternalFilesConsumed?.();
  }, [externalFiles, onExternalFilesConsumed]);

  const resizeTextarea = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, isMobile ? 160 : 128)}px`;
  }, [isMobile]);

  useEffect(() => {
    resizeTextarea();
  }, [text, resizeTextarea]);

  useEffect(() => {
    return () => {
      recordingSessionRef.current?.cancel();
      recordingSessionRef.current = null;
    };
  }, []);

  const resetComposer = useCallback(() => {
    setText("");
    setAttachedImages([]);
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      if (!isMobile) textareaRef.current.focus();
    }
  }, [isMobile]);

  const handleSend = useCallback(() => {
    const docContext = buildFileContext([...attachedFiles, ...(externalFiles?.files ?? [])]);
    const imageList = [
      ...attachedImages,
      ...attachedFiles.filter((file) => file.type === "image").map((file) => file.content),
      ...(externalFiles?.images ?? []),
    ];
    const trimmed = text.trim();
    const finalText = `${docContext}${trimmed}`.trim();

    if (!finalText && imageList.length === 0) return;
    if (isGenerating) return;

    onSend(finalText, imageList.length > 0 ? imageList : undefined);
    resetComposer();
  }, [attachedFiles, attachedImages, externalFiles, isGenerating, onSend, resetComposer, text]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isMobile) return;

      if (enterToSend) {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          handleSend();
        }
        return;
      }

      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleSend();
      }
    },
    [enterToSend, handleSend, isMobile],
  );

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    setIsParsingFiles(true);
    try {
      const parsed = await Promise.all(files.map((file) => parseFile(file)));
      setAttachedFiles((current) => [
        ...current,
        ...parsed.filter((file) => file.type !== "image"),
      ]);
      setAttachedImages((current) => [
        ...current,
        ...parsed.filter((file) => file.type === "image").map((file) => file.content),
      ]);
    } catch (error) {
      console.warn("[ChatInput] file parse failed", error);
    } finally {
      setIsParsingFiles(false);
      event.target.value = "";
    }
  }, []);

  const removeFileByName = useCallback((name: string) => {
    setAttachedFiles((current) => current.filter((file) => file.name !== name));
  }, []);

  const removeImageAtIndex = useCallback((index: number) => {
    setAttachedImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const handleRecordingError = useCallback(
    async (error: unknown) => {
      const errorName = error instanceof DOMException ? error.name : "";
      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        await appAlert(t("chat.micPermissionDenied"));
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      await appAlert(`${t("chat.transcriptionFailed")}: ${message}`);
    },
    [t],
  );

  const stopRecordingAndTranscribe = useCallback(async () => {
    const session = recordingSessionRef.current;
    if (!session) return;

    recordingSessionRef.current = null;
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      const audioBlob = await session.stop();
      const audioFile = new File([audioBlob], `chatbot-recording-${Date.now()}.webm`, {
        type: audioBlob.type || "audio/webm",
      });
      const transcript = await transcribeAudio(
        {
          baseUrl: settings.sttBaseUrl,
          apiKey: settings.sttApiKey,
          model: settings.sttModel,
        },
        audioFile,
      );

      if (!transcript.trim()) {
        await appAlert(t("chat.transcriptionEmpty"));
        return;
      }

      setText((current) =>
        settings.voiceAutoTranscribe && current.trim()
          ? `${current.trimEnd()}\n${transcript}`
          : transcript,
      );
    } catch (error) {
      await handleRecordingError(error);
    } finally {
      setIsTranscribing(false);
    }
  }, [handleRecordingError, settings, t]);

  const handleVoiceInput = useCallback(async () => {
    if (isTranscribing) return;

    if (isRecording) {
      await stopRecordingAndTranscribe();
      return;
    }

    if (
      !isSttConfigured({
        baseUrl: settings.sttBaseUrl,
        apiKey: settings.sttApiKey,
        model: settings.sttModel,
      })
    ) {
      await appAlert(t("chat.noSttProvider"));
      return;
    }

    if (!isVoiceRecordingSupported()) {
      await appAlert(t("chat.voiceInputUnavailable"));
      return;
    }

    try {
      recordingSessionRef.current = await startVoiceRecording();
      setIsRecording(true);
    } catch (error) {
      recordingSessionRef.current = null;
      await handleRecordingError(error);
    }
  }, [handleRecordingError, isRecording, isTranscribing, settings, stopRecordingAndTranscribe, t]);

  return (
    <div
      className="border-t border-transparent bg-[color:color-mix(in_srgb,var(--background)_82%,transparent)] px-4 pt-3 backdrop-blur-md"
      style={{
        paddingBottom: `max(16px, calc(env(safe-area-inset-bottom, 0px) + ${keyboardInset}px))`,
      }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {floatingBadgeText || reasoningBadgeText ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {floatingBadgeText ? (
              <div className="shrink-0 rounded-full bg-[var(--card)] px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] text-[var(--muted-foreground)] uppercase shadow-[0px_8px_24px_rgba(45,52,53,0.08)] ring-1 ring-[color:var(--border)]">
                {floatingBadgeText}
              </div>
            ) : null}

            {reasoningBadgeText ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--card)] px-3 py-1.5 text-[11px] font-bold tracking-[0.06em] text-[var(--muted-foreground)] shadow-[0px_8px_24px_rgba(45,52,53,0.08)] ring-1 ring-[color:var(--border)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                  >
                    <Sparkles size={12} />
                    <span>{reasoningBadgeText}</span>
                    <ChevronDown size={12} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="min-w-[180px] rounded-2xl border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--card)_94%,white_6%)] p-2 shadow-[0px_20px_56px_rgba(25,28,29,0.16)] backdrop-blur-xl"
                >
                  {REASONING_EFFORT_LEVELS.map((value) => {
                    const key = getReasoningEffortI18nKey(value);
                    const selected = value === reasoningEffort;
                    return (
                      <DropdownMenuItem
                        key={value ?? "default"}
                        onClick={() => onSelectReasoningEffort?.(value)}
                        className={`min-h-10 rounded-xl px-3 py-2 text-[13px] font-semibold ${
                          selected ? "bg-[var(--secondary)] text-[var(--foreground)]" : ""
                        }`}
                      >
                        {t(key)}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}

        {(visualFiles.length > 0 || attachedImages.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {visualFiles.map((file) => (
              <div
                key={file.name}
                className="flex items-center gap-2 rounded-full bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted-foreground)] shadow-[0px_4px_20px_rgba(45,52,53,0.04)]"
              >
                <span className="max-w-[180px] truncate">
                  {file.name}
                  {file.type !== "image" ? ` · ${formatFileSize(file.size)}` : ""}
                </span>
                {attachedFiles.some((item) => item.name === file.name) ? (
                  <button
                    onClick={() => removeFileByName(file.name)}
                    className="rounded-full p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </div>
            ))}

            {attachedImages.map((_, index) => (
              <div
                key={`inline-image-${index}`}
                className="flex items-center gap-2 rounded-full bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted-foreground)] shadow-[0px_4px_20px_rgba(45,52,53,0.04)]"
              >
                <span>Image {index + 1}</span>
                <button
                  onClick={() => removeImageAtIndex(index)}
                  className="rounded-full p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className={`flex gap-2 rounded-3xl bg-[var(--card)] p-2.5 shadow-[0px_4px_20px_rgba(45,52,53,0.04)] ring-1 ring-[color:var(--border)] ${
            isMobile ? "items-end" : "items-center"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            aria-label={isParsingFiles ? t("common.loading") : t("chat.dropFiles")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
          >
            {isParsingFiles ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Paperclip size={18} />
            )}
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={resolvedPlaceholder}
            className="min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
          />

          <button
            type="button"
            onClick={() => void handleVoiceInput()}
            aria-label={
              isTranscribing
                ? t("chat.transcribing")
                : isRecording
                  ? t("chat.stopRecording")
                  : t("chat.startRecording")
            }
            title={
              isTranscribing
                ? t("chat.transcribing")
                : isRecording
                  ? t("chat.stopRecording")
                  : t("chat.startRecording")
            }
            disabled={isTranscribing}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all ${
              isRecording
                ? "bg-rose-500 text-white shadow-[0_12px_28px_rgba(244,63,94,0.28)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
            } disabled:opacity-50`}
          >
            {isTranscribing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isRecording ? (
              <Square size={16} />
            ) : (
              <Mic size={18} />
            )}
          </button>

          {isGenerating ? (
            <button
              onClick={onStop}
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--foreground)] text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              type="button"
              disabled={!text.trim() && attachedImages.length === 0 && attachedFiles.length === 0}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--foreground)] text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
