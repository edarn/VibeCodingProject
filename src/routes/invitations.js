const express = require('express');
const router = express.Router();
const data = require('../data');

// GET /api/invitations - Get pending invitations for current user
router.get('/', (req, res) => {
  try {
    const userId = req.session.userId;
    const user = data.getUserById(userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const invitations = data.getInvitationsByEmail(user.email);

    // Check if user has solo data (for merge/fresh choice)
    const hasSoloData = data.userHasSoloData(userId);

    res.json({
      invitations,
      hasSoloData
    });
  } catch (err) {
    console.error('Error fetching invitations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invitations/:id/accept - Accept invitation
router.post('/:id/accept', (req, res) => {
  try {
    const userId = req.session.userId;
    const { mergeData } = req.body;

    const result = data.acceptInvitation(req.params.id, userId, mergeData === true);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, teamId: result.teamId });
  } catch (err) {
    console.error('Error accepting invitation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invitations/:id/decline - Decline invitation
router.post('/:id/decline', (req, res) => {
  try {
    const userId = req.session.userId;
    const result = data.declineInvitation(req.params.id, userId);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error declining invitation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
