package com.nabin.seogeo.auth.mail;

import com.nabin.seogeo.auth.config.AuthProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

@Component
public class SmtpAuthEmailSender implements AuthEmailSender {

    private final JavaMailSender mailSender;
    private final AuthProperties authProperties;

    public SmtpAuthEmailSender(JavaMailSender mailSender, AuthProperties authProperties) {
        this.mailSender = mailSender;
        this.authProperties = authProperties;
    }

    @Override
    public void sendVerificationEmail(String recipientEmail, String verificationUrl, OffsetDateTime expiresAt) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(authProperties.getFromEmail());
        message.setTo(recipientEmail);
        message.setSubject("Verify your SEOGEO account");
        message.setText("""
                Finish verifying your email to activate your SEOGEO account.

                Verify email:
                %s

                This link expires at %s.
                If you did not request this, you can ignore this email.
                """.formatted(
                verificationUrl,
                expiresAt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        ));
        mailSender.send(message);
    }

    @Override
    public void sendPasswordResetEmail(String recipientEmail, String resetUrl, OffsetDateTime expiresAt) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(authProperties.getFromEmail());
        message.setTo(recipientEmail);
        message.setSubject("Reset your SEOGEO password");
        message.setText("""
                A password reset was requested for your SEOGEO account.

                Reset password:
                %s

                This link expires at %s.
                If you did not request this, you can ignore this email.
                """.formatted(
                resetUrl,
                expiresAt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        ));
        mailSender.send(message);
    }
}
