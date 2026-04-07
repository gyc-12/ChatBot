import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSttTranscriptionRequest,
  buildTtsSpeechRequest,
  extractTranscriptionText,
  isSttConfigured,
  isTtsConfigured,
  type SttConfig,
  type TtsConfig,
} from "./voice-api.ts";

const sttConfig: SttConfig = {
  baseUrl: "https://speech.example.com/v1/",
  apiKey: "stt-key",
  model: "whisper-1",
};

const ttsConfig: TtsConfig = {
  baseUrl: "https://speech.example.com/v1/",
  apiKey: "tts-key",
  model: "gpt-4o-mini-tts",
  voice: "alloy",
  responseFormat: "mp3",
};

test("buildSttTranscriptionRequest builds an OpenAI-compatible multipart request", () => {
  const audioFile = new File([new Uint8Array([1, 2, 3])], "sample.webm", {
    type: "audio/webm",
  });

  const request = buildSttTranscriptionRequest(sttConfig, audioFile);
  const body = request.init.body as FormData;

  assert.equal(request.url, "https://speech.example.com/v1/audio/transcriptions");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers?.Authorization, "Bearer stt-key");
  assert.equal(body.get("model"), "whisper-1");
  assert.equal((body.get("file") as File).name, "sample.webm");
});

test("buildTtsSpeechRequest builds an OpenAI-compatible JSON request", async () => {
  const request = buildTtsSpeechRequest(ttsConfig, "Hello from ChatBot");

  assert.equal(request.url, "https://speech.example.com/v1/audio/speech");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers?.Authorization, "Bearer tts-key");
  assert.equal(request.init.headers?.["Content-Type"], "application/json");

  const payload = JSON.parse(String(request.init.body));
  assert.deepEqual(payload, {
    model: "gpt-4o-mini-tts",
    input: "Hello from ChatBot",
    voice: "alloy",
    response_format: "mp3",
  });
});

test("extractTranscriptionText supports common transcription payload shapes", () => {
  assert.equal(extractTranscriptionText({ text: "hello world" }), "hello world");
  assert.equal(extractTranscriptionText({ transcript: "hello again" }), "hello again");
  assert.equal(
    extractTranscriptionText({
      results: [{ text: "first" }, { transcript: "second" }],
    }),
    "first\nsecond",
  );
  assert.equal(extractTranscriptionText({}), "");
});

test("voice config helpers require the minimum custom API fields", () => {
  assert.equal(isSttConfigured(sttConfig), true);
  assert.equal(isSttConfigured({ ...sttConfig, apiKey: "" }), false);
  assert.equal(isTtsConfigured(ttsConfig), true);
  assert.equal(isTtsConfigured({ ...ttsConfig, voice: "" }), false);
});
