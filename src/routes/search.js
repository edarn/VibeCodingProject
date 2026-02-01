const express = require('express');
const router = express.Router();
const { readData, getAllContacts, getLastNoteDate } = require('../data');

// GET /api/search?q=term - Search across contacts and companies
router.get('/', (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();

  if (!query) {
    return res.json({ contacts: [], companies: [] });
  }

  const data = readData();

  // Search contacts
  const contacts = getAllContacts(data).filter(contact => {
    return (
      (contact.name || '').toLowerCase().includes(query) ||
      (contact.companyName || '').toLowerCase().includes(query) ||
      (contact.role || '').toLowerCase().includes(query) ||
      (contact.department || '').toLowerCase().includes(query) ||
      (contact.description || '').toLowerCase().includes(query) ||
      (contact.email || '').toLowerCase().includes(query)
    );
  });

  // Search companies
  const companies = data.companies
    .filter(company => {
      return (
        (company.name || '').toLowerCase().includes(query) ||
        (company.technologies || '').toLowerCase().includes(query)
      );
    })
    .map(c => ({
      id: c.id,
      name: c.name,
      technologies: c.technologies,
      contactCount: c.contacts.length
    }));

  res.json({ contacts, companies });
});

module.exports = router;
