/**
 * Admin Portal JavaScript
 * Manages admission enquiries viewing and status updates
 */

const AdminPortal = {
  API_URL: 'http://localhost:3000/api/admissions',
  NEWS_API_URL: 'http://localhost:3000/api/news',
  STUDENT_API_URL: 'http://localhost:3000/api/student',
  currentPage: 1,
  currentLimit: 20,
  currentStatus: '',
  currentSearch: '',

  init() {
    // Check authentication first
    if (typeof AdminAuth !== 'undefined' && !AdminAuth.requireAuth()) {
      return; // Will redirect to login
    }
    
    this.bindEvents();
    this.loadAdmissions();
    this.loadNews();
    this.loadStudentList();
  },

  bindEvents() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.loadAdmissions();
    });

    // Status filter
    document.getElementById('statusFilter').addEventListener('change', (e) => {
      this.currentStatus = e.target.value;
      this.currentPage = 1;
      this.loadAdmissions();
    });

    // Search input
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.currentSearch = e.target.value;
        this.currentPage = 1;
        this.loadAdmissions();
      }, 500);
    });

    // Clear filters
    document.getElementById('clearFilters').addEventListener('click', () => {
      document.getElementById('statusFilter').value = '';
      document.getElementById('searchInput').value = '';
      this.currentStatus = '';
      this.currentSearch = '';
      this.currentPage = 1;
      this.loadAdmissions();
    });

    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadAdmissions();
      }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
      this.currentPage++;
      this.loadAdmissions();
    });

    // Status modal
    document.getElementById('cancelStatus').addEventListener('click', () => {
      document.getElementById('statusModal').classList.add('hidden');
    });

    document.getElementById('statusForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.updateStatus();
    });

    // News
    document.getElementById('addNewsBtn').addEventListener('click', () => this.openNewsModal());
    document.getElementById('cancelNews').addEventListener('click', () => this.closeNewsModal());
    document.getElementById('newsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveNews();
    });
    document.getElementById('addResultForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addResult();
    });
    document.getElementById('addFeeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addFee();
    });
  },

  async loadAdmissions() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const tableBody = document.getElementById('admissionsTableBody');
    const noData = document.getElementById('noData');

    loadingIndicator.classList.remove('hidden');
    tableBody.innerHTML = '';
    noData.classList.add('hidden');

    try {
      let url = `${this.API_URL}?page=${this.currentPage}&limit=${this.currentLimit}`;
      if (this.currentStatus) {
        url += `&status=${this.currentStatus}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to load admissions');
      }

      loadingIndicator.classList.add('hidden');

      if (result.data && result.data.length > 0) {
        this.renderAdmissions(result.data);
        this.updateStats(result.data);
        this.renderPagination(result.pagination);
      } else {
        noData.classList.remove('hidden');
        this.updateStats([]);
      }
    } catch (error) {
      console.error('Error loading admissions:', error);
      loadingIndicator.classList.add('hidden');
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-4 text-center text-red-600">
            Error: ${error.message}. कृपया सुनिश्चित करें कि backend server चल रहा है।
          </td>
        </tr>
      `;
    }
  },

  renderAdmissions(admissions) {
    const tableBody = document.getElementById('admissionsTableBody');
    
    // Filter by search if needed
    let filteredAdmissions = admissions;
    if (this.currentSearch) {
      const searchLower = this.currentSearch.toLowerCase();
      filteredAdmissions = admissions.filter(admission => 
        admission.studentName.toLowerCase().includes(searchLower) ||
        admission.parentMobile.includes(searchLower)
      );
    }

    if (filteredAdmissions.length === 0) {
      document.getElementById('noData').classList.remove('hidden');
      return;
    }

    tableBody.innerHTML = filteredAdmissions.map(admission => {
      const date = new Date(admission.submittedAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${date}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${this.escapeHtml(admission.studentName)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${admission.classApplying}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <a href="tel:${admission.parentMobile}" class="text-blue-600 hover:underline">${admission.parentMobile}</a>
          </td>
          <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">${this.escapeHtml(admission.message || '-')}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="status-badge status-${admission.status}">${this.getStatusLabel(admission.status)}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="AdminPortal.openStatusModal('${admission._id}', '${admission.status}', '${this.escapeHtml(admission.notes || '')}')" 
                    class="text-blue-600 hover:text-blue-900 mr-2">
              Update
            </button>
            <button onclick="AdminPortal.viewDetails('${admission._id}')" 
                    class="text-green-600 hover:text-green-900 mr-2">
              View
            </button>
            <button onclick="AdminPortal.deleteAdmission('${admission._id}')" 
                    class="text-red-600 hover:text-red-900"
                    title="Delete this record">
              Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  updateStats(admissions) {
    const total = admissions.length;
    const pending = admissions.filter(a => a.status === 'pending').length;
    const contacted = admissions.filter(a => a.status === 'contacted').length;
    const admitted = admissions.filter(a => a.status === 'admitted').length;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('contactedCount').textContent = contacted;
    document.getElementById('admittedCount').textContent = admitted;
  },

  renderPagination(pagination) {
    const paginationEl = document.getElementById('pagination');
    if (pagination.pages <= 1) {
      paginationEl.classList.add('hidden');
      return;
    }

    paginationEl.classList.remove('hidden');
    document.getElementById('pageInfo').textContent = `Page ${pagination.page} of ${pagination.pages}`;
    document.getElementById('prevPage').disabled = pagination.page === 1;
    document.getElementById('nextPage').disabled = pagination.page === pagination.pages;
  },

  openStatusModal(id, currentStatus, currentNotes) {
    document.getElementById('admissionId').value = id;
    document.getElementById('statusSelect').value = currentStatus;
    document.getElementById('statusNotes').value = currentNotes.replace(/&#x27;/g, "'");
    document.getElementById('statusModal').classList.remove('hidden');
    document.getElementById('statusModal').classList.add('flex');
  },

  async updateStatus() {
    const id = document.getElementById('admissionId').value;
    const status = document.getElementById('statusSelect').value;
    const notes = document.getElementById('statusNotes').value;

    try {
      const response = await fetch(`${this.API_URL}/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, notes })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update status');
      }

      // Close modal and reload data
      document.getElementById('statusModal').classList.add('hidden');
      document.getElementById('statusModal').classList.remove('flex');
      this.loadAdmissions();

      alert('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error: ' + error.message);
    }
  },

  async deleteAdmission(id) {
    if (!confirm('Are you sure you want to delete this admission record? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${this.API_URL}/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete record');
      }

      this.loadAdmissions();
      alert('Admission record deleted successfully.');
    } catch (error) {
      console.error('Error deleting admission:', error);
      alert('Error: ' + error.message);
    }
  },

  async viewDetails(id) {
    try {
      const response = await fetch(`${this.API_URL}/${id}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to load details');
      }

      const admission = result.data;
      const details = `
Admission Details:
==================
Student Name: ${admission.studentName}
Class: ${admission.classApplying}
Mobile: ${admission.parentMobile}
Message: ${admission.message || 'N/A'}
Status: ${this.getStatusLabel(admission.status)}
Submitted: ${new Date(admission.submittedAt).toLocaleString('en-IN')}
${admission.contactedAt ? `Contacted: ${new Date(admission.contactedAt).toLocaleString('en-IN')}` : ''}
${admission.notes ? `Notes: ${admission.notes}` : ''}
      `;

      alert(details);
    } catch (error) {
      console.error('Error loading details:', error);
      alert('Error: ' + error.message);
    }
  },

  getStatusLabel(status) {
    const labels = {
      'pending': 'Pending',
      'contacted': 'Contacted',
      'admitted': 'Admitted',
      'rejected': 'Rejected'
    };
    return labels[status] || status;
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // ========== सूचनाएं (News) ==========
  async loadNews() {
    const container = document.getElementById('newsListContainer');
    if (!container) return;
    try {
      const res = await fetch(this.NEWS_API_URL + '/all');
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'सूचनाएं लोड नहीं हुईं');
      const list = json.data || [];
      const typeLabels = { notice: 'सूचना', holiday: 'छुट्टी', exam: 'परीक्षा', event: 'कार्यक्रम', general: 'सामान्य' };
      if (list.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">अभी कोई सूचना नहीं है। नई सूचना जोड़ें।</p>';
        return;
      }
      container.innerHTML = list.map(n => {
        const d = n.date ? new Date(n.date).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        const typeLabel = typeLabels[n.type] || n.type;
        const active = n.isActive !== false;
        return `<div class="bg-gray-50 rounded-lg p-4 flex flex-wrap items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <span class="text-xs font-medium text-blue-600">${typeLabel}</span>
            <h4 class="font-semibold text-gray-800">${this.escapeHtml(n.title)}</h4>
            <p class="text-sm text-gray-600 truncate">${this.escapeHtml(n.content)}</p>
            <p class="text-xs text-gray-500">${d} ${active ? '' : ' (निष्क्रिय)'}</p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="editNewsBtn px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700" data-id="${n._id}">संपादित</button>
            <button type="button" class="deleteNewsBtn px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700" data-id="${n._id}">हटाएं</button>
          </div>
        </div>`;
      }).join('');
      container.querySelectorAll('.editNewsBtn').forEach(btn => {
        btn.addEventListener('click', () => this.openNewsModal(btn.dataset.id));
      });
      container.querySelectorAll('.deleteNewsBtn').forEach(btn => {
        btn.addEventListener('click', () => this.deleteNews(btn.dataset.id));
      });
    } catch (err) {
      console.error('News load error:', err);
      container.innerHTML = '<p class="text-red-600 text-center py-4">सूचनाएं लोड नहीं हो सकीं।</p>';
    }
  },

  openNewsModal(id) {
    document.getElementById('newsModalTitle').textContent = id ? 'सूचना संपादित करें' : 'नई सूचना जोड़ें';
    document.getElementById('newsId').value = id || '';
    document.getElementById('newsTitle').value = '';
    document.getElementById('newsContent').value = '';
    document.getElementById('newsType').value = 'notice';
    if (id) {
      fetch(this.NEWS_API_URL + '/all')
        .then(r => r.json())
        .then(json => {
          const n = (json.data || []).find(x => x._id === id);
          if (n) {
            document.getElementById('newsTitle').value = n.title;
            document.getElementById('newsContent').value = n.content;
            document.getElementById('newsType').value = n.type || 'notice';
          }
        })
        .catch(() => {});
    }
    document.getElementById('newsModal').classList.remove('hidden');
    document.getElementById('newsModal').classList.add('flex');
  },

  closeNewsModal() {
    document.getElementById('newsModal').classList.add('hidden');
    document.getElementById('newsModal').classList.remove('flex');
  },

  async saveNews() {
    const id = document.getElementById('newsId').value;
    const title = document.getElementById('newsTitle').value.trim();
    const content = document.getElementById('newsContent').value.trim();
    const type = document.getElementById('newsType').value;
    if (!title || !content) {
      alert('शीर्षक और विषय भरें।');
      return;
    }
    try {
      const url = id ? `${this.NEWS_API_URL}/${id}` : this.NEWS_API_URL;
      const method = id ? 'PATCH' : 'POST';
      const body = id ? { title, content, type } : { title, content, type };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'सेव नहीं हो पाया');
      this.closeNewsModal();
      this.loadNews();
      alert(id ? 'सूचना अपडेट हो गई।' : 'सूचना जोड़ी गई।');
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  async deleteNews(id) {
    if (!confirm('क्या आप इस सूचना को हटाना चाहते हैं?')) return;
    try {
      const res = await fetch(`${this.NEWS_API_URL}/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'हटाया नहीं जा सका');
      this.loadNews();
      alert('सूचना हटाई गई।');
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  async loadStudentList() {
    const opts = [document.getElementById('resultStudentId'), document.getElementById('feeStudentId')];
    opts.forEach(el => { if (!el) return; while (el.options.length > 1) el.remove(1); });
    try {
      const res = await fetch(this.STUDENT_API_URL + '/list');
      const json = await res.json();
      if (!res.ok || !json.data) return;
      json.data.forEach(s => {
        const label = s.name + ' - कक्षा ' + s.class + ', रोल ' + s.rollNo;
        opts.forEach(sel => {
          if (!sel) return;
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = label;
          sel.appendChild(opt);
        });
      });
    } catch (err) {
      console.warn('Student list load failed:', err);
    }
  },

  async addResult() {
    const studentId = document.getElementById('resultStudentId').value;
    const examName = document.getElementById('resultExamName').value.trim();
    const session = document.getElementById('resultSession').value.trim();
    const totalMarks = document.getElementById('resultTotalMarks').value ? parseInt(document.getElementById('resultTotalMarks').value, 10) : undefined;
    const obtainedMarks = document.getElementById('resultObtainedMarks').value ? parseInt(document.getElementById('resultObtainedMarks').value, 10) : undefined;
    const percentage = document.getElementById('resultPercentage').value ? parseFloat(document.getElementById('resultPercentage').value) : undefined;
    const grade = document.getElementById('resultGrade').value.trim();
    const remarks = document.getElementById('resultRemarks').value.trim();
    if (!studentId || !examName) {
      alert('छात्र और परीक्षा का नाम भरें।');
      return;
    }
    try {
      const res = await fetch(this.STUDENT_API_URL + '/add-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, examName, session, totalMarks, obtainedMarks, percentage, grade, remarks })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'जोड़ नहीं सके');
      alert('परिणाम जोड़ा गया।');
      document.getElementById('addResultForm').reset();
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  async addFee() {
    const studentId = document.getElementById('feeStudentId').value;
    const amount = parseFloat(document.getElementById('feeAmount').value) || 0;
    const paid = parseFloat(document.getElementById('feePaid').value) || 0;
    const dueDate = document.getElementById('feeDueDate').value || undefined;
    const session = document.getElementById('feeSession').value.trim();
    const description = document.getElementById('feeDescription').value.trim() || 'फीस';
    if (!studentId || amount <= 0) {
      alert('छात्र चुनें और कुल राशि भरें।');
      return;
    }
    try {
      const res = await fetch(this.STUDENT_API_URL + '/add-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, amount, paid, dueDate, session, description })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'जोड़ नहीं सके');
      alert('फीस रिकॉर्ड जोड़ा गया।');
      document.getElementById('addFeeForm').reset();
      document.getElementById('feePaid').value = '0';
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AdminPortal.init());
} else {
  AdminPortal.init();
}

// Export
window.AdminPortal = AdminPortal;
