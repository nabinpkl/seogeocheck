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
  AuditMessageSection,
  AuditStreamRowModel,
  AuditTone,
} from "../types/models";

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

export function isNotApplicableCheck(status?: string) {
  return status === "not_applicable";
}

export function isSystemErrorCheck(status?: string) {
  return status === "system_error";
}

function checkStatusRank(status?: string) {
  if (status === "issue") {
    return 0;
  }
  if (status === "passed") {
    return 1;
  }
  if (status === "not_applicable") {
    return 2;
  }
  if (status === "system_error") {
    return 3;
  }
  return 4;
}

export function toneForSeverity(severity?: string | null): AuditTone {
  switch (severity) {
    case "high":
      return "critical";
    case "medium":
      return "warning";
    default:
      return "info";
  }
}

export function severityRank(severity?: string | null) {
  switch (severity) {
    case "high":
      return 0;
    case "medium":
      return 1;
    default:
      return 2;
  }
}

export function toneForScore(
  score: number,
  options?: { confidence?: number | null }
): Exclude<AuditTone, "pending"> {
  if (options?.confidence === 0) {
    return "neutral";
  }

  if (score > 70) {
    return "success";
  }

  if (score > 40) {
    return "info";
  }

  return "critical";
}

function confidenceForCategory(
  scoringCategories: AuditReport["rawSummary"]["scoring"] extends infer T
    ? T extends { categories: infer Categories }
      ? Categories | undefined
      : undefined
    : undefined,
  key: string
) {
  const candidate = scoringCategories as Record<string, { confidence?: number }> | undefined;
  return typeof candidate?.[key]?.confidence === "number" ? candidate[key].confidence : null;
}

export function formatSeverityLabel(severity?: string | null) {
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

function appendMessageSection(
  sections: AuditMessageSection[],
  label: string,
  value?: string | null
) {
  if (typeof value !== "string") {
    return;
  }

  const normalized = value.trim();
  if (!normalized) {
    return;
  }

  sections.push({ label, body: normalized });
}

function buildMessageSections(
  kind: AuditCheckKind | "neutral",
  values: { instruction?: string | null; detail?: string | null }
): AuditMessageSection[] {
  const sections: AuditMessageSection[] = [];

  switch (kind) {
    case "issue":
      appendMessageSection(sections, "Recommended fix", values.instruction);
      appendMessageSection(sections, "What we found", values.detail);
      break;
    case "passed":
      appendMessageSection(sections, "What is working", values.detail);
      appendMessageSection(sections, "Why this passed", values.instruction);
      break;
    case "not_applicable":
      appendMessageSection(sections, "What good looks like", values.instruction);
      appendMessageSection(sections, "Why not applicable", values.detail);
      break;
    case "system_error":
      appendMessageSection(sections, "Why verification failed", values.detail);
      appendMessageSection(sections, "Next step", values.instruction);
      break;
    default:
      appendMessageSection(sections, "Detail", values.detail);
      appendMessageSection(sections, "Next step", values.instruction);
      break;
  }

  return sections;
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
  const leftRank = checkStatusRank(left.status);
  const rightRank = checkStatusRank(right.status);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const leftIssue = isIssueCheck(left.status);
  const rightIssue = isIssueCheck(right.status);
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
          isIssueCheck(check.status)
            ? "issue"
            : isPassedCheck(check.status)
              ? "passed"
              : isNotApplicableCheck(check.status)
                ? "not_applicable"
                : "system_error"
        )
      );

      const issueCount = sortedChecks.filter((check) => isIssueCheck(check.status)).length;
      const passedCount = sortedChecks.filter((check) => isPassedCheck(check.status)).length;
      const notApplicableCount = sortedChecks.filter((check) =>
        isNotApplicableCheck(check.status)
      ).length;
      const systemErrorCount = sortedChecks.filter((check) =>
        isSystemErrorCheck(check.status)
      ).length;

      return {
        id: familyKey,
        title: formatProblemFamilyLabel(familyKey),
        issueCount,
        passedCount,
        notApplicableCount,
        systemErrorCount,
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
  const isPassed = kind === "passed";
  const isNotApplicable = kind === "not_applicable";

  const problemFamily = normalizeProblemFamily(check.metadata?.problemFamily as string | undefined);

  return {
    id: check.id ?? `${kind}-${check.label ?? "unknown"}-${check.selector ?? "none"}`,
    kind,
    title: check.label ??
      (isIssue
        ? "Technical Finding"
        : isPassed
          ? "Optimized Signal"
          : isNotApplicable
            ? "Check Not Applicable"
            : "Verification Needed"),
    problemFamily,
    problemFamilyLabel: formatProblemFamilyLabel(problemFamily),
    evidenceSourceLabel: formatEvidenceSource(check.metadata?.evidenceSource),
    severityLabel: isIssue
      ? formatSeverityLabel(check.severity)
      : isPassed
        ? "Passed"
        : isNotApplicable
          ? "Not Applicable"
          : "Couldn't Verify",
    tone: isIssue
      ? toneForSeverity(check.severity)
      : isPassed
        ? "success"
        : isNotApplicable
          ? "neutral"
          : "warning",
    messageSections: buildMessageSections(kind, {
      instruction: check.instruction,
      detail: check.detail,
    }),
    selector: typeof check.selector === "string" ? check.selector : null,
    metric: typeof check.metric === "string" ? check.metric : null,
    isHero: options?.isHero,
  };
}

export function buildAuditStreamRowModel(event: AuditStreamEvent): AuditStreamRowModel {
  const isIssue = isIssueCheck(event.checkStatus);
  const isPassed = isPassedCheck(event.checkStatus);
  const isNotApplicable = isNotApplicableCheck(event.checkStatus);
  const isSystemError = isSystemErrorCheck(event.checkStatus);
  const isError = event.type === "error";
  const state =
    isError
      ? "error"
      : isPassed
        ? "passed"
        : isNotApplicable
          ? "not_applicable"
          : isSystemError
            ? "system_error"
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
    messageSections: buildMessageSections(
      isPassed
        ? "passed"
        : isNotApplicable
          ? "not_applicable"
          : isSystemError
            ? "system_error"
            : isIssue
              ? "issue"
              : "neutral",
      {
        instruction: typeof event.instruction === "string" ? event.instruction : null,
        detail: typeof event.detail === "string" ? event.detail : null,
      }
    ),
    severityLabel:
      typeof event.severity === "string"
        ? formatSeverityLabel(event.severity)
        : isPassed
          ? "Passed"
          : isNotApplicable
            ? "Not Applicable"
            : isSystemError
              ? "Couldn't Verify"
          : null,
    tone:
      isError
        ? "critical"
        : isPassed
          ? "success"
          : isNotApplicable
            ? "neutral"
            : isSystemError
              ? "warning"
              : isIssue
                ? toneForSeverity(event.severity)
                : "neutral",
    state,
  };
}

export function buildCategoryScoreModels(report?: AuditReport): AuditCategoryScoreModel[] {
  if (!report?.categories) {
    return [];
  }

  const scoringCategories = report.rawSummary?.scoring?.categories;

  return [
    ...CATEGORY_ORDER.filter((key) =>
      Object.prototype.hasOwnProperty.call(report.categories, key)
    ).map((key) => {
      const score =
        typeof report.categories?.[key] === "number" ? report.categories[key] : 0;
      const confidence = confidenceForCategory(scoringCategories, key);

      return {
        key,
        label: formatCategoryLabel(key),
        score,
        tone: toneForScore(score, { confidence }),
      };
    }),
    ...Object.entries(report.categories)
      .filter(
        ([key]) => !CATEGORY_ORDER.includes(key as (typeof CATEGORY_ORDER)[number])
      )
      .map(([key, value]) => {
        const confidence = confidenceForCategory(scoringCategories, key);
        const score = typeof value === "number" ? value : 0;

        return {
          key,
          label: formatCategoryLabel(key),
          score,
          tone: toneForScore(score, { confidence }),
        };
      }),
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
      titleIcon: AlertCircle,
      titleIconClassName: "h-5 w-5 text-rose-500",
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
      titleIcon: ShieldCheck,
      titleIconClassName: "h-5 w-5 text-primary",
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
      titleIcon: FileText,
      titleIconClassName: "h-5 w-5 text-primary",
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
    titleIcon: Radar,
    titleIconClassName: "h-5 w-5 text-primary",
    errorMessage: userFacingError,
  };
}
