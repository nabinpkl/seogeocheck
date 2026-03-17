package com.nabin.seogeo.audit.domain;

public enum AuditStatus {
    QUEUED,
    STREAMING,
    COMPLETE,
    FAILED,
    VERIFIED;

    public boolean isTerminal() {
        return this == FAILED || this == VERIFIED;
    }
}
