"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { startAuditAction } from "@/app/actions/start-audit";
import { initialAuditActionState } from "@/app/actions/start-audit-state";
import type { AuthUser } from "@/features/auth/lib/server-auth";
import { auditReportQueryKey } from "@/lib/audit-query";
import { useAuditStore } from "@/store/use-audit-store";
import { buildProjectAuditHref } from "@/features/dashboard/lib/routes";
import { SIGN_IN_PATH, SIGN_UP_PATH } from "@/lib/routes";
import {
  buildFamilyChecklistGroups,
  buildAuditCheckRowModel,
  buildCategoryScoreModels,
  isIssueCheck,
  isNotApplicableCheck,
  isPassedCheck,
  isSystemErrorCheck,
} from "../lib/view-models";
import type { AuditSectionViewProps } from "../types/section";
import { useAuditExperience } from "./useAuditExperience";

type UseAuditSectionControllerOptions = {
  viewer: AuthUser | null;
  projectSlug: string | null;
  variant: "hero" | "dashboard";
};


export function useAuditSectionController({
  viewer,
  projectSlug,
  variant,
}: UseAuditSectionControllerOptions): AuditSectionViewProps {
  const router = useRouter();
  const [url, setUrl] = React.useState("");
  const [clientError, setClientError] = React.useState<string | null>(null);
  const [actionState, formAction, isPending] = React.useActionState(
    startAuditAction,
    initialAuditActionState
  );
  const [focusedLiveProgressKey, setFocusedLiveProgressKey] = React.useState<string | null>(
    null
  );
  const [focusedResultJobId, setFocusedResultJobId] = React.useState<string | null>(
    null
  );
  const [isTyping, setIsTyping] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const resultPanelRef = React.useRef<HTMLDivElement | null>(null);
  const liveProgressRef = React.useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const {
    jobId,
    targetUrl,
    reportUrl,
    streamUrl,
    status,
    connectionStatus,
    events,
    liveError,
  } = useAuditStore(
    useShallow((state) => ({
      jobId: state.jobId,
      targetUrl: state.targetUrl,
      reportUrl: state.reportUrl,
      streamUrl: state.streamUrl,
      status: state.status,
      connectionStatus: state.connectionStatus,
      events: state.events,
      liveError: state.error,
    }))
  );

  const { primeAudit, connectToStream, markVerified, reset } = useAuditStore(
    useShallow((state) => ({
      primeAudit: state.primeAudit,
      connectToStream: state.connectToStream,
      markVerified: state.markVerified,
      reset: state.reset,
    }))
  );

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (variant !== "dashboard") {
      return;
    }

    reset();
    setFocusedLiveProgressKey(null);
    setFocusedResultJobId(null);
    setClientError(null);
  }, [reset, variant]);

  React.useEffect(() => {
    if (!clientError) {
      return;
    }

    const timer = setTimeout(() => {
      setClientError(null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [clientError]);

  React.useEffect(() => {
    if (
      !actionState.ok ||
      !actionState.jobId ||
      !actionState.streamUrl ||
      !actionState.reportUrl ||
      !actionState.status
    ) {
      return;
    }

    primeAudit({
      jobId: actionState.jobId,
      targetUrl: actionState.targetUrl,
      streamUrl: actionState.streamUrl,
      reportUrl: actionState.reportUrl,
      status: actionState.status === "QUEUED" ? "QUEUED" : "STREAMING",
    });
    connectToStream();
  }, [
    actionState.jobId,
    actionState.ok,
    actionState.reportUrl,
    actionState.status,
    actionState.streamUrl,
    actionState.targetUrl,
    connectToStream,
    primeAudit,
  ]);

  const effectiveAccountKind = actionState.workspaceKind ?? viewer?.accountKind ?? null;
  const pendingClaimToken =
    !effectiveAccountKind && actionState.claimToken ? actionState.claimToken : null;

  const experience = useAuditExperience({
    reportQueryKeyId: jobId,
    status,
    isPending,
    displayTargetUrl: targetUrl || null,
    placeholderUrl: actionState.targetUrl || null,
    reportUrl,
    streamUrl,
    connectionStatus,
    events,
    liveError: actionState.error || liveError,
    isLiveSession: Boolean(jobId),
    onConnectToStream: connectToStream,
    onMarkVerified: markVerified,
  });

  const report = experience.report;
  const reportChecks = Array.isArray(report?.checks) ? report.checks : [];
  const reportFindings = reportChecks.filter((check) => isIssueCheck(check.status));
  const reportPassedChecks = reportChecks.filter((check) => isPassedCheck(check.status));
  const reportNotApplicableChecks = reportChecks.filter((check) =>
    isNotApplicableCheck(check.status)
  );
  const reportSystemErrorChecks = reportChecks.filter((check) =>
    isSystemErrorCheck(check.status)
  );
  const reportScore =
    typeof report?.summary?.score === "number" ? report.summary.score : 0;
  const reportScoreConfidence =
    typeof report?.scoring?.overall?.confidence === "number"
      ? report.scoring.overall.confidence
      : null;
  const issueCount =
    typeof report?.summary?.issueCount === "number"
      ? report.summary.issueCount
      : reportFindings.length;
  const passedCheckCount =
    typeof report?.summary?.passedCheckCount === "number"
      ? report.summary.passedCheckCount
      : reportPassedChecks.length;
  const notApplicableCount =
    typeof report?.summary?.notApplicableCount === "number"
      ? report.summary.notApplicableCount
      : reportNotApplicableChecks.length;
  const systemErrorCount =
    typeof report?.summary?.systemErrorCount === "number"
      ? report.summary.systemErrorCount
      : reportSystemErrorChecks.length;
  const hasAuditFailed = experience.hasAuditFailed;
  const isAuditSettled = Boolean(report) || status === "FAILED";
  const isAuditActive = Boolean(jobId) && !isAuditSettled;
  const categoryScores = buildCategoryScoreModels(report ?? undefined);
  const userFacingError = experience.userFacingError;
  const liveProgressScrollKey = jobId ?? (isPending ? "pending" : null);
  const navigateToProjectAudit = React.useCallback(
    (nextUrl: string) => {
      if (variant !== "dashboard" || !projectSlug) {
        return false;
      }

      router.push(
        `${buildProjectAuditHref(projectSlug, nextUrl)}?start=1&url=${encodeURIComponent(nextUrl)}`
      );
      return true;
    },
    [projectSlug, router, variant]
  );

  React.useEffect(() => {
    if (
      !liveProgressScrollKey ||
      focusedLiveProgressKey === liveProgressScrollKey ||
      !liveProgressRef.current ||
      report
    ) {
      return;
    }

    const rect = liveProgressRef.current.getBoundingClientRect();
    const centeredTop =
      rect.top + window.scrollY - Math.max((window.innerHeight - rect.height) / 2, 96);

    window.scrollTo({
      top: Math.max(centeredTop, 0),
      behavior: "smooth",
    });
    setFocusedLiveProgressKey(liveProgressScrollKey);
  }, [focusedLiveProgressKey, liveProgressScrollKey, report]);

  React.useEffect(() => {
    if (
      !report ||
      !jobId ||
      focusedResultJobId === jobId ||
      !resultPanelRef.current ||
      isPending
    ) {
      return;
    }

    const nextTop =
      resultPanelRef.current.getBoundingClientRect().top + window.scrollY - 96;

    window.scrollTo(0, Math.max(nextTop, 0));
    setFocusedResultJobId(jobId);
  }, [focusedResultJobId, isPending, jobId, report]);

  const handleReAudit = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.preventDefault();
      event?.stopPropagation();
      window.scrollTo(0, 0);

      const nextUrl = targetUrl || url.trim();
      if (nextUrl && navigateToProjectAudit(nextUrl)) {
        return;
      }

      React.startTransition(() => {
        const formData = new FormData();
        formData.append("url", nextUrl);
        if (projectSlug) {
          formData.append("projectSlug", projectSlug);
        }
        formAction(formData);
      });
    },
    [formAction, navigateToProjectAudit, projectSlug, targetUrl, url]
  );

  const handleReset = React.useCallback(() => {
    reset();
    setFocusedLiveProgressKey(null);
    setFocusedResultJobId(null);
    setUrl("");
    setClientError(null);
    queryClient.removeQueries({
      queryKey: ["claim-token"],
    });
    queryClient.removeQueries({
      queryKey: jobId ? auditReportQueryKey(jobId) : ["audit-report", "idle"],
    });
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [jobId, queryClient, reset]);

  const simulateExampleAudit = React.useCallback(() => {
    if (isPending || isAuditActive || isTyping) {
      return;
    }

    setIsTyping(true);
    setClientError(null);
    const targetExampleUrl = "example.com";
    let currentText = "";
    const typingSpeed = 50;

    const animateTyping = (index: number) => {
      if (index <= targetExampleUrl.length) {
        currentText = targetExampleUrl.slice(0, index);
        setUrl(currentText);

        if (index < targetExampleUrl.length) {
          setTimeout(() => animateTyping(index + 1), typingSpeed);
        } else {
          setTimeout(() => {
            const formData = new FormData();
            formData.append("url", targetExampleUrl);
            if (projectSlug) {
              formData.append("projectSlug", projectSlug);
            }
            const navigated = navigateToProjectAudit("https://example.com");
            if (!navigated) {
              React.startTransition(() => {
                formAction(formData);
                setIsTyping(false);
              });
              return;
            }

            setIsTyping(false);
          }, 350);
        }
      }
    };

    setUrl("");
    animateTyping(1);
  }, [formAction, isAuditActive, isPending, isTyping, navigateToProjectAudit, projectSlug]);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        event.preventDefault();
        setClientError("Enter a website URL to start the audit.");
        return;
      }

      const normalizedTargetUrl =
        trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")
          ? trimmedUrl
          : `https://${trimmedUrl}`;

      try {
        const urlObj = new URL(normalizedTargetUrl);
        if (!urlObj.hostname.includes(".")) {
          event.preventDefault();
          setClientError("Please enter a valid domain (e.g., example.com)");
          return;
        }
      } catch {
        event.preventDefault();
        setClientError("That URL does not look valid yet.");
        return;
      }

      setClientError(null);

      if (navigateToProjectAudit(normalizedTargetUrl)) {
        event.preventDefault();
        return;
      }
    },
    [navigateToProjectAudit, url]
  );

  const topRecommendationRows = reportChecks
    .filter((check) => isIssueCheck(check.status))
    .map((check, index) =>
      buildAuditCheckRowModel(
        {
          ...check,
          id: check.id ?? `${check.selector ?? "issue"}-${index}`,
        },
        "issue"
      )
    );
  const [topRecommendationHeroRow, ...topRecommendationRowsRest] = topRecommendationRows;
  const familyGroups = buildFamilyChecklistGroups(reportChecks);
  const topRecommendationHero = topRecommendationHeroRow
    ? { ...topRecommendationHeroRow, isHero: true }
    : null;

  return {
    inputRef,
    resultPanelRef,
    liveProgressRef,
    visibility: {
      showResultPanel: Boolean(jobId || isPending || userFacingError),
      showLiveStream: experience.showLivePanels,
      showLiveProgress: experience.showLivePanels,
    },
    inputPanel: {
      action: formAction,
      onSubmit: handleSubmit,
      url,
      clientError,
      notice: actionState.projectWarning,
      projectSlug,
      isPending,
      isAuditActive,
      isTyping,
      onUrlChange: (value) => {
        setUrl(value);
        if (clientError) {
          setClientError(null);
        }
      },
      onExampleAudit: simulateExampleAudit,
    },
    statusHeader: {
      model: experience.headerModel,
      showCompactActions: (Boolean(report) || hasAuditFailed) && !isAuditActive,
    },
    liveStream: {
      rows: experience.liveStreamRows,
    },
    liveProgress: experience.liveProgress,
    results: report
      ? {
        reportScore,
        reportScoreConfidence,
        issueCount,
        passedCheckCount,
        notApplicableCount,
        systemErrorCount,
        categoryScores,
        topRecommendationHeroRow: topRecommendationHero,
        topRecommendationRows: topRecommendationRowsRest,
        familyGroups,
        onScrollToIssues: () =>
          document
            .getElementById("requires-attention")
            ?.scrollIntoView({ behavior: "smooth" }),
        onScrollToFamilies: () =>
          document
            .getElementById("family-checklists")
            ?.scrollIntoView({ behavior: "smooth" }),
        claimPanel: pendingClaimToken
          ? {
            message: "Save this audit and open your workspace.",
            signUpHref: `${SIGN_UP_PATH}?claim=${encodeURIComponent(pendingClaimToken)}`,
            signInHref: `${SIGN_IN_PATH}?claim=${encodeURIComponent(pendingClaimToken)}`,
          }
          : null,
        onReAudit: handleReAudit,
        onReset: handleReset,
      }
      : null,
    actions: {
      onReAudit: handleReAudit,
      onReset: handleReset,
    },
  };
}
