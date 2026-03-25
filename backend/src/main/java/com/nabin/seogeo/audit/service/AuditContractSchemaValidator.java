package com.nabin.seogeo.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.networknt.schema.Error;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaLocation;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SpecificationVersion;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AuditContractSchemaValidator {

    private static final String SCHEMA_ID_PREFIX = "https://seogeo.dev/schemas/";
    private static final String CLASSPATH_SCHEMA_PREFIX = "classpath:";
    private static final String REPORT_SCHEMA = "https://seogeo.dev/schemas/audit/audit-report.schema.json";
    private static final String STREAM_EVENT_SCHEMA = "https://seogeo.dev/schemas/audit/audit-stream-event.schema.json";
    private static final String WORKER_PROGRESS_SCHEMA = "https://seogeo.dev/schemas/audit/audit-worker-progress-event.schema.json";

    private final ObjectMapper objectMapper;
    private final SchemaRegistry schemaRegistry;
    private final Map<String, Schema> schemaCache = new ConcurrentHashMap<>();

    public AuditContractSchemaValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy()
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        this.schemaRegistry = SchemaRegistry.withDefaultDialect(
                SpecificationVersion.DRAFT_2020_12,
                builder -> builder.schemaIdResolvers(schemaIdResolvers ->
                        schemaIdResolvers.mapPrefix(SCHEMA_ID_PREFIX, CLASSPATH_SCHEMA_PREFIX))
        );
    }

    public void validateReportPayload(Object payload) {
        validateNode(readTree(payload), REPORT_SCHEMA, "audit report");
    }

    public void validateStreamEventPayload(Object payload) {
        validateNode(readTree(payload), STREAM_EVENT_SCHEMA, "audit stream event");
    }

    public void validateWorkerProgressEventJson(String payloadJson) {
        validateNode(readTree(payloadJson), WORKER_PROGRESS_SCHEMA, "worker progress event");
    }

    private JsonNode readTree(Object payload) {
        return objectMapper.valueToTree(payload);
    }

    private JsonNode readTree(String payloadJson) {
        try {
            return objectMapper.readTree(payloadJson);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Unable to parse schema-validated JSON payload.", exception);
        }
    }

    private void validateNode(JsonNode payload, String schemaPath, String label) {
        var errors = loadSchema(schemaPath).validate(payload);
        if (!errors.isEmpty()) {
            String errorMessage = errors.stream()
                    .map(Error::getMessage)
                    .sorted()
                    .collect(Collectors.joining("; "));
            throw new IllegalArgumentException("Invalid " + label + ": " + errorMessage);
        }
    }

    private Schema loadSchema(String schemaPath) {
        return schemaCache.computeIfAbsent(
                schemaPath,
                path -> schemaRegistry.getSchema(SchemaLocation.of(path))
        );
    }
}
