import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoChatbubbles, IoSettings } from "../../icons";
import { useConversations } from "../../hooks/useDatabase";
import { useMobileNav } from "../../contexts/MobileNavContext";
import { MobileStack } from "./MobileStack";
import { MobileChatHome } from "./MobileChatHome";
import { SettingsMainContent } from "./SettingsMainContent";
import { useChatStore, type ChatState } from "../../stores/chat-store";
import { useProviderStore } from "../../stores/provider-store";

type MobileTab = "chat" | "settings";

const MOBILE_ACTIVE_TAB_KEY = "ChatBot:mobile_active_tab_v2";

function loadInitialMobileTab(): MobileTab {
  try {
    const value = sessionStorage.getItem(MOBILE_ACTIVE_TAB_KEY);
    if (value === "chat" || value === "settings") return value;
  } catch {
    /* ignore */
  }
  return "chat";
}

export function MobileLayout() {
  return <MobileStack />;
}

export function MobileTabLayout() {
  const { t } = useTranslation();
  const mobileNav = useMobileNav();
  const conversations = useConversations();
  const createConversation = useChatStore((state: ChatState) => state.createConversation);
  const models = useProviderStore((state) => state.models);
  const [activeTab, setActiveTabState] = useState<MobileTab>(() => loadInitialMobileTab());

  const setActiveTab = useCallback((tab: MobileTab) => {
    try {
      sessionStorage.setItem(MOBILE_ACTIVE_TAB_KEY, tab);
    } catch {
      /* ignore */
    }
    setActiveTabState(tab);
  }, []);

  const handleCreateConversation = useCallback(async () => {
    const modelId = models.find((model) => model.enabled)?.id ?? "";
    const conversation = await createConversation(modelId);
    setActiveTab("chat");
    mobileNav?.pushChat(conversation.id);
  }, [createConversation, mobileNav, models, setActiveTab]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--background)]">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {activeTab === "chat" ? (
          <MobileChatHome
            conversations={conversations}
            onOpenConversation={(id) => mobileNav?.pushChat(id)}
            onOpenSettings={() => setActiveTab("settings")}
            onCreateConversation={handleCreateConversation}
          />
        ) : (
          <SettingsMainContent />
        )}
      </div>

      <nav
        className="shrink-0 border-t border-[color:var(--border)] bg-[var(--background)]"
        style={{
          paddingBottom: "max(6px, calc(env(safe-area-inset-bottom, 0px) - 22px))",
          position: "relative",
          zIndex: 20,
        }}
      >
        <div className="flex h-12 items-center justify-around px-2">
          {[
            { id: "chat" as const, label: t("tabs.chats"), Icon: IoChatbubbles },
            { id: "settings" as const, label: t("tabs.settings"), Icon: IoSettings },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex min-w-[72px] flex-col items-center gap-1 py-1"
              style={{
                color: activeTab === id ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-semibold tracking-[0.16em] uppercase">
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export { MobileChatDetail } from "./MobileChatDetail";
