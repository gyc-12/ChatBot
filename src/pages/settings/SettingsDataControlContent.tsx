import { Download, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { appAlert, useConfirm } from "../../components/shared/ConfirmDialogProvider";
import { createBackup, downloadBackup, pickAndImportBackup } from "../../services/backup";
import { useChatStore } from "../../stores/chat-store";
import { useMcpStore } from "../../stores/mcp-store";
import { useProviderStore } from "../../stores/provider-store";
import { useSettingsStore } from "../../stores/settings-store";
import { SettingsCard, SettingsSectionIntro } from "./SettingsSurface";

export function SettingsDataControlContent({ showHeader = true }: { showHeader?: boolean }) {
  const { t } = useTranslation();
  const { confirm } = useConfirm();

  return (
    <div className="space-y-4">
      {showHeader ? (
        <SettingsSectionIntro
          eyebrow={t("settings.title")}
          title={t("settings.dataControl")}
          description={t("settings.dataControlDescription")}
        />
      ) : null}

      <SettingsCard
        icon={Download}
        iconColor="#0F8B8D"
        iconBg="rgba(15,139,141,0.10)"
        title={t("settings.exportBackup")}
        description={t("settings.exportBackupDescription")}
        onClick={async () => {
          const data = createBackup();
          const saved = await downloadBackup(data);
          if (saved) await appAlert(t("settings.exportSuccess"));
        }}
      />

      <SettingsCard
        icon={Upload}
        iconColor="#BF7B16"
        iconBg="rgba(191,123,22,0.10)"
        title={t("settings.importBackup")}
        description={t("settings.importBackupDescription")}
        onClick={async () => {
          const result = await pickAndImportBackup();
          if (!result) return;
          if (result.success) {
            useProviderStore.getState().loadFromStorage();
            useSettingsStore.getState().loadFromStorage();
            useMcpStore.getState().loadFromStorage();
            await appAlert(t("settings.importSuccess", result.counts!));
            window.location.reload();
          } else {
            const message =
              result.errorCode === "UNSUPPORTED_VERSION"
                ? t("settings.importUnsupportedVersion", {
                    version: result.errorDetail,
                  })
                : t("settings.importParseError");
            await appAlert(`${t("settings.importFailed")}: ${message}`);
          }
        }}
      />

      <SettingsCard
        icon={Trash2}
        iconColor="#C2413A"
        iconBg="rgba(194,65,58,0.10)"
        title={t("settings.deleteAllConversations")}
        description={t("settings.deleteAllConversationsDescription")}
        destructive
        onClick={async () => {
          const ok = await confirm({
            title: t("settings.deleteAllConversations"),
            description: t("settings.deleteAllConversationsConfirm"),
            destructive: true,
          });
          if (ok) {
            await useChatStore.getState().deleteAllConversations();
            await appAlert(t("settings.deleteAllConversationsSuccess"));
          }
        }}
      />
    </div>
  );
}
