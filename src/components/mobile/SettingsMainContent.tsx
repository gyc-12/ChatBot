import { useTranslation } from "react-i18next";
import { useMobileNav } from "../../contexts/MobileNavContext";
import { useProviderStore } from "../../stores/provider-store";
import { useSettingsStore } from "../../stores/settings-store";
import { SettingsIndexCard, SettingsSectionIntro } from "../../pages/settings/SettingsSurface";
import { getSettingsSections } from "../../pages/settings/settings-sections";

export function SettingsMainContent() {
  const { t } = useTranslation();
  const mobileNav = useMobileNav();
  const providers = useProviderStore((state) => state.providers);
  const settings = useSettingsStore((state) => state.settings);
  const sections = getSettingsSections(t);

  return (
    <div
      className="h-full overflow-y-auto bg-[var(--background)] px-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
        paddingBottom: "max(32px, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="space-y-4 pb-8">
        <SettingsSectionIntro
          eyebrow={t("settings.title")}
          title={t("settings.title")}
          description={t("settings.indexDescription")}
        />

        {sections.map((section) => (
          <SettingsIndexCard
            key={section.id}
            icon={section.icon}
            iconColor={section.iconColor}
            iconBg={section.iconBg}
            title={section.title}
            description={section.description}
            detail={
              section.id === "models"
                ? `${providers.length}`
                : section.id === "general"
                  ? settings.theme === "dark"
                    ? t("settings.themeDark")
                    : settings.theme === "light"
                      ? t("settings.themeLight")
                      : t("settings.themeSystem")
                  : undefined
            }
            onClick={() => {
              if (section.id === "general") mobileNav?.pushSettingsGeneral();
              if (section.id === "models") mobileNav?.pushSettingsModels();
              if (section.id === "mcpServers") mobileNav?.pushSettingsMcpServers();
              if (section.id === "dataControl") mobileNav?.pushSettingsDataControl();
            }}
          />
        ))}
      </div>
    </div>
  );
}
