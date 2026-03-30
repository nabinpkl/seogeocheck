"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { initialAuthActionState } from "@/app/actions/auth-state";
import { continueAsGuestAction, signUpAction } from "@/app/actions/auth";
import type { AuthUser } from "@/features/auth/lib/server-auth";
import { SIGN_IN_PATH } from "@/lib/routes";

type SignUpFormProps = {
  claimToken: string;
  viewer: AuthUser | null;
};

export function SignUpForm({ claimToken, viewer }: SignUpFormProps) {
  const [state, formAction] = useActionState(signUpAction, initialAuthActionState);
  const [guestState, guestFormAction] = useActionState(
    continueAsGuestAction,
    initialAuthActionState
  );
  const signInHref = claimToken
    ? `${SIGN_IN_PATH}?claim=${encodeURIComponent(claimToken)}`
    : SIGN_IN_PATH;
  const showExistingAccountAction = state.code === "EMAIL_ALREADY_REGISTERED";
  const showGuestOption = !viewer?.isAnonymous;
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  return (
    <Card className="border-white/80 bg-white/96 shadow-2xl shadow-emerald-950/10">
      <CardHeader className="space-y-3 border-b border-border/70 pb-6">
        <CardTitle className="text-2xl font-semibold text-slate-950">Create your account</CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600">
          {claimToken
            ? "Save this audit and open your workspace. Use email for cross-device access, or continue as a guest on this device."
            : "Use your email to create an account, or continue as a guest to explore the dashboard before committing an email."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {showGuestOption ? (
          <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/80 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-600 p-2 text-white shadow-sm">
                <Sparkles className="size-4" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-950">Want to explore first?</p>
                <p className="text-sm leading-6 text-slate-600">
                  Continue as a guest to open the workspace without using email yet. Guest progress stays on this device only.
                </p>
              </div>
            </div>
            <form action={guestFormAction} className="mt-4">
              <input type="hidden" name="claimToken" value={claimToken} />
              <AuthSubmitButton
                type="submit"
                idleLabel={claimToken ? "Continue as Guest" : "Explore as Guest"}
                pendingLabel="Opening workspace"
                className="h-11 rounded-xl px-5 text-sm font-semibold"
              />
            </form>
            {guestState.error ? (
              <div className="mt-3 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{guestState.error}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="claimToken" value={claimToken} />

          <div className="space-y-2">
            <Label htmlFor="sign-up-email">Email</Label>
            <Input
              id="sign-up-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className="h-11 rounded-xl border-border/80 bg-white"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-up-password">Password</Label>
            <div className="relative">
              <Input
                id="sign-up-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a strong password"
                className="h-11 rounded-xl border-border/80 bg-white pr-11"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Use more than 12 characters. Longer passphrases work well.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-up-confirm-password">Confirm password</Label>
            <div className="relative">
              <Input
                id="sign-up-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Confirm your password"
                className="h-11 rounded-xl border-border/80 bg-white pr-11"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>

          {state.error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{state.error}</span>
              </div>
              {showExistingAccountAction ? (
                <Link
                  href={signInHref}
                  className="mt-3 inline-flex items-center gap-2 font-semibold text-destructive transition hover:text-destructive/80"
                >
                  Sign in instead
                  <ArrowRight className="size-4" />
                </Link>
              ) : null}
            </div>
          ) : null}

          <AuthSubmitButton
            type="submit"
            idleLabel="Create Account"
            pendingLabel="Creating account"
            className="h-12 w-full rounded-xl text-sm font-semibold"
          />
        </form>

        <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/45 px-4 py-4 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 text-primary" />
            <span>
              After signing up, check your inbox for the verification email.
            </span>
          </div>
          <Link
            href={signInHref}
            className="inline-flex items-center gap-2 font-semibold text-primary transition hover:text-primary/80"
          >
            Already Have an Account? Sign in instead
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
