package com.nabin.seogeo.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabin.seogeo.audit.config.KafkaProgressProperties;
import com.nabin.seogeo.audit.domain.AuditProgressEvent;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Component
public class AuditProgressKafkaListener {

    private final ObjectMapper objectMapper;
    private final AuditProgressProjectorService auditProgressProjectorService;

    public AuditProgressKafkaListener(
            ObjectMapper objectMapper,
            AuditProgressProjectorService auditProgressProjectorService
    ) {
        this.objectMapper = objectMapper;
        this.auditProgressProjectorService = auditProgressProjectorService;
    }

    @KafkaListener(
            topics = "${seogeo.kafka.progress.topic}",
            containerFactory = "auditProgressKafkaListenerContainerFactory",
            autoStartup = "${seogeo.kafka.progress.consumer-enabled:true}"
    )
    public void onMessage(ConsumerRecord<String, String> record, Acknowledgment acknowledgment)
            throws JsonProcessingException {
        AuditProgressEvent event = objectMapper.readValue(record.value(), AuditProgressEvent.class);
        auditProgressProjectorService.project(
                event,
                record.topic(),
                record.partition(),
                record.offset()
        );
        acknowledgment.acknowledge();
    }
}
