package com.nabin.seogeo.project.service;

import com.nabin.seogeo.audit.domain.AccountAuditSummary;
import com.nabin.seogeo.audit.domain.AuditStatus;
import com.nabin.seogeo.audit.persistence.AuditRunEntity;
import com.nabin.seogeo.audit.persistence.AuditRunRepository;
import com.nabin.seogeo.audit.service.AuditPersistenceService;
import com.nabin.seogeo.project.domain.NormalizedUrl;
import com.nabin.seogeo.project.domain.ProjectSummary;
import com.nabin.seogeo.project.domain.ProjectTrackedUrlSummary;
import com.nabin.seogeo.project.persistence.AuditProjectLinkEntity;
import com.nabin.seogeo.project.persistence.AuditProjectLinkRepository;
import com.nabin.seogeo.project.persistence.AuditRunSummaryEntity;
import com.nabin.seogeo.project.persistence.AuditRunSummaryHighIssueEntity;
import com.nabin.seogeo.project.persistence.AuditRunSummaryHighIssueRepository;
import com.nabin.seogeo.project.persistence.AuditRunSummaryRepository;
import com.nabin.seogeo.project.persistence.ProjectEntity;
import com.nabin.seogeo.project.persistence.ProjectRepository;
import com.nabin.seogeo.project.persistence.ProjectTrackedUrlEntity;
import com.nabin.seogeo.project.persistence.ProjectTrackedUrlRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectTrackedUrlRepository projectTrackedUrlRepository;
    private final AuditProjectLinkRepository auditProjectLinkRepository;
    private final AuditRunRepository auditRunRepository;
    private final AuditRunSummaryRepository auditRunSummaryRepository;
    private final AuditRunSummaryHighIssueRepository auditRunSummaryHighIssueRepository;
    private final AuditPersistenceService auditPersistenceService;
    private final UrlNormalizationService urlNormalizationService;

    public ProjectService(
            ProjectRepository projectRepository,
            ProjectTrackedUrlRepository projectTrackedUrlRepository,
            AuditProjectLinkRepository auditProjectLinkRepository,
            AuditRunRepository auditRunRepository,
            AuditRunSummaryRepository auditRunSummaryRepository,
            AuditRunSummaryHighIssueRepository auditRunSummaryHighIssueRepository,
            AuditPersistenceService auditPersistenceService,
            UrlNormalizationService urlNormalizationService
    ) {
        this.projectRepository = projectRepository;
        this.projectTrackedUrlRepository = projectTrackedUrlRepository;
        this.auditProjectLinkRepository = auditProjectLinkRepository;
        this.auditRunRepository = auditRunRepository;
        this.auditRunSummaryRepository = auditRunSummaryRepository;
        this.auditRunSummaryHighIssueRepository = auditRunSummaryHighIssueRepository;
        this.auditPersistenceService = auditPersistenceService;
        this.urlNormalizationService = urlNormalizationService;
    }

    @Transactional(readOnly = true)
    public List<ProjectSummary> listProjects(UUID ownerUserId) {
        List<ProjectEntity> projects = projectRepository.findByOwnerUserIdOrderByIsDefaultDescCreatedAtAsc(ownerUserId);
        return buildSummaries(projects);
    }

    @Transactional(readOnly = true)
    public Optional<ProjectSummary> findProject(UUID ownerUserId, String slug) {
        return projectRepository.findByOwnerUserIdAndSlug(ownerUserId, slug)
                .map(project -> buildSummaries(List.of(project)).getFirst());
    }

    @Transactional
    public ProjectSummary createProject(
            UUID ownerUserId,
            String name,
            String description
    ) {
        OffsetDateTime now = OffsetDateTime.now();
        ProjectEntity entity = new ProjectEntity();
        entity.setId(UUID.randomUUID());
        entity.setOwnerUserId(ownerUserId);
        entity.setName(requireName(name));
        entity.setDescription(normalizeNullable(description));
        entity.setSlug(generateUniqueSlug(ownerUserId, name));
        entity.setDefault(false);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        projectRepository.save(entity);
        return buildSummaries(List.of(entity)).getFirst();
    }

    @Transactional
    public ProjectSummary ensureDefaultProject(UUID ownerUserId) {
        return buildSummaries(List.of(ensureDefaultProjectEntity(ownerUserId))).getFirst();
    }

    @Transactional
    public String resolveRequestedOrDefaultProjectSlug(UUID ownerUserId, String requestedSlug) {
        if (requestedSlug == null || requestedSlug.isBlank()) {
            return ensureDefaultProjectEntity(ownerUserId).getSlug();
        }
        return getOwnedProject(ownerUserId, requestedSlug).getSlug();
    }

    @Transactional
    public ProjectSummary updateProject(
            UUID ownerUserId,
            String slug,
            String name,
            String description
    ) {
        ProjectEntity project = getOwnedProject(ownerUserId, slug);
        project.setName(requireName(name));
        project.setDescription(normalizeNullable(description));
        project.setUpdatedAt(OffsetDateTime.now());
        projectRepository.save(project);
        return buildSummaries(List.of(project)).getFirst();
    }

    @Transactional(readOnly = true)
    public List<AccountAuditSummary> listOwnedAudits(UUID ownerUserId, String projectSlug) {
        Map<String, ProjectEntity> projectsBySlug = projectRepository.findByOwnerUserIdOrderByIsDefaultDescCreatedAtAsc(ownerUserId).stream()
                .collect(LinkedHashMap::new, (map, project) -> map.put(project.getSlug(), project), Map::putAll);

        UUID filteredProjectId = null;
        if (projectSlug != null && !projectSlug.isBlank()) {
            ProjectEntity project = projectsBySlug.get(projectSlug);
            if (project == null) {
                return List.of();
            }
            filteredProjectId = project.getId();
        }

        List<AuditRunEntity> runs = auditRunRepository.findByOwnerUserIdOrderByCreatedAtDesc(ownerUserId);
        if (runs.isEmpty()) {
            return List.of();
        }

        Map<String, AuditRunEntity> runsById = runs.stream()
                .collect(LinkedHashMap::new, (map, run) -> map.put(run.getJobId(), run), Map::putAll);
        List<AuditProjectLinkEntity> links = auditProjectLinkRepository.findAllById(runsById.keySet());
        Map<String, AuditProjectLinkEntity> linksByJobId = links.stream()
                .collect(LinkedHashMap::new, (map, link) -> map.put(link.getJobId(), link), Map::putAll);
        Map<UUID, ProjectEntity> projectsById = projectsBySlug.values().stream()
                .collect(LinkedHashMap::new, (map, project) -> map.put(project.getId(), project), Map::putAll);
        Map<UUID, ProjectTrackedUrlEntity> trackedUrlsById = projectTrackedUrlRepository.findAllById(
                        links.stream().map(AuditProjectLinkEntity::getTrackedUrlId).toList()
                ).stream()
                .collect(LinkedHashMap::new, (map, trackedUrl) -> map.put(trackedUrl.getId(), trackedUrl), Map::putAll);
        Map<String, AuditRunSummaryEntity> summariesByJobId = auditRunSummaryRepository.findAllById(runsById.keySet()).stream()
                .collect(LinkedHashMap::new, (map, summary) -> map.put(summary.getJobId(), summary), Map::putAll);

        List<AccountAuditSummary> response = new ArrayList<>();
        for (AuditRunEntity run : runs) {
            AuditProjectLinkEntity link = linksByJobId.get(run.getJobId());
            if (filteredProjectId != null && (link == null || !Objects.equals(link.getProjectId(), filteredProjectId))) {
                continue;
            }

            ProjectEntity project = link == null ? null : projectsById.get(link.getProjectId());
            ProjectTrackedUrlEntity trackedUrl = link == null ? null : trackedUrlsById.get(link.getTrackedUrlId());
            AuditRunSummaryEntity summary = summariesByJobId.get(run.getJobId());
            response.add(new AccountAuditSummary(
                    run.getJobId(),
                    run.getTargetUrl(),
                    run.getStatus(),
                    run.getCreatedAt(),
                    run.getCompletedAt(),
                    summary == null ? null : summary.getScore(),
                    project == null ? null : project.getSlug(),
                    project == null ? null : project.getName(),
                    trackedUrl == null ? null : trackedUrl.getDisplayUrl()
            ));
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<AccountAuditSummary> listProjectAudits(UUID ownerUserId, String slug, String trackedUrlFilter) {
        ProjectEntity project = getOwnedProject(ownerUserId, slug);
        List<ProjectTrackedUrlEntity> trackedUrls = projectTrackedUrlRepository.findByProjectIdOrderByCreatedAtAsc(project.getId());
        Map<UUID, ProjectTrackedUrlEntity> trackedUrlsById = trackedUrls.stream()
                .collect(LinkedHashMap::new, (map, trackedUrl) -> map.put(trackedUrl.getId(), trackedUrl), Map::putAll);

        UUID filteredTrackedUrlId = null;
        if (trackedUrlFilter != null && !trackedUrlFilter.isBlank()) {
            String normalizedTrackedUrl = urlNormalizationService.normalizeUrl(trackedUrlFilter).normalizedUrl();
            filteredTrackedUrlId = trackedUrls.stream()
                    .filter(item -> Objects.equals(item.getNormalizedUrl(), normalizedTrackedUrl))
                    .map(ProjectTrackedUrlEntity::getId)
                    .findFirst()
                    .orElse(null);
            if (filteredTrackedUrlId == null) {
                return List.of();
            }
        }
        UUID effectiveTrackedUrlId = filteredTrackedUrlId;

        List<AuditProjectLinkEntity> links = auditProjectLinkRepository.findByProjectIdOrderByLinkedAtDesc(project.getId());
        List<String> jobIds = links.stream()
                .filter(link -> effectiveTrackedUrlId == null || Objects.equals(link.getTrackedUrlId(), effectiveTrackedUrlId))
                .map(AuditProjectLinkEntity::getJobId)
                .toList();
        Map<String, AuditRunEntity> runsById = auditRunRepository.findByJobIdIn(jobIds).stream()
                .collect(LinkedHashMap::new, (map, run) -> map.put(run.getJobId(), run), Map::putAll);
        Map<String, AuditRunSummaryEntity> summariesByJobId = auditRunSummaryRepository.findAllById(jobIds).stream()
                .collect(LinkedHashMap::new, (map, summary) -> map.put(summary.getJobId(), summary), Map::putAll);

        List<AccountAuditSummary> response = new ArrayList<>();
        for (AuditProjectLinkEntity link : links) {
            if (effectiveTrackedUrlId != null && !Objects.equals(link.getTrackedUrlId(), effectiveTrackedUrlId)) {
                continue;
            }
            AuditRunEntity run = runsById.get(link.getJobId());
            if (run == null) {
                continue;
            }
            AuditRunSummaryEntity summary = summariesByJobId.get(run.getJobId());
            ProjectTrackedUrlEntity trackedUrl = trackedUrlsById.get(link.getTrackedUrlId());
            response.add(new AccountAuditSummary(
                    run.getJobId(),
                    run.getTargetUrl(),
                    run.getStatus(),
                    run.getCreatedAt(),
                    run.getCompletedAt(),
                    summary == null ? null : summary.getScore(),
                    project.getSlug(),
                    project.getName(),
                    trackedUrl == null ? null : trackedUrl.getDisplayUrl()
            ));
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<ProjectTrackedUrlSummary> listTrackedUrls(UUID ownerUserId, String slug) {
        ProjectEntity project = getOwnedProject(ownerUserId, slug);
        List<ProjectTrackedUrlEntity> trackedUrls = projectTrackedUrlRepository.findByProjectIdOrderByCreatedAtAsc(project.getId());
        if (trackedUrls.isEmpty()) {
            return List.of();
        }

        Map<UUID, List<AuditProjectLinkEntity>> linksByTrackedUrlId = auditProjectLinkRepository.findByTrackedUrlIdIn(
                        trackedUrls.stream().map(ProjectTrackedUrlEntity::getId).toList()
                ).stream()
                .collect(LinkedHashMap::new, (map, link) -> map.computeIfAbsent(link.getTrackedUrlId(), ignored -> new ArrayList<>()).add(link), Map::putAll);

        List<String> jobIds = linksByTrackedUrlId.values().stream().flatMap(Collection::stream).map(AuditProjectLinkEntity::getJobId).toList();
        Map<String, AuditRunEntity> runsById = auditRunRepository.findByJobIdIn(jobIds).stream()
                .collect(LinkedHashMap::new, (map, run) -> map.put(run.getJobId(), run), Map::putAll);
        Map<String, AuditRunSummaryEntity> summariesByJobId = auditRunSummaryRepository.findAllById(jobIds).stream()
                .collect(LinkedHashMap::new, (map, summary) -> map.put(summary.getJobId(), summary), Map::putAll);

        List<ProjectTrackedUrlSummary> response = new ArrayList<>();
        for (ProjectTrackedUrlEntity trackedUrl : trackedUrls) {
            List<AuditProjectLinkEntity> links = linksByTrackedUrlId.getOrDefault(trackedUrl.getId(), List.of());
            AuditRunEntity latestRun = links.stream()
                    .map(link -> runsById.get(link.getJobId()))
                    .filter(Objects::nonNull)
                    .max(Comparator.comparing(AuditRunEntity::getCreatedAt))
                    .orElse(null);
            AuditRunEntity latestVerifiedRun = latestVerifiedRun(links, runsById);
            AuditRunSummaryEntity currentSummary = latestVerifiedRun == null ? null : summariesByJobId.get(latestVerifiedRun.getJobId());
            response.add(new ProjectTrackedUrlSummary(
                    trackedUrl.getId(),
                    trackedUrl.getDisplayUrl(),
                    trackedUrl.getNormalizedUrl(),
                    trackedUrl.getNormalizedHost(),
                    trackedUrl.getNormalizedPath(),
                    links.size(),
                    latestRun == null ? null : latestRun.getCreatedAt(),
                    latestRun == null ? null : latestRun.getStatus().name(),
                    latestVerifiedRun == null ? null : latestVerifiedRun.getCompletedAt(),
                    currentSummary == null ? null : currentSummary.getScore(),
                    currentSummary == null ? 0 : currentSummary.getHighIssueCount()
            ));
        }
        return response;
    }

    @Transactional
    public AccountAuditSummary attachAuditToProject(UUID ownerUserId, String slug, String jobId) {
        ProjectEntity project = getOwnedProject(ownerUserId, slug);
        AuditRunEntity run = auditPersistenceService.findVisibleRun(jobId, ownerUserId)
                .filter(item -> Objects.equals(item.getOwnerUserId(), ownerUserId))
                .orElseThrow(() -> new ProjectNotFoundException(slug));

        NormalizedUrl normalizedUrl = new NormalizedUrl(
                run.getNormalizedUrl() == null ? urlNormalizationService.normalizeUrl(run.getTargetUrl()).normalizedUrl() : run.getNormalizedUrl(),
                run.getNormalizedHost() == null ? urlNormalizationService.normalizeUrl(run.getTargetUrl()).normalizedHost() : run.getNormalizedHost(),
                run.getNormalizedPath() == null ? urlNormalizationService.normalizeUrl(run.getTargetUrl()).normalizedPath() : run.getNormalizedPath(),
                urlNormalizationService.normalizeUrl(run.getTargetUrl()).origin()
        );

        OffsetDateTime now = OffsetDateTime.now();
        ProjectTrackedUrlEntity trackedUrl = projectTrackedUrlRepository.findByProjectIdAndNormalizedUrl(project.getId(), normalizedUrl.normalizedUrl())
                .orElseGet(() -> {
                    ProjectTrackedUrlEntity created = new ProjectTrackedUrlEntity();
                    created.setId(UUID.randomUUID());
                    created.setProjectId(project.getId());
                    created.setNormalizedUrl(normalizedUrl.normalizedUrl());
                    created.setNormalizedHost(normalizedUrl.normalizedHost());
                    created.setNormalizedPath(normalizedUrl.normalizedPath());
                    created.setDisplayUrl(run.getTargetUrl());
                    created.setCreatedAt(now);
                    created.setUpdatedAt(now);
                    return created;
                });
        trackedUrl.setDisplayUrl(run.getTargetUrl());
        trackedUrl.setUpdatedAt(now);
        projectTrackedUrlRepository.save(trackedUrl);

        AuditProjectLinkEntity link = auditProjectLinkRepository.findById(jobId).orElseGet(() -> {
            AuditProjectLinkEntity created = new AuditProjectLinkEntity();
            created.setJobId(jobId);
            created.setLinkedAt(now);
            created.setLinkedByUserId(ownerUserId);
            return created;
        });
        UUID previousTrackedUrlId = link.getTrackedUrlId();
        link.setProjectId(project.getId());
        link.setTrackedUrlId(trackedUrl.getId());
        link.setLinkedAt(now);
        link.setLinkedByUserId(ownerUserId);
        auditProjectLinkRepository.save(link);
        if (previousTrackedUrlId != null && !Objects.equals(previousTrackedUrlId, trackedUrl.getId())) {
            cleanupTrackedUrlIfEmpty(previousTrackedUrlId);
        }

        AuditRunSummaryEntity summary = auditRunSummaryRepository.findById(jobId).orElse(null);
        return new AccountAuditSummary(
                run.getJobId(),
                run.getTargetUrl(),
                run.getStatus(),
                run.getCreatedAt(),
                run.getCompletedAt(),
                summary == null ? null : summary.getScore(),
                project.getSlug(),
                project.getName(),
                trackedUrl.getDisplayUrl()
        );
    }

    @Transactional
    public void detachAuditFromProject(UUID ownerUserId, String slug, String jobId) {
        ProjectEntity project = getOwnedProject(ownerUserId, slug);
        AuditProjectLinkEntity link = auditProjectLinkRepository.findById(jobId).orElse(null);
        if (link == null || !Objects.equals(link.getProjectId(), project.getId())) {
            return;
        }

        AuditRunEntity run = auditPersistenceService.findVisibleRun(jobId, ownerUserId)
                .filter(item -> Objects.equals(item.getOwnerUserId(), ownerUserId))
                .orElseThrow(() -> new ProjectNotFoundException(slug));
        if (!run.getStatus().isTerminal()) {
            throw new AuditDeletionNotAllowedException(jobId);
        }

        UUID trackedUrlId = link.getTrackedUrlId();
        auditProjectLinkRepository.delete(link);
        auditPersistenceService.deleteRun(jobId);
        cleanupTrackedUrlIfEmpty(trackedUrlId);
    }

    @Transactional(readOnly = true)
    public List<ProjectEntity> listOwnedProjectEntities(UUID ownerUserId) {
        return projectRepository.findByOwnerUserIdOrderByIsDefaultDescCreatedAtAsc(ownerUserId);
    }

    private ProjectEntity getOwnedProject(UUID ownerUserId, String slug) {
        return projectRepository.findByOwnerUserIdAndSlug(ownerUserId, slug)
                .orElseThrow(() -> new ProjectNotFoundException(slug));
    }

    private List<ProjectSummary> buildSummaries(List<ProjectEntity> projects) {
        if (projects.isEmpty()) {
            return List.of();
        }

        Map<UUID, ProjectEntity> projectsById = projects.stream()
                .collect(LinkedHashMap::new, (map, project) -> map.put(project.getId(), project), Map::putAll);
        List<ProjectTrackedUrlEntity> trackedUrls = projectTrackedUrlRepository.findByProjectIdIn(projectsById.keySet());
        Map<UUID, List<ProjectTrackedUrlEntity>> trackedUrlsByProjectId = trackedUrls.stream()
                .collect(LinkedHashMap::new, (map, trackedUrl) -> map.computeIfAbsent(trackedUrl.getProjectId(), ignored -> new ArrayList<>()).add(trackedUrl), Map::putAll);
        List<AuditProjectLinkEntity> links = auditProjectLinkRepository.findByProjectIdIn(projectsById.keySet());
        Map<UUID, List<AuditProjectLinkEntity>> linksByProjectId = links.stream()
                .collect(LinkedHashMap::new, (map, link) -> map.computeIfAbsent(link.getProjectId(), ignored -> new ArrayList<>()).add(link), Map::putAll);
        Map<UUID, List<AuditProjectLinkEntity>> linksByTrackedUrlId = links.stream()
                .collect(LinkedHashMap::new, (map, link) -> map.computeIfAbsent(link.getTrackedUrlId(), ignored -> new ArrayList<>()).add(link), Map::putAll);
        List<String> jobIds = links.stream().map(AuditProjectLinkEntity::getJobId).toList();
        Map<String, AuditRunEntity> runsById = auditRunRepository.findByJobIdIn(jobIds).stream()
                .collect(LinkedHashMap::new, (map, run) -> map.put(run.getJobId(), run), Map::putAll);
        Map<String, AuditRunSummaryEntity> summariesByJobId = auditRunSummaryRepository.findAllById(jobIds).stream()
                .collect(LinkedHashMap::new, (map, summary) -> map.put(summary.getJobId(), summary), Map::putAll);
        Map<String, List<AuditRunSummaryHighIssueEntity>> highIssuesByJobId = auditRunSummaryHighIssueRepository.findByJobIdIn(jobIds).stream()
                .collect(LinkedHashMap::new, (map, issue) -> map.computeIfAbsent(issue.getJobId(), ignored -> new ArrayList<>()).add(issue), Map::putAll);

        List<ProjectSummary> summaries = new ArrayList<>();
        for (ProjectEntity project : projects) {
            List<ProjectTrackedUrlEntity> projectTrackedUrls = trackedUrlsByProjectId.getOrDefault(project.getId(), List.of());
            List<AuditProjectLinkEntity> projectLinks = linksByProjectId.getOrDefault(project.getId(), List.of());
            OffsetDateTime latestAuditAt = projectLinks.stream()
                    .map(link -> runsById.get(link.getJobId()))
                    .filter(Objects::nonNull)
                    .map(AuditRunEntity::getCreatedAt)
                    .max(Comparator.naturalOrder())
                    .orElse(null);
            int activeAuditCount = (int) projectLinks.stream()
                    .map(link -> runsById.get(link.getJobId()))
                    .filter(Objects::nonNull)
                    .filter(run -> run.getStatus() == AuditStatus.QUEUED
                            || run.getStatus() == AuditStatus.STREAMING
                            || run.getStatus() == AuditStatus.COMPLETE)
                    .count();

            int verifiedUrlCount = 0;
            int totalCriticalIssueCount = 0;
            int affectedUrlCount = 0;
            int scoreSum = 0;
            Map<String, Integer> issueCounts = new HashMap<>();
            Map<String, AuditRunSummaryHighIssueEntity> issueExamples = new HashMap<>();
            int improvedUrlCount = 0;
            int declinedUrlCount = 0;
            int flatUrlCount = 0;
            int netScoreDelta = 0;

            for (ProjectTrackedUrlEntity trackedUrl : projectTrackedUrls) {
                List<AuditProjectLinkEntity> urlLinks = linksByTrackedUrlId.getOrDefault(trackedUrl.getId(), List.of());
                List<AuditRunEntity> verifiedRuns = urlLinks.stream()
                        .map(link -> runsById.get(link.getJobId()))
                        .filter(Objects::nonNull)
                        .filter(run -> run.getStatus() == AuditStatus.VERIFIED)
                        .sorted(Comparator.comparing(AuditRunEntity::getCompletedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed()
                                .thenComparing(AuditRunEntity::getCreatedAt, Comparator.reverseOrder()))
                        .toList();
                if (verifiedRuns.isEmpty()) {
                    continue;
                }

                verifiedUrlCount++;
                AuditRunEntity latestVerifiedRun = verifiedRuns.getFirst();
                AuditRunSummaryEntity latestSummary = summariesByJobId.get(latestVerifiedRun.getJobId());
                if (latestSummary != null) {
                    scoreSum += latestSummary.getScore();
                    totalCriticalIssueCount += latestSummary.getHighIssueCount();
                    if (latestSummary.getHighIssueCount() > 0) {
                        affectedUrlCount++;
                    }
                }

                for (AuditRunSummaryHighIssueEntity issue : highIssuesByJobId.getOrDefault(latestVerifiedRun.getJobId(), List.of())) {
                    issueCounts.merge(issue.getIssueKey(), 1, Integer::sum);
                    issueExamples.putIfAbsent(issue.getIssueKey(), issue);
                }

                if (verifiedRuns.size() > 1) {
                    AuditRunSummaryEntity current = summariesByJobId.get(verifiedRuns.get(0).getJobId());
                    AuditRunSummaryEntity previous = summariesByJobId.get(verifiedRuns.get(1).getJobId());
                    if (current != null && previous != null) {
                        int delta = current.getScore() - previous.getScore();
                        netScoreDelta += delta;
                        if (delta > 0) {
                            improvedUrlCount++;
                        } else if (delta < 0) {
                            declinedUrlCount++;
                        } else {
                            flatUrlCount++;
                        }
                    }
                }
            }

            Integer projectScore = verifiedUrlCount == 0 ? null : Math.round((float) scoreSum / verifiedUrlCount);
            ProjectSummary.ScoreTrend scoreTrend = verifiedUrlCount < 2 && improvedUrlCount == 0 && declinedUrlCount == 0 && flatUrlCount == 0
                    ? null
                    : new ProjectSummary.ScoreTrend(improvedUrlCount, declinedUrlCount, flatUrlCount, netScoreDelta);

            List<ProjectSummary.ProjectTopIssue> topIssues = issueCounts.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed().thenComparing(Map.Entry::getKey))
                    .limit(3)
                    .map(entry -> {
                        AuditRunSummaryHighIssueEntity issue = issueExamples.get(entry.getKey());
                        return new ProjectSummary.ProjectTopIssue(
                                entry.getKey(),
                                issue == null ? entry.getKey() : issue.getIssueLabel(),
                                issue == null ? "high" : issue.getSeverity(),
                                entry.getValue(),
                                issue == null ? null : issue.getIssueInstruction()
                        );
                    })
                    .toList();

            summaries.add(new ProjectSummary(
                    project.getId(),
                    project.getSlug(),
                    project.isDefault(),
                    project.getName(),
                    project.getDescription(),
                    project.getCreatedAt(),
                    project.getUpdatedAt(),
                    projectTrackedUrls.size(),
                    verifiedUrlCount,
                    projectLinks.size(),
                    activeAuditCount,
                    latestAuditAt,
                    projectScore,
                    scoreTrend,
                    totalCriticalIssueCount,
                    affectedUrlCount,
                    topIssues
            ));
        }

        return summaries;
    }

    private AuditRunEntity latestVerifiedRun(List<AuditProjectLinkEntity> links, Map<String, AuditRunEntity> runsById) {
        return links.stream()
                .map(link -> runsById.get(link.getJobId()))
                .filter(Objects::nonNull)
                .filter(run -> run.getStatus() == AuditStatus.VERIFIED)
                .max(Comparator.comparing(AuditRunEntity::getCompletedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(AuditRunEntity::getCreatedAt))
                .orElse(null);
    }

    private ProjectEntity ensureDefaultProjectEntity(UUID ownerUserId) {
        return projectRepository.findByOwnerUserIdAndIsDefaultTrue(ownerUserId)
                .orElseGet(() -> {
                    OffsetDateTime now = OffsetDateTime.now();
                    ProjectEntity entity = new ProjectEntity();
                    entity.setId(UUID.randomUUID());
                    entity.setOwnerUserId(ownerUserId);
                    entity.setSlug(generateUniqueSlug(ownerUserId, "Workspace"));
                    entity.setName("Workspace");
                    entity.setDescription(null);
                    entity.setDefault(true);
                    entity.setCreatedAt(now);
                    entity.setUpdatedAt(now);
                    return projectRepository.save(entity);
                });
    }

    private void cleanupTrackedUrlIfEmpty(UUID trackedUrlId) {
        if (trackedUrlId == null) {
            return;
        }
        if (auditProjectLinkRepository.findByTrackedUrlIdOrderByLinkedAtDesc(trackedUrlId).isEmpty()) {
            projectTrackedUrlRepository.deleteById(trackedUrlId);
        }
    }

    private String generateUniqueSlug(UUID ownerUserId, String name) {
        String baseSlug = slugify(requireName(name));
        String candidate = baseSlug;
        int suffix = 2;
        while (projectRepository.existsByOwnerUserIdAndSlug(ownerUserId, candidate)) {
            candidate = baseSlug + "-" + suffix;
            suffix++;
        }
        return candidate;
    }

    private String slugify(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return normalized.isBlank() ? "project" : normalized;
    }

    private String requireName(String name) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isBlank()) {
            throw new IllegalArgumentException("Project name must not be blank.");
        }
        return trimmed;
    }

    private String normalizeNullable(String value) {
        String trimmed = value == null ? null : value.trim();
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }

    public static final class ProjectNotFoundException extends RuntimeException {
        public ProjectNotFoundException(String slug) {
            super("Project not found: " + slug);
        }
    }

    public static final class AuditDeletionNotAllowedException extends RuntimeException {
        public AuditDeletionNotAllowedException(String jobId) {
            super("Audit must be finished before it can be deleted: " + jobId);
        }
    }
}
