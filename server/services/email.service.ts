import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig;

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'smtppro.zoho.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
      from: {
        name: process.env.SMTP_FROM_NAME || 'RE Data Metrix',
        email: process.env.SMTP_FROM_EMAIL || 'info@redatametrix.com',
      },
    };

    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        tls: {
          rejectUnauthorized: true,
        },
      });

      console.log('✓ Email service initialized successfully');
    } catch (error) {
      console.error('✗ Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✓ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('✗ SMTP connection verification failed:', error);
      return false;
    }
  }

  async sendVerificationEmail(to: string, username: string, token: string): Promise<boolean> {
    const verificationUrl = `${process.env.VITE_APP_URL || 'http://localhost:5000'}/verify-email/${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #1E3A8A; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Welcome to RE Data Metrix</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>Thank you for signing up! To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 14px; color: #6b7280;">${verificationUrl}</p>
            <p style="margin-top: 30px; font-weight: 500;">This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with RE Data Metrix, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Verify Your Email Address - RE Data Metrix',
      html: htmlContent,
    });
  }

  async sendPasswordResetEmail(to: string, username: string, token: string): Promise<boolean> {
    const resetUrl = `${process.env.VITE_APP_URL || 'http://localhost:5000'}/reset-password/${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #1E3A8A; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .alert { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>We received a request to reset your password for your RE Data Metrix account. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 14px; color: #6b7280;">${resetUrl}</p>
            <div class="alert">
              <strong>Security Notice:</strong> This password reset link will expire in 1 hour.
            </div>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Reset Your Password - RE Data Metrix',
      html: htmlContent,
    });
  }

  async sendLenderPasswordResetEmail(to: string, companyName: string, token: string): Promise<boolean> {
    const resetUrl = `${process.env.VITE_APP_URL || 'http://localhost:5000'}/lender/reset-password/${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #1E3A8A; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .alert { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Lender Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${companyName},</p>
            <p>We received a request to reset your password for your RE Data Metrix Lender Portal account. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 14px; color: #6b7280;">${resetUrl}</p>
            <div class="alert">
              <strong>Security Notice:</strong> This password reset link will expire in 1 hour.
            </div>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Reset Your Lender Portal Password - RE Data Metrix',
      html: htmlContent,
    });
  }

  async sendContactConfirmation(to: string, name: string): Promise<boolean> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .checkmark { font-size: 48px; color: #0F7B49; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Message Received</h1>
          </div>
          <div class="content">
            <div class="checkmark">✓</div>
            <p>Hi ${name},</p>
            <p>Thank you for reaching out to RE Data Metrix! We've received your message and will respond within 24 hours.</p>
            <p>Our team is committed to helping real estate investors like you find the best financing solutions for your investment properties.</p>
            <p style="margin-top: 30px;">In the meantime, feel free to explore:</p>
            <ul>
              <li><strong>Deal Analysis Tool</strong> - Analyze your investment properties and compare loan options</li>
              <li><strong>Lender Directory</strong> - Browse our network of verified private lenders</li>
              <li><strong>Investment Resources</strong> - Access our glossary and affiliate programs</li>
            </ul>
            <p>We look forward to connecting with you soon!</p>
            <p style="margin-top: 30px;">Best regards,<br>The RE Data Metrix Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'We Received Your Message - RE Data Metrix',
      html: htmlContent,
    });
  }

  async sendWelcomeEmail(to: string, username: string): Promise<boolean> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .feature-box { background: #F9FAFB; padding: 20px; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px;">Welcome to RE Data Metrix!</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>Your email has been verified successfully! Welcome to the RE Data Metrix platform - your complete solution for real estate investment analysis and private lending connections.</p>
            
            <h2 style="color: #1E3A8A; margin-top: 30px;">Get Started:</h2>
            
            <div class="feature-box">
              <h3 style="margin-top: 0; color: #1E3A8A;">📊 Deal Analysis</h3>
              <p>Run comprehensive flip or rental analysis on any property. Compare financing options side-by-side to maximize your ROI.</p>
            </div>
            
            <div class="feature-box">
              <h3 style="margin-top: 0; color: #0F7B49;">🏦 Lender Directory</h3>
              <p>Browse our network of vetted private lenders. Filter by loan type, state, credit requirements, and more.</p>
            </div>
            
            <div class="feature-box">
              <h3 style="margin-top: 0; color: #D4AF37;">🛠️ Toolbox & Resources</h3>
              <p>Access our investment glossary, affiliate programs, and educational content to level up your investing game.</p>
            </div>
            
            <p style="margin-top: 30px;">Have questions? Our team is here to help. Just reply to this email or use our contact form.</p>
            
            <p>Happy investing!</p>
            <p style="margin-top: 30px;">Best regards,<br>The RE Data Metrix Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to RE Data Metrix - Get Started Today!',
      html: htmlContent,
    });
  }

  async sendLenderCredentials(to: string, username: string, password: string, inviteLink: string): Promise<boolean> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .info-box { background: #F9FAFB; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0F7B49; }
          .button { display: inline-block; padding: 12px 24px; background: #D4AF37; color: #1E3A8A; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Welcome to RE Data Metrix</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>You've been invited to join RE Data Metrix as a lender. To get started, please click the button below to complete your account setup:</p>
            
            <div style="text-align: center;">
              <a href="${inviteLink}" class="button">Complete Your Setup</a>
            </div>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #1E3A8A;">Your Invite Link</h3>
              <p style="margin: 0; font-size: 14px; color: #6b7280; word-break: break-all;">${inviteLink}</p>
            </div>
            
            <p style="margin-top: 30px;"><strong>What's next:</strong></p>
            <ul style="color: #555;">
              <li>Click the setup link above</li>
              <li>Create your password</li>
              <li>Fill in your company information</li>
              <li>Start connecting with investors</li>
            </ul>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">This invite link will expire in 7 days. If you didn't expect this email or have questions, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to RE Data Metrix - Lender Invitation',
      html: htmlContent,
    });
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.config.from.name}" <${this.config.from.email}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        headers: {
          'X-Mailer': 'RE Data Metrix',
          'X-Priority': '3',
          'Importance': 'normal',
          'X-MSMail-Priority': 'normal',
        },
        messageId: `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@redatametrix.com>`,
      });

      console.log(`✓ Email sent successfully to ${options.to} (Message ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error(`✗ Failed to send email to ${options.to}:`, error);
      return false;
    }
  }
}

export const emailService = new EmailService();
