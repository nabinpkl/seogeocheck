package com.nabin.seogeo.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.networknt.schema.Error;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SpecificationVersion;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AuditContractSchemaValidator {

    private static final String REPORT_SCHEMA = "audit/audit-report.schema.json";
    private static final String STREAM_EVENT_SCHEMA = "audit/audit-stream-event.schema.json";
    private static final String WORKER_PROGRESS_SCHEMA = "audit/audit-worker-progress-event.schema.json";

    private final ObjectMapper objectMapper;
    private final SchemaRegistry schemaRegistry;
    private final Map<String, Schema> schemaCache = new ConcurrentHashMap<>();

    public AuditContractSchemaValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy()
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        this.schemaRegistry = SchemaRegistry.withDefaultDialect(SpecificationVersion.DRAFT_2020_12);
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
        return schemaCache.computeIfAbsent(schemaPath, path -> {
            try (InputStream inputStream = new ClassPathResource(path).getInputStream()) {
                return schemaRegistry.getSchema(inputStream);
            } catch (IOException exception) {
                throw new UncheckedIOException("Unable to load schema " + path, exception);
            }
        });
    }
}
