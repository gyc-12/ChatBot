import { appFetch } from "../../lib/http";
import { isReasoningProbeSupported } from "./reasoning-probe-utils";

interface ReasoningProbeRequest {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export async function probeReasoningCapability({
  url,
  headers,
  body,
}: ReasoningProbeRequest): Promise<boolean> {
  try {
    const response = await appFetch(url, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify(body),
    });

    const responseText = response.ok ? "" : await response.text().catch(() => "");
    return isReasoningProbeSupported(response.status, responseText);
  } catch {
    return false;
  }
}
