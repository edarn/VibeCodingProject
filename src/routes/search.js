const express = require('express');
const router = express.Router();
const data = require('../data');

// GET /api/search?q=term - Search across contacts and companies
router.get('/', (req, res) => {
  try {
    const userId = req.session.userId;
    const query = (req.query.q || '').toLowerCase().trim();

    if (!query) {
      return res.json({ contacts: [], companies: [] });
    }

    const results = data.search(query, userId);
    res.json(results);
  } catch (err) {
    console.error('Error searching:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
