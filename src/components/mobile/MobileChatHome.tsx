import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Menu, MessageSquare, Plus, Search, Settings2, X } from "lucide-react";
import type { Conversation } from "../../types";
import { buildConversationSections } from "../../lib/conversation-sections";

function MobileBrandBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-[16px] bg-[var(--foreground)] text-[var(--primary-foreground)] font-black tracking-[0.08em] shadow-[0px_8px_20px_rgba(25,28,29,0.12)] ${className}`}
    >
      AI
    </div>
  );
}

function formatDateLabel(value: string) {
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

export function MobileChatHome({
  conversations,
  onOpenConversation,
  onOpenSettings,
  onCreateConversation,
}: {
  conversations: Conversation[];
  onOpenConversation: (id: string) => void;
  onOpenSettings: () => void;
  onCreateConversation: () => void;
}) {
  const { t } = useTranslation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return conversations;
    return conversations.filter(
      (conversation) =>
        conversation.title.toLowerCase().includes(normalized) ||
        (conversation.lastMessage ?? "").toLowerCase().includes(normalized),
    );
  }, [conversations, query]);

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

  const handleConversationOpen = (conversationId: string) => {
    setIsDrawerOpen(false);
    onOpenConversation(conversationId);
  };

  const handleSettingsOpen = () => {
    setIsDrawerOpen(false);
    onOpenSettings();
  };

  const handleCreateConversation = async () => {
    setIsDrawerOpen(false);
    await onCreateConversation();
  };

  const toggleSearch = () => {
    setShowSearch((value) => {
      const next = !value;
      if (!next) setQuery("");
      return next;
    });
  };

  const renderConversationSections = (emptyState: ReactNode) => {
    if (sections.length === 0) {
      return emptyState;
    }

    return (
      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.id}>
            <h2 className="mb-2 text-[10px] font-bold tracking-[0.18em] text-[var(--muted-foreground)] uppercase">
              {section.label}
            </h2>
            <div className="space-y-2">
              {section.items.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleConversationOpen(conversation.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[var(--card)] px-4 py-3 text-left shadow-[0px_4px_20px_rgba(45,52,53,0.04)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {conversation.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                      {conversation.lastMessage ?? t("chats.startConversation")}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
                    {formatDateLabel(conversation.lastMessageAt ?? conversation.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--background)]">
      <div
        className={`pointer-events-none absolute inset-0 z-40 transition-opacity duration-300 ${
          isDrawerOpen ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!isDrawerOpen}
      >
        <button
          type="button"
          aria-label="Close history drawer"
          onClick={() => setIsDrawerOpen(false)}
          className={`absolute inset-0 bg-black/15 backdrop-blur-sm transition-opacity duration-300 ${
            isDrawerOpen ? "pointer-events-auto opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-[var(--background)] px-4 pb-4 shadow-[18px_0px_40px_rgba(25,28,29,0.16)] transition-transform duration-300 ease-out ${
            isDrawerOpen ? "pointer-events-auto translate-x-0" : "-translate-x-full"
          }`}
          style={{
            paddingTop: "calc(max(12px, var(--sat)) + 8px)",
            paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
          }}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MobileBrandBadge className="h-10 w-10 rounded-[14px] text-sm shadow-[0px_6px_16px_rgba(25,28,29,0.10)]" />
              <p className="text-lg font-black tracking-tight text-[var(--foreground)]">ChatBot</p>
            </div>
            <button
              type="button"
              aria-label="Close drawer"
              onClick={() => setIsDrawerOpen(false)}
              className="rounded-full p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
            >
              <X size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleCreateConversation}
            className="mb-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-[var(--primary-foreground)] shadow-[0px_10px_28px_rgba(25,28,29,0.12)] transition-transform active:scale-[0.99]"
          >
            <Plus size={18} />
            {t("chats.startConversation")}
          </button>

          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-[var(--card)] px-3 py-2 shadow-[0px_4px_20px_rgba(45,52,53,0.04)]">
            <Search size={16} className="text-[var(--muted-foreground)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("chats.searchChats")}
              className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {renderConversationSections(
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <MobileBrandBadge className="mb-4 h-12 w-12 bg-[var(--secondary)] text-xl text-[var(--foreground)] shadow-none" />
                <p className="text-base font-semibold text-[var(--foreground)]">
                  {t("chats.startConversation")}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  Open a chat from history when it appears here.
                </p>
              </div>,
            )}
          </div>

          <button
            type="button"
            onClick={handleSettingsOpen}
            className="mt-4 flex min-h-11 items-center gap-3 rounded-2xl bg-[var(--card)] px-4 py-3 text-left text-sm font-semibold text-[var(--foreground)] shadow-[0px_4px_20px_rgba(45,52,53,0.04)] transition-transform active:scale-[0.99]"
          >
            <Settings2 size={18} />
            {t("tabs.settings")}
          </button>
        </aside>
      </div>

      <header className="relative flex h-16 items-center justify-center px-4 pt-[max(0px,var(--sat))]">
        <button
          type="button"
          aria-label="Open history drawer"
          onClick={() => setIsDrawerOpen(true)}
          className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)]"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-xl font-black tracking-tight text-[var(--foreground)]">
          {t("tabs.chats")}
        </h1>
        <button
          type="button"
          aria-label={t("common.search")}
          onClick={toggleSearch}
          className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)]"
        >
          <Search size={22} />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {showSearch ? (
          <>
            <div className="mb-4 pt-3">
              <div className="flex items-center gap-2 rounded-2xl bg-[var(--card)] px-3 py-2 shadow-[0px_4px_20px_rgba(45,52,53,0.04)]">
                <Search size={16} className="text-[var(--muted-foreground)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("chats.searchChats")}
                  className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                />
              </div>
            </div>

            {renderConversationSections(
              <div className="flex min-h-[30vh] flex-col items-center justify-center px-4 text-center">
                <p className="text-base font-semibold text-[var(--foreground)]">
                  {t("chats.noResults")}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {t("chats.searchChats")}
                </p>
              </div>,
            )}
          </>
        ) : (
          <div className="flex min-h-full flex-col items-center px-4 pt-[15vh] text-center">
            <MobileBrandBadge className="mb-6 h-14 w-14 rounded-[18px] text-2xl shadow-[0px_10px_24px_rgba(25,28,29,0.14)]" />
            <h1 className="text-4xl font-black tracking-tight text-[var(--foreground)]">
              {t("chats.emptyTitle")}
            </h1>
            <p className="mt-4 max-w-[280px] text-sm leading-6 font-medium text-[var(--muted-foreground)]">
              {t("chats.emptyDescriptionMobile")}
            </p>
            <button
              type="button"
              onClick={handleCreateConversation}
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] shadow-[0px_10px_28px_rgba(25,28,29,0.12)] transition-transform active:scale-[0.99]"
            >
              <Plus size={18} />
              {t("chats.startConversation")}
            </button>

            {conversations.length > 0 && (
              <div className="mt-10 w-full">
                <p className="mb-3 text-left text-[12px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {t("chats.historyChats")}
                </p>
                <div className="flex flex-col gap-1.5">
                  {[...conversations]
                    .sort(
                      (a, b) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                    )
                    .slice(0, 6)
                    .map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => onOpenConversation(conv.id)}
                        className="flex w-full items-center gap-3 rounded-2xl bg-[var(--card)] px-4 py-3 text-left shadow-[0px_4px_20px_rgba(45,52,53,0.04)] active:opacity-70"
                      >
                        <MessageSquare
                          size={16}
                          className="flex-shrink-0 text-[var(--muted-foreground)]"
                        />
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
                        <span className="shrink-0 text-[10px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
                          {formatDateLabel(conv.lastMessageAt ?? conv.updatedAt)}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
