import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Volume2, Languages } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { GlassCard, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/builder")({
  component: BuilderPage,
});

// Languages
const LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },

  { code: "ur-PK", label: "Urdu (Pakistan)" },
  { code: "hi-IN", label: "Hindi" },

  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "it-IT", label: "Italian" },
  { code: "pt-PT", label: "Portuguese" },
  { code: "tr-TR", label: "Turkish" },

  { code: "ar-SA", label: "Arabic" },
  { code: "fa-IR", label: "Persian (Farsi)" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" },

  { code: "ru-RU", label: "Russian" }
];

// simple free translate API
async function translateText(text: string, target: string) {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${text}&langpair=en|${target}`
  );
  const data = await res.json();
  return data?.responseData?.translatedText || text;
}

function BuilderPage() {
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [rate, setRate] = useState(0.9);
  const [lang, setLang] = useState("en");

  // ================= SPEAK =================
  const speak = (msg?: string) => {
    if (!window.speechSynthesis) return;

    const utter = new SpeechSynthesisUtterance(msg || text);
    utter.rate = rate;
    utter.lang = lang;

    window.speechSynthesis.speak(utter);
  };

  // ================= TRANSLATE =================
  const handleTranslate = async () => {
    if (!text) return;

    const result = await translateText(text, lang);
    setTranslated(result);
  };

  return (
    <AppShell>
      <PageHeader
        title="Smart Builder (REAL Keyboard + Translator)"
        description="Type anything, translate & speak instantly"
      />

      <div className="grid lg:grid-cols-3 gap-4">

        {/* ================= MAIN INPUT ================= */}
        <GlassCard className="lg:col-span-2">

          <div className="text-xs text-muted-foreground mb-3 uppercase">
            Type Here (Use your REAL keyboard)
          </div>

          {/* REAL KEYBOARD INPUT */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing..."
            className="w-full min-h-[120px] text-2xl p-4 rounded-xl bg-secondary/40 outline-none"
          />

          {/* OUTPUT TRANSLATION */}
          {translated && (
            <div className="mt-4 p-3 bg-black/10 rounded-lg">
              <p className="text-xs text-muted-foreground">Translated:</p>
              <p className="text-xl font-semibold">{translated}</p>
            </div>
          )}

          {/* BUTTONS */}
          <div className="flex gap-2 mt-4 flex-wrap">

            <Button onClick={() => speak()}>
              <Volume2 className="w-4 h-4 mr-2" />
              Speak
            </Button>

            <Button onClick={handleTranslate} variant="outline">
              Translate
            </Button>

            <Button
              variant="outline"
              onClick={() => setText("")}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>

          </div>
        </GlassCard>

        {/* ================= SETTINGS ================= */}
        <GlassCard>

          <div className="flex items-center gap-2 mb-3">
            <Languages className="w-4 h-4" />
            Settings
          </div>

          {/* LANGUAGE SELECT */}
          <label className="text-xs">Target Language</label>
          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger className="mt-1 mb-3">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* SPEED */}
          <label className="text-xs">Speech Speed</label>
          <Slider
            value={[rate]}
            onValueChange={(v) => setRate(v[0])}
            min={0.5}
            max={1.5}
            step={0.1}
          />

          <div className="text-xs mt-2 text-muted-foreground">
            Rate: {rate.toFixed(1)}
          </div>

        </GlassCard>

      </div>
    </AppShell>
  );
}