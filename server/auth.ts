import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { db } from './db';
import { users, type User, lenders } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// User authentication strategy
passport.use('user-local',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(sql`LOWER(${users.email}) = LOWER(${email})`)
          .limit(1);

        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, { ...user, userType: 'user' });
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Lender authentication strategy
passport.use('lender-local',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        console.log('[LENDER AUTH] Login attempt for email:', email);
        
        const [lender] = await db
          .select()
          .from(lenders)
          .where(sql`LOWER(${lenders.email}) = LOWER(${email})`)
          .limit(1);

        if (!lender) {
          console.log('[LENDER AUTH] Lender not found for email:', email);
          return done(null, false, { message: 'Invalid email or password' });
        }

        console.log('[LENDER AUTH] Lender found:', lender.email, 'companyName:', lender.companyName);
        console.log('[LENDER AUTH] Password hash starts with:', lender.password?.substring(0, 10), 'length:', lender.password?.length);
        
        const isPasswordValid = await comparePassword(password, lender.password);
        console.log('[LENDER AUTH] Password comparison result:', isPasswordValid);

        if (!isPasswordValid) {
          console.log('[LENDER AUTH] Password invalid for lender:', lender.email);
          return done(null, false, { message: 'Invalid email or password' });
        }

        console.log('[LENDER AUTH] Login successful for lender:', lender.email);
        return done(null, { ...lender, userType: 'lender' });
      } catch (error) {
        console.error('[LENDER AUTH] Error during authentication:', error);
        return done(error);
      }
    }
  )
);

passport.serializeUser((user: Express.User, done) => {
  const userData = user as any;
  done(null, { id: userData.id, userType: userData.userType });
});

passport.deserializeUser(async (sessionData: any, done) => {
  try {
    console.log('[Deserialize] Session data:', sessionData);
    const { id, userType } = sessionData;
    
    if (userType === 'lender') {
      const [lender] = await db
        .select()
        .from(lenders)
        .where(eq(lenders.id, id))
        .limit(1);

      if (!lender) {
        console.log('[Deserialize] Lender not found for id:', id);
        return done(null, false);
      }

      console.log('[Deserialize] Lender restored:', lender.email);
      done(null, { ...lender, userType: 'lender' });
    } else {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('[Deserialize] User not found for id:', id);
        return done(null, false);
      }

      console.log('[Deserialize] User restored:', user.email, 'role:', user.role);
      done(null, { ...user, userType: 'user' });
    }
  } catch (error) {
    console.error('[Deserialize] Error:', error);
    done(error);
  }
});

export function ensureAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = req.user as User;

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

export function ensureLenderAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Lender authentication required' });
  }

  const user = req.user as any;
  
  if (user.userType !== 'lender') {
    return res.status(403).json({ error: 'Access denied: Lender authentication required' });
  }

  next();
}

export function ensureAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log('[ensureAdmin] Session ID:', req.sessionID, 'isAuthenticated:', req.isAuthenticated(), 'user:', req.user ? (req.user as any).email : 'none');
  
  if (!req.isAuthenticated()) {
    console.log('[ensureAdmin] Authentication failed - no valid session');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.user as any;
  
  if (user.role !== 'admin') {
    console.log('[ensureAdmin] Admin check failed - user role:', user.role);
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

export default passport;
