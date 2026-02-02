// Authentication module
const auth = {
  currentUser: null,

  async checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        this.currentUser = await res.json();
        this.showLoggedInUI();
        return true;
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
    this.currentUser = null;
    this.showLoginModal();
    return false;
  },

  showLoggedInUI() {
    document.getElementById('nav-links').classList.remove('hidden');
    document.getElementById('user-section').classList.remove('hidden');
    document.getElementById('current-user').textContent = this.currentUser.username;
    document.getElementById('auth-modal').classList.add('hidden');
  },

  showLoginModal() {
    document.getElementById('nav-links').classList.add('hidden');
    document.getElementById('user-section').classList.add('hidden');
    document.getElementById('app').innerHTML = '';

    const authModal = document.getElementById('auth-modal');
    authModal.classList.remove('hidden');

    document.getElementById('auth-modal-content').innerHTML = `
      <div id="login-form">
        <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Login</h2>

        <div id="auth-error" class="hidden mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>

        <form onsubmit="auth.login(event)">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" id="login-username" required autocomplete="username"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" id="login-password" required autocomplete="current-password"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <button type="submit"
                  class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium">
            Login
          </button>
        </form>

        <p class="mt-4 text-center text-sm text-gray-600">
          Don't have an account?
          <a href="#" onclick="auth.showRegisterForm(); return false;" class="text-blue-600 hover:text-blue-800">Register</a>
        </p>
      </div>
    `;
  },

  showRegisterForm() {
    document.getElementById('auth-modal-content').innerHTML = `
      <div id="register-form">
        <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Register</h2>

        <div id="auth-error" class="hidden mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>

        <form onsubmit="auth.register(event)">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" id="register-username" required autocomplete="username"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" id="register-email" required autocomplete="email"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">Password (min 6 characters)</label>
            <input type="password" id="register-password" required minlength="6" autocomplete="new-password"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <button type="submit"
                  class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium">
            Register
          </button>
        </form>

        <p class="mt-4 text-center text-sm text-gray-600">
          Already have an account?
          <a href="#" onclick="auth.showLoginModal(); return false;" class="text-blue-600 hover:text-blue-800">Login</a>
        </p>
      </div>
    `;
  },

  showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  },

  async login(event) {
    event.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        this.showAuthError(data.error || 'Login failed');
        return;
      }

      this.currentUser = data;
      this.showLoggedInUI();
      router.navigate('contacts');
    } catch (err) {
      console.error('Login error:', err);
      this.showAuthError('Connection error. Please try again.');
    }
  },

  async register(event) {
    event.preventDefault();

    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        this.showAuthError(data.error || 'Registration failed');
        return;
      }

      this.currentUser = data;
      this.showLoggedInUI();
      router.navigate('contacts');
    } catch (err) {
      console.error('Register error:', err);
      this.showAuthError('Connection error. Please try again.');
    }
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    this.currentUser = null;
    this.showLoginModal();
  }
};

// API helper functions with 401 handling
const api = {
  async get(url) {
    const res = await fetch(url);
    if (res.status === 401) {
      auth.showLoginModal();
      throw new Error('Authentication required');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.status === 401) {
      auth.showLoginModal();
      throw new Error('Authentication required');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async put(url, data) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.status === 401) {
      auth.showLoginModal();
      throw new Error('Authentication required');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async delete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    if (res.status === 401) {
      auth.showLoginModal();
      throw new Error('Authentication required');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  }
};

// Simple router
const router = {
  currentRoute: null,

  navigate(route, params = {}) {
    this.currentRoute = { route, params };
    this.render();
    this.updateNav();
  },

  updateNav() {
    document.querySelectorAll('.nav-link').forEach(link => {
      const route = link.dataset.route;
      const current = this.currentRoute?.route;
      const isActive = route === current ||
          (route === 'contacts' && current?.startsWith('contact')) ||
          (route === 'companies' && current?.startsWith('company')) ||
          (route === 'candidates' && current?.startsWith('candidate')) ||
          (route === 'todos' && current?.startsWith('todo'));
      if (isActive) {
        link.classList.add('bg-gray-100', 'text-gray-900');
        link.classList.remove('text-gray-600');
      } else {
        link.classList.remove('bg-gray-100', 'text-gray-900');
        link.classList.add('text-gray-600');
      }
    });
  },

  async render() {
    const app = document.getElementById('app');
    const { route, params } = this.currentRoute || { route: 'contacts', params: {} };

    try {
      switch (route) {
        case 'contacts':
          await views.contactList(app);
          break;
        case 'contact-detail':
          await views.contactDetail(app, params.id);
          break;
        case 'contact-form':
          await views.contactForm(app, params.id, params.companyId);
          break;
        case 'companies':
          await views.companyList(app);
          break;
        case 'company-detail':
          await views.companyDetail(app, params.id);
          break;
        case 'company-form':
          await views.companyForm(app, params.id);
          break;
        case 'todos':
          await views.todoList(app);
          break;
        case 'todo-form':
          await views.todoForm(app, params.linkedType, params.linkedId);
          break;
        case 'candidates':
          await views.candidateList(app);
          break;
        case 'candidate-detail':
          await views.candidateDetail(app, params.id);
          break;
        case 'candidate-form':
          await views.candidateForm(app, params.id);
          break;
        default:
          await views.contactList(app);
      }
    } catch (err) {
      if (err.message !== 'Authentication required') {
        app.innerHTML = `<div class="text-red-600">Error: ${err.message}</div>`;
      }
    }
  }
};

// Modal helper
const modal = {
  show(content) {
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal').classList.remove('hidden');
  },
  hide() {
    document.getElementById('modal').classList.add('hidden');
  }
};

// Close modal on backdrop click
document.getElementById('modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal') modal.hide();
});

// Format date for display
function formatDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleDateString('sv-SE');
}

// Format date with time for notes
function formatDateTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const dateStr = date.toLocaleDateString('sv-SE');
  const timeStr = date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dateStr} ${timeStr}`;
}

// Views
const views = {
  // Contact List View (Main)
  async contactList(container) {
    const contacts = await api.get('/api/contacts');

    container.innerHTML = `
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Contacts</h2>
          <p class="text-gray-600">${contacts.length} contacts</p>
        </div>
        <button onclick="router.navigate('contact-form')"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          Add Contact
        </button>
      </div>

      <div class="mb-4">
        <input type="text" id="search-input" placeholder="Search contacts..."
               class="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               oninput="views.filterContacts()">
      </div>

      <div class="bg-white shadow-sm rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onclick="views.sortContacts('name')">
                Name <span id="sort-name" class="text-blue-600"></span>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onclick="views.sortContacts('company')">
                Company <span id="sort-company"></span>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onclick="views.sortContacts('lastNote')">
                Last Note <span id="sort-lastNote"></span>
              </th>
            </tr>
          </thead>
          <tbody id="contacts-table" class="bg-white divide-y divide-gray-200">
            ${this.renderContactRows(contacts)}
          </tbody>
        </table>
      </div>
    `;

    this._contacts = contacts;
    this._currentSort = 'name';
    this._sortAsc = true;
    document.getElementById('sort-name').textContent = '↑';
  },

  renderContactRows(contacts) {
    if (contacts.length === 0) {
      return `<tr><td colspan="3" class="px-6 py-8 text-center text-gray-500">No contacts found</td></tr>`;
    }
    return contacts.map(c => `
      <tr class="hover:bg-gray-50 cursor-pointer" onclick="router.navigate('contact-detail', {id: '${c.id}'})">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="font-medium text-gray-900">${this.escapeHtml(c.name)}</div>
          ${c.role ? `<div class="text-sm text-gray-500">${this.escapeHtml(c.role)}</div>` : ''}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-gray-600">${this.escapeHtml(c.companyName || '-')}</td>
        <td class="px-6 py-4 whitespace-nowrap text-gray-500">${formatDateTime(c.lastNoteDate)}</td>
      </tr>
    `).join('');
  },

  filterContacts() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = this._contacts.filter(c =>
      c.name.toLowerCase().includes(query) ||
      (c.companyName || '').toLowerCase().includes(query) ||
      (c.role || '').toLowerCase().includes(query) ||
      (c.department || '').toLowerCase().includes(query) ||
      (c.description || '').toLowerCase().includes(query)
    );
    document.getElementById('contacts-table').innerHTML = this.renderContactRows(filtered);
  },

  sortContacts(field) {
    // Toggle direction if same field, otherwise reset to ascending
    if (this._currentSort === field) {
      this._sortAsc = !this._sortAsc;
    } else {
      this._currentSort = field;
      this._sortAsc = true;
    }

    // Clear sort indicators
    ['name', 'company', 'lastNote'].forEach(f => {
      document.getElementById(`sort-${f}`).textContent = '';
    });

    const sorted = [...this._contacts].sort((a, b) => {
      let result;
      switch (field) {
        case 'company':
          result = (a.companyName || '').localeCompare(b.companyName || '');
          break;
        case 'lastNote':
          if (!a.lastNoteDate && !b.lastNoteDate) result = 0;
          else if (!a.lastNoteDate) result = 1;
          else if (!b.lastNoteDate) result = -1;
          else result = new Date(b.lastNoteDate) - new Date(a.lastNoteDate);
          break;
        default:
          result = (a.name || '').localeCompare(b.name || '');
      }
      return this._sortAsc ? result : -result;
    });

    document.getElementById(`sort-${field}`).textContent = this._sortAsc ? '↑' : '↓';
    document.getElementById('contacts-table').innerHTML = this.renderContactRows(sorted);
  },

  // Contact Detail View
  async contactDetail(container, id) {
    const [contact, allTodos] = await Promise.all([
      api.get(`/api/contacts/${id}`),
      api.get('/api/todos')
    ]);
    const todos = allTodos.filter(t => t.linkedType === 'contact' && t.linkedId === id);

    container.innerHTML = `
      <div class="mb-6">
        <a href="#" onclick="router.navigate('contacts'); return false;" class="text-blue-600 hover:text-blue-800">
          ← Back to Contacts
        </a>
      </div>

      <div class="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">${this.escapeHtml(contact.name)}</h2>
            <a href="#" onclick="router.navigate('company-detail', {id: '${contact.companyId}'}); return false;"
               class="text-blue-600 hover:text-blue-800">${this.escapeHtml(contact.companyName)}</a>
          </div>
          <div class="flex gap-2">
            <button onclick="router.navigate('contact-form', {id: '${contact.id}'})"
                    class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition">
              Edit
            </button>
            <button onclick="views.deleteContact('${contact.id}')"
                    class="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition">
              Delete
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          ${contact.role ? `<div><span class="text-gray-500">Role:</span> ${this.escapeHtml(contact.role)}</div>` : ''}
          ${contact.department ? `<div><span class="text-gray-500">Department:</span> ${this.escapeHtml(contact.department)}</div>` : ''}
          ${contact.email ? `<div><span class="text-gray-500">Email:</span> <a href="mailto:${this.escapeHtml(contact.email)}" class="text-blue-600">${this.escapeHtml(contact.email)}</a></div>` : ''}
          ${contact.phone ? `<div><span class="text-gray-500">Phone:</span> ${this.escapeHtml(contact.phone)}</div>` : ''}
        </div>

        ${contact.description ? `
          <div class="mt-4 pt-4 border-t border-gray-200">
            <h3 class="text-sm font-medium text-gray-500 mb-2">Description</h3>
            <p class="text-gray-700">${this.escapeHtml(contact.description)}</p>
          </div>
        ` : ''}
      </div>

      <div class="bg-white shadow-sm rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Notes & ToDos</h3>

        <form onsubmit="views.addNote(event, '${contact.id}')" class="mb-6">
          <textarea id="new-note" rows="3" placeholder="Add a note..."
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
          <div class="mt-2 flex items-center gap-4">
            <label class="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" id="make-todo" class="h-4 w-4 text-blue-600 rounded border-gray-300">
              Make this a ToDo
            </label>
            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              Add
            </button>
          </div>
        </form>

        <div class="mb-3 flex gap-2 text-sm">
          <span class="text-gray-500">Sort by:</span>
          <button onclick="views.sortActivity('date')" class="activity-sort text-blue-600 font-medium" data-sort="date">Date <span id="sort-activity-date">↓</span></button>
          <button onclick="views.sortActivity('type')" class="activity-sort text-gray-600 hover:text-gray-800" data-sort="type">Type <span id="sort-activity-type"></span></button>
        </div>

        <div id="activity-list" class="space-y-4">
          ${this.renderActivityList(contact.notes, todos, contact.id, 'contact')}
        </div>
      </div>
    `;

    this._currentContact = contact;
    this._currentTodos = todos;
    this._activitySort = 'date';
    this._activitySortAsc = false;
  },

  renderNotes(notes, contactId) {
    if (!notes || notes.length === 0) {
      return '<p class="text-gray-500">No notes yet</p>';
    }

    // Sort notes by date, newest first
    const sorted = [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return sorted.map(note => `
      <div class="border-l-4 border-blue-200 pl-4 py-2" data-note-id="${note.id}">
        <div class="flex justify-between items-start">
          <p class="text-gray-700 whitespace-pre-wrap">${this.escapeHtml(note.content)}</p>
          <div class="flex gap-2 ml-4">
            <button onclick="views.editNote('${contactId}', '${note.id}')" class="text-gray-400 hover:text-gray-600">Edit</button>
            <button onclick="views.deleteNote('${contactId}', '${note.id}')" class="text-red-400 hover:text-red-600">Delete</button>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-1">${formatDateTime(note.createdAt)}</p>
      </div>
    `).join('');
  },

  // Combined activity list (notes + todos)
  renderActivityList(notes, todos, entityId, entityType) {
    // Combine notes and todos into unified items
    const items = [];

    (notes || []).forEach(note => {
      items.push({
        type: 'note',
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        completed: false
      });
    });

    (todos || []).forEach(todo => {
      items.push({
        type: 'todo',
        id: todo.id,
        content: todo.title,
        description: todo.description,
        dueDate: todo.dueDate,
        createdAt: todo.createdAt,
        completed: todo.completed
      });
    });

    if (items.length === 0) {
      return '<p class="text-gray-500">No notes or ToDos yet</p>';
    }

    // Sort based on current sort setting
    const sortField = this._activitySort || 'date';
    const sortAsc = this._activitySortAsc !== undefined ? this._activitySortAsc : false;

    items.sort((a, b) => {
      let result;
      if (sortField === 'type') {
        result = a.type.localeCompare(b.type);
      } else {
        result = new Date(b.createdAt) - new Date(a.createdAt);
      }
      return sortAsc ? -result : result;
    });

    return items.map(item => {
      if (item.type === 'note') {
        return `
          <div class="border-l-4 border-blue-200 pl-4 py-2" data-note-id="${item.id}">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <span class="inline-block px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 mb-1">Note</span>
                <p class="text-gray-700 whitespace-pre-wrap">${this.escapeHtml(item.content)}</p>
              </div>
              <div class="flex gap-2 ml-4">
                <button onclick="views.editNote('${entityId}', '${item.id}')" class="text-gray-400 hover:text-gray-600 text-sm">Edit</button>
                <button onclick="views.deleteNote('${entityId}', '${item.id}')" class="text-red-400 hover:text-red-600 text-sm">Delete</button>
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-1">${formatDateTime(item.createdAt)}</p>
          </div>
        `;
      } else {
        return `
          <div class="border-l-4 ${item.completed ? 'border-gray-300' : 'border-green-300'} pl-4 py-2 ${item.completed ? 'opacity-50' : ''}" data-todo-id="${item.id}">
            <div class="flex justify-between items-start">
              <div class="flex items-start flex-1">
                <input type="checkbox" ${item.completed ? 'checked' : ''}
                       onchange="views.toggleTodoInline('${item.id}', this.checked, '${entityType}', '${entityId}')"
                       class="h-4 w-4 mt-1 text-green-600 rounded border-gray-300 cursor-pointer">
                <div class="ml-2">
                  <span class="inline-block px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 mb-1">ToDo</span>
                  <p class="text-gray-700 ${item.completed ? 'line-through' : ''}">${this.escapeHtml(item.content)}</p>
                  ${item.description ? `<p class="text-sm text-gray-500 mt-1">${this.escapeHtml(item.description)}</p>` : ''}
                  <p class="text-xs text-gray-400 mt-1">Due: ${formatDateTime(item.dueDate)} | Created: ${formatDateTime(item.createdAt)}</p>
                </div>
              </div>
              <div class="flex gap-2 ml-4">
                <button onclick="views.editTodoInline('${item.id}', '${entityType}', '${entityId}')" class="text-gray-400 hover:text-gray-600 text-sm">Edit</button>
                <button onclick="views.deleteTodoInline('${item.id}', '${entityType}', '${entityId}')" class="text-red-400 hover:text-red-600 text-sm">Delete</button>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');
  },

  sortActivity(field) {
    if (this._activitySort === field) {
      this._activitySortAsc = !this._activitySortAsc;
    } else {
      this._activitySort = field;
      this._activitySortAsc = field === 'type' ? true : false;
    }

    // Update sort indicators
    document.querySelectorAll('.activity-sort').forEach(btn => {
      const sortField = btn.dataset.sort;
      const indicator = document.getElementById(`sort-activity-${sortField}`);
      if (sortField === field) {
        btn.classList.remove('text-gray-600');
        btn.classList.add('text-blue-600', 'font-medium');
        indicator.textContent = this._activitySortAsc ? '↑' : '↓';
      } else {
        btn.classList.remove('text-blue-600', 'font-medium');
        btn.classList.add('text-gray-600');
        indicator.textContent = '';
      }
    });

    // Re-render the list
    const contact = this._currentContact;
    const todos = this._currentTodos;
    if (contact) {
      document.getElementById('activity-list').innerHTML =
        this.renderActivityList(contact.notes, todos, contact.id, 'contact');
    }
  },

  async addNote(event, contactId) {
    event.preventDefault();
    const content = document.getElementById('new-note').value.trim();
    if (!content) return;

    const makeTodo = document.getElementById('make-todo')?.checked;

    if (makeTodo) {
      // Create as ToDo instead
      await api.post('/api/todos', {
        title: content,
        description: '',
        dueDate: new Date().toISOString(),
        linkedType: 'contact',
        linkedId: contactId
      });
    } else {
      // Create as regular note
      await api.post(`/api/contacts/${contactId}/notes`, { content });
    }
    router.navigate('contact-detail', { id: contactId });
  },

  async editNote(contactId, noteId) {
    const note = this._currentContact.notes.find(n => n.id === noteId);
    if (!note) return;

    modal.show(`
      <h3 class="text-lg font-semibold mb-4">Edit Note</h3>
      <textarea id="edit-note-content" rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-lg">${this.escapeHtml(note.content)}</textarea>
      <div class="flex justify-end gap-2 mt-4">
        <button onclick="modal.hide()" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
        <button onclick="views.saveNote('${contactId}', '${noteId}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save</button>
      </div>
    `);
  },

  async saveNote(contactId, noteId) {
    const content = document.getElementById('edit-note-content').value.trim();
    if (!content) return;

    await api.put(`/api/contacts/${contactId}/notes/${noteId}`, { content });
    modal.hide();
    router.navigate('contact-detail', { id: contactId });
  },

  async deleteNote(contactId, noteId) {
    if (!confirm('Delete this note?')) return;
    await api.delete(`/api/contacts/${contactId}/notes/${noteId}`);
    router.navigate('contact-detail', { id: contactId });
  },

  async deleteContact(id) {
    if (!confirm('Delete this contact and all their notes?')) return;
    await api.delete(`/api/contacts/${id}`);
    router.navigate('contacts');
  },

  // Contact Form
  async contactForm(container, id, preselectedCompanyId) {
    const companies = await api.get('/api/companies');
    let contact = { name: '', role: '', department: '', description: '', email: '', phone: '', companyId: preselectedCompanyId || '' };

    if (id) {
      contact = await api.get(`/api/contacts/${id}`);
    }

    container.innerHTML = `
      <div class="mb-6">
        <a href="#" onclick="router.navigate('contacts'); return false;" class="text-blue-600 hover:text-blue-800">
          ← Back to Contacts
        </a>
      </div>

      <div class="bg-white shadow-sm rounded-lg p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">${id ? 'Edit Contact' : 'New Contact'}</h2>

        <form onsubmit="views.saveContact(event, '${id || ''}')" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" id="contact-name" value="${this.escapeHtml(contact.name)}" required
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Company *</label>
            <select id="contact-company" onchange="views.toggleNewCompany()"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Select a company</option>
              <option value="__new__">+ Add new company...</option>
              ${companies.map(c => `<option value="${c.id}" ${c.id === contact.companyId ? 'selected' : ''}>${this.escapeHtml(c.name)}</option>`).join('')}
            </select>
            <div id="new-company-field" class="hidden mt-2">
              <input type="text" id="new-company-name" placeholder="Enter new company name"
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input type="text" id="contact-role" value="${this.escapeHtml(contact.role || '')}"
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" id="contact-department" value="${this.escapeHtml(contact.department || '')}"
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="contact-description" rows="3"
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">${this.escapeHtml(contact.description || '')}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" id="contact-email" value="${this.escapeHtml(contact.email || '')}"
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" id="contact-phone" value="${this.escapeHtml(contact.phone || '')}"
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
          </div>

          <div class="flex justify-end gap-4 pt-4">
            <button type="button" onclick="router.navigate('contacts')"
                    class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit"
                    class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">Save</button>
          </div>
        </form>
      </div>
    `;
  },

  toggleNewCompany() {
    const select = document.getElementById('contact-company');
    const newField = document.getElementById('new-company-field');
    const newInput = document.getElementById('new-company-name');

    if (select.value === '__new__') {
      newField.classList.remove('hidden');
      newInput.required = true;
      select.required = false;
    } else {
      newField.classList.add('hidden');
      newInput.required = false;
      newInput.value = '';
      select.required = true;
    }
  },

  async saveContact(event, id) {
    event.preventDefault();

    let companyId = document.getElementById('contact-company').value;

    // Create new company if needed
    if (companyId === '__new__') {
      const newCompanyName = document.getElementById('new-company-name').value.trim();
      if (!newCompanyName) {
        alert('Please enter a company name');
        return;
      }
      const newCompany = await api.post('/api/companies', { name: newCompanyName });
      companyId = newCompany.id;
    }

    const data = {
      name: document.getElementById('contact-name').value,
      companyId: companyId,
      role: document.getElementById('contact-role').value,
      department: document.getElementById('contact-department').value,
      description: document.getElementById('contact-description').value,
      email: document.getElementById('contact-email').value,
      phone: document.getElementById('contact-phone').value
    };

    if (id) {
      await api.put(`/api/contacts/${id}`, data);
      router.navigate('contact-detail', { id });
    } else {
      const contact = await api.post('/api/contacts', data);
      router.navigate('contact-detail', { id: contact.id });
    }
  },

  // Company List View
  async companyList(container) {
    const companies = await api.get('/api/companies');

    container.innerHTML = `
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Companies</h2>
          <p class="text-gray-600">${companies.length} companies</p>
        </div>
        <button onclick="router.navigate('company-form')"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          Add Company
        </button>
      </div>

      <div class="bg-white shadow-sm rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technologies</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacts</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${companies.length === 0 ? `
              <tr><td colspan="3" class="px-6 py-8 text-center text-gray-500">No companies yet</td></tr>
            ` : companies.map(c => `
              <tr class="hover:bg-gray-50 cursor-pointer" onclick="router.navigate('company-detail', {id: '${c.id}'})">
                <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${this.escapeHtml(c.name)}</td>
                <td class="px-6 py-4 text-gray-600">${this.escapeHtml(c.technologies || '-')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-gray-500">${c.contactCount}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // Company Detail View
  async companyDetail(container, id) {
    const [company, allTodos] = await Promise.all([
      api.get(`/api/companies/${id}`),
      api.get('/api/todos')
    ]);
    const todos = allTodos.filter(t => t.linkedType === 'company' && t.linkedId === id);

    container.innerHTML = `
      <div class="mb-6">
        <a href="#" onclick="router.navigate('companies'); return false;" class="text-blue-600 hover:text-blue-800">
          ← Back to Companies
        </a>
      </div>

      <div class="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">${this.escapeHtml(company.name)}</h2>
            ${company.technologies ? `<p class="text-gray-600 mt-1">${this.escapeHtml(company.technologies)}</p>` : ''}
          </div>
          <div class="flex gap-2">
            <button onclick="router.navigate('company-form', {id: '${company.id}'})"
                    class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition">
              Edit
            </button>
            <button onclick="views.deleteCompany('${company.id}')"
                    class="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition">
              Delete
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          ${company.organizationNumber ? `<div><span class="text-gray-500">Org.nr:</span> ${this.escapeHtml(company.organizationNumber)}</div>` : ''}
          ${company.address ? `<div><span class="text-gray-500">Adress:</span> ${this.escapeHtml(company.address)}</div>` : ''}
        </div>
      </div>

      <div class="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Contacts (${company.contacts.length})</h3>
          <button onclick="router.navigate('contact-form', {companyId: '${company.id}'})"
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            Add Contact
          </button>
        </div>

        ${company.contacts.length === 0 ? `
          <p class="text-gray-500">No contacts at this company</p>
        ` : `
          <div class="space-y-3">
            ${company.contacts.map(c => `
              <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                   onclick="router.navigate('contact-detail', {id: '${c.id}'})">
                <div>
                  <div class="font-medium text-gray-900">${this.escapeHtml(c.name)}</div>
                  ${c.role ? `<div class="text-sm text-gray-500">${this.escapeHtml(c.role)}</div>` : ''}
                </div>
                <span class="text-gray-400">→</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <div class="bg-white shadow-sm rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Notes & ToDos</h3>

        <form onsubmit="views.addCompanyTodo(event, '${company.id}')" class="mb-6">
          <textarea id="company-new-note" rows="3" placeholder="Add a note or ToDo..."
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
          <div class="mt-2 flex items-center gap-4">
            <label class="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" id="company-make-todo" class="h-4 w-4 text-blue-600 rounded border-gray-300" checked>
              Make this a ToDo
            </label>
            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              Add
            </button>
          </div>
        </form>

        <div class="mb-3 flex gap-2 text-sm">
          <span class="text-gray-500">Sort by:</span>
          <button onclick="views.sortCompanyActivity('date')" class="company-activity-sort text-blue-600 font-medium" data-sort="date">Date <span id="sort-company-activity-date">↓</span></button>
          <button onclick="views.sortCompanyActivity('type')" class="company-activity-sort text-gray-600 hover:text-gray-800" data-sort="type">Type <span id="sort-company-activity-type"></span></button>
        </div>

        <div id="company-activity-list" class="space-y-4">
          ${this.renderCompanyActivityList(todos, company.id)}
        </div>
      </div>
    `;

    this._currentCompany = company;
    this._companyTodos = todos;
    this._companyActivitySort = 'date';
    this._companyActivitySortAsc = false;
  },

  async deleteCompany(id) {
    if (!confirm('Delete this company and all its contacts?')) return;
    await api.delete(`/api/companies/${id}`);
    router.navigate('companies');
  },

  // Company activity list (todos only for companies, but could add company-level notes later)
  renderCompanyActivityList(todos, companyId) {
    const items = (todos || []).map(todo => ({
      type: 'todo',
      id: todo.id,
      content: todo.title,
      description: todo.description,
      dueDate: todo.dueDate,
      createdAt: todo.createdAt,
      completed: todo.completed
    }));

    if (items.length === 0) {
      return '<p class="text-gray-500">No ToDos yet</p>';
    }

    // Sort based on current sort setting
    const sortField = this._companyActivitySort || 'date';
    const sortAsc = this._companyActivitySortAsc !== undefined ? this._companyActivitySortAsc : false;

    items.sort((a, b) => {
      let result;
      if (sortField === 'type') {
        result = a.type.localeCompare(b.type);
      } else {
        result = new Date(b.createdAt) - new Date(a.createdAt);
      }
      return sortAsc ? -result : result;
    });

    return items.map(item => `
      <div class="border-l-4 ${item.completed ? 'border-gray-300' : 'border-green-300'} pl-4 py-2 ${item.completed ? 'opacity-50' : ''}" data-todo-id="${item.id}">
        <div class="flex justify-between items-start">
          <div class="flex items-start flex-1">
            <input type="checkbox" ${item.completed ? 'checked' : ''}
                   onchange="views.toggleTodoInline('${item.id}', this.checked, 'company', '${companyId}')"
                   class="h-4 w-4 mt-1 text-green-600 rounded border-gray-300 cursor-pointer">
            <div class="ml-2">
              <span class="inline-block px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 mb-1">ToDo</span>
              <p class="text-gray-700 ${item.completed ? 'line-through' : ''}">${this.escapeHtml(item.content)}</p>
              ${item.description ? `<p class="text-sm text-gray-500 mt-1">${this.escapeHtml(item.description)}</p>` : ''}
              <p class="text-xs text-gray-400 mt-1">Due: ${formatDateTime(item.dueDate)} | Created: ${formatDateTime(item.createdAt)}</p>
            </div>
          </div>
          <div class="flex gap-2 ml-4">
            <button onclick="views.editTodoInline('${item.id}', 'company', '${companyId}')" class="text-gray-400 hover:text-gray-600 text-sm">Edit</button>
            <button onclick="views.deleteTodoInline('${item.id}', 'company', '${companyId}')" class="text-red-400 hover:text-red-600 text-sm">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  },

  sortCompanyActivity(field) {
    if (this._companyActivitySort === field) {
      this._companyActivitySortAsc = !this._companyActivitySortAsc;
    } else {
      this._companyActivitySort = field;
      this._companyActivitySortAsc = field === 'type' ? true : false;
    }

    // Update sort indicators
    document.querySelectorAll('.company-activity-sort').forEach(btn => {
      const sortField = btn.dataset.sort;
      const indicator = document.getElementById(`sort-company-activity-${sortField}`);
      if (sortField === field) {
        btn.classList.remove('text-gray-600');
        btn.classList.add('text-blue-600', 'font-medium');
        indicator.textContent = this._companyActivitySortAsc ? '↑' : '↓';
      } else {
        btn.classList.remove('text-blue-600', 'font-medium');
        btn.classList.add('text-gray-600');
        indicator.textContent = '';
      }
    });

    // Re-render the list
    const company = this._currentCompany;
    const todos = this._companyTodos;
    if (company) {
      document.getElementById('company-activity-list').innerHTML =
        this.renderCompanyActivityList(todos, company.id);
    }
  },

  async addCompanyTodo(event, companyId) {
    event.preventDefault();
    const content = document.getElementById('company-new-note').value.trim();
    if (!content) return;

    const makeTodo = document.getElementById('company-make-todo')?.checked;

    if (makeTodo) {
      await api.post('/api/todos', {
        title: content,
        description: '',
        dueDate: new Date().toISOString(),
        linkedType: 'company',
        linkedId: companyId
      });
    }
    // Note: Companies don't have notes in the current data model, so we only support todos for now
    router.navigate('company-detail', { id: companyId });
  },

  // Company Form
  async companyForm(container, id) {
    let company = { name: '', technologies: '', organizationNumber: '', address: '' };

    if (id) {
      company = await api.get(`/api/companies/${id}`);
    }

    container.innerHTML = `
      <div class="mb-6">
        <a href="#" onclick="router.navigate('companies'); return false;" class="text-blue-600 hover:text-blue-800">
          ← Back to Companies
        </a>
      </div>

      <div class="bg-white shadow-sm rounded-lg p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">${id ? 'Edit Company' : 'New Company'}</h2>

        <form onsubmit="views.saveCompany(event, '${id || ''}')" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" id="company-name" value="${this.escapeHtml(company.name)}" required
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Organisationsnr</label>
              <input type="text" id="company-orgnum" value="${this.escapeHtml(company.organizationNumber || '')}"
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Adress</label>
              <input type="text" id="company-address" value="${this.escapeHtml(company.address || '')}"
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Technologies</label>
            <input type="text" id="company-technologies" value="${this.escapeHtml(company.technologies || '')}"
                   placeholder="e.g., React, Node.js, PostgreSQL"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <div class="flex justify-end gap-4 pt-4">
            <button type="button" onclick="router.navigate('companies')"
                    class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit"
                    class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">Save</button>
          </div>
        </form>
      </div>
    `;
  },

  async saveCompany(event, id) {
    event.preventDefault();

    const data = {
      name: document.getElementById('company-name').value,
      organizationNumber: document.getElementById('company-orgnum').value,
      address: document.getElementById('company-address').value,
      technologies: document.getElementById('company-technologies').value
    };

    if (id) {
      await api.put(`/api/companies/${id}`, data);
      router.navigate('company-detail', { id });
    } else {
      const company = await api.post('/api/companies', data);
      router.navigate('company-detail', { id: company.id });
    }
  },

  // ToDo List View
  async todoList(container) {
    const todos = await api.get('/api/todos');

    container.innerHTML = `
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">ToDos</h2>
          <p class="text-gray-600">${todos.filter(t => !t.completed).length} active, ${todos.filter(t => t.completed).length} completed</p>
        </div>
        <button onclick="views.showAddTodoModal()"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          Add ToDo
        </button>
      </div>

      <div class="mb-4 flex gap-2">
        <button onclick="views.filterTodos('all')" class="todo-filter px-3 py-1 rounded-lg bg-blue-100 text-blue-700" data-filter="all">All</button>
        <button onclick="views.filterTodos('active')" class="todo-filter px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200" data-filter="active">Active</button>
        <button onclick="views.filterTodos('completed')" class="todo-filter px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200" data-filter="completed">Completed</button>
      </div>

      <div class="bg-white shadow-sm rounded-lg overflow-hidden">
        <div id="todos-list" class="divide-y divide-gray-200">
          ${this.renderTodoRows(todos)}
        </div>
      </div>
    `;

    this._todos = todos;
    this._todoFilter = 'all';
  },

  renderTodoRows(todos) {
    if (todos.length === 0) {
      return `<div class="px-6 py-8 text-center text-gray-500">No ToDos found</div>`;
    }
    return todos.map(t => `
      <div class="flex items-start px-6 py-4 ${t.completed ? 'bg-gray-50' : ''}" data-todo-id="${t.id}">
        <input type="checkbox" ${t.completed ? 'checked' : ''}
               onchange="views.toggleTodo('${t.id}', this.checked)"
               class="h-5 w-5 mt-1 text-blue-600 rounded border-gray-300 cursor-pointer">
        <div class="ml-4 flex-1 ${t.completed ? 'opacity-50' : ''}">
          <div class="font-medium text-gray-900 ${t.completed ? 'line-through' : ''}">${this.escapeHtml(t.title)}</div>
          ${t.description ? `<div class="text-sm text-gray-600 mt-1">${this.escapeHtml(t.description)}</div>` : ''}
          <div class="text-sm text-gray-500 mt-1">
            <span class="mr-3">${t.linkedType === 'contact' ? `${this.escapeHtml(t.linkedName)} @ ${this.escapeHtml(t.linkedCompanyName || '')}` : this.escapeHtml(t.linkedName)}</span>
            <span class="text-gray-400">Due: ${formatDateTime(t.dueDate)}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="views.navigateToLinked('${t.linkedType}', '${t.linkedId}')" class="text-blue-600 hover:text-blue-800 text-sm">View</button>
          <button onclick="views.editTodo('${t.id}')" class="text-gray-400 hover:text-gray-600 text-sm">Edit</button>
          <button onclick="views.deleteTodo('${t.id}')" class="text-red-400 hover:text-red-600 text-sm">Delete</button>
        </div>
      </div>
    `).join('');
  },

  async filterTodos(filter) {
    this._todoFilter = filter;

    // Update button styles
    document.querySelectorAll('.todo-filter').forEach(btn => {
      if (btn.dataset.filter === filter) {
        btn.classList.remove('bg-gray-100', 'text-gray-600');
        btn.classList.add('bg-blue-100', 'text-blue-700');
      } else {
        btn.classList.remove('bg-blue-100', 'text-blue-700');
        btn.classList.add('bg-gray-100', 'text-gray-600');
      }
    });

    let filtered = this._todos;
    if (filter === 'active') {
      filtered = this._todos.filter(t => !t.completed);
    } else if (filter === 'completed') {
      filtered = this._todos.filter(t => t.completed);
    }

    document.getElementById('todos-list').innerHTML = this.renderTodoRows(filtered);
  },

  async toggleTodo(id, completed) {
    await api.put(`/api/todos/${id}`, { completed });
    router.navigate('todos');
  },

  navigateToLinked(type, id) {
    if (type === 'contact') {
      router.navigate('contact-detail', { id });
    } else {
      router.navigate('company-detail', { id });
    }
  },

  async showAddTodoModal(linkedType = null, linkedId = null) {
    const companies = await api.get('/api/companies');
    const contacts = await api.get('/api/contacts');

    modal.show(`
      <h3 class="text-lg font-semibold mb-4">Add ToDo</h3>
      <form onsubmit="views.saveTodo(event)">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input type="text" id="todo-title" required
                 class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Link to *</label>
          <select id="todo-linked-type" onchange="views.updateLinkedOptions()"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="contact" ${linkedType === 'contact' ? 'selected' : ''}>Contact</option>
            <option value="company" ${linkedType === 'company' ? 'selected' : ''}>Company</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Select *</label>
          <select id="todo-linked-id" required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            ${linkedType === 'company' ?
              companies.map(c => `<option value="${c.id}" ${c.id === linkedId ? 'selected' : ''}>${this.escapeHtml(c.name)}</option>`).join('') :
              contacts.map(c => `<option value="${c.id}" ${c.id === linkedId ? 'selected' : ''}>${this.escapeHtml(c.name)} @ ${this.escapeHtml(c.companyName)}</option>`).join('')
            }
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input type="datetime-local" id="todo-due-date" value="${new Date().toISOString().slice(0, 16)}"
                 class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea id="todo-description" rows="3" placeholder="Additional details..."
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
        </div>

        <div class="flex justify-end gap-2">
          <button type="button" onclick="modal.hide()" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
          <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save</button>
        </div>
      </form>
    `);

    // Store data for updateLinkedOptions
    this._modalCompanies = companies;
    this._modalContacts = contacts;
  },

  updateLinkedOptions() {
    const type = document.getElementById('todo-linked-type').value;
    const select = document.getElementById('todo-linked-id');

    if (type === 'company') {
      select.innerHTML = this._modalCompanies.map(c =>
        `<option value="${c.id}">${this.escapeHtml(c.name)}</option>`
      ).join('');
    } else {
      select.innerHTML = this._modalContacts.map(c =>
        `<option value="${c.id}">${this.escapeHtml(c.name)} @ ${this.escapeHtml(c.companyName)}</option>`
      ).join('');
    }
  },

  async saveTodo(event) {
    event.preventDefault();

    const dueDateInput = document.getElementById('todo-due-date').value;
    const data = {
      title: document.getElementById('todo-title').value,
      description: document.getElementById('todo-description').value,
      dueDate: dueDateInput ? new Date(dueDateInput).toISOString() : new Date().toISOString(),
      linkedType: document.getElementById('todo-linked-type').value,
      linkedId: document.getElementById('todo-linked-id').value
    };

    await api.post('/api/todos', data);
    modal.hide();
    router.navigate('todos');
  },

  async editTodo(id) {
    const todo = this._todos.find(t => t.id === id);
    if (!todo) return;

    const dueDateValue = todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 16) : '';

    modal.show(`
      <h3 class="text-lg font-semibold mb-4">Edit ToDo</h3>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input type="text" id="edit-todo-title" value="${this.escapeHtml(todo.title)}"
               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
      </div>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
        <input type="datetime-local" id="edit-todo-due-date" value="${dueDateValue}"
               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
      </div>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea id="edit-todo-description" rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">${this.escapeHtml(todo.description || '')}</textarea>
      </div>
      <div class="flex justify-end gap-2">
        <button onclick="modal.hide()" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
        <button onclick="views.updateTodo('${id}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save</button>
      </div>
    `);
  },

  async updateTodo(id) {
    const title = document.getElementById('edit-todo-title').value.trim();
    if (!title) return;

    const dueDateInput = document.getElementById('edit-todo-due-date').value;
    const data = {
      title,
      description: document.getElementById('edit-todo-description').value,
      dueDate: dueDateInput ? new Date(dueDateInput).toISOString() : null
    };

    await api.put(`/api/todos/${id}`, data);
    modal.hide();
    router.navigate('todos');
  },

  async deleteTodo(id) {
    if (!confirm('Delete this ToDo?')) return;
    await api.delete(`/api/todos/${id}`);
    router.navigate('todos');
  },


  async toggleTodoInline(todoId, completed, linkedType, linkedId) {
    await api.put(`/api/todos/${todoId}`, { completed });
    if (linkedType === 'contact') {
      router.navigate('contact-detail', { id: linkedId });
    } else {
      router.navigate('company-detail', { id: linkedId });
    }
  },

  async editTodoInline(todoId, linkedType, linkedId) {
    const todos = linkedType === 'contact' ? this._currentTodos : this._companyTodos;
    const todo = todos?.find(t => t.id === todoId);
    if (!todo) return;

    const dueDateValue = todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 16) : '';

    modal.show(`
      <h3 class="text-lg font-semibold mb-4">Edit ToDo</h3>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input type="text" id="edit-todo-title" value="${this.escapeHtml(todo.title)}"
               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
      </div>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
        <input type="datetime-local" id="edit-todo-due-date" value="${dueDateValue}"
               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
      </div>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea id="edit-todo-description" rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">${this.escapeHtml(todo.description || '')}</textarea>
      </div>
      <div class="flex justify-end gap-2">
        <button onclick="modal.hide()" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
        <button onclick="views.updateTodoInline('${todoId}', '${linkedType}', '${linkedId}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save</button>
      </div>
    `);
  },

  async updateTodoInline(todoId, linkedType, linkedId) {
    const title = document.getElementById('edit-todo-title').value.trim();
    if (!title) return;

    const dueDateInput = document.getElementById('edit-todo-due-date').value;
    const data = {
      title,
      description: document.getElementById('edit-todo-description').value,
      dueDate: dueDateInput ? new Date(dueDateInput).toISOString() : null
    };

    await api.put(`/api/todos/${todoId}`, data);
    modal.hide();
    if (linkedType === 'contact') {
      router.navigate('contact-detail', { id: linkedId });
    } else {
      router.navigate('company-detail', { id: linkedId });
    }
  },

  async deleteTodoInline(todoId, linkedType, linkedId) {
    if (!confirm('Delete this ToDo?')) return;
    await api.delete(`/api/todos/${todoId}`);
    if (linkedType === 'contact') {
      router.navigate('contact-detail', { id: linkedId });
    } else {
      router.navigate('company-detail', { id: linkedId });
    }
  },

  // ============ Candidate Views ============

  // Candidate List View
  async candidateList(container) {
    const candidates = await api.get('/api/candidates');

    container.innerHTML = `
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Candidates</h2>
          <p class="text-gray-600">${candidates.length} candidates</p>
        </div>
        <button onclick="router.navigate('candidate-form')"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          Add Candidate
        </button>
      </div>

      <div class="mb-4">
        <input type="text" id="candidate-search-input" placeholder="Search candidates (name, email, role, skills)..."
               class="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               oninput="views.filterCandidates()">
      </div>

      <div class="bg-white shadow-sm rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onclick="views.sortCandidates('name')">
                Name <span id="sort-candidate-name" class="text-blue-600"></span>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onclick="views.sortCandidates('role')">
                Role <span id="sort-candidate-role"></span>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onclick="views.sortCandidates('skills')">
                Skills <span id="sort-candidate-skills"></span>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resume
              </th>
            </tr>
          </thead>
          <tbody id="candidates-table" class="bg-white divide-y divide-gray-200">
            ${this.renderCandidateRows(candidates)}
          </tbody>
        </table>
      </div>
    `;

    this._candidates = candidates;
    this._candidateSort = 'name';
    this._candidateSortAsc = true;
    document.getElementById('sort-candidate-name').textContent = '↑';
  },

  renderCandidateRows(candidates) {
    if (candidates.length === 0) {
      return `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">No candidates found</td></tr>`;
    }
    return candidates.map(c => `
      <tr class="hover:bg-gray-50 cursor-pointer" onclick="router.navigate('candidate-detail', {id: '${c.id}'})">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="font-medium text-gray-900">${this.escapeHtml(c.name)}</div>
          ${c.email ? `<div class="text-sm text-gray-500">${this.escapeHtml(c.email)}</div>` : ''}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-gray-600">${this.escapeHtml(c.role || '-')}</td>
        <td class="px-6 py-4 text-gray-600">${this.escapeHtml(c.skills || '-')}</td>
        <td class="px-6 py-4 whitespace-nowrap text-gray-500">
          ${c.resumeFilename ? '<span class="text-green-600">Uploaded</span>' : '-'}
        </td>
      </tr>
    `).join('');
  },

  filterCandidates() {
    const query = document.getElementById('candidate-search-input').value.toLowerCase();
    const filtered = this._candidates.filter(c =>
      c.name.toLowerCase().includes(query) ||
      (c.email || '').toLowerCase().includes(query) ||
      (c.phone || '').toLowerCase().includes(query) ||
      (c.role || '').toLowerCase().includes(query) ||
      (c.skills || '').toLowerCase().includes(query)
    );
    document.getElementById('candidates-table').innerHTML = this.renderCandidateRows(filtered);
  },

  sortCandidates(field) {
    if (this._candidateSort === field) {
      this._candidateSortAsc = !this._candidateSortAsc;
    } else {
      this._candidateSort = field;
      this._candidateSortAsc = true;
    }

    // Clear sort indicators
    ['name', 'role', 'skills'].forEach(f => {
      document.getElementById(`sort-candidate-${f}`).textContent = '';
    });

    const sorted = [...this._candidates].sort((a, b) => {
      let result;
      switch (field) {
        case 'role':
          result = (a.role || '').localeCompare(b.role || '');
          break;
        case 'skills':
          result = (a.skills || '').localeCompare(b.skills || '');
          break;
        default:
          result = (a.name || '').localeCompare(b.name || '');
      }
      return this._candidateSortAsc ? result : -result;
    });

    document.getElementById(`sort-candidate-${field}`).textContent = this._candidateSortAsc ? '↑' : '↓';
    document.getElementById('candidates-table').innerHTML = this.renderCandidateRows(sorted);
  },

  // Candidate Detail View
  async candidateDetail(container, id) {
    const candidate = await api.get(`/api/candidates/${id}`);

    container.innerHTML = `
      <div class="mb-6">
        <a href="#" onclick="router.navigate('candidates'); return false;" class="text-blue-600 hover:text-blue-800">
          ← Back to Candidates
        </a>
      </div>

      <div class="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">${this.escapeHtml(candidate.name)}</h2>
            ${candidate.role ? `<p class="text-gray-600">${this.escapeHtml(candidate.role)}</p>` : ''}
          </div>
          <div class="flex gap-2">
            <button onclick="router.navigate('candidate-form', {id: '${candidate.id}'})"
                    class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition">
              Edit
            </button>
            <button onclick="views.deleteCandidate('${candidate.id}')"
                    class="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition">
              Delete
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          ${candidate.email ? `<div><span class="text-gray-500">Email:</span> <a href="mailto:${this.escapeHtml(candidate.email)}" class="text-blue-600">${this.escapeHtml(candidate.email)}</a></div>` : ''}
          ${candidate.phone ? `<div><span class="text-gray-500">Phone:</span> ${this.escapeHtml(candidate.phone)}</div>` : ''}
        </div>

        ${candidate.skills ? `
          <div class="mt-4 pt-4 border-t border-gray-200">
            <h3 class="text-sm font-medium text-gray-500 mb-2">Skills</h3>
            <p class="text-gray-700">${this.escapeHtml(candidate.skills)}</p>
          </div>
        ` : ''}

        ${candidate.resumeFilename ? `
          <div class="mt-4 pt-4 border-t border-gray-200">
            <h3 class="text-sm font-medium text-gray-500 mb-2">Resume</h3>
            <a href="/api/candidates/${candidate.id}/resume"
               class="inline-flex items-center text-blue-600 hover:text-blue-800"
               download>
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              ${this.escapeHtml(candidate.resumeOriginalName)}
            </a>
          </div>
        ` : ''}
      </div>

      <div class="bg-white shadow-sm rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Comments</h3>

        <form onsubmit="views.addCandidateComment(event, '${candidate.id}')" class="mb-6">
          <textarea id="new-candidate-comment" rows="3" placeholder="Add a comment..."
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
          <div class="mt-2">
            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              Add Comment
            </button>
          </div>
        </form>

        <div id="candidate-comments-list" class="space-y-4">
          ${this.renderCandidateComments(candidate.comments, candidate.id)}
        </div>
      </div>
    `;

    this._currentCandidate = candidate;
  },

  renderCandidateComments(comments, candidateId) {
    if (!comments || comments.length === 0) {
      return '<p class="text-gray-500">No comments yet</p>';
    }

    return comments.map(comment => `
      <div class="border-l-4 border-purple-200 pl-4 py-2" data-comment-id="${comment.id}">
        <div class="flex justify-between items-start">
          <p class="text-gray-700 whitespace-pre-wrap">${this.escapeHtml(comment.content)}</p>
          <div class="flex gap-2 ml-4">
            <button onclick="views.editCandidateComment('${candidateId}', '${comment.id}')" class="text-gray-400 hover:text-gray-600 text-sm">Edit</button>
            <button onclick="views.deleteCandidateComment('${candidateId}', '${comment.id}')" class="text-red-400 hover:text-red-600 text-sm">Delete</button>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-1">${formatDateTime(comment.createdAt)}</p>
      </div>
    `).join('');
  },

  async addCandidateComment(event, candidateId) {
    event.preventDefault();
    const content = document.getElementById('new-candidate-comment').value.trim();
    if (!content) return;

    await api.post(`/api/candidates/${candidateId}/comments`, { content });
    router.navigate('candidate-detail', { id: candidateId });
  },

  async editCandidateComment(candidateId, commentId) {
    const comment = this._currentCandidate.comments.find(c => c.id === commentId);
    if (!comment) return;

    modal.show(`
      <h3 class="text-lg font-semibold mb-4">Edit Comment</h3>
      <textarea id="edit-candidate-comment-content" rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-lg">${this.escapeHtml(comment.content)}</textarea>
      <div class="flex justify-end gap-2 mt-4">
        <button onclick="modal.hide()" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
        <button onclick="views.saveCandidateComment('${candidateId}', '${commentId}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save</button>
      </div>
    `);
  },

  async saveCandidateComment(candidateId, commentId) {
    const content = document.getElementById('edit-candidate-comment-content').value.trim();
    if (!content) return;

    await api.put(`/api/candidates/${candidateId}/comments/${commentId}`, { content });
    modal.hide();
    router.navigate('candidate-detail', { id: candidateId });
  },

  async deleteCandidateComment(candidateId, commentId) {
    if (!confirm('Delete this comment?')) return;
    await api.delete(`/api/candidates/${candidateId}/comments/${commentId}`);
    router.navigate('candidate-detail', { id: candidateId });
  },

  async deleteCandidate(id) {
    if (!confirm('Delete this candidate?')) return;
    await api.delete(`/api/candidates/${id}`);
    router.navigate('candidates');
  },

  // Candidate Form View
  async candidateForm(container, id) {
    let candidate = { name: '', email: '', phone: '', role: '', skills: '', resumeOriginalName: '' };

    if (id) {
      candidate = await api.get(`/api/candidates/${id}`);
    }

    container.innerHTML = `
      <div class="mb-6">
        <a href="#" onclick="router.navigate('candidates'); return false;" class="text-blue-600 hover:text-blue-800">
          ← Back to Candidates
        </a>
      </div>

      <div class="bg-white shadow-sm rounded-lg p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">${id ? 'Edit Candidate' : 'New Candidate'}</h2>

        <form id="candidate-form" onsubmit="views.saveCandidate(event, '${id || ''}')" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" id="candidate-name" value="${this.escapeHtml(candidate.name)}" required
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" id="candidate-email" value="${this.escapeHtml(candidate.email || '')}"
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" id="candidate-phone" value="${this.escapeHtml(candidate.phone || '')}"
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input type="text" id="candidate-role" value="${this.escapeHtml(candidate.role || '')}"
                   placeholder="e.g., Senior Developer, Product Manager"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Skills</label>
            <input type="text" id="candidate-skills" value="${this.escapeHtml(candidate.skills || '')}"
                   placeholder="e.g., JavaScript, React, Node.js, PostgreSQL"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Resume (PDF, DOC, DOCX - max 10MB)</label>
            ${candidate.resumeOriginalName ? `
              <p class="text-sm text-gray-500 mb-2">Current: ${this.escapeHtml(candidate.resumeOriginalName)}</p>
            ` : ''}
            <input type="file" id="candidate-resume" accept=".pdf,.doc,.docx"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <div class="flex justify-end gap-4 pt-4">
            <button type="button" onclick="router.navigate('candidates')"
                    class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit"
                    class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">Save</button>
          </div>
        </form>
      </div>
    `;
  },

  async saveCandidate(event, id) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('candidate-name').value);
    formData.append('email', document.getElementById('candidate-email').value);
    formData.append('phone', document.getElementById('candidate-phone').value);
    formData.append('role', document.getElementById('candidate-role').value);
    formData.append('skills', document.getElementById('candidate-skills').value);

    const resumeFile = document.getElementById('candidate-resume').files[0];
    if (resumeFile) {
      formData.append('resume', resumeFile);
    }

    try {
      let response;
      if (id) {
        response = await fetch(`/api/candidates/${id}`, {
          method: 'PUT',
          body: formData
        });
      } else {
        response = await fetch('/api/candidates', {
          method: 'POST',
          body: formData
        });
      }

      if (response.status === 401) {
        auth.showLoginModal();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save candidate');
      }

      const candidate = await response.json();
      router.navigate('candidate-detail', { id: candidate.id });
    } catch (err) {
      if (err.message !== 'Authentication required') {
        alert('Error: ' + err.message);
      }
    }
  },

  // Utility
  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }
};

// Initialize app - check auth first
document.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await auth.checkAuth();
  if (isAuthenticated) {
    router.navigate('contacts');
  }
});
