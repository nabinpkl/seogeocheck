package com.nabin.seogeo.audit.service;

import com.nabin.seogeo.audit.contract.internal.generated.AuditReportSchema;
import com.nabin.seogeo.audit.contract.internal.generated.ReportCheck;
import com.nabin.seogeo.audit.contract.consumer.generated.AuditScoring;
import com.nabin.seogeo.audit.contract.consumer.generated.AuditScoringCategories;
import com.nabin.seogeo.audit.contract.consumer.generated.AuditScoringCategoryBreakdown;
import com.nabin.seogeo.audit.contract.consumer.generated.AuditScoringOverall;
import com.nabin.seogeo.audit.contract.consumer.generated.AuditSummary;
import com.nabin.seogeo.audit.contract.consumer.generated.RecommendedAction;
import com.nabin.seogeo.audit.contract.consumer.generated.ReportCheckMetadata;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class AuditConsumerReportProjector {

    private final AuditContractSchemaValidator auditContractSchemaValidator;

    public AuditConsumerReportProjector(
            AuditContractSchemaValidator auditContractSchemaValidator
    ) {
        this.auditContractSchemaValidator = auditContractSchemaValidator;
    }

    public com.nabin.seogeo.audit.contract.consumer.generated.AuditReportSchema project(AuditReportSchema internalReport) {
        com.nabin.seogeo.audit.contract.consumer.generated.AuditReportSchema publicReport =
                new com.nabin.seogeo.audit.contract.consumer.generated.AuditReportSchema();
        publicReport.setJobId(internalReport.getJobId());
        publicReport.setStatus(toConsumerAuditStatus(internalReport));
        publicReport.setGeneratedAt(internalReport.getGeneratedAt());
        publicReport.setTargetUrl(internalReport.getTargetUrl());
        publicReport.setSummary(toConsumerSummary(internalReport));
        publicReport.setScoring(toConsumerScoring(internalReport));
        publicReport.setChecks(toConsumerChecks(internalReport));
        publicReport.setActions(toConsumerActions(internalReport));

        auditContractSchemaValidator.validatePublicReportPayload(publicReport);
        return publicReport;
    }

    private AuditSummary toConsumerSummary(AuditReportSchema internalReport) {
        AuditSummary summary = new AuditSummary();
        summary.setScore(internalReport.getSummary().getScore());
        summary.setIndexabilityVerdict(AuditSummary.IndexabilityVerdictLabel.fromValue(
                internalReport.getSummary().getIndexabilityVerdict().value()
        ));
        summary.setIssueCount(internalReport.getSummary().getIssueCount());
        summary.setPassedCheckCount(internalReport.getSummary().getPassedCheckCount());
        summary.setNotApplicableCount(internalReport.getSummary().getNotApplicableCount());
        summary.setSystemErrorCount(internalReport.getSummary().getSystemErrorCount());
        summary.setTopIssue(internalReport.getSummary().getTopIssue());
        return summary;
    }

    private AuditScoring toConsumerScoring(AuditReportSchema internalReport) {
        AuditScoring scoring = new AuditScoring();

        AuditScoringOverall overall = new AuditScoringOverall();
        overall.setConfidence(internalReport.getScoring().getOverall().getConfidence());
        scoring.setOverall(overall);

        AuditScoringCategories categories = new AuditScoringCategories();
        categories.setReachability(toConsumerCategory(internalReport.getScoring().getCategories().getReachability()));
        categories.setCrawlability(toConsumerCategory(internalReport.getScoring().getCategories().getCrawlability()));
        categories.setIndexability(toConsumerCategory(internalReport.getScoring().getCategories().getIndexability()));
        categories.setSitewide(toConsumerCategory(internalReport.getScoring().getCategories().getSitewide()));
        categories.setContentVisibility(toConsumerCategory(internalReport.getScoring().getCategories().getContentVisibility()));
        categories.setMetadata(toConsumerCategory(internalReport.getScoring().getCategories().getMetadata()));
        categories.setDiscovery(toConsumerCategory(internalReport.getScoring().getCategories().getDiscovery()));
        scoring.setCategories(categories);

        return scoring;
    }

    private AuditScoringCategoryBreakdown toConsumerCategory(
            com.nabin.seogeo.audit.contract.internal.generated.AuditScoringCategoryBreakdown internalCategory
    ) {
        AuditScoringCategoryBreakdown category = new AuditScoringCategoryBreakdown();
        category.setScore(internalCategory.getScore());
        category.setConfidence(internalCategory.getConfidence());
        return category;
    }

    private List<com.nabin.seogeo.audit.contract.consumer.generated.ReportCheck> toConsumerChecks(
            AuditReportSchema internalReport
    ) {
        if (internalReport.getChecks() == null) {
            return List.of();
        }

        return internalReport.getChecks().stream()
                .map(this::toConsumerCheck)
                .toList();
    }

    private com.nabin.seogeo.audit.contract.consumer.generated.ReportCheck toConsumerCheck(ReportCheck check) {
        com.nabin.seogeo.audit.contract.consumer.generated.ReportCheck consumerCheck =
                new com.nabin.seogeo.audit.contract.consumer.generated.ReportCheck();
        consumerCheck.setId(check.getId());
        consumerCheck.setLabel(check.getLabel());
        consumerCheck.setStatus(com.nabin.seogeo.audit.contract.consumer.generated.ReportCheck.CheckStatus.fromValue(
                check.getStatus().value()
        ));
        consumerCheck.setCategory(com.nabin.seogeo.audit.contract.consumer.generated.ReportCheck.AuditCategoryId.fromValue(
                check.getCategory().value()
        ));
        if (check.getSeverity() != null) {
            consumerCheck.setSeverity(check.getSeverity());
        }
        if (hasText(check.getInstruction())) {
            consumerCheck.setInstruction(check.getInstruction());
        }
        if (hasText(check.getDetail())) {
            consumerCheck.setDetail(check.getDetail());
        }
        if (hasText(check.getSelector())) {
            consumerCheck.setSelector(check.getSelector());
        }
        if (hasText(check.getMetric())) {
            consumerCheck.setMetric(check.getMetric());
        }
        ReportCheckMetadata metadata = toConsumerMetadata(check);
        if (metadata != null) {
            consumerCheck.setMetadata(metadata);
        }
        return consumerCheck;
    }

    private ReportCheckMetadata toConsumerMetadata(ReportCheck check) {
        if (check.getMetadata() == null) {
            return null;
        }

        ReportCheckMetadata metadata = new ReportCheckMetadata();
        if (check.getMetadata().getProblemFamily() != null) {
            metadata.setProblemFamily(ReportCheckMetadata.ProblemFamily.fromValue(
                    check.getMetadata().getProblemFamily().value()
            ));
        }
        if (check.getMetadata().getEvidenceSource() != null) {
            metadata.setEvidenceSource(ReportCheckMetadata.EvidenceSource.fromValue(
                    check.getMetadata().getEvidenceSource().value()
            ));
        }
        if (metadata.getProblemFamily() == null && metadata.getEvidenceSource() == null) {
            return null;
        }
        return metadata;
    }

    private List<RecommendedAction> toConsumerActions(AuditReportSchema internalReport) {
        if (internalReport.getChecks() == null) {
            return List.of();
        }

        return internalReport.getChecks().stream()
                .filter(this::isIssueCheck)
                .sorted(Comparator
                        .comparingInt(this::severityRank)
                        .thenComparing(ReportCheck::getLabel, Comparator.nullsLast(String::compareTo)))
                .map(this::toConsumerAction)
                .toList();
    }

    private RecommendedAction toConsumerAction(ReportCheck check) {
        RecommendedAction action = new RecommendedAction();
        action.setCheckId(check.getId());
        action.setLabel(check.getLabel());
        action.setCategory(com.nabin.seogeo.audit.contract.consumer.generated.ReportCheck.AuditCategoryId.fromValue(
                check.getCategory().value()
        ));
        action.setInstruction(hasText(check.getInstruction()) ? check.getInstruction() : check.getLabel());
        if (check.getSeverity() != null) {
            action.setSeverity(check.getSeverity());
        }
        if (hasText(check.getDetail())) {
            action.setDetail(check.getDetail());
        }
        return action;
    }

    private boolean isIssueCheck(ReportCheck check) {
        return check != null
                && check.getStatus() != null
                && check.getStatus() == ReportCheck.CheckStatus.ISSUE;
    }

    private int severityRank(ReportCheck check) {
        if (check == null || check.getSeverity() == null) {
            return 99;
        }
        String severity = String.valueOf(check.getSeverity());
        return switch (severity) {
            case "high" -> 0;
            case "medium" -> 1;
            case "low" -> 2;
            default -> 99;
        };
    }

    private com.nabin.seogeo.audit.contract.consumer.generated.AuditReportSchema.AuditStatus toConsumerAuditStatus(
            AuditReportSchema internalReport
    ) {
        return internalReport.getStatus() == null
                ? null
                : com.nabin.seogeo.audit.contract.consumer.generated.AuditReportSchema.AuditStatus.fromValue(
                        internalReport.getStatus().value()
                );
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
