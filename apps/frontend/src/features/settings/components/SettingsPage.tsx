"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui/page-header";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, MessageSquare } from "lucide-react";
import { authChangePassword } from "@/lib/api-services";
import { useAdminConfig, useUpdateAdminConfig } from "@/features/shared/hooks";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const MIN_PASSWORD_LENGTH = 8;

export default function SettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t("settings.password.errorTooShort", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("settings.password.errorMismatch"));
      return;
    }
    if (newPassword === currentPassword) {
      setError(t("settings.password.errorSame"));
      return;
    }

    setIsSubmitting(true);
    try {
      await authChangePassword(currentPassword, newPassword);
      setSuccess(t("settings.password.success"));
      toast({ title: t("settings.password.success") });
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.unknownError");
      const lowered = message.toLowerCase();
      const friendly =
        lowered.includes("current password") || lowered.includes("incorrect") || lowered.includes("unauthorized")
          ? t("settings.password.errorCurrentInvalid")
          : message;
      setError(friendly);
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    confirmPassword.length > 0 &&
    !isSubmitting;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      {isAdmin && (
        <div className="max-w-xl">
          <SmsToggleCard />
        </div>
      )}

      <div className="max-w-xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              {t("settings.password.title")}
            </CardTitle>
            <CardDescription>{t("settings.password.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordField
                id="currentPassword"
                label={t("settings.password.current")}
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                onToggleShow={() => setShowCurrent((v) => !v)}
                autoComplete="current-password"
              />
              <PasswordField
                id="newPassword"
                label={t("settings.password.new")}
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggleShow={() => setShowNew((v) => !v)}
                autoComplete="new-password"
                hint={t("settings.password.hint", { min: MIN_PASSWORD_LENGTH })}
              />
              <PasswordField
                id="confirmPassword"
                label={t("settings.password.confirm")}
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirm}
                onToggleShow={() => setShowConfirm((v) => !v)}
                autoComplete="new-password"
              />

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && !error && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
                >
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={reset} disabled={isSubmitting}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" size="sm" disabled={!canSubmit}>
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />
                  ) : null}
                  {t("settings.password.submit")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SmsToggleCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const configQuery = useAdminConfig();
  const updateConfig = useUpdateAdminConfig();

  const enabled = configQuery.data?.smsEnabled ?? true;

  async function handleToggle(next: boolean) {
    try {
      await updateConfig.mutateAsync({ smsEnabled: next });
      toast({
        title: next
          ? t("settings.sms.enabledToast")
          : t("settings.sms.disabledToast"),
      });
    } catch (err) {
      toast({
        title: t("common.updateFailed"),
        description: err instanceof Error ? err.message : t("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          {t("settings.sms.title")}
        </CardTitle>
        <CardDescription>{t("settings.sms.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="smsEnabled" className="text-sm">
              {t("settings.sms.toggleLabel")}
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {enabled ? t("settings.sms.statusOn") : t("settings.sms.statusOff")}
            </p>
          </div>
          <Switch
            id="smsEnabled"
            checked={enabled}
            disabled={configQuery.isLoading || updateConfig.isPending}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
  hint?: string;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  hint,
}: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={onToggleShow}
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
