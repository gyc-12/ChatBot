import { useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Plus, X } from "lucide-react";
import {
  IoAddCircleOutline,
  IoChevronForward,
  IoRefreshOutline,
  IoTrashOutline,
} from "../../icons";
import { useProviderStore } from "../../stores/provider-store";
import { useConfirm } from "../../components/shared/ConfirmDialogProvider";
import { ProviderEditPage } from "./ProviderEditPage";
import { McpPage, type McpPageHandle } from "./McpPage";
import { getAvatarProps } from "../../lib/avatar-utils";
import { EmptyState } from "../../components/shared/EmptyState";
import { SettingsGeneralContent } from "./SettingsGeneralContent";
import { SettingsDataControlContent } from "./SettingsDataControlContent";
import {
  getSettingsSections,
  type SettingsSectionDefinition,
  type SettingsSectionId,
} from "./settings-sections";

interface SettingsSubPage {
  id: string;
  title: string;
  component: ReactNode;
  headerRight?: ReactNode;
}

export function SettingsPage({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("general");
  const [subPageStack, setSubPageStack] = useState<SettingsSubPage[]>([]);
  const mcpRef = useRef<McpPageHandle>(null);
  const sections = useMemo(() => getSettingsSections(t), [t]);
  const activeDefinition = sections.find((section) => section.id === activeSection) ?? sections[0];
  const currentSubPage = subPageStack[subPageStack.length - 1];

  const push = (page: SettingsSubPage) => setSubPageStack((pages) => [...pages, page]);
  const pop = () => setSubPageStack((pages) => pages.slice(0, -1));

  const rootHeaderAction = renderRootHeaderAction({
    activeSection,
    t,
    push,
    pop,
    mcpRef,
  });

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[color:color-mix(in_srgb,var(--card)_96%,white)] lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-[color:color-mix(in_srgb,var(--border)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--secondary)_55%,var(--background))] px-4 py-4 lg:w-[280px] lg:border-r lg:border-b-0 lg:px-5 lg:py-5">
        <p className="text-[11px] font-black tracking-[0.18em] text-[var(--muted-foreground)] uppercase">
          {t("settings.title")}
        </p>
        <h1 className="mt-2 text-[26px] leading-7 font-black tracking-tight text-[var(--foreground)] lg:mt-3 lg:text-[30px] lg:leading-8">
          ChatBot
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)] lg:mt-3">
          {t("settings.securityTip")}
        </p>

        <nav
          className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0"
          aria-label={t("settings.title")}
        >
          {sections.map((section) => (
            <SectionNavButton
              key={section.id}
              section={section}
              active={section.id === activeSection}
              onClick={() => {
                setActiveSection(section.id);
                setSubPageStack([]);
              }}
            />
          ))}
        </nav>

        <div className="mt-4 hidden rounded-xl bg-[color:color-mix(in_srgb,var(--card)_80%,var(--background))] px-4 py-3.5 ring-1 ring-[color:color-mix(in_srgb,var(--border)_40%,transparent)] lg:mt-auto lg:block">
          <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--muted-foreground)]/70 uppercase">
            ChatBot
          </p>
          <p className="mt-2 text-[11px] font-semibold tracking-[0.12em] text-[var(--muted-foreground)]/50 uppercase">
            v{__APP_VERSION__}
          </p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[var(--background)]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[color:color-mix(in_srgb,var(--border)_50%,transparent)] px-5 py-4 lg:px-8 lg:py-5">
          <div className="min-w-0">
            {currentSubPage ? (
              <>
                <button
                  type="button"
                  onClick={pop}
                  className="mb-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--secondary)] px-3 text-[13px] font-semibold text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--accent)]"
                  aria-label={t("common.back")}
                >
                  <ChevronLeft size={16} />
                  {t("common.back")}
                </button>
                <h2 className="truncate text-[24px] font-black tracking-tight text-[var(--foreground)] lg:text-[28px]">
                  {currentSubPage.title}
                </h2>
              </>
            ) : (
              <>
                <p className="text-[11px] font-black tracking-[0.18em] text-[var(--muted-foreground)] uppercase">
                  {t("settings.title")}
                </p>
                <h2 className="mt-2 text-[26px] leading-7 font-black tracking-tight text-[var(--foreground)] lg:text-[32px] lg:leading-8">
                  {activeDefinition.title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                  {activeDefinition.description}
                </p>
              </>
            )}
          </div>

          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            {currentSubPage ? currentSubPage.headerRight : rootHeaderAction}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--secondary)] text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--accent)]"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 lg:px-8 lg:py-6">
          {currentSubPage ? (
            currentSubPage.component
          ) : (
            <SectionRootContent
              activeSection={activeSection}
              push={push}
              pop={pop}
              mcpRef={mcpRef}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function renderRootHeaderAction({
  activeSection,
  t,
  push,
  pop,
  mcpRef,
}: {
  activeSection: SettingsSectionId;
  t: ReturnType<typeof useTranslation>["t"];
  push: (page: SettingsSubPage) => void;
  pop: () => void;
  mcpRef: React.RefObject<McpPageHandle | null>;
}) {
  if (activeSection === "models") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <RefreshAllProvidersButton />
        <button
          type="button"
          onClick={() =>
            push({
              id: "provider-add",
              title: t("settings.addProvider"),
              component: <ProviderEditPage onClose={pop} />,
            })
          }
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--foreground)] px-4 text-[13px] font-semibold text-[var(--primary-foreground)] transition-opacity duration-200 hover:opacity-90"
        >
          <Plus size={16} />
          {t("settings.addProvider")}
        </button>
      </div>
    );
  }

  return null;
}

function SectionRootContent({
  activeSection,
  push,
  pop,
  mcpRef,
}: {
  activeSection: SettingsSectionId;
  push: (page: SettingsSubPage) => void;
  pop: () => void;
  mcpRef: React.RefObject<McpPageHandle | null>;
}) {
  if (activeSection === "general") {
    return <SettingsGeneralContent showHeader={false} />;
  }

  if (activeSection === "models") {
    return <ProvidersWorkspace onPush={push} onPop={pop} />;
  }

  if (activeSection === "mcpServers") {
    return <McpPage ref={mcpRef} onPush={push} onPop={pop} />;
  }

  return <SettingsDataControlContent showHeader={false} />;
}

function SectionNavButton({
  section,
  active,
  onClick,
}: {
  section: SettingsSectionDefinition;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = section.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-w-[220px] items-center gap-3.5 rounded-xl px-3.5 py-3 text-left ring-1 transition-all duration-200 lg:w-full lg:min-w-0 lg:rounded-2xl ${active ? "bg-[var(--card)] shadow-[0px_2px_8px_rgba(0,0,0,0.06)] ring-[color:color-mix(in_srgb,var(--border)_50%,transparent)]" : "bg-transparent ring-transparent hover:bg-[color:color-mix(in_srgb,var(--card)_50%,transparent)]"}`}
      aria-pressed={active}
    >
      {active && (
        <span className="absolute top-1/2 left-0 hidden h-5 w-[3px] -translate-y-1/2 rounded-r-full lg:block" style={{ backgroundColor: section.iconColor }} />
      )}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: section.iconBg, color: section.iconColor }}
      >
        <Icon width={18} height={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-[var(--foreground)]">{section.title}</p>
        <p className="mt-0.5 text-[12px] leading-4 text-[var(--muted-foreground)]">
          {section.description}
        </p>
      </div>
    </button>
  );
}

function RefreshAllProvidersButton() {
  const { t } = useTranslation();
  const providers = useProviderStore((state) => state.providers);
  const fetchModels = useProviderStore((state) => state.fetchModels);
  const updateProvider = useProviderStore((state) => state.updateProvider);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    if (refreshing || providers.length === 0) return;
    setRefreshing(true);
    let success = 0;
    let failed = 0;
    const failedNames: string[] = [];

    await Promise.all(
      providers.map(async (provider) => {
        updateProvider(provider.id, { status: "pending" });
        try {
          await fetchModels(provider.id);
          success++;
        } catch (error: any) {
          console.error(`[RefreshAll] ${provider.name} failed:`, error?.message || error);
          updateProvider(provider.id, { status: "error" });
          failedNames.push(`${provider.name}: ${error?.message || "unknown"}`);
          failed++;
        }
      }),
    );

    if (failed === 0) {
      toast.success(t("providers.refreshSuccess", { success }));
    } else if (success === 0) {
      toast.error(`${t("providers.refreshFailed")}\n${failedNames.join("\n")}`);
    } else {
      toast.warning(
        `${t("providers.refreshPartial", { success, failed })}\n${failedNames.join("\n")}`,
      );
    }

    setRefreshing(false);
  };

  return (
    <button
      type="button"
      onClick={handleRefreshAll}
      disabled={refreshing || providers.length === 0}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--secondary)] px-4 text-[13px] font-semibold text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--accent)] disabled:opacity-50"
      title={t("providers.refreshAll")}
    >
      <IoRefreshOutline
        size={18}
        color="currentColor"
        className={refreshing ? "animate-spin" : ""}
      />
      {t("providers.refresh")}
    </button>
  );
}

function ProvidersWorkspace({
  onPush,
  onPop,
}: {
  onPush: (page: SettingsSubPage) => void;
  onPop: () => void;
}) {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const providers = useProviderStore((state) => state.providers);
  const models = useProviderStore((state) => state.models);
  const deleteProvider = useProviderStore((state) => state.deleteProvider);

  if (providers.length === 0) {
    return (
      <div className="rounded-2xl bg-[color:color-mix(in_srgb,var(--card)_92%,white)] px-5 py-5 ring-1 ring-[color:color-mix(in_srgb,var(--border)_50%,transparent)]">
        <EmptyState
          icon={<IoAddCircleOutline size={28} color="var(--muted-foreground)" />}
          title={t("models.noModels")}
          subtitle={t("models.configureHint")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {providers.map((provider) => {
        const providerModels = models.filter((model) => model.providerId === provider.id);
        const activeModels = providerModels.filter((model) => model.enabled);
        const isConnected = provider.status === "connected";
        const isError = provider.status === "error";
        const isDisabled = provider.enabled === false;

        return (
          <button
            key={provider.id}
            type="button"
            onClick={() =>
              onPush({
                id: `provider-edit-${provider.id}`,
                title: provider.name,
                headerRight: (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: t("common.areYouSure"),
                        description: t("providers.deleteConfirm", { name: provider.name }),
                        destructive: true,
                      });
                      if (ok) {
                        deleteProvider(provider.id);
                        onPop();
                      }
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--destructive)_10%,transparent)] text-[var(--destructive)] transition-colors duration-200 hover:bg-[color:color-mix(in_srgb,var(--destructive)_16%,transparent)]"
                    title={t("common.delete")}
                    aria-label={t("common.delete")}
                  >
                    <IoTrashOutline size={18} color="currentColor" />
                  </button>
                ),
                component: <ProviderEditPage editId={provider.id} onClose={onPop} />,
              })
            }
            className={`flex w-full items-center gap-3.5 rounded-2xl bg-[var(--card)] px-4 py-3.5 text-left shadow-[0px_1px_4px_rgba(0,0,0,0.03),0px_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-[color:color-mix(in_srgb,var(--border)_50%,transparent)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0px_2px_8px_rgba(0,0,0,0.06),0px_4px_16px_rgba(0,0,0,0.04)] ${isDisabled ? "opacity-50" : ""}`}
          >
            <div className="relative shrink-0">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white"
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
              <p className="truncate text-[15px] font-semibold text-[var(--foreground)]">
                {provider.name}
              </p>
              <p className="mt-1 truncate text-[13px] text-[var(--muted-foreground)]">
                {t("providers.modelsCount", {
                  total: providerModels.length,
                  active: activeModels.length,
                })}
              </p>
            </div>
            <IoChevronForward size={18} color="var(--muted-foreground)" style={{ opacity: 0.4 }} />
          </button>
        );
      })}
    </div>
  );
}
