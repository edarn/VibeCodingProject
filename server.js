// Catch startup errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { requireAuth } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists for sessions
const sessionDir = process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : path.join(__dirname, 'data');
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

// Session configuration
const sessionConfig = {
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: sessionDir
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
};

// Trust proxy in production (needed for secure cookies behind load balancer)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(express.json());
app.use(session(sessionConfig));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint (for Railway/Render)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes (no authentication required)
app.use('/api/auth', require('./src/routes/auth'));

// Protected API routes (authentication required)
app.use('/api/companies', requireAuth, require('./src/routes/companies'));
app.use('/api/contacts', requireAuth, require('./src/routes/contacts'));
app.use('/api/contacts', requireAuth, require('./src/routes/notes'));
app.use('/api/search', requireAuth, require('./src/routes/search'));
app.use('/api/todos', requireAuth, require('./src/routes/todos'));

// Serve index.html for SPA routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server (bind to 0.0.0.0 for Railway/Docker compatibility)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CRM running on port ${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('Warning: Using default session secret. Set SESSION_SECRET in production.');
  }
}).on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
