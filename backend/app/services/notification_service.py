from email.message import EmailMessage
import smtplib

from app.core.config import settings


def notify_platform(subject: str, body: str) -> bool:
    if not _is_email_configured():
        return False

    message = EmailMessage()
    message["From"] = settings.smtp_from_email or settings.smtp_username
    message["To"] = settings.platform_notification_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except Exception:
        return False

    return True


def _is_email_configured() -> bool:
    return bool(
        settings.platform_notification_email
        and settings.smtp_host
        and (settings.smtp_from_email or settings.smtp_username)
    )
