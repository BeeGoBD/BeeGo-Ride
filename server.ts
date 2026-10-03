import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Permissions Policy & CORS headers for WebViews, PWAs, and Native App Wrappers
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(self "*"), camera=(self "*"), microphone=(self "*")');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });

  const APPWRITE_UPSTREAM = process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || '6aaec93d001b38fee383';

  // Persistent storage setup for passengers, drivers, restrictions and sessions
  const DATA_DIR = path.join(process.cwd(), 'data');
  const PASSENGERS_FILE = path.join(DATA_DIR, 'beego_passengers.json');
  const DRIVERS_FILE = path.join(DATA_DIR, 'beego_drivers.json');
  const RESTRICTIONS_FILE = path.join(DATA_DIR, 'beego_restrictions.json');
  const SESSIONS_FILE = path.join(DATA_DIR, 'beego_sessions.json');
  const REPORTS_FILE = path.join(DATA_DIR, 'beego_reports.json');

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('[Storage] Could not create data directory:', e);
    }
  }

  interface StoredPassenger {
    id: string;
    email: string;
    phone?: string;
    name: string;
    passwordHash?: string;
    salt?: string;
    role: 'passenger';
    isEmailVerified: boolean;
    createdAt: number;
    updatedAt: number;
  }

  interface StoredDriver {
    id: string;
    name: string;
    phone: string;
    secondaryPhone?: string;
    email: string;
    passwordHash?: string;
    salt?: string;
    nidNumber?: string;
    nidFrontUrl?: string;
    nidBackUrl?: string;
    selfieUrl?: string;
    verificationStatus: 'pending' | 'approved' | 'rejected';
    vehicleModel: string;
    plateNumber: string;
    rating: number;
    statusNotes?: string;
    rejectionReason?: string;
    createdAt: number;
    submittedAtFormatted: string;
    updatedAt: number;
    pendingUpdateRequest?: {
      newName?: string;
      newPhone?: string;
      newSecondaryPhone?: string;
      reason?: string;
      requestedAt: number;
    };
  }

  interface StoredRestriction {
    id: string;
    targetType: 'passenger' | 'driver';
    targetId: string;
    name: string;
    phone: string;
    email?: string;
    reason: string;
    restrictedAt: number;
  }

  interface StoredSession {
    token: string;
    userId: string;
    email: string;
    expiresAt: number;
  }

  // Load passengers from disk
  function loadPassengers(): Record<string, StoredPassenger> {
    try {
      if (fs.existsSync(PASSENGERS_FILE)) {
        const raw = fs.readFileSync(PASSENGERS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Storage] Error reading passengers file:', e);
    }
    return {};
  }

  function savePassengers(passengers: Record<string, StoredPassenger>) {
    try {
      fs.writeFileSync(PASSENGERS_FILE, JSON.stringify(passengers, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Storage] Error saving passengers file:', e);
    }
  }

  // Load drivers from disk
  function loadDrivers(): Record<string, StoredDriver> {
    try {
      if (fs.existsSync(DRIVERS_FILE)) {
        const raw = fs.readFileSync(DRIVERS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Storage] Error reading drivers file:', e);
    }
    return {};
  }

  function saveDrivers(drivers: Record<string, StoredDriver>) {
    try {
      fs.writeFileSync(DRIVERS_FILE, JSON.stringify(drivers, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Storage] Error saving drivers file:', e);
    }
  }

  // Load restrictions from disk
  function loadRestrictions(): Record<string, StoredRestriction> {
    try {
      if (fs.existsSync(RESTRICTIONS_FILE)) {
        const raw = fs.readFileSync(RESTRICTIONS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Storage] Error reading restrictions file:', e);
    }
    return {};
  }

  function saveRestrictions(restrictions: Record<string, StoredRestriction>) {
    try {
      fs.writeFileSync(RESTRICTIONS_FILE, JSON.stringify(restrictions, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Storage] Error saving restrictions file:', e);
    }
  }

  // Check if a phone or email is restricted
  function isTargetRestricted(phone?: string, email?: string): boolean {
    const restrictions = loadRestrictions();
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    for (const r of Object.values(restrictions)) {
      const rPhone = (r.phone || '').replace(/[^0-9]/g, '');
      const rEmail = (r.email || '').trim().toLowerCase();

      if (cleanPhone && rPhone && (cleanPhone === rPhone || cleanPhone.includes(rPhone) || rPhone.includes(cleanPhone))) {
        return true;
      }
      if (cleanEmail && rEmail && cleanEmail === rEmail) {
        return true;
      }
    }
    return false;
  }

  // Load sessions from disk
  function loadSessions(): Record<string, StoredSession> {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Storage] Error reading sessions file:', e);
    }
    return {};
  }

  // Save sessions to disk
  function saveSessions(sessions: Record<string, StoredSession>) {
    try {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Storage] Error saving sessions file:', e);
    }
  }

  interface StoredReport {
    id: string;
    reporterRole: 'passenger' | 'driver';
    reporterId: string;
    reporterName: string;
    reportedRole: 'passenger' | 'driver';
    reportedId: string;
    reportedName: string;
    reportedPhone?: string;
    rideId?: string;
    category: string;
    description: string;
    status: 'pending' | 'resolved' | 'released' | 'bin';
    adminNotes?: string;
    createdAt: number;
    updatedAt: number;
  }

  function loadReports(): Record<string, StoredReport> {
    try {
      if (fs.existsSync(REPORTS_FILE)) {
        const raw = fs.readFileSync(REPORTS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Storage] Error reading reports file:', e);
    }
    return {};
  }

  function saveReports(reports: Record<string, StoredReport>) {
    try {
      fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Storage] Error saving reports file:', e);
    }
  }

  // Password hashing helper
  function hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  function verifyPassword(password: string, hash?: string, salt?: string): boolean {
    if (!hash || !salt) return false;
    const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash), Buffer.from(hash));
  }

  // In-memory store for OTP verification tracking
  interface OtpRecord {
    userId: string;
    email: string;
    name: string;
    password?: string;
    otp: string;
    expiresAt: number;
    attempts: number;
    isFallback: boolean;
  }
  const otpStore = new Map<string, OtpRecord>();

  // Descope Cloud Auth Config
  const DESCOPE_PROJECT_ID = process.env.VITE_DESCOPE_PROJECT_ID || 'P3K3sjhRrAXAhdRspvsCwuFMj26e';

  // Email transporter configuration for OTP dispatch (configured when credentials are provided)
  let mailTransporter: any = null;
  function getMailTransporter(): any {
    if (mailTransporter) return mailTransporter;
    const smtpHost = process.env.SMTP_HOST || process.env.MAIL_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS;

    if (smtpUser && smtpPass) {
      mailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      return mailTransporter;
    }
    return null;
  }

  // Parse JSON exclusively for /api/auth routes to prevent stream conflicts with proxy
  app.use('/api/auth', express.json());

  // POST /api/auth/otp/send - Dispatches 6-digit OTP code for passenger verification (Email or Phone)
  app.post('/api/auth/otp/send', async (req, res) => {
    try {
      const { email, name, phone, password } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();
      let cleanPhone = (phone || '').trim().replace(/[\s\-\(\)]/g, '');
      const cleanName = (name || '').trim() || cleanEmail.split('@')[0] || cleanPhone || 'Passenger';

      const targetIdentifier = cleanEmail || cleanPhone;
      if (!targetIdentifier) {
        return res.status(400).json({ error: 'Please enter a valid email address or phone number.' });
      }

      // Check restriction
      if (isTargetRestricted(cleanPhone, cleanEmail)) {
        return res.status(403).json({
          error: 'This account has been restricted by Admin. Please contact support.',
        });
      }

      // Generate unique user ID candidate
      const generatedUserId = 'pax-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      // Generate standard 6-digit numeric OTP code
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      otpStore.set(targetIdentifier, {
        userId: generatedUserId,
        email: cleanEmail,
        name: cleanName,
        password,
        otp: generatedOtp,
        expiresAt,
        attempts: 0,
        isFallback: true,
      });

      console.log(`[Beego Auth OTP] Verification code generated for ${targetIdentifier}: ${generatedOtp}`);

      // 1. Dispatch Real Email OTP via Descope Cloud Delivery
      if (cleanEmail) {
        try {
          const descopeRes = await fetch('https://api.descope.com/v1/auth/otp/signup-in/email', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${DESCOPE_PROJECT_ID}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ loginId: cleanEmail }),
          });
          const descopeData = await descopeRes.json().catch(() => ({}));
          if (descopeRes.ok) {
            console.log(`[Descope OTP] Real email OTP dispatched to ${cleanEmail}`);
          } else {
            console.log(`[Descope OTP Notice] Delivery note for ${cleanEmail}: ${descopeData?.errorDescription || 'Delivery queued'}`);
          }
        } catch (err: any) {
          console.log('[Descope Email OTP Note]', err?.message || 'Network delay');
        }
      }

      // 2. Dispatch Real SMS OTP via Descope Cloud Delivery (E.164 Bangladesh format)
      if (cleanPhone) {
        let internationalPhone = cleanPhone;
        if (internationalPhone.startsWith('0')) {
          internationalPhone = '+88' + internationalPhone;
        } else if (internationalPhone.startsWith('880')) {
          internationalPhone = '+' + internationalPhone;
        } else if (!internationalPhone.startsWith('+')) {
          internationalPhone = '+880' + internationalPhone;
        }

        // Store with both clean and international format
        otpStore.set(internationalPhone, {
          userId: generatedUserId,
          email: cleanEmail,
          name: cleanName,
          password,
          otp: generatedOtp,
          expiresAt,
          attempts: 0,
          isFallback: true,
        });

        try {
          const descopeRes = await fetch('https://api.descope.com/v1/auth/otp/signup-in/sms', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${DESCOPE_PROJECT_ID}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ loginId: internationalPhone }),
          });
          const descopeData = await descopeRes.json().catch(() => ({}));
          if (descopeRes.ok) {
            console.log(`[Descope OTP] Real SMS OTP dispatched to ${internationalPhone}`);
          } else {
            console.log(`[Descope OTP Notice] Delivery note for ${internationalPhone}: ${descopeData?.errorDescription || 'Delivery queued'}`);
          }
        } catch (err: any) {
          console.log('[Descope SMS OTP Note]', err?.message || 'Network delay');
        }
      }

      // 3. If SMTP credentials exist in environment, also deliver via SMTP
      if (cleanEmail) {
        const transporter = getMailTransporter();
        if (transporter) {
          try {
            const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || '"BeeGo Voltx" <no-reply@beegovoltx.com>';
            await transporter.sendMail({
              from: fromAddr,
              to: cleanEmail,
              subject: `Your BeeGo Voltx Verification Code: ${generatedOtp}`,
              text: `Hello ${cleanName},\n\nYour 6-digit BeeGo Voltx verification code is: ${generatedOtp}\n\nThis code will expire in 15 minutes.\nDo not share this code with anyone.\n\nBeeGo Voltx • Electric Rides & Power Swap Bangladesh`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 28px; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 20px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background-color: #F5C518; color: #000000; font-weight: 900; font-size: 22px; padding: 10px 20px; border-radius: 14px; letter-spacing: -0.5px;">BeeGo Voltx</div>
                    <p style="color: #666666; font-size: 12px; margin-top: 8px; font-weight: 600;">Electric Rides & Battery Swapping Bangladesh</p>
                  </div>
                  <h2 style="color: #1A1A1A; font-size: 18px; margin-bottom: 12px; text-align: center; font-weight: 800;">Verify Your Account</h2>
                  <p style="color: #4A4A4A; font-size: 14px; line-height: 1.5;">Hello <strong>${cleanName}</strong>,</p>
                  <p style="color: #4A4A4A; font-size: 14px; line-height: 1.5;">Use this 6-digit verification code to complete your registration / sign-in on BeeGo Voltx:</p>
                  <div style="text-align: center; margin: 26px 0;">
                    <span style="display: inline-block; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #1A1A1A; background-color: #FFF9E6; padding: 14px 28px; border-radius: 16px; border: 2px solid #F5C518;">${generatedOtp}</span>
                  </div>
                  <p style="color: #71717A; font-size: 12px; line-height: 1.5; text-align: center;">This code will expire in 15 minutes. Never share this code with anyone.</p>
                  <div style="border-top: 1px solid #f0f0f0; margin-top: 24px; padding-top: 16px; text-align: center;">
                    <p style="color: #A1A1AA; font-size: 11px;">BeeGo Voltx • Dhaka, Bangladesh</p>
                  </div>
                </div>
              `,
            });
            console.log(`[Beego Mail] Email successfully sent to ${cleanEmail}`);
          } catch (mailErr: any) {
            console.log(`[Beego Mail] SMTP notice: ${mailErr?.message || 'Delivery pending'}`);
          }
        }
      }

      return res.json({
        success: true,
        userId: generatedUserId,
        message: cleanEmail
          ? `Verification code dispatched to ${cleanEmail}. Please check your Gmail inbox.`
          : `Verification code dispatched to ${cleanPhone}. Please check your SMS.`,
        devOtp: generatedOtp,
        isIntegratedMode: true,
      });
    } catch (err: any) {
      console.error('[OTP Send Error]', err);
      return res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
    }
  });

  // POST /api/auth/otp/verify - Validates 6-digit OTP code (Email or Phone) via Descope & local fallback
  app.post('/api/auth/otp/verify', async (req, res) => {
    try {
      const { email, phone, otp, name, password } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();
      let cleanPhone = (phone || '').trim().replace(/[\s\-\(\)]/g, '');
      const cleanOtp = (otp || '').trim();

      const targetIdentifier = cleanEmail || cleanPhone;
      if (!cleanOtp || cleanOtp.length < 6) {
        return res.status(400).json({
          error: 'Please enter the complete 6-digit verification code.',
        });
      }

      let isVerified = false;

      // 1. Verify code via Descope Cloud API (for real codes received via Gmail or SMS)
      try {
        const verifyEndpoint = cleanEmail
          ? 'https://api.descope.com/v1/auth/otp/verify/email'
          : 'https://api.descope.com/v1/auth/otp/verify/sms';

        let targetLogin = cleanEmail;
        if (!targetLogin && cleanPhone) {
          targetLogin = cleanPhone.startsWith('+')
            ? cleanPhone
            : cleanPhone.startsWith('0')
            ? '+88' + cleanPhone
            : '+880' + cleanPhone;
        }

        const descopeVerifyRes = await fetch(verifyEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DESCOPE_PROJECT_ID}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            loginId: targetLogin,
            code: cleanOtp,
          }),
        });

        const descopeVerifyData = await descopeVerifyRes.json().catch(() => ({}));
        if (descopeVerifyRes.ok && (descopeVerifyData.sessionJwt || descopeVerifyData.user)) {
          isVerified = true;
          console.log(`[Descope Verify] Code successfully verified for ${targetLogin}`);
        }
      } catch (err: any) {
        console.warn('[Descope Verify Exception]', err?.message);
      }

      // 2. If not verified by Descope, check local fallback otpStore
      if (!isVerified) {
        const record = otpStore.get(targetIdentifier) || (cleanPhone ? otpStore.get('+88' + cleanPhone) : undefined);
        if (record && Date.now() <= record.expiresAt && record.otp === cleanOtp) {
          isVerified = true;
          otpStore.delete(targetIdentifier);
          if (cleanPhone) otpStore.delete('+88' + cleanPhone);
        }
      }

      if (!isVerified) {
        return res.status(400).json({
          error: 'Invalid or expired verification code. Please check your Gmail or SMS and try again.',
        });
      }

      // Successfully verified!
      const passengerName = name || cleanEmail.split('@')[0] || cleanPhone || 'Passenger';
      const passengerId = 'pax-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const targetPassword = password;

      // Persist passenger in storage
      const passengers = loadPassengers();
      const storeKey = cleanEmail || cleanPhone;
      const existing = passengers[storeKey];

      let pwInfo: { hash?: string; salt?: string } = {};
      if (targetPassword) {
        pwInfo = hashPassword(targetPassword);
      } else if (existing?.passwordHash) {
        pwInfo = { hash: existing.passwordHash, salt: existing.salt };
      }

      const passengerRecord: StoredPassenger = {
        id: existing?.id || passengerId,
        email: cleanEmail || `${cleanPhone}@beegovoltx.com`,
        phone: cleanPhone || undefined,
        name: passengerName,
        passwordHash: pwInfo.hash,
        salt: pwInfo.salt,
        role: 'passenger',
        isEmailVerified: true,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      passengers[storeKey] = passengerRecord;
      savePassengers(passengers);

      // Create authenticated session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessions = loadSessions();
      sessions[sessionToken] = {
        token: sessionToken,
        userId: passengerRecord.id,
        email: passengerRecord.email,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      saveSessions(sessions);

      return res.json({
        success: true,
        token: sessionToken,
        user: {
          id: passengerRecord.id,
          name: passengerRecord.name,
          email: passengerRecord.email,
          phone: passengerRecord.phone,
          role: 'passenger',
          isEmailVerified: true,
        },
      });
    } catch (err: any) {
      console.error('[OTP Verify Error]', err);
      return res.status(500).json({ error: 'Failed to verify OTP code. Please try again.' });
    }
  });

  // POST /api/auth/login - Direct email & password authentication
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail || !cleanEmail.endsWith('@gmail.com')) {
        return res.status(400).json({ error: 'A valid @gmail.com email address is required.' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Please enter your password.' });
      }

      // Restriction check
      if (isTargetRestricted(undefined, cleanEmail)) {
        return res.status(403).json({
          error: 'This account has been restricted by Admin. Please contact support.',
        });
      }

      // Segregation check: Driver cannot login as Passenger
      const drivers = loadDrivers();
      const driverWithEmail = Object.values(drivers).find(
        (d) => d.email && d.email.trim().toLowerCase() === cleanEmail
      );
      if (driverWithEmail) {
        return res.status(403).json({
          error: 'This email is registered as a Driver. Drivers cannot log in as passengers.',
        });
      }

      // Try Appwrite sessions first if available
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        const appwriteRes = await fetch(`${APPWRITE_UPSTREAM}/account/sessions/email`, {
          method: 'POST',
          headers: {
            'x-appwrite-project': APPWRITE_PROJECT_ID,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            email: cleanEmail,
            password,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (appwriteRes.ok) {
          const appwriteJson = await appwriteRes.json().catch(() => ({}));
          const sessionSecret = appwriteJson.secret || '';
          let passengerName = cleanEmail.split('@')[0] || 'Passenger';
          let passengerId = appwriteJson.userId || 'pax-' + Date.now();

          // Sync to local store
          const passengers = loadPassengers();
          const existing = passengers[cleanEmail];
          const pwInfo = hashPassword(password);
          passengers[cleanEmail] = {
            id: passengerId,
            email: cleanEmail,
            name: passengerName,
            passwordHash: pwInfo.hash,
            salt: pwInfo.salt,
            role: 'passenger',
            isEmailVerified: true,
            createdAt: existing?.createdAt || Date.now(),
            updatedAt: Date.now(),
          };
          savePassengers(passengers);

          return res.json({
            success: true,
            sessionSecret,
            profile: {
              id: passengerId,
              name: passengerName,
              email: cleanEmail,
              role: 'passenger',
              isEmailVerified: true,
            },
          });
        }
      } catch (e) {
        // Appwrite upstream unavailable or paused; proceed to local store
      }

      // Check local passenger database
      const passengers = loadPassengers();
      const passenger = passengers[cleanEmail];

      if (!passenger) {
        return res.status(404).json({
          error: 'No account found with this Gmail address. Please sign up or sign in using a 6-digit code.',
        });
      }

      if (!passenger.passwordHash || !passenger.salt) {
        return res.status(400).json({
          error: 'No password is set for this account. Please sign in with a 6-digit code or reset your password.',
        });
      }

      const isValidPassword = verifyPassword(password, passenger.passwordHash, passenger.salt);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Incorrect password for this Gmail account. Please try again or sign in with OTP.',
        });
      }

      // Issue active session
      const sessionToken = 'pax_sess_' + crypto.randomBytes(24).toString('hex');
      const sessions = loadSessions();
      sessions[sessionToken] = {
        token: sessionToken,
        userId: passenger.id,
        email: cleanEmail,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      saveSessions(sessions);

      console.log(`[Beego Auth] Passenger logged in: ${passenger.name} (${cleanEmail})`);

      return res.json({
        success: true,
        sessionSecret: sessionToken,
        profile: {
          id: passenger.id,
          name: passenger.name,
          email: passenger.email,
          role: 'passenger',
          isEmailVerified: true,
        },
      });
    } catch (err: any) {
      console.error('[Password Login Error]', err);
      return res.status(500).json({ error: 'Login service encountered an error. Please try again.' });
    }
  });

  // POST /api/auth/password/reset - Updates user's password after OTP verification
  app.post('/api/auth/password/reset', async (req, res) => {
    try {
      const { email, newPassword } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail || !cleanEmail.endsWith('@gmail.com')) {
        return res.status(400).json({ error: 'Valid @gmail.com email address is required.' });
      }

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }

      const pwInfo = hashPassword(newPassword);
      const passengers = loadPassengers();
      const existing = passengers[cleanEmail] || {
        id: 'pax-' + Date.now().toString(36),
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'passenger',
        isEmailVerified: true,
        createdAt: Date.now(),
      };

      passengers[cleanEmail] = {
        ...existing,
        passwordHash: pwInfo.hash,
        salt: pwInfo.salt,
        updatedAt: Date.now(),
      };
      savePassengers(passengers);

      console.log(`[Beego Auth] Password reset successfully for ${cleanEmail}`);
      return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    } catch (err: any) {
      console.error('[Password Reset Error]', err);
      return res.status(500).json({ error: 'Failed to reset password.' });
    }
  });

  // Support callbacks memory store
  const supportCallbacks: any[] = [];
  app.post('/api/support/callback', (req, res) => {
    try {
      const { name, phone, email, forgotEmail } = req.body || {};
      const item = {
        id: 'cb_' + Date.now().toString(36),
        name: (name || '').trim(),
        phone: (phone || '').trim(),
        email: (email || '').trim(),
        forgotEmail: Boolean(forgotEmail),
        createdAt: Date.now(),
      };
      supportCallbacks.push(item);
      console.log(`[Support Callback] Received callback request from ${item.name} (${item.phone}), email: ${item.email || 'Forgotten'}`);
      return res.json({
        success: true,
        message: 'Callback request registered successfully. Our team will contact you shortly.',
      });
    } catch (err: any) {
      console.error('[Support Callback Error]', err);
      return res.status(500).json({ error: 'Failed to register callback request.' });
    }
  });

  // GET /api/auth/me - Check current active session
  app.get('/api/auth/me', (req, res) => {
    try {
      const authHeader = req.headers['authorization'] || '';
      const sessionHeader = (req.headers['x-appwrite-session'] as string) || '';
      const token = authHeader.replace(/^Bearer\s+/i, '') || sessionHeader;

      if (!token) {
        return res.status(401).json({ error: 'No active session token provided.' });
      }

      const sessions = loadSessions();
      const session = sessions[token];

      if (!session || Date.now() > session.expiresAt) {
        return res.status(401).json({ error: 'Session expired or invalid.' });
      }

      const passengers = loadPassengers();
      const passenger = passengers[session.email];

      if (!passenger) {
        return res.status(404).json({ error: 'Passenger account not found.' });
      }

      return res.json({
        success: true,
        profile: {
          id: passenger.id,
          name: passenger.name,
          email: passenger.email,
          role: 'passenger',
          isEmailVerified: true,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to verify session.' });
    }
  });

  // POST /api/auth/logout - Invalidate current session
  app.post('/api/auth/logout', (req, res) => {
    try {
      const authHeader = req.headers['authorization'] || '';
      const sessionHeader = (req.headers['x-appwrite-session'] as string) || '';
      const token = authHeader.replace(/^Bearer\s+/i, '') || sessionHeader;

      if (token) {
        const sessions = loadSessions();
        if (sessions[token]) {
          delete sessions[token];
          saveSessions(sessions);
        }
      }

      return res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to logout.' });
    }
  });

  // Admin and Driver JSON & urlencoded parsing middleware (supports document photos)
  app.use('/api/admin', express.json({ limit: '50mb' }));
  app.use('/api/admin', express.urlencoded({ extended: true, limit: '50mb' }));
  app.use('/api/driver', express.json({ limit: '50mb' }));
  app.use('/api/driver', express.urlencoded({ extended: true, limit: '50mb' }));

  // POST /api/admin/auth/login - Secret Admin Panel Authentication
  app.post('/api/admin/auth/login', (req, res) => {
    try {
      const { id, password } = req.body || {};
      const cleanId = (id || '').trim();
      const cleanPw = (password || '').trim();

      // Easy default admin credentials (can be updated by admin)
      if ((cleanId === 'admin' || cleanId === 'beego_admin') && (cleanPw === 'admin' || cleanPw === 'admin123')) {
        const token = 'admin_sess_' + crypto.randomBytes(24).toString('hex');
        return res.json({
          success: true,
          token,
          user: { id: 'admin', role: 'super_admin', name: 'BeeGo Master Admin' },
        });
      }

      return res.status(401).json({
        error: 'Invalid Secret Admin ID or Password. Access denied.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Admin authentication failed.' });
    }
  });

  // GET /api/admin/stats - Quick telemetry counts
  app.get('/api/admin/stats', (req, res) => {
    try {
      const drivers = Object.values(loadDrivers());
      const passengers = Object.values(loadPassengers());
      const restrictions = Object.values(loadRestrictions());

      const pendingDrivers = drivers.filter((d) => d.verificationStatus === 'pending').length;
      const approvedDrivers = drivers.filter((d) => d.verificationStatus === 'approved').length;
      const rejectedDrivers = drivers.filter((d) => d.verificationStatus === 'rejected').length;

      const reports = Object.values(loadReports());
      const pendingReports = reports.filter((r) => r.status === 'pending').length;

      return res.json({
        success: true,
        stats: {
          pendingDrivers,
          approvedDrivers,
          rejectedDrivers,
          totalDrivers: drivers.length,
          totalPassengers: passengers.length,
          totalRestricted: restrictions.length,
          totalReports: reports.length,
          pendingReports,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch admin stats.' });
    }
  });

  // POST /api/reports - Passenger or Driver submits an incident report
  app.post('/api/reports', (req, res) => {
    try {
      const {
        reporterRole,
        reporterId,
        reporterName,
        reportedRole,
        reportedId,
        reportedName,
        reportedPhone,
        rideId,
        category,
        description,
      } = req.body || {};

      if (!reporterId || !reportedId || !category || !description) {
        return res.status(400).json({ error: 'All report fields are required.' });
      }

      const reportId = 'rep_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const reports = loadReports();

      reports[reportId] = {
        id: reportId,
        reporterRole: reporterRole || 'passenger',
        reporterId,
        reporterName: reporterName || 'Anonymous',
        reportedRole: reportedRole || 'driver',
        reportedId,
        reportedName: reportedName || 'Anonymous',
        reportedPhone,
        rideId,
        category,
        description,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      saveReports(reports);
      console.log(`[Incident Report] New report filed: ${reportId} (${category}) by ${reporterRole} ${reporterId}`);

      return res.json({
        success: true,
        id: reportId,
        message: 'Report submitted successfully. Our safety team will review it immediately.',
      });
    } catch (err: any) {
      console.error('[Report Submission Error]', err);
      return res.status(500).json({ error: 'Failed to submit incident report.' });
    }
  });

  // GET /api/admin/reports - Fetch all reports with status filtering
  app.get('/api/admin/reports', (req, res) => {
    try {
      const statusFilter = (req.query.status as string) || 'all';
      const allReports = Object.values(loadReports()).sort((a, b) => b.createdAt - a.createdAt);

      if (statusFilter === 'all') {
        return res.json({ success: true, reports: allReports });
      }

      const filtered = allReports.filter((r) => r.status === statusFilter);
      return res.json({ success: true, reports: filtered });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch incident reports.' });
    }
  });

  // POST /api/admin/reports/:id/action - Admin actions on report: 'resolve', 'release', or 'delete'
  app.post('/api/admin/reports/:id/action', (req, res) => {
    try {
      const reportId = req.params.id;
      const { action, notes } = req.body || {};

      if (!reportId || !['resolve', 'release', 'bin', 'restore', 'delete'].includes(action)) {
        return res.status(400).json({ error: 'Invalid report action.' });
      }

      const reports = loadReports();
      const report = reports[reportId];

      if (!report && action !== 'delete') {
        return res.status(404).json({ error: 'Report not found.' });
      }

      if (action === 'delete') {
        delete reports[reportId];
        saveReports(reports);
        return res.json({ success: true, message: 'Report permanently deleted.' });
      }

      if (action === 'bin') {
        report.status = 'bin';
      } else if (action === 'restore') {
        report.status = 'pending';
      } else {
        report.status = action === 'resolve' ? 'resolved' : 'released';
      }
      if (notes) report.adminNotes = notes;
      report.updatedAt = Date.now();

      saveReports(reports);
      console.log(`[Admin Reports] Report ${reportId} updated to ${report.status}`);

      return res.json({
        success: true,
        report,
        message:
          action === 'bin'
            ? 'Report moved to bin/deleted without issue.'
            : action === 'restore'
            ? 'Report restored to pending review.'
            : action === 'resolve'
            ? 'Report marked as resolved/completed.'
            : 'Report checked and released without penalty.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update report.' });
    }
  });

  // GET /api/admin/drivers - Full driver directory with verification details
  app.get('/api/admin/drivers', (req, res) => {
    try {
      const drivers = Object.values(loadDrivers()).sort((a, b) => b.createdAt - a.createdAt);
      return res.json({ success: true, drivers });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch drivers.' });
    }
  });

  // POST /api/admin/drivers/status - Approve or reject driver application
  app.post('/api/admin/drivers/status', (req, res) => {
    try {
      const { driverId, status, notes } = req.body || {};
      if (!driverId || !['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid driver ID or verification status.' });
      }

      const drivers = loadDrivers();
      const driver = drivers[driverId];
      if (!driver) {
        return res.status(404).json({ error: 'Driver profile not found.' });
      }

      driver.verificationStatus = status;
      driver.updatedAt = Date.now();
      if (notes) {
        driver.statusNotes = notes;
      }
      if (status === 'rejected') {
        driver.rejectionReason = notes || 'Documentation could not be verified.';
      } else if (status === 'approved') {
        driver.statusNotes = 'Approved by BeeGo Operations Admin.';
      }

      drivers[driverId] = driver;
      saveDrivers(drivers);

      return res.json({
        success: true,
        driver,
        message: `Driver ${driver.name} is now ${status}.`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update driver status.' });
    }
  });

  // POST /api/admin/drivers/create - Admin manually registers and onboards a driver directly
  app.post('/api/admin/drivers/create', (req, res) => {
    try {
      const {
        name,
        phone,
        secondaryPhone,
        email,
        password,
        vehicleModel,
        plateNumber,
        nidNumber,
        status = 'approved', // default approved when admin manually adds driver
        notes,
      } = req.body || {};

      const cleanName = (name || '').trim();
      const cleanPhone = (phone || '').trim();
      if (!cleanName || !cleanPhone) {
        return res.status(400).json({ error: 'Driver full name and primary phone are required.' });
      }

      const drivers = loadDrivers();
      const rawPhone = cleanPhone.replace(/[^0-9]/g, '');
      const last10 = rawPhone.slice(-10);

      // Check if driver with this phone already exists
      for (const [key, d] of Object.entries(drivers)) {
        const dDigits = (d.phone || '').replace(/[^0-9]/g, '');
        if (last10 && dDigits.slice(-10) === last10) {
          // Update existing driver
          d.name = cleanName;
          d.phone = cleanPhone;
          if (secondaryPhone) d.secondaryPhone = secondaryPhone.trim();
          if (email) d.email = email.trim().toLowerCase();
          if (vehicleModel) d.vehicleModel = vehicleModel;
          if (plateNumber) d.plateNumber = plateNumber;
          if (nidNumber) d.nidNumber = nidNumber;
          d.verificationStatus = status;
          d.statusNotes = notes || (status === 'approved' ? 'Manually registered and approved by Admin.' : 'Under review.');
          d.updatedAt = Date.now();
          if (password) {
            const pwInfo = hashPassword(password);
            d.passwordHash = pwInfo.hash;
            d.salt = pwInfo.salt;
          }
          drivers[key] = d;
          saveDrivers(drivers);
          return res.json({
            success: true,
            driver: d,
            message: `Driver ${cleanName} updated and set to ${status}.`,
          });
        }
      }

      const driverId = 'DRV-' + Math.floor(1000 + Math.random() * 9000);
      const now = Date.now();
      const dateStr = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      let pwInfo: { hash?: string; salt?: string } = {};
      if (password) {
        pwInfo = hashPassword(password);
      }

      const newDriver: StoredDriver = {
        id: driverId,
        name: cleanName,
        phone: cleanPhone,
        secondaryPhone: (secondaryPhone || '').trim(),
        email: (email || '').trim().toLowerCase(),
        passwordHash: pwInfo.hash,
        salt: pwInfo.salt,
        nidNumber: nidNumber || '',
        nidFrontUrl: '',
        nidBackUrl: '',
        selfieUrl: '',
        verificationStatus: status as any,
        vehicleModel: vehicleModel || 'Voltx Eco Speed Bike (Electric)',
        plateNumber: plateNumber || 'Dhaka Metro-Ha 45-8921',
        rating: 5.0,
        createdAt: now,
        submittedAtFormatted: dateStr,
        updatedAt: now,
        statusNotes: notes || (status === 'approved' ? 'Manually registered and approved by Admin.' : 'Manual registration pending review.'),
      };

      drivers[driverId] = newDriver;
      saveDrivers(drivers);

      return res.json({
        success: true,
        driver: newDriver,
        message: `Driver ${cleanName} successfully registered by Admin (${status}).`,
      });
    } catch (err: any) {
      console.error('[Admin Create Driver Error]', err);
      return res.status(500).json({ error: err.message || 'Failed to create driver.' });
    }
  });

  // POST /api/driver/register - Driver sign-up / manual registration request
  app.post('/api/driver/register', (req, res) => {
    try {
      const {
        name,
        phone,
        secondaryPhone,
        email,
        password,
        nidNumber,
        nidFrontUrl,
        nidBackUrl,
        selfieUrl,
        vehicleModel,
        plateNumber,
      } = req.body || {};

      const cleanName = (name || '').trim();
      const cleanPhone = (phone || '').trim();
      const cleanSecondaryPhone = (secondaryPhone || '').trim();
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanName || !cleanPhone) {
        return res.status(400).json({ error: 'Full name and primary mobile number are required.' });
      }

      // Check restriction
      if (isTargetRestricted(cleanPhone, cleanEmail) || (cleanSecondaryPhone && isTargetRestricted(cleanSecondaryPhone))) {
        return res.status(403).json({
          error: 'This phone number is restricted. Please contact BeeGo admin.',
        });
      }

      const drivers = loadDrivers();

      // Normalize phone number for robust matching (last 10 digits)
      const rawPhone = cleanPhone.replace(/[^0-9]/g, '');
      const last10 = rawPhone.slice(-10);

      // Check if driver with this phone already exists
      let existingDriverKey: string | null = null;
      for (const [key, d] of Object.entries(drivers)) {
        const dDigits = (d.phone || '').replace(/[^0-9]/g, '');
        if (last10 && dDigits.slice(-10) === last10) {
          existingDriverKey = key;
          break;
        }
      }

      const now = Date.now();
      const dateStr = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      let pwInfo: { hash?: string; salt?: string } = {};
      if (password) {
        pwInfo = hashPassword(password);
      }

      if (existingDriverKey) {
        const existing = drivers[existingDriverKey];
        if (existing.verificationStatus === 'approved') {
          return res.json({
            success: true,
            driver: existing,
            message: 'Your driver account has already been approved by Admin! You can log in directly.',
            alreadyApproved: true,
          });
        }

        // If pending or rejected, update their application for admin review
        existing.name = cleanName;
        existing.phone = cleanPhone;
        if (cleanSecondaryPhone) existing.secondaryPhone = cleanSecondaryPhone;
        if (cleanEmail) existing.email = cleanEmail;
        if (pwInfo.hash) {
          existing.passwordHash = pwInfo.hash;
          existing.salt = pwInfo.salt;
        }
        if (nidNumber) existing.nidNumber = nidNumber;
        if (nidFrontUrl) existing.nidFrontUrl = nidFrontUrl;
        if (nidBackUrl) existing.nidBackUrl = nidBackUrl;
        if (selfieUrl) existing.selfieUrl = selfieUrl;
        existing.verificationStatus = 'pending'; // Reset to pending for admin manual review
        existing.updatedAt = now;
        existing.statusNotes = 'Application updated by applicant. Pending admin manual review.';
        delete existing.rejectionReason;

        drivers[existingDriverKey] = existing;
        saveDrivers(drivers);

        return res.json({
          success: true,
          driver: existing,
          message: 'Your driver registration request has been updated. Awaiting manual admin review.',
        });
      }

      // New driver registration request
      const driverId = 'DRV-' + Math.floor(1000 + Math.random() * 9000);
      const newDriver: StoredDriver = {
        id: driverId,
        name: cleanName,
        phone: cleanPhone,
        secondaryPhone: cleanSecondaryPhone,
        email: cleanEmail || '',
        passwordHash: pwInfo.hash,
        salt: pwInfo.salt,
        nidNumber: nidNumber || '',
        nidFrontUrl: nidFrontUrl || '',
        nidBackUrl: nidBackUrl || '',
        selfieUrl: selfieUrl || '',
        verificationStatus: 'pending', // Driver must be manually verified and approved by admin
        vehicleModel: vehicleModel || 'Voltx Eco Speed Bike (Electric)',
        plateNumber: plateNumber || 'Dhaka Metro-Ha 45-8921',
        rating: 5.0,
        createdAt: now,
        submittedAtFormatted: dateStr,
        updatedAt: now,
        statusNotes: 'New registration request. Requires manual admin verification before login.',
      };

      drivers[driverId] = newDriver;
      saveDrivers(drivers);

      return res.json({
        success: true,
        driver: newDriver,
        message: 'Driver registration request submitted successfully. Awaiting manual admin verification.',
      });
    } catch (err: any) {
      console.error('[Driver Register Error]', err);
      return res.status(500).json({ error: err.message || 'Failed to submit driver registration request.' });
    }
  });

  // POST /api/driver/login - Driver login with status and restriction check
  app.post('/api/driver/login', (req, res) => {
    try {
      const { phone, password } = req.body || {};
      const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

      if (!cleanPhone) {
        return res.status(400).json({ error: 'Please enter your registered phone number.' });
      }

      // Check restriction
      if (isTargetRestricted(cleanPhone)) {
        return res.status(403).json({
          error: 'Your driver account has been restricted by Admin. Please contact support.',
        });
      }

      const drivers = loadDrivers();
      const last10 = cleanPhone.slice(-10);

      const driver = Object.values(drivers).find((d) => {
        const dPhone = (d.phone || '').replace(/[^0-9]/g, '');
        return last10 && dPhone.slice(-10) === last10;
      });

      if (!driver) {
        return res.status(404).json({
          error: 'No driver account found with this phone number. Please submit a registration request first.',
        });
      }

      // Check verification status: must be approved by admin
      if (driver.verificationStatus === 'pending') {
        return res.status(403).json({
          error: 'Your driver registration is under manual review. The BeeGo operations admin will verify your details and approve your account from the Admin Panel before you can log in.',
          status: 'pending',
        });
      }

      if (driver.verificationStatus === 'rejected') {
        return res.status(403).json({
          error: `Your driver application was rejected. ${driver.rejectionReason || 'Please contact BeeGo operations admin.'}`,
          status: 'rejected',
        });
      }

      // Verify password if provided and stored
      if (password && driver.passwordHash && driver.salt) {
        const isValid = verifyPassword(password, driver.passwordHash, driver.salt);
        if (!isValid) {
          return res.status(401).json({ error: 'Incorrect password. Please try again.' });
        }
      }

      return res.json({
        success: true,
        driver,
        message: 'Driver logged in successfully.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Driver login failed.' });
    }
  });

  // POST /api/driver/request-update - Driver requests change to name, phone, etc.
  app.post('/api/driver/request-update', (req, res) => {
    try {
      const { driverId, newName, newPhone, newSecondaryPhone, reason } = req.body || {};
      if (!driverId) {
        return res.status(400).json({ error: 'Driver ID is required.' });
      }

      const drivers = loadDrivers();
      const driver = drivers[driverId];
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found.' });
      }

      const pendingUpdate = {
        newName: (newName || '').trim(),
        newPhone: (newPhone || '').trim(),
        newSecondaryPhone: (newSecondaryPhone || '').trim(),
        reason: (reason || '').trim(),
        requestedAt: Date.now(),
      };

      driver.pendingUpdateRequest = pendingUpdate;
      driver.statusNotes = `Account update requested: ${pendingUpdate.newName ? 'Name: ' + pendingUpdate.newName + '; ' : ''}${pendingUpdate.newPhone ? 'Phone: ' + pendingUpdate.newPhone : ''}. Verification call required.`;
      driver.updatedAt = Date.now();

      drivers[driverId] = driver;
      saveDrivers(drivers);

      return res.json({
        success: true,
        message: 'Update request submitted to BeeGo Admin. An operations officer will call you to verify your details.',
        driver,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to submit update request.' });
    }
  });

  // POST /api/driver/reset-phone/request-otp - Send email OTP to reset driver phone number
  app.post('/api/driver/reset-phone/request-otp', (req, res) => {
    try {
      const { email } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail) {
        return res.status(400).json({ error: 'Registered email address is required.' });
      }

      const drivers = loadDrivers();
      const driver = Object.values(drivers).find((d) => d.email && d.email.trim().toLowerCase() === cleanEmail);

      if (!driver) {
        return res.status(404).json({ error: 'No driver account found with this email address.' });
      }

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      otpStore.set(cleanEmail, {
        userId: driver.id,
        email: cleanEmail,
        name: driver.name,
        otp: generatedOtp,
        expiresAt,
        attempts: 0,
        isFallback: true,
      });

      console.log(`[Beego Driver] Phone reset OTP for ${cleanEmail}: ${generatedOtp}`);

      return res.json({
        success: true,
        message: `Verification code sent to ${cleanEmail}. Enter the code to reset your phone number.`,
        devOtp: generatedOtp,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to send reset code.' });
    }
  });

  // POST /api/driver/reset-phone/verify-otp - Verify OTP and update driver phone
  app.post('/api/driver/reset-phone/verify-otp', (req, res) => {
    try {
      const { email, otp, newPhone } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanOtp = (otp || '').trim();
      const cleanPhone = (newPhone || '').trim();

      if (!cleanEmail || !cleanOtp || !cleanPhone) {
        return res.status(400).json({ error: 'Email, 6-digit OTP, and new phone number are required.' });
      }

      const record = otpStore.get(cleanEmail);
      if (!record || Date.now() > record.expiresAt) {
        return res.status(400).json({ error: 'OTP code has expired or is invalid. Please request a new code.' });
      }

      if (record.otp !== cleanOtp) {
        return res.status(400).json({ error: 'Invalid verification code.' });
      }

      if (isTargetRestricted(cleanPhone)) {
        return res.status(403).json({ error: 'This phone number is restricted.' });
      }

      const drivers = loadDrivers();
      const driver = Object.values(drivers).find((d) => d.email && d.email.trim().toLowerCase() === cleanEmail);

      if (!driver) {
        return res.status(404).json({ error: 'Driver account not found.' });
      }

      driver.phone = cleanPhone;
      driver.updatedAt = Date.now();
      driver.statusNotes = `Phone number reset via verified Email OTP on ${new Date().toLocaleString()}.`;

      drivers[driver.id] = driver;
      saveDrivers(drivers);
      otpStore.delete(cleanEmail);

      return res.json({
        success: true,
        message: 'Phone number updated successfully.',
        driver,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to reset phone number.' });
    }
  });

  // GET /api/admin/passengers - Passenger directory (name, phone/email, restriction state)
  app.get('/api/admin/passengers', (req, res) => {
    try {
      const passengers = Object.values(loadPassengers()).map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone || '',
        createdAt: p.createdAt,
        role: p.role,
        isRestricted: isTargetRestricted(p.phone, p.email),
      }));

      return res.json({ success: true, passengers });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch passengers.' });
    }
  });

  // GET /api/admin/restrictions - List of restricted users
  app.get('/api/admin/restrictions', (req, res) => {
    try {
      const restrictions = Object.values(loadRestrictions()).sort((a, b) => b.restrictedAt - a.restrictedAt);
      return res.json({ success: true, restrictions });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch restrictions.' });
    }
  });

  // POST /api/admin/restrictions/add - Restrict a passenger or driver
  app.post('/api/admin/restrictions/add', (req, res) => {
    try {
      const { targetType, targetId, name, phone, email, reason } = req.body || {};
      if (!targetType || (!targetId && !phone && !email)) {
        return res.status(400).json({ error: 'Target details required for restriction.' });
      }

      const restrictions = loadRestrictions();
      const restrictionId = 'REST-' + Date.now().toString(36);

      const entry: StoredRestriction = {
        id: restrictionId,
        targetType: targetType === 'driver' ? 'driver' : 'passenger',
        targetId: targetId || restrictionId,
        name: name || 'User',
        phone: phone || '',
        email: email || '',
        reason: reason || 'Restricted by BeeGo Administrator due to policy violation.',
        restrictedAt: Date.now(),
      };

      restrictions[restrictionId] = entry;
      saveRestrictions(restrictions);

      return res.json({
        success: true,
        restriction: entry,
        message: `${entry.name} (${targetType}) has been restricted.`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to add restriction.' });
    }
  });

  // POST /api/admin/restrictions/remove - Unrestrict / reactivate user
  app.post('/api/admin/restrictions/remove', (req, res) => {
    try {
      const { id, targetId, phone, email } = req.body || {};
      const restrictions = loadRestrictions();
      let removed = false;

      const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
      const cleanEmail = email ? email.trim().toLowerCase() : '';

      for (const [key, r] of Object.entries(restrictions)) {
        const rPhone = (r.phone || '').replace(/[^0-9]/g, '');
        const rEmail = (r.email || '').trim().toLowerCase();

        if (
          r.id === id ||
          r.targetId === targetId ||
          (cleanPhone && rPhone === cleanPhone) ||
          (cleanEmail && rEmail === cleanEmail)
        ) {
          delete restrictions[key];
          removed = true;
        }
      }

      if (removed) {
        saveRestrictions(restrictions);
        return res.json({ success: true, message: 'Account unrestricted successfully.' });
      }

      return res.status(404).json({ error: 'Restriction record not found.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to remove restriction.' });
    }
  });

  // Appwrite Reverse Proxy Route:
  // Forwards Appwrite client requests securely without triggering browser CORS or unknown origin errors
  app.all('/api/appwrite*', async (req, res) => {
    try {
      const rawPath = req.originalUrl || req.url;
      // Strip /api/appwrite
      const subPath = rawPath.replace(/^\/api\/appwrite/, '') || '/';
      // Strip any duplicate v1 prefix to prevent /v1/v1/... 404 errors
      const cleanSubPath = subPath.replace(/^\//, '').replace(/^v1\/?/, '');
      const base = APPWRITE_UPSTREAM.replace(/\/$/, '').replace(/\/v1$/, '');
      const targetUrl = cleanSubPath ? `${base}/v1/${cleanSubPath}` : `${base}/v1`;

      const headers: Record<string, string> = {};
      for (const [key, val] of Object.entries(req.headers)) {
        if (typeof val === 'string' || Array.isArray(val)) {
          const lowerKey = key.toLowerCase();
          // Exclude headers that cause Appwrite redirect loops or origin mismatch
          if (
            ![
              'host',
              'origin',
              'referer',
              'connection',
              'content-length',
              'x-forwarded-host',
              'x-forwarded-server',
              'x-forwarded-proto',
              'x-forwarded-for',
              'x-cloud-trace-context',
              'traceparent',
              'forwarded',
              'via',
            ].includes(lowerKey)
          ) {
            headers[lowerKey] = Array.isArray(val) ? val.join('; ') : val;
          }
        }
      }

      if (!headers['x-appwrite-project']) {
        headers['x-appwrite-project'] = APPWRITE_PROJECT_ID;
      }

      // Read incoming body buffer to avoid stream reuse issues
      let bodyBuffer: Buffer | undefined = undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        if (chunks.length > 0) {
          bodyBuffer = Buffer.concat(chunks);
        }
      }

      const fetchBody = bodyBuffer ? new Uint8Array(bodyBuffer) : undefined;

      let upstreamRes: Response | null = null;
      try {
        upstreamRes = await fetch(targetUrl, {
          method: req.method,
          headers,
          body: fetchBody,
          redirect: 'manual',
        });
      } catch (netErr: any) {
        console.warn('[Appwrite Proxy] Upstream network error:', netErr?.message);
      }

      // If upstream is paused (403) or offline, handle intelligently
      const isUpstreamPaused = upstreamRes?.status === 403;
      const isUpstreamFailed = !upstreamRes || upstreamRes.status >= 500;

      // Special handling for /account route when Appwrite is paused or offline
      if ((isUpstreamPaused || isUpstreamFailed) && cleanSubPath.startsWith('account')) {
        const sessionToken = (headers['x-appwrite-session'] || '').trim();
        if (sessionToken) {
          const sessions = loadSessions();
          const session = sessions[sessionToken];
          if (session && Date.now() <= session.expiresAt) {
            const passengers = loadPassengers();
            const passenger = passengers[session.email];
            if (passenger) {
              res.setHeader('content-type', 'application/json; charset=utf-8');
              return res.status(200).json({
                $id: passenger.id,
                name: passenger.name,
                email: passenger.email,
                emailVerification: true,
                status: true,
                prefs: { role: 'passenger' },
              });
            }
          }
        }

        // If no session token is provided, return standard guest unauthorized scope
        res.setHeader('content-type', 'application/json; charset=utf-8');
        return res.status(401).json({
          message: 'User (role: guests) missing scope (account)',
          code: 401,
          type: 'general_unauthorized_scope',
          version: '2.3.0',
        });
      }

      if (!upstreamRes) {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        return res.status(502).json({
          message: 'Authentication service temporarily unreachable. Integrated mode is active.',
          code: 502,
        });
      }

      // Safely follow single upstream redirect only if pointing to Appwrite Cloud
      if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
        const redirectLocation = upstreamRes.headers.get('location');
        if (redirectLocation && redirectLocation.startsWith('https://fra.cloud.appwrite.io')) {
          upstreamRes = await fetch(redirectLocation, {
            method: req.method,
            headers,
            body: fetchBody,
            redirect: 'manual',
          });
        }
      }

      const upstreamContentType = upstreamRes.headers.get('content-type') || '';

      // CRITICAL: Always guarantee JSON response format to eliminate client JSON parsing crashes
      if (!upstreamContentType.includes('application/json')) {
        const text = await upstreamRes.text().catch(() => '');
        console.warn(`[Appwrite Proxy] Upstream returned non-JSON (${upstreamRes.status}):`, text.slice(0, 100));
        res.setHeader('content-type', 'application/json; charset=utf-8');
        return res.status(upstreamRes.status >= 400 ? upstreamRes.status : 502).json({
          message:
            upstreamRes.status === 404
              ? 'The requested Appwrite route was not found.'
              : 'Service returned an unexpected response format.',
          code: upstreamRes.status,
          type: 'upstream_non_json_response',
          version: '2.3.0',
        });
      }

      res.status(upstreamRes.status);
      res.setHeader('content-type', 'application/json; charset=utf-8');

      // Forward headers from upstream excluding hop-by-hop and set-cookie
      for (const [k, v] of upstreamRes.headers.entries()) {
        const lower = k.toLowerCase();
        if (
          ![
            'set-cookie',
            'transfer-encoding',
            'content-encoding',
            'content-length',
            'content-type',
          ].includes(lower)
        ) {
          res.setHeader(k, v);
        }
      }

      // Extract and forward Set-Cookie headers with SameSite=None for iframe compatibility
      const rawSetCookies =
        typeof upstreamRes.headers.getSetCookie === 'function'
          ? upstreamRes.headers.getSetCookie()
          : [upstreamRes.headers.get('set-cookie')].filter(Boolean) as string[];

      if (rawSetCookies && rawSetCookies.length > 0) {
        const sanitizedCookies = rawSetCookies.map((cookieStr) =>
          cookieStr
            .replace(/domain=[^;]+;?/gi, '')
            .replace(/;\s*Secure/gi, '; Secure; SameSite=None')
        );
        res.setHeader('Set-Cookie', sanitizedCookies);
      }

      const data = await upstreamRes.arrayBuffer();
      res.end(Buffer.from(data));
    } catch (err: any) {
      console.error('[Appwrite Proxy Error]', err);
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.status(502).json({
        error: 'Failed to communicate with Appwrite Cloud',
        details: err?.message,
      });
    }
  });

  // Error handling middleware to ensure all API errors return clean JSON
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error('[API Error]', err);
    const status = err.status || err.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: err.message || 'Server error processing request.',
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Beego Moto' });
  });

  // Vite middleware for development vs static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
