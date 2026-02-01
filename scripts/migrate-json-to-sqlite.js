/**
 * Migration script: JSON to SQLite
 *
 * Reads existing data/crm.json and inserts into SQLite database.
 * Run once: node scripts/migrate-json-to-sqlite.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Set database path before requiring database module
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'crm.db');
process.env.DATABASE_PATH = DB_PATH;

const db = require('../src/database');

const JSON_FILE = path.join(__dirname, '..', 'data', 'crm.json');

function migrate() {
  console.log('Starting migration from JSON to SQLite...');
  console.log(`Source: ${JSON_FILE}`);
  console.log(`Target: ${DB_PATH}`);

  // Check if JSON file exists
  if (!fs.existsSync(JSON_FILE)) {
    console.log('No crm.json file found. Nothing to migrate.');
    return;
  }

  // Read JSON data
  const raw = fs.readFileSync(JSON_FILE, 'utf8');
  const data = JSON.parse(raw);

  // Check if data already exists in database
  const existingCompanies = db.prepare('SELECT COUNT(*) as count FROM companies').get();
  if (existingCompanies.count > 0) {
    console.log('Database already contains data. Skipping migration to prevent duplicates.');
    console.log('If you want to re-migrate, delete or rename the existing .db file first.');
    return;
  }

  // Begin transaction for atomic migration
  const transaction = db.transaction(() => {
    // Migrate companies
    const insertCompany = db.prepare(`
      INSERT INTO companies (id, name, technologies, organization_number, address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertContact = db.prepare(`
      INSERT INTO contacts (id, company_id, name, role, department, description, email, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertNote = db.prepare(`
      INSERT INTO notes (id, contact_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertTodo = db.prepare(`
      INSERT INTO todos (id, title, description, due_date, completed, completed_at, linked_type, linked_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let companyCount = 0;
    let contactCount = 0;
    let noteCount = 0;
    let todoCount = 0;

    // Migrate companies and their contacts/notes
    for (const company of (data.companies || [])) {
      insertCompany.run(
        company.id,
        company.name,
        company.technologies || '',
        company.organizationNumber || '',
        company.address || '',
        company.createdAt,
        company.updatedAt
      );
      companyCount++;

      // Migrate contacts for this company
      for (const contact of (company.contacts || [])) {
        insertContact.run(
          contact.id,
          company.id,
          contact.name,
          contact.role || '',
          contact.department || '',
          contact.description || '',
          contact.email || '',
          contact.phone || '',
          contact.createdAt,
          contact.updatedAt
        );
        contactCount++;

        // Migrate notes for this contact
        for (const note of (contact.notes || [])) {
          insertNote.run(
            note.id,
            contact.id,
            note.content,
            note.createdAt,
            note.updatedAt
          );
          noteCount++;
        }
      }
    }

    // Migrate todos
    for (const todo of (data.todos || [])) {
      insertTodo.run(
        todo.id,
        todo.title,
        todo.description || '',
        todo.dueDate || null,
        todo.completed ? 1 : 0,
        todo.completedAt || null,
        todo.linkedType,
        todo.linkedId,
        todo.createdAt,
        todo.updatedAt
      );
      todoCount++;
    }

    console.log('\nMigration complete!');
    console.log(`- Companies: ${companyCount}`);
    console.log(`- Contacts: ${contactCount}`);
    console.log(`- Notes: ${noteCount}`);
    console.log(`- Todos: ${todoCount}`);
  });

  // Execute transaction
  try {
    transaction();
    console.log('\nMigration successful!');
    console.log('You can now start the server with: npm start');
  } catch (error) {
    console.error('\nMigration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migrate();
