/* ==========================================================================
   Mnet's World - Contact Page JavaScript
   Form validation, submission, and dynamic contact info loading.
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     DOM REFERENCES
     ======================================================================== */

  var form          = document.getElementById('contact-form');
  var nameInput     = document.getElementById('contact-name');
  var emailInput    = document.getElementById('contact-email');
  var subjectInput  = document.getElementById('contact-subject');
  var messageInput  = document.getElementById('contact-message');

  var nameError     = document.getElementById('contact-name-error');
  var emailError    = document.getElementById('contact-email-error');
  var messageError  = document.getElementById('contact-message-error');

  var successMsg    = document.getElementById('form-success');
  var errorMsg      = document.getElementById('form-error');
  var errorText     = document.getElementById('form-error-text');

  var submitBtn     = document.getElementById('contact-submit');
  var submitText    = submitBtn ? submitBtn.querySelector('.contact-form__submit-text') : null;
  var submitLoading = submitBtn ? submitBtn.querySelector('.contact-form__submit-loading') : null;

  // Contact info card elements
  var emailCard     = document.getElementById('contact-email-card');
  var emailValue    = document.getElementById('contact-email-value');
  var phoneCard     = document.getElementById('contact-phone-card');
  var phoneValue    = document.getElementById('contact-phone-value');
  var whatsappCard  = document.getElementById('contact-whatsapp-card');
  var whatsappValue = document.getElementById('contact-whatsapp-value');

  /* ========================================================================
     VALIDATION
     ======================================================================== */

  /**
   * Simple email regex validation.
   */
  function isValidEmail(email) {
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Clear all field-level errors.
   */
  function clearErrors() {
    if (nameError)    nameError.textContent = '';
    if (emailError)   emailError.textContent = '';
    if (messageError) messageError.textContent = '';

    if (nameInput)    nameInput.classList.remove('form-input--error');
    if (emailInput)   emailInput.classList.remove('form-input--error');
    if (messageInput) messageInput.classList.remove('form-input--error');
  }

  /**
   * Set a field-level error.
   */
  function setFieldError(input, errorEl, message) {
    if (errorEl) errorEl.textContent = message;
    if (input)   input.classList.add('form-input--error');
  }

  /**
   * Validate the form. Returns true if valid.
   */
  function validateForm() {
    clearErrors();
    var valid = true;

    // Name
    var name = (nameInput ? nameInput.value : '').trim();
    if (!name) {
      setFieldError(nameInput, nameError, 'Please enter your name.');
      valid = false;
    }

    // Email
    var email = (emailInput ? emailInput.value : '').trim();
    if (!email) {
      setFieldError(emailInput, emailError, 'Please enter your email address.');
      valid = false;
    } else if (!isValidEmail(email)) {
      setFieldError(emailInput, emailError, 'Please enter a valid email address.');
      valid = false;
    }

    // Message
    var message = (messageInput ? messageInput.value : '').trim();
    if (!message) {
      setFieldError(messageInput, messageError, 'Please enter your message.');
      valid = false;
    }

    return valid;
  }

  /* ========================================================================
     LOADING STATE
     ======================================================================== */

  function setLoading(loading) {
    if (!submitBtn) return;

    submitBtn.disabled = loading;

    if (submitText)    submitText.style.display = loading ? 'none' : '';
    if (submitLoading) submitLoading.style.display = loading ? 'inline-flex' : 'none';
  }

  /* ========================================================================
     STATUS MESSAGES
     ======================================================================== */

  function showSuccess() {
    if (successMsg) successMsg.style.display = 'flex';
    if (errorMsg)   errorMsg.style.display = 'none';
  }

  function showError(message) {
    if (errorMsg) {
      errorMsg.style.display = 'flex';
      if (errorText) {
        errorText.textContent = message || 'Something went wrong. Please try again.';
      }
    }
    if (successMsg) successMsg.style.display = 'none';
  }

  function hideMessages() {
    if (successMsg) successMsg.style.display = 'none';
    if (errorMsg)   errorMsg.style.display = 'none';
  }

  /* ========================================================================
     FORM SUBMISSION
     ======================================================================== */

  async function handleSubmit(e) {
    e.preventDefault();

    hideMessages();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    var payload = {
      name:    (nameInput    ? nameInput.value    : '').trim(),
      email:   (emailInput   ? emailInput.value   : '').trim(),
      subject: (subjectInput ? subjectInput.value : '').trim(),
      message: (messageInput ? messageInput.value : '').trim()
    };

    try {
      var resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        var data;
        try {
          data = await resp.json();
        } catch (_) {
          data = {};
        }
        throw new Error(data.error || data.message || 'Server error (' + resp.status + ')');
      }

      // Success
      showSuccess();
      form.reset();
      clearErrors();

    } catch (err) {
      console.error('Contact form submission failed:', err.message);
      showError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /* ========================================================================
     LOAD DYNAMIC CONTACT INFO
     ======================================================================== */

  /**
   * Fetch settings from the API and update contact info cards.
   */
  async function loadContactSettings() {
    try {
      var data = await window.api('settings');
      var settings = data.settings || data;

      // Update email
      if (settings.contact_email && emailCard && emailValue) {
        emailCard.href = 'mailto:' + settings.contact_email;
        emailValue.textContent = settings.contact_email;
      }

      // Update phone
      if (settings.contact_phone && phoneCard && phoneValue) {
        // Remove non-numeric chars for the href
        var phoneClean = settings.contact_phone.replace(/[^+\d]/g, '');
        phoneCard.href = 'tel:' + phoneClean;
        phoneValue.textContent = settings.contact_phone;
      }

      // Update WhatsApp
      if (settings.whatsapp_number && whatsappCard) {
        var waNumber = settings.whatsapp_number.replace(/[^+\d]/g, '');
        // Remove leading + for wa.me link
        if (waNumber.startsWith('+')) {
          waNumber = waNumber.substring(1);
        }
        whatsappCard.href = 'https://wa.me/' + waNumber;
        if (whatsappValue) {
          whatsappValue.textContent = 'Chat on WhatsApp';
        }
      }

    } catch (err) {
      // Settings are optional; fallback to hardcoded HTML content
      console.warn('Could not fetch contact settings, using defaults:', err.message);
    }
  }

  /* ========================================================================
     CLEAR ERRORS ON INPUT
     ======================================================================== */

  function addInputListeners() {
    if (nameInput) {
      nameInput.addEventListener('input', function () {
        if (nameError) nameError.textContent = '';
        nameInput.classList.remove('form-input--error');
      });
    }

    if (emailInput) {
      emailInput.addEventListener('input', function () {
        if (emailError) emailError.textContent = '';
        emailInput.classList.remove('form-input--error');
      });
    }

    if (messageInput) {
      messageInput.addEventListener('input', function () {
        if (messageError) messageError.textContent = '';
        messageInput.classList.remove('form-input--error');
      });
    }
  }

  /* ========================================================================
     INITIALIZATION
     ======================================================================== */

  document.addEventListener('DOMContentLoaded', function () {
    if (form) {
      form.addEventListener('submit', handleSubmit);
    }

    addInputListeners();
    loadContactSettings();
  });

})();
