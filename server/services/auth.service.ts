import crypto from "crypto";
import { z } from "zod";
import { db } from "../db";
import { users, userProfiles, compInvites } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { hashPassword, comparePassword } from "../auth";
import { storage } from "../storage";
import { emailService } from "./email.service";

export const registrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required"),
  referralCode: z.string().optional(),
  compCode: z.string().optional(),
  auditorCode: z.string().optional(),
  termsAccepted: z.boolean().optional(),
  pendingPlan: z.enum(["monthly", "annual"]).optional(),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const passwordResetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SubscriptionStatus = 'free' | 'active' | 'comped' | 'referral_trial' | 'canceled';

export interface RegistrationResult {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    subscriptionStatus: string;
    isEmailVerified: boolean;
  };
  requiresVerification: boolean;
  isComped: boolean;
  message: string;
  error?: string;
}

export interface PasswordResetRequestResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface EmailVerificationResult {
  success: boolean;
  message: string;
  username?: string;
  hasSubscription?: boolean;
  isComped?: boolean;
  error?: string;
}

class AuthService {
  generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateTemporaryPassword(): string {
    return crypto.randomBytes(12).toString('base64url');
  }

  getTokenExpiry(hours: number = 24): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return !!existing;
  }

  async checkUsernameExists(username: string): Promise<boolean> {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return !!existing;
  }

  async validateCompCode(compCode: string): Promise<{
    valid: boolean;
    invite?: { id: string; email: string; status: string; expiresAt: Date };
    error?: string;
  }> {
    const invite = await storage.getCompInviteByCode(compCode.toUpperCase());
    
    if (!invite) {
      return { valid: false, error: "Invalid comp code" };
    }

    if (invite.status !== 'pending') {
      return { valid: false, error: "This comp code has already been used" };
    }

    if (new Date() > invite.expiresAt) {
      return { valid: false, error: "This comp code has expired" };
    }

    return { valid: true, invite };
  }

  async validateAuditorCode(auditorCode: string): Promise<{
    valid: boolean;
    invite?: { id: string; email: string; companyName: string | null; status: string; expiresAt: Date };
    error?: string;
  }> {
    const invite = await storage.getAuditorInviteByCode(auditorCode.toUpperCase());
    
    if (!invite) {
      return { valid: false, error: "Invalid auditor invite code" };
    }

    if (invite.status !== 'pending') {
      return { valid: false, error: "This auditor invite code has already been used" };
    }

    if (new Date() > invite.expiresAt) {
      return { valid: false, error: "This auditor invite code has expired" };
    }

    return { valid: true, invite };
  }

  async registerUser(input: RegistrationInput): Promise<RegistrationResult> {
    try {
      const validatedData = registrationSchema.parse(input);

      const emailExists = await this.checkEmailExists(validatedData.email);
      if (emailExists) {
        return {
          success: false,
          requiresVerification: false,
          isComped: false,
          message: "Email already in use",
          error: "Email already in use",
        };
      }

      const hashedPassword = await hashPassword(validatedData.password);
      const userReferralCode = this.generateReferralCode();
      const verificationToken = this.generateVerificationToken();
      const verificationExpiry = this.getTokenExpiry(24);

      let referredByUserId: string | null = null;
      let subscriptionStatus: SubscriptionStatus = 'free';
      let compInviteToAccept: { id: string; email: string; status: string; expiresAt: Date } | undefined;
      let auditorInviteToAccept: { id: string; email: string; companyName: string | null; status: string; expiresAt: Date } | undefined;
      let userRole: string = 'user';

      if (validatedData.auditorCode) {
        console.log('[AuthService] Auditor code provided:', validatedData.auditorCode.toUpperCase());
        const auditorValidation = await this.validateAuditorCode(validatedData.auditorCode);
        
        if (auditorValidation.valid && auditorValidation.invite) {
          auditorInviteToAccept = auditorValidation.invite;
          subscriptionStatus = 'comped';
          userRole = 'auditor';
          console.log('[AuthService] Auditor code valid - setting role to auditor');
        } else {
          console.log('[AuthService] Auditor code invalid:', auditorValidation.error);
        }
      }

      if (!auditorInviteToAccept && validatedData.compCode) {
        console.log('[AuthService] Comp code provided:', validatedData.compCode.toUpperCase());
        const compValidation = await this.validateCompCode(validatedData.compCode);
        
        if (compValidation.valid && compValidation.invite) {
          compInviteToAccept = compValidation.invite;
          subscriptionStatus = 'comped';
          console.log('[AuthService] Comp code valid - setting status to comped');
        } else {
          console.log('[AuthService] Comp code invalid:', compValidation.error);
        }
      }

      if (!compInviteToAccept && !auditorInviteToAccept && validatedData.referralCode) {
        const [referrer] = await db
          .select()
          .from(users)
          .where(eq(users.referralCode, validatedData.referralCode))
          .limit(1);

        if (referrer) {
          referredByUserId = referrer.id;
          subscriptionStatus = 'referral_trial';
        }
      }

      const isAutoVerified = !!compInviteToAccept || !!auditorInviteToAccept;

      const [newUser] = await db
        .insert(users)
        .values({
          username: validatedData.username,
          email: validatedData.email,
          password: hashedPassword,
          role: userRole,
          subscriptionStatus,
          referralCode: userReferralCode,
          referredBy: referredByUserId,
          isEmailVerified: isAutoVerified,
          verificationToken: isAutoVerified ? null : verificationToken,
          verificationExpiry: isAutoVerified ? null : verificationExpiry,
          termsAcceptedAt: validatedData.termsAccepted ? new Date() : null,
          termsVersion: validatedData.termsAccepted ? "1.0" : null,
          privacyVersion: validatedData.termsAccepted ? "1.0" : null,
          pendingPlan: validatedData.pendingPlan || null,
        })
        .returning();

      await db.insert(userProfiles).values({
        userId: newUser.id,
        fullName: validatedData.fullName,
      });

      if (auditorInviteToAccept) {
        await storage.acceptAuditorInvite(validatedData.auditorCode!.toUpperCase(), newUser.id);
      } else if (compInviteToAccept) {
        await storage.acceptCompInvite(validatedData.compCode!.toUpperCase(), newUser.id);
      }

      let emailSent = false;
      if (!isAutoVerified) {
        emailSent = await emailService.sendVerificationEmail(
          newUser.email,
          newUser.username,
          verificationToken,
          validatedData.pendingPlan
        );

        if (!emailSent) {
          console.error('[AuthService] Failed to send verification email to:', newUser.email);
        }
      }

      const message = isAutoVerified
        ? "Registration successful! Your complimentary access is ready."
        : emailSent
          ? "Registration successful! Please check your email to verify your account before logging in."
          : "Registration successful! Please contact support to verify your account.";

      return {
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          subscriptionStatus: newUser.subscriptionStatus,
          isEmailVerified: newUser.isEmailVerified || false,
        },
        requiresVerification: !isAutoVerified,
        isComped: !!compInviteToAccept || !!auditorInviteToAccept,
        message,
      };
    } catch (error: any) {
      console.error('[AuthService] Registration error:', error);

      if (error instanceof z.ZodError) {
        return {
          success: false,
          requiresVerification: false,
          isComped: false,
          message: "Invalid registration data",
          error: error.errors.map(e => e.message).join(", "),
        };
      }

      if (error.code === '23505') {
        if (error.constraint?.includes('username')) {
          return {
            success: false,
            requiresVerification: false,
            isComped: false,
            message: "Username already taken",
            error: "Username already taken",
          };
        }
        if (error.constraint?.includes('email')) {
          return {
            success: false,
            requiresVerification: false,
            isComped: false,
            message: "Email already in use",
            error: "Email already in use",
          };
        }
        return {
          success: false,
          requiresVerification: false,
          isComped: false,
          message: "Account already exists",
          error: "Account already exists",
        };
      }

      return {
        success: false,
        requiresVerification: false,
        isComped: false,
        message: "Registration failed",
        error: "An unexpected error occurred during registration",
      };
    }
  }

  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
    try {
      console.log('[AuthService] Password reset request for:', email);

      const [user] = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`)
        .limit(1);

      if (!user) {
        console.log('[AuthService] No user found for email:', email);
        return {
          success: true,
          message: "If an account exists with this email, a password reset link will be sent.",
        };
      }

      console.log('[AuthService] User found:', user.username, '- Generating token...');
      const resetToken = this.generateVerificationToken();
      const resetExpiry = this.getTokenExpiry(1);

      await db
        .update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry,
        })
        .where(eq(users.id, user.id));

      console.log('[AuthService] Token saved. Attempting to send email...');
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        user.username,
        resetToken
      );

      if (!emailSent) {
        console.error('[AuthService] Failed to send password reset email to:', user.email);
      } else {
        console.log('[AuthService] Password reset email sent to:', user.email);
      }

      return {
        success: true,
        message: "If an account exists with this email, a password reset link will be sent.",
      };
    } catch (error) {
      console.error('[AuthService] Password reset request error:', error);
      return {
        success: false,
        message: "Password reset request failed",
        error: "An unexpected error occurred",
      };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<PasswordResetResult> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1);

      if (!user) {
        return {
          success: false,
          message: "Invalid reset token",
          error: "Invalid reset token",
        };
      }

      if (user.passwordResetExpiry && new Date() > user.passwordResetExpiry) {
        return {
          success: false,
          message: "Reset token has expired",
          error: "Reset token has expired",
        };
      }

      const hashedPassword = await hashPassword(newPassword);

      await db
        .update(users)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
        })
        .where(eq(users.id, user.id));

      return {
        success: true,
        message: "Password reset successfully",
      };
    } catch (error) {
      console.error('[AuthService] Password reset error:', error);
      return {
        success: false,
        message: "Password reset failed",
        error: "An unexpected error occurred",
      };
    }
  }

  async verifyEmail(token: string): Promise<EmailVerificationResult> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verificationToken, token))
        .limit(1);

      if (!user) {
        return {
          success: false,
          message: "Invalid verification token",
          error: "Invalid verification token",
        };
      }

      if (user.verificationExpiry && new Date() > user.verificationExpiry) {
        return {
          success: false,
          message: "Verification token has expired",
          error: "Verification token has expired",
        };
      }

      if (user.isEmailVerified) {
        return {
          success: true,
          message: "Email already verified",
          username: user.username,
          hasSubscription: user.subscriptionStatus === 'active' || user.subscriptionStatus === 'comped',
          isComped: user.subscriptionStatus === 'comped',
        };
      }

      await db
        .update(users)
        .set({
          isEmailVerified: true,
          verificationToken: null,
          verificationExpiry: null,
        })
        .where(eq(users.id, user.id));

      const emailSent = await emailService.sendWelcomeEmail(user.email, user.username);
      if (!emailSent) {
        console.error('[AuthService] Failed to send welcome email to:', user.email);
      }

      const hasSubscription = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'comped';

      return {
        success: true,
        message: "Email verified successfully! Welcome to RE Data Metrix.",
        username: user.username,
        hasSubscription,
        isComped: user.subscriptionStatus === 'comped',
      };
    } catch (error) {
      console.error('[AuthService] Email verification error:', error);
      return {
        success: false,
        message: "Email verification failed",
        error: "An unexpected error occurred",
      };
    }
  }

  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`)
        .limit(1);

      if (!user) {
        return {
          success: true,
          message: "If an account exists with this email, a verification link will be sent.",
        };
      }

      if (user.isEmailVerified) {
        return {
          success: false,
          message: "Email is already verified",
          error: "Email is already verified",
        };
      }

      const verificationToken = this.generateVerificationToken();
      const verificationExpiry = this.getTokenExpiry(24);

      await db
        .update(users)
        .set({
          verificationToken,
          verificationExpiry,
        })
        .where(eq(users.id, user.id));

      const emailSent = await emailService.sendVerificationEmail(
        user.email,
        user.username,
        verificationToken
      );

      if (!emailSent) {
        return {
          success: false,
          message: "Failed to send verification email",
          error: "Email delivery failed",
        };
      }

      return {
        success: true,
        message: "Verification email sent. Please check your inbox.",
      };
    } catch (error) {
      console.error('[AuthService] Resend verification error:', error);
      return {
        success: false,
        message: "Failed to resend verification email",
        error: "An unexpected error occurred",
      };
    }
  }

  async updateSubscriptionStatus(
    userId: string,
    status: SubscriptionStatus,
    stripeSubscriptionId?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updates: Record<string, any> = { subscriptionStatus: status };
      
      if (stripeSubscriptionId !== undefined) {
        updates.stripeSubscriptionId = stripeSubscriptionId;
      }

      await db
        .update(users)
        .set(updates)
        .where(eq(users.id, userId));

      console.log(`[AuthService] User ${userId} subscription status updated to: ${status}`);
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Update subscription status error:', error);
      return { success: false, error: "Failed to update subscription status" };
    }
  }

  async getUserById(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user || null;
  }

  async getUserByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${email})`)
      .limit(1);
    return user || null;
  }
}

export const authService = new AuthService();
