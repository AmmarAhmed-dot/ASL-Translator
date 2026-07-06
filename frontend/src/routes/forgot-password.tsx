import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, ArrowRight, CheckCircle2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import { AuthLayout } from "@/routes/login";
import { AuthLayout } from "@/components/auth-layout";
import { forgotPassword } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    }

    setLoading(false);
  };

  return (
    <AuthLayout title="Forgot Password" subtitle="We will send a reset link to your email">
      {sent ? (
        <div className="text-center space-y-4 py-2 animate-fade-in-up">
          <div className="w-14 h-14 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <CheckCircle2 className="w-7 h-7 text-primary-foreground" />
          </div>

          <div>
            <h3 className="font-semibold">Check your email</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Reset link sent successfully to {email}
            </p>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9 glass border-glass-border"
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground border-0 shadow-glow"
            >
              {loading ? (
                "Sending..."
              ) : (
                <>
                  Send reset link <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Login
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
