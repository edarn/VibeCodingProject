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
      companies: []
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

module.exports = {
  generateId,
  getTimestamp,
  readData,
  writeData,
  findCompany,
  findContact,
  findNote,
  getLastNoteDate,
  getAllContacts
};
