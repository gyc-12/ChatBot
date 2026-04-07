import { Cloud, Database, Globe, PencilLine, PlugZap, SquareTerminal, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { McpServerConfig, McpTool } from "../../stores/mcp-store";

export function McpServerCard({
  server,
  status,
  serverTools,
  onEdit,
  onToggle,
  onDelete,
  compact = false,
}: {
  server: McpServerConfig;
  status: "disconnected" | "connecting" | "connected" | "error";
  serverTools: McpTool[];
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const isConnected = status === "connected";
  const isError = status === "error";
  const isConnecting = status === "connecting";
  const serverType = server.type ?? "http";

  const statusColor = isConnected
    ? "var(--success)"
    : isError
      ? "var(--destructive)"
      : isConnecting
        ? "var(--primary)"
        : "var(--border)";

  const statusText = isConnecting
    ? t("toolEdit.testing")
    : isError
      ? t("toolEdit.testFailed")
      : isConnected
        ? t("mcp.statusActive")
        : t("mcp.statusOffline");

  const actionLabel = isConnecting
    ? t("toolEdit.testing")
    : server.enabled && status === "connected"
      ? t("common.disable")
      : server.enabled && (status === "error" || status === "disconnected")
        ? t("common.retry")
        : t("common.enable");

  const endpointText =
    serverType === "stdio"
      ? [server.command, ...(server.args ?? []).slice(0, 2)].filter(Boolean).join(" ")
      : simplifyUrl(server.url);

  const Icon =
    serverType === "stdio"
      ? SquareTerminal
      : server.url.includes("postgres") || server.url.includes("database")
        ? Database
        : server.url.includes("github")
          ? Cloud
          : Globe;

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onEdit();
        }}
        className={`overflow-hidden rounded-xl border px-4 py-3.5 shadow-[0px_1px_4px_rgba(0,0,0,0.03),0px_2px_8px_rgba(0,0,0,0.04)] transition-colors duration-200 ${
          isConnected
            ? "bg-[color:color-mix(in_srgb,var(--card)_96%,white)]"
            : "bg-[color:color-mix(in_srgb,var(--secondary)_45%,white)]"
        }`}
        style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}
      >
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "color-mix(in srgb, var(--secondary) 80%, white)" }}
            >
              <Icon size={18} className="text-[var(--foreground)]" />
            </div>
            <span
              className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--card)] ${isConnecting ? "animate-pulse" : ""}`}
              style={{ backgroundColor: statusColor }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[16px] font-bold tracking-tight text-[var(--foreground)]">
                  {server.name}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      backgroundColor: isConnected
                        ? "rgba(34,197,94,0.10)"
                        : isError
                          ? "rgba(239,68,68,0.10)"
                          : "color-mix(in srgb, var(--secondary) 88%, white)",
                      color: isConnected
                        ? "rgb(22,163,74)"
                        : isError
                          ? "var(--destructive)"
                          : "var(--muted-foreground)",
                    }}
                  >
                    {statusText}
                  </span>
                  <span className="text-[11px] font-semibold tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
                    {serverType}
                  </span>
                </div>
              </div>

              <button
                type="button"
                aria-label={`${server.name} ${server.enabled ? t("common.disable") : t("common.enable")}`}
                aria-pressed={server.enabled}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!isConnecting) onToggle();
                }}
                disabled={isConnecting}
                className="relative inline-flex h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50"
                style={{
                  backgroundColor:
                    server.enabled || isConnecting ? "var(--foreground)" : "var(--muted)",
                }}
              >
                <span
                  className="inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200"
                  style={{
                    transform:
                      server.enabled || isConnecting
                        ? "translateX(22px) translateY(2px)"
                        : "translateX(2px) translateY(2px)",
                  }}
                />
              </button>
            </div>

            <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-[var(--muted-foreground)]">
              {endpointText}
            </p>
            <p className="mt-2 text-[12px] font-medium text-[var(--muted-foreground)]">
              {serverTools.length} {t("mcp.toolsLabel").toLowerCase()}
            </p>
          </div>
        </div>

        {isConnected && serverTools.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[color:color-mix(in_srgb,var(--border)_50%,transparent)] pt-3">
            {serverTools.slice(0, 3).map((tool) => (
              <span
                key={tool.name}
                className="rounded-md bg-[var(--secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]"
              >
                {tool.name}
              </span>
            ))}
            {serverTools.length > 3 ? (
              <span className="rounded-md bg-[var(--secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]">
                +{serverTools.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`group overflow-hidden rounded-2xl border px-5 py-4 shadow-[0px_1px_4px_rgba(0,0,0,0.03),0px_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 ${
        isConnected
          ? "bg-[color:color-mix(in_srgb,var(--card)_96%,white)] hover:-translate-y-0.5 hover:shadow-[0px_2px_8px_rgba(0,0,0,0.06),0px_4px_16px_rgba(0,0,0,0.04)]"
          : "bg-[color:color-mix(in_srgb,var(--secondary)_45%,white)] opacity-90 hover:opacity-100"
      }`}
      style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onEdit();
        }}
        className="flex cursor-pointer flex-col gap-5 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "color-mix(in srgb, var(--secondary) 80%, white)" }}
            >
              <Icon size={20} className="text-[var(--foreground)]" />
            </div>
            <span
              className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--card)] ${isConnecting ? "animate-pulse" : ""}`}
              style={{ backgroundColor: statusColor }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold tracking-tight text-[var(--foreground)]">
              {server.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: isConnected
                    ? "rgba(34,197,94,0.08)"
                    : isError
                      ? "rgba(239,68,68,0.08)"
                      : "color-mix(in srgb, var(--secondary) 88%, white)",
                  color: isConnected
                    ? "rgb(22,163,74)"
                    : isError
                      ? "var(--destructive)"
                      : "var(--muted-foreground)",
                }}
              >
                {statusText}
              </span>
              <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
                {serverType.toUpperCase()} • {endpointText}
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {serverTools.length} {t("mcp.toolsLabel").toLowerCase()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--secondary)]"
          >
            <PencilLine size={15} />
            {t("common.edit")}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (!isConnecting) onToggle();
            }}
            disabled={isConnecting}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3 text-[13px] font-semibold text-[var(--primary-foreground)] transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
          >
            <PlugZap size={15} />
            {actionLabel}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-[var(--destructive)] transition-colors duration-200 hover:bg-[color:rgba(239,68,68,0.06)]"
          >
            <Trash2 size={16} />
            {t("common.delete")}
          </button>
        </div>
      </div>

      {isConnected && serverTools.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[color:color-mix(in_srgb,var(--border)_50%,transparent)] pt-3">
          {serverTools.slice(0, 4).map((tool) => (
            <span
              key={tool.name}
              className="rounded-md bg-[var(--secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]"
            >
              {tool.name}
            </span>
          ))}
          {serverTools.length > 4 ? (
            <span className="rounded-md bg-[var(--secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]">
              +{serverTools.length - 4}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function simplifyUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}
