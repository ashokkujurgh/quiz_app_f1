"""
Email the reviewer a reminder when a new AI post is waiting for approval.
Sends via the same Hostinger SMTP account the auth service uses.
"""
import html
import logging
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import quote
from generator import html_to_text
from config import (
    APPROVAL_EMAIL_TO, MAIL_USER, MAIL_PASSWORD, SMTP_HOST, SMTP_PORT, ADMIN_PANEL_URL, APPROVER_EMAIL,
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

    text    = html_to_text(content)       # posts are HTML; the email shows plain text
    heading = title or text.split("\n")[0][:90]
    preview = text[:600].rsplit(" ", 1)[0] + "…" if len(text) > 600 else text
    words   = len(text.split())
    region_label = "India" if region == "india" else "World"
    # Opens the admin approve page: email is filled in, the reviewer types the password
    approve_url  = f"{ADMIN_PANEL_URL.rstrip('/')}/approve/{post.get('_id')}?email={quote(APPROVER_EMAIL)}"

    msg = EmailMessage()
    msg["Subject"] = f"Reminder: new post waiting for approval — {heading[:80]}"
    msg["From"]    = f'"Meenzo" <{MAIL_USER}>'
    msg["To"]      = APPROVAL_EMAIL_TO

    msg.set_content(
        f"Reminder: a new AI-generated post is waiting for your approval.\n\n"
        f"{heading}\n"
        f"{topic_name} > {subtopic_name} · {mode} · {level} · {region_label} · {words} words\n\n"
        f"{preview}\n\n"
        f"Approve it here (you'll be asked for the admin password):\n{approve_url}\n\n"
        f"Or review it in the admin panel under Posts → Pending Approval.\n"
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
      <a href="{esc(approve_url)}" style="display:inline-block;margin:16px 0 8px;padding:12px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Approve post</a>
      <p style="color:#888;font-size:13px;margin:0 0 4px">You'll be asked for the admin password before the post is approved. You can also review it in the admin panel under Posts → Pending Approval.</p>
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
