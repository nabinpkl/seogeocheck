import * as React from "react";
import { redirect } from "next/navigation";
import { AuthPageFrame } from "@/features/auth/components/AuthPageFrame";
import { SignUpForm } from "@/features/auth/components/SignUpForm";
import { getCurrentUser } from "@/features/auth/lib/server-auth";
import { DASHBOARD_PATH } from "@/lib/routes";

export default async function SignUpPage() {
  const viewer = await getCurrentUser();
  if (viewer) {
    redirect(DASHBOARD_PATH);
  }

  return (
    <AuthPageFrame viewer={viewer} minimal>
      <SignUpForm />
    </AuthPageFrame>
  );
}
