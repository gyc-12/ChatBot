import type { SettingsIcon } from "./settings-sections";
import { IoChevronForward } from "../../icons";

export function SettingsSectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-[color:color-mix(in_srgb,var(--card)_94%,white)] px-5 py-5 shadow-[0px_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-[color:color-mix(in_srgb,var(--border)_50%,transparent)]">
      {eyebrow ? (
        <p className="text-[11px] font-black tracking-[0.18em] text-[var(--muted-foreground)] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-[22px] font-black tracking-tight text-[var(--foreground)]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}

export function SettingsCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  detail,
  onClick,
  rightSlot,
  destructive = false,
}: {
  icon: SettingsIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  detail?: string;
  onClick?: () => void;
  rightSlot?: React.ReactNode;
  destructive?: boolean;
}) {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={`flex w-full items-center gap-3.5 rounded-2xl bg-[var(--card)] px-4 py-3.5 text-left shadow-[0px_1px_4px_rgba(0,0,0,0.03),0px_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-[color:color-mix(in_srgb,var(--border)_50%,transparent)] ${onClick ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0px_2px_8px_rgba(0,0,0,0.06),0px_4px_16px_rgba(0,0,0,0.04)]" : ""}`}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        <Icon width={18} height={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[15px] font-semibold"
          style={{ color: destructive ? "var(--destructive)" : "var(--foreground)" }}
        >
          {title}
        </p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--muted-foreground)]">{description}</p>
      </div>
      {rightSlot ?? (detail ? <CardDetail detail={detail} /> : null)}
      {onClick ? (
        <IoChevronForward size={18} color="var(--muted-foreground)" style={{ opacity: 0.4 }} />
      ) : null}
    </Comp>
  );
}

export function SettingsToggleCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  checked,
  onToggle,
  rightSlot,
}: {
  icon: SettingsIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-[var(--card)] px-4 py-3.5 shadow-[0px_1px_4px_rgba(0,0,0,0.03),0px_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-[color:color-mix(in_srgb,var(--border)_50%,transparent)]">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        <Icon width={18} height={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[var(--foreground)]">{title}</p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--muted-foreground)]">{description}</p>
      </div>
      {rightSlot}
      <button
        type="button"
        aria-label={title}
        aria-pressed={checked}
        onClick={onToggle}
        className="relative inline-flex h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-200"
        style={{ backgroundColor: checked ? "var(--foreground)" : "var(--muted)" }}
      >
        <span
          className="inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{
            transform: checked
              ? "translateX(22px) translateY(2px)"
              : "translateX(2px) translateY(2px)",
          }}
        />
      </button>
    </div>
  );
}

export function SettingsIndexCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  detail,
  onClick,
}: {
  icon: SettingsIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-2xl bg-[var(--card)] px-4 py-3.5 text-left shadow-[0px_1px_4px_rgba(0,0,0,0.03),0px_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-[color:color-mix(in_srgb,var(--border)_50%,transparent)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0px_2px_8px_rgba(0,0,0,0.06),0px_4px_16px_rgba(0,0,0,0.04)]"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        <Icon width={18} height={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[var(--foreground)]">{title}</p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--muted-foreground)]">{description}</p>
      </div>
      {detail ? <CardDetail detail={detail} /> : null}
      <IoChevronForward size={18} color="var(--muted-foreground)" style={{ opacity: 0.4 }} />
    </button>
  );
}

function CardDetail({ detail }: { detail: string }) {
  return (
    <span className="max-w-[132px] truncate rounded-md bg-[var(--secondary)] px-2 py-0.5 text-[11px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
      {detail}
    </span>
  );
}
