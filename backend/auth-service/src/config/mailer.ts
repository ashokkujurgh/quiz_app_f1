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
