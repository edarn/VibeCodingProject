const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path from environment or default
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'crm.db');

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
function initializeDatabase() {
  // Users table (with team_id for team membership)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      team_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Teams table
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )
  `);

  // Team members table
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (team_id, user_id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Team invitations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_invitations (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      inviter_id TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (inviter_id) REFERENCES users(id)
    )
  `);

  // Companies table (with team_id and created_by for multi-tenancy)
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      technologies TEXT DEFAULT '',
      organization_number TEXT DEFAULT '',
      address TEXT DEFAULT '',
      team_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Contacts table (with team_id and created_by for multi-tenancy)
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT '',
      department TEXT DEFAULT '',
      description TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      team_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Notes table (with team_id and created_by for multi-tenancy)
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      content TEXT NOT NULL,
      team_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Todos table (with team_id and created_by for multi-tenancy)
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      due_date TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      linked_type TEXT NOT NULL CHECK (linked_type IN ('contact', 'company')),
      linked_id TEXT NOT NULL,
      team_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Sessions table (for connect-sqlite3)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired INTEGER NOT NULL
    )
  `);

  // Candidates table (with team_id and created_by for multi-tenancy)
  db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      role TEXT DEFAULT '',
      skills TEXT DEFAULT '',
      resume_filename TEXT DEFAULT '',
      resume_original_name TEXT DEFAULT '',
      team_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Candidate comments table (with team_id and created_by for multi-tenancy)
  db.exec(`
    CREATE TABLE IF NOT EXISTS candidate_comments (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      content TEXT NOT NULL,
      team_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Create basic indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
    CREATE INDEX IF NOT EXISTS idx_notes_contact_id ON notes(contact_id);
    CREATE INDEX IF NOT EXISTS idx_todos_linked ON todos(linked_type, linked_id);
    CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
    CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);
    CREATE INDEX IF NOT EXISTS idx_candidate_comments_candidate_id ON candidate_comments(candidate_id);
  `);

  // Run migration for existing data (must happen before creating indexes on new columns)
  migrateExistingData();

  // Create indexes for new multi-tenancy columns (after migration adds the columns)
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_companies_team_id ON companies(team_id);
      CREATE INDEX IF NOT EXISTS idx_companies_created_by ON companies(created_by);
      CREATE INDEX IF NOT EXISTS idx_contacts_team_id ON contacts(team_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);
      CREATE INDEX IF NOT EXISTS idx_notes_team_id ON notes(team_id);
      CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);
      CREATE INDEX IF NOT EXISTS idx_todos_team_id ON todos(team_id);
      CREATE INDEX IF NOT EXISTS idx_todos_created_by ON todos(created_by);
      CREATE INDEX IF NOT EXISTS idx_candidates_team_id ON candidates(team_id);
      CREATE INDEX IF NOT EXISTS idx_candidates_created_by ON candidates(created_by);
      CREATE INDEX IF NOT EXISTS idx_candidate_comments_team_id ON candidate_comments(team_id);
      CREATE INDEX IF NOT EXISTS idx_candidate_comments_created_by ON candidate_comments(created_by);
      CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
      CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
      CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
    `);
  } catch (err) {
    console.log('Some indexes already exist or columns not yet migrated:', err.message);
  }

  console.log('Database initialized successfully');
}

// Helper to check if a column exists in a table
function columnExists(tableName, columnName) {
  const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return tableInfo.some(col => col.name === columnName);
}

// Helper to safely add a column if it doesn't exist
function addColumnIfNotExists(tableName, columnName, columnDef) {
  if (!columnExists(tableName, columnName)) {
    try {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
      console.log(`Added column ${columnName} to ${tableName}`);
      return true;
    } catch (err) {
      console.error(`Error adding column ${columnName} to ${tableName}:`, err.message);
      return false;
    }
  }
  return false;
}

// Migration function to add new columns to existing tables and assign existing data to the first user
function migrateExistingData() {
  // Add team_id column to users if it doesn't exist
  addColumnIfNotExists('users', 'team_id', 'TEXT');

  // Add team_id and created_by columns to all data tables
  const dataTables = ['companies', 'contacts', 'notes', 'todos', 'candidates', 'candidate_comments'];

  for (const table of dataTables) {
    addColumnIfNotExists(table, 'team_id', 'TEXT');
    addColumnIfNotExists(table, 'created_by', 'TEXT');
  }

  // Add archived_at column for companies and contacts (archive feature)
  addColumnIfNotExists('companies', 'archived_at', 'TEXT');
  addColumnIfNotExists('contacts', 'archived_at', 'TEXT');

  // Add deleted_at column for notes (soft delete feature)
  addColumnIfNotExists('notes', 'deleted_at', 'TEXT');

  // Find the first user to assign orphaned data to
  const firstUser = db.prepare('SELECT id FROM users ORDER BY created_at ASC LIMIT 1').get();

  if (firstUser) {
    const userId = firstUser.id;

    // Assign all data without created_by to the first user
    for (const table of dataTables) {
      const result = db.prepare(`UPDATE ${table} SET created_by = ? WHERE created_by IS NULL`).run(userId);
      if (result.changes > 0) {
        console.log(`Migrated ${result.changes} rows in ${table} to user ${userId}`);
      }
    }
  }
}

// Initialize on module load
initializeDatabase();

module.exports = db;
