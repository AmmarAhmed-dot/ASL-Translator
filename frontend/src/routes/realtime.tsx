import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useRef, useState } from "react";
import axiosInstance from "axios";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Camera, CameraOff, Volume2, Sparkles, RefreshCw, Crosshair } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

const BACKEND_URL = "http://127.0.0.1:5000";

export const Route = createFileRoute("/realtime")({
  component: RealtimeCamera,
});

// ─── Backend response type ───────────────────────────────────────────────────
interface BoundingBox {
  detected: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PredictRealtimeResponse {
  label: string;
  confidence: number;
  bbox: number[];
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

function RealtimeCamera() {
  const videoRef        = useRef<HTMLVideoElement>(null);
  const canvasRef       = useRef<HTMLCanvasElement>(null);       // hidden snapshot canvas
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);      // bounding-box overlay

  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraOn,  setIsCameraOn]  = useState(false);
  const [prediction,  setPrediction]  = useState("No Sign Captured Yet");
  const [confidence,  setConfidence]  = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Stop stream on unmount
  useEffect(() => () => stopCamera(), []);

  // ── TTS ────────────────────────────────────────────────────────────────────
  const speakText = (text: string) => {
    if (
      !text ||
      text === "No Sign Captured Yet" ||
      text === "Analyzing Sign Matrix..." ||
      text === "?"
    ) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // ── Camera controls ────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        setIsCameraOn(true);
        clearOverlay();
      }
    } catch (err) {
      console.error("Camera Access Error:", err);
      alert("Camera configuration error. Please ensure permissions are active.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOn(false);
    setPrediction("No Sign Captured Yet");
    setConfidence(0);
    clearOverlay();
  };

  // ── Overlay helpers ────────────────────────────────────────────────────────
  const clearOverlay = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  /**
   * Draw neon bounding box.
   * bbox uses ABSOLUTE pixel coords returned by the backend (after MediaPipe crop).
   * Video is mirrored via CSS (-scale-x-100), so we mirror the X axis here too.
   */
  const drawHandBoundingBox = (bbox: BoundingBox, label: string) => {
    const canvas = overlayCanvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to rendered video element
    canvas.width  = video.clientWidth;
    canvas.height = video.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scale factor: backend processed the native video resolution
    const scaleX = canvas.width  / (video.videoWidth  || 640);
    const scaleY = canvas.height / (video.videoHeight || 480);

    const x = bbox.x * scaleX;
    const y = bbox.y * scaleY;
    const w = bbox.w * scaleX;
    const h = bbox.h * scaleY;

    // Mirror X because the video element has transform: scaleX(-1)
    const mirroredX = canvas.width - (x + w);

    // Neon rectangle
    ctx.strokeStyle = "#10B981";
    ctx.lineWidth   = 3;
    ctx.shadowBlur  = 12;
    ctx.shadowColor = "#10B981";
    ctx.strokeRect(mirroredX, y, w, h);

    // Label badge
    ctx.shadowBlur = 0;
    ctx.font = "bold 12px sans-serif";
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = "#10B981";
    ctx.fillRect(mirroredX - 1, y - 22, textWidth + 16, 22);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(label, mirroredX + 8, y - 6);
  };

  // ── Capture + call /predict_realtime ──────────────────────────────────────
  const captureAndAnalyze = async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isCameraOn) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw current frame onto hidden canvas
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 data URL (JPEG 95%)
    const base64Image = canvas.toDataURL("image/jpeg", 0.95);

    try {
      setIsAnalyzing(true);
      setPrediction("Analyzing Sign Matrix...");
      clearOverlay();

      // Convert the base64 image to a Blob
      const fetchResponse = await fetch(base64Image);
      const blob = await fetchResponse.blob();
      
      // Send as multipart/form-data
      const formData = new FormData();
      formData.append("image", blob, "realtime_capture.jpg");

      const response = await axiosInstance.post<PredictRealtimeResponse>(
        `${BACKEND_URL}/predict_realtime`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const data = response.data;

      if (data.error) {
        setPrediction("Error");
        setConfidence(0);
        clearOverlay();
        return;
      }

      // ── Parse Response ─────────────────────────────────────────────────────
      const label = data.label;
      const conf  = data.confidence * 100; // backend returns 0-1, we need 0-100

      // ── Low confidence fallback ────────────────────────────────────────────
      if (label === "Analyzing Sign Matrix..." || conf < 10) {
        setPrediction("Hold Hand Steady...");
        setConfidence(conf);
        clearOverlay();
        return;
      }

      // ── Good prediction ────────────────────────────────────────────────────
      setPrediction(label);
      setConfidence(conf);
      speakText(label);

      // Draw bounding box if available
      if (data.bbox && data.bbox.length === 4) {
        drawHandBoundingBox(
          {
            detected: true,
            x: data.bbox[0],
            y: data.bbox[1],
            w: data.bbox[2],
            h: data.bbox[3]
          },
          `${label} (${Math.round(conf)}%)`
        );
      }

      // Firestore log
      const user = auth.currentUser;
      if (user && label !== "Unknown") {
        try {
          await addDoc(collection(db, "asl_history"), {
            userId:     user.uid,
            email:      user.email,
            gesture:    label,
            confidence: conf / 100,             // store as 0–1 in DB
            timestamp:  serverTimestamp(),
          });
        } catch (e) {
          console.error("Firestore write failed:", e);
        }
      }
    } catch (error) {
      console.error("Prediction API Error:", error);
      setPrediction("Error Analyzing Sign");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <PageHeader
        title="Live Sign Language Translator"
        description="Position your hand sign clearly inside the viewscreen frame and capture to isolate target predictions."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── VIEW SCREEN PANEL ─────────────────────────────────────────────── */}
        <GlassCard className="lg:col-span-2 flex flex-col items-center p-6 gap-4">
          {/* Hidden snapshot canvas */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-glass-border shadow-md select-none">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Neon overlay canvas */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
            />

            {!isCameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-muted-foreground text-sm gap-2">
                <Crosshair className="w-8 h-8 text-slate-600 animate-pulse" />
                <span>Camera Stream Offline</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3 w-full">
            {!isCameraOn ? (
              <Button
                onClick={startCamera}
                className="w-full gradient-primary text-white font-semibold h-11 rounded-xl shadow-md"
              >
                <Camera className="w-4 h-4 mr-2" /> Turn On Camera System
              </Button>
            ) : (
              <>
                <Button
                  onClick={captureAndAnalyze}
                  disabled={isAnalyzing}
                  className="flex-1 gradient-primary text-white font-bold h-11 rounded-xl shadow-glow"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing Target Array...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Capture & Track Sign
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={stopCamera}
                  className="rounded-xl h-11 border-glass-border text-xs"
                >
                  <CameraOff className="w-4 h-4 mr-1" /> Turn Off
                </Button>
              </>
            )}
          </div>
        </GlassCard>

        {/* ── RESULTS PANEL ─────────────────────────────────────────────────── */}
        <GlassCard className="p-6 border border-glass-border h-fit">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
            Translated Matrix Output
          </span>

          <div className="min-h-[80px] flex items-center">
            <h1 className="text-4xl font-black tracking-tight text-foreground transition-all">
              {prediction}
            </h1>
          </div>

          <Button
            onClick={() => speakText(prediction)}
            disabled={
              prediction === "No Sign Captured Yet" ||
              prediction === "No Hand Detected"     ||
              isAnalyzing
            }
            variant="secondary"
            className="w-full font-semibold rounded-xl h-10 mt-4"
          >
            <Volume2 className="w-4 h-4 mr-2 text-primary" /> Vocalize Gesture
          </Button>

          {confidence > 0 && (
            <div className="mt-6 pt-4 border-t border-glass-border space-y-2">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Prediction Match Weight</span>
                <span className="font-bold text-primary">{Math.round(confidence)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden p-[1px]">
                <div
                  className="gradient-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${confidence}%` }}
                />
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}

export default RealtimeCamera;
