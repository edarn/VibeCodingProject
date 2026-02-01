# Personal CRM System - Specification

## Overview

A lightweight, locally-run CRM system for managing companies, contacts (persons at companies), and associated notes. Designed for personal use with easy data portability.

## Core Requirements

### Functional Requirements

1. **Contact Management**
   - Main view: list of all contacts across all companies
   - Contact fields: name, role, department, description, email, phone
   - Add new contacts linked to a company
   - Edit existing contacts
   - Delete contacts
   - Search/filter contacts by name, company, or any field
   - Sort contact list by name, company, or last note date

2. **Company Management**
   - Add new companies with name and technologies
   - Edit existing companies
   - Delete companies (and associated contacts)
   - View list of all companies
   - View all contacts for a specific company

3. **Notes Management**
   - Add timestamped notes to any contact. timestamp is default set to the current time when creating a note.
   - View all notes for a contact (chronological order)
   - Edit existing notes
   - Delete notes

4. **Data Portability**
   - All data stored in a single JSON file
   - Easy to backup, copy, or transfer to another machine
   - Human-readable format

### Non-Functional Requirements

- Runs entirely on local machine
- Accessed via web browser (localhost:3000)
- Light, modern user interface
- Fast startup time
- Minimal dependencies

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Node.js | Widely available, excellent ecosystem |
| Backend | Express.js | Simple, minimal, well-documented |
| Frontend | HTML + Vanilla JS | No build step, easy to modify |
| Styling | Tailwind CSS (CDN) | Modern light theme, minimal effort |
| Storage | JSON file (fs module) | Simple, portable, human-readable |

---

## Data Model

### JSON Structure

```json
{
  "version": "1.0",
  "lastModified": "2024-01-15T10:30:00Z",
  "companies": [
    {
      "id": "company-uuid",
      "name": "Acme Corp",
      "technologies": "Java, Spring Boot, PostgreSQL, AWS",
      "createdAt": "2024-01-10T08:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "contacts": [
        {
          "id": "contact-uuid",
          "name": "John Doe",
          "role": "Tech Lead",
          "department": "Engineering",
          "description": "Works on backend services and API integrations",
          "email": "john.doe@acme.com",
          "phone": "+1 555-123-4567",
          "createdAt": "2024-01-10T08:00:00Z",
          "updatedAt": "2024-01-15T10:30:00Z",
          "notes": [
            {
              "id": "note-uuid",
              "content": "Met at conference, interested in product demo",
              "createdAt": "2024-01-10T08:00:00Z",
              "updatedAt": "2024-01-10T08:00:00Z"
            }
          ]
        }
      ]
    }
  ]
}
```

### Company Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Yes | Unique identifier |
| name | string | Yes | Company name |
| technologies | string | No | Technical stacks used by the company |
| createdAt | ISO datetime | Yes | When company was created |
| updatedAt | ISO datetime | Yes | Last modification time |
| contacts | array | Yes | Array of contact objects |

### Contact Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Yes | Unique identifier |
| name | string | Yes | Contact's full name |
| role | string | No | Job title/role at company |
| department | string | No | Department within company |
| description | string | No | What this contact/their team works with |
| email | string | No | Email address |
| phone | string | No | Phone number |
| createdAt | ISO datetime | Yes | When contact was created |
| updatedAt | ISO datetime | Yes | Last modification time |
| notes | array | Yes | Array of note objects |

### Note Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Yes | Unique identifier |
| content | string | Yes | Note text content |
| createdAt | ISO datetime | Yes | When note was created |
| updatedAt | ISO datetime | Yes | Last modification time |

---

## User Interface

### Theme

- Light, modern design
- Clean white/gray backgrounds
- Accent color for actions (blue)
- Good contrast for readability
- Subtle shadows and rounded corners

### Pages/Views

1. **Contact List (Home)**
   - Default main view showing all contacts in the system
   - Table columns: Contact Name, Company Name, Last Note Date
   - Sortable by: name, company, or last note date
   - Search box for filtering across all contacts
   - "Add Contact" button
   - Click contact row to view details

2. **Contact Detail**
   - Contact information (name, role, department, description, email, phone)
   - Company name (clickable link to company)
   - Edit contact button
   - Delete contact button
   - List of all notes (newest first)
   - "Add Note" form/button
   - Back to contact list navigation

3. **Company List**
   - Secondary view accessible from navigation
   - Table/list of all companies
   - Shows company name, technologies, contact count
   - "Add Company" button
   - Click company to view details

4. **Company Detail**
   - Company information (name, technologies)
   - Edit company button
   - Delete company button
   - List of all contacts at this company
   - "Add Contact" button (pre-selects this company)
   - Back to company list navigation

5. **Add/Edit Contact**
   - Form: name, role, department, description (textarea), email, phone
   - Company selector (dropdown of existing companies)
   - Save/Cancel buttons

6. **Add/Edit Company**
   - Form: name, technologies
   - Save/Cancel buttons

### UI Principles

- Clean, minimal design
- Light modern theme with good whitespace
- Responsive (works on different screen sizes)
- No unnecessary animations or complexity
- Clear visual hierarchy
- Intuitive navigation breadcrumbs

---

## File Structure

```
VibeCodingProject/
├── server.js           # Main application entry point
├── package.json        # Dependencies and scripts
├── data/
│   └── crm.json        # Data storage file
├── public/
│   ├── index.html      # Main HTML file
│   ├── style.css       # Custom styles (if needed)
│   └── app.js          # Frontend JavaScript
└── SPECIFICATION.md    # This file
```

---

## API Endpoints

### Companies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/companies | List all companies |
| GET | /api/companies/:id | Get single company with contacts |
| POST | /api/companies | Create new company |
| PUT | /api/companies/:id | Update company |
| DELETE | /api/companies/:id | Delete company and all contacts |

### Contacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/contacts | List all contacts (with company name, last note date) |
| GET | /api/contacts?sort=name\|company\|lastNote | Sort contacts |
| GET | /api/contacts/:id | Get single contact with notes |
| POST | /api/contacts | Create new contact (companyId in body) |
| PUT | /api/contacts/:id | Update contact |
| DELETE | /api/contacts/:id | Delete contact |

### Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/companies/:companyId/contacts/:contactId/notes | Add note to contact |
| PUT | /api/companies/:companyId/contacts/:contactId/notes/:id | Update note |
| DELETE | /api/companies/:companyId/contacts/:contactId/notes/:id | Delete note |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/search?q=term | Search companies and contacts |

---

## Future Enhancements (Out of Scope for V1)

- [ ] Tags/categories for companies and contacts
- [ ] Reminder/follow-up dates
- [ ] Import/export to CSV
- [ ] Multiple data files (workspaces)
- [ ] Dark mode toggle
- [ ] Contact photo/avatar
- [ ] Activity timeline across all contacts
- [ ] Favorite/pin important contacts

---

## Decisions Made

- **Technology Stack:** Node.js + Express + Vanilla JS + Tailwind CSS
- **Theme:** Light modern design
- **Port:** 3000
- **Main View:** Contact list (all contacts, sortable, searchable)
- **Contact Fields:** name, role, department, description, email, phone
- **Company Fields:** name, technologies
- **List Columns:** Contact name, Company name, Last note date
- **Sort Options:** By name, company, or last note date
