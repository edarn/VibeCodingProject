const express = require('express');
const router = express.Router();
const { readData, writeData, findCompany, findContact, getAllContacts, generateId, getTimestamp, getLastNoteDate } = require('../data');

// GET /api/contacts - List all contacts with sorting
router.get('/', (req, res) => {
  const data = readData();
  let contacts = getAllContacts(data);

  // Sorting
  const sort = req.query.sort || 'name';
  contacts.sort((a, b) => {
    switch (sort) {
      case 'company':
        return (a.companyName || '').localeCompare(b.companyName || '');
      case 'lastNote':
        // Null dates go to the end
        if (!a.lastNoteDate && !b.lastNoteDate) return 0;
        if (!a.lastNoteDate) return 1;
        if (!b.lastNoteDate) return -1;
        return new Date(b.lastNoteDate) - new Date(a.lastNoteDate);
      case 'name':
      default:
        return (a.name || '').localeCompare(b.name || '');
    }
  });

  res.json(contacts);
});

// GET /api/contacts/:id - Get single contact with notes
router.get('/:id', (req, res) => {
  const data = readData();
  const result = findContact(data, req.params.id);

  if (!result) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const { contact, company } = result;
  res.json({
    ...contact,
    companyId: company.id,
    companyName: company.name,
    lastNoteDate: getLastNoteDate(contact)
  });
});

// POST /api/contacts - Create new contact
router.post('/', (req, res) => {
  const { companyId, name, role, department, description, email, phone } = req.body;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Contact name is required' });
  }

  const data = readData();
  const company = findCompany(data, companyId);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const now = getTimestamp();

  const newContact = {
    id: generateId(),
    name: name.trim(),
    role: role || '',
    department: department || '',
    description: description || '',
    email: email || '',
    phone: phone || '',
    createdAt: now,
    updatedAt: now,
    notes: []
  };

  company.contacts.push(newContact);
  company.updatedAt = now;
  writeData(data);

  res.status(201).json({
    ...newContact,
    companyId: company.id,
    companyName: company.name,
    lastNoteDate: null
  });
});

// PUT /api/contacts/:id - Update contact
router.put('/:id', (req, res) => {
  const { name, role, department, description, email, phone, companyId } = req.body;
  const data = readData();
  const result = findContact(data, req.params.id);

  if (!result) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const { contact, company } = result;

  // If moving to a different company
  if (companyId && companyId !== company.id) {
    const newCompany = findCompany(data, companyId);
    if (!newCompany) {
      return res.status(404).json({ error: 'Target company not found' });
    }

    // Remove from old company
    const index = company.contacts.findIndex(c => c.id === contact.id);
    company.contacts.splice(index, 1);
    company.updatedAt = getTimestamp();

    // Add to new company
    newCompany.contacts.push(contact);
    newCompany.updatedAt = getTimestamp();
  }

  // Update fields
  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({ error: 'Contact name cannot be empty' });
    }
    contact.name = name.trim();
  }

  if (role !== undefined) contact.role = role;
  if (department !== undefined) contact.department = department;
  if (description !== undefined) contact.description = description;
  if (email !== undefined) contact.email = email;
  if (phone !== undefined) contact.phone = phone;

  contact.updatedAt = getTimestamp();
  writeData(data);

  // Get updated company info
  const updatedResult = findContact(data, req.params.id);
  res.json({
    ...contact,
    companyId: updatedResult.company.id,
    companyName: updatedResult.company.name,
    lastNoteDate: getLastNoteDate(contact)
  });
});

// DELETE /api/contacts/:id - Delete contact
router.delete('/:id', (req, res) => {
  const data = readData();
  const result = findContact(data, req.params.id);

  if (!result) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const { contact, company } = result;
  const index = company.contacts.findIndex(c => c.id === contact.id);
  company.contacts.splice(index, 1);
  company.updatedAt = getTimestamp();
  writeData(data);

  res.status(204).send();
});

module.exports = router;
