const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const multer = require('multer');
const { requireAuth } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists (use volume path on Railway if available)
const uploadsDir = process.env.DATABASE_PATH
  ? path.join(path.dirname(process.env.DATABASE_PATH), 'uploads')
  : path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  console.log('Uploads directory:', uploadsDir);
} catch (err) {
  console.error('Warning: Could not create uploads directory:', err.message);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'resume-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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

// Candidates routes with file upload middleware
app.use('/api/candidates', requireAuth, require('./src/routes/candidates')(upload, uploadsDir));

// Team management routes
app.use('/api/team', requireAuth, require('./src/routes/team'));
app.use('/api/invitations', requireAuth, require('./src/routes/invitations'));

// Serve index.html for SPA routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server (bind to 0.0.0.0 for container compatibility)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`CRM running on port ${PORT}`);
});

// Graceful shutdown handling for Railway/container environments
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
