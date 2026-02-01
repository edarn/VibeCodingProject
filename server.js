const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/companies', require('./src/routes/companies'));
app.use('/api/contacts', require('./src/routes/contacts'));
app.use('/api/contacts', require('./src/routes/notes'));
app.use('/api/search', require('./src/routes/search'));
app.use('/api/todos', require('./src/routes/todos'));

// Start server
app.listen(PORT, () => {
  console.log(`Personal CRM running at http://localhost:${PORT}`);
});
