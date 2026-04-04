import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'vritti-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const OTP_EXPIRES_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 3;

// Helper: Hash password with salt
function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Helper: Generate salt
function generateSalt() {
    return crypto.randomBytes(32).toString('hex');
}

// Helper: Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Generate JWT token
function generateToken(userId, phone) {
    return jwt.sign({ userId, phone }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Helper: Verify JWT token
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

export default async function authRoutes(fastify) {
    // POST /auth/signup
    // Register a new user with phone and password
    fastify.post('/auth/signup', async (request, reply) => {
        const { phone, password, name } = request.body || {};

        // Validation
        if (!phone || !/^\d{10}$/.test(phone)) {
            return reply.status(400).send({ error: 'Phone must be exactly 10 digits' });
        }
        if (!password || password.length < 6) {
            return reply.status(400).send({ error: 'Password must be at least 6 characters' });
        }

        const client = await fastify.pg.connect();
        try {
            // Check if phone already exists
            const existingUser = await client.query(
                'SELECT id FROM auth_users WHERE phone = $1',
                [phone]
            );

            if (existingUser.rows.length > 0) {
                return reply.status(409).send({ error: 'Phone number already registered' });
            }

            // Hash password
            const salt = generateSalt();
            const passwordHash = hashPassword(password, salt);

            // Create user
            const result = await client.query(
                `INSERT INTO auth_users (phone, password_hash, salt, is_verified)
                 VALUES ($1, $2, $3, false)
                 RETURNING id, phone, is_verified, created_at`,
                [phone, passwordHash, salt]
            );

            const user = result.rows[0];

            // Generate OTP for verification
            const otp = generateOTP();
            const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60000);

            await client.query(
                `INSERT INTO otp_verifications (phone, otp_code, expires_at)
                 VALUES ($1, $2, $3)`,
                [phone, otp, expiresAt]
            );

            // In production, send OTP via SMS
            // For demo, return OTP in response
            fastify.log.info(`OTP for ${phone}: ${otp}`);

            return reply.status(201).send({
                message: 'User registered successfully. Please verify OTP.',
                user_id: user.id,
                phone: user.phone,
                otp_sent: true,
                // Remove this in production.
                otp_code: process.env.NODE_ENV !== 'production' ? otp : undefined
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Signup failed', details: err.message });
        } finally {
            client.release();
        }
    });

    // POST /auth/verify-otp
    // Verify OTP and activate account
    fastify.post('/auth/verify-otp', async (request, reply) => {
        const { phone, otp_code } = request.body || {};

        if (!phone || !otp_code) {
            return reply.status(400).send({ error: 'Phone and OTP code are required' });
        }

        const client = await fastify.pg.connect();
        try {
            // Get latest OTP for this phone
            const otpResult = await client.query(
                `SELECT * FROM otp_verifications
                 WHERE phone = $1 AND is_used = false
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [phone]
            );

            if (otpResult.rows.length === 0) {
                return reply.status(404).send({ error: 'No OTP found for this phone' });
            }

            const otpRecord = otpResult.rows[0];

            // Check if expired
            if (new Date() > new Date(otpRecord.expires_at)) {
                return reply.status(400).send({ error: 'OTP has expired' });
            }

            // Check attempts
            if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
                return reply.status(400).send({ error: 'Maximum OTP attempts exceeded' });
            }

            // Verify OTP
            if (otpRecord.otp_code !== otp_code) {
                // Increment attempts
                await client.query(
                    'UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1',
                    [otpRecord.id]
                );
                return reply.status(400).send({ error: 'Invalid OTP code' });
            }

            // Mark OTP as used
            await client.query(
                'UPDATE otp_verifications SET is_used = true WHERE id = $1',
                [otpRecord.id]
            );

            // Verify user account
            await client.query(
                'UPDATE auth_users SET is_verified = true WHERE phone = $1',
                [phone]
            );

            return reply.send({
                message: 'Phone verified successfully',
                verified: true
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'OTP verification failed', details: err.message });
        } finally {
            client.release();
        }
    });

    // POST /auth/login
    // Login with phone and password
    fastify.post('/auth/login', async (request, reply) => {
        const { phone, password } = request.body || {};

        if (!phone || !password) {
            return reply.status(400).send({ error: 'Phone and password are required' });
        }

        const client = await fastify.pg.connect();
        try {
            // Get user
            const userResult = await client.query(
                `SELECT id, phone, password_hash, salt, is_verified, is_active
                 FROM auth_users
                 WHERE phone = $1`,
                [phone]
            );

            if (userResult.rows.length === 0) {
                return reply.status(401).send({ error: 'Invalid phone or password' });
            }

            const user = userResult.rows[0];

            // Check if account is active
            if (!user.is_active) {
                return reply.status(403).send({ error: 'Account is deactivated' });
            }

            // Check if verified
            if (!user.is_verified) {
                return reply.status(403).send({ 
                    error: 'Phone not verified',
                    requires_verification: true
                });
            }

            // Verify password
            const passwordHash = hashPassword(password, user.salt);
            if (passwordHash !== user.password_hash) {
                return reply.status(401).send({ error: 'Invalid phone or password' });
            }

            // Generate JWT token
            const token = generateToken(user.id, user.phone);
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            // Create session
            await client.query(
                `INSERT INTO auth_sessions (user_id, token, expires_at, device_info, ip_address)
                 VALUES ($1, $2, $3, $4, $5)`,
                [user.id, token, expiresAt, JSON.stringify(request.headers['user-agent'] || {}), request.ip]
            );

            // Update last login
            await client.query(
                'UPDATE auth_users SET last_login_at = NOW() WHERE id = $1',
                [user.id]
            );

            // Get worker info if exists
            const workerResult = await client.query(
                'SELECT id, name, platform, zone_id FROM workers WHERE auth_user_id = $1',
                [user.id]
            );

            return reply.send({
                message: 'Login successful',
                token,
                expires_at: expiresAt,
                user: {
                    id: user.id,
                    phone: user.phone,
                    is_verified: user.is_verified
                },
                worker: workerResult.rows.length > 0 ? workerResult.rows[0] : null
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Login failed', details: err.message });
        } finally {
            client.release();
        }
    });

    // POST /auth/resend-otp
    // Resend OTP for verification
    fastify.post('/auth/resend-otp', async (request, reply) => {
        const { phone } = request.body || {};

        if (!phone) {
            return reply.status(400).send({ error: 'Phone is required' });
        }

        const client = await fastify.pg.connect();
        try {
            // Check if user exists
            const userResult = await client.query(
                'SELECT id, is_verified FROM auth_users WHERE phone = $1',
                [phone]
            );

            if (userResult.rows.length === 0) {
                return reply.status(404).send({ error: 'User not found' });
            }

            if (userResult.rows[0].is_verified) {
                return reply.status(400).send({ error: 'Phone already verified' });
            }

            // Generate new OTP
            const otp = generateOTP();
            const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60000);

            await client.query(
                `INSERT INTO otp_verifications (phone, otp_code, expires_at)
                 VALUES ($1, $2, $3)`,
                [phone, otp, expiresAt]
            );

            fastify.log.info(`OTP for ${phone}: ${otp}`);

            return reply.send({
                message: 'OTP sent successfully',
                otp_sent: true,
                // Remove this in production.
                otp_code: process.env.NODE_ENV !== 'production' ? otp : undefined
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Failed to resend OTP', details: err.message });
        } finally {
            client.release();
        }
    });

    // POST /auth/logout
    // Logout and invalidate session
    fastify.post('/auth/logout', async (request, reply) => {
        const token = request.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return reply.status(401).send({ error: 'No token provided' });
        }

        const client = await fastify.pg.connect();
        try {
            // Invalidate session
            await client.query(
                'UPDATE auth_sessions SET is_active = false WHERE token = $1',
                [token]
            );

            return reply.send({ message: 'Logged out successfully' });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Logout failed', details: err.message });
        } finally {
            client.release();
        }
    });

    // GET /auth/me
    // Get current user info (requires authentication)
    fastify.get('/auth/me', async (request, reply) => {
        const token = request.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return reply.status(401).send({ error: 'No token provided' });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return reply.status(401).send({ error: 'Invalid or expired token' });
        }

        const client = await fastify.pg.connect();
        try {
            // Check if session is active
            const sessionResult = await client.query(
                `SELECT * FROM auth_sessions
                 WHERE token = $1 AND is_active = true AND expires_at > NOW()`,
                [token]
            );

            if (sessionResult.rows.length === 0) {
                return reply.status(401).send({ error: 'Session expired or invalid' });
            }

            // Get user info
            const userResult = await client.query(
                `SELECT id, phone, is_verified, is_active, created_at, last_login_at
                 FROM auth_users
                 WHERE id = $1`,
                [decoded.userId]
            );

            if (userResult.rows.length === 0) {
                return reply.status(404).send({ error: 'User not found' });
            }

            const user = userResult.rows[0];

            // Get worker info
            const workerResult = await client.query(
                'SELECT * FROM workers WHERE auth_user_id = $1',
                [user.id]
            );

            return reply.send({
                user: {
                    id: user.id,
                    phone: user.phone,
                    is_verified: user.is_verified,
                    is_active: user.is_active,
                    created_at: user.created_at,
                    last_login_at: user.last_login_at
                },
                worker: workerResult.rows.length > 0 ? workerResult.rows[0] : null
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Failed to get user info', details: err.message });
        } finally {
            client.release();
        }
    });
}
