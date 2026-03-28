import * as React from "react";
import Link from "next/link";
import { CircleCheckBig, KeyRound, MailQuestion, ShieldAlert, TimerReset } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthPageFrame } from "@/features/auth/components/AuthPageFrame";
import { ForgotPasswordRequestForm } from "@/features/auth/components/ForgotPasswordRequestForm";
import { ResetPasswordReadyForm } from "@/features/auth/components/ResetPasswordReadyForm";
import { getCurrentUser } from "@/features/auth/lib/server-auth";
import { SIGN_IN_PATH } from "@/lib/routes";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    status?: string;
    email?: string;
  }>;
};

function ResetPasswordStatusCard({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-white/80 bg-white/96 shadow-2xl shadow-emerald-950/10">
      <CardContent className="space-y-5 p-6">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const viewer = await getCurrentUser();
  const { status = "request", email } = await searchParams;

  let content: React.ReactNode;
  switch (status) {
    case "ready":
      content = <ResetPasswordReadyForm />;
      break;
    case "success":
      content = (
        <ResetPasswordStatusCard
          icon={<CircleCheckBig className="size-6" />}
          title="Password updated"
          description="Your password has been updated successfully."
          action={
            <Button asChild className="h-11 rounded-xl px-5 text-sm font-semibold">
              <Link href={SIGN_IN_PATH}>Sign In Again</Link>
            </Button>
          }
        />
      );
      break;
    case "expired":
      content = (
        <ResetPasswordStatusCard
          icon={<TimerReset className="size-6" />}
          title="Reset link expired"
          description="Request a fresh password reset email and use the newest link."
        />
      );
      break;
    case "invalid":
      content = (
        <ResetPasswordStatusCard
          icon={<ShieldAlert className="size-6" />}
          title="Reset link is not valid anymore"
          description="This link is no longer valid. Request a new reset email below."
        />
      );
      break;
    case "sent":
      content = (
        <ResetPasswordStatusCard
          icon={<MailQuestion className="size-6" />}
          title="Check your inbox"
          description={
            email
              ? `If an account matches ${email}, a password reset email has been sent. Open the newest message to continue.`
              : "If an account matches this email, a password reset email has been sent. Open the newest message to continue."
          }
        />
      );
      break;
    case "request":
    default:
      content = <ForgotPasswordRequestForm defaultEmail={email} />;
      break;
  }

  return (
    <AuthPageFrame viewer={viewer} minimal>
      <div className="space-y-5">
        {content}
        {status !== "request" && status !== "ready" ? (
          <ForgotPasswordRequestForm defaultEmail={email} />
        ) : null}
        {status === "request" ? null : (
          <div className="rounded-2xl border border-border/70 bg-white/75 px-4 py-4 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 size-4 text-primary" />
              <span>
                Need a different reset email? Request a fresh one below, then use the newest message only.
              </span>
            </div>
          </div>
        )}
      </div>
    </AuthPageFrame>
  );
}
