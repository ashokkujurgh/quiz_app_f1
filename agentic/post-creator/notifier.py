"""
Email the reviewer a reminder when a new AI post is waiting for approval.
Sends via the same Hostinger SMTP account the auth service uses.
"""
import html
import logging
import smtplib
import ssl
from email.message import EmailMessage
from config import (
    APPROVAL_EMAIL_TO, MAIL_USER, MAIL_PASSWORD, SMTP_HOST, SMTP_PORT,
)

logger = logging.getLogger(__name__)


def send_approval_email(
    post: dict,
    title: str | None,
    content: str,
    image_url: str | None,
    topic_name: str,
    subtopic_name: str,
    mode: str,
    level: str,
    region: str,
) -> bool:
    """Send one 'post waiting for approval' reminder. Never raises — returns True if sent."""
    if not APPROVAL_EMAIL_TO:
        return False
    if not (MAIL_USER and MAIL_PASSWORD):
        logger.warning("Approval email skipped: MAIL_USER / MAIL_PASSWORD not set.")
        return False

    heading = title or content.split("\n")[0][:90]
    preview = content[:600].rsplit(" ", 1)[0] + "…" if len(content) > 600 else content
    words   = len(content.split())
    region_label = "India" if region == "india" else "World"

    msg = EmailMessage()
    msg["Subject"] = f"Reminder: new post waiting for approval — {heading[:80]}"
    msg["From"]    = f'"Meenzo" <{MAIL_USER}>'
    msg["To"]      = APPROVAL_EMAIL_TO

    msg.set_content(
        f"Reminder: a new AI-generated post is waiting for your approval.\n\n"
        f"{heading}\n"
        f"{topic_name} > {subtopic_name} · {mode} · {level} · {region_label} · {words} words\n\n"
        f"{preview}\n\n"
        f"Please review it in the admin panel under Posts → Pending Approval.\n"
        f"Post ID: {post.get('_id')}\n"
    )

    esc = html.escape
    image_html = (
        f'<img src="{esc(image_url)}" alt="" style="width:100%;max-width:520px;border-radius:8px;margin:12px 0">'
        if image_url else ""
    )
    paragraphs = "".join(
        f'<p style="color:#444;line-height:1.5;margin:0 0 10px">{esc(p)}</p>'
        for p in preview.split("\n") if p.strip()
    )
    msg.add_alternative(f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;background:#f9f9f9;border-radius:8px">
      <p style="color:#888;font-size:13px;margin:0 0 6px">Reminder · new AI post waiting for approval</p>
      <h2 style="color:#111;margin:0 0 6px">{esc(heading)}</h2>
      <p style="color:#4f46e5;font-size:13px;margin:0">
        {esc(topic_name)} › {esc(subtopic_name)} · {esc(mode)} · {esc(level)} · {region_label} · {words} words
      </p>
      {image_html}
      {paragraphs}
      <p style="color:#444;font-size:14px;margin:16px 0 4px">Please review it in the admin panel under <strong>Posts → Pending Approval</strong>.</p>
      <p style="color:#888;font-size:12px;margin:0">Post ID: {esc(str(post.get('_id')))}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
      <p style="color:#aaa;font-size:12px">© 2026 Meenzo</p>
    </div>
    """, subtype="html")

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ssl.create_default_context(), timeout=30) as smtp:
            smtp.login(MAIL_USER, MAIL_PASSWORD)
            smtp.send_message(msg)
        logger.info("Approval email sent to %s for post %s", APPROVAL_EMAIL_TO, post.get("_id"))
        return True
    except Exception as exc:
        logger.error("Approval email failed: %s", exc)
        return False
