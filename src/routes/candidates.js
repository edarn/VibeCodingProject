const express = require('express');
const data = require('../data');
const path = require('path');
const fs = require('fs');

module.exports = function(upload) {
  const router = express.Router();

// GET /api/candidates - List all candidates
router.get('/', (req, res) => {
  try {
    const candidates = data.getAllCandidates();
    res.json(candidates);
  } catch (err) {
    console.error('Error fetching candidates:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/candidates/:id - Get single candidate with comments
router.get('/:id', (req, res) => {
  try {
    const candidate = data.getCandidateById(req.params.id);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json(candidate);
  } catch (err) {
    console.error('Error fetching candidate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/candidates - Create new candidate (multipart/form-data)
router.post('/', upload.single('resume'), (req, res) => {
  try {
    const { name, email, phone, role, skills } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Candidate name is required' });
    }

    let resumeFilename = '';
    let resumeOriginalName = '';

    if (req.file) {
      resumeFilename = req.file.filename;
      resumeOriginalName = req.file.originalname;
    }

    const newCandidate = data.createCandidate({
      name: name.trim(),
      email,
      phone,
      role,
      skills,
      resumeFilename,
      resumeOriginalName
    });

    res.status(201).json(newCandidate);
  } catch (err) {
    console.error('Error creating candidate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/candidates/:id - Update candidate (multipart/form-data)
router.put('/:id', upload.single('resume'), (req, res) => {
  try {
    const { name, email, phone, role, skills } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Candidate name cannot be empty' });
    }

    const existing = data.getCandidateById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    let resumeFilename = existing.resumeFilename;
    let resumeOriginalName = existing.resumeOriginalName;

    if (req.file) {
      // Delete old resume if exists
      if (existing.resumeFilename) {
        const oldPath = path.join(__dirname, '..', '..', 'uploads', existing.resumeFilename);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      resumeFilename = req.file.filename;
      resumeOriginalName = req.file.originalname;
    }

    const updated = data.updateCandidate(req.params.id, {
      name: name?.trim(),
      email,
      phone,
      role,
      skills,
      resumeFilename,
      resumeOriginalName
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating candidate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/candidates/:id - Delete candidate
router.delete('/:id', (req, res) => {
  try {
    const existing = data.getCandidateById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Delete resume file if exists
    if (existing.resumeFilename) {
      const filePath = path.join(__dirname, '..', '..', 'uploads', existing.resumeFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const deleted = data.deleteCandidate(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting candidate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/candidates/:id/resume - Download resume
router.get('/:id/resume', (req, res) => {
  try {
    const candidate = data.getCandidateById(req.params.id);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (!candidate.resumeFilename) {
      return res.status(404).json({ error: 'No resume uploaded' });
    }

    const filePath = path.join(__dirname, '..', '..', 'uploads', candidate.resumeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Resume file not found' });
    }

    res.download(filePath, candidate.resumeOriginalName);
  } catch (err) {
    console.error('Error downloading resume:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/candidates/:id/comments - Add comment
router.post('/:id/comments', (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = data.createCandidateComment(req.params.id, content.trim());

    if (!comment) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.status(201).json(comment);
  } catch (err) {
    console.error('Error creating comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/candidates/:id/comments/:commentId - Update comment
router.put('/:id/comments/:commentId', (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = data.updateCandidateComment(req.params.id, req.params.commentId, content.trim());

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json(comment);
  } catch (err) {
    console.error('Error updating comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/candidates/:id/comments/:commentId - Delete comment
router.delete('/:id/comments/:commentId', (req, res) => {
  try {
    const deleted = data.deleteCandidateComment(req.params.id, req.params.commentId);

    if (!deleted) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  return router;
};
