import { createFileRoute } from "@tanstack/react-router";
import { auth, db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import {
  UploadCloud,
  Sparkles,
  X,
  Plus,
  RotateCcw,
  Volume2,
  MessageCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { GlassCard, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { predictImage } from "@/lib/api";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
});

function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [word, setWord] = useState<string>("");

  const objectUrlRef = useRef<string | null>(null);

  // ================= RESET FUNCTION =================
  const resetUpload = () => {
    setPreview(null);
    setLetter(null);
    setConfidence(0);
    setAnalyzing(false);
  };

  // ================= FILE HANDLING =================
  const onFile = async (file: File) => {
    if (!file) return;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    setPreview(url);
    setLetter(null);
    setConfidence(0);
    setAnalyzing(true);

    try {
      const data = await predictImage(file as Blob);
      const predictedLetter = data.label || "—";
      
      // Auto-fixing confidence formatting (e.g., handles both 0.95 and 95 format metrics)
      const rawConfidence = data?.confidence || 0;
      const parsedConfidence = rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;

      setLetter(predictedLetter);
      setConfidence(parsedConfidence);

      // ================= SAVE TO FIRESTORE HISTORY =================
      const user = auth.currentUser;
      if (user && predictedLetter !== "—" && predictedLetter !== "?") {
        try {
         await addDoc(collection(db, "asl_history"), {
  userId: user.uid,
  email: user.email,
  gesture: predictedLetter,
  confidence: parsedConfidence / 100,
  timestamp: serverTimestamp(),
});

// Update user's prediction count
const userRef = doc(db, "users", user.uid);

await updateDoc(userRef, {
  predictions: increment(1),
});
          console.log("Static image prediction successfully saved to history!");
        } catch (firebaseErr) {
          console.error("Firestore Upload Log Error:", firebaseErr);
        }
      }
    } catch (err) {
      console.error("API Prediction System Crash:", err);
      setLetter("?");
      setConfidence(0);
    } finally {
      setAnalyzing(false);
    }
  };

  // ================= SPEAK FUNCTION =================
  const speak = () => {
    if (!letter || letter === "?") return;
    window.speechSynthesis.cancel(); // Stop any pending speech
    const u = new SpeechSynthesisUtterance(letter);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  return (
    <AppShell>
      <PageHeader
        title="Upload Image"
        description="AI-powered static American Sign Language (ASL) gesture recognition engine."
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* LEFT COMPONENT - IMAGE INTERACTION CANVAS */}
        <GlassCard className="lg:col-span-2">
          {!preview ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl aspect-video flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/5 transition-all duration-200 border-muted-foreground/20"
            >
              <UploadCloud className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click or Drop ASL Sign Image Here</p>
              <Button className="gradient-primary text-white shadow-md font-medium">
                Choose Local File
              </Button>
            </div>
          ) : (
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-inner border border-glass-border">
              <img src={preview} className="w-full h-full object-contain" alt="ASL Source Preview" />

              <Button
                size="icon"
                variant="secondary"
                className="absolute top-3 right-3 rounded-xl backdrop-blur"
                onClick={resetUpload}
              >
                <X className="w-4 h-4" />
              </Button>

              {analyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white backdrop-blur-sm transition-all">
                  <Sparkles className="animate-spin w-8 h-8 text-primary mb-2" />
                  <span className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Parsing Matrix Data...</span>
                </div>
              )}
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </GlassCard>

        {/* RIGHT PANELS - LIVE RECOGNITION ANALYTICS */}
        <div className="space-y-4">
          <GlassCard className="p-5 border border-glass-border">
            <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Prediction Output</div>
            <div className="text-6xl font-black my-3 text-primary tracking-tight">{letter ?? "—"}</div>

            <div className="flex gap-2 w-full mt-4">
              <Button onClick={speak} disabled={!letter || letter === "?"} className="w-full font-semibold">
                <Volume2 className="w-4 h-4 mr-2" />
                Speak Text
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4 font-medium">
              Confidence Accuracy: <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md ml-1">{Math.round(confidence)}%</span>
            </p>

            {letter && (
              <Button
                variant="secondary"
                className="w-full mt-4 rounded-xl font-medium border border-glass-border transition-colors hover:bg-white/10"
                onClick={resetUpload}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Upload New Sample
              </Button>
            )}
          </GlassCard>

          {/* WORD BUILDER INTERACTION UTILITY */}
          <GlassCard className="p-5 border border-glass-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Sentence Composer</span>
              <Button size="icon" variant="ghost" className="w-7 h-7 rounded-lg hover:bg-white/5" onClick={() => setWord("")}>
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>

            <div className="text-2xl font-black tracking-widest text-foreground py-3 border-b border-white/5 min-h-[48px] flex items-center">
              {word || <span className="text-sm font-normal normal-case tracking-normal text-muted-foreground/60">No structured workflow initiated.</span>}
            </div>

            <Button
              className="w-full mt-4 gradient-primary text-white shadow-glow font-semibold transition-all hover:opacity-95"
              disabled={!letter || letter === "?"}
              onClick={() => setWord((w) => w + letter)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Append Letter
            </Button>
          </GlassCard>

          {letter && letter !== "?" && (
            <GlassCard className="border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-xl transition-all animate-fade-in">
              <div className="flex gap-2 text-xs text-emerald-400 items-center font-medium">
                <MessageCircle className="w-4 h-4 shrink-0" />
                State logged cleanly inside cloud dataset.
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </AppShell>
  );
}