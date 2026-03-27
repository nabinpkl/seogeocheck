package com.nabin.seogeo.auth.mail;

import java.time.OffsetDateTime;

public interface AuthEmailSender {

    void sendVerificationEmail(String recipientEmail, String verificationUrl, OffsetDateTime expiresAt);

    void sendPasswordResetEmail(String recipientEmail, String resetUrl, OffsetDateTime expiresAt);
}
