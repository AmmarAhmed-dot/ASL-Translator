import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, ArrowRight, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithGoogle, loginWithEmail } from "@/lib/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { AuthLayout } from "@/components/auth-layout";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

// ================= GOOGLE ICON =================
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ================= LOGIN PAGE =================
function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

 

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      await loginWithEmail(email, password);

      const user = auth.currentUser;

if (user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists() && userSnap.data().role === "admin") {
    navigate({
      to: "/admin",
      replace: true,
    });
  } else {
    navigate({
      to: "/dashboard",
      replace: true,
    });
  }
}
    } catch (err: any) {
      console.log(err.message);
      alert(err.message);
    }

    setLoading(false);
  };

  const googleLogin = async () => {
  setLoading(true);

  try {
    await loginWithGoogle();

    const user = auth.currentUser;

    if (user) {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().role === "admin") {
        navigate({
          to: "/admin",
          replace: true,
        });
      } else {
        navigate({
          to: "/dashboard",
          replace: true,
        });
      }
    }
  } catch (err) {
    console.log(err);
    alert("Google login failed");
  }

  setLoading(false);
};

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue">

      <form onSubmit={submit} className="space-y-4">

        {/* EMAIL */}
        <div className="space-y-2">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              className="pl-9"
              required
            />
          </div>
        </div>

        {/* PASSWORD */}
        <div className="space-y-2">
          <Label>Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              className="pl-9"
              required
            />
          </div>

          <div className="text-right text-sm mt-1">
            <Link
              to="/forgot-password"
              className="text-primary font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full gradient-primary text-white"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>

      <div className="my-5 text-center text-sm text-muted-foreground">
        OR
      </div>

      <Button
        onClick={googleLogin}
        className="w-full flex gap-2"
        variant="outline"
        disabled={loading}
      >
        <GoogleIcon className="w-5 h-5" />
        Continue with Google
      </Button>

      <Button
        onClick={() => navigate({ to: "/dashboard" })}
        variant="outline"
        className="w-full mt-3 flex gap-2"
      >
        <Zap className="w-4 h-4" />
        Continue as Guest
      </Button>

      <p className="text-center text-sm mt-5">
        No account?{" "}
        <Link to="/signup" className="text-primary font-medium">
          Sign up
        </Link>
      </p>

    </AuthLayout>
  );
}