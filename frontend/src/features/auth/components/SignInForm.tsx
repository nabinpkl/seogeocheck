"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { initialAuthActionState } from "@/app/actions/auth-state";
import { signInAction } from "@/app/actions/auth";
import { RESET_PASSWORD_PATH, SIGN_UP_PATH } from "@/lib/routes";

type SignInFormProps = {
  nextPath: string;
  claimToken: string;
  oauthOnly?: boolean;
};

export function SignInForm({ nextPath, claimToken, oauthOnly = false }: SignInFormProps) {
  const [state, formAction] = useActionState(signInAction, initialAuthActionState);
  const signUpHref = claimToken
    ? `${SIGN_UP_PATH}?claim=${encodeURIComponent(claimToken)}`
    : SIGN_UP_PATH;
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <Card className="border-white/80 bg-white/96 shadow-2xl shadow-emerald-950/10">
        <CardHeader className="space-y-3 border-b border-border/70 pb-6">
          <CardTitle className="text-2xl font-semibold text-slate-950">Sign in</CardTitle>
          <CardDescription className="text-sm leading-6 text-slate-600">
            {oauthOnly
              ? "Sign in to continue the authorization request."
              : "Pick up where you left off and move straight into your audit workspace."}
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-6 p-6">
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="next" value={nextPath} />
          <input type="hidden" name="claimToken" value={claimToken} />

          <div className="space-y-2">
            <Label htmlFor="sign-in-email">Email</Label>
            <Input
              id="sign-in-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className="h-11 rounded-xl border-border/80 bg-white"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="sign-in-password">Password</Label>
              <Link
                href={RESET_PASSWORD_PATH}
                className="text-xs font-semibold text-primary transition hover:text-primary/80"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="sign-in-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-11 rounded-xl border-border/80 bg-white pr-11"
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
          </div>

          {state.error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          ) : null}

          <AuthSubmitButton
            type="submit"
            idleLabel="Sign In"
            pendingLabel="Signing in"
            className="h-12 w-full rounded-xl text-sm font-semibold"
          />
        </form>

        {oauthOnly ? null : (
          <div className="rounded-2xl border border-border/70 bg-muted/45 px-4 py-4 text-sm text-slate-600">
            <p className="font-medium text-slate-900">New here?</p>
            <p className="mt-1">
              Create an account, to save your progress and track multiple pages of your site.
            </p>
            <Link
              href={signUpHref}
              className="mt-3 inline-flex items-center gap-2 font-semibold text-primary transition hover:text-primary/80"
            >
              Create an account
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
