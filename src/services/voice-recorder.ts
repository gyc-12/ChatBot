const AUDIO_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
] as const;

export interface VoiceRecordingSession {
  stop: () => Promise<Blob>;
  cancel: () => void;
}

export function isVoiceRecordingSupported(): boolean {
  return Boolean(
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined",
  );
}

export async function startVoiceRecording(): Promise<VoiceRecordingSession> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickSupportedMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.start();

  const stopTracks = () => {
    stream.getTracks().forEach((track) => track.stop());
  };

  return {
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => {
          stopTracks();
          reject(new Error("voice-recording-failed"));
        };
        recorder.onstop = () => {
          stopTracks();
          resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
        };
        recorder.stop();
      }),
    cancel: () => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      stopTracks();
    },
  };
}

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }

  return AUDIO_MIME_TYPES.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}
