import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import { Plus, PlugZap, Server, Sparkles, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IoChevronBack } from "../../icons";
import { isDesktop } from "../../lib/platform";
import { useConfirm, appAlert } from "../../components/shared/ConfirmDialogProvider";
import { BUILT_IN_TOOLS } from "../../services/built-in-tools";
import { mcpConnectionManager } from "../../services/mcp/connection-manager";
import { refreshMcpConnections } from "../../services/mcp";
import { isStdioAvailable } from "../../services/mcp/stdio-transport";
import { useBuiltInToolsStore } from "../../stores/built-in-tools-store";
import { useMcpStore, type McpServerConfig, type McpTool } from "../../stores/mcp-store";
import type { CustomHeader } from "../../types";
import { McpServerCard } from "./McpServerCard";
import { McpServerForm } from "./McpServerForm";

interface SubPage {
  id: string;
  title: string;
  component: React.ReactNode;
  headerRight?: React.ReactNode;
}

export interface McpPageProps {
  onPush?: (page: SubPage) => void;
  onPop?: () => void;
}

export interface McpPageHandle {
  triggerAdd: () => void;
}

export const McpPage = forwardRef<McpPageHandle, McpPageProps>(function McpPage(
  { onPush, onPop },
  ref,
) {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const isDesktopLayout = isDesktop();
  const builtInEnabledByName = useBuiltInToolsStore((state) => state.enabledByName);
  const setBuiltInToolEnabled = useBuiltInToolsStore((state) => state.setToolEnabled);
  const servers = useMcpStore((state) => state.servers) as McpServerConfig[];
  const tools = useMcpStore((state) => state.tools) as McpTool[];
  const connectionStatus = useMcpStore((state) => state.connectionStatus) as Record<
    string,
    "disconnected" | "connecting" | "connected" | "error"
  >;
  const deleteServer = useMcpStore((state) => state.deleteServer);
  const updateServer = useMcpStore((state) => state.updateServer);
  const addServer = useMcpStore((state) => state.addServer);
  const visibleBuiltInTools = isDesktopLayout
    ? BUILT_IN_TOOLS
    : BUILT_IN_TOOLS.filter((tool) => !tool.desktopOnly);
  const visibleServers = useMemo(() => {
    const stdioOk = isStdioAvailable();
    return stdioOk ? servers : servers.filter((server) => server.type !== "stdio");
  }, [servers]);
  const connectedServerIds = useMemo(
    () =>
      new Set(
        visibleServers
          .filter((server) => (connectionStatus[server.id] ?? "disconnected") === "connected")
          .map((server) => server.id),
      ),
    [connectionStatus, visibleServers],
  );
  const toolsByServerId = useMemo(() => {
    const grouped = new Map<string, McpTool[]>();
    tools.forEach((tool) => {
      const list = grouped.get(tool.serverId) ?? [];
      list.push(tool);
      grouped.set(tool.serverId, list);
    });
    return grouped;
  }, [tools]);
  const activeServerCount = connectedServerIds.size;
  const connectedToolCount = tools.filter((tool) => connectedServerIds.has(tool.serverId)).length;
  const enabledBuiltInCount = visibleBuiltInTools.filter(
    (tool) => builtInEnabledByName[tool.name] !== false,
  ).length;
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const parseHeaders = useCallback((value: unknown): CustomHeader[] | undefined => {
    if (!value || typeof value !== "object") return undefined;
    const headers = Object.entries(value as Record<string, unknown>)
      .map(([name, headerValue]) => ({
        name: name.trim(),
        value: String(headerValue).trim(),
      }))
      .filter((header) => header.name && header.value);
    return headers.length > 0 ? headers : undefined;
  }, []);

  const parseServerType = useCallback((value: unknown): "http" | "stdio" => {
    return value === "stdio" ? "stdio" : "http";
  }, []);

  const handleImportJson = useCallback(async () => {
    let parsed: any;
    try {
      parsed = JSON.parse(importJson.trim());
    } catch {
      appAlert(`${t("common.error")}: ${t("mcp.importInvalidJson")}`);
      return;
    }

    const stdioOk = isStdioAvailable();
    let toImport: Array<{
      name: string;
      type?: "http" | "stdio";
      url: string;
      headers?: CustomHeader[];
      command?: string;
      args?: string[];
      env?: Record<string, string>;
    }> = [];

    if (parsed?.mcpServers && typeof parsed.mcpServers === "object") {
      for (const [key, val] of Object.entries(parsed.mcpServers)) {
        const value = val as Record<string, unknown>;
        const url = String((value.url ?? value.endpoint ?? "") as string).trim();
        const hasCommand = !!value.command;

        const headers = parseHeaders(value.headers);

        if (hasCommand && stdioOk) {
          const args = Array.isArray(value.args)
            ? (value.args as string[]).map((arg) => String(arg).trim()).filter(Boolean)
            : [];
          const env =
            value.env && typeof value.env === "object"
              ? Object.fromEntries(
                  Object.entries(value.env as Record<string, unknown>).map(([envKey, envValue]) => [
                    envKey.trim(),
                    String(envValue).trim(),
                  ]),
                )
              : undefined;
          toImport.push({
            name: String(key),
            type: "stdio",
            url: "",
            command: String(value.command).trim(),
            args,
            env,
          });
        } else if (url) {
          toImport.push({ name: String(key), url, headers });
        }
      }

      if (toImport.length === 0) {
        const isCommandConfig = Object.values(parsed.mcpServers).some(
          (value: any) => value?.command || value?.args,
        );
        appAlert(
          `${t("common.error")}: ${isCommandConfig && !stdioOk ? t("mcp.importCommandNotSupported") : t("mcp.importNoTools")}`,
        );
        return;
      }
    } else if (Array.isArray(parsed)) {
      toImport = parsed
        .map((item: any) => ({
          name: String(item?.name ?? ""),
          type: parseServerType(item?.type),
          url: String(item?.url ?? item?.endpoint ?? "").trim(),
          headers: parseHeaders(item?.headers),
          command: item?.command ? String(item.command).trim() : undefined,
          args: Array.isArray(item?.args)
            ? item.args.map((arg: unknown) => String(arg).trim()).filter(Boolean)
            : undefined,
          env:
            item?.env && typeof item.env === "object"
              ? Object.fromEntries(
                  Object.entries(item.env).map(([envKey, envValue]) => [
                    envKey.trim(),
                    String(envValue).trim(),
                  ]),
                )
              : undefined,
        }))
        .filter((server: any) => server.url || server.command);
    } else if (parsed?.url || parsed?.endpoint) {
      toImport = [
        {
          name: String(parsed?.name ?? "MCP Server"),
          type: parseServerType(parsed?.type),
          url: String(parsed.url ?? parsed.endpoint ?? "").trim(),
          headers: parseHeaders(parsed?.headers),
          command: parsed?.command ? String(parsed.command).trim() : undefined,
          args: Array.isArray(parsed?.args)
            ? parsed.args.map((arg: unknown) => String(arg).trim()).filter(Boolean)
            : undefined,
          env:
            parsed?.env && typeof parsed.env === "object"
              ? Object.fromEntries(
                  Object.entries(parsed.env).map(([envKey, envValue]) => [
                    envKey.trim(),
                    String(envValue).trim(),
                  ]),
                )
              : undefined,
        },
      ];
    }

    if (toImport.length === 0) {
      appAlert(`${t("common.error")}: ${t("mcp.importNoTools")}`);
      return;
    }

    setIsImporting(true);
    const addedNames: string[] = [];
    try {
      for (const server of toImport) {
        addServer({
          name: server.name || "MCP Server",
          type: server.type,
          url: server.url,
          customHeaders: server.headers,
          command: server.command,
          args: server.args,
          env: server.env,
          enabled: false,
        });
        addedNames.push(server.name || "MCP Server");
      }

      setShowImportModal(false);
      setImportJson("");
      appAlert(
        `${t("common.success")}: ${t("mcp.importSuccess", { count: addedNames.length })}\n\n${addedNames.join("\n")}`,
      );
    } catch (error) {
      appAlert(
        `${t("common.error")}: ${error instanceof Error ? error.message : t("settings.importFailed")}`,
      );
    } finally {
      setIsImporting(false);
    }
  }, [addServer, importJson, parseHeaders, parseServerType, t]);

  const pushServerForm = useCallback(
    (serverId?: string) => {
      if (!onPush || !onPop) return;
      const server = serverId ? servers.find((item) => item.id === serverId) : undefined;
      const title = server ? server.name : t("mcp.addServer");
      onPush({
        id: serverId ? `mcp-edit-${serverId}` : "mcp-add",
        title,
        component: <McpServerForm server={server} onClose={onPop} />,
      });
    },
    [onPop, onPush, servers, t],
  );

  useImperativeHandle(ref, () => ({ triggerAdd: () => pushServerForm() }), [pushServerForm]);

  const handleToggleServer = useCallback(
    async (server: McpServerConfig) => {
      const status = connectionStatus[server.id] ?? "disconnected";
      if (status === "connecting") return;

      const shouldReconnect = server.enabled && (status === "error" || status === "disconnected");
      if (shouldReconnect) {
        useMcpStore.getState().setConnectionStatus(server.id, "connecting");
        try {
          await refreshMcpConnections();
          const finalStatus = useMcpStore.getState().connectionStatus[server.id];
          if (finalStatus === "error") updateServer(server.id, { enabled: false });
        } catch {
          updateServer(server.id, { enabled: false });
          useMcpStore.getState().setConnectionStatus(server.id, "error");
        }
        return;
      }

      const newEnabled = !server.enabled;
      updateServer(server.id, { enabled: newEnabled });
      if (newEnabled) {
        useMcpStore.getState().setConnectionStatus(server.id, "connecting");
        try {
          await refreshMcpConnections();
          const finalStatus = useMcpStore.getState().connectionStatus[server.id];
          if (finalStatus === "error") updateServer(server.id, { enabled: false });
        } catch {
          updateServer(server.id, { enabled: false });
          useMcpStore.getState().setConnectionStatus(server.id, "error");
        }
      } else {
        mcpConnectionManager.reset(server.id);
        useMcpStore.getState().setTools(server.id, []);
        useMcpStore.getState().setConnectionStatus(server.id, "disconnected");
      }
    },
    [connectionStatus, updateServer],
  );

  return (
    <>
      {isDesktopLayout ? (
        <div className="h-full overflow-y-auto bg-[var(--background)]">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-8">
            <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="mt-3 text-[30px] font-black tracking-tight text-[var(--foreground)]">
                  {t("mcp.pageTitle")}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
                  {t("mcp.pageDescription")}
                </p>
              </div>

              <div className="ml-auto flex w-full flex-col items-end gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end sm:self-end">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--secondary)] px-4 text-[13px] font-semibold text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--accent)]"
                >
                  <Upload size={16} />
                  {t("mcp.importJson")}
                </button>
                <button
                  onClick={() => pushServerForm()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--foreground)] px-4 text-[13px] font-semibold text-[var(--primary-foreground)] shadow-[0px_2px_8px_rgba(0,0,0,0.08)] transition-opacity duration-200 hover:opacity-90"
                >
                  <Plus size={16} />
                  {t("mcp.addServer")}
                </button>
              </div>
            </section>

            <section className="space-y-4">
              {visibleServers.length > 0 ? (
                <div className="space-y-4">
                  {visibleServers.map((server) => (
                    <McpServerCard
                      key={server.id}
                      server={server}
                      status={connectionStatus[server.id] ?? "disconnected"}
                      serverTools={toolsByServerId.get(server.id) ?? []}
                      onEdit={() => pushServerForm(server.id)}
                      onToggle={() => handleToggleServer(server)}
                      onDelete={async () => {
                        const ok = await confirm({
                          title: t("common.areYouSure"),
                          destructive: true,
                        });
                        if (ok) {
                          deleteServer(server.id);
                          mcpConnectionManager.reset(server.id);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--border)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_96%,white)] px-5 py-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--secondary)] text-[var(--foreground)]">
                      <PlugZap size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                        {t("mcp.emptyTitle")}
                      </h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
                        {t("mcp.emptyDescription")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {visibleBuiltInTools.length > 0 ? (
              <section className="space-y-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="text-[30px] font-bold tracking-tight text-[var(--foreground)]">
                      {t("mcp.builtInTools")}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                      {t("mcp.builtInDescription")}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
                    {t("common.configured", { count: enabledBuiltInCount })}
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--border)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_96%,white)] shadow-[0px_2px_8px_rgba(0,0,0,0.04)]">
                  {visibleBuiltInTools.map((tool, index) => {
                    const enabled = builtInEnabledByName[tool.name] !== false;
                    return (
                      <div
                        key={tool.name}
                        className={`flex items-center gap-4 px-5 py-4 ${
                          index > 0
                            ? "border-t border-[color:color-mix(in_srgb,var(--border)_50%,transparent)]"
                            : ""
                        }`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--secondary)] text-[var(--foreground)]">
                          <Sparkles size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-[var(--foreground)]">
                            {tool.name}
                          </p>
                          <p className="mt-1 text-[13px] leading-5 text-[var(--muted-foreground)]">
                            {tool.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={tool.name}
                          aria-pressed={enabled}
                          onClick={() => setBuiltInToolEnabled(tool.name, !enabled)}
                          className="relative inline-flex h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-200"
                          style={{
                            backgroundColor: enabled ? "var(--foreground)" : "var(--muted)",
                          }}
                        >
                          <span
                            className="inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200"
                            style={{
                              transform: enabled
                                ? "translateX(22px) translateY(2px)"
                                : "translateX(2px) translateY(2px)",
                            }}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="h-full overflow-y-auto bg-[var(--background)] px-4 py-4">
          <div className="space-y-4 pb-8">
            <section className="rounded-2xl bg-[color:color-mix(in_srgb,var(--card)_96%,white)] px-4 py-4 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-[color:color-mix(in_srgb,var(--border)_50%,transparent)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--secondary)] text-[var(--foreground)]">
                  <PlugZap size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[20px] font-black tracking-tight text-[var(--foreground)]">
                    {t("mcp.addServer")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    {t("mcp.pageDescription")}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => pushServerForm()}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--foreground)] px-4 text-[13px] font-semibold text-[var(--primary-foreground)] shadow-[0px_2px_8px_rgba(0,0,0,0.08)] transition-opacity duration-200 active:opacity-90"
                >
                  <Plus size={16} />
                  {t("mcp.addServerCopy")}
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--secondary)] px-4 text-[13px] font-semibold text-[var(--foreground)] transition-colors duration-200 active:opacity-90"
                >
                  <Upload size={16} />
                  {t("mcp.importJson")}
                </button>
              </div>

              {/* <div className="mt-4 flex flex-wrap gap-2">
                <SummaryChip label={t("common.configured", { count: visibleServers.length })} />
                <SummaryChip
                  label={`${t("mcp.activeServers")} ${activeServerCount}/${visibleServers.length}`}
                />
                <SummaryChip label={`${t("mcp.enabledBuiltIns")} ${enabledBuiltInCount}`} />
              </div> */}
            </section>

            <section className="space-y-3">
              <MobileSectionHeader
                title={t("settings.mcpServers")}
                detail={t("common.configured", { count: visibleServers.length })}
              />

              {visibleServers.length > 0 ? (
                <div className="space-y-3">
                  {visibleServers.map((server) => (
                    <McpServerCard
                      key={server.id}
                      compact
                      server={server}
                      status={connectionStatus[server.id] ?? "disconnected"}
                      serverTools={toolsByServerId.get(server.id) ?? []}
                      onEdit={() => pushServerForm(server.id)}
                      onToggle={() => handleToggleServer(server)}
                      onDelete={async () => {
                        const ok = await confirm({
                          title: t("common.areYouSure"),
                          destructive: true,
                        });
                        if (ok) {
                          deleteServer(server.id);
                          mcpConnectionManager.reset(server.id);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-[color:color-mix(in_srgb,var(--card)_96%,white)] px-4 py-4 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-[color:color-mix(in_srgb,var(--border)_50%,transparent)]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--secondary)] text-[var(--foreground)]">
                      <PlugZap size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[20px] font-black tracking-tight text-[var(--foreground)]">
                        {t("mcp.emptyTitle")}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                        {t("mcp.emptyDescription")}
                      </p>
                      {/* <button
                        onClick={() => pushServerForm()}
                        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--foreground)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity active:opacity-90"
                      >
                        <Plus size={16} />
                        {t("mcp.addServer")}
                      </button> */}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {visibleBuiltInTools.length > 0 ? (
              <section className="space-y-3">
                <MobileSectionHeader
                  title={t("mcp.builtInTools")}
                  detail={t("common.configured", { count: enabledBuiltInCount })}
                  description={t("mcp.builtInDescription")}
                />

                <div className="overflow-hidden rounded-[28px] bg-[color:color-mix(in_srgb,var(--card)_96%,white)] shadow-[0px_12px_36px_rgba(45,52,53,0.05)] ring-1 ring-[color:color-mix(in_srgb,var(--border)_72%,transparent)]">
                  {visibleBuiltInTools.map((tool, index) => {
                    const enabled = builtInEnabledByName[tool.name] !== false;
                    return (
                      <div
                        key={tool.name}
                        className={`flex items-start gap-4 px-4 py-4 ${
                          index > 0
                            ? "border-t border-[color:color-mix(in_srgb,var(--border)_50%,transparent)]"
                            : ""
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--secondary)] text-[var(--foreground)]">
                          <Sparkles size={17} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-[var(--foreground)]">
                            {tool.name}
                          </p>
                          <p className="mt-1 text-[13px] leading-5 text-[var(--muted-foreground)]">
                            {tool.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={tool.name}
                          aria-pressed={enabled}
                          onClick={() => setBuiltInToolEnabled(tool.name, !enabled)}
                          className="relative mt-1 inline-flex h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-200"
                          style={{
                            backgroundColor: enabled ? "var(--foreground)" : "var(--muted)",
                          }}
                        >
                          <span
                            className="inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200"
                            style={{
                              transform: enabled
                                ? "translateX(22px) translateY(2px)"
                                : "translateX(2px) translateY(2px)",
                            }}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      )}

      {showImportModal ? (
        isDesktopLayout ? (
          <div className="fixed inset-0 z-50">
            <button
              className="absolute inset-0 bg-black/30"
              onClick={() => {
                if (!isImporting) setShowImportModal(false);
              }}
              aria-label="Close"
            />
            <div
              className="absolute top-1/2 left-1/2 w-[92%] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--border)_50%,transparent)] shadow-[0px_8px_32px_rgba(0,0,0,0.12),0px_24px_64px_rgba(0,0,0,0.08)]"
              style={{ backgroundColor: "var(--background)" }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "0.5px solid var(--border)" }}
              >
                <span className="text-foreground text-[16px] font-semibold">
                  {t("mcp.importJson")}
                </span>
                <button
                  onClick={() => {
                    if (!isImporting) setShowImportModal(false);
                  }}
                  className="active:opacity-60"
                >
                  <IoChevronBack size={20} color="var(--muted-foreground)" />
                </button>
              </div>
              <div className="px-5 pt-5 pb-6">
                <p className="text-muted-foreground mb-3 text-[13px]">{t("mcp.importHint")}</p>
                <textarea
                  value={importJson}
                  onChange={(event) => setImportJson(event.target.value)}
                  className="text-foreground w-full resize-none rounded-2xl px-4 py-3 font-mono text-[13px] outline-none"
                  style={{ backgroundColor: "var(--secondary)", minHeight: 220 }}
                  placeholder={
                    '{\n  "mcpServers": {\n    "weather": { "url": "https://..." },\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]\n    }\n  }\n}'
                  }
                />
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    disabled={isImporting}
                    className="flex-1 rounded-2xl py-3 active:opacity-70 disabled:opacity-50"
                    style={{ backgroundColor: "var(--secondary)" }}
                  >
                    <span className="text-foreground text-[14px] font-semibold">
                      {t("common.cancel")}
                    </span>
                  </button>
                  <button
                    onClick={handleImportJson}
                    disabled={isImporting || !importJson.trim()}
                    className="flex-1 rounded-2xl py-3 text-white active:opacity-70 disabled:opacity-50"
                    style={{ backgroundColor: "var(--foreground)" }}
                  >
                    <span className="text-[14px] font-semibold">{t("mcp.import")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed inset-0 z-50 bg-[var(--background)]">
            <div className="flex h-full flex-col">
              <div
                className="flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--border)_72%,transparent)] px-4 py-3"
                style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
              >
                <button
                  onClick={() => {
                    if (!isImporting) setShowImportModal(false);
                  }}
                  disabled={isImporting}
                  className="text-sm font-semibold text-[var(--muted-foreground)] disabled:opacity-50"
                >
                  {t("common.cancel")}
                </button>
                <span className="text-[16px] font-semibold text-[var(--foreground)]">
                  {t("mcp.importJson")}
                </span>
                <div className="w-[52px]" />
              </div>
              <div
                className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4"
                style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
              >
                <p className="text-[13px] leading-5 text-[var(--muted-foreground)]">
                  {t("mcp.importHint")}
                </p>
                <textarea
                  value={importJson}
                  onChange={(event) => setImportJson(event.target.value)}
                  className="text-foreground min-h-0 flex-1 resize-none rounded-[24px] px-4 py-4 font-mono text-[13px] outline-none"
                  style={{ backgroundColor: "var(--secondary)" }}
                  placeholder={
                    '{\n  "mcpServers": {\n    "weather": { "url": "https://..." },\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]\n    }\n  }\n}'
                  }
                />
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => {
                      if (!isImporting) setShowImportModal(false);
                    }}
                    disabled={isImporting}
                    className="flex-1 rounded-2xl py-3 active:opacity-70 disabled:opacity-50"
                    style={{ backgroundColor: "var(--secondary)" }}
                  >
                    <span className="text-[14px] font-semibold text-[var(--foreground)]">
                      {t("common.cancel")}
                    </span>
                  </button>
                  <button
                    onClick={handleImportJson}
                    disabled={isImporting || !importJson.trim()}
                    className="flex-1 rounded-2xl py-3 text-white active:opacity-70 disabled:opacity-50"
                    style={{ backgroundColor: "var(--foreground)" }}
                  >
                    <span className="text-[14px] font-semibold">{t("mcp.import")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      ) : null}
    </>
  );
});



function MobileSectionHeader({
  title,
  detail,
  description,
}: {
  title: string;
  detail?: string;
  description?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-[22px] font-black tracking-tight text-[var(--foreground)]">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
        ) : null}
      </div>
      {detail ? (
        <span className="shrink-0 text-[11px] font-bold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
          {detail}
        </span>
      ) : null}
    </div>
  );
}
