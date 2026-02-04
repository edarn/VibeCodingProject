const express = require('express');
const router = express.Router();
const data = require('../data');

// GET /api/companies - List all companies
router.get('/', (req, res) => {
  try {
    const userId = req.session.userId;
    const companies = data.getAllCompanies(userId);
    res.json(companies);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/companies/:id - Get single company with contacts
router.get('/:id', (req, res) => {
  try {
    const userId = req.session.userId;
    const company = data.getCompanyById(req.params.id, userId);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (err) {
    console.error('Error fetching company:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies - Create new company
router.post('/', (req, res) => {
  try {
    const userId = req.session.userId;
    const { name, technologies, organizationNumber, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const newCompany = data.createCompany({
      name: name.trim(),
      technologies,
      organizationNumber,
      address
    }, userId);

    res.status(201).json(newCompany);
  } catch (err) {
    console.error('Error creating company:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/companies/:id - Update company
router.put('/:id', (req, res) => {
  try {
    const userId = req.session.userId;
    const { name, technologies, organizationNumber, address } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Company name cannot be empty' });
    }

    const updated = data.updateCompany(req.params.id, {
      name: name?.trim(),
      technologies,
      organizationNumber,
      address
    }, userId);

    if (!updated) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/companies/:id - Archive company and all contacts
router.delete('/:id', (req, res) => {
  try {
    const userId = req.session.userId;
    const result = data.deleteCompany(req.params.id, userId);

    if (result.error) {
      if (result.error === 'Company not found') {
        return res.status(404).json({ error: result.error });
      }
      return res.status(403).json({ error: result.error });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error archiving company:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies/:id/restore - Restore archived company
router.post('/:id/restore', (req, res) => {
  try {
    const userId = req.session.userId;
    const result = data.restoreCompany(req.params.id, userId);

    if (result.error) {
      if (result.error === 'Company not found') {
        return res.status(404).json({ error: result.error });
      }
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error restoring company:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
