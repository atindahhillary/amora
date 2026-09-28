"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VOICE_MAX_SECONDS } from "@/lib/config";

type Phase = "idle" | "recording" | "recorded" | "uploading";

export function VoiceRecorder({ existingUrl, next }: { existingUrl: string | null; next: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => {
    if (phase === "recording" && seconds >= VOICE_MAX_SECONDS) stop();
  }, [phase, seconds]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
        setPhase("recorded");
      };
      recorder.current = rec;
      rec.start();
      setSeconds(0);
      setPhase("recording");
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("We couldn't reach your microphone. Allow microphone access, or upload a recording instead.");
    }
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBlob(f);
    setPreviewUrl(URL.createObjectURL(f));
    setPhase("recorded");
  }

  async function upload() {
    if (!blob) return;
    setPhase("uploading");
    const form = new FormData();
    form.append("audio", blob, "intro");
    const res = await fetch("/api/voice", { method: "POST", body: form });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Upload failed. Please try again.");
      setPhase("recorded");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="error" role="alert">{error}</p>}
      {phase === "recording" ? (
        <div className="flex items-center gap-4">
          <span className="relative flex h-3 w-3"><span className="absolute h-3 w-3 animate-ping rounded-full bg-alert opacity-60" /><span className="h-3 w-3 rounded-full bg-alert" /></span>
          <span className="font-mono tabular-nums">0:{String(seconds).padStart(2, "0")} / 0:{VOICE_MAX_SECONDS}</span>
          <button className="btn-primary" onClick={stop}>Stop</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={start} disabled={phase === "uploading"}>
            {previewUrl ? "Record again" : "Start recording"}
          </button>
          <label className="btn-ghost cursor-pointer">
            Upload a file
            <input type="file" accept="audio/*" className="sr-only" onChange={pick} />
          </label>
        </div>
      )}
      {previewUrl && phase !== "recording" && <audio controls src={previewUrl} className="w-full" />}
      {phase === "recorded" || phase === "uploading" ? (
        <button className="btn-primary" onClick={upload} disabled={phase === "uploading"}>
          {phase === "uploading" ? "Saving…" : "Use this recording"}
        </button>
      ) : null}
    </div>
  );
}
