import * as React from "react";
import { redirect } from "next/navigation";
import { AuthPageFrame } from "@/features/auth/components/AuthPageFrame";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { getCurrentUser, normalizeAuthRedirectTarget } from "@/features/auth/lib/server-auth";
import { DASHBOARD_PATH } from "@/lib/routes";

type SignInPageProps = {
  searchParams: Promise<{
    next?: string;
    claim?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next, claim } = await searchParams;
  const nextPath = normalizeAuthRedirectTarget(typeof next === "string" ? next : null) ?? DASHBOARD_PATH;
  const claimToken = typeof claim === "string" ? claim : "";
  const oauthOnly = isOauthAuthorizeRedirect(nextPath);
  const viewer = await getCurrentUser();
  if (viewer && !viewer.isAnonymous) {
    redirect(nextPath);
  }

  return (
    <AuthPageFrame viewer={viewer} minimal hideSignUpCta={oauthOnly}>
      <SignInForm nextPath={nextPath} claimToken={claimToken} oauthOnly={oauthOnly} />
    </AuthPageFrame>
  );
}

function isOauthAuthorizeRedirect(nextPath: string) {
  if (nextPath.startsWith("/oauth2/authorize")) {
    return true;
  }

  try {
    return new URL(nextPath).pathname === "/oauth2/authorize";
  } catch {
    return false;
  }
}
