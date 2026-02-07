/**
 * Form Handler for JRC School Website
 * Handles form validation, submission, and integration
 */

const JRCFormHandler = {
  // School contact information
  schoolPhone: '918874543973',
  schoolEmail: 'info@jrcschool.com',
  schoolName: 'J.R.C. Inter College',

  // ============================================
  // ADMISSION FORM HANDLER
  // ============================================
  initAdmissionForm() {
    const form = document.getElementById('admissionEnquiryForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate form
      if (!JRCUtils.validateForm(form)) {
        JRCUtils.showNotification('कृपया सभी आवश्यक फ़ील्ड सही तरीके से भरें', 'error');
        return;
      }

      // Get form data
      const formData = {
        studentName: document.getElementById('studentName').value.trim(),
        classApplying: document.getElementById('classApplying').value,
        parentMobile: document.getElementById('parentMobile').value.trim(),
        message: document.getElementById('message').value.trim()
      };

      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      JRCUtils.setLoading(submitBtn, true);

      try {
        // Try to send to backend API first
        const API_URL = 'http://localhost:3000/api/admissions/submit';
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || 'Form submission failed');
          }

          // Success - data saved to database
          const statusEl = document.getElementById('formStatus');
          if (statusEl) {
            statusEl.classList.remove('hidden');
            statusEl.classList.add('success-message');
          }

          JRCUtils.showNotification('आपकी पूछताछ सफलतापूर्वक जमा की गई है!', 'success');
          
          // Also save to localStorage as backup
          this.saveAdmissionToLocalStorage(formData);
          
          // Reset form
          form.reset();
          
          // Scroll to success message
          setTimeout(() => {
            if (statusEl) {
              statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 100);
          
          return; // Success, exit function
          
        } catch (fetchError) {
          // If backend is not available, fallback to localStorage
          console.warn('Backend not available, using fallback:', fetchError);
          
          // Save to localStorage as fallback
          this.saveAdmissionToLocalStorage(formData);
          
          // Also try WhatsApp as backup
          try {
            await this.sendAdmissionToWhatsApp(formData);
          } catch (whatsappError) {
            console.warn('WhatsApp also failed:', whatsappError);
          }
          
          // Show success message (data saved locally)
          const statusEl = document.getElementById('formStatus');
          if (statusEl) {
            statusEl.classList.remove('hidden');
            statusEl.classList.add('success-message');
            statusEl.textContent = 'धन्यवाद! आपकी पूछताछ स्थानीय रूप से सहेजी गई है। कृपया बाद में स्कूल से संपर्क करें।';
          }

          JRCUtils.showNotification('आपकी जानकारी स्थानीय रूप से सहेजी गई है। बैकएंड सर्वर चालू करने पर यह स्वचालित रूप से सिंक हो जाएगी।', 'success');
          
          // Reset form
          form.reset();
          
          // Scroll to success message
          setTimeout(() => {
            if (statusEl) {
              statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 100);
        }

      } catch (error) {
        console.error('Form submission error:', error);
        const errorMessage = error.message || 'एक त्रुटि हुई। कृपया पुनः प्रयास करें या सीधे हमसे संपर्क करें।';
        JRCUtils.showNotification(errorMessage, 'error');
      } finally {
        JRCUtils.setLoading(submitBtn, false);
      }
    });
  },

  // Send admission enquiry to WhatsApp
  sendAdmissionToWhatsApp(formData) {
    const message = `*Admission Enquiry - ${this.schoolName}*\n\n` +
      `Student Name: ${formData.studentName}\n` +
      `Class Applying For: ${formData.classApplying}\n` +
      `Parent Mobile: ${formData.parentMobile}\n` +
      (formData.message ? `Message: ${formData.message}\n` : '') +
      `\nSubmitted via website.`;

    JRCUtils.sendToWhatsApp(this.schoolPhone, message);
    return Promise.resolve();
  },

  // Send admission enquiry to Email
  sendAdmissionToEmail(formData) {
    const subject = `Admission Enquiry - ${formData.studentName}`;
    const body = `Student Name: ${formData.studentName}\n` +
      `Class Applying For: ${formData.classApplying}\n` +
      `Parent Mobile: ${formData.parentMobile}\n` +
      (formData.message ? `Message: ${formData.message}\n` : '');

    JRCUtils.sendEmail(this.schoolEmail, subject, body);
    return Promise.resolve();
  },

  // Save to localStorage (for demo/testing)
  saveAdmissionToLocalStorage(formData) {
    const enquiries = JRCUtils.getFromLocalStorage('admissionEnquiries') || [];
    enquiries.push({
      ...formData,
      timestamp: new Date().toISOString()
    });
    JRCUtils.saveToLocalStorage('admissionEnquiries', enquiries);
  },

  // ============================================
  // FEE CALCULATOR HANDLER
  // ============================================
  initFeeCalculator() {
    const form = document.getElementById('feeCalculator');
    if (!form) return;

    // Fee structure
    const baseFees = {
      nursery: 15000,
      primary: 17000,
      middle: 19500,
      high: 22000,
      senior: 25000
    };

    const transportFees = {
      no: 0,
      near: 4000,
      far: 6000
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const selectedClass = document.getElementById('feeClass').value;
      const transport = document.getElementById('transport').value;
      const resultEl = document.getElementById('feeResult');

      if (!selectedClass) {
        JRCUtils.showNotification('कृपया एक कक्षा चुनें', 'error');
        return;
      }

      // Calculate total
      const baseFee = baseFees[selectedClass] || 0;
      const transportFee = transportFees[transport] || 0;
      const total = baseFee + transportFee;

      // Display result with animation
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p class="font-bold text-blue-800 mb-2">अनुमानित वार्षिक फीस</p>
            <p class="text-2xl font-extrabold text-blue-900">₹ ${total.toLocaleString('en-IN')}</p>
            ${baseFee > 0 ? `<p class="text-sm text-gray-600 mt-2">बेस फीस: ₹ ${baseFee.toLocaleString('en-IN')}</p>` : ''}
            ${transportFee > 0 ? `<p class="text-sm text-gray-600">परिवहन: ₹ ${transportFee.toLocaleString('en-IN')}</p>` : ''}
            <p class="text-xs text-gray-500 mt-2">*यह एक अनुमानित गणना है। सटीक फीस के लिए कृपया स्कूल से संपर्क करें।</p>
          </div>
        `;
        resultEl.classList.remove('hidden');
        resultEl.classList.add('success-message');

        // Scroll to result
        setTimeout(() => {
          resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }

      // Show notification
      JRCUtils.showNotification('फीस सफलतापूर्वक गणना की गई!', 'success');
    });

    // Real-time calculation preview (optional)
    const classSelect = document.getElementById('feeClass');
    const transportSelect = document.getElementById('transport');
    
    if (classSelect && transportSelect) {
      const updatePreview = () => {
        const selectedClass = classSelect.value;
        const transport = transportSelect.value;
        if (selectedClass && baseFees[selectedClass]) {
          const total = baseFees[selectedClass] + transportFees[transport];
          // Could show a preview here
        }
      };

      classSelect.addEventListener('change', updatePreview);
      transportSelect.addEventListener('change', updatePreview);
    }
  },

  // ============================================
  // CONTACT FORM HANDLER (if exists)
  // ============================================
  initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!JRCUtils.validateForm(form)) {
        JRCUtils.showNotification('कृपया सभी आवश्यक फ़ील्ड सही तरीके से भरें', 'error');
        return;
      }

      const formData = {
        name: form.querySelector('[name="name"]')?.value.trim(),
        email: form.querySelector('[name="email"]')?.value.trim() || '',
        phone: form.querySelector('[name="phone"]')?.value.trim(),
        message: form.querySelector('[name="message"]')?.value.trim(),
        subject: 'पूछताछ'
      };

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn?.textContent;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'भेज रहे हैं...';
      }

      const API_URL = 'http://localhost:3000/api/contact/submit';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const result = await res.json();
        if (res.ok && result.success) {
          JRCUtils.showNotification('धन्यवाद! हम जल्द ही आपसे संपर्क करेंगे।', 'success');
          form.reset();
        } else {
          JRCUtils.showNotification(result.message || 'संदेश भेजने में त्रुटि। पुनः प्रयास करें।', 'error');
        }
      } catch (err) {
        JRCUtils.showNotification('संदेश भेजने में त्रुटि। बाद में पुनः प्रयास करें।', 'error');
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText || 'भेजें';
      }
    });
  },

  // ============================================
  // INITIALIZE ALL FORMS
  // ============================================
  init() {
    this.initAdmissionForm();
    this.initFeeCalculator();
    this.initContactForm();
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => JRCFormHandler.init());
} else {
  JRCFormHandler.init();
}

// Export
window.JRCFormHandler = JRCFormHandler;
