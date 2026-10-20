"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import { predictSkeleton, type Prediction } from "@/lib/api";
import Results, { EmptyResult } from "./Results";

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
  const handsInTakeRef = useRef(false);
  const noHandFramesRef = useRef(0);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "running">("idle");
  const [mode, setMode] = useState<Mode>("record");
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
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
    let take = takeRef.current;
    takeRef.current = [];
    // drop the idle frames after the hands left the picture
    if (noHandFramesRef.current > 0) take = take.slice(0, Math.max(10, take.length - noHandFramesRef.current));
    if (take.length < 10) setError("Too short. Record the whole sign (about 1 to 3 seconds).");
    else infer(take);
  }, [infer]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setCountdown(null);
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
            drawer.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, { color: "#58a6ff", lineWidth: 3 });
            drawer.drawLandmarks(lm, { color: "#ffffff", radius: 2 });
          }
          if (p.landmarks[0]) {
            drawer.drawConnectors(p.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
              color: "#8b949e",
              lineWidth: 2,
            });
          }

          setHandsSeen(hands.length > 0);
          const buf = bufferRef.current;
          buf.push(skel);
          if (buf.length > WINDOW) buf.shift();

          if (recordingRef.current) {
            takeRef.current.push(skel);
            if (hands.length > 0) {
              handsInTakeRef.current = true;
              noHandFramesRef.current = 0;
            } else if (handsInTakeRef.current) {
              noHandFramesRef.current += 1;
            }
            // auto-stop shortly after the hands drop out of view
            if (noHandFramesRef.current >= 15 || takeRef.current.length >= MAX_RECORD_FRAMES) stopRecording();
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

  function beginTake() {
    takeRef.current = [];
    handsInTakeRef.current = false;
    noHandFramesRef.current = 0;
    recordingRef.current = true;
    setRecording(true);
  }

  function toggleRecord() {
    if (recordingRef.current) return stopRecording();
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
      return setCountdown(null);
    }
    setResult(null);
    setError(null);
    const tick = (n: number) => {
      if (n === 0) {
        countdownTimerRef.current = null;
        setCountdown(null);
        return beginTake();
      }
      setCountdown(n);
      countdownTimerRef.current = setTimeout(() => tick(n - 1), 1000);
    };
    tick(3);
  }

  const hint =
    status !== "running"
      ? "Start the camera to begin."
      : mode === "record"
        ? "Press Start recording. After a 3 second countdown, make one sign. Recording stops when your hands leave the picture."
        : "Sign in front of the camera. The prediction updates about once a second.";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Camera</h2>
          {status === "running" && (
            <span className={`text-[13px] ${recording ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
              {recording ? "Recording" : handsSeen ? "Hands detected" : "No hands in view"}
            </span>
          )}
        </div>
        <div className="card-body space-y-4">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            {status !== "running" && (
              <div className="absolute inset-0 grid place-items-center text-[13px] text-neutral-400">
                {status === "loading" ? "Loading hand and pose models..." : "Camera is off"}
              </div>
            )}
            {countdown !== null && (
              <div className="absolute inset-0 grid place-items-center bg-black/50">
                <span className="text-7xl font-semibold text-white">{countdown}</span>
              </div>
            )}
            {result && status === "running" && (
              <div className="absolute inset-x-3 bottom-3 rounded-md bg-black/75 px-3 py-2 text-white">
                <span className="text-lg font-semibold capitalize">{result.predicted_word}</span>
                <span className="ml-2 text-[13px] text-neutral-300">{(result.score * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>

          {status === "idle" && (
            <button onClick={start} className="btn btn-primary btn-block">
              Start camera
            </button>
          )}
          {status === "loading" && (
            <button disabled className="btn btn-secondary btn-block">
              <span className="spinner" />
              Loading
            </button>
          )}
          {status === "running" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(["record", "continuous"] as Mode[]).map((m) => (
                  <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className="chip !h-9 !text-sm">
                    {m === "record" ? "Record a sign" : "Continuous"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {mode === "record" ? (
                  <button onClick={toggleRecord} className={`btn ${recording ? "btn-danger" : "btn-primary"}`}>
                    {recording ? "Stop and predict" : countdown !== null ? "Cancel" : "Start recording"}
                  </button>
                ) : (
                  <span />
                )}
                <button onClick={stop} className="btn btn-secondary">
                  Stop camera
                </button>
              </div>
            </div>
          )}

          {error && <p className="alert alert-danger">{error}</p>}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Result</h2>
        </div>
        <div className="card-body">{result ? <Results top5={result.top5} /> : <EmptyResult message={hint} />}</div>
      </section>
    </div>
  );
}
