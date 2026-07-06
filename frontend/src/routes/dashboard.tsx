import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import RealtimeCamera from './realtime';
import {
  Camera,
  Upload,
  History,
  TrendingUp,
  Sparkles,
  Type,
  GraduationCap,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard, PageHeader } from "@/components/page-header";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

// 🔥 FIRESTORE TEST IMPORT
import { testDB } from "@/lib/testFirestore";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

const featureCards = [
  {
    to: "/realtime",
    icon: Camera,
    title: "Real-Time Detection",
    desc: "Detect ASL gestures live from your webcam with instant feedback.",
    accent: "from-primary to-primary",
  },
  {
    to: "/upload",
    icon: Upload,
    title: "Upload Image",
    desc: "Upload image and get instant prediction.",
    accent: "from-chart-2 to-chart-3",
  },
  {
    to: "/builder",
    icon: Type,
    title: "Word Builder",
    desc: "Build words using detected letters.",
    accent: "from-chart-3 to-primary",
  },
  {
    to: "/learn",
    icon: GraduationCap,
    title: "Learning Mode",
    desc: "Practice A-Z and improve accuracy.",
    accent: "from-neon to-chart-2",
  },
  {
    to: "/history",
    icon: History,
    title: "History",
    desc: "View all past predictions.",
    accent: "from-chart-2 to-primary",
  },
];

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // 🔒 AUTH + FIRESTORE TEST
  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }

    // 🔥 TEST FIRESTORE CONNECTION
    testDB()
      .then(() => {
        console.log("🔥 Firestore connected successfully");
      })
      .catch((err) => {
        console.error("Firestore error:", err);
      });

  }, [user, loading, navigate]);

  // LOADING SCREEN
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppShell>
      <PageHeader
        title={`Welcome back, ${
          user?.email?.split("@")[0] || "User"
        }`}
        description="Your AI Sign Language Assistant is ready."
      />

      {/* FEATURE CARDS */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {featureCards.map((card, i) => (
          <Link
            key={card.title}
            to={card.to}
            className="block animate-fade-in-up"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <GlassCard hover className="h-full">
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.accent} flex items-center justify-center mb-4`}
              >
                <card.icon className="w-6 h-6 text-white" />
              </div>

              <h3 className="font-semibold text-lg">{card.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {card.desc}
              </p>

              <div className="mt-4 text-sm text-primary font-medium flex items-center gap-1">
                Open <Sparkles className="w-3.5 h-3.5" />
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>

      {/* STATS */}
      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            Recent Activity
          </h3>

          <p className="text-muted-foreground text-sm">
            No history yet — start predicting signs 🚀
          </p>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-neon" />
            Quick Stats
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">User</span>
              <span>{user?.email || "-"}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Predictions</span>
              <span>0</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="text-green-500">Active</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}