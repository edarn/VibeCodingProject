# Personal CRM System - Specification

## Overview

A lightweight, multi-user CRM system for managing companies, contacts, job candidates, and associated notes/tasks. Designed for personal or small team use with cloud deployment support.

## Core Requirements

### Functional Requirements

1. **Authentication**
   - User registration with username, email, password
   - User login with session management
   - Protected routes requiring authentication
   - Logout functionality

2. **Multi-Tenancy & Team Collaboration**
   - Each user has isolated data by default (solo mode)
   - Users can create a team by inviting others via email
   - Team members share all data with full view/edit access
   - Three user roles:
     - **Solo**: Using own isolated data, no team
     - **Owner**: Has a team, full control, can manage members
     - **Member**: Part of a team, can edit all data, can only delete own creations
   - All entities track who created them (created_by field)
   - Team invitation flow:
     - Owner invites by email
     - Invitation appears for users on login (banner + settings)
     - Invited user can accept (with merge/fresh start option) or decline
   - Team management (owner only):
     - View team members
     - Send/cancel invitations
     - Remove members (their data stays with team)
     - Transfer ownership to another member
   - Members can leave a team voluntarily (data stays with team)
   - Owner cannot delete account while team has members

3. **Contact Management**
   - Main view: list of all contacts across all companies
   - Contact fields: name, role, department, description, email, phone
   - Add new contacts linked to a company
   - Edit existing contacts
   - Delete contacts (owner can delete any, member only own creations)
   - Search/filter contacts by name, company, or any field
   - Sort contact list by name, company, or last note date

4. **Company Management**
   - Add new companies with name, organization number, address, and technologies
   - Edit existing companies
   - Delete companies (owner can delete any, member only own creations)
   - View list of all companies
   - View all contacts for a specific company

5. **Candidate Management**
   - Separate tab for managing job candidates (independent from contacts)
   - Candidate fields: name, email, phone, role, skills
   - Resume file upload (PDF, DOC, DOCX, max 10MB)
   - Resume download functionality
   - Comments system for candidate notes
   - Full-text search across all candidate fields
   - Sort candidates by name, role, or skills

6. **Notes & ToDos Management**
   - Notes and ToDos are displayed in a unified "Notes & ToDos" list
   - Each item shows a type label: "Note" (blue) or "ToDo" (green)
   - List sortable by date (default, newest first) or by type
   - When adding a new item, checkbox to "Make this a ToDo"
     - Unchecked: creates a regular note
     - Checked: creates a ToDo with the content as title
   - Notes: timestamped text entries linked to contacts
   - ToDos: actionable items with completion checkbox
   - Edit and delete functionality for both types

7. **ToDo Management**
   - ToDos view accessible from main navigation
   - Add ToDos linked to a Company or a Contact
   - ToDos can be added from:
     - The ToDos list view
     - Contact detail view (via "Make this a ToDo" checkbox)
     - Company detail view
   - ToDo fields: title, description, dueDate, completed status, linked entity
   - Checkbox to mark ToDo as completed
   - Completed ToDos shown greyed out with strikethrough
   - View all ToDos in a central list with filters (All / Active / Completed)

8. **Data Storage**
   - SQLite database for structured data storage
   - File system storage for uploaded resumes
   - Support for persistent volumes on cloud platforms (Railway)

### Non-Functional Requirements

- Multi-user support with authentication
- Deployable to cloud platforms (Railway, Render)
- Accessible via web browser
- Light, modern user interface
- Fast startup time
- Minimal dependencies

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Node.js 18+ | Widely available, excellent ecosystem |
| Backend | Express.js 5 | Simple, minimal, well-documented |
| Database | SQLite (better-sqlite3) | Lightweight, no separate server needed |
| Sessions | express-session + connect-sqlite3 | Persistent sessions in SQLite |
| File Upload | Multer | Standard multipart/form-data handling |
| Authentication | bcryptjs | Secure password hashing |
| Frontend | HTML + Vanilla JS | No build step, easy to modify |
| Styling | Tailwind CSS (CDN) | Modern light theme, minimal effort |

---

## Data Model

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  team_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id)
)
```

#### Teams Table
```sql
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
)
```

#### Team Members Table
```sql
CREATE TABLE team_members (
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

#### Team Invitations Table
```sql
CREATE TABLE team_invitations (
  id TEXT PRIMARY KEY,
  team_id TEXT,
  inviter_id TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_id) REFERENCES users(id)
)
```

#### Companies Table
```sql
CREATE TABLE companies (
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
```

#### Contacts Table
```sql
CREATE TABLE contacts (
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
```

#### Notes Table
```sql
CREATE TABLE notes (
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
```

#### ToDos Table
```sql
CREATE TABLE todos (
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
```

#### Candidates Table
```sql
CREATE TABLE candidates (
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
```

#### Candidate Comments Table
```sql
CREATE TABLE candidate_comments (
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
```

### Field Descriptions

#### User Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | TEXT (UUID) | Yes | Unique identifier |
| username | TEXT | Yes | Unique username for login |
| email | TEXT | Yes | Unique email address |
| password_hash | TEXT | Yes | Bcrypt hashed password |
| created_at | TEXT (ISO) | Yes | When user was created |
| updated_at | TEXT (ISO) | Yes | Last modification time |

#### Company Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | TEXT (UUID) | Yes | Unique identifier |
| name | TEXT | Yes | Company name |
| organization_number | TEXT | No | Organization number |
| address | TEXT | No | Company address |
| technologies | TEXT | No | Technical stacks used |
| created_at | TEXT (ISO) | Yes | When company was created |
| updated_at | TEXT (ISO) | Yes | Last modification time |

#### Contact Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | TEXT (UUID) | Yes | Unique identifier |
| company_id | TEXT | Yes | Foreign key to company |
| name | TEXT | Yes | Contact's full name |
| role | TEXT | No | Job title/role |
| department | TEXT | No | Department within company |
| description | TEXT | No | Additional information |
| email | TEXT | No | Email address |
| phone | TEXT | No | Phone number |
| created_at | TEXT (ISO) | Yes | When contact was created |
| updated_at | TEXT (ISO) | Yes | Last modification time |

#### Candidate Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | TEXT (UUID) | Yes | Unique identifier |
| name | TEXT | Yes | Candidate's full name |
| email | TEXT | No | Email address |
| phone | TEXT | No | Phone number |
| role | TEXT | No | Target role/position |
| skills | TEXT | No | Skills (comma-separated) |
| resume_filename | TEXT | No | Stored filename on disk |
| resume_original_name | TEXT | No | Original uploaded filename |
| created_at | TEXT (ISO) | Yes | When candidate was created |
| updated_at | TEXT (ISO) | Yes | Last modification time |

#### Candidate Comment Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | TEXT (UUID) | Yes | Unique identifier |
| candidate_id | TEXT | Yes | Foreign key to candidate |
| content | TEXT | Yes | Comment text |
| created_at | TEXT (ISO) | Yes | When comment was created |
| updated_at | TEXT (ISO) | Yes | Last modification time |

---

## User Interface

### Theme

- Light, modern design
- Clean white/gray backgrounds
- Accent color for actions (blue)
- Good contrast for readability
- Subtle shadows and rounded corners

### Navigation

Main navigation tabs: **Contacts | Companies | Candidates | ToDos**

### Pages/Views

1. **Login/Register**
   - Login form: username, password
   - Register form: username, email, password
   - Toggle between login and register

2. **Contact List (Default after login)**
   - Table: Contact Name, Company Name, Last Note Date
   - Sortable columns
   - Search box for filtering
   - "Add Contact" button
   - Click row to view details

3. **Contact Detail**
   - Contact information display
   - Company link
   - Edit/Delete buttons
   - Combined "Notes & ToDos" list
   - Add note/todo form with checkbox

4. **Company List**
   - Table: Company Name, Technologies, Contact Count
   - "Add Company" button
   - Click row to view details

5. **Company Detail**
   - Company information display
   - Edit/Delete buttons
   - List of contacts at company
   - "Add Contact" button
   - Company-level ToDos section

6. **Candidates List**
   - Table: Name, Role, Skills, Resume status
   - Sortable columns
   - Full-text search across all fields
   - "Add Candidate" button
   - Click row to view details

7. **Candidate Detail**
   - Candidate information display
   - Resume download link (if uploaded)
   - Edit/Delete buttons
   - Comments section with add/edit/delete

8. **Candidate Form (Add/Edit)**
   - Fields: name, email, phone, role, skills
   - File input for resume upload
   - Shows current resume if editing

9. **ToDos List**
   - All ToDos across contacts and companies
   - Filters: All / Active / Completed
   - Checkbox to toggle completion
   - "Add ToDo" button
   - Click to navigate to linked entity

---

## File Structure

```
VibeCodingProject/
├── server.js              # Main application entry point
├── package.json           # Dependencies and scripts
├── SPECIFICATION.md       # This file
├── data/
│   ├── crm.db             # SQLite database
│   └── sessions.db        # Session storage
├── uploads/               # Resume file storage
│   └── .gitkeep
├── public/
│   ├── index.html         # Main HTML file
│   └── app.js             # Frontend JavaScript
├── src/
│   ├── database.js        # Database initialization
│   ├── data.js            # Data layer functions
│   ├── middleware/
│   │   └── auth.js        # Authentication middleware
│   └── routes/
│       ├── auth.js        # Authentication routes
│       ├── companies.js   # Company API routes
│       ├── contacts.js    # Contact API routes
│       ├── notes.js       # Notes API routes
│       ├── search.js      # Search API routes
│       ├── todos.js       # ToDo API routes
│       ├── candidates.js  # Candidate API routes
│       ├── team.js        # Team management routes
│       └── invitations.js # Invitation routes
└── scripts/
    ├── migrate-json-to-sqlite.js  # Migration script
    └── seed-test-data.js          # Test data seeder
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user (returns role and team info) |
| POST | /api/auth/login | Login user (returns role and team info) |
| POST | /api/auth/logout | Logout user |
| GET | /api/auth/me | Get current user with role and team info |

### Team Management (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/team | Get current user's team info (or null if solo) |
| GET | /api/team/members | List team members (owner only) |
| POST | /api/team/invite | Send invitation by email (owner only) |
| DELETE | /api/team/invite/:id | Cancel pending invitation (owner only) |
| POST | /api/team/transfer | Transfer ownership to member (owner only) |
| POST | /api/team/leave | Leave team (member only) |
| DELETE | /api/team/members/:id | Remove member from team (owner only) |

### Invitations (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/invitations | Get pending invitations for current user |
| POST | /api/invitations/:id/accept | Accept invitation (with mergeData option) |
| POST | /api/invitations/:id/decline | Decline invitation |

### Companies (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/companies | List all companies |
| GET | /api/companies/:id | Get single company with contacts |
| POST | /api/companies | Create new company |
| PUT | /api/companies/:id | Update company |
| DELETE | /api/companies/:id | Delete company and all contacts |

### Contacts (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/contacts | List all contacts |
| GET | /api/contacts?sort=name\|company\|lastNote | Sort contacts |
| GET | /api/contacts/:id | Get single contact with notes |
| POST | /api/contacts | Create new contact |
| PUT | /api/contacts/:id | Update contact |
| DELETE | /api/contacts/:id | Delete contact |

### Notes (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/contacts/:contactId/notes | Add note to contact |
| PUT | /api/contacts/:contactId/notes/:id | Update note |
| DELETE | /api/contacts/:contactId/notes/:id | Delete note |

### ToDos (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/todos | List all ToDos |
| GET | /api/todos?filter=active\|completed | Filter ToDos |
| GET | /api/todos/:id | Get single ToDo |
| POST | /api/todos | Create new ToDo |
| PUT | /api/todos/:id | Update ToDo |
| DELETE | /api/todos/:id | Delete ToDo |

### Candidates (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/candidates | List all candidates |
| GET | /api/candidates/:id | Get candidate with comments |
| POST | /api/candidates | Create candidate (multipart/form-data) |
| PUT | /api/candidates/:id | Update candidate (multipart/form-data) |
| DELETE | /api/candidates/:id | Delete candidate |
| GET | /api/candidates/:id/resume | Download resume file |
| POST | /api/candidates/:id/comments | Add comment |
| PUT | /api/candidates/:id/comments/:commentId | Update comment |
| DELETE | /api/candidates/:id/comments/:commentId | Delete comment |

### Search (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/search?q=term | Search companies and contacts |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check (no auth required) |

---

## Deployment

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment (production/development) | development |
| DATABASE_PATH | Path to SQLite database | ./data/crm.db |
| SESSION_SECRET | Secret for session encryption | dev-secret-change-in-production |

### Railway Deployment

1. Connect GitHub repository to Railway
2. Add a volume mounted at `/data`
3. Set environment variables:
   - `DATABASE_PATH=/data/crm.db`
   - `SESSION_SECRET=<random-secure-string>`
   - `NODE_ENV=production`
4. Deploy

Resume uploads are stored in the same volume directory (`/data/uploads`).

---

## Future Enhancements (Out of Scope)

- [ ] Tags/categories for companies and contacts
- [ ] Import/export to CSV
- [ ] Dark mode toggle
- [ ] Contact photo/avatar
- [ ] Activity timeline across all contacts
- [ ] Favorite/pin important contacts
- [ ] Company-level notes
- [ ] Candidate status tracking (pipeline stages)
- [ ] Email integration
- [ ] Calendar integration for ToDos

---

## Decisions Made

- **Database:** SQLite for simplicity and portability
- **Authentication:** Session-based with bcrypt password hashing
- **File Storage:** Local filesystem with volume support for cloud
- **Candidates:** Separate entity from Contacts (not linked to companies)
- **Resume Upload:** PDF, DOC, DOCX up to 10MB
- **Navigation:** Four main tabs - Contacts, Companies, Candidates, ToDos
- **Search:** Client-side filtering for candidates, server-side for contacts/companies
