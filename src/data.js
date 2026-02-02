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

// ============ Company Functions ============

function getAllCompanies() {
  const rows = db.prepare(`
    SELECT c.*, COUNT(ct.id) as contact_count
    FROM companies c
    LEFT JOIN contacts ct ON ct.company_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `).all();

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    technologies: row.technologies,
    organizationNumber: row.organization_number,
    address: row.address,
    contactCount: row.contact_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

function getCompanyById(companyId) {
  const company = db.prepare(`
    SELECT * FROM companies WHERE id = ?
  `).get(companyId);

  if (!company) return null;

  const contacts = db.prepare(`
    SELECT * FROM contacts WHERE company_id = ? ORDER BY name
  `).all(companyId);

  return {
    id: company.id,
    name: company.name,
    technologies: company.technologies,
    organizationNumber: company.organization_number,
    address: company.address,
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
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }))
  };
}

function createCompany({ name, technologies, organizationNumber, address }) {
  const id = generateId();
  const now = getTimestamp();

  db.prepare(`
    INSERT INTO companies (id, name, technologies, organization_number, address, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, technologies || '', organizationNumber || '', address || '', now, now);

  return {
    id,
    name,
    technologies: technologies || '',
    organizationNumber: organizationNumber || '',
    address: address || '',
    createdAt: now,
    updatedAt: now,
    contacts: []
  };
}

function updateCompany(companyId, { name, technologies, organizationNumber, address }) {
  const now = getTimestamp();

  const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  if (!existing) return null;

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

  return getCompanyById(companyId);
}

function deleteCompany(companyId) {
  const result = db.prepare('DELETE FROM companies WHERE id = ?').run(companyId);
  return result.changes > 0;
}

// ============ Contact Functions ============

function getAllContacts(sort = 'name') {
  let orderBy = 'c.name';
  if (sort === 'company') {
    orderBy = 'co.name, c.name';
  } else if (sort === 'lastNote') {
    orderBy = 'last_note_date DESC NULLS LAST, c.name';
  }

  const rows = db.prepare(`
    SELECT c.*, co.name as company_name,
           (SELECT MAX(n.created_at) FROM notes n WHERE n.contact_id = c.id) as last_note_date
    FROM contacts c
    JOIN companies co ON co.id = c.company_id
    ORDER BY ${orderBy}
  `).all();

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
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

function getContactById(contactId) {
  const row = db.prepare(`
    SELECT c.*, co.name as company_name,
           (SELECT MAX(n.created_at) FROM notes n WHERE n.contact_id = c.id) as last_note_date
    FROM contacts c
    JOIN companies co ON co.id = c.company_id
    WHERE c.id = ?
  `).get(contactId);

  if (!row) return null;

  const notes = db.prepare(`
    SELECT * FROM notes WHERE contact_id = ? ORDER BY created_at DESC
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: notes.map(n => ({
      id: n.id,
      content: n.content,
      createdAt: n.created_at,
      updatedAt: n.updated_at
    }))
  };
}

function createContact({ companyId, name, role, department, description, email, phone }) {
  // Verify company exists
  const company = db.prepare('SELECT id, name FROM companies WHERE id = ?').get(companyId);
  if (!company) return null;

  const id = generateId();
  const now = getTimestamp();

  db.prepare(`
    INSERT INTO contacts (id, company_id, name, role, department, description, email, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, companyId, name, role || '', department || '', description || '', email || '', phone || '', now, now);

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
    createdAt: now,
    updatedAt: now,
    notes: []
  };
}

function updateContact(contactId, { name, role, department, description, email, phone, companyId }) {
  const now = getTimestamp();

  const existing = db.prepare(`
    SELECT c.*, co.name as company_name
    FROM contacts c
    JOIN companies co ON co.id = c.company_id
    WHERE c.id = ?
  `).get(contactId);

  if (!existing) return null;

  // If moving to a different company, verify it exists
  let targetCompanyId = existing.company_id;
  if (companyId && companyId !== existing.company_id) {
    const newCompany = db.prepare('SELECT id FROM companies WHERE id = ?').get(companyId);
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

  return getContactById(contactId);
}

function deleteContact(contactId) {
  const contact = db.prepare('SELECT company_id FROM contacts WHERE id = ?').get(contactId);
  if (!contact) return false;

  const now = getTimestamp();
  db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now, contact.company_id);

  const result = db.prepare('DELETE FROM contacts WHERE id = ?').run(contactId);
  return result.changes > 0;
}

// ============ Note Functions ============

function createNote(contactId, content) {
  const contact = db.prepare('SELECT id, company_id FROM contacts WHERE id = ?').get(contactId);
  if (!contact) return null;

  const id = generateId();
  const now = getTimestamp();

  db.prepare(`
    INSERT INTO notes (id, contact_id, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, contactId, content, now, now);

  // Update contact and company timestamps
  db.prepare('UPDATE contacts SET updated_at = ? WHERE id = ?').run(now, contactId);
  db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now, contact.company_id);

  return {
    id,
    content,
    createdAt: now,
    updatedAt: now
  };
}

function updateNote(contactId, noteId, content) {
  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND contact_id = ?').get(noteId, contactId);
  if (!note) return null;

  const contact = db.prepare('SELECT company_id FROM contacts WHERE id = ?').get(contactId);
  const now = getTimestamp();

  db.prepare('UPDATE notes SET content = ?, updated_at = ? WHERE id = ?').run(content, now, noteId);
  db.prepare('UPDATE contacts SET updated_at = ? WHERE id = ?').run(now, contactId);
  db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now, contact.company_id);

  return {
    id: noteId,
    content,
    createdAt: note.created_at,
    updatedAt: now
  };
}

function deleteNote(contactId, noteId) {
  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND contact_id = ?').get(noteId, contactId);
  if (!note) return false;

  const contact = db.prepare('SELECT company_id FROM contacts WHERE id = ?').get(contactId);
  const now = getTimestamp();

  db.prepare('DELETE FROM notes WHERE id = ?').run(noteId);
  db.prepare('UPDATE contacts SET updated_at = ? WHERE id = ?').run(now, contactId);
  db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now, contact.company_id);

  return true;
}

// ============ Todo Functions ============

function getAllTodos(filter = 'all') {
  let whereClause = '';
  if (filter === 'active') {
    whereClause = 'WHERE t.completed = 0';
  } else if (filter === 'completed') {
    whereClause = 'WHERE t.completed = 1';
  }

  const rows = db.prepare(`
    SELECT t.*
    FROM todos t
    ${whereClause}
    ORDER BY t.created_at DESC
  `).all();

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
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  });
}

function getTodoById(todoId) {
  const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId);
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
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createTodo({ title, description, dueDate, linkedType, linkedId }) {
  const id = generateId();
  const now = getTimestamp();

  db.prepare(`
    INSERT INTO todos (id, title, description, due_date, completed, completed_at, linked_type, linked_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)
  `).run(id, title, description || '', dueDate || now, linkedType, linkedId, now, now);

  return {
    id,
    title,
    description: description || '',
    dueDate: dueDate || now,
    completed: false,
    completedAt: null,
    linkedType,
    linkedId,
    createdAt: now,
    updatedAt: now
  };
}

function updateTodo(todoId, { title, description, dueDate, completed }) {
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId);
  if (!existing) return null;

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

  return getTodoById(todoId);
}

function deleteTodo(todoId) {
  const result = db.prepare('DELETE FROM todos WHERE id = ?').run(todoId);
  return result.changes > 0;
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

function search(query) {
  const searchTerm = `%${query}%`;

  const contacts = db.prepare(`
    SELECT c.*, co.name as company_name,
           (SELECT MAX(n.created_at) FROM notes n WHERE n.contact_id = c.id) as last_note_date
    FROM contacts c
    JOIN companies co ON co.id = c.company_id
    WHERE c.name LIKE ? OR co.name LIKE ? OR c.role LIKE ?
       OR c.department LIKE ? OR c.description LIKE ? OR c.email LIKE ?
  `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);

  const companies = db.prepare(`
    SELECT c.*, COUNT(ct.id) as contact_count
    FROM companies c
    LEFT JOIN contacts ct ON ct.company_id = c.id
    WHERE c.name LIKE ? OR c.technologies LIKE ?
    GROUP BY c.id
  `).all(searchTerm, searchTerm);

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
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    companies: companies.map(row => ({
      id: row.id,
      name: row.name,
      technologies: row.technologies,
      contactCount: row.contact_count
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

function getAllCandidates() {
  const rows = db.prepare(`
    SELECT * FROM candidates ORDER BY name
  `).all();

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    skills: row.skills,
    resumeFilename: row.resume_filename,
    resumeOriginalName: row.resume_original_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

function getCandidateById(candidateId) {
  const candidate = db.prepare(`
    SELECT * FROM candidates WHERE id = ?
  `).get(candidateId);

  if (!candidate) return null;

  const comments = db.prepare(`
    SELECT * FROM candidate_comments WHERE candidate_id = ? ORDER BY created_at DESC
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
    createdAt: candidate.created_at,
    updatedAt: candidate.updated_at,
    comments: comments.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }))
  };
}

function createCandidate({ name, email, phone, role, skills, resumeFilename, resumeOriginalName }) {
  const id = generateId();
  const now = getTimestamp();

  db.prepare(`
    INSERT INTO candidates (id, name, email, phone, role, skills, resume_filename, resume_original_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, email || '', phone || '', role || '', skills || '', resumeFilename || '', resumeOriginalName || '', now, now);

  return {
    id,
    name,
    email: email || '',
    phone: phone || '',
    role: role || '',
    skills: skills || '',
    resumeFilename: resumeFilename || '',
    resumeOriginalName: resumeOriginalName || '',
    createdAt: now,
    updatedAt: now,
    comments: []
  };
}

function updateCandidate(candidateId, { name, email, phone, role, skills, resumeFilename, resumeOriginalName }) {
  const now = getTimestamp();

  const existing = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
  if (!existing) return null;

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

  return getCandidateById(candidateId);
}

function deleteCandidate(candidateId) {
  const result = db.prepare('DELETE FROM candidates WHERE id = ?').run(candidateId);
  return result.changes > 0;
}

function createCandidateComment(candidateId, content) {
  const candidate = db.prepare('SELECT id FROM candidates WHERE id = ?').get(candidateId);
  if (!candidate) return null;

  const id = generateId();
  const now = getTimestamp();

  db.prepare(`
    INSERT INTO candidate_comments (id, candidate_id, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, candidateId, content, now, now);

  db.prepare('UPDATE candidates SET updated_at = ? WHERE id = ?').run(now, candidateId);

  return {
    id,
    content,
    createdAt: now,
    updatedAt: now
  };
}

function updateCandidateComment(candidateId, commentId, content) {
  const comment = db.prepare('SELECT * FROM candidate_comments WHERE id = ? AND candidate_id = ?').get(commentId, candidateId);
  if (!comment) return null;

  const now = getTimestamp();

  db.prepare('UPDATE candidate_comments SET content = ?, updated_at = ? WHERE id = ?').run(content, now, commentId);
  db.prepare('UPDATE candidates SET updated_at = ? WHERE id = ?').run(now, candidateId);

  return {
    id: commentId,
    content,
    createdAt: comment.created_at,
    updatedAt: now
  };
}

function deleteCandidateComment(candidateId, commentId) {
  const comment = db.prepare('SELECT * FROM candidate_comments WHERE id = ? AND candidate_id = ?').get(commentId, candidateId);
  if (!comment) return false;

  const now = getTimestamp();

  db.prepare('DELETE FROM candidate_comments WHERE id = ?').run(commentId);
  db.prepare('UPDATE candidates SET updated_at = ? WHERE id = ?').run(now, candidateId);

  return true;
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

  // Candidates
  getAllCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  createCandidateComment,
  updateCandidateComment,
  deleteCandidateComment
};
