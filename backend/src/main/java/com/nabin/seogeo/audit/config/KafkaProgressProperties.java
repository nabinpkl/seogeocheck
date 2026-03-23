package com.nabin.seogeo.audit.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "seogeo.kafka.progress")
public class KafkaProgressProperties {

    @NotBlank
    private String topic = "seogeo.audit.progress.v1";

    @NotBlank
    private String dlqTopic = "seogeo.audit.progress.dlq.v1";

    private boolean consumerEnabled = true;

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getDlqTopic() {
        return dlqTopic;
    }

    public void setDlqTopic(String dlqTopic) {
        this.dlqTopic = dlqTopic;
    }

    public boolean isConsumerEnabled() {
        return consumerEnabled;
    }

    public void setConsumerEnabled(boolean consumerEnabled) {
        this.consumerEnabled = consumerEnabled;
    }
}
