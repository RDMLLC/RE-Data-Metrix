import { db } from '../db';
import { users, userProfiles, pendingRegistrations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { emailService } from './email.service';
import { getUncachableStripeClient } from './stripeClient';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

interface CheckoutCompletionResult {
  success: boolean;
  message: string;
  userId?: string;
  alreadyProcessed?: boolean;
  requiresVerification?: boolean;
  requiresPasswordReset?: boolean;
  error?: string;
}

export async function completeCheckoutSession(sessionId: string): Promise<CheckoutCompletionResult> {
  const stripe = await getUncachableStripeClient();
  
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer'],
  });

  if (session.status !== 'complete') {
    return { success: false, message: 'Checkout session not complete', error: 'Session not complete' };
  }

  if (session.payment_status !== 'paid') {
    return { success: false, message: 'Payment not confirmed', error: 'Payment not confirmed' };
  }

  const subscription = session.subscription as any;
  if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trialing')) {
    return { success: false, message: 'Subscription not active', error: 'Subscription not active' };
  }

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name;

  if (!customerId || !customerEmail) {
    return { success: false, message: 'Missing customer information', error: 'Missing customer info' };
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (existingUser.length > 0) {
    const user = existingUser[0];
    if (!user.stripeSubscriptionId || user.stripeSubscriptionId !== subscription.id) {
      const priceInterval = subscription.items?.data?.[0]?.price?.recurring?.interval;
      const subscriptionPlan = priceInterval === 'year' ? 'annual' : 'monthly';
      
      await db
        .update(users)
        .set({
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: 'active',
          subscriptionPlan,
        })
        .where(eq(users.id, user.id));
      console.log(`[CHECKOUT] Updated subscription for existing user ${user.email} (plan: ${subscriptionPlan})`);
    }
    return {
      success: true,
      message: 'Account already exists. Please log in.',
      userId: user.id,
      alreadyProcessed: true,
    };
  }

  const existingByEmail = await db
    .select()
    .from(users)
    .where(eq(users.email, customerEmail.toLowerCase()))
    .limit(1);

  if (existingByEmail.length > 0) {
    const user = existingByEmail[0];
    // Determine plan type from subscription interval
    const priceInterval = subscription.items?.data?.[0]?.price?.recurring?.interval;
    const subscriptionPlan = priceInterval === 'year' ? 'annual' : 'monthly';
    
    await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: 'active',
        subscriptionPlan,
      })
      .where(eq(users.id, user.id));
    console.log(`[CHECKOUT] Linked subscription to existing user ${user.email} (plan: ${subscriptionPlan})`);

    return {
      success: true,
      message: 'Subscription linked to existing account. Please log in.',
      userId: user.id,
      alreadyProcessed: true,
    };
  }

  // For authenticated checkouts, the session metadata contains the userId directly.
  // This handles the case where the user changed their email inside Stripe checkout,
  // which creates a new Stripe customer that can't be matched by customer ID or email.
  const metaUserId = session.metadata?.userId;
  if (metaUserId) {
    const [userById] = await db
      .select()
      .from(users)
      .where(eq(users.id, metaUserId))
      .limit(1);

    if (userById) {
      const priceInterval = subscription.items?.data?.[0]?.price?.recurring?.interval;
      const subscriptionPlan = priceInterval === 'year' ? 'annual' : 'monthly';

      await db
        .update(users)
        .set({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: 'active',
          subscriptionPlan,
        })
        .where(eq(users.id, userById.id));

      console.log(`[CHECKOUT] Linked subscription to authenticated user ${userById.email} via userId metadata (plan: ${subscriptionPlan})`);

      return {
        success: true,
        message: 'Subscription linked to your account.',
        userId: userById.id,
        alreadyProcessed: true,
      };
    }
  }

  const pendingId = session.metadata?.pendingRegistrationId;
  let pending: any = null;

  if (pendingId) {
    const [pendingRecord] = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.id, pendingId))
      .limit(1);
    
    if (pendingRecord) {
      if (pendingRecord.stripeSessionId && pendingRecord.stripeSessionId !== sessionId) {
        console.error(`[CHECKOUT] Session ID mismatch for pending ${pendingId}: expected ${pendingRecord.stripeSessionId}, got ${sessionId}`);
        return { success: false, message: 'Session mismatch', error: 'Invalid session' };
      }
      pending = pendingRecord;
    }
  }

  if (!pending) {
    const [pendingBySession] = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.stripeSessionId, sessionId))
      .limit(1);
    pending = pendingBySession;
  }

  if (pending && pending.status === 'completed') {
    const [completedUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, pending.email.toLowerCase()))
      .limit(1);
    
    if (completedUser) {
      // Determine plan type from subscription interval
      const priceInterval = subscription.items?.data?.[0]?.price?.recurring?.interval;
      const subscriptionPlan = priceInterval === 'year' ? 'annual' : 'monthly';
      
      await db
        .update(users)
        .set({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: 'active',
          subscriptionPlan,
        })
        .where(eq(users.id, completedUser.id));
      
      return {
        success: true,
        message: 'Account already created. Please verify your email to log in.',
        userId: completedUser.id,
        alreadyProcessed: true,
      };
    }
  }

  const referralCode = generateReferralCode();
  const verificationToken = generateVerificationToken();
  const verificationExpiry = new Date();
  verificationExpiry.setHours(verificationExpiry.getHours() + 24);

  let username: string;
  let email: string;
  let passwordHash: string;
  let fullName: string;
  let needsPasswordReset = false;

  if (pending) {
    username = pending.username;
    email = pending.email;
    passwordHash = pending.passwordHash;
    fullName = pending.fullName || customerName || '';
  } else {
    console.log(`[CHECKOUT] No pending registration found, creating fallback account for ${customerEmail}`);
    
    const baseUsername = customerEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    username = `${baseUsername}_${randomSuffix}`;
    email = customerEmail;
    fullName = customerName || '';
    needsPasswordReset = true;
    
    const tempPassword = crypto.randomBytes(16).toString('hex');
    passwordHash = await bcrypt.hash(tempPassword, 10);
  }

  const passwordResetToken = needsPasswordReset ? generateVerificationToken() : null;
  const passwordResetExpiry = needsPasswordReset ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
  
  // Determine plan type from pending registration or subscription interval
  let subscriptionPlan = 'monthly';
  if (pending?.selectedPlan) {
    subscriptionPlan = pending.selectedPlan;
  } else {
    const priceInterval = subscription.items?.data?.[0]?.price?.recurring?.interval;
    subscriptionPlan = priceInterval === 'year' ? 'annual' : 'monthly';
  }

  const [newUser] = await db
    .insert(users)
    .values({
      username,
      email: email.toLowerCase(),
      password: passwordHash,
      role: 'user',
      subscriptionStatus: 'active',
      subscriptionPlan,
      referralCode,
      isEmailVerified: needsPasswordReset ? true : false,
      verificationToken: needsPasswordReset ? null : verificationToken,
      verificationExpiry: needsPasswordReset ? null : verificationExpiry,
      passwordResetToken,
      passwordResetExpiry,
      termsAcceptedAt: new Date(),
      termsVersion: '1.0',
      privacyVersion: '1.0',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
    })
    .returning();

  await db.insert(userProfiles).values({
    userId: newUser.id,
    fullName,
  });

  if (pending) {
    await db
      .update(pendingRegistrations)
      .set({ status: 'completed' })
      .where(eq(pendingRegistrations.id, pending.id));
  }

  try {
    const checkoutFirstName = (fullName || '').trim().split(/\s+/)[0] || username;
    if (needsPasswordReset && passwordResetToken) {
      await emailService.sendPasswordResetEmail(email, checkoutFirstName, passwordResetToken, undefined, true);
      console.log(`[CHECKOUT] Sent set-password email to ${email} (fallback account)`);
    } else {
      await emailService.sendVerificationEmail(email, checkoutFirstName, verificationToken);
      console.log(`[CHECKOUT] Sent verification email to ${email}`);
    }
  } catch (emailError) {
    console.error(`[CHECKOUT] Failed to send email to ${email}:`, emailError);
  }

  console.log(`[CHECKOUT] Created user ${newUser.id} (${email}) with subscription ${subscription.id}${needsPasswordReset ? ' [fallback - needs password reset]' : ''}`);

  return {
    success: true,
    message: needsPasswordReset 
      ? 'Account created! Please check your email to set your password.'
      : 'Account created! Please check your email to verify your account.',
    userId: newUser.id,
    requiresVerification: !needsPasswordReset,
    requiresPasswordReset: needsPasswordReset,
  };
}
