import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Download,
  Star,
  TrendingUp,
  Calendar,
  Camera,
  Lock,
  LogOut,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { GlassCard, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// 🔥 Firebase Firebase Web SDK Imports
import { getAuth, signOut, updateProfile, updatePassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  // =========================
  // LIVE STATES FROM FIREBASE
  // =========================
  const [name, setName] = useState(user?.displayName || "User Name");
  const [email] = useState(user?.email || "user@example.com");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.photoURL || null);
  const [joinedAt, setJoinedAt] = useState<string>("Recent");
  
  // Stats states from Firestore logs
  const [totalPredictions, setTotalPredictions] = useState<number>(0);
  const [favoriteGestures, setFavoriteGestures] = useState<string[]>(["A", "B", "C"]); 
  const [recentHistory, setRecentHistory] = useState<any[]>([]);

  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // ============================================
  // FETCH ACTUAL LOGGED-IN USER DATA ON MOUNT
  // ============================================
  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    // Set dynamic metadata from account creation time
    if (user.metadata.creationTime) {
      const date = new Date(user.metadata.creationTime);
      setJoinedAt(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    }

    const fetchUserStatsAndHistory = async () => {
      try {
        // 1. Fetch extra data/bio/stats from Firestore user profile doc if exists
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.name) setName(userData.name);
        }

        // 2. Fetch live recent prediction logs for history
        const historyRef = collection(db, "asl_history");
        // Adjust fields query based on your schema structure
        const q = query(historyRef, orderBy("timestamp", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        
        const fetchedHistory: any[] = [];
        const gestureCounts: { [key: string]: number } = {};

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedHistory.push({
            timestamp: data.timestamp * 1000 || Date.now(), // Firestore timestamp parsing
            letter: data.gesture || data.label || "Unknown",
            confidence: data.confidence || 0.0
          });

          // Compute favorites tracking metrics dynamically
          const g = data.gesture || data.label;
          if (g) gestureCounts[g] = (gestureCounts[g] || 0) + 1;
        });

        if (fetchedHistory.length > 0) {
          setRecentHistory(fetchedHistory);
          setTotalPredictions(fetchedHistory.length); // Fallback count or map to user total count tracking document field
          
          const sortedGestures = Object.keys(gestureCounts).sort((a, b) => gestureCounts[b] - gestureCounts[a]);
          if (sortedGestures.length > 0) setFavoriteGestures(sortedGestures.slice(0, 4));
        }

      } catch (err) {
        console.error("Error synchronizing cloud profile metrics:", err);
      }
    };

    fetchUserStatsAndHistory();
  }, [user, db, navigate]);

  // ============================================
  // PROFILE IMAGE UPLOAD & COMPRESSION SYNC
  // ============================================
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Convert to FileReader base64 string to update Firebase dynamic context persistently
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setAvatarUrl(base64String);

      if (user) {
        try {
          await updateProfile(user, { photoURL: base64String });
          toast.success("Profile avatar baseline saved!");
        } catch (err: any) {
          toast.error("Avatar failed to cache: " + err.message);
        }
      }
    };
    reader.readAsDataURL(f);
  };

  // ============================================
  // persistent Profile update (Real Name Fix)
  // ============================================
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);

    try {
      // 1. Synchronize data into Firebase Authentication context structure
      await updateProfile(user, {
        displayName: name,
        photoURL: avatarUrl
      });

      // 2. Synchronize data into Firestore Database document structure
      await setDoc(doc(db, "users", user.uid), {
        name: name,
        email: email,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast.success("Profile database details synchronized successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile settings.");
    } finally {
      setSavingProfile(false);
    }
  };

  // ============================================
  // LIVE PASSWORD CHANGE LOGIC
  // ============================================
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPwd.length < 6) {
      toast.error("Password must be at least 6 characters for Firebase deployment security context rules");
      return;
    }

    if (newPwd !== confirmPwd) {
      toast.error("Passwords mismatch targets");
      return;
    }

    setSavingPwd(true);

    try {
      await updatePassword(user, newPwd);
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
      toast.success("Security credentials updated securely! ✨");
    } catch (err: any) {
      toast.error(err.message || "Failed changing key targets. Try a fresh re-login cycle.");
    } finally {
      setSavingPwd(false);
    }
  };

  // ============================================
  // LOGOUT HANDLER
  // ============================================
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error("Logout runtime context failure: " + err.message);
    }
  };

  // ============================================
  // DOWNLOAD TEXT LOG REPORT FROM REAL STATES
  // ============================================
  const downloadReport = () => {
    const lines = [
      `ASL Translator — User Analytics Report`,
      `======================================`,
      `User Profile Context: ${name}`,
      `Verified Address: ${email}`,
      `Timeline Access: Joined ${joinedAt}`,
      `Total Logged Actions: ${totalPredictions} item logs captured`,
      `Dominant Gestures Cluster: ${favoriteGestures.join(", ")}`,
      ``,
      `Recent Device Feed History:`,
      ...recentHistory.map(
        (p) =>
          `${new Date(p.timestamp).toLocaleString()} — Detected Symbol: [${p.letter}] (Confidence Factor: ${Math.round(
            p.confidence * 100
          )}%)`
      ),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "_")}_analytics_report.txt`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <PageHeader
        title="My Profile"
        description="Manage your account and security settings"
        action={
          <div className="flex gap-2">
            <Button
              onClick={downloadReport}
              variant="outline"
              className="glass border-glass-border"
            >
              <Download className="w-4 h-4 mr-2" />
              Report
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="glass border-glass-border"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* LEFT SIDE */}
        <GlassCard className="lg:col-span-1 text-center">
          <div className="relative w-28 h-28 mx-auto mb-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                className="w-28 h-28 rounded-3xl object-cover shadow-glow"
              />
            ) : (
              <div className="w-28 h-28 rounded-3xl gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-glow">
                {name.charAt(0).toUpperCase()}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-xl glass border flex items-center justify-center"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onPickFile}
            />
          </div>

          <h2 className="text-xl font-bold">{name}</h2>
          <p className="text-sm text-muted-foreground">{email}</p>

          <div className="mt-4 text-xs glass rounded-full px-3 py-1 inline-flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Joined {joinedAt}
          </div>
        </GlassCard>

        {/* RIGHT SIDE */}
        <div className="lg:col-span-2 space-y-4">
          {/* PROFILE */}
          <GlassCard>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Account Info
            </h3>

            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass border-glass-border"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="gradient-primary text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingProfile ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </GlassCard>

          {/* PASSWORD */}
          <GlassCard>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Change Password
            </h3>

            <form onSubmit={changePassword} className="space-y-4">
              <Input
                type="password"
                placeholder="Old password"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
              />

              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  placeholder="New password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Input
                type={showNew ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
              />

              <Button
                type="submit"
                disabled={savingPwd}
                className="gradient-primary text-white"
              >
                {savingPwd ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </GlassCard>

          {/* FAVORITES */}
          <GlassCard>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              Favorite Gestures
            </h3>

            <div className="flex flex-wrap gap-2">
              {favoriteGestures.map((g) => (
                <div
                  key={g}
                  className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center font-bold text-white shadow-md"
                >
                  {g}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}