/* ==========================================================================
   Mnet's World - Humanitarian Page JavaScript
   Fetches humanitarian entries from the API and renders a timeline.
   Falls back gracefully to placeholder content when the API is unavailable.
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     PLACEHOLDER / FALLBACK DATA
     ======================================================================== */

  var placeholderEntries = [
    {
      id: 1,
      title: 'Community Food Drive in Douala',
      location: 'Douala, Cameroon',
      date: '2025-12-15T10:00:00Z',
      description: 'We organized a food drive to support families in need during the holiday season. Over 200 meals were prepared and distributed to communities across Douala, bringing warmth and nourishment to those who needed it most.',
      cover_image: ''
    },
    {
      id: 2,
      title: 'School Supplies for Children',
      location: 'Yaounde, Cameroon',
      date: '2025-09-01T08:00:00Z',
      description: 'Back-to-school season is a time of hope. We partnered with local organizations to provide school supplies, books, and backpacks to children in underserved communities, helping them start the academic year with confidence.',
      cover_image: ''
    },
    {
      id: 3,
      title: 'Baking Workshop for Young Women',
      location: 'Bamenda, Cameroon',
      date: '2025-06-20T09:00:00Z',
      description: 'Empowering the next generation through skills training. We hosted a free baking workshop for young women, teaching them professional pastry techniques that can help them build their own businesses and secure their futures.',
      cover_image: ''
    },
    {
      id: 4,
      title: 'Clean Water Initiative',
      location: 'Buea, Cameroon',
      date: '2025-03-22T07:00:00Z',
      description: 'Access to clean water changes everything. We contributed to a clean water project in rural Buea, helping install a water filtration system that now serves over 500 community members daily.',
      cover_image: ''
    }
  ];

  /* ========================================================================
     SVG ICONS
     ======================================================================== */

  var SVG_HEART = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' +
  '</svg>';

  var SVG_MAP_PIN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>' +
    '<circle cx="12" cy="10" r="3"/>' +
  '</svg>';

  /* ========================================================================
     DOM REFERENCES
     ======================================================================== */

  var timelineContainer = document.getElementById('humanitarian-timeline');

  /* ========================================================================
     RENDER FUNCTIONS
     ======================================================================== */

  /**
   * Escape HTML special characters to prevent XSS.
   */
  function escapeHTML(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /**
   * Render a single timeline entry.
   */
  function createTimelineEntry(entry) {
    var imageHTML;
    var coverImg = entry.cover_image_url || entry.cover_image;
    if (coverImg) {
      imageHTML =
        '<div class="timeline-entry__image">' +
          '<img src="' + escapeHTML(coverImg) + '" ' +
               'alt="' + escapeHTML(entry.title) + '" ' +
               'loading="lazy" />' +
          (entry.location
            ? '<span class="timeline-entry__location">' +
                SVG_MAP_PIN + ' ' + escapeHTML(entry.location) +
              '</span>'
            : '') +
        '</div>';
    } else {
      imageHTML =
        '<div class="timeline-entry__image-placeholder">' +
          '<span class="timeline-entry__image-placeholder-icon" aria-hidden="true">' +
            SVG_HEART +
          '</span>' +
          '<span class="timeline-entry__image-placeholder-text">Mnet\'s World</span>' +
          (entry.location
            ? '<span class="timeline-entry__location" style="position:absolute;bottom:var(--space-3);left:var(--space-3);">' +
                SVG_MAP_PIN + ' ' + escapeHTML(entry.location) +
              '</span>'
            : '') +
        '</div>';
    }

    var dateStr = entry.date ? window.formatDate(entry.date) : '';
    var dateHTML = dateStr
      ? '<span class="timeline-entry__date">' + escapeHTML(dateStr) + '</span>'
      : '';

    var excerptHTML = entry.description
      ? '<p class="timeline-entry__excerpt">' + escapeHTML(entry.description) + '</p>'
      : '';

    return (
      '<div class="timeline-entry">' +
        '<div class="timeline-entry__dot" aria-hidden="true"></div>' +
        dateHTML +
        '<div class="timeline-entry__card">' +
          imageHTML +
          '<div class="timeline-entry__body">' +
            '<h3 class="timeline-entry__title">' + escapeHTML(entry.title) + '</h3>' +
            excerptHTML +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /**
   * Render all timeline entries.
   */
  function renderTimeline(entries) {
    if (!timelineContainer) return;

    if (!entries || entries.length === 0) {
      timelineContainer.innerHTML =
        '<div class="humanitarian-empty">' +
          '<div class="humanitarian-empty__icon" aria-hidden="true">' + SVG_HEART + '</div>' +
          '<h3 class="humanitarian-empty__title">More Coming Soon</h3>' +
          '<p class="humanitarian-empty__text">' +
            'We are always working on new ways to give back. Check back soon to see our latest humanitarian efforts.' +
          '</p>' +
          '<a href="/contact" class="btn btn-primary">Get Involved</a>' +
        '</div>';
      return;
    }

    var html = '';
    entries.forEach(function (entry) {
      html += createTimelineEntry(entry);
    });
    timelineContainer.innerHTML = html;
  }

  /**
   * Show skeleton loading placeholders.
   */
  function showSkeletons() {
    if (!timelineContainer) return;
    var html = '';
    for (var i = 0; i < 3; i++) {
      html +=
        '<div class="timeline-skeleton">' +
          '<div class="timeline-skeleton__card">' +
            '<div class="skeleton timeline-skeleton__image"></div>' +
            '<div class="timeline-skeleton__body">' +
              '<div class="skeleton skeleton--text" style="width:30%;"></div>' +
              '<div class="skeleton skeleton--title"></div>' +
              '<div class="skeleton skeleton--text"></div>' +
              '<div class="skeleton skeleton--text" style="width:70%;"></div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }
    timelineContainer.innerHTML = html;
  }

  /* ========================================================================
     DATA FETCHING
     ======================================================================== */

  async function loadHumanitarianEntries() {
    showSkeletons();

    try {
      var data = await window.api('humanitarian');
      var entries = data.entries || data.data || data;
      if (Array.isArray(entries) && entries.length > 0) {
        renderTimeline(entries);
      } else {
        renderTimeline(placeholderEntries);
      }
    } catch (err) {
      console.warn('Could not fetch humanitarian entries, using placeholders:', err.message);
      renderTimeline(placeholderEntries);
    }
  }

  /* ========================================================================
     INITIALIZATION
     ======================================================================== */

  document.addEventListener('DOMContentLoaded', function () {
    loadHumanitarianEntries();
  });

})();
