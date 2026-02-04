const express = require('express');
const path = require('path');
const fs = require('fs');
const data = require('../data');

module.exports = (logoUpload, uploadsDir) => {
const router = express.Router();

// GET /api/team - Get current user's team info (or null if solo)
router.get('/', (req, res) => {
  try {
    const userId = req.session.userId;
    const team = data.getTeamByUserId(userId);
    const role = data.getUserRole(userId);

    if (!team) {
      return res.json({ team: null, role: 'solo', members: [], invitations: [] });
    }

    const members = data.getTeamMembers(team.id);
    const invitations = role === 'owner' ? data.getInvitationsByTeam(team.id) : [];

    res.json({
      team,
      role,
      members,
      invitations
    });
  } catch (err) {
    console.error('Error fetching team:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/team/members - List team members (owner only)
router.get('/members', (req, res) => {
  try {
    const userId = req.session.userId;
    const role = data.getUserRole(userId);

    if (role !== 'owner') {
      return res.status(403).json({ error: 'Only team owner can view member list' });
    }

    const team = data.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const members = data.getTeamMembers(team.id);
    res.json(members);
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/team/invite - Send invitation (owner only, or solo user creating first team)
router.post('/invite', (req, res) => {
  try {
    const userId = req.session.userId;
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const role = data.getUserRole(userId);
    if (role === 'member') {
      return res.status(403).json({ error: 'Only team owner can send invitations' });
    }

    // Check if trying to invite yourself
    const currentUser = data.getUserById(userId);
    if (currentUser.email === email.trim().toLowerCase()) {
      return res.status(400).json({ error: 'You cannot invite yourself' });
    }

    const result = data.createInvitation(userId, email.trim().toLowerCase());

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json(result);
  } catch (err) {
    console.error('Error sending invitation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/team/invite/:id - Cancel invitation (owner only)
router.delete('/invite/:id', (req, res) => {
  try {
    const userId = req.session.userId;
    const result = data.cancelInvitation(req.params.id, userId);

    if (result.error) {
      return res.status(403).json({ error: result.error });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error cancelling invitation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/team/transfer - Transfer ownership (owner only)
router.post('/transfer', (req, res) => {
  try {
    const userId = req.session.userId;
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({ error: 'New owner ID is required' });
    }

    const role = data.getUserRole(userId);
    if (role !== 'owner') {
      return res.status(403).json({ error: 'Only team owner can transfer ownership' });
    }

    const team = data.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const success = data.transferOwnership(team.id, newOwnerId);

    if (!success) {
      return res.status(400).json({ error: 'Failed to transfer ownership. Is the user a team member?' });
    }

    res.json({ success: true, message: 'Ownership transferred successfully' });
  } catch (err) {
    console.error('Error transferring ownership:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/team/leave - Leave team (member or owner after transfer)
router.post('/leave', (req, res) => {
  try {
    const userId = req.session.userId;
    const role = data.getUserRole(userId);

    if (role === 'solo') {
      return res.status(400).json({ error: 'You are not in a team' });
    }

    if (role === 'owner') {
      return res.status(400).json({ error: 'Owner must transfer ownership before leaving the team' });
    }

    const team = data.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    data.removeTeamMember(team.id, userId);

    res.json({ success: true, message: 'You have left the team' });
  } catch (err) {
    console.error('Error leaving team:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/team/members/:id - Remove member (owner only)
router.delete('/members/:id', (req, res) => {
  try {
    const userId = req.session.userId;
    const memberIdToRemove = req.params.id;

    const role = data.getUserRole(userId);
    if (role !== 'owner') {
      return res.status(403).json({ error: 'Only team owner can remove members' });
    }

    if (memberIdToRemove === userId) {
      return res.status(400).json({ error: 'Owner cannot remove themselves. Transfer ownership first.' });
    }

    const team = data.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    data.removeTeamMember(team.id, memberIdToRemove);

    res.status(204).send();
  } catch (err) {
    console.error('Error removing team member:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/team/logo - Upload team logo (owner only)
router.post('/logo', logoUpload.single('logo'), (req, res) => {
  try {
    const userId = req.session.userId;
    const role = data.getUserRole(userId);

    if (role !== 'owner') {
      // Delete uploaded file if not authorized
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ error: 'Only team owner can upload logo' });
    }

    const team = data.getTeamByUserId(userId);
    if (!team) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No logo file uploaded' });
    }

    // Delete old logo if exists
    if (team.logoFilename) {
      const oldLogoPath = path.join(uploadsDir, team.logoFilename);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    const result = data.updateTeamLogo(team.id, req.file.filename, userId);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, logoFilename: req.file.filename });
  } catch (err) {
    console.error('Error uploading logo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/team/logo - Remove team logo (owner only)
router.delete('/logo', (req, res) => {
  try {
    const userId = req.session.userId;
    const role = data.getUserRole(userId);

    if (role !== 'owner') {
      return res.status(403).json({ error: 'Only team owner can remove logo' });
    }

    const team = data.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Delete logo file if exists
    if (team.logoFilename) {
      const logoPath = path.join(uploadsDir, team.logoFilename);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    data.updateTeamLogo(team.id, null, userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Error removing logo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/team/logo - Get current user's team logo
router.get('/logo', (req, res) => {
  try {
    const userId = req.session.userId;
    const logoFilename = data.getTeamLogo(userId);

    if (!logoFilename) {
      return res.json({ logoUrl: null });
    }

    res.json({ logoUrl: `/uploads/${logoFilename}` });
  } catch (err) {
    console.error('Error getting logo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

return router;
};
