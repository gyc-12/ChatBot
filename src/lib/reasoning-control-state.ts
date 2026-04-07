import type { Conversation, Model, ReasoningEffort } from "../types";
import { supportsReasoningControls } from "./model-utils.ts";

export function getReasoningControlState(
  model: Pick<Model, "capabilities" | "capabilitiesVerified"> | null | undefined,
  conversation: Pick<Conversation, "reasoningEffort"> | null | undefined,
): {
  canConfigureReasoning: boolean;
  reasoningEffort: ReasoningEffort | undefined;
} {
  const canConfigureReasoning = supportsReasoningControls(model);

  return {
    canConfigureReasoning,
    reasoningEffort: canConfigureReasoning ? conversation?.reasoningEffort : undefined,
  };
}
