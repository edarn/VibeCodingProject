const express = require('express');
const router = express.Router();
const data = require('../data');

// POST /api/contacts/:contactId/notes - Add note to contact
router.post('/:contactId/notes', (req, res) => {
  try {
    const userId = req.session.userId;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const newNote = data.createNote(req.params.contactId, content.trim(), userId);

    if (!newNote) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.status(201).json(newNote);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/contacts/:contactId/notes/:id - Update note
router.put('/:contactId/notes/:id', (req, res) => {
  try {
    const userId = req.session.userId;
    const { content } = req.body;

    if (content !== undefined && !content.trim()) {
      return res.status(400).json({ error: 'Note content cannot be empty' });
    }

    const updated = data.updateNote(req.params.contactId, req.params.id, content.trim(), userId);

    if (!updated) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/contacts/:contactId/notes/:id - Delete note
router.delete('/:contactId/notes/:id', (req, res) => {
  try {
    const userId = req.session.userId;
    const result = data.deleteNote(req.params.contactId, req.params.id, userId);

    if (result.error) {
      if (result.error === 'Note not found' || result.error === 'Contact not found') {
        return res.status(404).json({ error: result.error });
      }
      return res.status(403).json({ error: result.error });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
