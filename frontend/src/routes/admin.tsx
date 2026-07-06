import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Users, Activity, TrendingUp, Target, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { GlassCard, PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

// ─── Backend URL — local mein localhost, production mein env variable ────────
//
//  Local dev:   VITE_BACKEND_URL not set  →  falls back to localhost
//  Production:  set VITE_BACKEND_URL=https://your-backend.com in .env
//
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5000";


// ─── Types ────────────────────────────────────────────────────────────────────
interface Analytics {
  totalUsers: number;
  totalPredictions: number;
  activeToday: number;
  avgConfidence: number;   // backend se 0–100 (%) mein aata hai
  weekly: { day: string; predictions: number }[];
  topLetters: { letter: string; count: number }[];
}

interface UserRow {
  name: string;
  email: string;
  predictions: number;
  status: "active" | "inactive";
}

// ─────────────────────────────────────────────────────────────────────────────

function AdminPage() {
  const navigate = useNavigate();

  const [analytics,    setAnalytics]    = useState<Analytics | null>(null);
  const [users,        setUsers]        = useState<UserRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [authChecked,  setAuthChecked]  = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
  const unsub = auth.onAuthStateChanged(async (user) => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().role === "admin") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error(err);
      setIsAdmin(false);
    }

    setAuthChecked(true);
  });

  return () => unsub();
}, [navigate]);

  // ── Fetch data (sirf admin ke liye) ───────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;

    // Analytics
    fetch(`${BACKEND_URL}/admin/analytics`)
      .then((res) => {
        if (!res.ok) throw new Error(`Analytics fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data: Analytics) => setAnalytics(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingStats(false));

    // Users
    fetch(`${BACKEND_URL}/admin/users`)
      .then((res) => {
        if (!res.ok) throw new Error(`Users fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data: UserRow[]) => setUsers(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingUsers(false));
  }, [isAdmin]);

  // ── Auth check chal raha hai ───────────────────────────────────────────────
  if (!authChecked) {
    return (
      <AppShell>
        <p className="text-center text-muted-foreground py-20">Verifying access...</p>
      </AppShell>
    );
  }

  // ── Non-admin user ─────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <ShieldAlert className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground text-sm">
            You don't have permission to view this page.
          </p>
        </div>
      </AppShell>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <AppShell>
        <p className="text-center text-destructive py-20">⚠️ {error}</p>
      </AppShell>
    );
  }

  // ── Loading analytics ──────────────────────────────────────────────────────
  if (loadingStats || !analytics) {
    return (
      <AppShell>
        <p className="text-center text-muted-foreground py-20">
          Loading admin dashboard...
        </p>
      </AppShell>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <PageHeader
        title="Admin Dashboard"
        description="Platform-wide real analytics from backend"
      />

      {/* KPI CARDS */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard icon={Users}     label="Total users"       value={analytics.totalUsers} />
        <KpiCard icon={Activity}  label="Total predictions" value={analytics.totalPredictions} />
        <KpiCard icon={TrendingUp} label="Active today"     value={analytics.activeToday} />
        {/* ✅ FIXED: avgConfidence already % from backend — no * 100 needed */}
        <KpiCard icon={Target}    label="Avg confidence"    value={`${Math.round(analytics.avgConfidence)}%`} />
      </div>

      {/* CHARTS */}
      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <h3 className="font-semibold mb-4">Predictions this week</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.weekly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area dataKey="predictions" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold mb-4">Top letters</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topLetters}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="letter" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* USERS TABLE */}
      <GlassCard className="mt-4">
        <h3 className="font-semibold mb-4">Users</h3>

        {loadingUsers ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Loading users...
          </p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No users found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Predictions</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="text-right">{u.predictions}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "default" : "secondary"}>
                        {u.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>
    </AppShell>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: any;
}) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <Icon className="w-6 h-6 text-primary" />
      </div>
    </GlassCard>
  );
}
