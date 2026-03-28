package com.nabin.seogeo.auth.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Validated
@ConfigurationProperties(prefix = "seogeo.auth")
public class AuthProperties {

    @NotBlank
    private String publicAppUrl;

    @NotBlank
    private String fromEmail;

    @NotNull
    private Duration verificationTokenTtl = Duration.ofMinutes(30);

    @NotNull
    private Duration verificationSendCooldown = Duration.ofSeconds(60);

    @Min(1)
    private int verificationMaxSendsPerHour = 5;

    @NotNull
    private Duration resetTokenTtl = Duration.ofMinutes(30);

    @NotNull
    private Duration resetSendCooldown = Duration.ofSeconds(60);

    @Min(1)
    private int resetMaxSendsPerHour = 5;

    @NotNull
    private Duration failedLoginWindow = Duration.ofMinutes(15);

    @NotNull
    private Duration failedLoginMaxDelay = Duration.ofSeconds(30);

    @NotNull
    private Duration auditClaimTokenTtl = Duration.ofDays(7);

    public String getPublicAppUrl() {
        return publicAppUrl;
    }

    public void setPublicAppUrl(String publicAppUrl) {
        this.publicAppUrl = publicAppUrl;
    }

    public String getFromEmail() {
        return fromEmail;
    }

    public void setFromEmail(String fromEmail) {
        this.fromEmail = fromEmail;
    }

    public Duration getVerificationTokenTtl() {
        return verificationTokenTtl;
    }

    public void setVerificationTokenTtl(Duration verificationTokenTtl) {
        this.verificationTokenTtl = verificationTokenTtl;
    }

    public Duration getVerificationSendCooldown() {
        return verificationSendCooldown;
    }

    public void setVerificationSendCooldown(Duration verificationSendCooldown) {
        this.verificationSendCooldown = verificationSendCooldown;
    }

    public int getVerificationMaxSendsPerHour() {
        return verificationMaxSendsPerHour;
    }

    public void setVerificationMaxSendsPerHour(int verificationMaxSendsPerHour) {
        this.verificationMaxSendsPerHour = verificationMaxSendsPerHour;
    }

    public Duration getResetTokenTtl() {
        return resetTokenTtl;
    }

    public void setResetTokenTtl(Duration resetTokenTtl) {
        this.resetTokenTtl = resetTokenTtl;
    }

    public Duration getResetSendCooldown() {
        return resetSendCooldown;
    }

    public void setResetSendCooldown(Duration resetSendCooldown) {
        this.resetSendCooldown = resetSendCooldown;
    }

    public int getResetMaxSendsPerHour() {
        return resetMaxSendsPerHour;
    }

    public void setResetMaxSendsPerHour(int resetMaxSendsPerHour) {
        this.resetMaxSendsPerHour = resetMaxSendsPerHour;
    }

    public Duration getFailedLoginWindow() {
        return failedLoginWindow;
    }

    public void setFailedLoginWindow(Duration failedLoginWindow) {
        this.failedLoginWindow = failedLoginWindow;
    }

    public Duration getFailedLoginMaxDelay() {
        return failedLoginMaxDelay;
    }

    public void setFailedLoginMaxDelay(Duration failedLoginMaxDelay) {
        this.failedLoginMaxDelay = failedLoginMaxDelay;
    }

    public Duration getAuditClaimTokenTtl() {
        return auditClaimTokenTtl;
    }

    public void setAuditClaimTokenTtl(Duration auditClaimTokenTtl) {
        this.auditClaimTokenTtl = auditClaimTokenTtl;
    }
}
