import type { ReasoningEffort } from "../types";

export function getReasoningEffortI18nKey(
  value?: ReasoningEffort,
): `providerEdit.reasoningEffort_${string}` {
  return value
    ? `providerEdit.reasoningEffort_${value}`
    : "providerEdit.reasoningEffort_default";
}

export function getReasoningEffortTitleI18nKey(): "providerEdit.reasoningEffort" {
  return "providerEdit.reasoningEffort";
}
