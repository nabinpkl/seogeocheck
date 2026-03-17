package com.nabin.seogeo.audit.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Validated
@ConfigurationProperties(prefix = "seogeo.audit")
public class AuditProperties {

    @NotBlank
    private String taskQueue = "seogeo-audit";

    private Duration ssePollInterval = Duration.ofMillis(500);

    private Duration sseHeartbeatInterval = Duration.ofSeconds(10);

    @NotBlank
    private String reportSigningSecret;

    public String getTaskQueue() {
        return taskQueue;
    }

    public void setTaskQueue(String taskQueue) {
        this.taskQueue = taskQueue;
    }

    public Duration getSsePollInterval() {
        return ssePollInterval;
    }

    public void setSsePollInterval(Duration ssePollInterval) {
        this.ssePollInterval = ssePollInterval;
    }

    public Duration getSseHeartbeatInterval() {
        return sseHeartbeatInterval;
    }

    public void setSseHeartbeatInterval(Duration sseHeartbeatInterval) {
        this.sseHeartbeatInterval = sseHeartbeatInterval;
    }

    public String getReportSigningSecret() {
        return reportSigningSecret;
    }

    public void setReportSigningSecret(String reportSigningSecret) {
        this.reportSigningSecret = reportSigningSecret;
    }
}
