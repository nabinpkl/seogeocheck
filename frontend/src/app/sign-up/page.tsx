import * as React from "react";
import { redirect } from "next/navigation";
import { AuthPageFrame } from "@/features/auth/components/AuthPageFrame";
import { SignUpForm } from "@/features/auth/components/SignUpForm";
import { getCurrentUser } from "@/features/auth/lib/server-auth";
import { DASHBOARD_PATH } from "@/lib/routes";

type SignUpPageProps = {
  searchParams: Promise<{
    claim?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const viewer = await getCurrentUser();
  if (viewer) {
    redirect(DASHBOARD_PATH);
  }

  const { claim } = await searchParams;
  const claimToken = typeof claim === "string" ? claim : "";

  return (
    <AuthPageFrame viewer={viewer} minimal>
      <SignUpForm claimToken={claimToken} />
    </AuthPageFrame>
  );
}
