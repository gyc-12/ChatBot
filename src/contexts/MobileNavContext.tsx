import { createContext, useContext } from "react";

export interface MobileNavFunctions {
  pushChat: (conversationId: string) => void;
  pushSettingsGeneral: () => void;
  pushSettingsModels: () => void;
  pushSettingsProviderEdit: (editId?: string) => void;
  pushSettingsMcpServers: () => void;
  pushSettingsMcpServerEdit: (serverId?: string) => void;
  pushSettingsDataControl: () => void;
}

export const MobileNavContext = createContext<MobileNavFunctions | null>(null);

export function useMobileNav() {
  return useContext(MobileNavContext);
}
