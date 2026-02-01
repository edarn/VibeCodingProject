/**
 * Seed script: Generate test data
 * Run: node scripts/seed-test-data.js
 */

const path = require('path');
const crypto = require('crypto');

// Set database path before requiring database module
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'crm.db');
process.env.DATABASE_PATH = DB_PATH;

const db = require('../src/database');

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString();
}

function futureDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead) + 1);
  return date.toISOString();
}

const companies = [
  {
    name: 'TechVision AB',
    technologies: 'React, Node.js, AWS',
    organizationNumber: '556789-1234',
    address: 'Storgatan 15, 111 23 Stockholm',
    contacts: [
      { name: 'Anna Lindberg', role: 'CTO', department: 'Engineering', email: 'anna.lindberg@techvision.se', phone: '+46 70 123 4567' },
      { name: 'Erik Johansson', role: 'Lead Developer', department: 'Engineering', email: 'erik.j@techvision.se', phone: '+46 70 234 5678' },
      { name: 'Maria Svensson', role: 'Product Manager', department: 'Product', email: 'maria.s@techvision.se', phone: '+46 70 345 6789' },
      { name: 'Johan Karlsson', role: 'DevOps Engineer', department: 'Infrastructure', email: 'johan.k@techvision.se', phone: '+46 70 456 7890' },
    ]
  },
  {
    name: 'Nordic Solutions',
    technologies: 'Python, Django, GCP',
    organizationNumber: '556123-9876',
    address: 'Kungsgatan 42, 411 19 Göteborg',
    contacts: [
      { name: 'Lisa Andersson', role: 'CEO', department: 'Management', email: 'lisa@nordicsolutions.se', phone: '+46 73 111 2222' },
      { name: 'Peter Nilsson', role: 'Sales Director', department: 'Sales', email: 'peter.n@nordicsolutions.se', phone: '+46 73 222 3333' },
      { name: 'Karin Berg', role: 'Senior Consultant', department: 'Consulting', email: 'karin.b@nordicsolutions.se', phone: '+46 73 333 4444' },
      { name: 'Oscar Holm', role: 'Solution Architect', department: 'Engineering', email: 'oscar.h@nordicsolutions.se', phone: '+46 73 444 5555' },
      { name: 'Emma Larsson', role: 'Project Manager', department: 'PMO', email: 'emma.l@nordicsolutions.se', phone: '+46 73 555 6666' },
      { name: 'Gustav Persson', role: 'Backend Developer', department: 'Engineering', email: 'gustav.p@nordicsolutions.se', phone: '+46 73 666 7777' },
    ]
  },
  {
    name: 'DataFlow Systems',
    technologies: 'Java, Spring Boot, Kubernetes',
    organizationNumber: '556456-7890',
    address: 'Drottninggatan 88, 252 21 Malmö',
    contacts: [
      { name: 'Fredrik Ek', role: 'Technical Lead', department: 'Development', email: 'fredrik.ek@dataflow.se', phone: '+46 76 100 2000' },
      { name: 'Sara Lindqvist', role: 'QA Manager', department: 'Quality', email: 'sara.l@dataflow.se', phone: '+46 76 200 3000' },
      { name: 'Anders Berg', role: 'System Administrator', department: 'Operations', email: 'anders.b@dataflow.se', phone: '+46 76 300 4000' },
    ]
  },
  {
    name: 'CloudNine Technologies',
    technologies: 'Azure, .NET, Microservices',
    organizationNumber: '556321-6543',
    address: 'Vasagatan 22, 753 20 Uppsala',
    contacts: [
      { name: 'Henrik Strand', role: 'Cloud Architect', department: 'Architecture', email: 'henrik.s@cloudnine.se', phone: '+46 72 111 0001' },
      { name: 'Malin Olsson', role: 'Frontend Lead', department: 'Development', email: 'malin.o@cloudnine.se', phone: '+46 72 222 0002' },
      { name: 'Niklas Falk', role: 'Security Engineer', department: 'Security', email: 'niklas.f@cloudnine.se', phone: '+46 72 333 0003' },
      { name: 'Josefin Dahl', role: 'UX Designer', department: 'Design', email: 'josefin.d@cloudnine.se', phone: '+46 72 444 0004' },
      { name: 'Tobias Lund', role: 'Data Engineer', department: 'Data', email: 'tobias.l@cloudnine.se', phone: '+46 72 555 0005' },
    ]
  },
  {
    name: 'Innovate Nordic',
    technologies: 'TypeScript, Next.js, PostgreSQL',
    organizationNumber: '556999-1111',
    address: 'Hamngatan 5, 602 24 Norrköping',
    contacts: [
      { name: 'Camilla Björk', role: 'Head of Innovation', department: 'R&D', email: 'camilla.b@innovatenordic.se', phone: '+46 70 999 1111' },
      { name: 'Daniel Ström', role: 'Mobile Developer', department: 'Development', email: 'daniel.s@innovatenordic.se', phone: '+46 70 888 2222' },
      { name: 'Elin Hedlund', role: 'Business Analyst', department: 'Business', email: 'elin.h@innovatenordic.se', phone: '+46 70 777 3333' },
      { name: 'Marcus Vinge', role: 'Scrum Master', department: 'Agile', email: 'marcus.v@innovatenordic.se', phone: '+46 70 666 4444' },
    ]
  }
];

const noteTemplates = [
  'Hade ett bra möte idag. Diskuterade projektets framsteg och kommande milstolpar.',
  'Skickade offert på konsulttjänster. Väntar på återkoppling.',
  'Telefonsamtal om tekniska krav. De är intresserade av vår lösning.',
  'Lunch med kontakten. Pratade om framtida samarbetsmöjligheter.',
  'Demo av vår produkt genomförd. Mycket positiv respons.',
  'Följde upp tidigare konversation. De behöver mer tid för beslut.',
  'Workshop planerad för nästa vecka. Ska gå igenom arkitektur.',
  'Fick feedback på prototypen. Några justeringar behövs.',
  'Presenterade budget och tidplan. Verkar ligga inom deras ramar.',
  'Introducerade dem för vårt utvecklingsteam.',
  'Diskuterade integrationer med befintliga system.',
  'Gick igenom säkerhetskrav och compliance.',
  'Planerade pilot-projekt för Q2.',
  'Utvärderade konkurrerande lösningar tillsammans.',
  'Signerade NDA för att kunna dela mer detaljer.',
];

const todoTemplates = [
  { title: 'Skicka uppföljningsmail', description: 'Sammanfatta mötet och nästa steg' },
  { title: 'Boka uppföljningsmöte', description: 'Föreslå tider för nästa vecka' },
  { title: 'Förbereda presentation', description: 'Skapa slides för produktdemo' },
  { title: 'Skicka offert', description: 'Baserat på diskuterade krav' },
  { title: 'Teknisk specifikation', description: 'Dokumentera integrationsdetaljer' },
  { title: 'Granska kontrakt', description: 'Gå igenom juridiska villkor' },
  { title: 'Planera workshop', description: 'Agenda och deltagarlista' },
  { title: 'Uppdatera CRM', description: 'Logga senaste interaktionen' },
  { title: 'Research konkurrenter', description: 'Jämför vår lösning med alternativ' },
  { title: 'Förbereda POC', description: 'Sätt upp testmiljö för kunden' },
  { title: 'Samla referenser', description: 'Kontakta befintliga kunder för referens' },
  { title: 'Budgetförslag', description: 'Ta fram kostnadsestimat' },
];

function seed() {
  console.log('Seeding test data...\n');

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

  const transaction = db.transaction(() => {
    for (const company of companies) {
      const companyId = uuid();
      const companyCreated = randomDate(60);

      insertCompany.run(
        companyId,
        company.name,
        company.technologies,
        company.organizationNumber,
        company.address,
        companyCreated,
        companyCreated
      );
      companyCount++;
      console.log(`Created company: ${company.name}`);

      for (const contact of company.contacts) {
        const contactId = uuid();
        const contactCreated = randomDate(45);

        insertContact.run(
          contactId,
          companyId,
          contact.name,
          contact.role,
          contact.department,
          `${contact.role} på ${company.name}. Huvudkontakt för tekniska diskussioner.`,
          contact.email,
          contact.phone,
          contactCreated,
          contactCreated
        );
        contactCount++;
        console.log(`  - Contact: ${contact.name}`);

        // Add 3-8 notes per contact
        const numNotes = 3 + Math.floor(Math.random() * 6);
        for (let i = 0; i < numNotes; i++) {
          const noteId = uuid();
          const noteCreated = randomDate(30);
          const noteContent = noteTemplates[Math.floor(Math.random() * noteTemplates.length)];

          insertNote.run(
            noteId,
            contactId,
            noteContent,
            noteCreated,
            noteCreated
          );
          noteCount++;
        }
        console.log(`    Added ${numNotes} notes`);

        // Add 3-8 todos per contact
        const numTodos = 3 + Math.floor(Math.random() * 6);
        for (let i = 0; i < numTodos; i++) {
          const todoId = uuid();
          const todoCreated = randomDate(14);
          const todoTemplate = todoTemplates[Math.floor(Math.random() * todoTemplates.length)];
          const isCompleted = Math.random() > 0.7;

          insertTodo.run(
            todoId,
            todoTemplate.title,
            todoTemplate.description,
            futureDate(14),
            isCompleted ? 1 : 0,
            isCompleted ? now() : null,
            'contact',
            contactId,
            todoCreated,
            todoCreated
          );
          todoCount++;
        }
        console.log(`    Added ${numTodos} todos`);
      }
    }
  });

  try {
    transaction();
    console.log('\n--- Seeding complete! ---');
    console.log(`Companies: ${companyCount}`);
    console.log(`Contacts: ${contactCount}`);
    console.log(`Notes: ${noteCount}`);
    console.log(`Todos: ${todoCount}`);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
