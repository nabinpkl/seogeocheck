package com.nabin.seogeo.audit.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Validated
@ConfigurationProperties(prefix = "seogeo.lighthouse")
public class LighthouseProperties {

    @NotBlank
    private String taskQueue = "seogeo-lighthouse";

    private Duration activityTimeout = Duration.ofSeconds(65);

    public String getTaskQueue() {
        return taskQueue;
    }

    public void setTaskQueue(String taskQueue) {
        this.taskQueue = taskQueue;
    }

    public Duration getActivityTimeout() {
        return activityTimeout;
    }

    public void setActivityTimeout(Duration activityTimeout) {
        this.activityTimeout = activityTimeout;
    }
}
