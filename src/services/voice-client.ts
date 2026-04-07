import { appFetch } from "../lib/http";
import {
  buildSttTranscriptionRequest,
  buildTtsSpeechRequest,
  extractTranscriptionText,
  type SttConfig,
  type TtsConfig,
} from "./voice-api";

export async function transcribeAudio(
  config: SttConfig,
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  const request = buildSttTranscriptionRequest(config, file);
  const response = await appFetch(request.url, {
    ...request.init,
    signal,
  });

  if (!response.ok) {
    throw new Error(await buildVoiceErrorMessage(response));
  }

  const payload = await response.json().catch(() => ({}));
  return extractTranscriptionText(payload);
}

export async function synthesizeSpeech(
  config: TtsConfig,
  input: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const request = buildTtsSpeechRequest(config, input);
  const response = await appFetch(request.url, {
    ...request.init,
    signal,
  });

  if (!response.ok) {
    throw new Error(await buildVoiceErrorMessage(response));
  }

  return response.blob();
}

async function buildVoiceErrorMessage(response: Response): Promise<string> {
  const detail = await response.text().catch(() => "");
  const suffix = detail.trim() ? `: ${detail.trim().slice(0, 200)}` : "";
  return `${response.status} ${response.statusText || "Request failed"}${suffix}`;
}
