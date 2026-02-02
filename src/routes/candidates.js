const express = require('express');
const data = require('../data');
const path = require('path');
const fs = require('fs');

module.exports = function(upload, uploadsDir) {
  const router = express.Router();

// GET /api/candidates - List all candidates
router.get('/', (req, res) => {
  try {
    const userId = req.session.userId;
    const candidates = data.getAllCandidates(userId);
    res.json(candidates);
  } catch (err) {
    console.error('Error fetching candidates:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/candidates/:id - Get single candidate with comments
router.get('/:id', (req, res) => {
  try {
    const userId = req.session.userId;
    const candidate = data.getCandidateById(req.params.id, userId);

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
    const userId = req.session.userId;
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
    }, userId);

    res.status(201).json(newCandidate);
  } catch (err) {
    console.error('Error creating candidate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/candidates/:id - Update candidate (multipart/form-data)
router.put('/:id', upload.single('resume'), (req, res) => {
  try {
    const userId = req.session.userId;
    const { name, email, phone, role, skills } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Candidate name cannot be empty' });
    }

    const existing = data.getCandidateById(req.params.id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    let resumeFilename = existing.resumeFilename;
    let resumeOriginalName = existing.resumeOriginalName;

    if (req.file) {
      // Delete old resume if exists
      if (existing.resumeFilename && uploadsDir) {
        const oldPath = path.join(uploadsDir, existing.resumeFilename);
        try {
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch (err) {
          console.error('Warning: Could not delete old resume:', err.message);
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
    }, userId);

    res.json(updated);
  } catch (err) {
    console.error('Error updating candidate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/candidates/:id - Delete candidate
router.delete('/:id', (req, res) => {
  try {
    const userId = req.session.userId;
    const existing = data.getCandidateById(req.params.id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Delete resume file if exists
    if (existing.resumeFilename && uploadsDir) {
      const filePath = path.join(uploadsDir, existing.resumeFilename);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Warning: Could not delete resume file:', err.message);
      }
    }

    const result = data.deleteCandidate(req.params.id, userId);

    if (result.error) {
      if (result.error === 'Candidate not found') {
        return res.status(404).json({ error: result.error });
      }
      return res.status(403).json({ error: result.error });
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
    const userId = req.session.userId;
    const candidate = data.getCandidateById(req.params.id, userId);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (!candidate.resumeFilename) {
      return res.status(404).json({ error: 'No resume uploaded' });
    }

    if (!uploadsDir) {
      return res.status(500).json({ error: 'Uploads not configured' });
    }

    const filePath = path.join(uploadsDir, candidate.resumeFilename);

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
    const userId = req.session.userId;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = data.createCandidateComment(req.params.id, content.trim(), userId);

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
    const userId = req.session.userId;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = data.updateCandidateComment(req.params.id, req.params.commentId, content.trim(), userId);

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
    const userId = req.session.userId;
    const result = data.deleteCandidateComment(req.params.id, req.params.commentId, userId);

    if (result.error) {
      if (result.error === 'Comment not found' || result.error === 'Candidate not found') {
        return res.status(404).json({ error: result.error });
      }
      return res.status(403).json({ error: result.error });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  return router;
};
