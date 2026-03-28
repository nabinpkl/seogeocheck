"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { initialAuthActionState } from "@/app/actions/auth-state";
import { verifyEmailAction } from "@/app/actions/auth";

function useTokenFromHash() {
  const [token, setToken] = React.useState("");

  React.useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    const params = new URLSearchParams(hash);
    const rawToken = params.get("token") ?? "";
    setToken(rawToken);

    if (rawToken) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
      );
    }
  }, []);

  return token;
}

export function VerifyEmailReadyForm() {
  const token = useTokenFromHash();
  const [state, formAction] = useActionState(
    verifyEmailAction,
    initialAuthActionState
  );

  return (
    <Card className="border-white/80 bg-white/96 shadow-2xl shadow-emerald-950/10">
      <CardHeader className="space-y-3 border-b border-border/70 pb-6">
        <CardTitle className="text-2xl font-semibold text-slate-950">Verify your email</CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600">
          Confirm your email to finish setting up your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="token" value={token} />

          {!token ? (
            <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>This link is missing information. Open the latest verification email again.</span>
            </div>
          ) : null}

          {state.error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          ) : null}

          <AuthSubmitButton
            type="submit"
            idleLabel="Verify Email"
            pendingLabel="Verifying"
            className="h-12 w-full rounded-xl text-sm font-semibold"
          />
        </form>
      </CardContent>
    </Card>
  );
}
