from email.message import EmailMessage
import logging
import smtplib

from app.core.config import settings
from app.core.logging import get_logger, log_event


logger = get_logger("notifications")


def notify_platform(subject: str, body: str) -> bool:
    if not _is_email_configured():
        log_event(logger, event="platform_notification_skipped", reason="missing_configuration")
        return False

    try:
        message = EmailMessage()
        message["From"] = settings.smtp_from_email or settings.smtp_username
        message["To"] = settings.platform_notification_email
        message["Subject"] = subject
        message.set_content(body)

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except Exception as exc:
        # SMTP exception messages/responses can contain credentials or mail data.
        # Emit only fixed categories, never exception text, repr or traceback.
        if isinstance(exc, smtplib.SMTPAuthenticationError):
            reason = "authentication_failed"
        elif isinstance(exc, TimeoutError):
            reason = "timeout"
        elif isinstance(exc, smtplib.SMTPException):
            reason = "smtp_error"
        else:
            reason = "unexpected_error"
        log_event(
            logger,
            level=logging.WARNING,
            event="platform_notification_failed",
            reason=reason,
        )
        return False

    log_event(logger, event="platform_notification_smtp_accepted")
    return True


def _is_email_configured() -> bool:
    return bool(
        settings.platform_notification_email
        and settings.smtp_host
        and (settings.smtp_from_email or settings.smtp_username)
    )
