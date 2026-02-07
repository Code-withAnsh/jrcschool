/**
 * Student Panel - Register, Login, Dashboard (profile, result, fees)
 */

const API_BASE = 'http://localhost:3000';
const TOKEN_KEY = 'jrc_student_token';
const STUDENT_KEY = 'jrc_student_info';

const StudentPanel = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  },
  setStudentInfo(info) {
    if (info) localStorage.setItem(STUDENT_KEY, JSON.stringify(info));
    else localStorage.removeItem(STUDENT_KEY);
  },
  getStudentInfo() {
    try {
      const s = localStorage.getItem(STUDENT_KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  logout() {
    this.setToken(null);
    this.setStudentInfo(null);
  },

  showMessage(elId, text, isError) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    el.className = 'mt-4 text-center text-sm ' + (isError ? 'text-red-600' : 'text-green-600');
  },
  hideMessage(elId) {
    const el = document.getElementById(elId);
    if (el) el.classList.add('hidden');
  },

  async register() {
    const name = document.getElementById('regName').value.trim();
    const cls = document.getElementById('regClass').value;
    const rollNo = document.getElementById('regRollNo').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    this.hideMessage('formMessage');
    if (password !== confirmPassword) {
      this.showMessage('formMessage', 'पासवर्ड मेल नहीं खाते।', true);
      return;
    }
    if (password.length < 6) {
      this.showMessage('formMessage', 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए।', true);
      return;
    }
    try {
      const res = await fetch(API_BASE + '/api/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, class: cls, rollNo, password, confirmPassword })
      });
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
        this.setStudentInfo(data.student);
        this.showMessage('formMessage', 'खाता बन गया! डैशबोर्ड पर ले जा रहे हैं...', false);
        setTimeout(function() { window.location.href = 'student-panel.html'; }, 1000);
      } else {
        this.showMessage('formMessage', data.message || 'रजिस्ट्रेशन में त्रुटि।', true);
      }
    } catch (err) {
      this.showMessage('formMessage', 'सर्वर से कनेक्ट नहीं हो पाया। बाद में कोशिश करें।', true);
    }
  },

  async login() {
    const cls = document.getElementById('loginClass').value;
    const rollNo = document.getElementById('loginRollNo').value.trim();
    const password = document.getElementById('loginPassword').value;
    this.hideMessage('formMessage');
    try {
      const res = await fetch(API_BASE + '/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class: cls, rollNo, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
        this.setStudentInfo(data.student);
        this.showMessage('formMessage', 'लॉगिन सफल! डैशबोर्ड पर ले जा रहे हैं...', false);
        setTimeout(function() { window.location.href = 'student-panel.html'; }, 800);
      } else {
        this.showMessage('formMessage', data.message || 'गलत कक्षा/रोल नंबर या पासवर्ड।', true);
      }
    } catch (err) {
      this.showMessage('formMessage', 'सर्वर से कनेक्ट नहीं हो पाया। बाद में कोशिश करें।', true);
    }
  },

  async loadDashboard() {
    const token = this.getToken();
    if (!token) return;
    const info = this.getStudentInfo();
    if (info && info.name) {
      const nav = document.getElementById('studentNameNav');
      if (nav) nav.textContent = info.name + ' (कक्षा ' + info.class + ')';
    }
    const authHeader = { 'Authorization': 'Bearer ' + token };

    // Profile
    try {
      const profileRes = await fetch(API_BASE + '/api/student/me', { headers: authHeader });
      const profileJson = await profileRes.json();
      const profileEl = document.getElementById('profileContent');
      if (profileEl) {
        if (profileJson.success && profileJson.data) {
          const d = profileJson.data;
          const created = d.createdAt ? new Date(d.createdAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
          profileEl.innerHTML = '<p><span class="font-medium text-gray-500">नाम:</span> ' + this.escape(d.name) + '</p>' +
            '<p><span class="font-medium text-gray-500">कक्षा:</span> ' + this.escape(d.class) + '</p>' +
            '<p><span class="font-medium text-gray-500">रोल नंबर:</span> ' + this.escape(d.rollNo) + '</p>' +
            (created ? '<p><span class="font-medium text-gray-500">खाता बनाया:</span> ' + created + '</p>' : '');
        } else {
          profileEl.innerHTML = '<p class="text-red-600">प्रोफाइल लोड नहीं हो सका।</p>';
        }
      }
    } catch (e) {
      var profileEl = document.getElementById('profileContent');
      if (profileEl) profileEl.innerHTML = '<p class="text-red-600">सर्वर से कनेक्ट नहीं हो पाया।</p>';
    }

    // Results
    try {
      const resultRes = await fetch(API_BASE + '/api/student/result', { headers: authHeader });
      const resultJson = await resultRes.json();
      const resultEl = document.getElementById('resultContent');
      if (resultEl) {
        if (resultJson.success && resultJson.data && resultJson.data.length > 0) {
          resultEl.innerHTML = resultJson.data.map(function(r) {
            var subRows = (r.subjects && r.subjects.length) ? r.subjects.map(function(s) {
              return '<tr><td class="px-3 py-1">' + (s.name || '-') + '</td><td class="px-3 py-1">' + (s.obtainedMarks ?? '-') + '/' + (s.maxMarks ?? '-') + '</td></tr>';
            }).join('') : '';
            var subTable = subRows ? '<table class="min-w-full text-sm mt-2"><thead><tr class="border-b"><th class="px-3 py-1 text-left">विषय</th><th class="px-3 py-1 text-left">अंक</th></tr></thead><tbody>' + subRows + '</tbody></table>' : '';
            return '<div class="border rounded-lg p-4 bg-gray-50">' +
              '<h3 class="font-semibold text-blue-700">' + this.escape(r.examName || 'परीक्षा') + '</h3>' +
              (r.session ? '<p class="text-xs text-gray-500">सत्र: ' + this.escape(r.session) + '</p>' : '') +
              (r.percentage != null ? '<p class="mt-2">प्रतिशत: <strong>' + r.percentage + '%</strong></p>' : '') +
              (r.grade ? '<p>ग्रेड: <strong>' + this.escape(r.grade) + '</strong></p>' : '') +
              subTable +
              (r.remarks ? '<p class="text-sm text-gray-600 mt-2">' + this.escape(r.remarks) + '</p>' : '') +
              '</div>';
          }.bind(this)).join('');
        } else {
          resultEl.innerHTML = '<p class="text-gray-600">अभी कोई परिणाम उपलब्ध नहीं है। स्कूल द्वारा अपलोड किए जाने के बाद यहाँ दिखेंगे।</p>';
        }
      }
    } catch (e) {
      var resultEl = document.getElementById('resultContent');
      if (resultEl) resultEl.innerHTML = '<p class="text-red-600">परिणाम लोड नहीं हो सके।</p>';
    }

    // Fees
    try {
      const feesRes = await fetch(API_BASE + '/api/student/fees', { headers: authHeader });
      const feesJson = await feesRes.json();
      const feesEl = document.getElementById('feesContent');
      if (feesEl) {
        if (feesJson.success && feesJson.data && feesJson.data.length > 0) {
          var statusText = { pending: 'बाकी', partial: 'आंशिक', paid: 'भुगतान हो चुका' };
          feesEl.innerHTML = feesJson.data.map(function(f) {
            var status = statusText[f.status] || f.status;
            var due = f.dueDate ? new Date(f.dueDate).toLocaleDateString('hi-IN') : '-';
            return '<div class="border rounded-lg p-4 bg-gray-50 flex flex-wrap justify-between items-center gap-2">' +
              '<div><p class="font-medium">' + (f.description ? this.escape(f.description) : 'फीस') + '</p>' +
              '<p class="text-sm text-gray-600">कुल: ₹' + (f.amount || 0) + ' | दिया: ₹' + (f.paid || 0) + ' | बाकी: ₹' + ((f.amount || 0) - (f.paid || 0)) + '</p>' +
              (f.session ? '<p class="text-xs text-gray-500">सत्र: ' + this.escape(f.session) + '</p>' : '') + '</div>' +
              '<span class="px-3 py-1 rounded-full text-sm font-medium ' +
              (f.status === 'paid' ? 'bg-green-100 text-green-800' : f.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800') + '">' + status + '</span>' +
              '</div>';
          }.bind(this)).join('');
        } else {
          feesEl.innerHTML = '<p class="text-gray-600">अभी कोई फीस रिकॉर्ड उपलब्ध नहीं है। स्कूल द्वारा जोड़े जाने के बाद यहाँ दिखेगा।</p>';
        }
      }
    } catch (e) {
      var feesEl = document.getElementById('feesContent');
      if (feesEl) feesEl.innerHTML = '<p class="text-red-600">फीस लोड नहीं हो सके।</p>';
    }
  },

  escape(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Bind forms on student-login.html
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    StudentPanel.register();
  });
}
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    StudentPanel.login();
  });
}

window.StudentPanel = StudentPanel;
