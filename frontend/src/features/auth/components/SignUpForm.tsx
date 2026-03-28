"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { initialAuthActionState } from "@/app/actions/auth-state";
import { signUpAction } from "@/app/actions/auth";
import { SIGN_IN_PATH } from "@/lib/routes";

type SignUpFormProps = {
  claimToken: string;
};

export function SignUpForm({ claimToken }: SignUpFormProps) {
  const [state, formAction] = useActionState(signUpAction, initialAuthActionState);
  const signInHref = claimToken
    ? `${SIGN_IN_PATH}?claim=${encodeURIComponent(claimToken)}`
    : SIGN_IN_PATH;
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
          Use your email to create an account, to get started and track your progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
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
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{state.error}</span>
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
