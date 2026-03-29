"use server";

import { redirect } from "next/navigation";
import {
  clearFrontendSessionCookie,
  deleteCurrentAccount,
  getCurrentUser,
  loginWithPassword,
  logoutBackendSession,
  registerAccountWithClaim,
  requestPasswordReset,
  resetPasswordWithToken,
  verifyEmailWithToken,
} from "@/features/auth/lib/server-auth";
import { DASHBOARD_PATH, RESET_PASSWORD_PATH, SIGN_IN_PATH, VERIFY_EMAIL_PATH } from "@/lib/routes";
import { initialAuthActionState, type AuthActionState } from "./auth-state";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readPassword(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function sanitizeNextPath(nextPath: string) {
  return nextPath.startsWith("/") ? nextPath : DASHBOARD_PATH;
}

function validatePassword(password: string) {
  const characterLength = Array.from(password).length;
  if (characterLength < 13) {
    return "Password must be longer than 12 characters.";
  }
  if (characterLength > 255) {
    return "Password must be 255 characters or fewer.";
  }
  return null;
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = readString(formData, "email");
  const password = readPassword(formData, "password");
  const nextPath = sanitizeNextPath(readString(formData, "next") || DASHBOARD_PATH);
  const claimToken = readString(formData, "claimToken") || null;

  if (!email || !password) {
    return {
      ...initialAuthActionState,
      error: "Enter your email and password.",
    };
  }

  const result = await loginWithPassword(email, password, claimToken);
  if (!result.ok) {
    return {
      ...initialAuthActionState,
      error: result.message,
    };
  }

  redirect(nextPath);
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = readString(formData, "email");
  const password = readPassword(formData, "password");
  const confirmPassword = readPassword(formData, "confirmPassword");
  const claimToken = readString(formData, "claimToken") || null;

  if (!email || !password || !confirmPassword) {
    return {
      ...initialAuthActionState,
      error: "Enter your email and confirm your password.",
    };
  }

  if (password !== confirmPassword) {
    return {
      ...initialAuthActionState,
      error: "Passwords do not match.",
    };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return {
      ...initialAuthActionState,
      error: passwordError,
    };
  }

  const result = await registerAccountWithClaim(email, password, claimToken);
  if (!result.ok) {
    return {
      ...initialAuthActionState,
      error: result.message,
    };
  }

  redirect(`${VERIFY_EMAIL_PATH}?status=sent&email=${encodeURIComponent(email)}`);
}

export async function requestPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = readString(formData, "email");

  if (!email) {
    return {
      ...initialAuthActionState,
      error: "Enter the email you used for your account.",
    };
  }

  const result = await requestPasswordReset(email);
  if (!result.ok) {
    return {
      ...initialAuthActionState,
      error: result.message,
    };
  }

  redirect(`${RESET_PASSWORD_PATH}?status=sent&email=${encodeURIComponent(email)}`);
}

export async function resetPasswordAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const token = readString(formData, "token");
  const password = readPassword(formData, "password");
  const confirmPassword = readPassword(formData, "confirmPassword");

  if (!token) {
    return {
      ...initialAuthActionState,
      error: "This reset link is incomplete. Open the latest email again.",
    };
  }

  if (!password || !confirmPassword) {
    return {
      ...initialAuthActionState,
      error: "Enter and confirm your new password.",
    };
  }

  if (password !== confirmPassword) {
    return {
      ...initialAuthActionState,
      error: "Passwords do not match yet.",
    };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return {
      ...initialAuthActionState,
      error: passwordError,
    };
  }

  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) {
    redirect(`${RESET_PASSWORD_PATH}?status=invalid`);
  }

  redirect(`${RESET_PASSWORD_PATH}?status=success`);
}

export async function verifyEmailAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const token = readString(formData, "token");
  if (!token) {
    return {
      ...initialAuthActionState,
      error: "This verification link is incomplete. Open the latest email again.",
    };
  }

  const result = await verifyEmailWithToken(token);
  if (!result.ok) {
    redirect(`${VERIFY_EMAIL_PATH}?status=invalid`);
  }

  if (result.data.authenticated) {
    redirect(DASHBOARD_PATH);
  }

  redirect(`${VERIFY_EMAIL_PATH}?status=success`);
}

export async function logoutAction() {
  await logoutBackendSession();
  await clearFrontendSessionCookie();
  redirect(SIGN_IN_PATH);
}

export async function deleteAccountAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const confirmedEmail = readString(formData, "confirmedEmail");
  const viewer = await getCurrentUser();

  if (!viewer) {
    return {
      ...initialAuthActionState,
      error: "Sign in again before deleting this account.",
    };
  }

  if (confirmedEmail !== viewer.email) {
    return {
      ...initialAuthActionState,
      error: "Type your full account email exactly to confirm deletion.",
    };
  }

  const result = await deleteCurrentAccount();
  if (!result.ok) {
    return {
      ...initialAuthActionState,
      error: result.message,
    };
  }

  await clearFrontendSessionCookie();
  redirect(SIGN_IN_PATH);
}
