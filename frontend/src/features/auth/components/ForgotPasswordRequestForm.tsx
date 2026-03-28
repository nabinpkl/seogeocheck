"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { initialAuthActionState } from "@/app/actions/auth-state";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { SIGN_IN_PATH } from "@/lib/routes";

type ForgotPasswordRequestFormProps = {
  defaultEmail?: string;
};

export function ForgotPasswordRequestForm({
  defaultEmail = "",
}: ForgotPasswordRequestFormProps) {
  const [state, formAction] = useActionState(
    requestPasswordResetAction,
    initialAuthActionState
  );

  return (
    <Card className="border-white/80 bg-white/96 shadow-2xl shadow-emerald-950/10">
      <CardHeader className="space-y-3 border-b border-border/70 pb-6">
        <CardTitle className="text-2xl font-semibold text-slate-950">Reset your password</CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600">
          Enter the verified email on the account and we&apos;ll send a one-time reset link if it can be used.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="forgot-password-email">Email</Label>
            <Input
              id="forgot-password-email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={defaultEmail}
              placeholder="you@company.com"
              className="h-11 rounded-xl border-border/80 bg-white"
              required
            />
          </div>

          {state.error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          ) : null}

          <AuthSubmitButton
            type="submit"
            idleLabel="Send Reset Link"
            pendingLabel="Sending email"
            className="h-12 w-full rounded-xl text-sm font-semibold"
          />
        </form>

        <Link
          href={SIGN_IN_PATH}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
