const express = require('express');
const router = express.Router();
const data = require('../data');

// GET /api/companies - List all companies
router.get('/', (req, res) => {
  try {
    const companies = data.getAllCompanies();
    res.json(companies);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/companies/:id - Get single company with contacts
router.get('/:id', (req, res) => {
  try {
    const company = data.getCompanyById(req.params.id);

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
    const { name, technologies, organizationNumber, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const newCompany = data.createCompany({
      name: name.trim(),
      technologies,
      organizationNumber,
      address
    });

    res.status(201).json(newCompany);
  } catch (err) {
    console.error('Error creating company:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/companies/:id - Update company
router.put('/:id', (req, res) => {
  try {
    const { name, technologies, organizationNumber, address } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Company name cannot be empty' });
    }

    const updated = data.updateCompany(req.params.id, {
      name: name?.trim(),
      technologies,
      organizationNumber,
      address
    });

    if (!updated) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/companies/:id - Delete company and all contacts
router.delete('/:id', (req, res) => {
  try {
    const deleted = data.deleteCompany(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting company:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
