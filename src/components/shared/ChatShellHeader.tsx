
interface ChatShellHeaderProps {
  modelName: string;
  tokenText?: string;
  reasoningHint?: string;
  onModelClick?: () => void;
  onMoreClick?: () => void;
  leading?: React.ReactNode;
}

export function ChatShellHeader({
  modelName,
  tokenText,
  onModelClick,
  leading,
}: ChatShellHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-[color:color-mix(in_srgb,var(--background)_82%,transparent)] px-4 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <button
          onClick={onModelClick}
          className="rounded-full bg-[var(--secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
        >
          {modelName}
        </button>
         <span className="hidden items-center gap-1 text-[11px] font-medium text-[var(--muted-foreground)] sm:inline-flex"> 
          </span>
    
      </div>
      <div className="flex items-center gap-3">
        {tokenText ? (
          <span className="rounded-md bg-[var(--secondary)] px-2 py-1 text-[10px] font-bold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
            {tokenText}
          </span>
        ) : null}
     
      </div>
    </header>
  );
}
