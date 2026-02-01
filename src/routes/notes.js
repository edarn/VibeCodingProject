const express = require('express');
const router = express.Router();
const { readData, writeData, findContact, findNote, generateId, getTimestamp } = require('../data');

// POST /api/contacts/:contactId/notes - Add note to contact
router.post('/:contactId/notes', (req, res) => {
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Note content is required' });
  }

  const data = readData();
  const result = findContact(data, req.params.contactId);

  if (!result) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const { contact, company } = result;
  const now = getTimestamp();

  const newNote = {
    id: generateId(),
    content: content.trim(),
    createdAt: now,
    updatedAt: now
  };

  contact.notes.push(newNote);
  contact.updatedAt = now;
  company.updatedAt = now;
  writeData(data);

  res.status(201).json(newNote);
});

// PUT /api/contacts/:contactId/notes/:id - Update note
router.put('/:contactId/notes/:id', (req, res) => {
  const { content } = req.body;

  const data = readData();
  const result = findContact(data, req.params.contactId);

  if (!result) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const { contact, company } = result;
  const note = findNote(contact, req.params.id);

  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  if (content !== undefined) {
    if (!content.trim()) {
      return res.status(400).json({ error: 'Note content cannot be empty' });
    }
    note.content = content.trim();
  }

  const now = getTimestamp();
  note.updatedAt = now;
  contact.updatedAt = now;
  company.updatedAt = now;
  writeData(data);

  res.json(note);
});

// DELETE /api/contacts/:contactId/notes/:id - Delete note
router.delete('/:contactId/notes/:id', (req, res) => {
  const data = readData();
  const result = findContact(data, req.params.contactId);

  if (!result) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const { contact, company } = result;
  const index = contact.notes.findIndex(n => n.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }

  contact.notes.splice(index, 1);
  const now = getTimestamp();
  contact.updatedAt = now;
  company.updatedAt = now;
  writeData(data);

  res.status(204).send();
});

module.exports = router;
