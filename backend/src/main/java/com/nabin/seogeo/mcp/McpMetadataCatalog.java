package com.nabin.seogeo.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.modelcontextprotocol.spec.McpSchema;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class McpMetadataCatalog {

    public static final String OVERVIEW_RESOURCE_URI = "seogeo://guide/overview";
    private static final String MCP_SCOPE = "seogeo:mcp";

    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;
    private final Map<String, JsonNode> rawSchemaCache = new HashMap<>();

    public McpMetadataCatalog(ObjectMapper objectMapper, ResourceLoader resourceLoader) {
        this.objectMapper = objectMapper;
        this.resourceLoader = resourceLoader;
    }

    public String serverInstructions() {
        return """
                SEOGEO MCP is an account-scoped SEO audit server.
                Start with projects_list to discover projects and slugs, use project_get or project_audits_list to inspect history, use audit_start to create a new audit job, and poll audit_report_get until status is VERIFIED or FAILED.
                Read seogeo://guide/overview for the domain model, workflow, and example usage.
                """;
    }

    public McpSchema.Resource overviewResource() {
        return McpSchema.Resource.builder()
                .uri(OVERVIEW_RESOURCE_URI)
                .name("seogeo_overview")
                .title("SEOGEO MCP Overview")
                .description("Start here for what SEOGEO MCP offers, the core domain terms, and the normal audit workflow.")
                .mimeType("text/markdown")
                .size((long) overviewMarkdown().length())
                .annotations(new McpSchema.Annotations(List.of(McpSchema.Role.ASSISTANT), 1.0))
                .build();
    }

    public McpSchema.ReadResourceResult readOverviewResource() {
        return new McpSchema.ReadResourceResult(List.of(
                new McpSchema.TextResourceContents(OVERVIEW_RESOURCE_URI, "text/markdown", overviewMarkdown())
        ));
    }

    public String projectsListInputSchema() {
        return toJson(schemaWithNoArguments());
    }

    public String projectsListOutputSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "array");
        schema.set("items", projectSummarySchema());
        return toJson(schema);
    }

    public String projectGetInputSchema() {
        ObjectNode schema = baseObjectSchema();
        ObjectNode properties = schema.putObject("properties");
        ObjectNode slug = properties.putObject("slug");
        slug.put("type", "string");
        slug.put("description", "Project slug returned by projects_list.");
        slug.put("minLength", 1);
        ArrayNode required = schema.putArray("required");
        required.add("slug");
        return toJson(schema);
    }

    public String projectAuditsListInputSchema() {
        ObjectNode schema = baseObjectSchema();
        ObjectNode properties = schema.putObject("properties");
        ObjectNode projectSlug = properties.putObject("projectSlug");
        projectSlug.put("type", "string");
        projectSlug.put("description", "Project slug returned by projects_list.");
        projectSlug.put("minLength", 1);
        ObjectNode trackedUrl = properties.putObject("trackedUrl");
        trackedUrl.put("type", "string");
        trackedUrl.put("description", "Optional tracked URL bucket to filter within the project, such as https://example.com.");
        trackedUrl.put("minLength", 1);
        ArrayNode required = schema.putArray("required");
        required.add("projectSlug");
        return toJson(schema);
    }

    public String projectAuditsListOutputSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "array");
        schema.set("items", accountAuditSummarySchema());
        return toJson(schema);
    }

    public String auditStartInputSchema() {
        ObjectNode schema = baseObjectSchema();
        ObjectNode properties = schema.putObject("properties");
        ObjectNode url = properties.putObject("url");
        url.put("type", "string");
        url.put("format", "uri-reference");
        url.put("description", "Website URL or bare domain to audit. Bare domains are accepted and normalized to https://.");
        url.put("minLength", 1);
        ObjectNode projectSlug = properties.putObject("projectSlug");
        projectSlug.put("type", "string");
        projectSlug.put("description", "Optional project slug from projects_list. When omitted, SEOGEO uses the account's default project.");
        projectSlug.put("minLength", 1);
        ArrayNode required = schema.putArray("required");
        required.add("url");
        return toJson(schema);
    }

    public String auditStartOutputSchema() {
        ObjectNode schema = baseObjectSchema();
        schema.put("description", "Audit creation result. Use the returned jobId with audit_report_get.");
        ObjectNode properties = schema.putObject("properties");
        stringProperty(properties, "jobId", "Created audit job identifier.");
        enumProperty(properties, "status", "Initial audit state.", List.of("QUEUED"));
        stringProperty(properties, "projectSlug", "Project slug that now owns the audit.");
        required(schema, "jobId", "status", "projectSlug");
        return toJson(schema);
    }

    public String auditReportGetInputSchema() {
        ObjectNode schema = baseObjectSchema();
        ObjectNode properties = schema.putObject("properties");
        ObjectNode jobId = properties.putObject("jobId");
        jobId.put("type", "string");
        jobId.put("description", "Audit job identifier returned by audit_start or project_audits_list.");
        jobId.put("minLength", 1);
        required(schema, "jobId");
        return toJson(schema);
    }

    public String auditReportGetOutputSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        ArrayNode oneOf = schema.putArray("oneOf");
        oneOf.add(auditReportFinalSchema());
        oneOf.add(auditReportPendingOrFailedSchema());
        return toJson(schema);
    }

    public String projectSummaryOutputSchema() {
        return toJson(projectSummarySchema());
    }

    private String overviewMarkdown() {
        return """
                # SEOGEO MCP
                
                SEOGEO MCP provides authenticated, account-scoped SEO audit workflows.
                
                ## What It Offers
                - Discover projects and their slugs.
                - Inspect audit history for a project or tracked URL.
                - Start a new audit for a website.
                - Poll for the signed final audit report.
                
                ## Core Terms
                - **Project**: A workspace bucket that owns audit history.
                - **Default project**: The visible fallback project SEOGEO uses when `audit_start` omits `projectSlug`.
                - **Project slug**: The stable identifier returned by `projects_list` and accepted by `project_get` and `project_audits_list`.
                - **Tracked URL**: The normalized URL bucket that groups repeated audits for the same target inside one project.
                - **Audit job**: The asynchronous audit run identified by `jobId`.
                - **Final report**: The canonical signed JSON audit report returned by `audit_report_get` when status becomes `VERIFIED`.
                
                ## Recommended Workflow
                1. Call `projects_list` to discover projects and slugs.
                2. Optionally call `project_get` for one project summary or `project_audits_list` for audit history.
                3. Call `audit_start` with `url` and optional `projectSlug`.
                4. Poll `audit_report_get` with the returned `jobId` until status is `VERIFIED` or `FAILED`.
                
                ## Ownership And Privacy
                All tools are scoped to the authenticated SEOGEO account. Project and audit lookups only return resources owned by that account.
                
                ## Examples
                - Start an audit in the default project: `audit_start` with `{ "url": "example.com" }`
                - Start an audit in a specific project: `audit_start` with `{ "url": "https://example.com", "projectSlug": "<slug-from-projects_list>" }`
                - Poll for completion: `audit_report_get` with `{ "jobId": "<jobId-from-audit_start>" }`
                """;
    }

    private ObjectNode auditReportFinalSchema() {
        ObjectNode schema = baseObjectSchema();
        schema.put("description", "Final signed audit report. Poll audit_report_get until status is VERIFIED.");
        ObjectNode properties = schema.putObject("properties");
        stringProperty(properties, "jobId", "Audit job identifier.");
        enumProperty(properties, "status", "Final audit state.", List.of("VERIFIED"));
        ObjectNode report = loadCanonicalAuditReportSchema();
        report.put("description", "Canonical signed audit report JSON object.");
        properties.set("report", report);
        required(schema, "jobId", "status", "report");
        return schema;
    }

    private ObjectNode auditReportPendingOrFailedSchema() {
        ObjectNode schema = baseObjectSchema();
        schema.put("description", "In-progress or failed audit result. Continue polling until status is VERIFIED or FAILED.");
        ObjectNode properties = schema.putObject("properties");
        stringProperty(properties, "jobId", "Audit job identifier.");
        enumProperty(properties, "status", "Current audit state.", List.of("QUEUED", "STREAMING", "COMPLETE", "FAILED"));
        stringProperty(properties, "message", "Human-readable status or failure message.");
        required(schema, "jobId", "status", "message");
        return schema;
    }

    private ObjectNode projectSummarySchema() {
        ObjectNode schema = baseObjectSchema();
        schema.put("description", "Project summary returned by projects_list and project_get.");
        ObjectNode properties = schema.putObject("properties");
        stringProperty(properties, "id", "Project UUID.");
        stringProperty(properties, "slug", "Stable project slug used by project_get and project_audits_list.");
        booleanProperty(properties, "isDefault", "True when this is the account's default project.");
        stringProperty(properties, "name", "Project display name.");
        nullableStringProperty(properties, "description", "Optional project description.");
        dateTimeProperty(properties, "createdAt", "Project creation timestamp.");
        dateTimeProperty(properties, "updatedAt", "Last project update timestamp.");
        integerProperty(properties, "trackedUrlCount", "Number of tracked URL buckets in the project.");
        integerProperty(properties, "verifiedUrlCount", "Number of tracked URLs with at least one verified audit.");
        integerProperty(properties, "auditCount", "Total audits owned by the project.");
        integerProperty(properties, "activeAuditCount", "Audits that are still queued or streaming.");
        nullableDateTimeProperty(properties, "latestAuditAt", "Most recent audit timestamp.");
        nullableIntegerProperty(properties, "projectScore", "Current rolled-up project score when available.");
        ObjectNode scoreTrend = scoreTrendSchema();
        scoreTrend.put("description", "Trend summary across verified tracked URLs.");
        properties.set("scoreTrend", nullableSchema(scoreTrend));
        ObjectNode topIssues = properties.putObject("topIssues");
        topIssues.put("type", "array");
        topIssues.put("description", "Most important recurring issues across the project.");
        topIssues.set("items", projectTopIssueSchema());
        integerProperty(properties, "criticalIssueCount", "Count of critical issues across latest verified audits.");
        integerProperty(properties, "affectedUrlCount", "Number of tracked URLs affected by top issues.");
        required(schema,
                "id", "slug", "isDefault", "name", "description", "createdAt", "updatedAt",
                "trackedUrlCount", "verifiedUrlCount", "auditCount", "activeAuditCount", "latestAuditAt",
                "projectScore", "scoreTrend", "criticalIssueCount", "affectedUrlCount", "topIssues");
        return schema;
    }

    private ObjectNode scoreTrendSchema() {
        ObjectNode schema = baseObjectSchema();
        ObjectNode properties = schema.putObject("properties");
        integerProperty(properties, "improvedUrlCount", "Tracked URLs whose score improved.");
        integerProperty(properties, "declinedUrlCount", "Tracked URLs whose score declined.");
        integerProperty(properties, "flatUrlCount", "Tracked URLs whose score stayed flat.");
        integerProperty(properties, "netScoreDelta", "Net score change across tracked URLs.");
        required(schema, "improvedUrlCount", "declinedUrlCount", "flatUrlCount", "netScoreDelta");
        return schema;
    }

    private ObjectNode projectTopIssueSchema() {
        ObjectNode schema = baseObjectSchema();
        ObjectNode properties = schema.putObject("properties");
        stringProperty(properties, "key", "Stable issue key.");
        stringProperty(properties, "label", "Human-readable issue label.");
        stringProperty(properties, "severity", "Issue severity label.");
        integerProperty(properties, "affectedUrlCount", "Tracked URLs affected by this issue.");
        nullableStringProperty(properties, "exampleInstruction", "Example remediation guidance drawn from an affected audit.");
        required(schema, "key", "label", "severity", "affectedUrlCount", "exampleInstruction");
        return schema;
    }

    private ObjectNode accountAuditSummarySchema() {
        ObjectNode schema = baseObjectSchema();
        schema.put("description", "Audit history entry returned by project_audits_list.");
        ObjectNode properties = schema.putObject("properties");
        stringProperty(properties, "jobId", "Audit job identifier. Use this with audit_report_get.");
        stringProperty(properties, "targetUrl", "Normalized audit target URL.");
        enumProperty(properties, "status", "Current audit state.", List.of("QUEUED", "STREAMING", "COMPLETE", "FAILED", "VERIFIED"));
        dateTimeProperty(properties, "createdAt", "Audit creation timestamp.");
        nullableDateTimeProperty(properties, "completedAt", "Audit completion timestamp when available.");
        nullableIntegerProperty(properties, "score", "Final score when a verified report exists.");
        stringProperty(properties, "projectSlug", "Project slug that owns the audit.");
        stringProperty(properties, "projectName", "Project display name.");
        stringProperty(properties, "trackedUrl", "Tracked URL bucket within the project.");
        required(schema, "jobId", "targetUrl", "status", "createdAt", "completedAt", "score", "projectSlug", "projectName", "trackedUrl");
        return schema;
    }

    private ObjectNode loadCanonicalAuditReportSchema() {
        JsonNode resolved = resolveSchema("audit/audit-report.schema.json");
        if (!(resolved instanceof ObjectNode objectNode)) {
            throw new IllegalStateException("Expected audit report schema to resolve to a JSON object.");
        }
        objectNode.remove("$schema");
        objectNode.remove("$id");
        return objectNode;
    }

    private ObjectNode schemaWithNoArguments() {
        ObjectNode schema = baseObjectSchema();
        schema.putObject("properties");
        return schema;
    }

    private ObjectNode baseObjectSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        return schema;
    }

    private ObjectNode nullableSchema(JsonNode valueSchema) {
        ObjectNode schema = objectMapper.createObjectNode();
        ArrayNode oneOf = schema.putArray("oneOf");
        oneOf.addObject().put("type", "null");
        oneOf.add(valueSchema);
        return schema;
    }

    private void stringProperty(ObjectNode properties, String name, String description) {
        ObjectNode property = properties.putObject(name);
        property.put("type", "string");
        property.put("description", description);
    }

    private void nullableStringProperty(ObjectNode properties, String name, String description) {
        ObjectNode property = properties.putObject(name);
        property.put("description", description);
        ArrayNode types = property.putArray("type");
        types.add("string");
        types.add("null");
    }

    private void booleanProperty(ObjectNode properties, String name, String description) {
        ObjectNode property = properties.putObject(name);
        property.put("type", "boolean");
        property.put("description", description);
    }

    private void integerProperty(ObjectNode properties, String name, String description) {
        ObjectNode property = properties.putObject(name);
        property.put("type", "integer");
        property.put("description", description);
    }

    private void nullableIntegerProperty(ObjectNode properties, String name, String description) {
        ObjectNode property = properties.putObject(name);
        property.put("description", description);
        ArrayNode types = property.putArray("type");
        types.add("integer");
        types.add("null");
    }

    private void dateTimeProperty(ObjectNode properties, String name, String description) {
        ObjectNode property = properties.putObject(name);
        property.put("type", "string");
        property.put("format", "date-time");
        property.put("description", description);
    }

    private void nullableDateTimeProperty(ObjectNode properties, String name, String description) {
        ObjectNode property = properties.putObject(name);
        property.put("description", description);
        ArrayNode oneOf = property.putArray("oneOf");
        oneOf.addObject().put("type", "null");
        ObjectNode stringNode = oneOf.addObject();
        stringNode.put("type", "string");
        stringNode.put("format", "date-time");
    }

    private void enumProperty(ObjectNode properties, String name, String description, List<String> values) {
        ObjectNode property = properties.putObject(name);
        property.put("description", description);
        ArrayNode enumValues = property.putArray("enum");
        for (String value : values) {
            enumValues.add(value);
        }
    }

    private void required(ObjectNode schema, String... names) {
        ArrayNode required = schema.putArray("required");
        for (String name : names) {
            required.add(name);
        }
    }

    private String toJson(JsonNode schema) {
        try {
            return objectMapper.writeValueAsString(schema);
        } catch (IOException exception) {
            throw new UncheckedIOException("Unable to serialize MCP schema metadata.", exception);
        }
    }

    private JsonNode resolveSchema(String resourcePath) {
        JsonNode rawRoot = readSchema(resourcePath);
        return resolveRefs(rawRoot.deepCopy(), resourcePath, rawRoot);
    }

    private JsonNode resolveRefs(JsonNode node, String currentResourcePath, JsonNode currentRoot) {
        if (node.isObject()) {
            ObjectNode objectNode = (ObjectNode) node;
            if (objectNode.has("$ref")) {
                String reference = objectNode.get("$ref").asText();
                JsonNode resolved = resolveReference(reference, currentResourcePath, currentRoot).deepCopy();
                return resolveRefs(resolved, referencedResourcePath(reference, currentResourcePath), referencedRoot(reference, currentResourcePath, currentRoot));
            }
            objectNode.fields().forEachRemaining(entry ->
                    objectNode.set(entry.getKey(), resolveRefs(entry.getValue(), currentResourcePath, currentRoot))
            );
            return objectNode;
        }
        if (node.isArray()) {
            ArrayNode arrayNode = (ArrayNode) node;
            for (int index = 0; index < arrayNode.size(); index++) {
                arrayNode.set(index, resolveRefs(arrayNode.get(index), currentResourcePath, currentRoot));
            }
            return arrayNode;
        }
        return node;
    }

    private JsonNode resolveReference(String reference, String currentResourcePath, JsonNode currentRoot) {
        String resourcePath = referencedResourcePath(reference, currentResourcePath);
        JsonNode root = referencedRoot(reference, currentResourcePath, currentRoot);
        String pointer = referencedPointer(reference);
        JsonNode resolved = pointer == null ? root : root.at(pointer);
        if (resolved.isMissingNode()) {
            throw new IllegalStateException("Unable to resolve schema reference " + reference + " from " + currentResourcePath);
        }
        return resolved;
    }

    private JsonNode referencedRoot(String reference, String currentResourcePath, JsonNode currentRoot) {
        String resourcePath = referencedResourcePath(reference, currentResourcePath);
        return resourcePath.equals(currentResourcePath) ? currentRoot : readSchema(resourcePath);
    }

    private String referencedResourcePath(String reference, String currentResourcePath) {
        int fragmentIndex = reference.indexOf('#');
        String relativePath = fragmentIndex >= 0 ? reference.substring(0, fragmentIndex) : reference;
        if (relativePath.isBlank()) {
            return currentResourcePath;
        }
        Path parent = Path.of(currentResourcePath).getParent();
        return (parent == null ? Path.of(relativePath) : parent.resolve(relativePath)).normalize().toString().replace('\\', '/');
    }

    private String referencedPointer(String reference) {
        int fragmentIndex = reference.indexOf('#');
        if (fragmentIndex < 0 || fragmentIndex == reference.length() - 1) {
            return null;
        }
        return reference.substring(fragmentIndex + 1);
    }

    private JsonNode readSchema(String resourcePath) {
        return rawSchemaCache.computeIfAbsent(resourcePath, this::loadSchemaResource);
    }

    private JsonNode loadSchemaResource(String resourcePath) {
        Resource resource = resourceLoader.getResource("classpath:" + resourcePath);
        try (InputStream inputStream = resource.getInputStream()) {
            return objectMapper.readTree(inputStream);
        } catch (IOException exception) {
            throw new UncheckedIOException("Unable to load schema resource " + resourcePath, exception);
        }
    }
}
