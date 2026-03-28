import * as React from "react";
import Link from "next/link";
import { CircleCheckBig, Clock3, Send, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthPageFrame } from "@/features/auth/components/AuthPageFrame";
import { VerifyEmailReadyForm } from "@/features/auth/components/VerifyEmailReadyForm";
import { getCurrentUser } from "@/features/auth/lib/server-auth";
import { DASHBOARD_PATH, SIGN_IN_PATH, SIGN_UP_PATH } from "@/lib/routes";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    status?: string;
    email?: string;
  }>;
};

function VerifyEmailStatusCard({
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

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const viewer = await getCurrentUser();
  const { status = "sent", email } = await searchParams;

  let content: React.ReactNode;
  switch (status) {
    case "ready":
      content = <VerifyEmailReadyForm />;
      break;
    case "success":
      content = (
        <VerifyEmailStatusCard
          icon={<CircleCheckBig className="size-6" />}
          title="Email verified"
          description="Your account is now active and can sign in normally."
          action={
            <Button asChild className="h-11 rounded-xl px-5 text-sm font-semibold">
              <Link href={viewer ? DASHBOARD_PATH : SIGN_IN_PATH}>
                {viewer ? "Open Dashboard" : "Sign In"}
              </Link>
            </Button>
          }
        />
      );
      break;
    case "expired":
      content = (
        <VerifyEmailStatusCard
          icon={<Clock3 className="size-6" />}
          title="Verification link expired"
          description="Request a fresh verification email by signing up again with the same email address."
          action={
            <Button asChild variant="outline" className="h-11 rounded-xl px-5 text-sm font-semibold">
              <Link href={SIGN_UP_PATH}>Start Again</Link>
            </Button>
          }
        />
      );
      break;
    case "invalid":
      content = (
        <VerifyEmailStatusCard
          icon={<ShieldAlert className="size-6" />}
          title="Verification link is not valid anymore"
          description="Open the newest verification email or request a new one by signing up again."
          action={
            <Button asChild variant="outline" className="h-11 rounded-xl px-5 text-sm font-semibold">
              <Link href={SIGN_UP_PATH}>Get a Fresh Link</Link>
            </Button>
          }
        />
      );
      break;
    case "sent":
    default:
      content = (
        <VerifyEmailStatusCard
          icon={<Send className="size-6" />}
          title="Check your inbox"
          description={
            email
              ? `If an account matches ${email}, a verification email is on its way. Open the latest email to continue.`
              : "If an account matches this email, a verification email is on its way. Open the latest email to continue."
          }
          action={
            <Button asChild variant="outline" className="h-11 rounded-xl px-5 text-sm font-semibold">
              <Link href={SIGN_IN_PATH}>Back to Sign In</Link>
            </Button>
          }
        />
      );
      break;
  }

  return (
    <AuthPageFrame viewer={viewer} minimal>
      {content}
    </AuthPageFrame>
  );
}
