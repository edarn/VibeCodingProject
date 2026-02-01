const express = require('express');
const router = express.Router();
const { readData, writeData, findCompany, generateId, getTimestamp } = require('../data');

// GET /api/companies - List all companies
router.get('/', (req, res) => {
  const data = readData();
  const companies = data.companies.map(c => ({
    id: c.id,
    name: c.name,
    technologies: c.technologies,
    contactCount: c.contacts.length,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  }));
  res.json(companies);
});

// GET /api/companies/:id - Get single company with contacts
router.get('/:id', (req, res) => {
  const data = readData();
  const company = findCompany(data, req.params.id);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  res.json(company);
});

// POST /api/companies - Create new company
router.post('/', (req, res) => {
  const { name, technologies, organizationNumber, address } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Company name is required' });
  }

  const data = readData();
  const now = getTimestamp();

  const newCompany = {
    id: generateId(),
    name: name.trim(),
    technologies: technologies || '',
    organizationNumber: organizationNumber || '',
    address: address || '',
    createdAt: now,
    updatedAt: now,
    contacts: []
  };

  data.companies.push(newCompany);
  writeData(data);

  res.status(201).json(newCompany);
});

// PUT /api/companies/:id - Update company
router.put('/:id', (req, res) => {
  const { name, technologies, organizationNumber, address } = req.body;
  const data = readData();
  const company = findCompany(data, req.params.id);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({ error: 'Company name cannot be empty' });
    }
    company.name = name.trim();
  }

  if (technologies !== undefined) {
    company.technologies = technologies;
  }

  if (organizationNumber !== undefined) {
    company.organizationNumber = organizationNumber;
  }

  if (address !== undefined) {
    company.address = address;
  }

  company.updatedAt = getTimestamp();
  writeData(data);

  res.json(company);
});

// DELETE /api/companies/:id - Delete company and all contacts
router.delete('/:id', (req, res) => {
  const data = readData();
  const index = data.companies.findIndex(c => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Company not found' });
  }

  data.companies.splice(index, 1);
  writeData(data);

  res.status(204).send();
});

module.exports = router;
