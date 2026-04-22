"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

const QUICK_LOGINS = [
  { label: "Admin", email: "admin@example.com", password: "Admin1234!" },
  { label: "Dispatcher", email: "dispatcher@example.com", password: "Dispatch1234!" },
];

const ROLE_ROUTES: Record<string, string> = {
  ADMIN: "/admin",
  DISPATCHER: "/dispatcher",
};

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const route = ROLE_ROUTES[user.role] ?? "/admin";
      router.push(route);
    }
  }, [user, router]);

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    setError("");
    setIsSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      // The useEffect above will handle redirect once user is set
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
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
            <Image src="/TMS_LOGO.png" alt="TMS Logo" width={48} height={48} className="" />
            <span className="text-2xl font-display font-bold">TMS</span>
          </div>
          <h1 className="text-4xl font-display font-bold leading-tight">
            Transport
            <br />
            Management
            <br />
            System
          </h1>
          <p className="mt-6 text-primary-foreground/70 max-w-md leading-relaxed">
            Intelligent route optimization and fleet management for modern
            logistics operations. Plan, dispatch, and monitor in real time.
          </p>
        </div>
        <p className="text-primary-foreground/50 text-sm">
          © 2026 TMS — All rights reserved
        </p>
      </div>

      {/* Right Panel – Login Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <Image src="/TMS_LOGO.png" alt="TMS Logo" width={36} height={36} />
            <span className="text-xl font-display font-bold text-foreground">
              TMS
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              Welcome Back
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to your account to continue
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.dz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting || !email || !password}
                >
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick-login helpers */}
          <div className="space-y-2">
            <p className="text-xs text-center text-muted-foreground uppercase tracking-wider">
              Quick Access (Demo)
            </p>
            <div className="flex gap-2 justify-center">
              {QUICK_LOGINS.map((q) => (
                <Button
                  key={q.label}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={isSubmitting}
                  onClick={() => handleLogin(q.email, q.password)}
                >
                  {q.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
