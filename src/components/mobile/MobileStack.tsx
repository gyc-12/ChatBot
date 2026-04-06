import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { stackflow, type ActivityComponentType } from "@stackflow/react";
import { basicRendererPlugin } from "@stackflow/plugin-renderer-basic";
import { basicUIPlugin } from "@stackflow/plugin-basic-ui";
import { AppScreen } from "@stackflow/plugin-basic-ui";
import "@stackflow/plugin-basic-ui/index.css";
import { ChevronLeft } from "lucide-react";
import {
  IoAdd,
  IoAddCircleOutline,
  IoChevronForward,
  IoRefreshOutline,
  IoTrashOutline,
} from "../../icons";
import { toast } from "sonner";
import { useChatStore } from "../../stores/chat-store";
import { useProviderStore } from "../../stores/provider-store";
import { useMcpStore, type McpServerConfig } from "../../stores/mcp-store";
import { useConfirm } from "../shared/ConfirmDialogProvider";
import { getAvatarProps } from "../../lib/avatar-utils";
import { EmptyState } from "../shared/EmptyState";
import { ProviderEditPage } from "../../pages/settings/ProviderEditPage";
import { McpPage } from "../../pages/settings/McpPage";
import { McpServerForm } from "../../pages/settings/McpServerForm";
import { SettingsGeneralContent } from "../../pages/settings/SettingsGeneralContent";
import { SettingsDataControlContent } from "../../pages/settings/SettingsDataControlContent";
import { MobileTabLayout, MobileChatDetail } from "./MobileLayout";
import { MobileNavContext, type MobileNavFunctions } from "../../contexts/MobileNavContext";

let _useFlow: ReturnType<typeof stackflow>["useFlow"];
let _stackDepth = 0;
type FlowPush = ReturnType<ReturnType<typeof stackflow>["useFlow"]>["push"];

function buildNav(push: FlowPush): MobileNavFunctions {
  return {
    pushChat: (conversationId: string) => push("ChatDetail", { conversationId }),
    pushSettingsGeneral: () => push("SettingsGeneral", {}),
    pushSettingsModels: () => push("SettingsModels", {}),
    pushSettingsProviderEdit: (editId?: string) => push("ProviderEdit", { editId: editId ?? "" }),
    pushSettingsMcpServers: () => push("SettingsMcpServers", {}),
    pushSettingsMcpServerEdit: (serverId?: string) =>
      push("McpServerEdit", { serverId: serverId ?? "" }),
    pushSettingsDataControl: () => push("SettingsDataControl", {}),
  };
}

function MobileSettingsScreen({
  title,
  onBack,
  rightSlot,
  children,
}: {
  title: string;
  onBack: () => void;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AppScreen>
      <div className="flex h-full min-h-0 flex-col bg-[var(--background)] [transform:translateZ(0)]">
        <header
          className="shrink-0 border-b border-[color:color-mix(in_srgb,var(--border)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--background)_92%,white)] backdrop-blur-xl"
          style={{ paddingTop: "max(10px, env(safe-area-inset-top, 10px))" }}
        >
          <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-4 pb-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--foreground)] transition-colors active:scale-[0.98] active:bg-[var(--secondary)]"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              {title}
            </h1>
            <div className="flex min-h-11 items-center justify-end gap-1">{rightSlot}</div>
          </div>
        </header>

        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </AppScreen>
  );
}

const Home: ActivityComponentType = () => {
  const { push, pop } = _useFlow();

  useEffect(() => {
    window.__stackflowBack = () => {
      if (_stackDepth > 0) {
        pop();
        return true;
      }
      return false;
    };
    return () => {
      delete window.__stackflowBack;
    };
  }, [pop]);

  const nav = useMemo(() => buildNav(push), [push]);

  return (
    <AppScreen>
      <MobileNavContext.Provider value={nav}>
        <MobileTabLayout />
      </MobileNavContext.Provider>
    </AppScreen>
  );
};

const ChatDetail: ActivityComponentType<{ conversationId: string }> = ({ params }) => {
  const { pop, push } = _useFlow();
  const setCurrentConversation = useChatStore((state) => state.setCurrentConversation);

  useEffect(() => {
    _stackDepth++;
    return () => {
      _stackDepth--;
    };
  }, []);

  useEffect(() => {
    if (params.conversationId) setCurrentConversation(params.conversationId);
    return () => setCurrentConversation(null);
  }, [params.conversationId, setCurrentConversation]);

  const nav = useMemo(() => buildNav(push), [push]);

  return (
    <AppScreen>
      <MobileNavContext.Provider value={nav}>
        <MobileChatDetail conversationId={params.conversationId} onBack={() => pop()} />
      </MobileNavContext.Provider>
    </AppScreen>
  );
};

const SettingsGeneral: ActivityComponentType = () => {
  const { t } = useTranslation();
  const { pop } = _useFlow();

  useEffect(() => {
    _stackDepth++;
    return () => {
      _stackDepth--;
    };
  }, []);

  return (
    <MobileSettingsScreen title={t("settings.general")} onBack={() => pop()}>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--background)] px-4 py-4">
        <SettingsGeneralContent />
      </div>
    </MobileSettingsScreen>
  );
};

const SettingsModels: ActivityComponentType = () => {
  const { t } = useTranslation();
  const { push, pop } = _useFlow();
  const providers = useProviderStore((state) => state.providers);
  const models = useProviderStore((state) => state.models);
  const fetchModels = useProviderStore((state) => state.fetchModels);
  const updateProvider = useProviderStore((state) => state.updateProvider);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    _stackDepth++;
    return () => {
      _stackDepth--;
    };
  }, []);

  const handleRefreshAll = useCallback(async () => {
    if (refreshing || providers.length === 0) return;
    setRefreshing(true);
    let success = 0;
    let failed = 0;
    await Promise.all(
      providers.map(async (provider) => {
        updateProvider(provider.id, { status: "pending" });
        try {
          await fetchModels(provider.id);
          success++;
        } catch {
          updateProvider(provider.id, { status: "error" });
          failed++;
        }
      }),
    );
    if (failed === 0) {
      toast.success(t("providers.refreshSuccess", { success }));
    } else if (success === 0) {
      toast.error(t("providers.refreshFailed"));
    } else {
      toast.warning(t("providers.refreshPartial", { success, failed }));
    }
    setRefreshing(false);
  }, [fetchModels, providers, refreshing, t, updateProvider]);

  return (
    <MobileSettingsScreen
      title={t("settings.models")}
      onBack={() => pop()}
      rightSlot={
        <>
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={refreshing || providers.length === 0}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--foreground)] transition-colors active:scale-[0.98] active:bg-[var(--secondary)] disabled:opacity-40"
          >
            <IoRefreshOutline
              size={20}
              color="currentColor"
              className={refreshing ? "animate-spin" : ""}
            />
          </button>
          <button
            type="button"
            onClick={() => push("ProviderEdit", {})}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--foreground)] transition-colors active:scale-[0.98] active:bg-[var(--secondary)]"
          >
            <IoAdd size={22} color="currentColor" />
          </button>
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ backgroundColor: "var(--background)" }}>
        {providers.length === 0 ? (
          <EmptyState
            icon={<IoAddCircleOutline size={28} color="var(--muted-foreground)" />}
            title={t("models.noModels")}
            subtitle={t("models.configureHint")}
          />
        ) : (
          <div
            style={{
              borderTop: "0.5px solid var(--border)",
              borderBottom: "0.5px solid var(--border)",
            }}
          >
            {providers.map((provider, index) => {
              const providerModels = models.filter((model) => model.providerId === provider.id);
              const activeModels = providerModels.filter((model) => model.enabled);
              const isConnected = provider.status === "connected";
              const isError = provider.status === "error";

              return (
                <button
                  key={provider.id}
                  onClick={() => push("ProviderEdit", { editId: provider.id })}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors active:bg-black/5"
                  style={{
                    borderBottom:
                      index < providers.length - 1 ? "0.5px solid var(--border)" : "none",
                  }}
                >
                  <div className="relative shrink-0">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: getAvatarProps(provider.name).color }}
                    >
                      {getAvatarProps(provider.name).initials}
                    </div>
                    <div
                      className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2"
                      style={{
                        borderColor: "var(--background)",
                        backgroundColor: isConnected
                          ? "var(--success)"
                          : isError
                            ? "var(--destructive)"
                            : "var(--border)",
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-medium text-[var(--foreground)]">
                      {provider.name}
                    </p>
                    <p className="truncate text-[13px] text-[var(--muted-foreground)]">
                      {t("providers.modelsCount", {
                        total: providerModels.length,
                        active: activeModels.length,
                      })}
                    </p>
                  </div>
                  <IoChevronForward
                    size={18}
                    color="var(--muted-foreground)"
                    style={{ opacity: 0.3 }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </MobileSettingsScreen>
  );
};

const ProviderEdit: ActivityComponentType<{ editId?: string }> = ({ params }) => {
  const { t } = useTranslation();
  const { pop } = _useFlow();
  const { confirm } = useConfirm();
  const deleteProvider = useProviderStore((state) => state.deleteProvider);

  useEffect(() => {
    _stackDepth++;
    return () => {
      _stackDepth--;
    };
  }, []);

  return (
    <MobileSettingsScreen
      title={
        params.editId
          ? t("settings.editProvider", { defaultValue: "Edit Provider" })
          : t("settings.addProvider")
      }
      onBack={() => pop()}
      rightSlot={
        params.editId ? (
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({
                title: t("common.areYouSure"),
                description: t("providers.deleteConfirm", { name: "" }),
                destructive: true,
              });
              if (ok) {
                deleteProvider(params.editId!);
                pop();
              }
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--destructive)] transition-colors active:scale-[0.98] active:bg-[var(--secondary)]"
          >
            <IoTrashOutline size={18} color="currentColor" />
          </button>
        ) : null
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ProviderEditPage editId={params.editId} onClose={() => pop()} />
      </div>
    </MobileSettingsScreen>
  );
};

const SettingsMcpServers: ActivityComponentType = () => {
  const { t } = useTranslation();
  const { push, pop } = _useFlow();

  useEffect(() => {
    _stackDepth++;
    return () => {
      _stackDepth--;
    };
  }, []);

  const onPush = (page: { id: string }) => {
    const match = page.id.match(/^mcp-edit-(.+)$/);
    if (match) {
      push("McpServerEdit", { serverId: match[1] });
    } else {
      push("McpServerEdit", {});
    }
  };

  return (
    <MobileSettingsScreen title={t("settings.mcpServers")} onBack={() => pop()}>
      <McpPage onPush={onPush as never} onPop={() => pop()} />
    </MobileSettingsScreen>
  );
};

const SettingsDataControl: ActivityComponentType = () => {
  const { t } = useTranslation();
  const { pop } = _useFlow();

  useEffect(() => {
    _stackDepth++;
    return () => {
      _stackDepth--;
    };
  }, []);

  return (
    <MobileSettingsScreen title={t("settings.dataControl")} onBack={() => pop()}>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--background)] px-4 py-4">
        <SettingsDataControlContent />
      </div>
    </MobileSettingsScreen>
  );
};

const McpServerEdit: ActivityComponentType<{ serverId?: string }> = ({ params }) => {
  const { t } = useTranslation();
  const { pop } = _useFlow();
  const servers = useMcpStore((state) => state.servers) as McpServerConfig[];

  useEffect(() => {
    _stackDepth++;
    return () => {
      _stackDepth--;
    };
  }, []);

  const server = params.serverId ? servers.find((item) => item.id === params.serverId) : undefined;

  return (
    <MobileSettingsScreen
      title={server ? server.name : t("settings.mcpTools")}
      onBack={() => pop()}
    >
      <McpServerForm server={server} onClose={() => pop()} />
    </MobileSettingsScreen>
  );
};

const result = stackflow({
  transitionDuration: 320,
  activities: {
    Home,
    ChatDetail,
    SettingsGeneral,
    SettingsModels,
    ProviderEdit,
    SettingsMcpServers,
    McpServerEdit,
    SettingsDataControl,
  },
  plugins: [
    basicRendererPlugin(),
    basicUIPlugin({
      theme: "cupertino",
      appBar: {
        minSafeAreaInsetTop: "0px",
      },
    }),
  ],
  initialActivity: () => "Home",
});

_useFlow = result.useFlow;
const MobileStackComponent = result.Stack;

export function MobileStack() {
  return <MobileStackComponent />;
}
