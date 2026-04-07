import { useSyncExternalStore } from "react";
import { synthesizeSpeech } from "./voice-client";
import type { TtsConfig } from "./voice-api";

type PlaybackStatus = "idle" | "loading" | "playing";

type PlaybackSnapshot = {
  messageId: string | null;
  status: PlaybackStatus;
};

const listeners = new Set<() => void>();

let snapshot: PlaybackSnapshot = {
  messageId: null,
  status: "idle",
};
let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let currentAbortController: AbortController | null = null;

function emit(next: PlaybackSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function cleanupPlayback() {
  currentAbortController?.abort();
  currentAbortController = null;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  emit({ messageId: null, status: "idle" });
}

export function stopSpeechPlayback() {
  cleanupPlayback();
}

export async function toggleSpeechPlayback(options: {
  messageId: string;
  text: string;
  config: TtsConfig;
}): Promise<"started" | "stopped"> {
  const { messageId, text, config } = options;

  if (snapshot.messageId === messageId && snapshot.status !== "idle") {
    cleanupPlayback();
    return "stopped";
  }

  cleanupPlayback();

  const controller = new AbortController();
  currentAbortController = controller;
  emit({ messageId, status: "loading" });

  try {
    const blob = await synthesizeSpeech(config, text, controller.signal);
    if (controller.signal.aborted) {
      return "stopped";
    }

    currentObjectUrl = URL.createObjectURL(blob);
    const audio = new Audio(currentObjectUrl);
    currentAudio = audio;

    audio.onended = () => {
      if (currentAudio === audio) cleanupPlayback();
    };
    audio.onerror = () => {
      if (currentAudio === audio) cleanupPlayback();
    };

    await audio.play();
    emit({ messageId, status: "playing" });
    return "started";
  } catch (error) {
    cleanupPlayback();
    throw error;
  }
}

export function useVoicePlayback(messageId: string) {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => ({
      isLoading: snapshot.messageId === messageId && snapshot.status === "loading",
      isPlaying: snapshot.messageId === messageId && snapshot.status === "playing",
      activeMessageId: snapshot.messageId,
      status: snapshot.status,
    }),
    () => ({
      isLoading: false,
      isPlaying: false,
      activeMessageId: null,
      status: "idle" as PlaybackStatus,
    }),
  );
}
