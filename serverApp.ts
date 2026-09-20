import express from 'express';

export function createExpressApp() {
  const app = express();

  const APPWRITE_UPSTREAM =
    process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const APPWRITE_PROJECT_ID =
    process.env.VITE_APPWRITE_PROJECT_ID || '6aaec93d001b38fee383';

  // In-memory store for OTP verification tracking (supported alongside stateless userId passed in payload)
  interface OtpRecord {
    userId: string;
    email: string;
    name: string;
    password?: string;
    expiresAt: number;
    attempts: number;
  }
  const otpStore = new Map<string, OtpRecord>();

  // Parse JSON exclusively for /api/auth and /auth routes to prevent stream conflicts with proxy
  app.use(['/api/auth', '/auth'], express.json());

  // POST /api/auth/otp/send - Dispatches 6-digit OTP code to passenger's Gmail via Appwrite
  app.post(['/api/auth/otp/send', '/auth/otp/send'], async (req, res) => {
    try {
      const { email, name, password } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanName = (name || '').trim() || cleanEmail.split('@')[0] || 'Passenger';

      if (!cleanEmail || !cleanEmail.endsWith('@gmail.com')) {
        return res.status(400).json({ error: 'A valid @gmail.com email address is required.' });
      }

      // Generate unique user ID candidate for Appwrite
      const generatedUserId = 'usr-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

      // Call Appwrite to send the email verification token to the user's Gmail
      const appwriteRes = await fetch(`${APPWRITE_UPSTREAM}/account/tokens/email`, {
        method: 'POST',
        headers: {
          'x-appwrite-project': APPWRITE_PROJECT_ID,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          userId: generatedUserId,
          email: cleanEmail,
          phrase: false,
        }),
      });

      const appwriteJson = (await appwriteRes.json().catch(() => ({}))) as Record<string, any>;

      if (appwriteRes.status === 429) {
        return res.status(429).json({
          error: 'Rate limit reached on email verification. Please wait a few moments before requesting another code.',
        });
      }

      if (!appwriteRes.ok && appwriteRes.status !== 201) {
        console.error('[Appwrite Email Token Error]', appwriteRes.status, appwriteJson);
        return res.status(appwriteRes.status >= 400 && appwriteRes.status < 500 ? appwriteRes.status : 500).json({
          error: appwriteJson.message || 'Failed to send verification code to your email. Please check your address.',
        });
      }

      // Appwrite returns either the existing user's userId or the newly created one
      const actualUserId = appwriteJson.userId || generatedUserId;
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      otpStore.set(cleanEmail, {
        userId: actualUserId,
        email: cleanEmail,
        name: cleanName,
        password,
        expiresAt,
        attempts: 0,
      });

      console.log(`[Beego Auth] Verification email dispatched by Appwrite to ${cleanEmail} (userId: ${actualUserId})`);

      return res.json({
        success: true,
        userId: actualUserId,
        message: `We have sent a 6-digit verification code to ${cleanEmail}. Please check your Gmail inbox.`,
      });
    } catch (err: any) {
      console.error('[OTP Send Error]', err);
      return res.status(500).json({ error: 'Failed to send verification code.' });
    }
  });

  // POST /api/auth/otp/verify - Validates 6-digit OTP code against Appwrite
  app.post(['/api/auth/otp/verify', '/auth/otp/verify'], async (req, res) => {
    try {
      const { email, otp, name, password, userId } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanOtp = (otp || '').trim();

      if (!cleanOtp || cleanOtp.length < 6) {
        return res.status(400).json({
          error: 'Please enter the complete 6-digit verification code from your email.',
        });
      }

      const record = otpStore.get(cleanEmail);
      // Stateless fallback: on serverless environments like Vercel, record may not be in memory
      // so we use the userId returned during the send step and stored on the client.
      const targetUserId = record?.userId || userId;

      if (!targetUserId) {
        return res.status(400).json({
          error: 'Verification session expired or not found. Please request a new verification code.',
        });
      }

      if (record && record.attempts >= 5) {
        otpStore.delete(cleanEmail);
        return res.status(429).json({
          error: 'Too many incorrect attempts. Please request a new verification code.',
        });
      }

      // Verify the OTP code strictly with Appwrite
      const sessionRes = await fetch(`${APPWRITE_UPSTREAM}/account/sessions/token`, {
        method: 'POST',
        headers: {
          'x-appwrite-project': APPWRITE_PROJECT_ID,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetUserId,
          secret: cleanOtp,
        }),
      });

      const sessionJson = (await sessionRes.json().catch(() => ({}))) as Record<string, any>;

      if (!sessionRes.ok) {
        if (record) record.attempts += 1;
        console.warn(`[Beego Auth] Verification failed for ${cleanEmail}: ${sessionJson.message || 'Invalid token'}`);
        return res.status(400).json({
          error: 'Invalid verification code. Please check your email inbox and enter the exact code you received.',
        });
      }

      // Appwrite session verified successfully!
      otpStore.delete(cleanEmail);

      const passengerName = record?.name || name || cleanEmail.split('@')[0] || 'Passenger';
      const passengerId = targetUserId;
      const sessionSecret = sessionJson.secret || '';

      // If user signed up with a password, persist it directly to their Appwrite account using the verified session
      const targetPassword = record?.password || password;
      if (targetPassword && sessionSecret) {
        try {
          await fetch(`${APPWRITE_UPSTREAM}/account/password`, {
            method: 'PATCH',
            headers: {
              'x-appwrite-project': APPWRITE_PROJECT_ID,
              'x-appwrite-session': sessionSecret,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              password: targetPassword,
            }),
          });
          console.log(`[Beego Auth] Password set successfully in Appwrite for ${cleanEmail}`);
        } catch (pwErr) {
          console.warn('[Beego Auth] Could not set password in Appwrite:', pwErr);
        }
      }

      // Update user name in Appwrite
      if (sessionSecret) {
        try {
          await fetch(`${APPWRITE_UPSTREAM}/account/name`, {
            method: 'PATCH',
            headers: {
              'x-appwrite-project': APPWRITE_PROJECT_ID,
              'x-appwrite-session': sessionSecret,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              name: passengerName,
            }),
          });
        } catch (nameErr) {
          console.warn('[Beego Auth] Could not set name in Appwrite:', nameErr);
        }
      }

      console.log(`[Beego Auth] Passenger verified via Appwrite: ${passengerName} (${cleanEmail})`);

      return res.json({
        success: true,
        message: 'Email verified successfully.',
        sessionSecret: sessionSecret || undefined,
        profile: {
          id: passengerId,
          name: passengerName,
          email: cleanEmail,
          role: 'passenger',
          isEmailVerified: true,
        },
      });
    } catch (err: any) {
      console.error('[OTP Verify Error]', err);
      return res.status(500).json({ error: 'Failed to verify code.' });
    }
  });

  // POST /api/auth/login - Direct email & password authentication via Appwrite
  app.post(['/api/auth/login', '/auth/login'], async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail || !cleanEmail.endsWith('@gmail.com')) {
        return res.status(400).json({ error: 'A valid @gmail.com email address is required.' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Please enter your password.' });
      }

      // Authenticate directly with Appwrite sessions
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
      });

      const appwriteJson = (await appwriteRes.json().catch(() => ({}))) as Record<string, any>;

      if (!appwriteRes.ok) {
        if (appwriteRes.status === 401) {
          return res.status(401).json({
            error: 'Incorrect email or password. If you signed up with a Gmail code, use "Sign in with OTP" or reset your password.',
          });
        }
        if (appwriteRes.status === 429) {
          return res.status(429).json({
            error: 'Too many sign in attempts. Please wait a moment and try again.',
          });
        }
        return res.status(appwriteRes.status >= 400 && appwriteRes.status < 500 ? appwriteRes.status : 500).json({
          error: appwriteJson.message || 'Login failed. Please check your credentials.',
        });
      }

      let passengerName = cleanEmail.split('@')[0] || 'Passenger';
      let passengerId = appwriteJson.userId || 'pax-' + Date.now();
      const sessionSecret = appwriteJson.secret || '';

      // Retrieve full user profile using active session
      if (sessionSecret) {
        try {
          const userRes = await fetch(`${APPWRITE_UPSTREAM}/account`, {
            method: 'GET',
            headers: {
              'x-appwrite-project': APPWRITE_PROJECT_ID,
              'x-appwrite-session': sessionSecret,
            },
          });
          if (userRes.ok) {
            const userData = (await userRes.json().catch(() => ({}))) as Record<string, any>;
            if (userData.name) passengerName = userData.name;
            if (userData.$id) passengerId = userData.$id;
            const prefs = (userData.prefs || {}) as Record<string, any>;
            if (prefs.role === 'captain') {
              return res.status(403).json({
                error: 'Access Denied: This account is registered as a Captain. Captains cannot log in as Passengers.',
              });
            }
          }
        } catch (uErr) {
          console.warn('[Beego Auth] Could not fetch user profile details:', uErr);
        }
      }

      console.log(`[Beego Auth] Passenger logged in with password: ${passengerName} (${cleanEmail})`);

      return res.json({
        success: true,
        sessionSecret: sessionSecret || undefined,
        profile: {
          id: passengerId,
          name: passengerName,
          email: cleanEmail,
          role: 'passenger',
          isEmailVerified: true,
        },
      });
    } catch (err: any) {
      console.error('[Password Login Error]', err);
      return res.status(500).json({ error: 'Login service encountered an error. Please try again.' });
    }
  });

  // Appwrite Reverse Proxy Route:
  // Forwards Appwrite client requests securely without triggering browser CORS or unknown origin errors
  app.all(['/api/appwrite*', '/appwrite*'], async (req, res) => {
    try {
      const rawPath = req.originalUrl || req.url || '';
      // Strip /api/appwrite or /appwrite
      const subPath = rawPath.replace(/^(\/api)?\/appwrite/, '') || '/';
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

      let upstreamRes = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: fetchBody,
        redirect: 'manual',
      });

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

      // If Appwrite upstream returns an HTML error page (e.g., 404 "The page you're looking for doesn't exist"),
      // convert to a structured JSON response so JSON clients never throw JSON syntax errors.
      if (!upstreamContentType.includes('application/json')) {
        const text = await upstreamRes.text().catch(() => '');
        console.warn(`[Appwrite Proxy] Upstream returned non-JSON (${upstreamRes.status}):`, text.slice(0, 100));
        return res.status(upstreamRes.status >= 400 ? upstreamRes.status : 502).json({
          message:
            upstreamRes.status === 404
              ? 'The requested Appwrite route was not found.'
              : 'Service returned an unexpected response format.',
          code: upstreamRes.status,
          type: 'upstream_non_json_response',
          version: '2.2.0',
        });
      }

      res.status(upstreamRes.status);

      // Forward headers from upstream excluding hop-by-hop and set-cookie
      for (const [k, v] of upstreamRes.headers.entries()) {
        const lower = k.toLowerCase();
        if (
          !['set-cookie', 'transfer-encoding', 'content-encoding', 'content-length'].includes(lower)
        ) {
          res.setHeader(k, v);
        }
      }

      // Extract and forward Set-Cookie headers with SameSite=None for iframe compatibility
      const rawSetCookies =
        typeof upstreamRes.headers.getSetCookie === 'function'
          ? upstreamRes.headers.getSetCookie()
          : ([upstreamRes.headers.get('set-cookie')].filter(Boolean) as string[]);

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
      res.status(502).json({
        error: 'Failed to communicate with Appwrite Cloud',
        details: err?.message,
      });
    }
  });

  // Health check routes
  app.get(['/', '/api', '/api/health', '/health'], (req, res) => {
    res.json({ status: 'ok', app: 'Beego Moto' });
  });

  return app;
}

const app = createExpressApp();
export default app;
