// API helper functions
const api = {
  async get(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async put(url, data) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async delete(url) {
    const res = await fetch(url, { method: 'DELETE' });
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
      if (route === this.currentRoute?.route ||
          (route === 'contacts' && this.currentRoute?.route?.startsWith('contact'))) {
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
        default:
          await views.contactList(app);
      }
    } catch (err) {
      app.innerHTML = `<div class="text-red-600">Error: ${err.message}</div>`;
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
    const contact = await api.get(`/api/contacts/${id}`);

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
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Notes</h3>

        <form onsubmit="views.addNote(event, '${contact.id}')" class="mb-6">
          <textarea id="new-note" rows="3" placeholder="Add a note..."
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
          <button type="submit" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            Add Note
          </button>
        </form>

        <div id="notes-list" class="space-y-4">
          ${this.renderNotes(contact.notes, contact.id)}
        </div>
      </div>
    `;

    this._currentContact = contact;
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

  async addNote(event, contactId) {
    event.preventDefault();
    const content = document.getElementById('new-note').value.trim();
    if (!content) return;

    await api.post(`/api/contacts/${contactId}/notes`, { content });
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
    const company = await api.get(`/api/companies/${id}`);

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

      <div class="bg-white shadow-sm rounded-lg p-6">
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
    `;
  },

  async deleteCompany(id) {
    if (!confirm('Delete this company and all its contacts?')) return;
    await api.delete(`/api/companies/${id}`);
    router.navigate('companies');
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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  router.navigate('contacts');
});
