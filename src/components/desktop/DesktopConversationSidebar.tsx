import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, History, Pin, Plus, Search, Settings, X } from "lucide-react";
import type { Conversation } from "../../types";
import { buildConversationSections } from "../../lib/conversation-sections";
import { useConfirm } from "../shared/ConfirmDialogProvider";

function SidebarConversationItem({
  conversation,
  active,
  onSelect,
  onDelete,
  onTogglePin,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        active ? "bg-[var(--accent)] text-[var(--foreground)]" : "hover:bg-[var(--accent)]/70"
      }`}
    >
      {conversation.pinned ? (
        <Pin size={14} className="shrink-0 text-[var(--primary)]" />
      ) : (
        <History size={14} className="shrink-0 text-[var(--muted-foreground)]" />
      )}
      <button onClick={onSelect} className="flex min-w-0 flex-1 flex-col justify-center text-left">
        <p className="truncate text-sm font-medium text-[var(--foreground)]">
          {conversation.title}
        </p>
        <p
          className={`truncate text-xs text-[var(--muted-foreground)] ${conversation.lastMessage ? "" : "invisible"}`}
        >
          {conversation.lastMessage ?? "placeholder"}
        </p>
      </button>
      <div className="hidden items-center gap-1 group-hover:flex">
        <button
          onClick={onTogglePin}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card)] hover:text-[var(--foreground)]"
          aria-label="Pin conversation"
        >
          <Pin size={13} />
        </button>
        <button
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card)] hover:text-[var(--destructive)]"
          aria-label="Delete conversation"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

function SidebarBrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[var(--foreground)] text-[20px] font-black tracking-tight text-[var(--primary-foreground)] shadow-[0px_8px_24px_rgba(25,28,29,0.10)]">
        AI
      </div>
      <span className="text-lg font-black tracking-tight text-[var(--foreground)]">ChatBot</span>
    </div>
  );
}

export function DesktopConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onCreateConversation,
  onOpenSettings,
  onDeleteConversation,
  onTogglePinConversation,
  collapsed,
  onToggleCollapsed,
  onExpand,
}: {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onOpenSettings: () => void;
  onDeleteConversation: (id: string) => void;
  onTogglePinConversation: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onExpand: () => void;
}) {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState("");
  const [focusSearchOnExpand, setFocusSearchOnExpand] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!collapsed && focusSearchOnExpand) {
      searchInputRef.current?.focus();
      setFocusSearchOnExpand(false);
    }
  }, [collapsed, focusSearchOnExpand]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter(
      (conversation) =>
        conversation.title.toLowerCase().includes(query) ||
        (conversation.lastMessage ?? "").toLowerCase().includes(query),
    );
  }, [conversations, search]);

  const sections = useMemo(
    () =>
      buildConversationSections(filtered, {
        pinned: "Pinned",
        today: "Today",
        previous_7_days: "Previous 7 Days",
        older: "Older",
      }),
    [filtered],
  );

  return (
    <aside
      className={`flex h-full shrink-0 flex-col bg-[var(--sidebar)] py-4 transition-[width,padding] duration-200 ease-out ${
        collapsed ? "w-[72px] px-2" : "w-[288px] px-3"
      }`}
    >
      <div
        className={`mb-4 flex items-center ${collapsed ? "justify-center" : "justify-between px-2"}`}
      >
        {collapsed ? null : <SidebarBrandMark />}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t("common.expandSidebar") : t("common.collapseSidebar")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {collapsed ? (
        <div className="flex flex-1 flex-col items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCreateConversation}
            title={t("chats.startConversation")}
            aria-label={t("chats.startConversation")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--foreground)] text-[var(--primary-foreground)] shadow-[0px_10px_28px_rgba(25,28,29,0.12)] transition-transform hover:opacity-95 active:scale-[0.99]"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              setFocusSearchOnExpand(true);
              onExpand();
            }}
            title={t("common.search")}
            aria-label={t("common.search")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          >
            <Search size={18} />
          </button>
          <button
            type="button"
            onClick={onExpand}
            title={t("chats.historyChats")}
            aria-label={t("chats.historyChats")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          >
            <History size={18} />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            title={t("tabs.settings")}
            aria-label={t("tabs.settings")}
            className="mt-auto flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          >
            <Settings size={18} />
          </button>
        </div>
      ) : null}

      {collapsed ? null : (
        <>
          <button
            onClick={onCreateConversation}
            className="mb-4 flex items-center gap-3 rounded-xl bg-[var(--foreground)] px-4 py-3 text-sm font-medium text-[var(--primary-foreground)] shadow-[0px_10px_28px_rgba(25,28,29,0.12)] transition-transform hover:opacity-95 active:scale-[0.99]"
          >
            <Plus size={16} />
            <span>{t("chats.startConversation")}</span>
          </button>

          <div className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--card)] px-3 py-2 shadow-[0px_4px_20px_rgba(45,52,53,0.04)]">
            <Search size={14} className="shrink-0 text-[var(--muted-foreground)]" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("chats.searchChats")}
              className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
            />
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
            {sections.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-[var(--muted-foreground)]">
                {search ? t("chats.noResults") : t("chats.noConversations")}
              </div>
            ) : (
              sections.map((section) => (
                <section key={section.id}>
                  <h2 className="mb-2 px-3 text-[10px] font-bold tracking-[0.18em] text-[var(--muted-foreground)] uppercase">
                    {section.label}
                  </h2>
                  <div className="space-y-1">
                    {section.items.map((conversation) => (
                      <SidebarConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        active={conversation.id === currentConversationId}
                        onSelect={() => onSelectConversation(conversation.id)}
                        onTogglePin={() => onTogglePinConversation(conversation.id)}
                        onDelete={async () => {
                          const ok = await confirm({
                            title: t("chat.deleteConversation"),
                            description: t("chat.deleteConversationConfirm"),
                            destructive: true,
                          });
                          if (ok) onDeleteConversation(conversation.id);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          <button
            onClick={onOpenSettings}
            className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          >
            <Settings size={16} />
            <span>{t("tabs.settings")}</span>
          </button>
        </>
      )}
    </aside>
  );
}
