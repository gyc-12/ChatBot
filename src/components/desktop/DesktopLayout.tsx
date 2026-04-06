import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare } from "lucide-react";
import { DesktopConversationSidebar } from "./DesktopConversationSidebar";
import { DesktopChatPanel } from "./DesktopChatPanel";
import { SettingsPage } from "../../pages/settings/SettingsPage";
import { useConversations } from "../../hooks/useDatabase";
import { useProviderStore } from "../../stores/provider-store";
import { useChatStore, type ChatState } from "../../stores/chat-store";
import type { Conversation } from "../../types";

const DESKTOP_SIDEBAR_COLLAPSED_KEY = "desktop_sidebar_collapsed_v1";
type DesktopView = "chat" | "settings";

function loadInitialSidebarCollapsed() {
  try {
    return sessionStorage.getItem(DESKTOP_SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function formatRelativeTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function DesktopEmptyCanvas({
  onCreateConversation,
  conversations,
  onSelectConversation,
}: {
  onCreateConversation: () => void;
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
}) {
  const { t } = useTranslation();
  const recentConversations = useMemo(
    () =>
      [...conversations]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 8),
    [conversations],
  );

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto px-6 pt-[18vh] pb-12 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--foreground)] text-2xl font-black text-[var(--primary-foreground)]">
        AI
      </div>
      <h1 className="text-4xl font-black tracking-tight text-[var(--foreground)]">
        {t("chats.emptyTitle")}
      </h1>
      <p className="mt-4 max-w-md text-sm leading-6 font-medium text-[var(--muted-foreground)]">
        {t("chats.emptyDescriptionDesktop")}
      </p>
      <button
        onClick={onCreateConversation}
        className="mt-8 rounded-xl bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
      >
        {t("chats.startConversation")}
      </button>

      {recentConversations.length > 0 && (
        <div className="mt-12 w-full max-w-lg">
          <p className="mb-3 text-left text-[12px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {t("chats.historyChats")}
          </p>
          <div className="flex flex-col gap-1.5">
            {recentConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-[var(--accent)]"
                style={{ backgroundColor: "var(--card)" }}
              >
                <MessageSquare size={16} className="flex-shrink-0 text-[var(--muted-foreground)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-[var(--foreground)]">
                    {conv.title}
                  </p>
                  {conv.lastMessage && (
                    <p className="mt-0.5 truncate text-[12px] text-[var(--muted-foreground)]">
                      {conv.lastMessage}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
                  {formatRelativeTime(conv.lastMessageAt ?? conv.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DesktopLayout() {
  const conversations = useConversations();
  const currentConversationId = useChatStore((state) => state.currentConversationId);
  const setCurrentConversation = useChatStore((state: ChatState) => state.setCurrentConversation);
  const createConversation = useChatStore((state: ChatState) => state.createConversation);
  const deleteConversation = useChatStore((state: ChatState) => state.deleteConversation);
  const togglePinConversation = useChatStore((state: ChatState) => state.togglePinConversation);
  const models = useProviderStore((state) => state.models);
  const [activeView, setActiveView] = useState<DesktopView>("chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => loadInitialSidebarCollapsed());

  const enabledModels = useMemo(() => models.filter((model) => model.enabled), [models]);

  const setSidebarCollapsedState = useCallback((collapsed: boolean) => {
    try {
      sessionStorage.setItem(DESKTOP_SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
    setSidebarCollapsed(collapsed);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsedState(!sidebarCollapsed);
  }, [setSidebarCollapsedState, sidebarCollapsed]);

  const handleExpandSidebar = useCallback(() => {
    setSidebarCollapsedState(false);
  }, [setSidebarCollapsedState]);

  const handleCreateConversation = async () => {
    const modelId = enabledModels[0]?.id ?? "";
    const conversation = await createConversation(modelId);
    setCurrentConversation(conversation.id);
    setActiveView("chat");
  };

  return (
    <div className="flex h-full bg-[var(--background)]">
      <DesktopConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => {
          setCurrentConversation(id);
          setActiveView("chat");
        }}
        onCreateConversation={handleCreateConversation}
        onOpenSettings={() => setActiveView("settings")}
        onDeleteConversation={deleteConversation}
        onTogglePinConversation={togglePinConversation}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={handleToggleSidebar}
        onExpand={handleExpandSidebar}
      />
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {activeView === "settings" ? (
          <SettingsPage onClose={() => setActiveView("chat")} />
        ) : currentConversationId ? (
          <DesktopChatPanel conversationId={currentConversationId} />
        ) : (
          <DesktopEmptyCanvas
            onCreateConversation={handleCreateConversation}
            conversations={conversations}
            onSelectConversation={(id) => {
              setCurrentConversation(id);
              setActiveView("chat");
            }}
          />
        )}
      </main>
    </div>
  );
}
