const express = require('express');
const router = express.Router();
const data = require('../data');

// GET /api/todos - List all todos
router.get('/', (req, res) => {
  try {
    const filter = req.query.filter || 'all';
    const todos = data.getAllTodos(filter);
    res.json(todos);
  } catch (err) {
    console.error('Error fetching todos:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/todos/:id - Get single todo
router.get('/:id', (req, res) => {
  try {
    const todo = data.getTodoById(req.params.id);

    if (!todo) {
      return res.status(404).json({ error: 'ToDo not found' });
    }

    res.json(todo);
  } catch (err) {
    console.error('Error fetching todo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/todos - Create new todo
router.post('/', (req, res) => {
  try {
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

    const newTodo = data.createTodo({
      title: title.trim(),
      description,
      dueDate,
      linkedType,
      linkedId
    });

    res.status(201).json(newTodo);
  } catch (err) {
    console.error('Error creating todo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/todos/:id - Update todo
router.put('/:id', (req, res) => {
  try {
    const { title, description, dueDate, completed } = req.body;

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ error: 'ToDo title cannot be empty' });
    }

    const updated = data.updateTodo(req.params.id, {
      title: title?.trim(),
      description,
      dueDate,
      completed
    });

    if (!updated) {
      return res.status(404).json({ error: 'ToDo not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating todo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/todos/:id - Delete todo
router.delete('/:id', (req, res) => {
  try {
    const deleted = data.deleteTodo(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'ToDo not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting todo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
