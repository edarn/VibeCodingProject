const express = require('express');
const router = express.Router();
const data = require('../data');

// GET /api/contacts - List all contacts with sorting
router.get('/', (req, res) => {
  try {
    const sort = req.query.sort || 'name';
    const contacts = data.getAllContacts(sort);
    res.json(contacts);
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/contacts/:id - Get single contact with notes
router.get('/:id', (req, res) => {
  try {
    const contact = data.getContactById(req.params.id);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);
  } catch (err) {
    console.error('Error fetching contact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/contacts - Create new contact
router.post('/', (req, res) => {
  try {
    const { companyId, name, role, department, description, email, phone } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Contact name is required' });
    }

    const newContact = data.createContact({
      companyId,
      name: name.trim(),
      role,
      department,
      description,
      email,
      phone
    });

    if (!newContact) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.status(201).json(newContact);
  } catch (err) {
    console.error('Error creating contact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/contacts/:id - Update contact
router.put('/:id', (req, res) => {
  try {
    const { name, role, department, description, email, phone, companyId } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Contact name cannot be empty' });
    }

    const updated = data.updateContact(req.params.id, {
      name: name?.trim(),
      role,
      department,
      description,
      email,
      phone,
      companyId
    });

    if (!updated) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating contact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/contacts/:id - Delete contact
router.delete('/:id', (req, res) => {
  try {
    const deleted = data.deleteContact(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
