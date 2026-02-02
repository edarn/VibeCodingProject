const crypto = require('crypto');
const db = require('./database');

// Generate UUID
function generateId() {
  return crypto.randomUUID();
}

// Get current ISO timestamp
function getTimestamp() {
  return new Date().toISOString();
}

// Convert snake_case row to camelCase object
function toCamelCase(row) {
  if (!row) return null;
  const result = {};
  for (const key of Object.keys(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = row[key];
  }
  return result;
}

// ============ Team & Access Control Functions ============

// Get user's effective team_id (their own team if owner, or the team they belong to)
function getUserTeamId(userId) {
  const user = db.prepare('SELECT team_id FROM users WHERE id = ?').get(userId);
  return user?.team_id || null;
}

// Get user's role: 'solo', 'owner', or 'member'
function getUserRole(userId) {
  const user = db.prepare('SELECT team_id FROM users WHERE id = ?').get(userId);
  if (!user || !user.team_id) return 'solo';

  const team = db.prepare('SELECT owner_id FROM teams WHERE id = ?').get(user.team_id);
  if (!team) return 'solo';

  return team.owner_id === userId ? 'owner' : 'member';
}

// Check if user is team owner
function isTeamOwner(userId) {
  return getUserRole(userId) === 'owner';
}

// Check if user is team member (not owner)
function isTeamMember(userId) {
  return getUserRole(userId) === 'member';
}

// Check if user can delete an entity (owner can delete any, member only their own)
function canDeleteEntity(userId, entity) {
  const role = getUserRole(userId);
  if (role === 'owner' || role === 'solo') return true;
  return entity.created_by === userId || entity.createdBy === userId;
}

// Get the team info for a user
function getTeamByUserId(userId) {
  const user = db.prepare('SELECT team_id FROM users WHERE id = ?').get(userId);
  if (!user || !user.team_id) return null;

  const team = db.prepare(`
    SELECT t.*, u.username as owner_username, u.email as owner_email
    FROM teams t
    JOIN users u ON u.id = t.owner_id
    WHERE t.id = ?
  `).get(user.team_id);

  if (!team) return null;

  return {
    id: team.id,
    ownerId: team.owner_id,
    ownerUsername: team.owner_username,
    ownerEmail: team.owner_email,
    createdAt: team.created_at
  };
}

// Create a new team (user becomes owner)
function createTeam(ownerId) {
  const id = generateId();
  const now = getTimestamp();

  // Create the team
  db.prepare(`
    INSERT INTO teams (id, owner_id, created_at)
    VALUES (?, ?, ?)
  `).run(id, ownerId, now);

  // Set the owner's team_id
  db.prepare('UPDATE users SET team_id = ?, updated_at = ? WHERE id = ?').run(id, now, ownerId);

  // Add owner as a team member
  db.prepare(`
    INSERT INTO team_members (team_id, user_id, joined_at)
    VALUES (?, ?, ?)
  `).run(id, ownerId, now);

  // Transfer all owner's solo data to the team
  const tables = ['companies', 'contacts', 'notes', 'todos', 'candidates', 'candidate_comments'];
  for (const table of tables) {
    db.prepare(`UPDATE ${table} SET team_id = ? WHERE created_by = ? AND team_id IS NULL`).run(id, ownerId);
  }

  return { id, ownerId, createdAt: now };
}

// Get team members
function getTeamMembers(teamId) {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.email, tm.joined_at,
           CASE WHEN t.owner_id = u.id THEN 1 ELSE 0 END as is_owner
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.team_id = ?
    ORDER BY tm.joined_at ASC
  `).all(teamId);

  return rows.map(row => ({
    id: row.id,
    username: row.username,
    email: row.email,
    joinedAt: row.joined_at,
    isOwner: row.is_owner === 1
  }));
}

// Add a user to a team
function addTeamMember(teamId, userId) {
  const now = getTimestamp();

  // Add to team_members
  db.prepare(`
    INSERT OR IGNORE INTO team_members (team_id, user_id, joined_at)
    VALUES (?, ?, ?)
  `).run(teamId, userId, now);

  // Update user's team_id
  db.prepare('UPDATE users SET team_id = ?, updated_at = ? WHERE id = ?').run(teamId, now, userId);

  return true;
}

// Remove a user from a team (their data stays with the team)
function removeTeamMember(teamId, userId) {
  const now = getTimestamp();

  // Remove from team_members
  db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId, userId);

  // Clear user's team_id
  db.prepare('UPDATE users SET team_id = NULL, updated_at = ? WHERE id = ?').run(now, userId);

  return true;
}

// Transfer ownership to another member
function transferOwnership(teamId, newOwnerId) {
  const now = getTimestamp();

  // Verify new owner is a member
  const member = db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, newOwnerId);
  if (!member) return false;

  // Update team owner
  db.prepare('UPDATE teams SET owner_id = ? WHERE id = ?').run(newOwnerId, teamId);

  return true;
}

// Merge user's solo data into a team
function mergeUserDataIntoTeam(userId, teamId) {
  const tables = ['companies', 'contacts', 'notes', 'todos', 'candidates', 'candidate_comments'];
  for (const table of tables) {
    db.prepare(`UPDATE ${table} SET team_id = ? WHERE created_by = ? AND team_id IS NULL`).run(teamId, userId);
  }
}

// Delete all solo data for a user (when they choose "start fresh" on joining)
function deleteUserSoloData(userId) {
  // Delete in order respecting foreign keys
  db.prepare('DELETE FROM candidate_comments WHERE created_by = ? AND team_id IS NULL').run(userId);
  db.prepare('DELETE FROM candidates WHERE created_by = ? AND team_id IS NULL').run(userId);
  db.prepare('DELETE FROM notes WHERE created_by = ? AND team_id IS NULL').run(userId);
  db.prepare('DELETE FROM todos WHERE created_by = ? AND team_id IS NULL').run(userId);
  db.prepare('DELETE FROM contacts WHERE created_by = ? AND team_id IS NULL').run(userId);
  db.prepare('DELETE FROM companies WHERE created_by = ? AND team_id IS NULL').run(userId);
}

// Check if user has any solo data
function userHasSoloData(userId) {
  const tables = ['companies', 'contacts', 'candidates', 'todos'];
  for (const table of tables) {
    const row = db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE created_by = ? AND team_id IS NULL`).get(userId);
    if (row.count > 0) return true;
  }
  return false;
}

// ============ Invitation Functions ============

function createInvitation(inviterId, email) {
  const id = generateId();
  const now = getTimestamp();

  // Get or create team for inviter
  let user = db.prepare('SELECT team_id FROM users WHERE id = ?').get(inviterId);
  let teamId = user?.team_id;

  if (!teamId) {
    // Create a new team with inviter as owner
    const team = createTeam(inviterId);
    teamId = team.id;
  }

  // Check if invitation already exists
  const existing = db.prepare(`
    SELECT * FROM team_invitations
    WHERE team_id = ? AND email = ? AND status = 'pending'
  `).get(teamId, email);

  if (existing) {
    return { error: 'Invitation already sent to this email' };
  }

  db.prepare(`
    INSERT INTO team_invitations (id, team_id, inviter_id, email, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(id, teamId, inviterId, email, now);

  return {
    id,
    teamId,
    inviterId,
    email,
    status: 'pending',
    createdAt: now
  };
}

function getInvitationById(invitationId) {
  const row = db.prepare(`
    SELECT ti.*, u.username as inviter_username
    FROM team_invitations ti
    JOIN users u ON u.id = ti.inviter_id
    WHERE ti.id = ?
  `).get(invitationId);

  if (!row) return null;

  return {
    id: row.id,
    teamId: row.team_id,
    inviterId: row.inviter_id,
    inviterUsername: row.inviter_username,
    email: row.email,
    status: row.status,
    createdAt: row.created_at
  };
}

function getInvitationsByEmail(email) {
  const rows = db.prepare(`
    SELECT ti.*, u.username as inviter_username
    FROM team_invitations ti
    JOIN users u ON u.id = ti.inviter_id
    WHERE ti.email = ? AND ti.status = 'pending'
    ORDER BY ti.created_at DESC
  `).all(email);

  return rows.map(row => ({
    id: row.id,
    teamId: row.team_id,
    inviterId: row.inviter_id,
    inviterUsername: row.inviter_username,
    email: row.email,
    status: row.status,
    createdAt: row.created_at
  }));
}

function getInvitationsByTeam(teamId) {
  const rows = db.prepare(`
    SELECT ti.*, u.username as inviter_username
    FROM team_invitations ti
    JOIN users u ON u.id = ti.inviter_id
    WHERE ti.team_id = ? AND ti.status = 'pending'
    ORDER BY ti.created_at DESC
  `).all(teamId);

  return rows.map(row => ({
    id: row.id,
    teamId: row.team_id,
    inviterId: row.inviter_id,
    inviterUsername: row.inviter_username,
    email: row.email,
    status: row.status,
    createdAt: row.created_at
  }));
}

function acceptInvitation(invitationId, userId, mergeData = false) {
  const invitation = getInvitationById(invitationId);
  if (!invitation || invitation.status !== 'pending') {
    return { error: 'Invalid or expired invitation' };
  }

  // Check user's email matches invitation
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || user.email !== invitation.email) {
    return { error: 'This invitation is not for your account' };
  }

  // Check if user is already in a team
  if (user.team_id) {
    return { error: 'You are already in a team. Leave your current team first.' };
  }

  const now = getTimestamp();

  // Handle user's existing data
  if (mergeData) {
    mergeUserDataIntoTeam(userId, invitation.teamId);
  } else {
    deleteUserSoloData(userId);
  }

  // Add user to team
  addTeamMember(invitation.teamId, userId);

  // Update invitation status
  db.prepare("UPDATE team_invitations SET status = 'accepted' WHERE id = ?").run(invitationId);

  return { success: true, teamId: invitation.teamId };
}

function declineInvitation(invitationId, userId) {
  const invitation = getInvitationById(invitationId);
  if (!invitation || invitation.status !== 'pending') {
    return { error: 'Invalid or expired invitation' };
  }

  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
  if (!user || user.email !== invitation.email) {
    return { error: 'This invitation is not for your account' };
  }

  db.prepare("UPDATE team_invitations SET status = 'declined' WHERE id = ?").run(invitationId);

  return { success: true };
}

function cancelInvitation(invitationId, userId) {
  const invitation = getInvitationById(invitationId);
  if (!invitation) {
    return { error: 'Invitation not found' };
  }

  // Verify user is the team owner
  const team = db.prepare('SELECT owner_id FROM teams WHERE id = ?').get(invitation.teamId);
  if (!team || team.owner_id !== userId) {
    return { error: 'Only team owner can cancel invitations' };
  }

  db.prepare("UPDATE team_invitations SET status = 'cancelled' WHERE id = ?").run(invitationId);

  return { success: true };
}

// Get username by user ID (for displaying created_by info)
function getUsernameById(userId) {
  if (!userId) return null;
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
  return user?.username || null;
}

// ============ Company Functions ============

function getAllCompanies(userId) {
  const teamId = getUserTeamId(userId);

  let rows;
  if (teamId) {
    // User is in a team - get team data
    rows = db.prepare(`
      SELECT c.*, COUNT(ct.id) as contact_count, u.username as created_by_username
      FROM companies c
      LEFT JOIN contacts ct ON ct.company_id = c.id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.team_id = ?
      GROUP BY c.id
      ORDER BY c.name
    `).all(teamId);
  } else {
    // Solo user - get only their data
    rows = db.prepare(`
      SELECT c.*, COUNT(ct.id) as contact_count, u.username as created_by_username
      FROM companies c
      LEFT JOIN contacts ct ON ct.company_id = c.id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.created_by = ? AND c.team_id IS NULL
      GROUP BY c.id
      ORDER BY c.name
    `).all(userId);
  }

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    technologies: row.technologies,
    organizationNumber: row.organization_number,
    address: row.address,
    contactCount: row.contact_count,
    createdBy: row.created_by,
    createdByUsername: row.created_by_username,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

function getCompanyById(companyId, userId) {
  const teamId = getUserTeamId(userId);

  let company;
  if (teamId) {
    company = db.prepare(`
      SELECT c.*, u.username as created_by_username
      FROM companies c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.id = ? AND c.team_id = ?
    `).get(companyId, teamId);
  } else {
    company = db.prepare(`
      SELECT c.*, u.username as created_by_username
      FROM companies c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.id = ? AND c.created_by = ? AND c.team_id IS NULL
    `).get(companyId, userId);
  }

  if (!company) return null;

  const contacts = db.prepare(`
    SELECT c.*, u.username as created_by_username
    FROM contacts c
    LEFT JOIN users u ON u.id = c.created_by
    WHERE c.company_id = ?
    ORDER BY c.name
  `).all(companyId);

  return {
    id: company.id,
    name: company.name,
    technologies: company.technologies,
    organizationNumber: company.organization_number,
    address: company.address,
    createdBy: company.created_by,
    createdByUsername: company.created_by_username,
    createdAt: company.created_at,
    updatedAt: company.updated_at,
    contacts: contacts.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
      department: c.department,
      description: c.description,
      email: c.email,
      phone: c.phone,
      createdBy: c.created_by,
      createdByUsername: c.created_by_username,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }))
  };
}

function createCompany({ name, technologies, organizationNumber, address }, userId) {
  const id = generateId();
  const now = getTimestamp();
  const teamId = getUserTeamId(userId);

  db.prepare(`
    INSERT INTO companies (id, name, technologies, organization_number, address, team_id, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, technologies || '', organizationNumber || '', address || '', teamId, userId, now, now);

  const username = getUsernameById(userId);

  return {
    id,
    name,
    technologies: technologies || '',
    organizationNumber: organizationNumber || '',
    address: address || '',
    createdBy: userId,
    createdByUsername: username,
    createdAt: now,
    updatedAt: now,
    contacts: []
  };
}

function updateCompany(companyId, { name, technologies, organizationNumber, address }, userId) {
  const now = getTimestamp();

  // Verify access
  const company = getCompanyById(companyId, userId);
  if (!company) return null;

  const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);

  db.prepare(`
    UPDATE companies
    SET name = ?, technologies = ?, organization_number = ?, address = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name : existing.name,
    technologies !== undefined ? technologies : existing.technologies,
    organizationNumber !== undefined ? organizationNumber : existing.organization_number,
    address !== undefined ? address : existing.address,
    now,
    companyId
  );

  return getCompanyById(companyId, userId);
}

function deleteCompany(companyId, userId) {
  // Verify access and permission
  const company = getCompanyById(companyId, userId);
  if (!company) return { error: 'Company not found' };

  const role = getUserRole(userId);
  if (role === 'member' && company.createdBy !== userId) {
    return { error: 'Permission denied. You can only delete companies you created.' };
  }

  const result = db.prepare('DELETE FROM companies WHERE id = ?').run(companyId);
  return result.changes > 0 ? { success: true } : { error: 'Delete failed' };
}

// ============ Contact Functions ============

function getAllContacts(userId, sort = 'name') {
  const teamId = getUserTeamId(userId);

  let orderBy = 'c.name';
  if (sort === 'company') {
    orderBy = 'co.name, c.name';
  } else if (sort === 'lastNote') {
    orderBy = 'last_note_date DESC NULLS LAST, c.name';
  }

  let rows;
  if (teamId) {
    rows = db.prepare(`
      SELECT c.*, co.name as company_name, u.username as created_by_username,
             (SELECT MAX(n.created_at) FROM notes n WHERE n.contact_id = c.id) as last_note_date
      FROM contacts c
      JOIN companies co ON co.id = c.company_id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.team_id = ?
      ORDER BY ${orderBy}
    `).all(teamId);
  } else {
    rows = db.prepare(`
      SELECT c.*, co.name as company_name, u.username as created_by_username,
             (SELECT MAX(n.created_at) FROM notes n WHERE n.contact_id = c.id) as last_note_date
      FROM contacts c
      JOIN companies co ON co.id = c.company_id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.created_by = ? AND c.team_id IS NULL
      ORDER BY ${orderBy}
    `).all(userId);
  }

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department,
    description: row.description,
    email: row.email,
    phone: row.phone,
    companyId: row.company_id,
    companyName: row.company_name,
    lastNoteDate: row.last_note_date,
    createdBy: row.created_by,
    createdByUsername: row.created_by_username,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

function getContactById(contactId, userId) {
  const teamId = getUserTeamId(userId);

  let row;
  if (teamId) {
    row = db.prepare(`
      SELECT c.*, co.name as company_name, u.username as created_by_username,
             (SELECT MAX(n.created_at) FROM notes n WHERE n.contact_id = c.id) as last_note_date
      FROM contacts c
      JOIN companies co ON co.id = c.company_id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.id = ? AND c.team_id = ?
    `).get(contactId, teamId);
  } else {
    row = db.prepare(`
      SELECT c.*, co.name as company_name, u.username as created_by_username,
             (SELECT MAX(n.created_at) FROM notes n WHERE n.contact_id = c.id) as last_note_date
      FROM contacts c
      JOIN companies co ON co.id = c.company_id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.id = ? AND c.created_by = ? AND c.team_id IS NULL
    `).get(contactId, userId);
  }

  if (!row) return null;

  const notes = db.prepare(`
    SELECT n.*, u.username as created_by_username
    FROM notes n
    LEFT JOIN users u ON u.id = n.created_by
    WHERE n.contact_id = ?
    ORDER BY n.created_at DESC
  `).all(contactId);

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department,
    description: row.description,
    email: row.email,
    phone: row.phone,
    companyId: row.company_id,
    companyName: row.company_name,
    lastNoteDate: row.last_note_date,
    createdBy: row.created_by,
    createdByUsername: row.created_by_username,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: notes.map(n => ({
      id: n.id,
      content: n.content,
      createdBy: n.created_by,
      createdByUsername: n.created_by_username,
      createdAt: n.created_at,
      updatedAt: n.updated_at
    }))
  };
}

function createContact({ companyId, name, role, department, description, email, phone }, userId) {
  const teamId = getUserTeamId(userId);

  // Verify company exists and user has access
  const company = getCompanyById(companyId, userId);
  if (!company) return null;

  const id = generateId();
  const now = getTimestamp();
  const username = getUsernameById(userId);

  db.prepare(`
    INSERT INTO contacts (id, company_id, name, role, department, description, email, phone, team_id, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, companyId, name, role || '', department || '', description || '', email || '', phone || '', teamId, userId, now, now);

  // Update company updated_at
  db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now, companyId);

  return {
    id,
    name,
    role: role || '',
    department: department || '',
    description: description || '',
    email: email || '',
    phone: phone || '',
    companyId,
    companyName: company.name,
    lastNoteDate: null,
    createdBy: userId,
    createdByUsername: username,
    createdAt: now,
    updatedAt: now,
    notes: []
  };
}

function updateContact(contactId, { name, role, department, description, email, phone, companyId }, userId) {
  const now = getTimestamp();

  // Verify access
  const contact = getContactById(contactId, userId);
  if (!contact) return null;

  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);

  // If moving to a different company, verify access to it
  let targetCompanyId = existing.company_id;
  if (companyId && companyId !== existing.company_id) {
    const newCompany = getCompanyById(companyId, userId);
    if (!newCompany) return null;
    targetCompanyId = companyId;

    // Update old company's updated_at
    db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now, existing.company_id);
    // Update new company's updated_at
    db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now, companyId);
  }

  db.prepare(`
    UPDATE contacts
    SET name = ?, role = ?, department = ?, description = ?, email = ?, phone = ?, company_id = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name : existing.name,
    role !== undefined ? role : existing.role,
    department !== undefined ? department : existing.department,
    description !== undefined ? description : existing.description,
    email !== undefined ? email : existing.email,
    phone !== undefined ? phone : existing.phone,
    targetCompanyId,
    now,
    contactId
  );

  return getContactById(contactId, userId);
}

function deleteContact(contactId, userId) {
  // Verify access
  const contact = getContactById(contactId, userId);
  if (!contact) return { error: 'Contact not found' };

  const role = getUserRole(userId);
  if (role === 'member' && contact.createdBy !== userId) {
    return { error: 'Permission denied. You can only delete contacts you created.' };
  }

  const now = getTimestamp();
  db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now, contact.companyId);

  const result = db.prepare('DELETE FROM contacts WHERE id = ?').run(contactId);
  return result.changes > 0 ? { success: true } : { error: 'Delete failed' };
}

// ============ Note Functions ============

function createNote(contactId, content, userId) {
  // Verify access to contact
  const contact = getContactById(contactId, userId);
  if (!contact) return null;

  const teamId = getUserTeamId(userId);
  const id = generateId();
  const now = getTimestamp();
  const username = getUsernameById(userId);

  db.prepare(`
    INSERT INTO notes (id, contact_id, content, team_id, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, contactId, content, teamId, userId, now, now);

  // Update contact and company timestamps
  db.prepare('UPDATE contacts SET updated_at = ? WHERE id = ?').run(now, contactId);
  db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now, contact.companyId);

  return {
    id,
    content,
    createdBy: userId,
    createdByUsername: username,
    createdAt: now,
    updatedAt: now
  };
}

function updateNote(contactId, noteId, content, userId) {
  // Verify access to contact
  const contact = getContactById(contactId, userId);
  if (!contact) return null;

  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND contact_id = ?').get(noteId, contactId);
  if (!note) return null;

  const now = getTimestamp();
  const username = getUsernameById(note.created_by);

  db.prepare('UPDATE notes SET content = ?, updated_at = ? WHERE id = ?').run(content, now, noteId);
  db.prepare('UPDATE contacts SET updated_at = ? WHERE id = ?').run(now, contactId);
  db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now, contact.companyId);

  return {
    id: noteId,
    content,
    createdBy: note.created_by,
    createdByUsername: username,
    createdAt: note.created_at,
    updatedAt: now
  };
}

function deleteNote(contactId, noteId, userId) {
  // Verify access to contact
  const contact = getContactById(contactId, userId);
  if (!contact) return { error: 'Contact not found' };

  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND contact_id = ?').get(noteId, contactId);
  if (!note) return { error: 'Note not found' };

  const role = getUserRole(userId);
  if (role === 'member' && note.created_by !== userId) {
    return { error: 'Permission denied. You can only delete notes you created.' };
  }

  const now = getTimestamp();

  db.prepare('DELETE FROM notes WHERE id = ?').run(noteId);
  db.prepare('UPDATE contacts SET updated_at = ? WHERE id = ?').run(now, contactId);
  db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now, contact.companyId);

  return { success: true };
}

// ============ Todo Functions ============

function getAllTodos(userId, filter = 'all') {
  const teamId = getUserTeamId(userId);

  let whereClause = teamId ? 'WHERE t.team_id = ?' : 'WHERE t.created_by = ? AND t.team_id IS NULL';
  if (filter === 'active') {
    whereClause += ' AND t.completed = 0';
  } else if (filter === 'completed') {
    whereClause += ' AND t.completed = 1';
  }

  const rows = db.prepare(`
    SELECT t.*, u.username as created_by_username
    FROM todos t
    LEFT JOIN users u ON u.id = t.created_by
    ${whereClause}
    ORDER BY t.created_at DESC
  `).all(teamId || userId);

  return rows.map(row => {
    const entityInfo = getLinkedEntityName(row.linked_type, row.linked_id);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      completed: row.completed === 1,
      completedAt: row.completed_at,
      linkedType: row.linked_type,
      linkedId: row.linked_id,
      linkedName: entityInfo?.name || 'Unknown',
      linkedCompanyName: entityInfo?.companyName || null,
      createdBy: row.created_by,
      createdByUsername: row.created_by_username,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  });
}

function getTodoById(todoId, userId) {
  const teamId = getUserTeamId(userId);

  let row;
  if (teamId) {
    row = db.prepare(`
      SELECT t.*, u.username as created_by_username
      FROM todos t
      LEFT JOIN users u ON u.id = t.created_by
      WHERE t.id = ? AND t.team_id = ?
    `).get(todoId, teamId);
  } else {
    row = db.prepare(`
      SELECT t.*, u.username as created_by_username
      FROM todos t
      LEFT JOIN users u ON u.id = t.created_by
      WHERE t.id = ? AND t.created_by = ? AND t.team_id IS NULL
    `).get(todoId, userId);
  }

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    completed: row.completed === 1,
    completedAt: row.completed_at,
    linkedType: row.linked_type,
    linkedId: row.linked_id,
    createdBy: row.created_by,
    createdByUsername: row.created_by_username,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createTodo({ title, description, dueDate, linkedType, linkedId }, userId) {
  const teamId = getUserTeamId(userId);
  const id = generateId();
  const now = getTimestamp();
  const username = getUsernameById(userId);

  db.prepare(`
    INSERT INTO todos (id, title, description, due_date, completed, completed_at, linked_type, linked_id, team_id, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?)
  `).run(id, title, description || '', dueDate || now, linkedType, linkedId, teamId, userId, now, now);

  return {
    id,
    title,
    description: description || '',
    dueDate: dueDate || now,
    completed: false,
    completedAt: null,
    linkedType,
    linkedId,
    createdBy: userId,
    createdByUsername: username,
    createdAt: now,
    updatedAt: now
  };
}

function updateTodo(todoId, { title, description, dueDate, completed }, userId) {
  // Verify access
  const todo = getTodoById(todoId, userId);
  if (!todo) return null;

  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId);
  const now = getTimestamp();

  let completedAt = existing.completed_at;
  let newCompleted = existing.completed;

  if (completed !== undefined) {
    const wasCompleted = existing.completed === 1;
    newCompleted = completed ? 1 : 0;

    if (completed && !wasCompleted) {
      completedAt = now;
    } else if (!completed && wasCompleted) {
      completedAt = null;
    }
  }

  db.prepare(`
    UPDATE todos
    SET title = ?, description = ?, due_date = ?, completed = ?, completed_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    title !== undefined ? title : existing.title,
    description !== undefined ? description : existing.description,
    dueDate !== undefined ? dueDate : existing.due_date,
    newCompleted,
    completedAt,
    now,
    todoId
  );

  return getTodoById(todoId, userId);
}

function deleteTodo(todoId, userId) {
  // Verify access
  const todo = getTodoById(todoId, userId);
  if (!todo) return { error: 'Todo not found' };

  const role = getUserRole(userId);
  if (role === 'member' && todo.createdBy !== userId) {
    return { error: 'Permission denied. You can only delete todos you created.' };
  }

  const result = db.prepare('DELETE FROM todos WHERE id = ?').run(todoId);
  return result.changes > 0 ? { success: true } : { error: 'Delete failed' };
}

// Get linked entity name helper
function getLinkedEntityName(linkedType, linkedId) {
  if (linkedType === 'company') {
    const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(linkedId);
    return company ? { name: company.name, companyName: null } : null;
  } else if (linkedType === 'contact') {
    const result = db.prepare(`
      SELECT c.name, co.name as company_name
      FROM contacts c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = ?
    `).get(linkedId);
    return result ? { name: result.name, companyName: result.company_name } : null;
  }
  return null;
}

// ============ Search Functions ============

function search(query, userId) {
  const teamId = getUserTeamId(userId);
  const searchTerm = `%${query}%`;

  let contacts, companies;

  if (teamId) {
    contacts = db.prepare(`
      SELECT c.*, co.name as company_name, u.username as created_by_username,
             (SELECT MAX(n.created_at) FROM notes n WHERE n.contact_id = c.id) as last_note_date
      FROM contacts c
      JOIN companies co ON co.id = c.company_id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.team_id = ? AND (c.name LIKE ? OR co.name LIKE ? OR c.role LIKE ?
         OR c.department LIKE ? OR c.description LIKE ? OR c.email LIKE ?)
    `).all(teamId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);

    companies = db.prepare(`
      SELECT c.*, COUNT(ct.id) as contact_count, u.username as created_by_username
      FROM companies c
      LEFT JOIN contacts ct ON ct.company_id = c.id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.team_id = ? AND (c.name LIKE ? OR c.technologies LIKE ?)
      GROUP BY c.id
    `).all(teamId, searchTerm, searchTerm);
  } else {
    contacts = db.prepare(`
      SELECT c.*, co.name as company_name, u.username as created_by_username,
             (SELECT MAX(n.created_at) FROM notes n WHERE n.contact_id = c.id) as last_note_date
      FROM contacts c
      JOIN companies co ON co.id = c.company_id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.created_by = ? AND c.team_id IS NULL AND (c.name LIKE ? OR co.name LIKE ? OR c.role LIKE ?
         OR c.department LIKE ? OR c.description LIKE ? OR c.email LIKE ?)
    `).all(userId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);

    companies = db.prepare(`
      SELECT c.*, COUNT(ct.id) as contact_count, u.username as created_by_username
      FROM companies c
      LEFT JOIN contacts ct ON ct.company_id = c.id
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.created_by = ? AND c.team_id IS NULL AND (c.name LIKE ? OR c.technologies LIKE ?)
      GROUP BY c.id
    `).all(userId, searchTerm, searchTerm);
  }

  return {
    contacts: contacts.map(row => ({
      id: row.id,
      name: row.name,
      role: row.role,
      department: row.department,
      description: row.description,
      email: row.email,
      phone: row.phone,
      companyId: row.company_id,
      companyName: row.company_name,
      lastNoteDate: row.last_note_date,
      createdBy: row.created_by,
      createdByUsername: row.created_by_username,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    companies: companies.map(row => ({
      id: row.id,
      name: row.name,
      technologies: row.technologies,
      contactCount: row.contact_count,
      createdBy: row.created_by,
      createdByUsername: row.created_by_username
    }))
  };
}

// ============ User Functions (for authentication) ============

function getUserByUsername(username) {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getUserByEmail(email) {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getUserById(userId) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createUser({ username, email, passwordHash }) {
  const id = generateId();
  const now = getTimestamp();

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, username, email, passwordHash, now, now);

  return {
    id,
    username,
    email,
    createdAt: now,
    updatedAt: now
  };
}

// ============ Candidate Functions ============

function getAllCandidates(userId) {
  const teamId = getUserTeamId(userId);

  let rows;
  if (teamId) {
    rows = db.prepare(`
      SELECT c.*, u.username as created_by_username
      FROM candidates c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.team_id = ?
      ORDER BY c.name
    `).all(teamId);
  } else {
    rows = db.prepare(`
      SELECT c.*, u.username as created_by_username
      FROM candidates c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.created_by = ? AND c.team_id IS NULL
      ORDER BY c.name
    `).all(userId);
  }

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    skills: row.skills,
    resumeFilename: row.resume_filename,
    resumeOriginalName: row.resume_original_name,
    createdBy: row.created_by,
    createdByUsername: row.created_by_username,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

function getCandidateById(candidateId, userId) {
  const teamId = getUserTeamId(userId);

  let candidate;
  if (teamId) {
    candidate = db.prepare(`
      SELECT c.*, u.username as created_by_username
      FROM candidates c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.id = ? AND c.team_id = ?
    `).get(candidateId, teamId);
  } else {
    candidate = db.prepare(`
      SELECT c.*, u.username as created_by_username
      FROM candidates c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.id = ? AND c.created_by = ? AND c.team_id IS NULL
    `).get(candidateId, userId);
  }

  if (!candidate) return null;

  const comments = db.prepare(`
    SELECT cc.*, u.username as created_by_username
    FROM candidate_comments cc
    LEFT JOIN users u ON u.id = cc.created_by
    WHERE cc.candidate_id = ?
    ORDER BY cc.created_at DESC
  `).all(candidateId);

  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    role: candidate.role,
    skills: candidate.skills,
    resumeFilename: candidate.resume_filename,
    resumeOriginalName: candidate.resume_original_name,
    createdBy: candidate.created_by,
    createdByUsername: candidate.created_by_username,
    createdAt: candidate.created_at,
    updatedAt: candidate.updated_at,
    comments: comments.map(c => ({
      id: c.id,
      content: c.content,
      createdBy: c.created_by,
      createdByUsername: c.created_by_username,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }))
  };
}

function createCandidate({ name, email, phone, role, skills, resumeFilename, resumeOriginalName }, userId) {
  const teamId = getUserTeamId(userId);
  const id = generateId();
  const now = getTimestamp();
  const username = getUsernameById(userId);

  db.prepare(`
    INSERT INTO candidates (id, name, email, phone, role, skills, resume_filename, resume_original_name, team_id, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, email || '', phone || '', role || '', skills || '', resumeFilename || '', resumeOriginalName || '', teamId, userId, now, now);

  return {
    id,
    name,
    email: email || '',
    phone: phone || '',
    role: role || '',
    skills: skills || '',
    resumeFilename: resumeFilename || '',
    resumeOriginalName: resumeOriginalName || '',
    createdBy: userId,
    createdByUsername: username,
    createdAt: now,
    updatedAt: now,
    comments: []
  };
}

function updateCandidate(candidateId, { name, email, phone, role, skills, resumeFilename, resumeOriginalName }, userId) {
  // Verify access
  const candidate = getCandidateById(candidateId, userId);
  if (!candidate) return null;

  const existing = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
  const now = getTimestamp();

  db.prepare(`
    UPDATE candidates
    SET name = ?, email = ?, phone = ?, role = ?, skills = ?, resume_filename = ?, resume_original_name = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name : existing.name,
    email !== undefined ? email : existing.email,
    phone !== undefined ? phone : existing.phone,
    role !== undefined ? role : existing.role,
    skills !== undefined ? skills : existing.skills,
    resumeFilename !== undefined ? resumeFilename : existing.resume_filename,
    resumeOriginalName !== undefined ? resumeOriginalName : existing.resume_original_name,
    now,
    candidateId
  );

  return getCandidateById(candidateId, userId);
}

function deleteCandidate(candidateId, userId) {
  // Verify access
  const candidate = getCandidateById(candidateId, userId);
  if (!candidate) return { error: 'Candidate not found' };

  const role = getUserRole(userId);
  if (role === 'member' && candidate.createdBy !== userId) {
    return { error: 'Permission denied. You can only delete candidates you created.' };
  }

  const result = db.prepare('DELETE FROM candidates WHERE id = ?').run(candidateId);
  return result.changes > 0 ? { success: true } : { error: 'Delete failed' };
}

function createCandidateComment(candidateId, content, userId) {
  // Verify access to candidate
  const candidate = getCandidateById(candidateId, userId);
  if (!candidate) return null;

  const teamId = getUserTeamId(userId);
  const id = generateId();
  const now = getTimestamp();
  const username = getUsernameById(userId);

  db.prepare(`
    INSERT INTO candidate_comments (id, candidate_id, content, team_id, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, candidateId, content, teamId, userId, now, now);

  db.prepare('UPDATE candidates SET updated_at = ? WHERE id = ?').run(now, candidateId);

  return {
    id,
    content,
    createdBy: userId,
    createdByUsername: username,
    createdAt: now,
    updatedAt: now
  };
}

function updateCandidateComment(candidateId, commentId, content, userId) {
  // Verify access to candidate
  const candidate = getCandidateById(candidateId, userId);
  if (!candidate) return null;

  const comment = db.prepare('SELECT * FROM candidate_comments WHERE id = ? AND candidate_id = ?').get(commentId, candidateId);
  if (!comment) return null;

  const now = getTimestamp();
  const username = getUsernameById(comment.created_by);

  db.prepare('UPDATE candidate_comments SET content = ?, updated_at = ? WHERE id = ?').run(content, now, commentId);
  db.prepare('UPDATE candidates SET updated_at = ? WHERE id = ?').run(now, candidateId);

  return {
    id: commentId,
    content,
    createdBy: comment.created_by,
    createdByUsername: username,
    createdAt: comment.created_at,
    updatedAt: now
  };
}

function deleteCandidateComment(candidateId, commentId, userId) {
  // Verify access to candidate
  const candidate = getCandidateById(candidateId, userId);
  if (!candidate) return { error: 'Candidate not found' };

  const comment = db.prepare('SELECT * FROM candidate_comments WHERE id = ? AND candidate_id = ?').get(commentId, candidateId);
  if (!comment) return { error: 'Comment not found' };

  const role = getUserRole(userId);
  if (role === 'member' && comment.created_by !== userId) {
    return { error: 'Permission denied. You can only delete comments you created.' };
  }

  const now = getTimestamp();

  db.prepare('DELETE FROM candidate_comments WHERE id = ?').run(commentId);
  db.prepare('UPDATE candidates SET updated_at = ? WHERE id = ?').run(now, candidateId);

  return { success: true };
}

module.exports = {
  // Utilities
  generateId,
  getTimestamp,

  // Companies
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,

  // Contacts
  getAllContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,

  // Notes
  createNote,
  updateNote,
  deleteNote,

  // Todos
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,

  // Search
  search,

  // Users
  getUserByUsername,
  getUserByEmail,
  getUserById,
  createUser,
  getUsernameById,

  // Candidates
  getAllCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  createCandidateComment,
  updateCandidateComment,
  deleteCandidateComment,

  // Team & Access Control
  getUserTeamId,
  getUserRole,
  isTeamOwner,
  isTeamMember,
  canDeleteEntity,
  getTeamByUserId,
  createTeam,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  transferOwnership,
  mergeUserDataIntoTeam,
  deleteUserSoloData,
  userHasSoloData,

  // Invitations
  createInvitation,
  getInvitationById,
  getInvitationsByEmail,
  getInvitationsByTeam,
  acceptInvitation,
  declineInvitation,
  cancelInvitation
};
