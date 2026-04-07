export interface SttConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface TtsConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  voice: string;
  responseFormat?: string;
}

export interface VoiceRequestSpec {
  url: string;
  init: RequestInit & {
    headers: Record<string, string>;
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function buildAuthHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
  };
}

export function isSttConfigured(config: SttConfig): boolean {
  return Boolean(config.baseUrl.trim() && config.apiKey.trim() && config.model.trim());
}

export function isTtsConfigured(config: TtsConfig): boolean {
  return Boolean(
    config.baseUrl.trim() && config.apiKey.trim() && config.model.trim() && config.voice.trim(),
  );
}

export function buildSttTranscriptionRequest(config: SttConfig, file: File): VoiceRequestSpec {
  const body = new FormData();
  body.set("model", config.model.trim());
  body.set("file", file);

  return {
    url: `${normalizeBaseUrl(config.baseUrl)}/audio/transcriptions`,
    init: {
      method: "POST",
      headers: buildAuthHeaders(config.apiKey),
      body,
    },
  };
}

export function buildTtsSpeechRequest(config: TtsConfig, input: string): VoiceRequestSpec {
  return {
    url: `${normalizeBaseUrl(config.baseUrl)}/audio/speech`,
    init: {
      method: "POST",
      headers: {
        ...buildAuthHeaders(config.apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model.trim(),
        input,
        voice: config.voice.trim(),
        response_format: config.responseFormat?.trim() || "mp3",
      }),
    },
  };
}

export function extractTranscriptionText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const text = readTextValue(payload);
  if (text) return text;

  const results = Reflect.get(payload, "results");
  if (!Array.isArray(results)) return "";

  return results
    .map((item) => readTextValue(item))
    .filter(Boolean)
    .join("\n");
}

function readTextValue(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const text = Reflect.get(value, "text");
  if (typeof text === "string" && text.trim()) return text.trim();

  const transcript = Reflect.get(value, "transcript");
  if (typeof transcript === "string" && transcript.trim()) return transcript.trim();

  return "";
}
