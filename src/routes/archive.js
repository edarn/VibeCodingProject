const express = require('express');
const router = express.Router();
const data = require('../data');

// GET /api/archive/companies - List archived companies
router.get('/companies', (req, res) => {
  try {
    const userId = req.session.userId;
    const companies = data.getArchivedCompanies(userId);
    res.json(companies);
  } catch (err) {
    console.error('Error fetching archived companies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/archive/contacts - List archived contacts
router.get('/contacts', (req, res) => {
  try {
    const userId = req.session.userId;
    const contacts = data.getArchivedContacts(userId);
    res.json(contacts);
  } catch (err) {
    console.error('Error fetching archived contacts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
