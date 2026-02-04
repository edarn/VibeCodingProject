# Simple CRM

A lightweight, modern CRM system for managing companies, contacts, job candidates, and tasks. Designed for personal use or small teams with cloud deployment support.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![SQLite](https://img.shields.io/badge/Database-SQLite-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

### Contact & Company Management
- Organize contacts by company with detailed profiles
- Track roles, departments, emails, and phone numbers
- Add notes and to-dos for each contact
- Search and filter across all fields
- Sort by name, company, or last activity

### Candidate Tracking
- Separate candidate management for recruiting
- Upload and store resumes (PDF, DOC, DOCX)
- Add comments and track candidate progress
- Full-text search across all candidate fields

### Task Management
- Create to-dos linked to contacts or companies
- Set due dates and track completion
- Filter by active or completed status
- Unified view across all entities

### Team Collaboration
- Invite team members via email
- Share all data with your team
- Role-based permissions (Owner/Member)
- Team branding with custom logo

### Data Protection
- Archive companies and contacts (soft delete)
- Restore archived items anytime
- Export all data as JSON backup
- Import from backup files

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express.js |
| Database | SQLite (better-sqlite3) |
| Frontend | Vanilla JS + Tailwind CSS |
| Auth | Session-based with bcrypt |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/edarn/VibeCodingProject.git
cd VibeCodingProject

# Install dependencies
npm install

# Start the server
npm start
```

Open http://localhost:3000 in your browser.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `DATABASE_PATH` | SQLite database path | ./data/crm.db |
| `SESSION_SECRET` | Session encryption key | dev-secret |
| `NODE_ENV` | Environment mode | development |

## Deployment

### Railway

1. Connect your GitHub repository
2. Add a volume mounted at `/data`
3. Set environment variables:
   - `DATABASE_PATH=/data/crm.db`
   - `SESSION_SECRET=<secure-random-string>`
   - `NODE_ENV=production`
4. Deploy

## Screenshots

The application features a clean, modern interface with:
- Gradient navigation bar with team logo support
- Color-coded sections for different entity types
- Responsive design for all screen sizes

## License

MIT
