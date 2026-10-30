import json
import logging
import smtplib
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from sqlalchemy import select

from app.infra.models import TenantSignupRequest
from app.services import notification_service as service


@pytest.fixture
def mail(monkeypatch, caplog):
    config = SimpleNamespace(
        smtp_host="smtp.private.test", smtp_port=587, smtp_use_tls=True,
        smtp_username="private-user", smtp_password="private-password",
        smtp_from_email="sender@private.test",
        platform_notification_email="recipient@private.test",
    )
    monkeypatch.setattr(service, "settings", config)
    factory = MagicMock()
    monkeypatch.setattr(service.smtplib, "SMTP", factory)
    # Capture real serialized logs despite the application's non-propagating logger.
    monkeypatch.setattr(service.logger, "propagate", False)
    service.logger.addHandler(caplog.handler)
    caplog.set_level(logging.INFO)
    try:
        yield config, factory, factory.return_value.__enter__.return_value
    finally:
        service.logger.removeHandler(caplog.handler)


def notification_logs(caplog):
    records = [r for r in caplog.records if r.name == service.logger.name]
    assert all(r.exc_info is None and r.stack_info is None for r in records)
    return [json.loads(r.getMessage()) for r in records]


@pytest.mark.parametrize("tls,authenticate", [(True, True), (False, False)])
def test_smtp_acceptance(mail, caplog, tls, authenticate):
    config, factory, smtp = mail
    config.smtp_use_tls = tls
    if not authenticate:
        config.smtp_password = ""
    assert service.notify_platform("Private subject", "Private body") is True
    factory.assert_called_once_with(config.smtp_host, config.smtp_port, timeout=10)
    assert smtp.starttls.call_count == int(tls)
    assert smtp.login.call_count == int(authenticate)
    message = smtp.send_message.call_args.args[0]
    assert message["To"] == config.platform_notification_email
    assert message["Subject"] == "Private subject"
    assert message.get_content().strip() == "Private body"
    assert notification_logs(caplog) == [{"event": "platform_notification_smtp_accepted"}]


@pytest.mark.parametrize("missing", ["smtp_host", "platform_notification_email", "sender"])
def test_missing_configuration_skips_network(mail, caplog, missing):
    config, factory, _ = mail
    if missing == "sender":
        config.smtp_from_email = config.smtp_username = ""
    else:
        setattr(config, missing, "")
    assert service.notify_platform("Private subject", "Private body") is False
    factory.assert_not_called()
    assert notification_logs(caplog) == [{
        "event": "platform_notification_skipped", "reason": "missing_configuration",
    }]


@pytest.mark.parametrize("stage,exception,reason", [
    ("login", smtplib.SMTPAuthenticationError, "authentication_failed"),
    ("connect", TimeoutError, "timeout"),
    ("send", TimeoutError, "timeout"),
    ("send", smtplib.SMTPDataError, "smtp_error"),
    ("send", RuntimeError, "unexpected_error"),
])
def test_failure_logs_only_safe_category(mail, caplog, stage, exception, reason):
    config, factory, smtp = mail
    sensitive = " ".join([
        config.smtp_host, config.smtp_username, config.smtp_password,
        config.smtp_from_email, config.platform_notification_email,
        "Private subject", "Private body",
    ])
    error = exception(535, sensitive.encode()) if issubclass(exception, smtplib.SMTPResponseException) else exception(sensitive)
    target = {"connect": factory, "login": smtp.login, "send": smtp.send_message}[stage]
    target.side_effect = error
    assert service.notify_platform("Private subject", "Private body") is False
    assert notification_logs(caplog) == [{
        "event": "platform_notification_failed", "reason": reason,
    }]
    assert all(r.levelno == logging.WARNING for r in caplog.records if r.name == service.logger.name)
    for value in sensitive.split():
        assert value not in caplog.text


def test_invalid_message_is_contained(mail, caplog):
    _, factory, _ = mail
    assert service.notify_platform("Invalid\nsubject", "Private body") is False
    factory.assert_not_called()
    assert notification_logs(caplog) == [{
        "event": "platform_notification_failed", "reason": "unexpected_error",
    }]


@pytest.mark.parametrize("error", [smtplib.SMTPAuthenticationError(535, b"private"), TimeoutError("private")])
def test_signup_remains_persisted_when_mail_fails(api_context, mail, caplog, error):
    client, sessions = api_context
    _, factory, _ = mail
    factory.side_effect = error
    response = client.post("/admin/tenants/signup-requests", json={
        "company_name": "Example", "contact_name": "Contact",
        "email": "contact@example.test", "phone": "123456789",
    })
    assert response.status_code == 201
    assert response.json()["status"] == "pending"
    with sessions() as db:
        request = db.scalar(select(TenantSignupRequest))
        assert request is not None
        assert str(request.id) == response.json()["id"]
        assert request.status == "pending"
    assert len(notification_logs(caplog)) == 1
    assert notification_logs(caplog)[0]["event"] == "platform_notification_failed"
