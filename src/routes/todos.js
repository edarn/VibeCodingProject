const express = require('express');
const router = express.Router();
const { readData, writeData, findTodo, getAllTodos, generateId, getTimestamp } = require('../data');

// GET /api/todos - List all todos
router.get('/', (req, res) => {
  const data = readData();
  let todos = getAllTodos(data);

  // Filter by status
  const filter = req.query.filter;
  if (filter === 'active') {
    todos = todos.filter(t => !t.completed);
  } else if (filter === 'completed') {
    todos = todos.filter(t => t.completed);
  }

  // Sort by createdAt descending (newest first)
  todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(todos);
});

// GET /api/todos/:id - Get single todo
router.get('/:id', (req, res) => {
  const data = readData();
  const todo = findTodo(data, req.params.id);

  if (!todo) {
    return res.status(404).json({ error: 'ToDo not found' });
  }

  res.json(todo);
});

// POST /api/todos - Create new todo
router.post('/', (req, res) => {
  const { title, description, dueDate, linkedType, linkedId } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'ToDo title is required' });
  }

  if (!linkedType || !['contact', 'company'].includes(linkedType)) {
    return res.status(400).json({ error: 'linkedType must be "contact" or "company"' });
  }

  if (!linkedId) {
    return res.status(400).json({ error: 'linkedId is required' });
  }

  const data = readData();

  // Ensure todos array exists
  if (!data.todos) {
    data.todos = [];
  }

  const now = getTimestamp();

  const newTodo = {
    id: generateId(),
    title: title.trim(),
    description: description || '',
    dueDate: dueDate || now,
    completed: false,
    linkedType,
    linkedId,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };

  data.todos.push(newTodo);
  writeData(data);

  res.status(201).json(newTodo);
});

// PUT /api/todos/:id - Update todo
router.put('/:id', (req, res) => {
  const { title, description, dueDate, completed } = req.body;
  const data = readData();
  const todo = findTodo(data, req.params.id);

  if (!todo) {
    return res.status(404).json({ error: 'ToDo not found' });
  }

  if (title !== undefined) {
    if (!title.trim()) {
      return res.status(400).json({ error: 'ToDo title cannot be empty' });
    }
    todo.title = title.trim();
  }

  if (description !== undefined) {
    todo.description = description;
  }

  if (dueDate !== undefined) {
    todo.dueDate = dueDate;
  }

  if (completed !== undefined) {
    const wasCompleted = todo.completed;
    todo.completed = completed;

    // Set or clear completedAt
    if (completed && !wasCompleted) {
      todo.completedAt = getTimestamp();
    } else if (!completed && wasCompleted) {
      todo.completedAt = null;
    }
  }

  todo.updatedAt = getTimestamp();
  writeData(data);

  res.json(todo);
});

// DELETE /api/todos/:id - Delete todo
router.delete('/:id', (req, res) => {
  const data = readData();

  if (!data.todos) {
    return res.status(404).json({ error: 'ToDo not found' });
  }

  const index = data.todos.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'ToDo not found' });
  }

  data.todos.splice(index, 1);
  writeData(data);

  res.status(204).send();
});

module.exports = router;
