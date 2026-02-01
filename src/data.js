const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'crm.json');

// Generate UUID
function generateId() {
  return crypto.randomUUID();
}

// Get current ISO timestamp
function getTimestamp() {
  return new Date().toISOString();
}

// Read data from JSON file
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // If file doesn't exist, return initial structure
    return {
      version: '1.0',
      lastModified: null,
      companies: [],
      todos: []
    };
  }
}

// Write data to JSON file
function writeData(data) {
  data.lastModified = getTimestamp();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

// Find company by ID
function findCompany(data, companyId) {
  return data.companies.find(c => c.id === companyId);
}

// Find contact by ID (searches all companies)
function findContact(data, contactId) {
  for (const company of data.companies) {
    const contact = company.contacts.find(c => c.id === contactId);
    if (contact) {
      return { contact, company };
    }
  }
  return null;
}

// Find note by ID within a contact
function findNote(contact, noteId) {
  return contact.notes.find(n => n.id === noteId);
}

// Get last note date for a contact
function getLastNoteDate(contact) {
  if (!contact.notes || contact.notes.length === 0) {
    return null;
  }
  return contact.notes.reduce((latest, note) => {
    return note.createdAt > latest ? note.createdAt : latest;
  }, contact.notes[0].createdAt);
}

// Get all contacts with company info (flattened list)
function getAllContacts(data) {
  const contacts = [];
  for (const company of data.companies) {
    for (const contact of company.contacts) {
      contacts.push({
        ...contact,
        companyId: company.id,
        companyName: company.name,
        lastNoteDate: getLastNoteDate(contact)
      });
    }
  }
  return contacts;
}

// Find todo by ID
function findTodo(data, todoId) {
  if (!data.todos) return null;
  return data.todos.find(t => t.id === todoId);
}

// Get todos for a specific entity (contact or company)
function getTodosForEntity(data, linkedType, linkedId) {
  if (!data.todos) return [];
  return data.todos.filter(t => t.linkedType === linkedType && t.linkedId === linkedId);
}

// Get the name of a linked entity
function getLinkedEntityName(data, linkedType, linkedId) {
  if (linkedType === 'company') {
    const company = findCompany(data, linkedId);
    return company ? { name: company.name, companyName: null } : null;
  } else if (linkedType === 'contact') {
    const result = findContact(data, linkedId);
    if (result) {
      return { name: result.contact.name, companyName: result.company.name };
    }
  }
  return null;
}

// Get all todos with linked entity info
function getAllTodos(data) {
  if (!data.todos) return [];
  return data.todos.map(todo => {
    const entityInfo = getLinkedEntityName(data, todo.linkedType, todo.linkedId);
    return {
      ...todo,
      linkedName: entityInfo?.name || 'Unknown',
      linkedCompanyName: entityInfo?.companyName || null
    };
  });
}

module.exports = {
  generateId,
  getTimestamp,
  readData,
  writeData,
  findCompany,
  findContact,
  findNote,
  getLastNoteDate,
  getAllContacts,
  findTodo,
  getTodosForEntity,
  getLinkedEntityName,
  getAllTodos
};
