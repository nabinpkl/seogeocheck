"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { startAuditAction } from "@/app/actions/start-audit";
import { initialAuditActionState } from "@/app/actions/start-audit-state";
import {
  auditReportQueryKey,
  ReportPendingError,
} from "@/lib/audit-query";
import type { AuditReport } from "@/types/audit";
import { useAuditStore } from "@/store/use-audit-store";
import {
  buildFamilyChecklistGroups,
  buildAuditCheckRowModel,
  buildAuditHeaderModel,
  buildAuditStreamRowModel,
  buildCategoryScoreModels,
  formatConnectionLabel,
  isIssueCheck,
  isNotApplicableCheck,
  isPassedCheck,
  isSystemErrorCheck,
} from "../lib/view-models";
import type { AuditSectionViewProps } from "../types/section";

async function fetchAuditReport(reportUrl: string): Promise<AuditReport> {
  const response = await fetch(reportUrl, {
    cache: "no-store",
  });

  if (response.status === 202) {
    throw new ReportPendingError();
  }

  if (!response.ok) {
    throw new Error("We couldn't load your audit results.");
  }

  return (await response.json()) as AuditReport;
}

type UseAuditSectionControllerOptions = {
  isAuthenticated: boolean;
};

export function useAuditSectionController({
  isAuthenticated,
}: UseAuditSectionControllerOptions): AuditSectionViewProps {
  const [url, setUrl] = React.useState("");
  const [clientError, setClientError] = React.useState<string | null>(null);
  const [actionState, formAction, isPending] = React.useActionState(
    startAuditAction,
    initialAuditActionState
  );
  const [handoffJobId, setHandoffJobId] = React.useState<string | null>(null);
  const [focusedResultJobId, setFocusedResultJobId] = React.useState<string | null>(
    null
  );
  const [isTyping, setIsTyping] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const resultPanelRef = React.useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const {
    jobId,
    targetUrl,
    reportUrl,
    status,
    connectionStatus,
    events,
    liveError,
  } = useAuditStore(
    useShallow((state) => ({
      jobId: state.jobId,
      targetUrl: state.targetUrl,
      reportUrl: state.reportUrl,
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
    setHandoffJobId(null);
    window.scrollTo(0, 0);
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

  React.useEffect(() => {
    if (status !== "COMPLETE" || !jobId || !reportUrl || handoffJobId === jobId) {
      return;
    }

    setHandoffJobId(jobId);
    void queryClient.invalidateQueries({
      queryKey: auditReportQueryKey(jobId),
    });
  }, [handoffJobId, jobId, queryClient, reportUrl, status]);

  const reportQuery = useQuery({
    queryKey: jobId ? auditReportQueryKey(jobId) : ["audit-report", "idle"],
    enabled: Boolean(jobId && reportUrl && handoffJobId === jobId),
    queryFn: () => fetchAuditReport(reportUrl!),
    retry: (failureCount, error) =>
      error instanceof ReportPendingError && failureCount < 20,
    retryDelay: 750,
    staleTime: 0,
  });

  React.useEffect(() => {
    if (reportQuery.data && status !== "VERIFIED") {
      markVerified();
    }
  }, [markVerified, reportQuery.data, status]);

  const report = reportQuery.data;

  const claimTokenQuery = useQuery({
    queryKey: ["claim-token", jobId],
    enabled: Boolean(!isAuthenticated && report && jobId),
    staleTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const response = await fetch(`/api/audits/${jobId}/claim-tokens`, {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await response.json()) as { token?: string; message?: string };
      
      if (!response.ok || typeof payload.token !== "string" || !payload.token) {
        throw new Error(
          typeof payload.message === "string"
            ? payload.message
            : "We couldn't prepare the save link for this audit yet."
        );
      }
      return payload.token;
    },
  });

  const currentProgress =
    [...events].reverse().find((event) => typeof event.progress === "number")
      ?.progress ?? 0;
  const pendingReport =
    reportQuery.fetchStatus === "fetching" ||
    reportQuery.error instanceof ReportPendingError;
  const reportChecks = Array.isArray(report?.checks) ? report.checks : [];
  const reportFindings = reportChecks.filter((check) => isIssueCheck(check.status));
  const reportPassedChecks = reportChecks.filter((check) => isPassedCheck(check.status));
  const reportNotApplicableChecks = reportChecks.filter((check) =>
    isNotApplicableCheck(check.status)
  );
  const reportSystemErrorChecks = reportChecks.filter((check) =>
    isSystemErrorCheck(check.status)
  );
  const liveChecks = events.filter((event) => event.type === "check");
  const liveFindings = liveChecks.filter((event) => isIssueCheck(event.checkStatus));
  const livePassedChecks = liveChecks.filter((event) =>
    isPassedCheck(event.checkStatus)
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
  const hasAuditFailed = status === "FAILED";
  const isAuditSettled = Boolean(report) || status === "FAILED";
  const isAuditActive = Boolean(jobId) && !isAuditSettled;
  const showProgressSidebar = !report;
  const categoryScores = buildCategoryScoreModels(report);
  const userFacingError =
    actionState.error ||
    liveError ||
    (reportQuery.error instanceof Error &&
      !(reportQuery.error instanceof ReportPendingError)
      ? reportQuery.error.message
      : null);

  const isInitialProgress =
    !report && !hasAuditFailed && currentProgress === 0 && status !== "COMPLETE";

  const progressValue = hasAuditFailed ? 100 : report ? 100 : currentProgress;
  const progressLabel = hasAuditFailed
    ? "Failed"
    : report
      ? "Ready"
      : isInitialProgress
        ? "Starting..."
        : `${currentProgress}%`;

  const progressBarClassName = hasAuditFailed ? "bg-rose-500" : "bg-primary";
  const currentStepMessage = hasAuditFailed
    ? userFacingError ?? "We couldn't finish reviewing this site."
    : pendingReport
      ? "Putting the final touches on your results"
      : report
        ? "Your results are ready"
        : "Checking your site";

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

      React.startTransition(() => {
        const formData = new FormData();
        formData.append("url", targetUrl || "");
        formAction(formData);
      });
    },
    [formAction, targetUrl]
  );

  const handleReset = React.useCallback(() => {
    reset();
    setHandoffJobId(null);
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
            React.startTransition(() => {
              formAction(formData);
              setIsTyping(false);
            });
          }, 350);
        }
      }
    };

    setUrl("");
    animateTyping(1);
  }, [formAction, isAuditActive, isPending, isTyping]);

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
    },
    [url]
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
  const headerModel = buildAuditHeaderModel({
    status,
    isPending,
    targetUrl: targetUrl || null,
    placeholderUrl: actionState.targetUrl || null,
    hasAuditFailed,
    pendingReport,
    hasReport: Boolean(report),
    reportScore,
    userFacingError,
  });
  const topRecommendationHero = topRecommendationHeroRow
    ? { ...topRecommendationHeroRow, isHero: true }
    : null;
  const currentOperationState = hasAuditFailed
    ? "failed"
    : pendingReport
      ? "pending"
      : report
        ? "ready"
        : "active";

  return {
    inputRef,
    resultPanelRef,
    visibility: {
      showResultPanel: Boolean(jobId || isPending || userFacingError),
      showLiveStream: !report,
      showProgressSidebar,
    },
    inputPanel: {
      action: formAction,
      onSubmit: handleSubmit,
      url,
      clientError,
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
      model: headerModel,
      showCompactActions: (Boolean(report) || hasAuditFailed) && !isAuditActive,
    },
    liveStream: {
      rows: events.map(buildAuditStreamRowModel),
    },
    progressSidebar: {
      connectionLabel: formatConnectionLabel(connectionStatus, status),
      hasAuditFailed,
      targetUrlLabel: targetUrl || actionState.targetUrl || "Waiting",
      gapsCount: liveFindings.length,
      signalsCount: livePassedChecks.length,
      progressValue,
      progressLabel,
      progressBarClassName,
      currentStepMessage,
      operationState: currentOperationState,
    },
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
        claimPanel: isAuthenticated
          ? null
          : {
            loading: claimTokenQuery.isPending,
            error: claimTokenQuery.error instanceof Error ? claimTokenQuery.error.message : null,
            signUpHref: claimTokenQuery.data ? `/sign-up?claim=${encodeURIComponent(claimTokenQuery.data)}` : null,
            signInHref: claimTokenQuery.data ? `/sign-in?claim=${encodeURIComponent(claimTokenQuery.data)}` : null,
          },
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
