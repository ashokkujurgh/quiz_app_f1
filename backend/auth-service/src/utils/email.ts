import nodemailer, { Transporter } from 'nodemailer';
import { SendEmailOptions, IUser } from '../types';

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

export const sendEmail = async ({ to, subject, html }: SendEmailOptions): Promise<void> => {
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM ?? 'QuizHub <noreply@quizhub.com>',
    to,
    subject,
    html,
  });
};

export const sendVerificationEmail = async (user: IUser, token: string): Promise<void> => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: 'Verify your QuizHub email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#5563DE,#E91E8C);padding:24px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;">Q</h1>
          <p style="color:white;margin:8px 0 0;font-weight:700;">QuizHub</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
          <h2>Hi ${user.name}! 👋</h2>
          <p>Thanks for signing up. Please verify your email address to get started.</p>
          <a href="${verifyUrl}"
            style="display:inline-block;background:linear-gradient(135deg,#5563DE,#E91E8C);
                   color:white;padding:14px 32px;border-radius:8px;text-decoration:none;
                   font-weight:700;margin:16px 0;">
            Verify Email
          </a>
          <p style="color:#888;font-size:13px;">This link expires in 24 hours.<br/>If you didn't sign up, ignore this email.</p>
        </div>
      </div>`,
  });
};

export const sendPasswordResetEmail = async (user: IUser, token: string): Promise<void> => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: 'Reset your QuizHub password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#5563DE,#E91E8C);padding:24px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;">Q</h1>
          <p style="color:white;margin:8px 0 0;font-weight:700;">QuizHub</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password for <strong>${user.email}</strong>.</p>
          <a href="${resetUrl}"
            style="display:inline-block;background:linear-gradient(135deg,#5563DE,#E91E8C);
                   color:white;padding:14px 32px;border-radius:8px;text-decoration:none;
                   font-weight:700;margin:16px 0;">
            Reset Password
          </a>
          <p style="color:#888;font-size:13px;">This link expires in 1 hour.<br/>If you didn't request this, ignore this email.</p>
        </div>
      </div>`,
  });
};
