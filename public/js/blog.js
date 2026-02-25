/* ==========================================================================
   Mnet's World - Blog Listing JavaScript
   Fetches blog posts from the API, renders cards, handles category filtering
   and pagination.
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     STATE
     ======================================================================== */

  var currentCategory = '';
  var currentPage     = 1;
  var totalPages      = 1;
  var postsPerPage    = 12;

  /* ========================================================================
     DOM REFERENCES
     ======================================================================== */

  var tabsContainer   = document.getElementById('blog-category-tabs');
  var gridContainer   = document.getElementById('blog-grid');
  var emptyState      = document.getElementById('blog-empty');
  var pagination      = document.getElementById('blog-pagination');
  var prevBtn         = document.getElementById('blog-prev');
  var nextBtn         = document.getElementById('blog-next');
  var pageInfo        = document.getElementById('blog-page-info');

  /* ========================================================================
     SKELETON LOADERS
     ======================================================================== */

  function showSkeletons() {
    if (!gridContainer) return;
    var html = '';
    for (var i = 0; i < 6; i++) {
      html +=
        '<div class="card card-blog blog-skeleton" style="pointer-events:none;">' +
          '<div class="skeleton skeleton--blog-image" style="aspect-ratio:16/10;width:100%;"></div>' +
          '<div class="card__body">' +
            '<div class="skeleton skeleton--text" style="width:30%;"></div>' +
            '<div class="skeleton skeleton--title"></div>' +
            '<div class="skeleton skeleton--text"></div>' +
            '<div class="skeleton skeleton--text" style="width:60%;"></div>' +
            '<div class="skeleton skeleton--text" style="width:25%; margin-top:var(--space-3);"></div>' +
          '</div>' +
        '</div>';
    }
    gridContainer.innerHTML = html;
    if (emptyState) emptyState.style.display = 'none';
    if (pagination) pagination.style.display = 'none';
  }

  /* ========================================================================
     RENDER FUNCTIONS
     ======================================================================== */

  /**
   * Render blog post cards.
   */
  function renderPosts(posts) {
    if (!gridContainer) return;

    if (!posts || posts.length === 0) {
      gridContainer.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (pagination) pagination.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    var html = '';
    posts.forEach(function (post) {
      html += window.createBlogCard(post);
    });
    gridContainer.innerHTML = html;
  }

  /**
   * Update pagination controls.
   */
  function renderPagination() {
    if (!pagination) return;

    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = 'flex';

    if (pageInfo) {
      pageInfo.textContent = 'Page ' + currentPage + ' of ' + totalPages;
    }

    if (prevBtn) {
      prevBtn.disabled = (currentPage <= 1);
    }

    if (nextBtn) {
      nextBtn.disabled = (currentPage >= totalPages);
    }
  }

  /**
   * Render category tabs with active state.
   */
  function renderTabs() {
    if (!tabsContainer) return;

    var blogCategories = ['Recipe', 'Lifestyle', 'Motivation', 'Wellness'];

    var html = '<button class="tab' + (currentCategory === '' ? ' active' : '') + '" data-category="" role="tab" aria-selected="' + (currentCategory === '' ? 'true' : 'false') + '">All</button>';

    blogCategories.forEach(function (cat) {
      var isActive = currentCategory === cat;
      html += '<button class="tab' + (isActive ? ' active' : '') + '" data-category="' + cat + '" role="tab" aria-selected="' + (isActive ? 'true' : 'false') + '">' + cat + '</button>';
    });

    tabsContainer.innerHTML = html;

    // Attach click handlers
    tabsContainer.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var cat = this.getAttribute('data-category') || '';
        if (cat !== currentCategory) {
          currentCategory = cat;
          currentPage = 1;
          updateURLParams();
          renderTabs();
          loadPosts();
        }
      });
    });
  }

  /* ========================================================================
     URL MANAGEMENT
     ======================================================================== */

  function getURLParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      category: params.get('category') || '',
      page: parseInt(params.get('page'), 10) || 1
    };
  }

  function updateURLParams() {
    var url = new URL(window.location);
    if (currentCategory) {
      url.searchParams.set('category', currentCategory);
    } else {
      url.searchParams.delete('category');
    }
    if (currentPage > 1) {
      url.searchParams.set('page', currentPage);
    } else {
      url.searchParams.delete('page');
    }
    window.history.replaceState({}, '', url);
  }

  /* ========================================================================
     DATA FETCHING
     ======================================================================== */

  /**
   * Fetch blog posts from API.
   */
  async function loadPosts() {
    showSkeletons();

    try {
      var path = 'blog?limit=' + postsPerPage + '&page=' + currentPage;
      if (currentCategory) {
        path += '&category=' + encodeURIComponent(currentCategory);
      }

      var data = await window.api(path);
      var posts = data.posts || data.data || data;
      var total = data.total || 0;
      var limit = data.limit || postsPerPage;

      if (Array.isArray(posts)) {
        // Calculate total pages
        if (total > 0) {
          totalPages = Math.ceil(total / limit);
        } else {
          totalPages = posts.length >= limit ? currentPage + 1 : currentPage;
        }

        renderPosts(posts);
        renderPagination();
      } else {
        renderPosts([]);
      }
    } catch (err) {
      console.warn('Could not fetch blog posts:', err.message);
      renderPosts([]);
    }

    // Scroll to top of content when paginating
    if (currentPage > 1) {
      var filtersEl = document.querySelector('.blog-filters');
      if (filtersEl) {
        filtersEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  /* ========================================================================
     PAGINATION EVENT HANDLERS
     ======================================================================== */

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      if (currentPage > 1) {
        currentPage--;
        updateURLParams();
        loadPosts();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (currentPage < totalPages) {
        currentPage++;
        updateURLParams();
        loadPosts();
      }
    });
  }

  /* ========================================================================
     INITIALIZATION
     ======================================================================== */

  document.addEventListener('DOMContentLoaded', function () {
    // Read from URL parameters
    var params = getURLParams();
    currentCategory = params.category;
    currentPage = params.page;

    // Render tabs and load posts
    renderTabs();
    loadPosts();
  });

})();
