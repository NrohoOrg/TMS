"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useLogin, useRedirectIfAuthenticated } from "../hooks";
import { loginSchema, type LoginFormValues } from "../schema";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLogin();
  const { isLoading: isBootstrapping } = useRedirectIfAuthenticated();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values);
  }

  function quickLogin(email: string, password: string) {
    setValue("email", email);
    setValue("password", password);
    loginMutation.mutate({ email, password });
  }

  // While checking existing session, show a minimal loading state
  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.dz"
                    autoComplete="email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...register("password")}
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
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                {loginMutation.isError && (
                  <p className="text-sm text-destructive text-center">
                    Invalid email or password. Please try again.
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign In"
                  )}
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
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={loginMutation.isPending}
                onClick={() => quickLogin("admin@example.com", "Admin1234!")}
              >
                Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={loginMutation.isPending}
                onClick={() => quickLogin("dispatcher@example.com", "Dispatch1234!")}
              >
                Dispatcher
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              New accounts are created by an Administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
