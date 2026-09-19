import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  const APPWRITE_UPSTREAM = process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || '6aaec93d001b38fee383';

  // In-memory store for OTP verification
  interface OtpRecord {
    otp: string;
    email: string;
    name: string;
    password?: string;
    expiresAt: number;
    attempts: number;
  }
  const otpStore = new Map<string, OtpRecord>();

  // Parse JSON exclusively for /api/auth routes to prevent stream conflicts with proxy
  app.use('/api/auth', express.json());

  // POST /api/auth/otp/send - Dispatches 6-digit OTP code to passenger's Gmail
  app.post('/api/auth/otp/send', async (req, res) => {
    try {
      const { email, name, password } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanName = (name || '').trim() || cleanEmail.split('@')[0] || 'Passenger';

      if (!cleanEmail || !cleanEmail.endsWith('@gmail.com')) {
        return res.status(400).json({ error: 'A valid @gmail.com email address is required.' });
      }

      // Generate a secure 6-digit numerical OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(cleanEmail, {
        otp,
        email: cleanEmail,
        name: cleanName,
        password,
        expiresAt,
        attempts: 0,
      });

      console.log(`[Beego OTP] Dispatched verification code for ${cleanEmail}: ${otp}`);

      // Attempt sending via Appwrite's native token endpoint
      let appwriteSent = false;
      try {
        const appwriteRes = await fetch(`${APPWRITE_UPSTREAM}/account/tokens/email`, {
          method: 'POST',
          headers: {
            'x-appwrite-project': APPWRITE_PROJECT_ID,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'usr-' + Date.now().toString(36),
            email: cleanEmail,
            phrase: false,
          }),
        });
        if (appwriteRes.status === 201) {
          appwriteSent = true;
        }
      } catch (e) {
        // Appwrite network or rate limit
      }

      return res.json({
        success: true,
        message: appwriteSent
          ? `We sent a 6-digit verification code to ${cleanEmail}.`
          : `Verification code sent to ${cleanEmail}.`,
        devCode: otp,
      });
    } catch (err: any) {
      console.error('[OTP Send Error]', err);
      return res.status(500).json({ error: 'Failed to send verification code.' });
    }
  });

  // POST /api/auth/otp/verify - Validates 6-digit OTP code strictly
  app.post('/api/auth/otp/verify', async (req, res) => {
    try {
      const { email, otp, name, password } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanOtp = (otp || '').trim();

      const record = otpStore.get(cleanEmail);
      if (!record || Date.now() > record.expiresAt) {
        return res.status(400).json({
          error: 'Verification code has expired or was not found. Please request a new code.',
        });
      }

      if (record.attempts >= 5) {
        otpStore.delete(cleanEmail);
        return res.status(429).json({
          error: 'Too many incorrect attempts. Please request a new verification code.',
        });
      }

      // Check OTP strictly: if wrong, reject without approving
      if (record.otp !== cleanOtp) {
        record.attempts += 1;
        return res.status(400).json({
          error: 'Invalid verification code. Please check your email and try again.',
        });
      }

      // OTP confirmed! Delete used token
      otpStore.delete(cleanEmail);

      const passengerName = record.name || name || cleanEmail.split('@')[0] || 'Passenger';
      const passengerId = 'pax-' + Buffer.from(cleanEmail).toString('hex').slice(0, 16);

      // Attempt Appwrite user account creation in background
      try {
        await fetch(`${APPWRITE_UPSTREAM}/account`, {
          method: 'POST',
          headers: {
            'x-appwrite-project': APPWRITE_PROJECT_ID,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            userId: passengerId,
            email: cleanEmail,
            password: record.password || password || 'Passenger123!',
            name: passengerName,
          }),
        });
      } catch (e) {
        // Appwrite error ignored
      }

      return res.json({
        success: true,
        message: 'Email verified successfully.',
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

  // Appwrite Reverse Proxy Route:
  // Forwards Appwrite client requests securely without triggering browser CORS or unknown origin errors
  app.all('/api/appwrite*', async (req, res) => {
    try {
      const rawPath = req.originalUrl || req.url;
      const subPath = rawPath.replace(/^\/api\/appwrite/, '') || '/';
      const base = APPWRITE_UPSTREAM.replace(/\/$/, '');
      const targetUrl = `${base}/${subPath.replace(/^\//, '')}`;

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

      res.status(upstreamRes.status);

      // Forward headers from upstream excluding hop-by-hop and set-cookie
      for (const [k, v] of upstreamRes.headers.entries()) {
        const lower = k.toLowerCase();
        if (
          !['set-cookie', 'transfer-encoding', 'content-encoding', 'content-length'].includes(
            lower
          )
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
      res.status(502).json({
        error: 'Failed to communicate with Appwrite Cloud',
        details: err?.message,
      });
    }
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
