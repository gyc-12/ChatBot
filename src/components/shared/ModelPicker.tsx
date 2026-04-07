import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useProviderStore } from "../../stores/provider-store";
import { groupModelsByProvider } from "../../lib/model-utils";
import { getModelIcon } from "../../lib/model-icons";

interface ModelPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (modelId: string) => void;
  selectedModelId?: string;
}

export function ModelPicker({ open, onClose, onSelect, selectedModelId }: ModelPickerProps) {
  const { t } = useTranslation();
  const models = useProviderStore((s) => s.models);
  const getProviderById = useProviderStore((s) => s.getProviderById);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setSearch("");
    }
  }, [open]);

  const enabledModels = useMemo(() => models.filter((m) => m.enabled), [models]);

  const filtered = useMemo(() => {
    if (!search.trim()) return enabledModels;
    const q = search.toLowerCase();
    return enabledModels.filter(
      (m) => m.displayName.toLowerCase().includes(q) || m.modelId.toLowerCase().includes(q),
    );
  }, [enabledModels, search]);

  const sections = useMemo(
    () => groupModelsByProvider(filtered, getProviderById),
    [filtered, getProviderById],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[70vh] max-w-sm flex-col gap-0 overflow-hidden rounded-[24px] p-0">
        <div className="px-5 pt-5 pb-3">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold">{t("chat.selectModel")}</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div
            className="mt-3 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5"
            style={{ backgroundColor: "var(--secondary)" }}
          >
            <Search size={16} className="flex-shrink-0 text-[var(--muted-foreground)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("providerEdit.searchModels")}
              className="flex-1 bg-transparent text-[15px] leading-5 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]/50"
            />
          </div>
        </div>

        {/* Model list */}
        <div className="flex-1 overflow-y-auto px-2.5 pb-2.5">
          {sections.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--muted-foreground)]">
              {models.length === 0 ? t("models.noModels") : t("chats.noResults")}
            </p>
          ) : (
            sections.map((section) => (
              <div key={section.title} className="mb-1">
                {/* Section header */}
                <div className="sticky top-0 z-10 px-2.5 py-2" style={{ backgroundColor: "var(--background)" }}>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    {section.title}
                  </p>
                </div>

                {/* Model items */}
                {section.data.map((model) => {
                  const isSelected = model.id === selectedModelId;
                  const showModelId = model.modelId !== model.displayName;

                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        onSelect(model.id);
                        onClose();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors active:opacity-70"
                      style={{
                        backgroundColor: isSelected
                          ? "color-mix(in srgb, var(--primary) 10%, var(--accent))"
                          : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.backgroundColor = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--muted-foreground)]"
                        style={{ backgroundColor: "var(--secondary)" }}
                      >
                        {getModelIcon(model.displayName || model.modelId)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-[var(--foreground)]">
                          {model.displayName}
                        </p>
                        {showModelId && (
                          <p className="mt-0.5 truncate text-[12px] text-[var(--muted-foreground)]">
                            {model.modelId}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Check
                          size={16}
                          strokeWidth={2.5}
                          className="flex-shrink-0 text-[var(--foreground)]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
