"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/i18n/LanguageSwitch";

const ROLE_ROUTES: Record<string, string> = {
  ADMIN: "/admin",
  DISPATCHER: "/dispatcher/tasks",
  CADRE: "/cadre/tasks",
};

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (user) {
      const route = ROLE_ROUTES[user.role];
      if (!route) {
        setError(`No workspace is configured for role "${user.role}".`);
        return;
      }
      router.push(route);
    }
  }, [user, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      setSuccess(t("auth.signedIn", { defaultValue: "Signed in — redirecting…" }));
      // useEffect on `user` handles the redirect.
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "";
      const lowered = raw.toLowerCase();
      let friendly: string;
      if (
        lowered.includes("401") ||
        lowered.includes("invalid") ||
        lowered.includes("unauthorized") ||
        lowered.includes("credentials") ||
        lowered.includes("forbidden") ||
        lowered.includes("403")
      ) {
        friendly = t("auth.invalidCredentials");
      } else if (
        lowered.includes("failed to fetch") ||
        lowered.includes("networkerror") ||
        lowered.includes("load failed") ||
        lowered.includes("network")
      ) {
        friendly = t("auth.networkError", {
          defaultValue:
            "Could not reach the server. Check your connection and try again.",
        });
      } else if (lowered.includes("429") || lowered.includes("too many")) {
        friendly = t("auth.tooManyAttempts", {
          defaultValue: "Too many attempts. Please wait a minute and try again.",
        });
      } else if (lowered.startsWith("request failed: 5") || lowered.includes("500")) {
        friendly = t("auth.serverError", {
          defaultValue: "Server error. Please try again in a moment.",
        });
      } else {
        friendly = raw || t("auth.loginFailed");
      }
      setError(friendly);
      setIsSubmitting(false);
      return;
    }
    // Keep the spinner up while the redirect-effect runs so the form stays
    // visibly busy until the new route mounts.
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Panel – Branding */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <Image src="/Nroho_Logo.png" alt="Nroho Logo" width={48} height={48} className="" />
            <span className="text-2xl font-display font-bold">TMS</span>
          </div>
          <h1 className="text-4xl font-display font-bold leading-tight">
            {t("auth.brandTitle")}
          </h1>
        </div>
        <p className="text-primary-foreground/50 text-sm">
          {t("auth.copyright")}
        </p>
      </div>

      {/* Right Panel – Login Form */}
      <div className="flex items-center justify-center p-6 sm:p-8 bg-background relative">
        <div className="absolute top-4 end-4">
          <LanguageSwitch />
        </div>
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <Image src="/Nroho_Logo.png" alt="Nroho Logo" width={36} height={36} />
            <span className="text-xl font-display font-bold text-foreground">
              TMS
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {t("auth.title")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("auth.subtitle")}
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                {error && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && !error && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{success}</span>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting || !email || !password}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      {t("auth.signingIn")}
                    </>
                  ) : (
                    t("auth.signIn")
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
