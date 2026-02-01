/**
 * Authentication middleware
 */

// Require authentication for protected routes
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Optional: Get current user info (doesn't block if not authenticated)
function loadUser(req, res, next) {
  // User info is already in session if authenticated
  next();
}

module.exports = {
  requireAuth,
  loadUser
};
