const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const data = require('../data');

const SALT_ROUNDS = 10;

// POST /api/auth/register - Create new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username already exists
    const existingUsername = data.getUserByUsername(username.trim().toLowerCase());
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Check if email already exists
    const existingEmail = data.getUserByEmail(email.trim().toLowerCase());
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = data.createUser({
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      passwordHash
    });

    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;

    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email
    });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login - Authenticate user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username (case-insensitive)
    const user = data.getUserByUsername(username.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      id: user.id,
      username: user.username,
      email: user.email
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout - Destroy session
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/me - Get current user
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = data.getUserById(req.session.userId);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email
  });
});

module.exports = router;
