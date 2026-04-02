import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { db } from '../db';
import { emailSenderAliases, emailCategorySettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export type EmailCategory = 'transactional' | 'support' | 'webinar' | 'marketing' | 'lender';

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
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
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

  private getBaseUrl(): string {
    if (process.env.VITE_APP_URL) {
      return process.env.VITE_APP_URL;
    }
    
    if (process.env.REPLIT_DEV_DOMAIN) {
      return `https://${process.env.REPLIT_DEV_DOMAIN}`;
    }
    
    return 'http://localhost:5000';
  }

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
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

  async sendVerificationEmail(to: string, username: string, token: string, pendingPlan?: string): Promise<boolean> {
    const verificationUrl = `${this.getBaseUrl()}/verify-email/${token}`;
    const baseUrl = this.getBaseUrl();
    
    const isPremiumSignup = !!pendingPlan;
    const planText = pendingPlan === 'annual' ? 'Annual Plan' : 'Monthly Plan';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .feature-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
          .feature-title { font-weight: 600; color: #1E3A8A; margin-bottom: 4px; font-size: 16px; }
          .feature-desc { color: #64748b; font-size: 14px; margin: 0; }
          .comparison-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          .comparison-table th, .comparison-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          .comparison-table th { background: #f1f5f9; font-weight: 600; }
          .check { color: #22c55e; }
          .x { color: #9ca3af; }
          .btn-primary { display: inline-block; padding: 12px 24px; background-color: #0F7B49; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 10px; }
          .btn-secondary { display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #1E3A8A !important; text-decoration: none; border-radius: 6px; font-weight: 600; border: 2px solid #1E3A8A; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Welcome to RE Data Metrix</h1>
            ${isPremiumSignup ? `<p style="margin: 10px 0 0 0; opacity: 0.9;">You're signing up for the ${planText}</p>` : ''}
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>Your email has been verified successfully! Welcome to the RE Data Metrix platform - your complete solution for real estate investment analysis and private lending connections.</p>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Verify Email & Get Started</a>
            </div>
            
            <h2 style="color: #1E3A8A; margin-top: 30px; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Get Started:</h2>
            
            <div class="feature-card">
              <a href="${baseUrl}/deal-analysis" style="text-decoration: none;">
                <p class="feature-title">Deal Analysis</p>
              </a>
              <p class="feature-desc">Run comprehensive flip or rental analysis on any property. Compare financing options side-by-side to maximize your ROI.</p>
            </div>
            
            <div class="feature-card">
              <a href="${baseUrl}/lenders" style="text-decoration: none;">
                <p class="feature-title">Lender Directory</p>
              </a>
              <p class="feature-desc">Browse our network of vetted private lenders. Filter by loan type, state, credit requirements, and more.</p>
            </div>
            
            <div class="feature-card">
              <a href="${baseUrl}/toolbox" style="text-decoration: none;">
                <p class="feature-title">Toolbox & Resources</p>
              </a>
              <p class="feature-desc">Access our investment glossary, affiliate programs, and educational content to level up your investing game.</p>
            </div>
            
            ${!isPremiumSignup ? `
            <h2 style="color: #1E3A8A; margin-top: 30px; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Free vs Premium:</h2>
            
            <table class="comparison-table">
              <tr>
                <th>Feature</th>
                <th>Free</th>
                <th>Premium</th>
              </tr>
              <tr>
                <td>Property Lookups</td>
                <td>2/month</td>
                <td><span class="check">Unlimited</span></td>
              </tr>
              <tr>
                <td>Wholesale Calculator</td>
                <td>2/month</td>
                <td><span class="check">Unlimited</span></td>
              </tr>
              <tr>
                <td>Save Deals</td>
                <td><span class="x">No</span></td>
                <td><span class="check">Unlimited</span></td>
              </tr>
              <tr>
                <td>PDF/CSV Export</td>
                <td><span class="x">No</span></td>
                <td><span class="check">Yes</span></td>
              </tr>
              <tr>
                <td>Lender Search</td>
                <td><span class="check">Yes</span></td>
                <td><span class="check">Yes</span></td>
              </tr>
            </table>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${baseUrl}/upgrade" class="btn-primary">Upgrade to Premium</a>
              <a href="${baseUrl}/portal/dashboard" class="btn-secondary">Go to My Free Account</a>
            </div>
            ` : `
            <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-top: 24px;">
              <p style="margin: 0; color: #065f46; font-weight: 600;">Next Step: Complete Your Subscription</p>
              <p style="margin: 8px 0 0 0; color: #047857; font-size: 14px;">After verifying your email, you'll be directed to complete payment for your ${planText} subscription.</p>
            </div>
            `}
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 14px; color: #6b7280;">${verificationUrl}</p>
            <p style="margin-top: 20px; font-weight: 500;">This verification link will expire in 24 hours.</p>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">Have questions? Our team is here to help. Just reply to this email or use our <a href="${baseUrl}/contact" style="color: #1E3A8A;">contact form</a>.</p>
            
            <p>Happy investing!</p>
            <p style="margin-bottom: 0;">Best regards,<br>The RE Data Metrix Team</p>
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
      subject: isPremiumSignup ? 'Complete Your Premium Registration - RE Data Metrix' : 'Welcome! Verify Your Email - RE Data Metrix',
      html: htmlContent,
    
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendPasswordResetEmail(to: string, username: string, token: string, customResetUrl?: string, isNewAccount?: boolean): Promise<boolean> {
    const resetUrl = customResetUrl || `${this.getBaseUrl()}/reset-password/${token}`;

    const heading = isNewAccount ? 'Set Your Password' : 'Password Reset Request';
    const intro = isNewAccount
      ? `Your RE Data Metrix account has been created and your subscription is active. Click the button below to set your password and log in:`
      : `We received a request to reset your password for your RE Data Metrix account. Click the button below to create a new password:`;
    const buttonLabel = isNewAccount ? 'Set My Password' : 'Reset Password';
    const footer = isNewAccount
      ? `<p>This link will expire in 1 hour. If you have any trouble, contact us at info@redatametrix.com.</p>`
      : `<div class="alert"><strong>Security Notice:</strong> This password reset link will expire in 1 hour.</div><p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .alert { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">${heading}</h1>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>${intro}</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600;">${buttonLabel}</a>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 14px; color: #6b7280;">${resetUrl}</p>
            ${footer}
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
      subject: isNewAccount ? 'Set Your Password - RE Data Metrix' : 'Reset Your Password - RE Data Metrix',
      html: htmlContent,
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendLenderPasswordResetEmail(to: string, companyName: string, token: string): Promise<boolean> {
    console.log('[LENDER EMAIL] sendLenderPasswordResetEmail called');
    console.log('[LENDER EMAIL] To:', to);
    console.log('[LENDER EMAIL] Company:', companyName);
    
    const resetUrl = `${this.getBaseUrl()}/lender/reset-password/${token}`;
    console.log('[LENDER EMAIL] Reset URL:', resetUrl);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
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
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600;">Reset Password</a>
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
    
      from: await this.getFromForCategory('lender'),
    });
  }

  async sendContractorPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
    const resetUrl = `${this.getBaseUrl()}/contractor/reset-password/${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .alert { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Contractor Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>We received a request to reset your password for your RE Data Metrix Contractor Portal account. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600;">Reset Password</a>
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
      subject: 'Reset Your Contractor Portal Password - RE Data Metrix',
      html: htmlContent,
    
      from: await this.getFromForCategory('transactional'),
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
              <li><a href="${this.getBaseUrl()}/deal-analysis" style="color: #1E3A8A; text-decoration: none;"><strong>Deal Analysis Tool</strong></a> - Start analyzing your investment properties (full results with membership)</li>
              <li><a href="${this.getBaseUrl()}/lenders" style="color: #1E3A8A; text-decoration: none;"><strong>Lender Directory</strong></a> - Preview our network of private lenders (sign up to view details)</li>
              <li><a href="${this.getBaseUrl()}/resources" style="color: #1E3A8A; text-decoration: none;"><strong>Investment Resources</strong></a> - Browse our free glossary of real estate investment terms</li>
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
    
      from: await this.getFromForCategory('support'),
    });
  }

  async sendPrelaunchConfirmation(to: string, name: string): Promise<boolean> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #D4AF37 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .highlight-box { background: #F0FDF4; border: 1px solid #0F7B49; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .feature-box { background: #F9FAFB; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">You're Locked In!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Early Access Pricing Confirmed</p>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Thank you for signing up for early access to RE Data Metrix! You're now on the list to receive exclusive prelaunch pricing when we go live.</p>
            
            <div class="highlight-box">
              <p style="margin: 0; font-size: 18px; color: #0F7B49; font-weight: 600;">Your Early Access Discount is Reserved!</p>
            </div>
            
            <h2 style="color: #1E3A8A; margin-top: 30px; font-size: 18px;">What's Coming:</h2>
            
            <div class="feature-box">
              <strong style="color: #1E3A8A;">📊 Deal Analysis Tools</strong>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">Comprehensive flip and rental property analysis with financing comparisons</p>
            </div>
            
            <div class="feature-box">
              <strong style="color: #0F7B49;">🏦 Lender Matching</strong>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">Connect with verified private lenders matched to your investment criteria</p>
            </div>
            
            <div class="feature-box">
              <strong style="color: #D4AF37;">🛠️ Investors Toolbox</strong>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">Curated tools, resources, and affiliate partnerships for serious investors</p>
            </div>
            
            <p style="margin-top: 25px;">We'll keep you updated on our progress and let you know as soon as we're ready to launch. As an early supporter, you'll get first access at our best pricing.</p>
            
            <p style="margin-top: 20px;">Have questions? Just reply to this email - we'd love to hear from you!</p>
            
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
      subject: 'You\'re Locked In! Early Access Confirmed - RE Data Metrix',
      html: htmlContent,
    
      from: await this.getFromForCategory('support'),
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
    
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendLenderCredentials(to: string, username: string, password: string, inviteLink: string): Promise<boolean> {
    console.log('[LENDER EMAIL] sendLenderCredentials called');
    console.log('[LENDER EMAIL] To:', to);
    console.log('[LENDER EMAIL] Invite link:', inviteLink);
    
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
            <p>You've been invited to join RE Data Metrix as a lender!</p>
            
            <div class="info-box" style="background: #F0F9FF; border-left-color: #1E3A8A;">
              <h3 style="margin-top: 0; color: #1E3A8A;">📺 Before You Begin</h3>
              <p style="margin: 0 0 15px 0;">Watch this short video to see how to set up your lender profile and start connecting with investors:</p>
              <div style="text-align: center;">
                <a href="https://drive.google.com/file/d/18Hs8CHTLId4dtRT15X8Sj1DL7ldWg2hf/view" style="display: inline-block; padding: 10px 20px; background: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600;">▶ Watch Setup Guide (2 min)</a>
              </div>
            </div>
            
            <p style="margin-top: 25px;">When you're ready, click the button below to complete your account setup:</p>
            
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
    
      from: await this.getFromForCategory('lender'),
    });
  }

  async sendContractorInvitation(to: string, companyName: string, inviteLink: string): Promise<boolean> {
    console.log('[CONTRACTOR EMAIL] sendContractorInvitation called');
    console.log('[CONTRACTOR EMAIL] To:', to);
    console.log('[CONTRACTOR EMAIL] Invite link:', inviteLink);
    
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
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Contractor Partner Invitation</p>
          </div>
          <div class="content">
            <p>Hello ${companyName},</p>
            <p>You've been invited to join RE Data Metrix as a contractor partner! Our platform connects real estate investors with trusted contractors like you.</p>
            
            <p style="margin-top: 25px;">Click the button below to complete your contractor profile:</p>
            
            <div style="text-align: center;">
              <a href="${inviteLink}" class="button">Complete Your Profile</a>
            </div>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #1E3A8A;">Your Invite Link</h3>
              <p style="margin: 0; font-size: 14px; color: #6b7280; word-break: break-all;">${inviteLink}</p>
            </div>
            
            <p style="margin-top: 30px;"><strong>What you'll need to complete your profile:</strong></p>
            <ul style="color: #555;">
              <li>Your contact information</li>
              <li>Company details and description</li>
              <li>Service specialties (rehabs, new construction, etc.)</li>
              <li>License number (if applicable)</li>
              <li>Insurance and bonding information</li>
              <li>Service regions you work in</li>
            </ul>
            
            <p style="margin-top: 30px;"><strong>Benefits of being listed:</strong></p>
            <ul style="color: #555;">
              <li>Connect with active real estate investors</li>
              <li>Showcase your work to our subscriber base</li>
              <li>Receive leads for projects in your service area</li>
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
      subject: 'Join RE Data Metrix as a Contractor Partner',
      html: htmlContent,
    
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendCompInviteEmail(to: string, compCode: string, expiresAt: Date): Promise<boolean> {
    const registerUrl = `${this.getBaseUrl()}/register?comp=${compCode}`;
    const expiryFormatted = expiresAt.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #D4AF37 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .code-box { background: #F0F9FF; border: 2px solid #1E3A8A; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .code { font-size: 28px; font-weight: bold; color: #1E3A8A; letter-spacing: 3px; font-family: monospace; }
          .feature-box { background: #F9FAFB; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">You're Invited!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Free Premium Access to RE Data Metrix</p>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You've been invited to join RE Data Metrix with complimentary premium access! As a valued beta tester, you'll have full access to all our premium features.</p>
            
            <div class="code-box">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Your Comp Code:</p>
              <div class="code">${compCode}</div>
            </div>
            
            <div style="text-align: center;">
              <a href="${registerUrl}" style="display: inline-block; padding: 14px 28px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; margin: 15px 0; font-weight: 600; font-size: 16px;">Create Your Account</a>
            </div>
            
            <h2 style="color: #1E3A8A; margin-top: 30px; font-size: 18px;">Your Premium Access Includes:</h2>
            
            <div class="feature-box">
              <strong style="color: #1E3A8A;">📊 Full Deal Analysis</strong>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">Complete flip and rental analysis with financing comparisons</p>
            </div>
            
            <div class="feature-box">
              <strong style="color: #0F7B49;">🏦 Lender Matching</strong>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">Search and connect with private lenders matched to your criteria</p>
            </div>
            
            <div class="feature-box">
              <strong style="color: #D4AF37;">🛠️ Full Toolbox Access</strong>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">Investment glossary, affiliate programs, and educational resources</p>
            </div>
            
            <p style="margin-top: 25px; padding: 15px; background: #FEF3C7; border-radius: 6px; font-size: 14px;">
              <strong>Note:</strong> This invitation expires on <strong>${expiryFormatted}</strong>. Register before then to activate your free premium access.
            </p>
            
            <p style="margin-top: 20px;">If you have any questions, just reply to this email. We're excited to have you!</p>
            
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
      subject: 'Your Invitation to RE Data Metrix - Free Premium Access',
      html: htmlContent,
    
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendAuditorInviteEmail(to: string, inviteCode: string, companyName: string | null, expiresAt: Date): Promise<boolean> {
    const registerUrl = `${this.getBaseUrl()}/register?auditor=${inviteCode}`;
    const expiryFormatted = expiresAt.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #6B21A8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .code-box { background: #F5F3FF; border: 2px solid #6B21A8; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .code { font-size: 24px; font-weight: bold; color: #6B21A8; letter-spacing: 2px; font-family: monospace; }
          .feature-box { background: #F9FAFB; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Auditor Access Invitation</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">RE Data Metrix Platform Access</p>
          </div>
          <div class="content">
            <p>Hello${companyName ? ' (' + companyName + ')' : ''},</p>
            <p>You've been invited to join RE Data Metrix as an <strong>Auditor</strong>. This gives you read-only access to the platform's admin area for reporting, analytics, and performance monitoring.</p>
            
            <div class="code-box">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Your Auditor Invite Code:</p>
              <div class="code">${inviteCode}</div>
            </div>
            
            <div style="text-align: center;">
              <a href="${registerUrl}" style="display: inline-block; padding: 14px 28px; background-color: #6B21A8; color: #ffffff !important; text-decoration: none; border-radius: 6px; margin: 15px 0; font-weight: 600; font-size: 16px;">Create Your Account</a>
            </div>
            
            <h2 style="color: #1E3A8A; margin-top: 30px; font-size: 18px;">Your Auditor Access Includes:</h2>
            
            <div class="feature-box">
              <strong style="color: #6B21A8;">View-Only Admin Dashboard</strong>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">Access all admin reports, analytics, and user data in read-only mode</p>
            </div>
            
            <div class="feature-box">
              <strong style="color: #1E3A8A;">Performance Analytics</strong>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">View affiliate stats, subscription reports, marketing pixel data, and more</p>
            </div>
            
            <div class="feature-box">
              <strong style="color: #0F7B49;">Platform Monitoring</strong>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">Monitor user activity, webinar registrations, and lender performance</p>
            </div>
            
            <p style="margin-top: 25px; padding: 15px; background: #FEF3C7; border-radius: 6px; font-size: 14px;">
              <strong>Note:</strong> This invitation expires on <strong>${expiryFormatted}</strong>. Register before then to activate your auditor access.
            </p>
            
            <p style="margin-top: 20px;">If you have any questions, just reply to this email.</p>
            
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
      subject: 'RE Data Metrix - Auditor Access Invitation',
      html: htmlContent,
    
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendLenderSavedNotification(to: string, companyName: string, memberName: string): Promise<boolean> {
    const reportUrl = `${this.getBaseUrl()}/lender-saved-by`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .highlight-box { background: #F0FDF4; border: 1px solid #BBF7D0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">You've Been Saved!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">An investor just added you to their favorites</p>
          </div>
          <div class="content">
            <p>Hello ${companyName},</p>
            <p>Great news! An investor on RE Data Metrix has saved your lender profile to their favorites list.</p>
            
            <div class="highlight-box">
              <p style="margin: 0; font-size: 18px; color: #0F7B49; font-weight: 600;">${memberName}</p>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">just saved you as a preferred lender</p>
            </div>
            
            <p>This means they're interested in your lending products and may reach out for financing.</p>
            
            <div style="text-align: center;">
              <a href="${reportUrl}" style="display: inline-block; padding: 14px 28px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; font-size: 16px;">See Who Saved You</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Log in to your Lender Portal to view the complete list of investors who have saved your profile.</p>
            
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
      subject: 'An Investor Just Saved You - RE Data Metrix',
      html: htmlContent,
    
      from: await this.getFromForCategory('lender'),
    });
  }

  async sendLoanProductChangedNotification(
    to: string, 
    companyName: string, 
    productName: string, 
    changeType: 'created' | 'updated'
  ): Promise<boolean> {
    const portalUrl = `${this.getBaseUrl()}/lender-portal`;
    const actionText = changeType === 'created' ? 'added' : 'updated';
    const headerText = changeType === 'created' ? 'New Product Added' : 'Product Updated';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .highlight-box { background: #F0FDF4; border: 1px solid #BBF7D0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">${headerText}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your loan product has been ${actionText}</p>
          </div>
          <div class="content">
            <p>Hello ${companyName},</p>
            <p>This is a confirmation that your loan product has been successfully ${actionText} on RE Data Metrix.</p>
            
            <div class="highlight-box">
              <p style="margin: 0; font-size: 18px; color: #0F7B49; font-weight: 600;">${productName}</p>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">was ${actionText} successfully</p>
            </div>
            
            <p>Your updated loan products are now visible to investors searching for financing options.</p>
            
            <div style="text-align: center;">
              <a href="${portalUrl}" style="display: inline-block; padding: 14px 28px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; font-size: 16px;">View Your Products</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Log in to your Lender Portal to manage all your loan products.</p>
            
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
      subject: `Loan Product ${changeType === 'created' ? 'Added' : 'Updated'} - RE Data Metrix`,
      html: htmlContent,
    
      from: await this.getFromForCategory('lender'),
    });
  }

  async sendLenderContactNotification(
    to: string, 
    companyName: string, 
    data: {
      investorName: string;
      investorEmail: string;
      investorPhone?: string;
      propertyAddress: string;
      productName: string;
      loanType: string;
      estProfit: string;
      cashOnCashRoi: string;
      annualizedRoi: string;
      estOutOfPocket: string;
      interestRate?: string;
      maxLtvBuy?: string;
      points?: string;
      timeToClose?: string;
      projectCosts: string;
      costsAndCarrying: string;
      exitSale: string;
    }
  ): Promise<boolean> {
    const portalUrl = `${this.getBaseUrl()}/lender-portal`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #D4AF37 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .investor-box { background: #F0F9FF; border: 1px solid #93C5FD; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .property-box { background: #F0FDF4; border: 1px solid #BBF7D0; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .metrics-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .metrics-table th { text-align: left; padding: 12px; background: #F9FAFB; border: 1px solid #e5e7eb; color: #1E3A8A; font-weight: 600; }
          .metrics-table td { padding: 12px; border: 1px solid #e5e7eb; }
          .metrics-table tr:nth-child(even) { background: #FAFAFA; }
          .section-title { font-size: 16px; font-weight: 600; color: #1E3A8A; margin: 25px 0 15px 0; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">New Investor Inquiry!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">An investor is interested in your loan product</p>
          </div>
          <div class="content">
            <p>Hello ${companyName},</p>
            <p><strong>${data.investorName}</strong> selected you as a possible lender for their property at <strong>"${data.propertyAddress}"</strong>. They're interested in your <strong>"${data.productName}"</strong> product.</p>
            
            <div class="investor-box">
              <h3 style="margin: 0 0 15px 0; color: #1E3A8A;">Investor Contact Information</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${data.investorName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${data.investorEmail}" style="color: #1E3A8A;">${data.investorEmail}</a></p>
              ${data.investorPhone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> <a href="tel:${data.investorPhone}" style="color: #1E3A8A;">${data.investorPhone}</a></p>` : ''}
            </div>
            
            <div class="property-box">
              <h3 style="margin: 0 0 15px 0; color: #0F7B49;">Property & Loan Details</h3>
              <p style="margin: 5px 0;"><strong>Property Address:</strong> ${data.propertyAddress}</p>
              <p style="margin: 5px 0;"><strong>Selected Loan Product:</strong> ${data.productName}</p>
              <p style="margin: 5px 0;"><strong>Loan Type:</strong> ${data.loanType}</p>
            </div>
            
            <h3 class="section-title">Deal Metrics</h3>
            <table class="metrics-table">
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
              <tr>
                <td>Est. Profit</td>
                <td style="font-weight: 600; color: #0F7B49;">${data.estProfit}</td>
              </tr>
              <tr>
                <td>Cash-on-Cash ROI</td>
                <td>${data.cashOnCashRoi}</td>
              </tr>
              <tr>
                <td>Annualized ROI</td>
                <td>${data.annualizedRoi}</td>
              </tr>
              <tr>
                <td>Est. Out of Pocket</td>
                <td>${data.estOutOfPocket}</td>
              </tr>
            </table>
            
            <h3 class="section-title">Loan Terms</h3>
            <table class="metrics-table">
              <tr>
                <th>Term</th>
                <th>Value</th>
              </tr>
              ${data.interestRate ? `<tr><td>Interest Rate</td><td>${data.interestRate}</td></tr>` : ''}
              ${data.maxLtvBuy ? `<tr><td>Max LTV (Buy)</td><td>${data.maxLtvBuy}</td></tr>` : ''}
              ${data.points ? `<tr><td>Points</td><td>${data.points}</td></tr>` : ''}
              ${data.timeToClose ? `<tr><td>Time to Close</td><td>${data.timeToClose}</td></tr>` : ''}
            </table>
            
            <h3 class="section-title">Project Summary</h3>
            <table class="metrics-table">
              <tr>
                <th>Category</th>
                <th>Amount</th>
              </tr>
              <tr>
                <td>Project Costs</td>
                <td>${data.projectCosts}</td>
              </tr>
              <tr>
                <td>Costs & Carrying</td>
                <td>${data.costsAndCarrying}</td>
              </tr>
              <tr>
                <td>Exit & Sale</td>
                <td>${data.exitSale}</td>
              </tr>
            </table>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${portalUrl}" style="display: inline-block; padding: 14px 28px; background-color: #D4AF37; color: #1E3A8A !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; font-size: 16px;">View All Inquiries</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Log in to your Lender Portal to view all investor inquiries and manage your loan products.</p>
            
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
      subject: `New Investor Inquiry - ${data.propertyAddress} - RE Data Metrix`,
      html: htmlContent,
    
      from: await this.getFromForCategory('lender'),
    });
  }

  async sendDemoAccessEmail(to: string, contactName: string | null, demoUrl: string, expiresAt: Date): Promise<boolean> {
    const displayName = contactName || 'there';
    const expiresFormatted = expiresAt.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">RE Data Metrix Demo Access</h1>
          </div>
          <div class="content">
            <p>Hi ${displayName},</p>
            <p>You've been granted demo access to RE Data Metrix! Use the link below to explore our platform and see how we can help with your real estate investment analysis.</p>
            <div style="text-align: center;">
              <a href="${demoUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600;">Access Demo</a>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 14px; color: #6b7280;">${demoUrl}</p>
            <p style="margin-top: 30px; font-weight: 500;">This demo access link expires on ${expiresFormatted}.</p>
            <p>If you have any questions, please don't hesitate to reach out!</p>
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
      subject: 'Your RE Data Metrix Demo Access Link',
      html: htmlContent,
    
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendClosingReminderEmail(
    to: string, 
    username: string, 
    propertyAddress: string,
    estimatedClosingDate: Date,
    daysUntilClosing: number,
    dealId: string
  ): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const closingDateFormatted = estimatedClosingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let urgencyMessage = '';
    let urgencyColor = '#1E3A8A';
    
    if (daysUntilClosing === 0) {
      urgencyMessage = 'Your closing is scheduled for TODAY!';
      urgencyColor = '#DC2626';
    } else if (daysUntilClosing === 1) {
      urgencyMessage = 'Your closing is TOMORROW!';
      urgencyColor = '#EA580C';
    } else if (daysUntilClosing <= 3) {
      urgencyMessage = `Only ${daysUntilClosing} days until closing!`;
      urgencyColor = '#D97706';
    } else {
      urgencyMessage = `${daysUntilClosing} days until your scheduled closing`;
      urgencyColor = '#0F7B49';
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .urgency-box { padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .property-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
          .btn-primary { display: inline-block; padding: 12px 24px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 10px; }
          .btn-secondary { display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #6b7280 !important; text-decoration: none; border-radius: 6px; font-weight: 400; border: 1px solid #d1d5db; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Closing Reminder</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your deal is progressing!</p>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            
            <div class="urgency-box" style="background: ${urgencyColor}15; border: 2px solid ${urgencyColor};">
              <p style="margin: 0; font-size: 18px; color: ${urgencyColor}; font-weight: 600;">${urgencyMessage}</p>
              <p style="margin: 8px 0 0 0; color: #64748b;">Closing Date: ${closingDateFormatted}</p>
            </div>
            
            <div class="property-box">
              <p style="margin: 0 0 4px 0; color: #64748b; font-size: 14px;">Property Address:</p>
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1E3A8A;">${propertyAddress}</p>
            </div>
            
            <p>Make sure you have everything ready for closing day:</p>
            <ul style="color: #475569;">
              <li>Final walkthrough scheduled</li>
              <li>Funds ready for transfer</li>
              <li>All required documents prepared</li>
              <li>Insurance and title in order</li>
            </ul>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${baseUrl}/portal/deals" class="btn-primary">View Deal Details</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">Once your deal closes, don't forget to update your deal status in RE Data Metrix to track your success!</p>
            
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #0369a1; font-size: 15px;">Coming Soon: Custom Email Reminders</p>
              <p style="margin: 0 0 12px 0; color: #475569; font-size: 14px;">Want to send your own reminders to your title company, agent, and partners with your own talking points and timeline? We're building it — and your input shapes what we build.</p>
              <a href="${baseUrl}/feedback?feature=custom_email_workflow" style="display: inline-block; padding: 8px 16px; background-color: #0369a1; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 13px;">Share Your Input</a>
            </div>

            <p style="margin-top: 30px;">Best regards,<br>The RE Data Metrix Team</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
            <a href="${baseUrl}/portal/deals" class="btn-secondary">Stop receiving reminders for this deal</a>
          </div>
        </div>
      </body>
      </html>
    `;

    const subjectLine = daysUntilClosing === 0 
      ? `TODAY: Closing Day - ${propertyAddress}`
      : daysUntilClosing === 1 
        ? `TOMORROW: Closing Reminder - ${propertyAddress}`
        : `${daysUntilClosing} Days Until Closing - ${propertyAddress}`;

    return this.sendEmail({
      to,
      subject: subjectLine,
      html: htmlContent,
    
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendWebinarConfirmationEmail(
    to: string,
    name: string,
    registrationId?: string,
    webinarDate: Date = new Date('2026-02-27T12:00:00-05:00'),
    webinarLink: string = 'https://meet.zoho.com/xecs-lpa-ohi'
  ): Promise<boolean> {
    const firstName = name.split(' ')[0];
    const baseUrl = this.getBaseUrl();
    
    // Build RSVP confirmation URLs if registrationId is provided
    const confirmUrl = registrationId ? `${baseUrl}/api/webinar/rsvp/${registrationId}?response=confirmed` : null;
    const declineUrl = registrationId ? `${baseUrl}/api/webinar/rsvp/${registrationId}?response=declined` : null;
    
    const dateFormatted = webinarDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const timeFormatted = webinarDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .details-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; margin: 8px 0; }
          .detail-label { font-weight: 600; color: #1E3A8A; min-width: 100px; }
          .btn-primary { display: inline-block; padding: 14px 28px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .learn-list { background: #f8fafc; border-radius: 8px; padding: 16px 16px 16px 32px; margin: 16px 0; }
          .learn-list li { margin: 8px 0; color: #475569; }
          .exclusive-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">You're Registered!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">RE Data Metrix Soft Launch Webinar</p>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>Thank you for registering for the <strong>RE Data Metrix Soft Launch Webinar</strong>!</p>
            
            <div class="details-box">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #1E3A8A; font-size: 16px;">Webinar Details:</p>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 100px;">Date:</td>
                  <td style="padding: 4px 0; font-weight: 600;">${dateFormatted}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Time:</td>
                  <td style="padding: 4px 0; font-weight: 600;">${timeFormatted}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Duration:</td>
                  <td style="padding: 4px 0; font-weight: 600;">Approximately 45-60 minutes</td>
                </tr>
              </table>
            </div>
            
            <p style="font-weight: 600; margin-bottom: 8px;">What You'll Learn:</p>
            <ul class="learn-list">
              <li>How to analyze real estate deals in minutes</li>
              <li>Using the Max Offer Calculator for wholesale deals</li>
              <li>Finding comparable sales with ARV Helper</li>
              <li>Connecting with hard money lenders</li>
            </ul>
            
            ${confirmUrl ? `
            <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #047857;">Confirm Your Attendance</p>
              <p style="margin: 0 0 16px 0; color: #065f46; font-size: 14px;">Let us know if you'll be joining us live:</p>
              <div style="display: inline-block;">
                <a href="${confirmUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 12px;">Yes, I'll Be There!</a>
                <a href="${declineUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f3f4f6; color: #6b7280 !important; text-decoration: none; border-radius: 6px; font-weight: 500;">Can't Make It</a>
              </div>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 28px 0;">
              <a href="${webinarLink}" class="btn-primary">Join the Webinar</a>
            </div>
            
            <div class="exclusive-box">
              <p style="margin: 0; font-weight: 600; color: #92400e;">Exclusive Offer</p>
              <p style="margin: 8px 0 0 0; color: #78350f;">Stay until the end of the webinar for an exclusive offer available only to live attendees!</p>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">A calendar invite is attached to this email. Add it to your calendar so you don't miss out!</p>
            
            <p style="margin-top: 24px;">See you there,<br><strong>The RE Data Metrix Team</strong></p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
            <p style="margin: 0; font-size: 12px;">If you have any questions, reply to this email or contact us at info@redatametrix.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate ICS calendar file
    const startDate = webinarDate;
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
    
    const formatICSDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//RE Data Metrix//Webinar//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
DTSTAMP:${formatICSDate(new Date())}
UID:webinar-soft-launch-2026@redatametrix.com
ORGANIZER;CN=RE Data Metrix:mailto:info@redatametrix.com
SUMMARY:RE Data Metrix Soft Launch Webinar
DESCRIPTION:Join us for the RE Data Metrix Soft Launch Webinar!\\n\\nLearn how to analyze real estate deals in minutes\\, use the Max Offer Calculator for wholesale deals\\, find comparable sales with ARV Helper\\, and connect with hard money lenders.\\n\\nJoin link: ${webinarLink}\\n\\nStay until the end for an exclusive offer!
LOCATION:${webinarLink}
URL:${webinarLink}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Reminder: RE Data Metrix Webinar starts in 30 minutes!
END:VALARM
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Reminder: RE Data Metrix Webinar is tomorrow!
END:VALARM
END:VEVENT
END:VCALENDAR`;

    return this.sendEmail({
      to,
      subject: "You're Registered! RE Data Metrix Soft Launch Webinar - Jan 30, 2026",
      html: htmlContent,
      attachments: [
        {
          filename: 'webinar-invite.ics',
          content: icsContent,
          contentType: 'text/calendar'
        }
      ],
      from: await this.getFromForCategory('webinar'),
    });
  }

  async sendWebinarDayBeforeReminder(
    to: string,
    name: string,
    registrationId: string,
    webinarLink: string = 'https://meet.zoho.com/xecs-lpa-ohi'
  ): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    
    const confirmUrl = `${baseUrl}/api/webinar/rsvp/${registrationId}?response=confirmed`;
    const declineUrl = `${baseUrl}/api/webinar/rsvp/${registrationId}?response=declined`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Webinar Tomorrow!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f7;">
          <tr>
            <td style="padding: 20px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">RE Data Metrix</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h2 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 28px;">Your Webinar is Tomorrow!</h2>
                    </div>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Hi ${name},
                    </p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                      This is a friendly reminder that the <strong>RE Data Metrix Soft Launch Webinar</strong> is happening <strong>tomorrow</strong>!
                    </p>

                    <!-- Event Details Box -->
                    <div style="background-color: #f8fafc; border-radius: 8px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #1e3a5f;">
                      <h3 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 18px;">Event Details</h3>
                      <p style="color: #333; font-size: 15px; margin: 0 0 8px 0;"><strong>Date:</strong> Friday, February 27, 2026</p>
                      <p style="color: #333; font-size: 15px; margin: 0 0 8px 0;"><strong>Time:</strong> 12:00 PM EST (9:00 AM PST)</p>
                      <p style="color: #333; font-size: 15px; margin: 0;"><strong>Duration:</strong> 60 minutes</p>
                    </div>

                    <!-- What You'll Learn -->
                    <div style="margin-bottom: 25px;">
                      <h3 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 18px;">What You'll Learn:</h3>
                      <ul style="color: #333; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li>How to analyze real estate deals in minutes</li>
                        <li>Using the Max Offer Calculator for wholesale deals</li>
                        <li>Finding comparable sales with ARV Helper</li>
                        <li>Connecting with hard money lenders</li>
                      </ul>
                    </div>

                    <p style="color: #d97706; font-size: 16px; font-weight: 600; margin: 0 0 30px 0; text-align: center;">
                      Stay until the end for an exclusive offer only for webinar attendees!
                    </p>

                    <!-- RSVP Section -->
                    <div style="background-color: #fff7ed; border-radius: 8px; padding: 25px; margin-bottom: 25px; text-align: center;">
                      <h3 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 18px;">Please Confirm Your Attendance</h3>
                      <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">We're finalizing our headcount. Please let us know if you'll be joining us:</p>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                        <tr>
                          <td style="padding-right: 10px;">
                            <a href="${confirmUrl}" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">Yes, I'll be there!</a>
                          </td>
                          <td style="padding-left: 10px;">
                            <a href="${declineUrl}" style="display: inline-block; background-color: #6b7280; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">Sorry, I can't make it</a>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Join Link -->
                    <div style="text-align: center; margin-bottom: 20px;">
                      <p style="color: #333; font-size: 16px; margin: 0 0 15px 0;"><strong>Join Link:</strong></p>
                      <a href="${webinarLink}" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Join the Webinar</a>
                      <p style="color: #666; font-size: 13px; margin: 15px 0 0 0;">
                        Save this link - we'll send one more reminder 30 minutes before we go live.
                      </p>
                    </div>

                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
                      See you tomorrow!<br><br>
                      <strong>The RE Data Metrix Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">
                      You're receiving this because you registered for the RE Data Metrix Soft Launch Webinar.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: "Tomorrow: RE Data Metrix Soft Launch Webinar - Confirm Your Spot",
      html: htmlContent,
    
      from: await this.getFromForCategory('webinar'),
    });
  }

  async sendWebinarFinalReminder(
    to: string,
    name: string,
    webinarLink: string = 'https://meet.zoho.com/xecs-lpa-ohi'
  ): Promise<boolean> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>We're Going Live!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f7;">
          <tr>
            <td style="padding: 20px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">RE Data Metrix</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px; text-align: center;">
                    <div style="margin-bottom: 25px;">
                      <h2 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 32px;">We're Going Live in 30 Minutes!</h2>
                    </div>
                    
                    <p style="color: #333; font-size: 18px; line-height: 1.6; margin: 0 0 25px 0;">
                      Hi ${name},
                    </p>
                    
                    <p style="color: #333; font-size: 18px; line-height: 1.6; margin: 0 0 30px 0;">
                      The <strong>RE Data Metrix Soft Launch Webinar</strong> starts in just 30 minutes!
                    </p>

                    <!-- Time Box -->
                    <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 30px; display: inline-block;">
                      <p style="color: #92400e; font-size: 20px; font-weight: 600; margin: 0;">
                        Starting at: 12:00 PM EST (9:00 AM PST)
                      </p>
                    </div>

                    <!-- Join Button -->
                    <div style="margin-bottom: 30px;">
                      <a href="${webinarLink}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 20px 50px; border-radius: 8px; font-weight: 700; font-size: 20px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">Join the Webinar Now</a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; margin: 0 0 25px 0;">
                      ${webinarLink}
                    </p>

                    <!-- Quick Tips -->
                    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: left;">
                      <h3 style="color: #1e3a5f; margin: 0 0 12px 0; font-size: 16px;">Quick Tips:</h3>
                      <ul style="color: #333; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li>Click the link a few minutes early to test your connection</li>
                        <li>Have questions ready - we'll have Q&A at the end</li>
                        <li><strong>Stay until the end</strong> for an exclusive offer!</li>
                      </ul>
                    </div>

                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">
                      See you in a few minutes!<br><br>
                      <strong>The RE Data Metrix Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">
                      You're receiving this because you registered for the RE Data Metrix Soft Launch Webinar.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: "Starting in 30 Minutes: RE Data Metrix Soft Launch Webinar",
      html: htmlContent,
    
      from: await this.getFromForCategory('webinar'),
    });
  }

  async getFromForCategory(category: EmailCategory): Promise<{ name: string; email: string }> {
    try {
      const [setting] = await db.select().from(emailCategorySettings).where(eq(emailCategorySettings.category, category)).limit(1);
      if (setting?.aliasId) {
        const [alias] = await db.select().from(emailSenderAliases).where(eq(emailSenderAliases.id, setting.aliasId)).limit(1);
        if (alias) return { name: alias.fromName, email: alias.fromEmail };
      }
      // Try global default alias
      const [defaultAlias] = await db.select().from(emailSenderAliases).where(eq(emailSenderAliases.isDefault, true)).limit(1);
      if (defaultAlias) return { name: defaultAlias.fromName, email: defaultAlias.fromEmail };
    } catch {
      // Fall through to env var fallback
    }
    return { name: this.config.from.name, email: this.config.from.email };
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{ filename: string; content: string; contentType?: string }>;
    from?: { name: string; email: string };
  }): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    const fromName = options.from?.name ?? this.config.from.name;
    const fromEmail = options.from?.email ?? this.config.from.email;

    try {
      console.log(`[EMAIL] Attempting to send to: ${options.to}`);
      console.log(`[EMAIL] From: ${fromName} <${fromEmail}>`);
      console.log(`[EMAIL] SMTP Host: ${this.config.host}:${this.config.port}`);
      
      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
        headers: {
          'X-Mailer': 'RE Data Metrix',
          'X-Priority': '3',
          'Importance': 'normal',
          'X-MSMail-Priority': 'normal',
        },
        messageId: `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@redatametrix.com>`,
      });

      console.log(`✓ Email sent successfully to ${options.to}`);
      console.log(`  Message ID: ${info.messageId}`);
      console.log(`  Response: ${info.response}`);
      console.log(`  Accepted: ${info.accepted?.join(', ')}`);
      console.log(`  Rejected: ${info.rejected?.join(', ') || 'none'}`);
      return true;
    } catch (error) {
      console.error(`✗ Failed to send email to ${options.to}:`);
      console.error('  Error details:', error);
      if (error instanceof Error) {
        console.error('  Error message:', error.message);
        console.error('  Error stack:', error.stack);
      }
      return false;
    }
  }
  async sendWebinarRemovalNotification(
    to: string,
    name: string
  ): Promise<boolean> {
    const firstName = name.split(' ')[0];
    const baseUrl = this.getBaseUrl();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .btn-primary { display: inline-block; padding: 14px 28px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">RE Data Metrix</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Webinar Registration Update</p>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>At your request, RE Data Metrix has removed you from the registrants for the upcoming webinar.</p>
            
            <p>Please watch your email and check our website to be notified of future events.</p>
            
            <div style="text-align: center; margin: 28px 0;">
              <a href="${baseUrl}" class="btn-primary">Visit RE Data Metrix</a>
            </div>
            
            <p>Thank you for your interest in RE Data Metrix!</p>
            
            <p style="margin-top: 24px;">Best regards,<br><strong>The RE Data Metrix Team</strong></p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
            <p style="margin: 0; font-size: 12px;">If you have any questions, reply to this email or contact us at info@redatametrix.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: "Webinar Registration Update - RE Data Metrix",
      html: htmlContent,
    
      from: await this.getFromForCategory('webinar'),
    });
  }

  async sendWebinarThankYouEmail(
    to: string,
    name: string,
    promoCode: string,
    facebookGroupUrl: string
  ): Promise<boolean> {
    const firstName = name.split(' ')[0];
    const baseUrl = this.getBaseUrl();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .btn-primary { display: inline-block; padding: 14px 28px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .btn-secondary { display: inline-block; padding: 12px 24px; background-color: #1877F2; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; }
          .promo-box { background: linear-gradient(135deg, #0F7B49 0%, #1E3A8A 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .promo-code { font-size: 28px; font-weight: bold; letter-spacing: 2px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Thank You for Attending!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">RE Data Metrix Webinar</p>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>Thank you so much for joining us at today's RE Data Metrix webinar! We truly appreciate you taking the time to learn about our platform and how it can help you analyze real estate investment deals.</p>
            
            <p>As promised, here's your exclusive promo code for <strong>6 months of FREE access</strong> to RE Data Metrix:</p>
            
            <div class="promo-box">
              <p style="margin: 0 0 5px 0; font-size: 14px;">YOUR EXCLUSIVE PROMO CODE</p>
              <div class="promo-code">${promoCode}</div>
              <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">Limited to first 100 users - act now!</p>
            </div>
            
            <div style="text-align: center; margin: 28px 0;">
              <a href="${baseUrl}/beta-signup?code=${promoCode}" class="btn-primary">Create Your Free Account</a>
            </div>
            
            <p>Click the button above or enter promo code <strong>${promoCode}</strong> during registration to activate your 6-month free access. This gives you unlimited access to:</p>
            
            <ul style="margin: 16px 0; padding-left: 20px;">
              <li>Deal Analysis Wizard for Fix & Flip and Rental properties</li>
              <li>ARV Helper with comparable sales data</li>
              <li>Lender Directory with real financing options</li>
              <li>Wholesale Max Offer Calculator</li>
              <li>And much more!</li>
            </ul>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            
            <p><strong>Join Our Community!</strong></p>
            
            <p>After you sign up, we invite you to join our private Facebook group where you can connect with other real estate investors, share deals, ask questions, and get tips from the community.</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${facebookGroupUrl}" class="btn-secondary">Join Our Facebook Group</a>
            </div>
            
            <p>If you have any questions about the platform or need help getting started, just reply to this email - we're here to help!</p>
            
            <p style="margin-top: 24px;">Best regards,<br><strong>The RE Data Metrix Team</strong></p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
            <p style="margin: 0; font-size: 12px;">If you have any questions, reply to this email or contact us at info@redatametrix.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: "Thank You for Attending! Here's Your FREE 6-Month Access Code",
      html: htmlContent,
    
      from: await this.getFromForCategory('webinar'),
    });
  }

  async sendMissedWebinarEmail(
    to: string,
    name: string,
    nextWebinarDate: string
  ): Promise<boolean> {
    const firstName = name.split(' ')[0];
    const baseUrl = this.getBaseUrl();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .btn-primary { display: inline-block; padding: 14px 28px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .date-box { background: #f0f9ff; border: 2px solid #0284c7; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .date-text { font-size: 24px; font-weight: bold; color: #0284c7; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Sorry We Missed You!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">RE Data Metrix Webinar</p>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>We noticed you weren't able to make it to our recent RE Data Metrix webinar. We completely understand - life gets busy!</p>
            
            <p>Good news: We're hosting another webinar soon, and we'd love for you to join us!</p>
            
            <div class="date-box">
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">NEXT WEBINAR DATE</p>
              <div class="date-text">${nextWebinarDate}</div>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">12:00 PM Eastern Time</p>
            </div>
            
            <p>During the webinar, you'll learn how RE Data Metrix can help you:</p>
            
            <ul style="margin: 16px 0; padding-left: 20px;">
              <li>Analyze Fix & Flip and Rental property deals in minutes</li>
              <li>Find comparable sales data for accurate ARV estimates</li>
              <li>Connect with lenders who offer real financing options</li>
              <li>Make smarter investment decisions with data-driven insights</li>
            </ul>
            
            <p><strong>Plus, all attendees receive an exclusive promo code for 6 months of FREE access!</strong></p>
            
            <div style="text-align: center; margin: 28px 0;">
              <a href="${baseUrl}/webinar" class="btn-primary">Register for the Next Webinar</a>
            </div>
            
            <p>We hope to see you there!</p>
            
            <p style="margin-top: 24px;">Best regards,<br><strong>The RE Data Metrix Team</strong></p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
            <p style="margin: 0; font-size: 12px;">If you have any questions, reply to this email or contact us at info@redatametrix.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: "Missed Our Webinar? Join Us Next Time!",
      html: htmlContent,
    
      from: await this.getFromForCategory('webinar'),
    });
  }

  async sendAttendedNotSignedUpEmail(
    to: string,
    name: string,
    promoCode: string
  ): Promise<boolean> {
    const firstName = name.split(' ')[0];
    const baseUrl = this.getBaseUrl();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .btn-primary { display: inline-block; padding: 14px 28px; background-color: #0F7B49; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .promo-box { background: linear-gradient(135deg, #0F7B49 0%, #1E3A8A 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .promo-code { font-size: 28px; font-weight: bold; letter-spacing: 2px; margin: 10px 0; }
          .urgency-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Thanks for Attending!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Don't Forget Your FREE Access</p>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>Thank you again for attending our RE Data Metrix webinar! We really enjoyed having you there and hope you found the session valuable.</p>
            
            <p>We noticed you haven't created your free account yet, and we don't want you to miss out on your exclusive promo code!</p>
            
            <div class="promo-box">
              <p style="margin: 0 0 5px 0; font-size: 14px;">YOUR EXCLUSIVE PROMO CODE</p>
              <div class="promo-code">${promoCode}</div>
              <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">6 MONTHS FREE ACCESS</p>
            </div>
            
            <div class="urgency-box">
              <p style="margin: 0; font-weight: bold; color: #92400e;">LIMITED TIME OFFER</p>
              <p style="margin: 8px 0 0 0; color: #92400e;">This promo code is only available for a limited time and is capped at 100 accounts. Don't miss your chance to get 6 months of FREE access!</p>
            </div>
            
            <div style="text-align: center; margin: 28px 0;">
              <a href="${baseUrl}/beta-signup?code=${promoCode}" class="btn-primary">Create Your FREE Account Now</a>
            </div>
            
            <p>With your free account, you'll get unlimited access to:</p>
            
            <ul style="margin: 16px 0; padding-left: 20px;">
              <li><strong>Deal Analysis Wizard</strong> - Analyze Fix & Flip and Rental properties in minutes</li>
              <li><strong>ARV Helper</strong> - Find comparable sales for accurate valuations</li>
              <li><strong>Lender Directory</strong> - Connect with lenders offering real financing</li>
              <li><strong>Wholesale Calculator</strong> - Calculate max offers for wholesale deals</li>
            </ul>
            
            <p>Simply enter promo code <strong>${promoCode}</strong> when you sign up to activate your 6 months of free access.</p>
            
            <p>If you have any questions, just reply to this email - we're here to help!</p>
            
            <p style="margin-top: 24px;">Best regards,<br><strong>The RE Data Metrix Team</strong></p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
            <p style="margin: 0; font-size: 12px;">If you have any questions, reply to this email or contact us at info@redatametrix.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: "Don't Forget Your FREE 6-Month Access - Limited Time!",
      html: htmlContent,
    
      from: await this.getFromForCategory('webinar'),
    });
  }

  async sendAffiliateClickNotification(
    to: string,
    affiliateName: string,
    source: string,
    referrer: string | null
  ): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const sourceDisplay = source === 'redirect' ? 'External Link' : 
                          source === 'website' ? 'RE Data Metrix Website' : source;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .info-box { background: #f0fdf4; border: 1px solid #22c55e; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-row { display: flex; margin: 8px 0; }
          .info-label { font-weight: 600; width: 100px; color: #374151; }
          .info-value { color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">New Referral Click!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">RE Data Metrix Affiliate Notification</p>
          </div>
          <div class="content">
            <p>Hi there,</p>
            
            <p>Great news! Someone just clicked on your <strong>${affiliateName}</strong> referral link through RE Data Metrix.</p>
            
            <div class="info-box">
              <p style="margin: 0 0 10px 0; font-weight: 600;">Click Details:</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;"><strong>Source:</strong> ${sourceDisplay}</p>
              ${referrer ? `<p style="margin: 5px 0;"><strong>Referrer:</strong> ${referrer}</p>` : ''}
            </div>
            
            <p>This click has been recorded in our system. If this user signs up for your service, please ensure RE Data Metrix is credited for the referral.</p>
            
            <p style="margin-top: 24px;">Best regards,<br><strong>RE Data Metrix</strong></p>
          </div>
          <div class="footer">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `New Referral Click - ${affiliateName}`,
      html: htmlContent,
    
      from: await this.getFromForCategory('marketing'),
    });
  }
  async sendLenderBroadcastEmail(to: string, contactName: string, companyName: string, subject: string, bodyHtml: string): Promise<boolean> {
    const portalUrl = `${this.getBaseUrl()}/lender-login`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .highlight-box { background: #F0F9FF; border: 1px solid #1E3A8A; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .cta-box { background: #F0FDF4; border: 1px solid #0F7B49; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .button { display: inline-block; padding: 14px 28px; background: #D4AF37; color: #1E3A8A; text-decoration: none; border-radius: 6px; margin: 10px 0; font-weight: bold; font-size: 16px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">RE Data Metrix</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Lender Partner Update</p>
          </div>
          <div class="content">
            <p>Hi ${contactName},</p>
            ${bodyHtml}
            <div class="cta-box">
              <p style="margin: 0 0 12px; font-weight: 600; color: #0F7B49;">Review Your Portal Information</p>
              <p style="margin: 0 0 16px; font-size: 14px; color: #555;">Please log in and confirm your company details and loan products are accurate and up to date.</p>
              <a href="${portalUrl}" class="button">Log Into Your Portal</a>
            </div>
            <p style="margin-top: 24px;">Thank you again for your trust and partnership. I'm looking forward to what's ahead for all of us.</p>
            <p style="margin-top: 24px;">Warm regards,<br><strong>RE Data Metrix</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
            <p style="font-size: 12px; color: #9ca3af;">8375 Dunwoody Place, STE R, Atlanta, GA 30350</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject,
      html: htmlContent,
    
      from: await this.getFromForCategory('lender'),
    });
  }

  async sendTwoWeekFollowupEmail(to: string, username: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const feedbackUrl = `${baseUrl}/feedback?feature=custom_email_workflow`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .feature-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .feature-item { display: flex; margin: 10px 0; font-size: 15px; color: #334155; }
          .check-mark { color: #0F7B49; font-weight: bold; margin-right: 10px; }
          .poll-box { background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); border: 1px solid #fde68a; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center; }
          .poll-buttons { margin: 16px 0; }
          .poll-btn { display: inline-block; padding: 10px 24px; margin: 6px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; }
          .poll-yes { background-color: #0F7B49; color: #ffffff !important; }
          .poll-maybe { background-color: #1E3A8A; color: #ffffff !important; }
          .poll-no { background-color: #6b7280; color: #ffffff !important; }
          .cta-section { text-align: center; margin: 28px 0; }
          .btn-primary { display: inline-block; padding: 14px 28px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 13px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }
          .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 26px;">We're Building Something New</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">And we want your input</p>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>It's been a couple of weeks since you joined RE Data Metrix, and we hope you've been finding value in your deal analysis tools. We're reaching out because we're planning a new feature and <strong>your perspective as an investor matters to us</strong>.</p>

            <div class="feature-box">
              <p style="margin: 0 0 12px 0; font-weight: 700; color: #0369a1; font-size: 17px;">Custom Deal Email Reminders</p>
              <p style="margin: 0 0 14px 0; color: #475569; font-size: 14px;">Here's what we're looking to build:</p>

              <div class="feature-item"><span class="check-mark">&#10003;</span> <span><strong>Your timeline, your reminders</strong> &mdash; Set custom reminders at any point before closing (7 days, 4 days, day-of, etc.)</span></div>
              <div class="feature-item"><span class="check-mark">&#10003;</span> <span><strong>Your words, professionally delivered</strong> &mdash; Give us your talking points ("remind group to schedule final walkthrough and confirm funding") and we'll generate a polished, branded email</span></div>
              <div class="feature-item"><span class="check-mark">&#10003;</span> <span><strong>Send to your whole team</strong> &mdash; Add recipients with role labels: closing attorney, title company, real estate agent, contractor, partner, and more</span></div>
              <div class="feature-item"><span class="check-mark">&#10003;</span> <span><strong>Know who's seen it</strong> &mdash; Read receipts show you which recipients opened your email, so you know who's in the loop and who needs a follow-up call</span></div>
            </div>

            <div class="poll-box">
              <p style="margin: 0 0 4px 0; font-weight: 700; color: #92400e; font-size: 18px;">Quick Poll</p>
              <p style="margin: 0 0 16px 0; color: #78350f; font-size: 15px;">Would you use Custom Deal Email Reminders?</p>
              <div class="poll-buttons">
                <a href="${feedbackUrl}&response=yes" class="poll-btn poll-yes">Yes, I'd use this</a>
                <a href="${feedbackUrl}&response=maybe" class="poll-btn poll-maybe">Maybe, tell me more</a>
                <a href="${feedbackUrl}&response=no" class="poll-btn poll-no">Not for me</a>
              </div>
              <p style="margin: 12px 0 0 0; color: #92400e; font-size: 12px;">Clicking any option takes you to our feedback page where you can share more details</p>
            </div>

            <div class="divider"></div>

            <p style="font-weight: 600; color: #1E3A8A; font-size: 16px;">We also want to hear from you:</p>
            <ul style="color: #475569; font-size: 15px; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Are there <strong>other types of emails</strong> you'd want to send from the platform? (e.g., offer letters, status updates to partners)</li>
              <li style="margin-bottom: 8px;">Who else would you want to <strong>include as recipients</strong>? (e.g., hard money lenders, insurance agents, inspectors)</li>
              <li style="margin-bottom: 8px;">Would you want to <strong>add other features</strong> to your deal workflow? (e.g., task checklists, document sharing, milestone tracking)</li>
              <li style="margin-bottom: 8px;">Any other tools or integrations that would make your investing process smoother?</li>
            </ul>

            <div class="cta-section">
              <a href="${feedbackUrl}" class="btn-primary">Share Your Feedback</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">Your input directly shapes what we build next. Every response is read by our team &mdash; this isn't a generic survey, it's a conversation.</p>

            <p style="margin-top: 24px;">Happy investing,<br>The RE Data Metrix Team</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">8375 Dunwoody Place, STE R, Atlanta, GA 30350</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'We\'re building something new - and we want your input | RE Data Metrix',
      html: htmlContent,
    
      from: await this.getFromForCategory('marketing'),
    });
  }

  async sendDay1ActivationEmail(to: string, firstName: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const ctaUrl = `${baseUrl}/m/deal-analysis`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 32px 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .step-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .step-item { display: flex; margin: 10px 0; font-size: 15px; color: #1e293b; }
          .step-num { color: #0F7B49; font-weight: 700; margin-right: 12px; flex-shrink: 0; }
          .cta-section { text-align: center; margin: 32px 0; }
          .btn-primary { display: inline-block; padding: 14px 32px; background-color: #0F7B49; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 16px; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 13px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 26px;">You're In. Let's Run Your First Deal.</h1>
            <p style="margin: 10px 0 0; opacity: 0.9; font-size: 15px;">RE Data Metrix gives you the numbers before you commit.</p>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Your account is confirmed and ready to use. Here's how to get value from RE Data Metrix in the next 5 minutes:</p>

            <div class="step-box">
              <div class="step-item"><span class="step-num">1.</span><span>Enter any investment property address — we'll pull the property data automatically.</span></div>
              <div class="step-item"><span class="step-num">2.</span><span>Add your purchase price, rehab estimate, and target ARV.</span></div>
              <div class="step-item"><span class="step-num">3.</span><span>See your projected profit, ROI, max allowable offer, and lender comparison in seconds.</span></div>
            </div>

            <p>No spreadsheets. No guessing. Just clean numbers on every deal.</p>

            <div class="cta-section">
              <a href="${ctaUrl}" class="btn-primary">Run Your First Deal Analysis</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">If you have any questions, reply to this email and a real person will get back to you.</p>
            <p style="margin-top: 24px;">Here to help,<br>The RE Data Metrix Team</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">8375 Dunwoody Place, STE R, Atlanta, GA 30350</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Your first deal analysis is ready — here\'s how to run it.',
      html: htmlContent,
      from: await this.getFromForCategory('marketing'),
    });
  }

  async sendDay7FollowupEmail(to: string, firstName: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const ctaUrl = `${baseUrl}/m/deal-analysis`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 32px 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .deal-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .deal-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #475569; }
          .deal-row:last-child { border-bottom: none; }
          .deal-label { font-weight: 500; }
          .deal-value { font-weight: 700; color: #1e293b; }
          .deal-value.green { color: #0F7B49; }
          .cta-section { text-align: center; margin: 32px 0; }
          .btn-primary { display: inline-block; padding: 14px 32px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 16px; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 13px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 26px;">A Sample Deal to Get You Started</h1>
            <p style="margin: 10px 0 0; opacity: 0.9; font-size: 15px;">See what RE Data Metrix looks like in action</p>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>You joined RE Data Metrix a week ago but haven't run a deal analysis yet. That's okay — we want to show you what one looks like.</p>

            <p style="font-weight: 600; color: #1E3A8A;">Sample Deal: 3BR/2BA Fix-and-Flip in Atlanta, GA</p>

            <div class="deal-card">
              <div class="deal-row"><span class="deal-label">Purchase Price</span><span class="deal-value">$185,000</span></div>
              <div class="deal-row"><span class="deal-label">Rehab Budget</span><span class="deal-value">$42,000</span></div>
              <div class="deal-row"><span class="deal-label">After Repair Value (ARV)</span><span class="deal-value">$310,000</span></div>
              <div class="deal-row"><span class="deal-label">All-In Cost</span><span class="deal-value">$243,500</span></div>
              <div class="deal-row"><span class="deal-label">Projected Profit</span><span class="deal-value green">$47,800</span></div>
              <div class="deal-row"><span class="deal-label">ROI</span><span class="deal-value green">19.6%</span></div>
              <div class="deal-row"><span class="deal-label">Max Allowable Offer</span><span class="deal-value">$192,000</span></div>
            </div>

            <p>In 5 minutes, RE Data Metrix calculated all of this — including matching lender options for this exact property type and state.</p>

            <p>Now plug in your own deal and see the same clarity on your numbers.</p>

            <div class="cta-section">
              <a href="${ctaUrl}" class="btn-primary">Analyze Your First Deal</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">Reply to this email anytime if you have questions about getting started.</p>
            <p style="margin-top: 24px;">Happy investing,<br>The RE Data Metrix Team</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">8375 Dunwoody Place, STE R, Atlanta, GA 30350</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'You haven\'t run a deal yet — try this sample property.',
      html: htmlContent,
      from: await this.getFromForCategory('marketing'),
    });
  }

  async sendUserSubmissionConfirmation(
    to: string,
    name: string,
    type: 'issue' | 'feature',
    title: string,
    description: string
  ): Promise<boolean> {
    const isIssue = type === 'issue';
    const typeLabel = isIssue ? 'Issue Report' : 'Feature Suggestion';
    const intro = isIssue
      ? "Thank you for taking the time to report this issue. Our team will review it and follow up if we need additional details."
      : "Thank you for sharing your idea! We review every suggestion as we continue to improve the platform.";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .recap-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .recap-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 4px; }
          .recap-value { font-size: 15px; color: #1e293b; margin-bottom: 16px; }
          .recap-value:last-child { margin-bottom: 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">${typeLabel} Received</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>${intro}</p>
            <div class="recap-box">
              <div class="recap-label">Type</div>
              <div class="recap-value">${typeLabel}</div>
              <div class="recap-label">Subject</div>
              <div class="recap-value">${title}</div>
              <div class="recap-label">Details</div>
              <div class="recap-value" style="white-space: pre-wrap;">${description}</div>
            </div>
            <p>If you have any additional information to add, simply reply to this email.</p>
            <p style="margin-top: 30px;">Best regards,<br>The RE Data Metrix Support Team</p>
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
      subject: `We received your ${typeLabel.toLowerCase()} - RE Data Metrix`,
      html: htmlContent,
      from: await this.getFromForCategory('support'),
    });
  }

  async sendUserSubmissionAdminAlert(
    submitterEmail: string,
    type: 'issue' | 'feature',
    title: string,
    description: string
  ): Promise<boolean> {
    const isIssue = type === 'issue';
    const typeLabel = isIssue ? 'Bug Report' : 'Feature Suggestion';
    const adminUrl = `${this.getBaseUrl()}/admin/user-submissions`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${isIssue ? '#dc2626' : '#4f46e5'}; color: white; padding: 24px 30px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .detail-row { padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 3px; }
          .detail-value { font-size: 15px; color: #1e293b; white-space: pre-wrap; }
          .btn { display: inline-block; background: #1E3A8A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">New ${typeLabel} Submitted</h1>
          </div>
          <div class="content">
            <p>A new ${typeLabel.toLowerCase()} has been submitted through the member portal.</p>
            <div class="detail-row">
              <div class="detail-label">From</div>
              <div class="detail-value">${submitterEmail}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Subject</div>
              <div class="detail-value">${title}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Details</div>
              <div class="detail-value">${description}</div>
            </div>
            <a href="${adminUrl}" class="btn">View in Admin Panel</a>
          </div>
          <div class="footer">
            <p>RE Data Metrix Admin Notifications</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: 'admin@redatametrix.com',
      subject: `[${typeLabel}] ${title}`,
      html: htmlContent,
      from: await this.getFromForCategory('support'),
    });
  }

  async sendPaymentFailedEmail(to: string, username: string, billingPortalUrl: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .btn-primary { display: inline-block; padding: 14px 32px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 13px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Payment Issue — Action Required</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">RE Data Metrix</p>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>We were unable to process your RE Data Metrix subscription payment. Your access remains active for now, but we need you to update your payment information to avoid any interruption.</p>
            <div class="alert-box">
              <p style="margin: 0 0 12px; font-weight: 600; color: #dc2626;">What happens if payment isn't resolved?</p>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                <li style="margin-bottom: 6px;">In 5 days — your account will be scheduled for downgrade</li>
                <li style="margin-bottom: 6px;">At downgrade — your saved deals and lenders will be preserved for 30 days</li>
                <li>After 30 days — saved data will be permanently removed</li>
              </ul>
            </div>
            <p>To keep uninterrupted access to your deal analysis tools, lender directory, and all saved data, please update your payment method now:</p>
            <p style="text-align: center; margin: 28px 0;">
              <a href="${billingPortalUrl}" class="btn-primary">Update Payment Method</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">If you have questions or need help, just reply to this email — we're happy to assist.</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 4px;">RE Data Metrix &mdash; 8735 Dunwoody Pl, Suite R, Atlanta, GA 30350</p>
            <p style="margin: 0;"><a href="${baseUrl}" style="color: #1E3A8A;">redatametrix.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Action Required: Payment Failed — Update Your Billing Info',
      html: htmlContent,
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendPreDowngradeWarningEmail(to: string, username: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const billingUrl = `${baseUrl}/settings`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .warning-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .btn-primary { display: inline-block; padding: 14px 32px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 13px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Your Account Will Be Downgraded Soon</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">RE Data Metrix</p>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>We still haven't been able to process your subscription payment. <strong>If this isn't resolved, your account will be downgraded to the free plan when your billing cycle ends.</strong></p>
            <div class="warning-box">
              <p style="margin: 0 0 8px; font-weight: 600; color: #92400e;">What you'll lose access to:</p>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                <li style="margin-bottom: 6px;">Full deal analysis with loan comparison</li>
                <li style="margin-bottom: 6px;">Unlimited property lookups and ARV helper runs</li>
                <li style="margin-bottom: 6px;">Saved deals and lender connections (30-day grace period after downgrade)</li>
              </ul>
            </div>
            <p>The easiest fix is to update your payment method now. It only takes a minute:</p>
            <p style="text-align: center; margin: 28px 0;">
              <a href="${billingUrl}" class="btn-primary">Resolve Payment Issue</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">Need help? Reply to this email or contact us at <a href="mailto:info@redatametrix.com" style="color: #1E3A8A;">info@redatametrix.com</a>.</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 4px;">RE Data Metrix &mdash; 8735 Dunwoody Pl, Suite R, Atlanta, GA 30350</p>
            <p style="margin: 0;"><a href="${baseUrl}" style="color: #1E3A8A;">redatametrix.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Your Account Is About to Be Downgraded — Resolve Now',
      html: htmlContent,
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendAccountDowngradedEmail(to: string, username: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const resubscribeUrl = `${baseUrl}/pricing`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .btn-primary { display: inline-block; padding: 14px 32px; background-color: #0F7B49; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 13px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Your Account Has Been Downgraded</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">RE Data Metrix</p>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>Your RE Data Metrix subscription has been cancelled and your account has been moved to the free plan.</p>
            <div class="info-box">
              <p style="margin: 0 0 8px; font-weight: 600; color: #0369a1;">Your data is safe for now</p>
              <p style="margin: 0; color: #374151;">Your saved deals and lender connections will be kept for <strong>30 days</strong> from today. If you resubscribe before then, everything will be exactly as you left it.</p>
            </div>
            <p>We'd love to have you back. Resubscribing takes less than two minutes and you'll instantly regain access to:</p>
            <ul style="color: #374151; padding-left: 20px;">
              <li style="margin-bottom: 6px;">Full deal analysis with loan comparison tools</li>
              <li style="margin-bottom: 6px;">Unlimited property lookups and ARV helper</li>
              <li style="margin-bottom: 6px;">Private lender directory and all saved lenders</li>
              <li style="margin-bottom: 6px;">All your saved deals restored immediately</li>
            </ul>
            <p style="text-align: center; margin: 28px 0;">
              <a href="${resubscribeUrl}" class="btn-primary">Resubscribe Now</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">Questions? We're here to help at <a href="mailto:info@redatametrix.com" style="color: #1E3A8A;">info@redatametrix.com</a>.</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 4px;">RE Data Metrix &mdash; 8735 Dunwoody Pl, Suite R, Atlanta, GA 30350</p>
            <p style="margin: 0;"><a href="${baseUrl}" style="color: #1E3A8A;">redatametrix.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Your Account Has Been Downgraded — Your Data Is Safe for 30 Days',
      html: htmlContent,
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendResubscribeCTAEmail(to: string, username: string, daysUntilDeletion: number): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const resubscribeUrl = `${baseUrl}/pricing`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .countdown-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .btn-primary { display: inline-block; padding: 14px 32px; background-color: #0F7B49; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 13px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">We Miss You — Come Back to RE Data Metrix</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">RE Data Metrix</p>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>It's been a little while since your subscription ended. Your saved deals and lender data are still safe — but the clock is ticking.</p>
            <div class="countdown-box">
              <p style="margin: 0; font-size: 22px; font-weight: 700; color: #92400e;">${daysUntilDeletion} days remaining</p>
              <p style="margin: 6px 0 0; color: #78350f; font-size: 15px;">until your saved data is permanently removed</p>
            </div>
            <p>Resubscribe now and pick up right where you left off — all your deals and lenders fully restored the moment you're back.</p>
            <p style="text-align: center; margin: 28px 0;">
              <a href="${resubscribeUrl}" class="btn-primary">Restore My Account</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">Have questions about getting back started? Just reply to this email — we'd love to help.</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 4px;">RE Data Metrix &mdash; 8735 Dunwoody Pl, Suite R, Atlanta, GA 30350</p>
            <p style="margin: 0;"><a href="${baseUrl}" style="color: #1E3A8A;">redatametrix.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `${daysUntilDeletion} Days Left to Restore Your Saved Deals — Come Back to RE Data Metrix`,
      html: htmlContent,
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendFinalDataDeletionWarningEmail(to: string, username: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const resubscribeUrl = `${baseUrl}/pricing`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #991B1B 0%, #7C2D12 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .urgent-box { background: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .btn-primary { display: inline-block; padding: 14px 32px; background-color: #dc2626; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 13px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Final Warning: Your Data Will Be Deleted in 7 Days</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">RE Data Metrix</p>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>This is your final notice. Your RE Data Metrix account has been on the free plan for 23 days and your saved data — including all deals and lender connections — will be permanently and irreversibly deleted in <strong>7 days</strong>.</p>
            <div class="urgent-box">
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: #dc2626;">7 days until permanent deletion</p>
              <p style="margin: 8px 0 0; color: #7f1d1d; font-size: 14px;">This action cannot be undone. Once deleted, your data cannot be recovered.</p>
            </div>
            <p>Resubscribe before the deadline to save everything:</p>
            <p style="text-align: center; margin: 28px 0;">
              <a href="${resubscribeUrl}" class="btn-primary">Save My Data — Resubscribe Now</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">After resubscribing, all your saved deals and lenders will be immediately restored. Have questions? Email us at <a href="mailto:info@redatametrix.com" style="color: #1E3A8A;">info@redatametrix.com</a>.</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 4px;">RE Data Metrix &mdash; 8735 Dunwoody Pl, Suite R, Atlanta, GA 30350</p>
            <p style="margin: 0;"><a href="${baseUrl}" style="color: #1E3A8A;">redatametrix.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'FINAL NOTICE: Your Saved Deals Will Be Deleted in 7 Days',
      html: htmlContent,
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendVerificationReminderEmail(to: string, username: string, verificationToken: string, subject?: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .cta-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center; }
          .btn-primary { display: inline-block; padding: 14px 32px; background-color: #1E3A8A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 13px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 26px;">Don't Forget to Confirm Your Account</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">RE Data Metrix</p>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>You signed up for RE Data Metrix yesterday but haven't confirmed your email address yet. Your account is ready — you just need to click the button below to activate it.</p>
            <p>Once confirmed, you'll have access to:</p>
            <ul style="color: #374151; padding-left: 20px;">
              <li style="margin-bottom: 8px;"><strong>Deal Analysis with Loan Comparison</strong> &mdash; run a full investment analysis on any property</li>
              <li style="margin-bottom: 8px;"><strong>Private Lender Directory</strong> &mdash; connect with vetted lenders for your next deal</li>
              <li style="margin-bottom: 8px;"><strong>ARV Helper &amp; Toolbox</strong> &mdash; research comps and access investor resources</li>
            </ul>
            <div class="cta-box">
              <p style="margin: 0 0 16px 0; font-weight: 600; color: #1E3A8A; font-size: 17px;">Confirm your email to get started</p>
              <a href="${verificationUrl}" class="btn-primary">Confirm My Account</a>
              <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px;">Button not working? Copy and paste this link:<br><a href="${verificationUrl}" style="color: #1E3A8A; word-break: break-all;">${verificationUrl}</a></p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">If you didn't sign up for RE Data Metrix, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 4px;">RE Data Metrix &mdash; 8735 Dunwoody Pl, Suite R, Atlanta, GA 30350</p>
            <p style="margin: 0;"><a href="${baseUrl}" style="color: #1E3A8A;">redatametrix.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: subject ?? "Please confirm your RE Data Metrix account",
      html: htmlContent,
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendFirstDealNudgeEmail(to: string, firstName: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const ctaUrl = `${baseUrl}/deal-analysis`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 32px 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .benefit-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .benefit-item { display: flex; margin: 10px 0; font-size: 15px; color: #1e293b; }
          .check-mark { color: #0F7B49; font-weight: 700; margin-right: 10px; flex-shrink: 0; }
          .cta-section { text-align: center; margin: 32px 0; }
          .btn-primary { display: inline-block; padding: 14px 32px; background-color: #0F7B49; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 16px; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 13px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 26px;">Your Analysis Tools Are Ready</h1>
            <p style="margin: 10px 0 0; opacity: 0.9; font-size: 15px;">Run your first deal in under 5 minutes</p>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>You verified your account a few days ago — and your deal analysis tools have been ready and waiting ever since.</p>
            <p>Here's what RE Data Metrix does for real estate investors:</p>

            <div class="benefit-box">
              <div class="benefit-item"><span class="check-mark">&#10003;</span><span><strong>Instant profit and ROI calculation</strong> — enter an address, purchase price, and rehab budget and see your numbers immediately.</span></div>
              <div class="benefit-item"><span class="check-mark">&#10003;</span><span><strong>Max Allowable Offer</strong> — know exactly how much you can pay and still hit your profit target before you make an offer.</span></div>
              <div class="benefit-item"><span class="check-mark">&#10003;</span><span><strong>Loan comparison</strong> — see how different financing options affect your deal, side by side.</span></div>
              <div class="benefit-item"><span class="check-mark">&#10003;</span><span><strong>Private lender matching</strong> — get connected to lenders who actually work in your target market.</span></div>
            </div>

            <p>It takes about 3 minutes to run your first deal. Try it with a real property you're evaluating or one you already passed on — either way you'll see how the numbers shake out.</p>

            <div class="cta-section">
              <a href="${ctaUrl}" class="btn-primary">Run Your First Deal Analysis</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">Questions? Reply to this email and a real person will respond.</p>
            <p style="margin-top: 24px;">Here to help,<br>The RE Data Metrix Team</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} RE Data Metrix. All rights reserved.</p>
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">8375 Dunwoody Place, STE R, Atlanta, GA 30350</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: "Your analysis tools are ready — here's how to run your first deal.",
      html: htmlContent,
      from: await this.getFromForCategory('marketing'),
    });
  }

  async sendDowngradeToFreeEmail(to: string, username: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const resubscribeUrl = `${baseUrl}/pricing`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .btn-primary { display: inline-block; padding: 14px 32px; background-color: #0F7B49; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 13px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">You've Moved to the Free Plan</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">RE Data Metrix</p>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>Your RE Data Metrix subscription has been cancelled and your account has been moved to the free plan. Your access to paid features has ended.</p>
            <div class="info-box">
              <p style="margin: 0 0 8px; font-weight: 600; color: #15803d;">Your data is being held for you</p>
              <p style="margin: 0; color: #374151;">Your saved deals and lender connections are being stored for a period of time. Should you decide to resubscribe, everything will be exactly as you left it &mdash; ready to pick up right where you stopped.</p>
            </div>
            <p>When you're ready to come back, resubscribing takes less than two minutes and you'll instantly regain access to:</p>
            <ul style="color: #374151; padding-left: 20px;">
              <li style="margin-bottom: 6px;">All your saved deals and deal analyses, fully restored</li>
              <li style="margin-bottom: 6px;">Your complete lender directory and saved lenders</li>
              <li style="margin-bottom: 6px;">Full deal analysis with loan comparison tools</li>
              <li style="margin-bottom: 6px;">Unlimited property lookups and ARV helper</li>
            </ul>
            <p style="text-align: center; margin: 28px 0;">
              <a href="${resubscribeUrl}" class="btn-primary">Resubscribe Anytime</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">Questions? We're here to help at <a href="mailto:info@redatametrix.com" style="color: #1E3A8A;">info@redatametrix.com</a>.</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 4px;">RE Data Metrix &mdash; 8735 Dunwoody Pl, Suite R, Atlanta, GA 30350</p>
            <p style="margin: 0;"><a href="${baseUrl}" style="color: #1E3A8A;">redatametrix.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: "You've Moved to the Free Plan — Your Data Is Being Held for You",
      html: htmlContent,
      from: await this.getFromForCategory('transactional'),
    });
  }

  async sendCancellationConfirmationEmail(to: string, username: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const resubscribeUrl = `${baseUrl}/pricing`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .warning-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .btn-primary { display: inline-block; padding: 14px 32px; background-color: #0F7B49; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 13px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Your Subscription Has Been Cancelled</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">RE Data Metrix</p>
          </div>
          <div class="content">
            <p>Hi ${username},</p>
            <p>Your RE Data Metrix subscription has been cancelled and your account has been closed. Your access to paid features has ended.</p>
            <div class="warning-box">
              <p style="margin: 0 0 8px; font-weight: 600; color: #dc2626;">Important: Your data will be deleted in 30 days</p>
              <p style="margin: 0; color: #374151;">Your saved deals and lender connections will be permanently deleted 30 days from today. If you change your mind and resubscribe before then, all your data will be fully restored.</p>
            </div>
            <p>If this was a mistake or you'd like to start fresh, resubscribing takes less than two minutes. You'll instantly regain access to all your saved data and:</p>
            <ul style="color: #374151; padding-left: 20px;">
              <li style="margin-bottom: 6px;">All saved deals and deal analyses restored immediately</li>
              <li style="margin-bottom: 6px;">Full access to the private lender directory</li>
              <li style="margin-bottom: 6px;">Unlimited property lookups and ARV helper</li>
              <li style="margin-bottom: 6px;">Loan comparison tools and full deal analysis</li>
            </ul>
            <p style="text-align: center; margin: 28px 0;">
              <a href="${resubscribeUrl}" class="btn-primary">Resubscribe and Restore My Data</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">Questions? We're here to help at <a href="mailto:info@redatametrix.com" style="color: #1E3A8A;">info@redatametrix.com</a>.</p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 4px;">RE Data Metrix &mdash; 8735 Dunwoody Pl, Suite R, Atlanta, GA 30350</p>
            <p style="margin: 0;"><a href="${baseUrl}" style="color: #1E3A8A;">redatametrix.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Your RE Data Metrix Account Has Been Cancelled — Data Deleted in 30 Days',
      html: htmlContent,
      from: await this.getFromForCategory('transactional'),
    });
  }
}

export const emailService = new EmailService();
