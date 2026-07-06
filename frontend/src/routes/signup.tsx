import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

import { AuthLayout } from "@/components/auth-layout";

import {
  signupWithEmail,
  loginWithGoogle,
} from "@/lib/auth";

import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
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

// ================= MAIN =================
function SignupPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  // 🔥 PASSWORD STATES (ADDED)
  const [password, setPassword] = useState("");
  const [strength, setStrength] = useState(0);

  // 🔥 STRENGTH CHECK FUNCTION
  const checkStrength = (pass: string) => {
    let score = 0;

    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[!@#$%^&*]/.test(pass)) score++;

    return score; // 0–5
  };

  const submit = async (e: React.FormEvent) => {
  e.preventDefault();

  setLoading(true);

  try {
    const form = e.target as HTMLFormElement;

    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const pass = (form.elements.namedItem("password") as HTMLInputElement).value;

    await signupWithEmail(email, pass, name);

    const user = auth.currentUser;

    if (user) {
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name,
          email,
          role: "user",
          createdAt: new Date(),
        },
        { merge: true }
      );
    }

    navigate({
      to: "/dashboard",
      replace: true,
    });

  } catch (err: any) {
    console.log(err);
    alert(err.message);
  }

  setLoading(false);
};

 const googleSignup = async () => {
  setLoading(true);

  try {
    await loginWithGoogle();

    const user = auth.currentUser;

    if (user) {
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          role: "user",
          createdAt: new Date(),
        },
        { merge: true }
      );
    }

    navigate({
      to: "/dashboard",
      replace: true,
    });

  } catch (err: any) {
    alert(err.message);
  }

  setLoading(false);
};
  return (
    <AuthLayout title="Create your account" subtitle="Start detecting sign language in seconds">

      <form onSubmit={submit} className="space-y-4">

        {/* NAME */}
        <div className="space-y-2">
          <Label>Username</Label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input name="name" className="pl-9" />
          </div>
        </div>

        {/* EMAIL */}
        <div className="space-y-2">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input name="email" type="email" className="pl-9" />
          </div>
        </div>

        {/* PASSWORD */}
        <div className="space-y-2">
          <Label>Password</Label>

          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />

            <Input
              name="password"
              type="password"
              className="pl-9"
              value={password}
              onChange={(e) => {
                const val = e.target.value;
                setPassword(val);
                setStrength(checkStrength(val));
              }}
            />
          </div>

          {/* 🔥 LIVE STRENGTH BAR */}
          <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                strength <= 2
                  ? "bg-red-500"
                  : strength <= 4
                  ? "bg-yellow-400"
                  : "bg-green-500"
              }`}
              style={{ width: `${(strength / 5) * 100}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            {strength <= 2 && "Weak password"}
            {strength > 2 && strength <= 4 && "Medium password"}
            {strength > 4 && "Strong password"}
          </p>
        </div>

        {/* BUTTON */}
        <Button disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create account"}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </form>

      {/* GOOGLE */}
      <Button onClick={googleSignup} className="w-full mt-4" variant="outline">
        <GoogleIcon className="w-5 h-5 mr-2" />
        Sign up with Google
      </Button>

      {/* LOGIN */}
      <p className="text-sm text-center mt-5">
        Already have an account?{" "}
        <Link to="/login" className="text-primary">
          Sign in
        </Link>
      </p>

    </AuthLayout>
  );
}