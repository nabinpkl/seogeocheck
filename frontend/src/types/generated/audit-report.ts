/**
 * This file is generated from JSON Schema.
 * Do not edit it by hand.
 */

export interface AuditReport {
  jobId: string;
  status: 'QUEUED' | 'STREAMING' | 'COMPLETE' | 'FAILED' | 'VERIFIED';
  generatedAt: string;
  targetUrl: string;
  reportType: 'SEO_SIGNALS_SIGNED_AUDIT';
  indexabilityVerdict: 'Blocked' | 'Unknown' | 'At Risk' | 'Indexable';
  summary: ReportSummary;
  checks: ReportCheck[];
  scoring: AuditScoring;
  auditDiagnostics: AuditDiagnostics;
  signature: Signature;
}
export interface ReportSummary {
  score: number;
  status: 'QUEUED' | 'STREAMING' | 'COMPLETE' | 'FAILED' | 'VERIFIED';
  indexabilityVerdict: 'Blocked' | 'Unknown' | 'At Risk' | 'Indexable';
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
  status: 'issue' | 'passed' | 'not_applicable' | 'system_error';
  category:
    | 'reachability'
    | 'crawlability'
    | 'indexability'
    | 'sitewide'
    | 'contentVisibility'
    | 'metadata'
    | 'discovery';
  severity?: null | ('high' | 'medium' | 'low');
  instruction?: string | null;
  detail?: string | null;
  selector?: string | null;
  metric?: string | null;
  metadata?: ReportCheckMetadata;
}
export interface ReportCheckMetadata {
  evidenceSource?: 'source_html' | 'rendered_dom' | 'surface_comparison';
  problemFamily?:
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
  reasonCode?: 'missing_prerequisite' | 'invalid_prerequisite' | 'upstream_fetch_failed' | 'timeout';
  blockedBy?: string[];
  retryable?: boolean;
  length?: number;
  minLength?: number;
  maxLength?: number;
  title?: string;
  content?: string | null;
  contentType?: string | null;
  value?: string | null;
  canonicalValue?: string | null;
  finalUrl?: string | null;
  resolvedCanonicalUrl?: string | null;
  targetUrl?: string | null;
  status?: string | null;
  statusCode?: number | null;
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
  sourceRobotsContent?: string | null;
  renderedRobotsContent?: string | null;
  sourceH1Count?: number;
  renderedH1Count?: number;
  effectiveIndexing?: string | null;
  effectiveFollowing?: string | null;
  effectiveTarget?: string | null;
  effectiveSnippet?: string | null;
  effectiveArchive?: string | null;
  effectiveTranslate?: string | null;
  effectiveMaxSnippet?: string | null;
  effectiveMaxImagePreview?: string | null;
  effectiveMaxVideoPreview?: string | null;
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
  firstH1Text?: string | null;
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
  soft404Control?: Soft404Control;
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
  rawValue?: string | null;
  status: string;
  delaySeconds: number | null;
  targetUrl?: string | null;
  resolvedTargetUrl?: string | null;
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
  title?: string | null;
  description?: string | null;
  type?: string | null;
  url?: string | null;
  image?: string | null;
}
export interface TwitterFieldValues {
  card?: string | null;
  title?: string | null;
  description?: string | null;
  image?: string | null;
}
export interface SocialFieldDuplicate {
  field: string;
  count: number;
}
export interface SocialUrlField {
  field: string;
  rawValue: string;
  status: string;
  resolvedUrl?: string | null;
}
export interface IconLink {
  href?: string | null;
  rel?: string | null;
  sizes?: string | null;
  type?: string | null;
}
export interface HeadingTransition {
  fromLevel: number;
  toLevel: number;
  expectedNextLevel: number;
  headingText?: string | null;
}
export interface HeadingRepeat {
  text?: string | null;
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
export interface CanonicalControl {
  status: string;
  candidates: CanonicalCandidate[];
  uniqueTargetCount: number;
  uniqueTargets: string[];
  htmlCount: number;
  headerCount: number;
  invalidCandidates: CanonicalCandidate[];
  resolvedCanonicalUrl?: string | null;
  consistency: string;
}
export interface CanonicalCandidate {
  href?: string | null;
  rel?: string | null;
  hreflang?: string | null;
  media?: string | null;
  type?: string | null;
  surface: 'html' | 'http_header';
  status: string;
  resolvedUrl: string | null;
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
  href?: string | null;
  rel?: string | null;
  hreflang?: string | null;
  media?: string | null;
  type?: string | null;
  surface: 'html' | 'http_header';
  status: string;
  resolvedUrl: string | null;
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
  href?: string | null;
  text?: string | null;
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
  src?: string | null;
  alt?: string | null;
}
export interface LangControl {
  status: string;
  value?: string | null;
  canonicalValue?: string | null;
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
  firstH1Text?: string | null;
  titleSharedTokenCount: number;
  metaDescriptionSharedTokenCount: number;
  titleH1Mismatch: boolean;
  weakMetaDescriptionAlignment: boolean;
}
export interface RobotsPreviewControl {
  status: string;
  effectiveSnippet?: string | null;
  effectiveMaxSnippet?: string | null;
  effectiveMaxImagePreview?: string | null;
  effectiveMaxVideoPreview?: string | null;
  restrictiveSignals: string[];
  conflicts: RobotsSameTargetConflict[];
}
export interface ViewportControl {
  status: string;
  content?: string | null;
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
export interface Soft404Control {
  status: 'not_applicable' | 'clear' | 'suspected' | 'likely';
  wordCount: number;
  title?: string | null;
  firstH1Text?: string | null;
  matchedPhrases: string[];
  titleLooksLikeError: boolean;
  headingLooksLikeError: boolean;
  metaDescriptionLooksLikeError: boolean;
  thinContent: boolean;
  missingPrimarySignals: boolean;
  canonicalContradicts: boolean;
  signalCount: number;
}
export interface CanonicalTargetControl {
  status: string;
  targetUrl?: string | null;
  finalUrl?: string | null;
  resolvedCanonicalUrl?: string | null;
  redirectCount: number;
  reusedCurrentPageInspection: boolean;
  inspection?: null | UrlInspection;
  robotsControl?: null | RobotsControl;
}
export interface UrlInspection {
  inspectedUrl?: string | null;
  status: string;
  finalUrl?: string | null;
  statusCode?: number | null;
  contentType?: string | null;
  isReachable: boolean;
  isHtmlResponse: boolean;
  metaRobotsTags: string[];
  googlebotRobotsTags: string[];
  xRobotsTag?: string | null;
  xRobotsTagHeaders: string[];
  headerCanonicalLinks: LinkAnnotation[];
  headerAlternateLinks: LinkAnnotation[];
  redirectChain: RedirectChain;
  redirectCount: number;
  robotsTxt: RobotsTxt;
  reusedCurrentPageInspection: boolean;
}
export interface LinkAnnotation {
  href?: string | null;
  rel?: string | null;
  hreflang?: string | null;
  media?: string | null;
  type?: string | null;
}
export interface RedirectChain {
  status: string;
  totalRedirects: number;
  finalUrlChanged: boolean;
  finalUrl?: string | null;
  chain: RedirectStep[];
  error?: string | null;
}
export interface RedirectStep {
  url: string;
  statusCode?: number | null;
  location?: string | null;
}
export interface RobotsTxt {
  status: string;
  allowsCrawl?: boolean | null;
  evaluatedUserAgent?: string | null;
  matchedDirective?: string | null;
  matchedPattern?: string | null;
  fetchStatusCode?: number | null;
  url?: string | null;
  finalUrl?: string | null;
  error?: string | null;
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
  effectiveIndexing?: string | null;
  effectiveFollowing?: string | null;
  effectiveSnippet?: string | null;
  effectiveArchive?: string | null;
  effectiveTranslate?: string | null;
  effectiveMaxSnippet?: string | null;
  effectiveMaxImagePreview?: string | null;
  effectiveMaxVideoPreview?: string | null;
  effectiveTarget?: string | null;
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
  indexing?: string | null;
  following?: string | null;
  snippet?: string | null;
  archive?: string | null;
  translate?: string | null;
  maxSnippet?: string | null;
  maxImagePreview?: string | null;
  maxVideoPreview?: string | null;
}
export interface MetaRefreshControl {
  status: string;
  tagCount: number;
  immediateRedirectCount: number;
  timedRedirectCount: number;
  malformedCount: number;
  refreshOnlyCount: number;
  redirectCount?: number;
  entries: MetaRefreshEntry[];
}
export interface AuditScoring {
  model: 'weighted_rule_scoring';
  overall: AuditScoringSummary;
  categories: AuditScoringCategories;
  rules: AuditScoringRuleBreakdown[];
}
export interface AuditScoringSummary {
  score: number;
  confidence: number;
  earnedWeight: number;
  availableWeight: number;
  totalPossibleWeight: number;
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
  earnedWeight: number;
  availableWeight: number;
  totalPossibleWeight: number;
  categoryWeight: number;
}
export interface AuditScoringRuleBreakdown {
  ruleId: string;
  categoryId:
    | 'reachability'
    | 'crawlability'
    | 'indexability'
    | 'sitewide'
    | 'contentVisibility'
    | 'metadata'
    | 'discovery';
  status: 'issue' | 'passed' | 'not_applicable' | 'system_error';
  severity?: null | ('high' | 'medium' | 'low');
  ruleWeight: number;
  earnedWeight: number;
  includedInScore: boolean;
  exclusionReason?: null | ('not_applicable' | 'system_error');
  scoreImpact: number;
}
export interface AuditDiagnostics {
  capture: AuditDiagnosticsCapture;
  surfaces: AuditDiagnosticsSurfaces;
  controls: AuditDiagnosticsControls;
  sitewide?: null | SitewideSummary;
  analysis: AuditDiagnosticsAnalysis;
}
export interface AuditDiagnosticsCapture {
  worker: 'seo-audit-worker';
  statusCode?: number | null;
  contentType?: string | null;
  /**
   * @minItems 1
   */
  capturePasses: [
    'source_html' | 'rendered_dom' | 'surface_comparison',
    ...('source_html' | 'rendered_dom' | 'surface_comparison')[]
  ];
}
export interface AuditDiagnosticsSurfaces {
  sourceHtml: SurfaceSummary;
  renderedDom?: null | SurfaceSummary;
  renderComparison: RenderComparison;
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
export interface RenderComparison {
  sourceOnlyCriticalIssues: number;
  renderedOnlySignals: number;
  mismatches: number;
  renderDependencyRisk: 'unknown' | 'low' | 'medium' | 'high';
}
export interface AuditDiagnosticsControls {
  xRobotsTag: XRobotsTag;
  robotsControl: RobotsControl;
  canonicalControl: CanonicalControl;
  canonicalSelfReferenceControl: CanonicalSelfReferenceControl;
  canonicalTargetControl: CanonicalTargetControl;
  metaRefreshControl: MetaRefreshControl;
  alternateLanguageControl: AlternateLanguageControl;
  linkDiscoveryControl: LinkDiscoveryControl;
  internalLinkCoverageControl: InternalLinkCoverageControl;
  titleControl: TitleControl;
  metaDescriptionControl: MetaDescriptionControl;
  headingControl: HeadingControl;
  headingQualityControl: HeadingQualityControl;
  bodyImageAltControl: BodyImageAltControl;
  soft404Control: Soft404Control;
  langControl: LangControl;
  socialMetadataControl: SocialMetadataControl;
  socialUrlControl: SocialUrlControl;
  metadataAlignmentControl: MetadataAlignmentControl;
  robotsPreviewControl: RobotsPreviewControl;
  viewportControl: ViewportControl;
  faviconControl: FaviconControl;
  headHygieneControl: HeadHygieneControl;
  structuredDataControl: StructuredDataControl;
  robotsTxt: RobotsTxt;
  redirectChain: RedirectChain;
}
export interface XRobotsTag {
  value?: string | null;
  blocksIndexing: boolean;
}
export interface CanonicalSelfReferenceControl {
  status: string;
  expectsSelfReference: boolean;
  finalUrl?: string | null;
  resolvedCanonicalUrl?: string | null;
}
export interface SitewideSummary {
  siteRootUrl: string;
  preferredOrigin?: string | null;
  hostVariants: SitewideHostVariant[];
  robotsTxt: SitewideRobotsTxt;
  sitemap: SitewideSitemap;
  sampledUrls: SitewideSampledUrl[];
  sampleCoverage: SitewideSampleCoverage;
  sitemapSampleHealth: SitewideSitemapSampleHealth;
  discoveryAlignment: SitewideDiscoveryAlignment;
}
export interface SitewideHostVariant {
  requestedUrl: string;
  finalUrl?: string | null;
  finalOrigin?: string | null;
  status: string;
  statusCode?: number | null;
  redirectCount: number;
  isReachable: boolean;
  isHtmlResponse: boolean;
  robotsTxtAllowsCrawl?: boolean | null;
  effectiveIndexing?: string | null;
  error?: string | null;
}
export interface SitewideRobotsTxt {
  status: string;
  allowsCrawl?: boolean | null;
  evaluatedUserAgent?: string | null;
  matchedDirective?: string | null;
  matchedPattern?: string | null;
  fetchStatusCode?: number | null;
  url?: string | null;
  finalUrl?: string | null;
  error?: string | null;
  declaredSitemapUrls: string[];
}
export interface SitewideSitemap {
  status: string;
  discoveryMethod: 'robots_txt' | 'fallback' | 'none';
  declaredSitemapUrls: string[];
  fallbackSitemapUrl?: string | null;
  processedSitemapCount: number;
  discoveredUrlCount: number;
  sameOriginUrlCount: number;
  fetchedSitemaps: SitewideFetchedSitemap[];
  discoveredUrls: string[];
}
export interface SitewideFetchedSitemap {
  url: string;
  finalUrl?: string | null;
  statusCode?: number | null;
  contentType?: string | null;
  status: string;
  kind?: string | null;
  discoveredUrlCount: number;
  sameOriginUrlCount: number;
  error?: string | null;
}
export interface SitewideSampledUrl {
  url: string;
  source: 'site_root' | 'current_page' | 'sitemap' | 'homepage_link';
  finalUrl?: string | null;
  status: string;
  statusCode?: number | null;
  redirectCount: number;
  isReachable: boolean;
  isHtmlResponse: boolean;
  robotsTxtAllowsCrawl?: boolean | null;
  effectiveIndexing?: string | null;
  hasBlockingNoindex?: boolean;
  indexable: boolean;
  hasTitle: boolean;
  hasMetaDescription: boolean;
  hasValidCanonical: boolean;
  resolvedCanonicalUrl?: string | null;
  canonicalMatchesFinalUrl?: boolean | null;
}
export interface SitewideSampleCoverage {
  sampledUrlCount: number;
  indexableUrlCount: number;
  titleCoverageCount: number;
  metaDescriptionCoverageCount: number;
  canonicalCoverageCount: number;
  minimumPassingRatio: number;
  indexableCoverageRatio: number;
  titleCoverageRatio: number;
  metaDescriptionCoverageRatio: number;
  canonicalCoverageRatio: number;
}
export interface SitewideSitemapSampleHealth {
  sampledSitemapUrlCount: number;
  healthyUrlCount: number;
  brokenUrlCount: number;
  redirectedUrlCount: number;
  noindexUrlCount: number;
  nonCanonicalUrlCount: number;
  issueUrls: SitewideSitemapSampleIssue[];
}
export interface SitewideSitemapSampleIssue {
  url: string;
  issueTypes: ('broken' | 'redirected' | 'noindex' | 'non_canonical')[];
}
export interface SitewideDiscoveryAlignment {
  sampledSitemapUrlCount: number;
  sampledDiscoveryUrlCount: number;
  alignedUrlCount: number;
  sitemapUrlsMissingInternalDiscovery: string[];
  internalUrlsMissingFromSitemap: string[];
}
export interface AuditDiagnosticsAnalysis {
  indexabilitySignals: IndexabilitySignals;
}
export interface IndexabilitySignals {
  blockingSignals: string[];
  riskSignals: string[];
  unknownSignals: string[];
}
export interface Signature {
  present: true;
  algorithm: 'HMAC-SHA256';
  value: string;
}
