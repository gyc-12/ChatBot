export function isReasoningProbeSupported(status: number, responseText: string): boolean {
  if (status >= 200 && status < 300) {
    return true;
  }

  const normalizedText = responseText.trim().toLowerCase();
  if (!normalizedText) {
    return false;
  }

  if (
    /(reasoning|reasoning_effort|thinking|thinking_budget|enable_thinking|budget_tokens)/.test(normalizedText) &&
    /(unsupported|not supported|unknown|invalid|not allowed|extra inputs are not permitted)/.test(
      normalizedText,
    )
  ) {
    return false;
  }

  return false;
}
