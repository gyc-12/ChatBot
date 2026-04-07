import { ArrowUp, Languages, Mic, Minimize2, Moon, Volume2, Waves } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { isSttConfigured, isTtsConfigured } from "../../services/voice-api";
import { useSettingsStore, type AppSettings } from "../../stores/settings-store";
import { SettingsCard, SettingsSectionIntro, SettingsToggleCard } from "./SettingsSurface";

const TTS_FORMATS = ["mp3", "wav", "opus", "aac", "flac", "pcm"] as const;

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

      <section className="space-y-3 rounded-[28px] bg-[color:color-mix(in_srgb,var(--card)_92%,white)] p-4 shadow-[0px_16px_40px_rgba(17,24,39,0.06)] ring-1 ring-[color:color-mix(in_srgb,var(--border)_55%,transparent)]">
        <div className="space-y-1 px-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-[color:color-mix(in_srgb,var(--secondary)_84%,transparent)] px-3 py-1 text-[11px] font-black tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
            <Waves size={12} />
            <span>{t("settings.voice")}</span>
          </div>
          <h3 className="text-[20px] font-black tracking-tight text-[var(--foreground)]">
            {t("settings.voice")}
          </h3>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            {t("settings.voiceDescription")}
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <VoiceConfigPanel
            icon={Mic}
            iconColor="#0E7490"
            iconBg="rgba(14,116,144,0.10)"
            badge="STT"
            title={t("settings.sttSectionTitle")}
            description={t("settings.sttSectionDescription")}
            configured={isSttConfigured({
              baseUrl: settings.sttBaseUrl,
              apiKey: settings.sttApiKey,
              model: settings.sttModel,
            })}
          >
            <VoiceField
              label={t("settings.sttBaseUrl")}
              value={settings.sttBaseUrl}
              onChange={(value) => updateSettings({ sttBaseUrl: value })}
              placeholder="https://api.example.com/v1"
            />
            <VoiceField
              label={t("settings.apiKey")}
              value={settings.sttApiKey}
              onChange={(value) => updateSettings({ sttApiKey: value })}
              placeholder={t("settings.sttApiKeyPlaceholder")}
              type="password"
            />
            <VoiceField
              label={t("settings.sttModelLabel")}
              value={settings.sttModel}
              onChange={(value) => updateSettings({ sttModel: value })}
              placeholder="whisper-1"
              hint={t("settings.sttModelHint")}
            />
          </VoiceConfigPanel>

          <VoiceConfigPanel
            icon={Volume2}
            iconColor="#B45309"
            iconBg="rgba(180,83,9,0.12)"
            badge="TTS"
            title={t("settings.ttsSectionTitle")}
            description={t("settings.ttsSectionDescription")}
            configured={isTtsConfigured({
              baseUrl: settings.ttsBaseUrl,
              apiKey: settings.ttsApiKey,
              model: settings.ttsModel,
              voice: settings.ttsVoice,
              responseFormat: settings.ttsResponseFormat,
            })}
          >
            <VoiceField
              label={t("settings.ttsBaseUrl")}
              value={settings.ttsBaseUrl}
              onChange={(value) => updateSettings({ ttsBaseUrl: value })}
              placeholder="https://api.example.com/v1"
            />
            <VoiceField
              label={t("settings.ttsApiKey")}
              value={settings.ttsApiKey}
              onChange={(value) => updateSettings({ ttsApiKey: value })}
              placeholder={t("settings.sttApiKeyPlaceholder")}
              type="password"
            />
            <VoiceField
              label={t("settings.ttsModel")}
              value={settings.ttsModel}
              onChange={(value) => updateSettings({ ttsModel: value })}
              placeholder="gpt-4o-mini-tts"
            />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_124px]">
              <VoiceField
                label={t("settings.ttsVoice")}
                value={settings.ttsVoice}
                onChange={(value) => updateSettings({ ttsVoice: value })}
                placeholder="alloy"
              />
              <VoiceSelectField
                label={t("settings.ttsFormat")}
                value={settings.ttsResponseFormat}
                options={TTS_FORMATS}
                onChange={(value) =>
                  updateSettings({ ttsResponseFormat: value as AppSettings["ttsResponseFormat"] })
                }
              />
            </div>
          </VoiceConfigPanel>
        </div>
      </section>
    </div>
  );
}

function VoiceConfigPanel({
  icon: Icon,
  iconColor,
  iconBg,
  badge,
  title,
  description,
  configured,
  children,
}: {
  icon: typeof Mic;
  iconColor: string;
  iconBg: string;
  badge: string;
  title: string;
  description: string;
  configured: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 rounded-[24px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--background)_84%,white),color-mix(in_srgb,var(--card)_94%,white_6%))] p-4 shadow-[0px_10px_28px_rgba(15,23,42,0.05)] ring-1 ring-[color:color-mix(in_srgb,var(--border)_60%,transparent)]">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--secondary)] px-2.5 py-1 text-[10px] font-black tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
              {badge}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.14em] uppercase ${
                configured
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-[var(--secondary)] text-[var(--muted-foreground)]"
              }`}
            >
              {configured ? t("common.enabled") : t("settings.sttNotConfigured")}
            </span>
          </div>
          <h4 className="mt-2 text-[16px] font-bold text-[var(--foreground)]">{title}</h4>
          <p className="mt-1 text-[13px] leading-5 text-[var(--muted-foreground)]">{description}</p>
        </div>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function VoiceField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: "text" | "password";
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-[color:color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--background)_92%,white_8%)] px-4 text-[14px] text-[var(--foreground)] transition-[border-color,box-shadow] outline-none focus:border-[color:var(--foreground)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--foreground)_10%,transparent)]"
      />
      {hint ? <p className="text-[12px] leading-5 text-[var(--muted-foreground)]">{hint}</p> : null}
    </label>
  );
}

function VoiceSelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[color:color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--background)_92%,white_8%)] px-4 text-[14px] text-[var(--foreground)] transition-[border-color,box-shadow] outline-none focus:border-[color:var(--foreground)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--foreground)_10%,transparent)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
