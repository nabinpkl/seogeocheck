/* eslint-disable */
/**
 * This file is generated from JSON Schema.
 * Do not edit it by hand.
 */

export type AuditStatus = 'QUEUED' | 'STREAMING' | 'COMPLETE' | 'FAILED' | 'VERIFIED';
export type IndexabilityVerdictLabel = 'Blocked' | 'Unknown' | 'At Risk' | 'Indexable';
export type CheckStatus = 'issue' | 'passed' | 'not_applicable' | 'system_error';
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
  | 'social_open_graph'
  | 'social_twitter'
  | 'social_url_hygiene'
  | 'source-visible-text'
  | 'source_link_presence'
  | 'structured_data'
  | 'url-reachable';
export type ReasonCode = 'missing_prerequisite' | 'invalid_prerequisite' | 'upstream_fetch_failed' | 'timeout';
export type NullableString = string | null;
export type NullableInteger = number | null;
export type NullableBoolean = boolean | null;

export interface AuditReport {
  jobId: string;
  status: AuditStatus;
  generatedAt: string;
  targetUrl: string;
  reportType: 'SEO_SIGNALS_SIGNED_AUDIT';
  indexabilityVerdict: IndexabilityVerdictLabel;
  summary: ReportSummary;
  checks: ReportCheck[];
  categories: CategoryScores;
  rawSummary: RawSummary;
  signature: Signature;
}
export interface ReportSummary {
  score: number;
  status: AuditStatus;
  indexabilityVerdict: IndexabilityVerdictLabel;
  targetUrl: string;
  issueCount: number;
  passedCheckCount: number;
  notApplicableCount: number;
  systemErrorCount: number;
  topIssue: string;
}
export interface ReportCheck {
  id: string;
  label: string;
  status: CheckStatus;
  severity?: null | Severity;
  instruction?: string | null;
  detail?: string | null;
  selector?: string | null;
  metric?: string | null;
  metadata?: ReportCheckMetadata;
}
export interface ReportCheckMetadata {
  evidenceSource?: EvidenceSource;
  problemFamily?: ProblemFamily;
  reasonCode?: ReasonCode;
  blockedBy?: string[];
  retryable?: boolean;
  length?: number;
  minLength?: number;
  maxLength?: number;
  title?: string;
  content?: NullableString;
  contentType?: NullableString;
  value?: NullableString;
  canonicalValue?: NullableString;
  finalUrl?: NullableString;
  resolvedCanonicalUrl?: NullableString;
  targetUrl?: NullableString;
  status?: NullableString;
  statusCode?: NullableInteger;
  wordCount?: number;
  h1Count?: number;
  headingCount?: number;
  bodyImageCount?: number;
  eligibleBodyImageCount?: number;
  bodyImageMissingAltCount?: number;
  linkedImageCount?: number;
  linkedImageMissingAltCount?: number;
  sameOriginCrawlableLinkCount?: number;
  nonCrawlableLinkCount?: number;
  emptyAnchorTextCount?: number;
  genericAnchorTextCount?: number;
  emptyHeadingCount?: number;
  repeatedHeadingCount?: number;
  problematicLinkCount?: number;
  iconCount?: number;
  tagCount?: number;
  fieldCount?: number;
  minimumRecommendedCount?: number;
  immediateRedirectCount?: number;
  refreshOnlyCount?: number;
  timedRedirectCount?: number;
  malformedCount?: number;
  redirectCount?: number;
  metaDescriptionSharedTokenCount?: number;
  titleSharedTokenCount?: number;
  totalJsonLdBlocks?: number;
  validJsonLdBlocks?: number;
  invalidJsonLdBlocks?: number;
  emptyJsonLdBlocks?: number;
  missingContextBlocks?: number;
  missingTypeBlocks?: number;
  structuredDataKinds?: string[];
  sourceWordCount?: number;
  renderedWordCount?: number;
  sourceSameOriginCrawlableLinkCount?: number;
  renderedSameOriginCrawlableLinkCount?: number;
  sourceStructuredDataKinds?: string[];
  renderedStructuredDataKinds?: string[];
  sourceMetaDescription?: string;
  renderedMetaDescription?: string;
  sourceTitle?: string;
  renderedTitle?: string;
  sourceCanonicalUrl?: string;
  renderedCanonicalUrl?: string;
  sourceRobotsContent?: NullableString;
  renderedRobotsContent?: NullableString;
  sourceH1Count?: number;
  renderedH1Count?: number;
  effectiveIndexing?: NullableString;
  effectiveTarget?: NullableString;
  effectiveSnippet?: NullableString;
  effectiveArchive?: NullableString;
  effectiveTranslate?: NullableString;
  effectiveMaxSnippet?: NullableString;
  effectiveMaxImagePreview?: NullableString;
  effectiveMaxVideoPreview?: NullableString;
  expectsSelfReference?: boolean;
  hasDeviceWidth?: boolean;
  hasInitialScale?: boolean;
  disablesZoom?: boolean;
  hasMultipleH1?: boolean;
  hasSkippedLevels?: boolean;
  firstHeadingNotH1?: boolean;
  reusedCurrentPageInspection?: boolean;
  titleH1Mismatch?: boolean;
  weakMetaDescriptionAlignment?: boolean;
  firstH1Text?: NullableString;
  missingFields?: string[];
  presentFields?: string[];
  rels?: string[];
  restrictiveSignals?: string[];
  conflicts?: RobotsSameTargetConflict[];
  targetedOverrides?: RobotsTargetedOverride[];
  problematicTokens?: {
    type: string;
    token: string;
  }[];
  entries?: (MetaRefreshEntry | RobotsDirectiveEntry)[];
  fieldValues?: OpenGraphFieldValues | TwitterFieldValues;
  duplicateFields?: SocialFieldDuplicate[];
  fields?: SocialUrlField[];
  invalidFields?: SocialUrlField[];
  links?: IconLink[];
  skippedTransitions?: HeadingTransition[];
  repeatedHeadings?: HeadingRepeat[];
  problematicFields?: DuplicateFieldCount[];
  blocks?: StructuredDataBlock[];
  duplicateHeadCounts?: DuplicateHeadCounts;
  inspection?: null | UrlInspection;
  robotsControl?: null | RobotsControl;
  canonicalControl?: CanonicalControl;
  alternateLanguageControl?: AlternateLanguageControl;
  linkDiscoveryControl?: LinkDiscoveryControl;
  internalLinkCoverageControl?: InternalLinkCoverageControl;
  titleControl?: TitleControl;
  metaDescriptionControl?: MetaDescriptionControl;
  headingControl?: HeadingControl;
  headingQualityControl?: HeadingQualityControl;
  bodyImageAltControl?: BodyImageAltControl;
  langControl?: LangControl;
  socialMetadataControl?: SocialMetadataControl;
  socialUrlControl?: SocialUrlControl;
  metadataAlignmentControl?: MetadataAlignmentControl;
  robotsPreviewControl?: RobotsPreviewControl;
  viewportControl?: ViewportControl;
  faviconControl?: FaviconControl;
  headHygieneControl?: HeadHygieneControl;
  structuredDataControl?: StructuredDataControl;
  canonicalTargetControl?: CanonicalTargetControl;
  metaRefreshControl?: MetaRefreshControl;
  robotsTxt?: RobotsTxt;
  redirectChain?: RedirectChain;
}
export interface RobotsSameTargetConflict {
  target: string;
  field: string;
  values: string[];
}
export interface RobotsTargetedOverride {
  target: string;
  field: string;
  generalValue: string;
  targetedValue: string;
}
export interface MetaRefreshEntry {
  rawValue?: NullableString;
  status: string;
  delaySeconds: number | null;
  targetUrl?: NullableString;
  resolvedTargetUrl?: NullableString;
}
export interface RobotsDirectiveEntry {
  surface: string;
  target: string;
  rawValue: string;
  directives: string[];
  indexingValues: string[];
  followingValues: string[];
  snippetValues: string[];
  archiveValues: string[];
  translateValues: string[];
  maxSnippetValues: string[];
  maxImagePreviewValues: string[];
  maxVideoPreviewValues: string[];
  unsupportedTokens: string[];
  malformedTokens: string[];
}
export interface OpenGraphFieldValues {
  title?: NullableString;
  description?: NullableString;
  type?: NullableString;
  url?: NullableString;
  image?: NullableString;
}
export interface TwitterFieldValues {
  card?: NullableString;
  title?: NullableString;
  description?: NullableString;
  image?: NullableString;
}
export interface SocialFieldDuplicate {
  field: string;
  count: number;
}
export interface SocialUrlField {
  field: string;
  rawValue: string;
  status: string;
  resolvedUrl?: NullableString;
}
export interface IconLink {
  href?: NullableString;
  rel?: NullableString;
  sizes?: NullableString;
  type?: NullableString;
}
export interface HeadingTransition {
  fromLevel: number;
  toLevel: number;
  expectedNextLevel: number;
  headingText?: NullableString;
}
export interface HeadingRepeat {
  text?: NullableString;
  count: number;
}
export interface DuplicateFieldCount {
  field: string;
  count: number;
}
export interface StructuredDataBlock {
  status: string;
  hasContext: boolean;
  hasType: boolean;
}
export interface DuplicateHeadCounts {
  title: number;
  metaDescription: number;
  viewport: number;
  openGraphTitle: number;
  openGraphDescription: number;
  openGraphType: number;
  openGraphUrl: number;
  openGraphImage: number;
  twitterCard: number;
  twitterTitle: number;
  twitterDescription: number;
  twitterImage: number;
}
export interface UrlInspection {
  inspectedUrl?: NullableString;
  status: string;
  finalUrl?: NullableString;
  statusCode?: NullableInteger;
  contentType?: NullableString;
  isReachable: boolean;
  isHtmlResponse: boolean;
  metaRobotsTags: string[];
  googlebotRobotsTags: string[];
  xRobotsTag?: NullableString;
  xRobotsTagHeaders: string[];
  headerCanonicalLinks: LinkAnnotation[];
  headerAlternateLinks: LinkAnnotation[];
  redirectChain: RedirectChain;
  redirectCount: number;
  robotsTxt: RobotsTxt;
  reusedCurrentPageInspection: boolean;
}
export interface LinkAnnotation {
  href?: NullableString;
  rel?: NullableString;
  hreflang?: NullableString;
  media?: NullableString;
  type?: NullableString;
}
export interface RedirectChain {
  status: string;
  totalRedirects: number;
  finalUrlChanged: boolean;
  finalUrl?: NullableString;
  chain: RedirectStep[];
  error?: NullableString;
}
export interface RedirectStep {
  url: string;
  statusCode?: NullableInteger;
  location?: NullableString;
}
export interface RobotsTxt {
  status: string;
  allowsCrawl?: NullableBoolean;
  evaluatedUserAgent?: NullableString;
  matchedDirective?: NullableString;
  matchedPattern?: NullableString;
  fetchStatusCode?: NullableInteger;
  url?: NullableString;
  finalUrl?: NullableString;
  error?: NullableString;
}
export interface RobotsControl {
  status: string;
  entries: RobotsDirectiveEntry[];
  targets: {
    [k: string]: RobotsTargetSummary;
  };
  sameTargetConflicts: RobotsSameTargetConflict[];
  targetedOverrides: RobotsTargetedOverride[];
  unsupportedTokens: string[];
  malformedTokens: string[];
  effectiveIndexing?: NullableString;
  effectiveFollowing?: NullableString;
  effectiveSnippet?: NullableString;
  effectiveArchive?: NullableString;
  effectiveTranslate?: NullableString;
  effectiveMaxSnippet?: NullableString;
  effectiveMaxImagePreview?: NullableString;
  effectiveMaxVideoPreview?: NullableString;
  effectiveTarget?: NullableString;
  hasBlockingNoindex: boolean;
  hasNoarchiveDirective: boolean;
  hasNotranslateDirective: boolean;
}
export interface RobotsTargetSummary {
  entries: RobotsDirectiveEntry[];
  indexingValues: string[];
  followingValues: string[];
  snippetValues: string[];
  archiveValues: string[];
  translateValues: string[];
  maxSnippetValues: string[];
  maxImagePreviewValues: string[];
  maxVideoPreviewValues: string[];
  indexing?: NullableString;
  following?: NullableString;
  snippet?: NullableString;
  archive?: NullableString;
  translate?: NullableString;
  maxSnippet?: NullableString;
  maxImagePreview?: NullableString;
  maxVideoPreview?: NullableString;
}
export interface CanonicalControl {
  status: string;
  candidates: CanonicalCandidate[];
  uniqueTargetCount: number;
  uniqueTargets: string[];
  htmlCount: number;
  headerCount: number;
  invalidCandidates: CanonicalCandidate[];
  resolvedCanonicalUrl?: NullableString;
  consistency: string;
}
export interface CanonicalCandidate {
  href?: NullableString;
  rel?: NullableString;
  hreflang?: NullableString;
  media?: NullableString;
  type?: NullableString;
  surface: 'html' | 'http_header';
  status: string;
  resolvedUrl: NullableString;
}
export interface AlternateLanguageControl {
  status: string;
  annotations: AlternateLanguageAnnotation[];
  validAnnotations: AlternateLanguageAnnotation[];
  invalidAnnotations: AlternateLanguageAnnotation[];
  conflicts: AlternateLanguageConflict[];
  groupedByLanguage: {
    [k: string]: AlternateLanguageAnnotation[];
  };
}
export interface AlternateLanguageAnnotation {
  href?: NullableString;
  rel?: NullableString;
  hreflang?: NullableString;
  media?: NullableString;
  type?: NullableString;
  surface: 'html' | 'http_header';
  status: string;
  resolvedUrl: NullableString;
}
export interface AlternateLanguageConflict {
  hreflang: string;
  targets: string[];
}
export interface LinkDiscoveryControl {
  status: string;
  internalCrawlableLinkCount: number;
  internalNofollowCount: number;
  blockedByRelCount: number;
  affectedLinks: LinkDiscoveryAffectedLink[];
}
export interface LinkDiscoveryAffectedLink {
  href?: NullableString;
  text?: NullableString;
  relTokens: string[];
}
export interface InternalLinkCoverageControl {
  status: string;
  sameOriginCrawlableLinkCount: number;
  minimumRecommendedCount: number;
}
export interface TitleControl {
  status: string;
  length: number;
  minLength: number;
  maxLength: number;
}
export interface MetaDescriptionControl {
  status: string;
  length: number;
  minLength: number;
  maxLength: number;
}
export interface HeadingControl {
  status: string;
  h1Count: number;
  headingCount: number;
  skippedTransitions: HeadingTransition[];
  hasMultipleH1: boolean;
  hasSkippedLevels: boolean;
}
export interface HeadingQualityControl {
  status: string;
  emptyHeadingCount: number;
  repeatedHeadingCount: number;
  firstHeadingNotH1: boolean;
  repeatedHeadings: HeadingRepeat[];
}
export interface BodyImageAltControl {
  status: string;
  totalImageCount: number;
  eligibleImageCount: number;
  missingAltCount: number;
  excludedMissingSrcCount: number;
  excludedDecorativeCount: number;
  excludedTrackingPixelCount: number;
  missingAltImages: MissingAltImage[];
}
export interface MissingAltImage {
  src?: NullableString;
  alt?: NullableString;
}
export interface LangControl {
  status: string;
  value?: NullableString;
  canonicalValue?: NullableString;
}
export interface SocialMetadataControl {
  status: string;
  openGraph: OpenGraphSummary;
  twitter: TwitterSummary;
}
export interface OpenGraphSummary {
  status: string;
  presentFields: string[];
  missingFields: string[];
  duplicateFields: SocialFieldDuplicate[];
  fieldValues: OpenGraphFieldValues;
}
export interface TwitterSummary {
  status: string;
  presentFields: string[];
  missingFields: string[];
  duplicateFields: SocialFieldDuplicate[];
  fieldValues: TwitterFieldValues;
}
export interface SocialUrlControl {
  status: string;
  fieldCount: number;
  invalidFields: SocialUrlField[];
  fields: SocialUrlField[];
}
export interface MetadataAlignmentControl {
  status: string;
  firstH1Text?: NullableString;
  titleSharedTokenCount: number;
  metaDescriptionSharedTokenCount: number;
  titleH1Mismatch: boolean;
  weakMetaDescriptionAlignment: boolean;
}
export interface RobotsPreviewControl {
  status: string;
  effectiveSnippet?: NullableString;
  effectiveMaxSnippet?: NullableString;
  effectiveMaxImagePreview?: NullableString;
  effectiveMaxVideoPreview?: NullableString;
  restrictiveSignals: string[];
  conflicts: RobotsSameTargetConflict[];
}
export interface ViewportControl {
  status: string;
  content?: NullableString;
  hasDeviceWidth: boolean;
  hasInitialScale: boolean;
  disablesZoom: boolean;
}
export interface FaviconControl {
  status: string;
  iconCount: number;
  rels: string[];
  links: IconLink[];
}
export interface HeadHygieneControl {
  status: string;
  duplicateHeadCounts: DuplicateHeadCounts;
  problematicFields: DuplicateFieldCount[];
}
export interface StructuredDataControl {
  status: string;
  totalJsonLdBlocks: number;
  validJsonLdBlocks: number;
  invalidJsonLdBlocks: number;
  emptyJsonLdBlocks: number;
  missingContextBlocks: number;
  missingTypeBlocks: number;
  blocks: StructuredDataBlock[];
}
export interface CanonicalTargetControl {
  status: string;
  targetUrl?: NullableString;
  finalUrl?: NullableString;
  redirectCount: number;
  reusedCurrentPageInspection: boolean;
  inspection?: null | UrlInspection;
  robotsControl?: null | RobotsControl;
}
export interface MetaRefreshControl {
  status: string;
  tagCount: number;
  immediateRedirectCount: number;
  timedRedirectCount: number;
  malformedCount: number;
  refreshOnlyCount: number;
  entries: MetaRefreshEntry[];
}
export interface CategoryScores {
  reachability: number;
  crawlability: number;
  indexability: number;
  contentVisibility: number;
  metadata: number;
  discovery: number;
}
export interface RawSummary {
  worker: 'seo-audit-worker';
  statusCode?: NullableInteger;
  contentType?: NullableString;
  wordCount?: number;
  /**
   * @minItems 1
   */
  capturePasses?: [EvidenceSource, ...EvidenceSource[]];
  sourceHtml?: SurfaceSummary;
  xRobotsTag?: XRobotsTag;
  robotsControl?: RobotsControl;
  canonicalControl?: CanonicalControl;
  canonicalSelfReferenceControl?: CanonicalSelfReferenceControl;
  canonicalTargetControl?: CanonicalTargetControl;
  metaRefreshControl?: MetaRefreshControl;
  alternateLanguageControl?: AlternateLanguageControl;
  linkDiscoveryControl?: LinkDiscoveryControl;
  internalLinkCoverageControl?: InternalLinkCoverageControl;
  titleControl?: TitleControl;
  metaDescriptionControl?: MetaDescriptionControl;
  headingControl?: HeadingControl;
  headingQualityControl?: HeadingQualityControl;
  bodyImageAltControl?: BodyImageAltControl;
  langControl?: LangControl;
  socialMetadataControl?: SocialMetadataControl;
  socialUrlControl?: SocialUrlControl;
  metadataAlignmentControl?: MetadataAlignmentControl;
  robotsPreviewControl?: RobotsPreviewControl;
  viewportControl?: ViewportControl;
  faviconControl?: FaviconControl;
  headHygieneControl?: HeadHygieneControl;
  structuredDataControl?: StructuredDataControl;
  robotsTxt?: RobotsTxt;
  redirectChain?: RedirectChain;
  indexabilityVerdict?: IndexabilityVerdict;
  renderedDom?: null | SurfaceSummary;
  renderComparison?: RenderComparison;
}
export interface SurfaceSummary {
  wordCount: number;
  sameOriginCrawlableLinkCount: number;
  nonCrawlableLinkCount: number;
  emptyAnchorTextCount: number;
  genericAnchorTextCount: number;
  metaRefreshTagCount: number;
  headingOutlineCount: number;
  headingHierarchySkipCount: number;
  emptyHeadingCount: number;
  repeatedHeadingCount: number;
  linkedImageCount: number;
  linkedImageMissingAltCount: number;
  bodyImageCount: number;
  eligibleBodyImageCount: number;
  bodyImageMissingAltCount: number;
  structuredDataKinds: string[];
}
export interface XRobotsTag {
  value?: NullableString;
  blocksIndexing: boolean;
}
export interface CanonicalSelfReferenceControl {
  status: string;
  expectsSelfReference: boolean;
  finalUrl?: NullableString;
  resolvedCanonicalUrl?: NullableString;
}
export interface IndexabilityVerdict {
  verdict: IndexabilityVerdictLabel;
  blockingSignals: string[];
  riskSignals: string[];
  unknownSignals: string[];
}
export interface RenderComparison {
  sourceOnlyCriticalIssues: number;
  renderedOnlySignals: number;
  mismatches: number;
  renderDependencyRisk: 'unknown' | 'low' | 'medium' | 'high';
}
export interface Signature {
  present: true;
  algorithm: 'HMAC-SHA256';
  value: string;
}
