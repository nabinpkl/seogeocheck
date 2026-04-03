/**
 * This file is generated from JSON Schema.
 * Do not edit it by hand.
 */

export type AuditStatus = 'QUEUED' | 'STREAMING' | 'COMPLETE' | 'FAILED' | 'VERIFIED';
export type IndexabilityVerdictLabel = 'Blocked' | 'Unknown' | 'At Risk' | 'Indexable';
export type CheckStatus = 'issue' | 'passed' | 'not_applicable' | 'system_error';
export type AuditCategoryId =
  | 'reachability'
  | 'crawlability'
  | 'indexability'
  | 'sitewide'
  | 'contentVisibility'
  | 'metadata'
  | 'discovery';
export type Severity = 'high' | 'medium' | 'low';
export type EvidenceSource = 'source_html' | 'rendered_dom' | 'surface_comparison';
export type ProblemFamily =
  | 'alternate_language_controls'
  | 'anchor_text_quality'
  | 'body-image-alt'
  | 'canonical_controls'
  | 'content-depth'
  | 'document_title'
  | 'favicon'
  | 'fragment_routes'
  | 'head_hygiene'
  | 'heading_structure'
  | 'html_lang'
  | 'internal_link_discovery'
  | 'meta_description'
  | 'meta_refresh'
  | 'meta_viewport'
  | 'metadata_alignment'
  | 'redirect_chain'
  | 'render_dependency'
  | 'robots_controls'
  | 'robots_preview'
  | 'robots_txt'
  | 'soft_404'
  | 'social_open_graph'
  | 'social_twitter'
  | 'social_url_hygiene'
  | 'sitewide_discovery_alignment'
  | 'sitewide_foundations'
  | 'sitewide_sample_coverage'
  | 'sitewide_sitemap_hygiene'
  | 'sitewide_sitemaps'
  | 'source-visible-text'
  | 'source_link_presence'
  | 'structured_data'
  | 'url-reachable';

export interface AuditReport {
  jobId: string;
  status: AuditStatus;
  generatedAt: string;
  targetUrl: string;
  summary: AuditSummary;
  scoring: AuditScoring;
  checks: ReportCheck[];
  actions: RecommendedAction[];
}
export interface AuditSummary {
  score: number;
  indexabilityVerdict: IndexabilityVerdictLabel;
  issueCount: number;
  passedCheckCount: number;
  notApplicableCount: number;
  systemErrorCount: number;
  topIssue: string;
}
export interface AuditScoring {
  overall: AuditScoringOverall;
  categories: AuditScoringCategories;
}
export interface AuditScoringOverall {
  confidence: number;
}
export interface AuditScoringCategories {
  reachability: AuditScoringCategoryBreakdown;
  crawlability: AuditScoringCategoryBreakdown;
  indexability: AuditScoringCategoryBreakdown;
  sitewide: AuditScoringCategoryBreakdown;
  contentVisibility: AuditScoringCategoryBreakdown;
  metadata: AuditScoringCategoryBreakdown;
  discovery: AuditScoringCategoryBreakdown;
}
export interface AuditScoringCategoryBreakdown {
  score: number;
  confidence: number;
}
export interface ReportCheck {
  id: string;
  label: string;
  status: CheckStatus;
  category: AuditCategoryId;
  severity?: null | Severity;
  instruction?: string;
  detail?: string;
  selector?: string;
  metric?: string;
  metadata?: ReportCheckMetadata;
}
export interface ReportCheckMetadata {
  evidenceSource?: EvidenceSource;
  problemFamily?: ProblemFamily;
}
export interface RecommendedAction {
  checkId: string;
  label: string;
  category: AuditCategoryId;
  severity?: null | Severity;
  instruction: string;
  detail?: string;
}
