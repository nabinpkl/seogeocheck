"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  AlertTriangle,
  KeyRound,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { deleteAccountAction, requestPasswordResetAction } from "@/app/actions/auth";
import { initialAuthActionState } from "@/app/actions/auth-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type AccountSettingsPanelProps = {
  user: {
    email: string;
    emailVerified: boolean;
    createdAt: string;
  };
};

function formatJoinedDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }

  return parsed.toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function AccountSettingsPanel({ user }: AccountSettingsPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [resetState, resetFormAction, resetPending] = useActionState(
    requestPasswordResetAction,
    initialAuthActionState
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteAccountAction,
    initialAuthActionState
  );

  return (
    <Card className="overflow-hidden border-white/80 bg-white/95 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-lg text-slate-950">Account</CardTitle>
        <CardDescription>Password and access.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-emerald-200/80 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(248,250,252,0.95))] p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
              <ShieldCheck className="size-3.5" />
              Password
            </div>
            <h2 className="text-xl font-semibold text-slate-950">Change password</h2>
            <p className="text-sm leading-6 text-slate-600">
              Send yourself a reset email.
            </p>
          </div>
          <form action={resetFormAction}>
            <input type="hidden" name="email" value={user.email} />
            <Button type="submit" className="h-11 rounded-xl px-5 text-sm font-semibold sm:self-center" disabled={resetPending}>
              <KeyRound data-icon="inline-start" />
              {resetPending ? "Sending..." : "Email reset link"}
            </Button>
          </form>
        </div>

        {resetState.error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {resetState.error}
          </p>
        ) : null}

        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Email</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{user.email}</p>
            <p className="mt-1 text-sm text-slate-500">
              {user.emailVerified ? "Verified" : "Verification pending"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Joined</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{formatJoinedDate(user.createdAt)}</p>
          </div>
        </div>

        <Separator />

        <div className="rounded-3xl border border-rose-200/80 bg-rose-50/80 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700">
                <AlertTriangle className="size-3.5" />
                Danger zone
              </div>
              <h2 className="text-xl font-semibold text-slate-950">Delete account</h2>
              <p className="text-sm leading-6 text-slate-600">
                Permanently delete this account and its saved data.
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="h-11 rounded-xl px-5 text-sm font-semibold lg:self-center">
                  <Trash2 data-icon="inline-start" />
                  Delete account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
                <DialogHeader className="border-b border-border/60 px-6 py-5">
                  <DialogTitle>Delete this account?</DialogTitle>
                  <DialogDescription>
                    Type <span className="font-semibold text-slate-950">{user.email}</span> to confirm.
                  </DialogDescription>
                </DialogHeader>
                <form action={deleteFormAction} className="space-y-5 px-6 py-5">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                    This action cannot be undone.
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delete-account-confirm-email">Confirm your email</Label>
                    <Input
                      id="delete-account-confirm-email"
                      name="confirmedEmail"
                      type="email"
                      autoComplete="email"
                      placeholder={user.email}
                      className="h-11"
                      required
                    />
                  </div>

                  {deleteState.error ? (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {deleteState.error}
                    </p>
                  ) : null}

                  <DialogFooter className="border-t border-border/60">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="destructive" disabled={deletePending}>
                      {deletePending ? "Deleting..." : "Delete forever"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
