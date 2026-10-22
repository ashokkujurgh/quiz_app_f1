import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER!,
    pass: process.env.MAIL_PASSWORD!,
  },
});

function emailLayout(title: string, body: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px">
      <h2 style="color:#4f46e5;margin-top:0">${title}</h2>
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="color:#aaa;font-size:12px">© 2026 Meenzo</p>
    </div>
  `;
}

export async function sendVerificationEmail(toEmail: string, verifyUrl: string): Promise<void> {
  await transporter.sendMail({
    from: `"Meenzo" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: 'Verify your Meenzo email',
    html: emailLayout('Verify your email', `
      <p style="color:#444">Thanks for signing up! Click the button below to verify your email address and activate your account. This link expires in <strong>24 hours</strong>.</p>
      <a href="${verifyUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Verify Email</a>
      <p style="color:#888;font-size:13px">If you didn't create a Meenzo account, you can safely ignore this email.</p>
    `),
  });
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<void> {
  await transporter.sendMail({
    from: `"Meenzo" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: 'Reset your Meenzo password',
    html: emailLayout('Reset your password', `
      <p style="color:#444">You requested a password reset for your Meenzo account. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Reset Password</a>
      <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
    `),
  });
}

// ── Premium post review emails (sent for post-service via /internal/email) ────

export function isMailConfigured(): boolean {
  return !!(process.env.MAIL_USER && process.env.MAIL_PASSWORD);
}

const esc = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">${esc(label)}</a>`;

const para = (text: string) => `<p style="color:#444;line-height:1.5">${text}</p>`;

export type EmailTemplate = 'reviewer_assigned' | 'post_approved' | 'post_rejected' | 'violation_updated';

/** Render one of the review templates. Every value from the data is HTML-escaped. */
export function renderTemplate(template: EmailTemplate, d: Record<string, unknown>): { subject: string; html: string } {
  switch (template) {
    case 'reviewer_assigned':
      return {
        subject: `Review needed: ${String(d.title ?? '').slice(0, 80)}`,
        html: emailLayout('A premium post needs your review', [
          para(`<strong>${esc(d.title)}</strong> by ${esc(d.creatorName)} (version ${esc(d.version)}) is waiting for your decision.`),
          d.screeningSummary ? para(`Automatic screening: ${esc(d.screeningSummary)}. This is advice only — your decision is what counts.`) : '',
          button(String(d.reviewUrl ?? ''), 'Open review'),
          `<p style="color:#888;font-size:13px">Approve it, or reject it with a reason the creator can act on.</p>`,
        ].join('')),
      };
    case 'post_approved':
      return {
        subject: `Your premium post is live: ${String(d.title ?? '').slice(0, 80)}`,
        html: emailLayout('Your post was approved 🎉', [
          para(`<strong>${esc(d.title)}</strong> was approved by our review team and is now live on Meenzo.`),
          button(String(d.postUrl ?? ''), 'View your post'),
          `<p style="color:#888;font-size:13px">Earnings shown in your dashboard are estimates until they clear our checks.</p>`,
        ].join('')),
      };
    case 'post_rejected':
      return {
        subject: `Changes needed: ${String(d.title ?? '').slice(0, 80)}`,
        html: emailLayout('Your post was not approved', [
          para(`<strong>${esc(d.title)}</strong> was reviewed and not approved.`),
          para(`<strong>Reviewer feedback:</strong> ${esc(d.reason)}`),
          d.violationNotice ? `<p style="color:#b91c1c;line-height:1.5"><strong>${esc(d.violationNotice)}</strong></p>` : '',
          para(d.wasLive ? 'Your previously approved version stays live.' : 'You can edit the post and submit it again.'),
          button(String(d.dashboardUrl ?? ''), 'Open creator dashboard'),
        ].join('')),
      };
    case 'violation_updated':
      return {
        subject: 'Update on a policy violation',
        html: emailLayout('Violation update', [
          para(esc(d.message)),
          button(String(d.dashboardUrl ?? ''), 'Open creator dashboard'),
        ].join('')),
      };
  }
}

export async function sendTemplateEmail(to: string, template: EmailTemplate, data: Record<string, unknown>): Promise<void> {
  const { subject, html } = renderTemplate(template, data);
  await transporter.sendMail({ from: `"Meenzo" <${process.env.MAIL_USER}>`, to, subject, html });
}
