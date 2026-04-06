import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { IoAddCircleOutline, IoTrashOutline, IoFlashOutline } from "../../icons";
import { isStdioAvailable } from "../../services/mcp/stdio-transport";
import { useMcpStore, type McpServerConfig } from "../../stores/mcp-store";
import { useConfirm, appAlert } from "../../components/shared/ConfirmDialogProvider";
import type { CustomHeader } from "../../types";
import { mcpConnectionManager } from "../../services/mcp/connection-manager";

function normalizeHeaders(headers: CustomHeader[]): CustomHeader[] {
  return headers
    .map((header) => ({
      name: header.name.trim(),
      value: header.value.trim(),
    }))
    .filter((header) => header.name && header.value);
}

function formatTestErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : "Unknown error";
  const normalizedMessage = rawMessage.toLowerCase();
  const shortenedMessage = rawMessage.length > 160 ? `${rawMessage.slice(0, 160)}…` : rawMessage;

  if (normalizedMessage.includes("sha256") || normalizedMessage.includes("certificate")) {
    return `SSL certificate verification failed. Raw error: ${shortenedMessage}`;
  }

  return shortenedMessage;
}

export function McpServerForm({
  server,
  onClose,
}: {
  server?: McpServerConfig;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const addServer = useMcpStore((s) => s.addServer);
  const updateServer = useMcpStore((s) => s.updateServer);
  const deleteServer = useMcpStore((s) => s.deleteServer);

  const isNew = !server;
  const stdioAvailable = useMemo(() => isStdioAvailable(), []);

  const [serverType, setServerType] = useState<"http" | "stdio">(server?.type ?? "http");
  const [name, setName] = useState(server?.name ?? "");
  const [url, setUrl] = useState(server?.url ?? "");
  const [enabled, setEnabled] = useState(server?.enabled ?? true);
  const [headers, setHeaders] = useState<CustomHeader[]>(server?.customHeaders ?? []);
  // Stdio fields
  const [command, setCommand] = useState(server?.command ?? "");
  const [argsStr, setArgsStr] = useState((server?.args ?? []).join(" "));
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string }[]>(
    Object.entries(server?.env ?? {}).map(([key, value]) => ({ key, value })),
  );
  const [testing, setTesting] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      appAlert(`${t("common.error")}: ${t("toolEdit.nameRequired")}`);
      return;
    }
    if (serverType === "http" && !url.trim()) {
      appAlert(`${t("common.error")}: ${t("toolEdit.endpointRequired")}`);
      return;
    }
    if (serverType === "stdio" && !command.trim()) {
      appAlert(`${t("common.error")}: Command is required for Stdio mode`);
      return;
    }

    const validHeaders = normalizeHeaders(headers);
    const parsedArgs = argsStr.trim() ? argsStr.trim().split(/\s+/) : [];
    const parsedEnv: Record<string, string> = {};
    for (const p of envPairs) {
      if (p.key.trim() && p.value.trim()) parsedEnv[p.key.trim()] = p.value.trim();
    }

    const payload: Omit<McpServerConfig, "id" | "createdAt"> = {
      name: name.trim(),
      type: serverType,
      url: serverType === "http" ? url.trim() : "",
      enabled,
      customHeaders: serverType === "http" && validHeaders.length > 0 ? validHeaders : undefined,
      command: serverType === "stdio" ? command.trim() : undefined,
      args: serverType === "stdio" && parsedArgs.length > 0 ? parsedArgs : undefined,
      env: serverType === "stdio" && Object.keys(parsedEnv).length > 0 ? parsedEnv : undefined,
    };

    if (isNew) {
      const created = addServer(payload);
      if (enabled) mcpConnectionManager.reset(created.id);
    } else {
      updateServer(server.id, payload);
      mcpConnectionManager.reset(server.id);
    }

    onClose();
  }, [
    addServer,
    argsStr,
    command,
    enabled,
    envPairs,
    headers,
    isNew,
    name,
    onClose,
    server?.id,
    serverType,
    t,
    updateServer,
    url,
  ]);

  const handleTest = useCallback(async () => {
    if (serverType === "http" && !url.trim()) {
      appAlert(`${t("common.error")}: ${t("toolEdit.endpointRequired")}`);
      return;
    }
    if (serverType === "stdio" && !command.trim()) {
      appAlert(`${t("common.error")}: Command is required`);
      return;
    }

    setTesting(true);
    const validHeaders = normalizeHeaders(headers);
    const parsedArgs = argsStr.trim() ? argsStr.trim().split(/\s+/) : [];
    const parsedEnv: Record<string, string> = {};
    for (const p of envPairs) {
      if (p.key.trim() && p.value.trim()) parsedEnv[p.key.trim()] = p.value.trim();
    }

    const tempServer: Omit<McpServerConfig, "createdAt"> = {
      id: `test-${Date.now()}`,
      name: name.trim() || "Test",
      type: serverType,
      url: serverType === "http" ? url.trim() : "",
      customHeaders: serverType === "http" && validHeaders.length > 0 ? validHeaders : undefined,
      command: serverType === "stdio" ? command.trim() : undefined,
      args: serverType === "stdio" && parsedArgs.length > 0 ? parsedArgs : undefined,
      env: serverType === "stdio" && Object.keys(parsedEnv).length > 0 ? parsedEnv : undefined,
      enabled: true,
    };

    try {
      const tools = await Promise.race([
        mcpConnectionManager.discoverTools(tempServer),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout (10s)")), 10000),
        ),
      ]);
      appAlert(t("toolEdit.testSuccess", { count: tools.length }));
      mcpConnectionManager.disconnect(tempServer.id);
    } catch (err) {
      const errMsg = formatTestErrorMessage(err);
      appAlert(`${t("toolEdit.testFailed")}: ${errMsg}`);
      mcpConnectionManager.disconnect(tempServer.id);
    } finally {
      setTesting(false);
    }
  }, [argsStr, command, envPairs, headers, name, serverType, t, url]);

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: "var(--background)" }}>
      <div className="flex-1 overflow-y-auto">
        {/* Name */}
        <div className="px-4 pt-4">
          <p className="text-muted-foreground mb-1 text-sm font-medium">{t("toolEdit.name")}</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("toolEdit.namePlaceholder")}
            className="text-foreground w-full rounded-lg px-4 py-3 text-[15px] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--border)_35%,transparent)]"
            style={{ backgroundColor: "var(--card)" }}
          />
        </div>

        {/* Type Selector (only show on desktop) */}
        {stdioAvailable && (
          <div className="px-4 pt-4">
            <p className="text-muted-foreground mb-1 text-sm font-medium">{t("toolEdit.type")}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setServerType("http")}
                className="flex-1 rounded-lg py-2.5 text-[13px] font-semibold transition-colors duration-200"
                style={{
                  backgroundColor: serverType === "http" ? "var(--foreground)" : "var(--secondary)",
                  color: serverType === "http" ? "var(--primary-foreground)" : "var(--foreground)",
                }}
              >
                HTTP
              </button>
              <button
                onClick={() => setServerType("stdio")}
                className="flex-1 rounded-lg py-2.5 text-[13px] font-semibold transition-colors duration-200"
                style={{
                  backgroundColor: serverType === "stdio" ? "var(--foreground)" : "var(--secondary)",
                  color: serverType === "stdio" ? "var(--primary-foreground)" : "var(--foreground)",
                }}
              >
                Stdio
              </button>
            </div>
          </div>
        )}

        {serverType === "http" ? (
          <>
            {/* URL */}
            <div className="px-4 pt-4">
              <p className="text-muted-foreground mb-1 text-sm font-medium">
                {t("toolEdit.endpointUrl")}
              </p>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:3000/mcp"
                className="text-foreground w-full rounded-lg px-4 py-3 text-[14px] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--border)_35%,transparent)]"
                style={{ backgroundColor: "var(--card)" }}
              />
            </div>

            {/* Custom Headers */}
            <div className="px-4 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-sm font-medium">{t("toolEdit.headers")}</p>
                <button
                  onClick={() => setHeaders([...headers, { name: "", value: "" }])}
                  className="active:opacity-60"
                >
                  <IoAddCircleOutline size={22} color="var(--primary)" />
                </button>
              </div>
              {headers.map((h, i) => (
                <div key={i} className="mb-2 flex items-center gap-2">
                  <input
                    value={h.name}
                    onChange={(e) => {
                      const next = [...headers];
                      next[i] = { ...next[i], name: e.target.value };
                      setHeaders(next);
                    }}
                    placeholder="Header"
                    className="text-foreground flex-1 rounded-md px-3 py-2 text-[13px] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--border)_30%,transparent)]"
                    style={{ backgroundColor: "var(--card)" }}
                  />
                  <input
                    value={h.value}
                    onChange={(e) => {
                      const next = [...headers];
                      next[i] = { ...next[i], value: e.target.value };
                      setHeaders(next);
                    }}
                    placeholder="Value"
                    className="text-foreground flex-[2] rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: "var(--secondary)" }}
                  />
                  <button
                    onClick={() => setHeaders(headers.filter((_, j) => j !== i))}
                    className="active:opacity-60"
                  >
                    <IoTrashOutline size={18} color="var(--destructive)" />
                  </button>
                </div>
              ))}
              {headers.length === 0 && (
                <p className="text-muted-foreground text-xs">{t("toolEdit.headersHint")}</p>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Command */}
            <div className="px-4 pt-4">
              <p className="text-muted-foreground mb-1 text-sm font-medium">
                {t("toolEdit.command")}
              </p>
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="npx"
                className="text-foreground w-full rounded-lg px-4 py-3 font-mono text-[14px] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--border)_35%,transparent)]"
                style={{ backgroundColor: "var(--card)" }}
              />
            </div>

            {/* Args */}
            <div className="px-4 pt-4">
              <p className="text-muted-foreground mb-1 text-sm font-medium">{t("toolEdit.args")}</p>
              <input
                value={argsStr}
                onChange={(e) => setArgsStr(e.target.value)}
                placeholder="-y @modelcontextprotocol/server-filesystem /path/to/dir"
                className="text-foreground w-full rounded-lg px-4 py-3 font-mono text-[14px] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--border)_35%,transparent)]"
                style={{ backgroundColor: "var(--card)" }}
              />
              <p className="text-muted-foreground mt-1 text-[11px]">{t("toolEdit.argsHint")}</p>
            </div>

            {/* Environment Variables */}
            <div className="px-4 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-sm font-medium">{t("toolEdit.envVars")}</p>
                <button
                  onClick={() => setEnvPairs([...envPairs, { key: "", value: "" }])}
                  className="active:opacity-60"
                >
                  <IoAddCircleOutline size={22} color="var(--primary)" />
                </button>
              </div>
              {envPairs.map((p, i) => (
                <div key={i} className="mb-2 flex items-center gap-2">
                  <input
                    value={p.key}
                    onChange={(e) => {
                      const next = [...envPairs];
                      next[i] = { ...next[i], key: e.target.value };
                      setEnvPairs(next);
                    }}
                    placeholder="KEY"
                    className="text-foreground flex-1 rounded-md px-3 py-2 font-mono text-[13px] outline-none ring-1 ring-[color:color-mix(in_srgb,var(--border)_30%,transparent)]"
                    style={{ backgroundColor: "var(--card)" }}
                  />
                  <input
                    value={p.value}
                    onChange={(e) => {
                      const next = [...envPairs];
                      next[i] = { ...next[i], value: e.target.value };
                      setEnvPairs(next);
                    }}
                    placeholder="value"
                    className="text-foreground flex-[2] rounded-lg px-3 py-2 font-mono text-sm outline-none"
                    style={{ backgroundColor: "var(--secondary)" }}
                  />
                  <button
                    onClick={() => setEnvPairs(envPairs.filter((_, j) => j !== i))}
                    className="active:opacity-60"
                  >
                    <IoTrashOutline size={18} color="var(--destructive)" />
                  </button>
                </div>
              ))}
              {envPairs.length === 0 && (
                <p className="text-muted-foreground text-xs">{t("toolEdit.envVarsHint")}</p>
              )}
            </div>
          </>
        )}

        {/* Enabled toggle */}
        <div
          className="mx-4 mt-4 flex items-center justify-between rounded-lg px-4 py-3 ring-1 ring-[color:color-mix(in_srgb,var(--border)_35%,transparent)]"
          style={{ backgroundColor: "var(--card)" }}
        >
          <p className="text-foreground text-[14px]">{t("toolEdit.enabled")}</p>
          <button
            onClick={() => setEnabled((v) => !v)}
            className="relative inline-flex h-[26px] w-[46px] flex-shrink-0 rounded-full transition-colors duration-200"
            style={{ backgroundColor: enabled ? "var(--foreground)" : "var(--muted)" }}
          >
            <span
              className="inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-sm transition-transform duration-200"
              style={{
                transform: enabled
                  ? "translateX(22px) translateY(2px)"
                  : "translateX(2px) translateY(2px)",
              }}
            />
          </button>
        </div>

        {/* Test Connection */}
        <div className="px-4 pt-4">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex w-full items-center justify-center gap-2 rounded-lg border py-3 transition-opacity duration-200 active:opacity-70 disabled:opacity-40"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--primary) 5%, transparent)",
            }}
          >
            {testing ? (
              <span
                className="animate-pulse text-sm font-medium"
                style={{ color: "var(--primary)" }}
              >
                {t("toolEdit.testing")}
              </span>
            ) : (
              <>
                <IoFlashOutline size={18} color="var(--primary)" />
                <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                  {t("toolEdit.testConnection")}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Save + Delete */}
        <div className="px-4 pt-6 pb-8">
          <button
            onClick={handleSave}
            disabled={!name.trim() || (serverType === "http" ? !url.trim() : !command.trim())}
            className="w-full rounded-xl py-3.5 text-[15px] font-semibold text-white transition-opacity duration-200 active:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: "var(--foreground)" }}
          >
            {isNew ? t("toolEdit.addTool") : t("toolEdit.saveChanges")}
          </button>

          {!isNew && server && (
            <button
              onClick={async () => {
                const ok = await confirm({ title: t("common.areYouSure"), destructive: true });
                if (!ok) return;
                deleteServer(server.id);
                mcpConnectionManager.reset(server.id);
                onClose();
              }}
              className="mt-3 w-full py-2 text-sm active:opacity-70"
              style={{ color: "var(--destructive)" }}
            >
              <span className="text-sm" style={{ color: "var(--destructive)" }}>
                {t("common.delete")}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
