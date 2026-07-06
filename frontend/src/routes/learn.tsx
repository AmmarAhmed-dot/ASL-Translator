import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { GlassCard, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/learn")({
  component: LearnPage,
});

// ALL SIGNS (A-Z + 0-9)
const ALL_SIGNS = [
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  ..."0123456789".split(""),
];

function randomSign() {
  return ALL_SIGNS[Math.floor(Math.random() * ALL_SIGNS.length)];
}

function LearnPage() {
  const [target, setTarget] = useState(randomSign());
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");

  const [options, setOptions] = useState<string[]>([]);

  // generate options (1 correct + 3 wrong)
  const generateOptions = (correct: string) => {
    let opts = new Set<string>();
    opts.add(correct);

    while (opts.size < 4) {
      opts.add(randomSign());
    }

    return Array.from(opts).sort(() => Math.random() - 0.5);
  };

  useEffect(() => {
    setOptions(generateOptions(target));
  }, [target]);

  const checkAnswer = (value: string) => {
    setAttempts((a) => a + 1);

    if (value === target) {
      setStatus("correct");
      setScore((s) => s + 1);
    } else {
      setStatus("wrong");
    }

    // next question after delay
    setTimeout(() => {
      setTarget(randomSign());
      setStatus("idle");
    }, 1000);
  };

  const accuracy = attempts ? Math.round((score / attempts) * 100) : 0;

  return (
    <AppShell>
      <PageHeader
        title="Learning Mode (Image Quiz)"
        description="Select correct sign from images"
      />

      <div className="grid lg:grid-cols-2 gap-4">

        {/* LEFT */}
        <GlassCard>
          <h2 className="text-xl font-bold mb-4">
            Identify this sign:
          </h2>

          {/* IMAGE FROM PUBLIC FOLDER */}
          <div className="flex justify-center mb-4">
            <img
              src={`/signs/${target}.jpg`}
              className="w-40 h-40 object-contain border rounded-xl"
            />
          </div>

          <p>Score: {score} / {attempts}</p>
          <p>Accuracy: {accuracy}%</p>
        </GlassCard>

        {/* RIGHT OPTIONS */}
        <GlassCard>
          <h3 className="font-semibold mb-3">Choose Answer</h3>

          <div className="grid grid-cols-2 gap-2">
            {options.map((opt) => (
              <Button key={opt} onClick={() => checkAnswer(opt)}>
                {opt}
              </Button>
            ))}
          </div>

          {/* STATUS */}
          <div className="mt-4 text-center">
            {status === "idle" && "Select answer"}
            {status === "correct" && (
              <CheckCircle2 className="text-green-500 mx-auto" />
            )}
            {status === "wrong" && (
              <XCircle className="text-red-500 mx-auto" />
            )}
          </div>
        </GlassCard>

      </div>
    </AppShell>
  );
}