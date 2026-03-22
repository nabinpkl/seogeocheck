import { AlertCircle, FileText, Radar, ShieldCheck } from "lucide-react";
import type {
  AuditReport,
  AuditReportCheck,
  AuditStreamEvent,
} from "@/types/audit";
import type {
  AuditCategoryScoreModel,
  AuditCheckKind,
  AuditCheckRowModel,
  AuditFamilyChecklistGroupModel,
  AuditHeaderModel,
  AuditStreamRowModel,
  AuditTone,
} from "./models";

const CATEGORY_LABELS: Record<string, string> = {
  reachability: "Reachability",
  crawlability: "Crawlability",
  indexability: "Indexability",
  contentVisibility: "Content Visibility",
  metadata: "Metadata",
  discovery: "Discovery",
};

const CATEGORY_ORDER = [
  "reachability",
  "crawlability",
  "indexability",
  "contentVisibility",
  "metadata",
  "discovery",
] as const;

const DEFAULT_PROBLEM_FAMILY = "general_hygiene";

const PROBLEM_FAMILY_LABELS: Record<string, string> = {
  robots_controls: "Robots Controls",
  meta_refresh: "Meta Refresh",
  canonical_controls: "Canonical Controls",
  robots_txt: "Robots.txt",
  redirect_chain: "Redirect Chain",
  alternate_language_controls: "Alternate Language",
  html_lang: "HTML Language",
  source_link_presence: "Source Link Presence",
  internal_link_discovery: "Internal Link Discovery",
  anchor_text_quality: "Anchor Text Quality",
  fragment_routes: "Fragment Routes",
  render_dependency: "Render Dependency",
  heading_structure: "Heading Structure",
  document_title: "Document Title",
  meta_description: "Meta Description",
  social_open_graph: "Open Graph",
  structured_data: "Structured Data",
  social_twitter: "Twitter Preview",
  social_url_hygiene: "Social URL Hygiene",
  robots_preview: "Robots Preview",
  metadata_alignment: "Metadata Alignment",
  meta_viewport: "Meta Viewport",
  favicon: "Favicon",
  head_hygiene: "Head Hygiene",
  general_hygiene: "General Hygiene",
};

export function isIssueCheck(status?: string) {
  return status === "issue";
}

export function isPassedCheck(status?: string) {
  return status === "passed";
}

export function toneForSeverity(severity?: string): AuditTone {
  switch (severity) {
    case "high":
      return "critical";
    case "medium":
      return "warning";
    default:
      return "info";
  }
}

export function severityRank(severity?: string) {
  switch (severity) {
    case "high":
      return 0;
    case "medium":
      return 1;
    default:
      return 2;
  }
}

export function toneForScore(score: number): Exclude<AuditTone, "pending"> {
  if (score > 70) {
    return "success";
  }

  if (score > 40) {
    return "info";
  }

  return "critical";
}

export function formatSeverityLabel(severity?: string) {
  switch (severity) {
    case "high":
      return "Critical";
    case "medium":
      return "Medium Priority";
    case "low":
      return "Low Priority";
    default:
      return severity ?? "Note";
  }
}

export function formatStatusLabel(status: string, isPending: boolean) {
  if (status === "IDLE" && isPending) {
    return "STARTING";
  }

  switch (status) {
    case "QUEUED":
      return "STARTING";
    case "STREAMING":
      return "IN PROGRESS";
    case "COMPLETE":
      return "FINALIZING";
    case "FAILED":
      return "NEEDS ATTENTION";
    case "VERIFIED":
      return "READY";
    default:
      return status;
  }
}

export function toneForAuditStatus(status: string, isPending: boolean): AuditTone {
  if (status === "FAILED") {
    return "critical";
  }

  if (status === "VERIFIED") {
    return "success";
  }

  if (status === "COMPLETE") {
    return "pending";
  }

  if (status === "STREAMING" || status === "QUEUED" || isPending) {
    return "info";
  }

  return "neutral";
}

export function formatConnectionLabel(connectionStatus: string, auditStatus: string) {
  if (auditStatus === "FAILED") {
    return "Failed";
  }

  if (auditStatus === "VERIFIED" || auditStatus === "COMPLETE") {
    return "Complete";
  }

  switch (connectionStatus) {
    case "open":
      return "On";
    case "connecting":
      return "Starting";
    case "closed":
      return "Complete";
    default:
      return "Waiting";
  }
}

export function formatTimestamp(timestamp?: string) {
  if (!timestamp) {
    return "Live now";
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.valueOf())) {
    return "Live now";
  }

  return parsed.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function renderEventLead(event: AuditStreamEvent) {
  if (typeof event.message === "string") {
    return event.message;
  }

  if (typeof event.instruction === "string") {
    return event.instruction;
  }

  return "New audit signal received.";
}

export function renderEventDetail(event: AuditStreamEvent) {
  if (typeof event.instruction === "string") {
    return event.instruction;
  }

  if (typeof event.detail === "string") {
    return event.detail;
  }

  return null;
}

export function formatCategoryLabel(key: string) {
  const knownLabel = CATEGORY_LABELS[key];
  if (knownLabel) {
    return knownLabel;
  }

  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function formatEvidenceSource(evidenceSource?: string) {
  if (evidenceSource === "source_html") {
    return "Source HTML";
  }

  if (evidenceSource === "rendered_dom") {
    return "Rendered DOM";
  }

  if (evidenceSource === "surface_comparison") {
    return "Rendered Comparison";
  }

  if (!evidenceSource) {
    return null;
  }

  return evidenceSource.replaceAll("_", " ");
}

function normalizeProblemFamily(problemFamily?: string) {
  const trimmed = typeof problemFamily === "string" ? problemFamily.trim() : "";
  if (!trimmed) {
    return DEFAULT_PROBLEM_FAMILY;
  }

  return trimmed.toLowerCase();
}

function prettifyProblemFamily(problemFamily: string) {
  return problemFamily
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function formatProblemFamilyLabel(problemFamily?: string) {
  const normalized = normalizeProblemFamily(problemFamily);
  return PROBLEM_FAMILY_LABELS[normalized] ?? prettifyProblemFamily(normalized);
}

function compareChecksByPriority(left: AuditReportCheck, right: AuditReportCheck) {
  const leftIssue = isIssueCheck(left.status);
  const rightIssue = isIssueCheck(right.status);

  if (leftIssue !== rightIssue) {
    return leftIssue ? -1 : 1;
  }

  if (leftIssue && rightIssue) {
    const severityDiff = severityRank(left.severity) - severityRank(right.severity);
    if (severityDiff !== 0) {
      return severityDiff;
    }
  }

  const leftLabel = typeof left.label === "string" ? left.label : "";
  const rightLabel = typeof right.label === "string" ? right.label : "";
  return leftLabel.localeCompare(rightLabel);
}

export function selectTopRecommendationChecks(checks: AuditReportCheck[]) {
  const issues = checks.filter((check) => isIssueCheck(check.status));
  if (issues.length === 0) {
    return [];
  }

  const strongestRank = Math.min(...issues.map((check) => severityRank(check.severity)));
  return issues
    .filter((check) => severityRank(check.severity) === strongestRank)
    .sort(compareChecksByPriority);
}

export function buildFamilyChecklistGroups(
  checks: AuditReportCheck[]
): AuditFamilyChecklistGroupModel[] {
  if (checks.length === 0) {
    return [];
  }

  const grouped = new Map<string, AuditReportCheck[]>();

  for (const check of checks) {
    const familyKey = normalizeProblemFamily(check.metadata?.problemFamily as string | undefined);
    const current = grouped.get(familyKey) ?? [];
    current.push(check);
    grouped.set(familyKey, current);
  }

  return [...grouped.entries()]
    .map(([familyKey, familyChecks]) => {
      const sortedChecks = [...familyChecks].sort(compareChecksByPriority);
      const rows = sortedChecks.map((check, index) =>
        buildAuditCheckRowModel(
          {
            ...check,
            id: check.id ?? `${familyKey}-${check.status ?? "unknown"}-${index}`,
          },
          isIssueCheck(check.status) ? "issue" : "passed"
        )
      );

      const issueCount = sortedChecks.filter((check) => isIssueCheck(check.status)).length;
      const passedCount = sortedChecks.filter((check) => isPassedCheck(check.status)).length;

      return {
        id: familyKey,
        title: formatProblemFamilyLabel(familyKey),
        issueCount,
        passedCount,
        rows,
      };
    })
    .sort((left, right) => {
      const leftSeverity = left.rows
        .filter((row) => row.kind === "issue")
        .reduce((rank, row) => Math.min(rank, severityRank(row.tone === "critical" ? "high" : row.tone === "warning" ? "medium" : "low")), 99);
      const rightSeverity = right.rows
        .filter((row) => row.kind === "issue")
        .reduce((rank, row) => Math.min(rank, severityRank(row.tone === "critical" ? "high" : row.tone === "warning" ? "medium" : "low")), 99);

      if (leftSeverity !== rightSeverity) {
        return leftSeverity - rightSeverity;
      }

      if (left.issueCount !== right.issueCount) {
        return right.issueCount - left.issueCount;
      }

      return left.title.localeCompare(right.title);
    });
}

export function buildAuditCheckRowModel(
  check: AuditReportCheck,
  kind: AuditCheckKind,
  options?: { isHero?: boolean }
): AuditCheckRowModel {
  const isIssue = kind === "issue";

  let summaryLabel: string | null = null;
  let summary: string | null = null;

  if (isIssue && check.instruction) {
    summaryLabel = "Recommended fix";
    summary = check.instruction;
  } else if (!isIssue && check.detail) {
    summaryLabel = "What is working";
    summary = check.detail;
  } else if (!isIssue && check.instruction) {
    summaryLabel = "Why this passed";
    summary = check.instruction;
  } else if (isIssue && check.detail) {
    summaryLabel = "Recommendation";
    summary = check.detail;
  }

  const problemFamily = normalizeProblemFamily(check.metadata?.problemFamily as string | undefined);

  return {
    id: check.id ?? `${kind}-${check.label ?? "unknown"}-${check.selector ?? "none"}`,
    kind,
    title: check.label ?? (isIssue ? "Technical Finding" : "Optimized Signal"),
    problemFamily,
    problemFamilyLabel: formatProblemFamilyLabel(problemFamily),
    evidenceSourceLabel: formatEvidenceSource(check.metadata?.evidenceSource),
    severityLabel: isIssue ? formatSeverityLabel(check.severity) : "Passed",
    tone: isIssue ? toneForSeverity(check.severity) : "success",
    summaryLabel,
    summary,
    selector: typeof check.selector === "string" ? check.selector : null,
    metric: typeof check.metric === "string" ? check.metric : null,
    isHero: options?.isHero,
  };
}

export function buildAuditStreamRowModel(event: AuditStreamEvent): AuditStreamRowModel {
  const isIssue = isIssueCheck(event.checkStatus);
  const isPassed = isPassedCheck(event.checkStatus);
  const isError = event.type === "error";
  const state =
    isError
      ? "error"
      : isPassed
        ? "passed"
        : isIssue
          ? "issue"
          : event.type === "complete"
            ? "complete"
            : "neutral";

  return {
    id: String(event.eventId ?? `${event.type}-${event.timestamp ?? "now"}`),
    title: renderEventLead(event),
    timestampLabel: formatTimestamp(
      typeof event.timestamp === "string" ? event.timestamp : undefined
    ),
    selector: typeof event.selector === "string" ? event.selector : null,
    detail: renderEventDetail(event),
    detailLabel: isPassed ? "What went well:" : "Recommendation:",
    severityLabel:
      typeof event.severity === "string"
        ? formatSeverityLabel(event.severity)
        : isPassed
          ? "Passed"
          : null,
    tone:
      isError ? "critical" : isPassed ? "success" : isIssue ? toneForSeverity(event.severity) : "neutral",
    state,
  };
}

export function buildCategoryScoreModels(report?: AuditReport): AuditCategoryScoreModel[] {
  if (!report?.categories) {
    return [];
  }

  return [
    ...CATEGORY_ORDER.filter((key) =>
      Object.prototype.hasOwnProperty.call(report.categories, key)
    ).map((key) => ({
      key,
      label: formatCategoryLabel(key),
      score:
        typeof report.categories?.[key] === "number" ? report.categories[key] : 0,
      tone: toneForScore(
        typeof report.categories?.[key] === "number" ? report.categories[key] : 0
      ),
    })),
    ...Object.entries(report.categories)
      .filter(
        ([key]) => !CATEGORY_ORDER.includes(key as (typeof CATEGORY_ORDER)[number])
      )
      .map(([key, value]) => ({
        key,
        label: formatCategoryLabel(key),
        score: typeof value === "number" ? value : 0,
        tone: toneForScore(typeof value === "number" ? value : 0),
      })),
  ];
}

export function buildAuditHeaderModel(args: {
  status: string;
  isPending: boolean;
  targetUrl: string | null;
  placeholderUrl: string | null;
  hasAuditFailed: boolean;
  pendingReport: boolean;
  hasReport: boolean;
  reportScore: number;
  userFacingError: string | null;
}): AuditHeaderModel {
  const {
    status,
    isPending,
    targetUrl,
    placeholderUrl,
    hasAuditFailed,
    pendingReport,
    hasReport,
    reportScore,
    userFacingError,
  } = args;

  const effectiveTargetUrl = targetUrl || placeholderUrl || "";

  if (hasAuditFailed) {
    return {
      statusLabel: formatStatusLabel(status, isPending),
      statusTone: "critical",
      targetUrlLabel: effectiveTargetUrl || "Preparing your audit",
      targetUrlHref: effectiveTargetUrl || null,
      title: "Technical Audit Interrupted",
      titleTone: "critical",
      titleIcon: <AlertCircle className="h-5 w-5 text-rose-500" />,
      errorMessage: userFacingError,
    };
  }

  if (pendingReport) {
    return {
      statusLabel: formatStatusLabel(status, isPending),
      statusTone: "pending",
      targetUrlLabel: effectiveTargetUrl || "Preparing your audit",
      targetUrlHref: effectiveTargetUrl || null,
      title: "Finalizing Intelligence Data",
      titleTone: "default",
      titleIcon: <ShieldCheck className="h-5 w-5 text-primary" />,
      errorMessage: userFacingError,
    };
  }

  if (hasReport || reportScore > 0) {
    return {
      statusLabel: formatStatusLabel(status, isPending),
      statusTone: "success",
      targetUrlLabel: effectiveTargetUrl || "Preparing your audit",
      targetUrlHref: effectiveTargetUrl || null,
      title: "Visibility Analysis & Search Intelligence Report",
      titleTone: "default",
      titleIcon: <FileText className="h-5 w-5 text-primary" />,
      errorMessage: userFacingError,
    };
  }

  return {
    statusLabel: formatStatusLabel(status, isPending),
    statusTone: toneForAuditStatus(status, isPending),
    targetUrlLabel: effectiveTargetUrl || "Preparing your audit",
    targetUrlHref: effectiveTargetUrl || null,
    title: "Reviewing Technical Search Signals",
    titleTone: "default",
    titleIcon: <Radar className="h-5 w-5 text-primary" />,
    errorMessage: userFacingError,
  };
}
