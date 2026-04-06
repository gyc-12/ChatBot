import { ArrowUp, Languages, Minimize2, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { useSettingsStore, type AppSettings } from "../../stores/settings-store";
import { SettingsCard, SettingsSectionIntro, SettingsToggleCard } from "./SettingsSurface";

export function SettingsGeneralContent({ showHeader = true }: { showHeader?: boolean }) {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  const themeLabel =
    settings.theme === "dark"
      ? t("settings.themeDark")
      : settings.theme === "light"
        ? t("settings.themeLight")
        : t("settings.themeSystem");
  const languageLabel =
    settings.language === "zh"
      ? t("settings.langZh")
      : settings.language === "en"
        ? t("settings.langEn")
        : t("settings.langSystem");

  return (
    <div className="space-y-4">
      {showHeader ? (
        <SettingsSectionIntro
          eyebrow={t("settings.title")}
          title={t("settings.general")}
          description={t("settings.generalDescription")}
        />
      ) : null}

      <SettingsCard
        icon={Moon}
        iconColor="#526172"
        iconBg="rgba(82,97,114,0.10)"
        title={t("settings.theme")}
        description={t("settings.themeDescription")}
        detail={themeLabel}
        onClick={() => {
          const order: AppSettings["theme"][] = ["system", "light", "dark"];
          const next = order[(order.indexOf(settings.theme) + 1) % order.length];
          updateSettings({ theme: next });
        }}
      />

      <SettingsCard
        icon={Languages}
        iconColor="#7A50E2"
        iconBg="rgba(122,80,226,0.10)"
        title={t("settings.language")}
        description={t("settings.languageDescription")}
        detail={languageLabel}
        onClick={() => {
          const order: AppSettings["language"][] = ["system", "en", "zh"];
          const next = order[(order.indexOf(settings.language) + 1) % order.length];
          updateSettings({ language: next });
          const resolved = next === "system" ? navigator.language.split("-")[0] : next;
          i18n.changeLanguage(["en", "zh"].includes(resolved) ? resolved : "en");
        }}
      />

      <SettingsToggleCard
        icon={ArrowUp}
        iconColor="#6A5CFF"
        iconBg="rgba(106,92,255,0.10)"
        title={t("settings.enterToSend")}
        description={t("settings.enterToSendDescription")}
        checked={settings.enterToSend}
        onToggle={() => updateSettings({ enterToSend: !settings.enterToSend })}
      />

      <SettingsToggleCard
        icon={Minimize2}
        iconColor="#167C68"
        iconBg="rgba(22,124,104,0.10)"
        title={t("settings.contextCompression")}
        description={t("settings.contextCompressionDescription")}
        checked={settings.contextCompressionEnabled}
        onToggle={() =>
          updateSettings({
            contextCompressionEnabled: !settings.contextCompressionEnabled,
          })
        }
        rightSlot={
          settings.contextCompressionEnabled ? (
            <select
              aria-label={t("settings.compressionThreshold")}
              value={settings.contextCompressionThreshold}
              onChange={(event) =>
                updateSettings({
                  contextCompressionThreshold: Number(event.target.value),
                })
              }
              className="rounded-full bg-[var(--secondary)] px-3 py-1.5 text-[12px] font-semibold text-[var(--foreground)] outline-none"
            >
              <option value={8000}>8K</option>
              <option value={16000}>16K</option>
              <option value={32000}>32K</option>
              <option value={64000}>64K</option>
              <option value={128000}>128K</option>
            </select>
          ) : null
        }
      />
    </div>
  );
}
