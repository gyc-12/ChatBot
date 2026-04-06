import type { ElementType } from "react";
import type { TFunction } from "i18next";
import { ArchiveIcon, CubeIcon, MixerHorizontalIcon, ShuffleIcon } from "@radix-ui/react-icons";

export type SettingsSectionId = "general" | "models" | "mcpServers" | "dataControl";
export type SettingsIcon = ElementType;

export interface SettingsSectionDefinition {
  id: SettingsSectionId;
  title: string;
  description: string;
  icon: SettingsIcon;
  iconColor: string;
  iconBg: string;
}

export function getSettingsSections(t: TFunction): SettingsSectionDefinition[] {
  return [
    {
      id: "general",
      title: t("settings.general"),
      description: t("settings.generalDescription"),
      icon: MixerHorizontalIcon,
      iconColor: "#526172",
      iconBg: "rgba(82,97,114,0.11)",
    },
    {
      id: "models",
      title: t("settings.models"),
      description: t("settings.modelsDescription"),
      icon: ShuffleIcon,
      iconColor: "#315DFF",
      iconBg: "rgba(49,93,255,0.10)",
    },
    {
      id: "mcpServers",
      title: t("settings.mcpServers"),
      description: t("settings.mcpServersDescription"),
      icon: CubeIcon,
      iconColor: "#966134",
      iconBg: "rgba(150,97,52,0.10)",
    },
    {
      id: "dataControl",
      title: t("settings.dataControl"),
      description: t("settings.dataControlDescription"),
      icon: ArchiveIcon,
      iconColor: "#0F8B8D",
      iconBg: "rgba(15,139,141,0.10)",
    },
  ];
}
