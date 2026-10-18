"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import { predictSkeleton, type Prediction } from "@/lib/api";
import Results from "./Results";

const WINDOW = 64;
const MAX_RECORD_FRAMES = 150;
const ZERO21 = Array.from({ length: 21 }, () => [0, 0, 0]);

type Mode = "record" | "continuous";
type Pt = { x: number; y: number; z: number };

// 33 pose + 21 left hand + 21 right hand, same order the model was trained on
function toSkeleton(pose: Pt[] | undefined, hands: { lm: Pt[]; label: string }[]): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < 33; i++) out.push(pose ? [pose[i].x, pose[i].y, pose[i].z] : [0, 0, 0]);
  let left = ZERO21;
  let right = ZERO21;
  for (const h of hands) {
    const c = h.lm.map((q) => [q.x, q.y, q.z]);
    if (h.label === "Left") left = c;
    else right = c;
  }
  return [...out, ...left, ...right];
}

export default function Live() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const handRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const bufferRef = useRef<number[][][]>([]);
  const recordingRef = useRef(false);
  const takeRef = useRef<number[][][]>([]);
  const modeRef = useRef<Mode>("record");
  const lastInferRef = useRef(0);
  const inflightRef = useRef(false);

  const [status, setStatus] = useState<"idle" | "loading" | "running">("idle");
  const [mode, setMode] = useState<Mode>("record");
  const [recording, setRecording] = useState(false);
  const [handsSeen, setHandsSeen] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const infer = useCallback(async (frames: number[][][]) => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      setResult(await predictSkeleton(frames));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      inflightRef.current = false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    const take = takeRef.current;
    takeRef.current = [];
    if (take.length < 10) setError("Too short. Record the whole sign (about 1 to 3 seconds).");
    else infer(take);
  }, [infer]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    poseRef.current?.close();
    handRef.current?.close();
    poseRef.current = null;
    handRef.current = null;
    bufferRef.current = [];
    recordingRef.current = false;
    setRecording(false);
    setStatus("idle");
  }, []);

  useEffect(() => stop, [stop]);

  async function start() {
    setStatus("loading");
    setError(null);
    try {
      const { FilesetResolver, PoseLandmarker, HandLandmarker, DrawingUtils } = await import(
        "@mediapipe/tasks-vision"
      );
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const make = async (delegate: "GPU" | "CPU") => {
        const pose = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_full.task", delegate },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        const hand = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/mediapipe/hand_landmarker.task", delegate },
          runningMode: "VIDEO",
          numHands: 2,
        });
        return { pose, hand };
      };
      let m;
      try {
        m = await make("GPU");
      } catch {
        m = await make("CPU");
      }
      poseRef.current = m.pose;
      handRef.current = m.hand;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStatus("running");

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const drawer = new DrawingUtils(ctx);
      let lastTime = -1;

      const loop = () => {
        const v = videoRef.current;
        if (!v || !poseRef.current || !handRef.current) return;
        if (v.readyState >= 2 && v.currentTime !== lastTime) {
          lastTime = v.currentTime;
          if (canvas.width !== v.videoWidth) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
          }
          const ts = performance.now();
          const p = poseRef.current.detectForVideo(v, ts);
          const h = handRef.current.detectForVideo(v, ts);
          const hands = h.landmarks.map((lm, i) => ({
            lm,
            label: h.handedness[i]?.[0]?.categoryName ?? "Right",
          }));
          const skel = toSkeleton(p.landmarks[0], hands);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          for (const lm of h.landmarks) {
            drawer.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, { color: "#10b981", lineWidth: 3 });
            drawer.drawLandmarks(lm, { color: "#ffffff", radius: 2 });
          }
          if (p.landmarks[0]) {
            drawer.drawConnectors(p.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
              color: "#60a5fa",
              lineWidth: 2,
            });
          }

          setHandsSeen(hands.length > 0);
          const buf = bufferRef.current;
          buf.push(skel);
          if (buf.length > WINDOW) buf.shift();

          if (recordingRef.current) {
            takeRef.current.push(skel);
            if (takeRef.current.length >= MAX_RECORD_FRAMES) stopRecording();
          } else if (
            modeRef.current === "continuous" &&
            buf.length === WINDOW &&
            hands.length > 0 &&
            ts - lastInferRef.current > 700
          ) {
            lastInferRef.current = ts;
            infer([...buf]);
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      stop();
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Camera permission was denied."
          : `Could not start the camera: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  function toggleRecord() {
    if (recordingRef.current) return stopRecording();
    takeRef.current = [];
    recordingRef.current = true;
    setRecording(true);
    setResult(null);
    setError(null);
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,320px)_1fr]">
      <div className="space-y-3">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-900 shadow-lg">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
          />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
          {recording && (
            <span className="rec-pulse absolute left-2 top-2 rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-medium text-white">
              REC
            </span>
          )}
          {status === "running" && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-0.5 text-xs text-white backdrop-blur">
              {handsSeen ? "Hands detected" : "No hands in view"}
            </span>
          )}
        </div>

        {status === "idle" && (
          <button onClick={start} className="btn btn-primary w-full">
            Start camera
          </button>
        )}
        {status === "loading" && <p className="flex items-center gap-2 text-sm text-[var(--muted)]"><span className="spinner !border-indigo-300/30 !border-t-indigo-300" />Loading hand and pose models...</p>}
        {status === "running" && (
          <>
            <div className="flex gap-2">
              {(["record", "continuous"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`btn flex-1 ${mode === m ? "btn-active" : "btn-ghost"}`}
                >
                  {m === "record" ? "Record a sign" : "Continuous"}
                </button>
              ))}
            </div>
            {mode === "record" && (
              <button
                onClick={toggleRecord}
                className={`btn w-full ${recording ? "btn-danger rec-pulse" : "btn-primary"}`}
              >
                {recording ? "Stop and predict" : "Start recording"}
              </button>
            )}
            <button onClick={stop} className="btn btn-ghost w-full">
              Stop camera
            </button>
          </>
        )}
        {error && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-300">{error}</p>}
      </div>

      <div>
        {result ? (
          <Results top5={result.top5} />
        ) : (
          <p className="grid h-full min-h-40 place-items-center rounded-2xl bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">
            {status === "running"
              ? mode === "record"
                ? "Press Start recording, make one sign, then press Stop and predict."
                : "Sign in front of the camera. Predictions update about once a second."
              : "Start the camera to begin."}
          </p>
        )}
      </div>
    </div>
  );
}
