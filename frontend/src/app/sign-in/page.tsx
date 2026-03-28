import * as React from "react";
import { redirect } from "next/navigation";
import { AuthPageFrame } from "@/features/auth/components/AuthPageFrame";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { getCurrentUser } from "@/features/auth/lib/server-auth";
import { DASHBOARD_PATH } from "@/lib/routes";

type SignInPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const viewer = await getCurrentUser();
  if (viewer) {
    redirect(DASHBOARD_PATH);
  }

  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/")
    ? next
    : DASHBOARD_PATH;

  return (
    <AuthPageFrame viewer={viewer} minimal>
      <SignInForm nextPath={nextPath} />
    </AuthPageFrame>
  );
}
