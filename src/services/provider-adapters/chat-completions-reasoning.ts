import type { ReasoningEffort } from "../../types";

function clampThinkingBudget(value: number): number {
  return Math.max(128, Math.min(32768, value));
}

export function isSiliconFlowChatCompletions(baseUrl: string): boolean {
  return /(?:^|\/\/)(?:api\.)?siliconflow\.cn(?:\/|$)/i.test(baseUrl);
}

export function mapReasoningEffortToThinkingBudget(effort: ReasoningEffort): number {
  switch (effort) {
    case "minimal":
      return 1024;
    case "low":
      return 2048;
    case "medium":
      return 4096;
    case "high":
      return 8192;
    case "xhigh":
      return 16384;
    case "none":
      return 128;
    default:
      return 4096;
  }
}

export function buildChatCompletionsReasoningPayload(
  baseUrl: string,
  reasoningEffort?: string,
): Record<string, unknown> {
  if (!reasoningEffort) {
    return {};
  }

  if (!isSiliconFlowChatCompletions(baseUrl)) {
    return { reasoning_effort: reasoningEffort };
  }

  if (reasoningEffort === "none") {
    return { enable_thinking: false };
  }

  return {
    enable_thinking: true,
    thinking_budget: clampThinkingBudget(
      mapReasoningEffortToThinkingBudget(reasoningEffort as ReasoningEffort),
    ),
  };
}
