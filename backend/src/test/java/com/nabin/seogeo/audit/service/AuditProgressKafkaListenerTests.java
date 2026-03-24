package com.nabin.seogeo.audit.service;

import com.nabin.seogeo.audit.persistence.AuditEventRepository;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@EmbeddedKafka(
        partitions = 6,
        topics = {"seogeo.audit.progress.v1", "seogeo.audit.progress.dlq.v1"}
)
@TestPropertySource(properties = {
        "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}",
        "seogeo.kafka.progress.consumer-enabled=true"
})
class AuditProgressKafkaListenerTests {

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    private AuditPersistenceService auditPersistenceService;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private EmbeddedKafkaBroker embeddedKafkaBroker;

    private Consumer<String, String> dlqConsumer;

    @AfterEach
    void tearDown() {
        if (dlqConsumer != null) {
            dlqConsumer.close();
        }
    }

    @Test
    void kafkaListenerProjectsStatusEventsIntoAuditLog() throws Exception {
        String jobId = "audit_kafka_status";
        auditPersistenceService.createPendingRun(jobId, "https://example.com", OffsetDateTime.now());

        kafkaTemplate.send(
                "seogeo.audit.progress.v1",
                jobId,
                """
                {"schemaVersion":1,"eventId":"audit_kafka_status:stage:source_capture_complete","jobId":"audit_kafka_status","producer":"seo-audit-worker","eventType":"status","status":"STREAMING","emittedAt":"2026-03-22T00:00:00Z","message":"Collected source HTML signals.","stage":"source_capture_complete","progress":25}
                """
        ).get();

        awaitEventCount(jobId, 1);

        var events = auditEventRepository.findByJobIdOrderBySequenceAsc(jobId);
        assertThat(events).hasSize(1);
        assertThat(events.getFirst().getEventType()).isEqualTo("status");
        assertThat(events.getFirst().getSourceEventId()).isEqualTo("audit_kafka_status:stage:source_capture_complete");
        assertThat(events.getFirst().getSourceTopic()).isEqualTo("seogeo.audit.progress.v1");
    }

    @Test
    void duplicateKafkaEventIdsAreIgnoredIdempotently() throws Exception {
        String jobId = "audit_kafka_duplicate";
        auditPersistenceService.createPendingRun(jobId, "https://example.com", OffsetDateTime.now());
        String payload = """
                {"schemaVersion":1,"eventId":"audit_kafka_duplicate:rule:document-title","jobId":"audit_kafka_duplicate","producer":"seo-audit-worker","eventType":"check","status":"STREAMING","emittedAt":"2026-03-22T00:00:00Z","message":"Add a unique page title","ruleId":"document-title","checkStatus":"issue","severity":"high","instruction":"Add a unique <title>.","selector":"head > title"}
                """;

        kafkaTemplate.send("seogeo.audit.progress.v1", jobId, payload).get();
        kafkaTemplate.send("seogeo.audit.progress.v1", jobId, payload).get();

        awaitEventCount(jobId, 1);

        var events = auditEventRepository.findByJobIdOrderBySequenceAsc(jobId);
        assertThat(events).hasSize(1);
        assertThat(events.getFirst().getSourceEventId()).isEqualTo("audit_kafka_duplicate:rule:document-title");
    }

    @Test
    void malformedKafkaPayloadsLandInTheDlq() throws Exception {
        Map<String, Object> consumerProps = KafkaTestUtils.consumerProps("audit-progress-dlq", "false", embeddedKafkaBroker);
        dlqConsumer = new org.apache.kafka.clients.consumer.KafkaConsumer<>(
                consumerProps,
                new StringDeserializer(),
                new StringDeserializer()
        );
        embeddedKafkaBroker.consumeFromAnEmbeddedTopic(dlqConsumer, "seogeo.audit.progress.dlq.v1");

        kafkaTemplate.send("seogeo.audit.progress.v1", "audit_bad_payload", "{not-json").get();

        ConsumerRecord<String, String> record = awaitDlqRecord("audit_bad_payload");
        assertThat(record.value()).contains("{not-json");
    }

    @Test
    void schemaInvalidKafkaPayloadsLandInTheDlq() throws Exception {
        Map<String, Object> consumerProps = KafkaTestUtils.consumerProps("audit-progress-dlq-schema", "false", embeddedKafkaBroker);
        dlqConsumer = new org.apache.kafka.clients.consumer.KafkaConsumer<>(
                consumerProps,
                new StringDeserializer(),
                new StringDeserializer()
        );
        embeddedKafkaBroker.consumeFromAnEmbeddedTopic(dlqConsumer, "seogeo.audit.progress.dlq.v1");

        kafkaTemplate.send(
                "seogeo.audit.progress.v1",
                "audit_bad_schema",
                """
                {"schemaVersion":1,"eventId":"audit_bad_schema:stage:source_capture_complete","jobId":"audit_bad_schema","producer":"seo-audit-worker","eventType":"status","status":"STREAMING","emittedAt":"2026-03-22T00:00:00Z","message":"Collected source HTML signals.","stage":"source_capture_complete","progress":25,"unexpected":true}
                """
        ).get();

        ConsumerRecord<String, String> record = awaitDlqRecord("audit_bad_schema");
        assertThat(record.value()).contains("\"unexpected\":true");
    }

    private ConsumerRecord<String, String> awaitDlqRecord(String expectedKey) {
        long deadline = System.currentTimeMillis() + 10_000L;
        while (System.currentTimeMillis() < deadline) {
            ConsumerRecords<String, String> records = dlqConsumer.poll(Duration.ofMillis(500));
            for (ConsumerRecord<String, String> record : records.records("seogeo.audit.progress.dlq.v1")) {
                if (expectedKey.equals(record.key())) {
                    return record;
                }
            }
        }

        throw new AssertionError("Timed out waiting for DLQ record for " + expectedKey);
    }

    private void awaitEventCount(String jobId, int expectedCount) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 10_000L;
        while (System.currentTimeMillis() < deadline) {
            if (auditEventRepository.findByJobIdOrderBySequenceAsc(jobId).size() >= expectedCount) {
                return;
            }
            Thread.sleep(100L);
        }

        throw new AssertionError("Timed out waiting for audit events for " + jobId);
    }
}
