/* ==========================================================================
   Mnet's World - Blog Post Detail JavaScript
   Fetches a single blog post by slug, renders content, handles share buttons,
   redirects, related posts, and 404 state.
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     DOM REFERENCES
     ======================================================================== */

  var pageTitleEl   = document.getElementById('page-title');
  var ogTitleEl     = document.getElementById('og-title');
  var ogDescEl      = document.getElementById('og-description');
  var ogUrlEl       = document.getElementById('og-url');
  var ogImageEl     = document.getElementById('og-image');

  var coverEl       = document.getElementById('post-cover');
  var coverPlaceholder = document.getElementById('post-cover-placeholder');
  var articleEl     = document.getElementById('post-article');
  var metaEl        = document.getElementById('post-meta');
  var titleEl       = document.getElementById('post-title');
  var bodyEl        = document.getElementById('post-body');
  var shareEl       = document.getElementById('post-share');

  var notFoundEl    = document.getElementById('post-not-found');
  var relatedSection = document.getElementById('related-section');
  var relatedGrid   = document.getElementById('related-grid');

  var shareFacebook = document.getElementById('share-facebook');
  var shareWhatsApp = document.getElementById('share-whatsapp');
  var shareCopy     = document.getElementById('share-copy');

  /* ========================================================================
     SLUG EXTRACTION
     ======================================================================== */

  /**
   * Extract the blog post slug from the URL pathname.
   * Expected format: /blog/{slug} or /blog/{slug}/
   */
  function getSlugFromURL() {
    var path = window.location.pathname;

    // Remove trailing slash
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    // Match /blog/{slug}
    var match = path.match(/^\/blog\/(.+)$/);
    if (match) {
      return decodeURIComponent(match[1]);
    }

    // Fallback: check query param
    var params = new URLSearchParams(window.location.search);
    return params.get('slug') || '';
  }

  /* ========================================================================
     ESCAPE HELPER
     ======================================================================== */

  function escapeHTML(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ========================================================================
     RENDER FUNCTIONS
     ======================================================================== */

  /**
   * Render the full blog post.
   */
  function renderPost(post) {
    // Update page title
    var title = post.title || 'Blog Post';
    if (pageTitleEl) pageTitleEl.textContent = title + ' | Mnet\'s World';

    // Update OG tags
    if (ogTitleEl) ogTitleEl.setAttribute('content', title + ' | Mnet\'s World');
    if (ogDescEl) ogDescEl.setAttribute('content', post.excerpt || '');
    if (ogUrlEl) ogUrlEl.setAttribute('content', window.location.href);
    var postImg = post.cover_image_url || post.image_url;
    if (ogImageEl && postImg) ogImageEl.setAttribute('content', postImg);

    // Cover image
    if (coverEl) {
      if (postImg) {
        coverEl.innerHTML = '<img src="' + escapeHTML(postImg) + '" alt="' + escapeHTML(post.title) + '" />';
      }
      // Otherwise keep the placeholder
    }

    // Post meta
    if (metaEl) {
      var html = '';
      if (post.category) {
        html += '<span class="card-blog__category">' + escapeHTML(post.category) + '</span>';
      }
      if (post.published_at) {
        html += '<span class="post-meta__date">' + window.formatDate(post.published_at) + '</span>';
      }
      metaEl.innerHTML = html;
    }

    // Post title
    if (titleEl) {
      titleEl.textContent = post.title || '';
    }

    // Post body (rendered HTML from API)
    if (bodyEl) {
      if (post.content) {
        bodyEl.innerHTML = post.content;
      } else if (post.body) {
        bodyEl.innerHTML = post.body;
      } else {
        bodyEl.innerHTML = '<p>This post has no content yet.</p>';
      }
    }

    // Setup share buttons
    setupShareButtons(post);

    // Show share section
    if (shareEl) shareEl.style.display = 'block';
  }

  /**
   * Show the 404 not-found state.
   */
  function showNotFound() {
    if (articleEl) articleEl.style.display = 'none';
    if (coverEl) coverEl.style.display = 'none';
    if (notFoundEl) notFoundEl.style.display = 'flex';
    if (relatedSection) relatedSection.style.display = 'none';
  }

  /**
   * Setup share button URLs.
   */
  function setupShareButtons(post) {
    var pageURL = window.location.href;
    var title = post.title || 'Check out this post';

    // Facebook share
    if (shareFacebook) {
      shareFacebook.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(pageURL);
    }

    // WhatsApp share
    if (shareWhatsApp) {
      var waText = title + ' - ' + pageURL;
      shareWhatsApp.href = 'https://wa.me/?text=' + encodeURIComponent(waText);
    }

    // Copy to clipboard
    if (shareCopy) {
      shareCopy.addEventListener('click', function () {
        navigator.clipboard.writeText(pageURL).then(function () {
          shareCopy.classList.add('copied');
          var originalText = shareCopy.innerHTML;
          shareCopy.innerHTML =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<polyline points="20 6 9 17 4 12"/>' +
            '</svg> Copied!';
          setTimeout(function () {
            shareCopy.classList.remove('copied');
            shareCopy.innerHTML = originalText;
          }, 2000);
        }).catch(function () {
          // Fallback: use a prompt
          prompt('Copy this link:', pageURL);
        });
      });
    }
  }

  /**
   * Render related posts.
   */
  function renderRelatedPosts(posts) {
    if (!relatedGrid || !relatedSection) return;

    if (!posts || posts.length === 0) {
      relatedSection.style.display = 'none';
      return;
    }

    var html = '';
    posts.forEach(function (post) {
      html += window.createBlogCard(post);
    });
    relatedGrid.innerHTML = html;
    relatedSection.style.display = 'block';
  }

  /* ========================================================================
     DATA FETCHING
     ======================================================================== */

  /**
   * Fetch a single blog post by slug.
   */
  async function loadPost(slug) {
    try {
      var data = await window.api('blog/' + encodeURIComponent(slug));
      var post = data.post || data;

      if (!post || !post.title) {
        showNotFound();
        return null;
      }

      // Handle redirect_url
      if (post.redirect_url) {
        window.location.href = post.redirect_url;
        return null;
      }

      renderPost(post);
      return post;
    } catch (err) {
      console.warn('Could not fetch blog post:', err.message);
      showNotFound();
      return null;
    }
  }

  /**
   * Fetch related posts (same category).
   */
  async function loadRelatedPosts(category, excludeSlug) {
    if (!category) return;

    try {
      var path = 'blog?category=' + encodeURIComponent(category) + '&limit=4';
      var data = await window.api(path);
      var posts = data.posts || data.data || data;

      if (Array.isArray(posts)) {
        // Filter out the current post and take up to 3
        posts = posts.filter(function (p) {
          return p.slug !== excludeSlug;
        }).slice(0, 3);

        renderRelatedPosts(posts);
      }
    } catch (err) {
      console.warn('Could not fetch related posts:', err.message);
    }
  }

  /* ========================================================================
     INITIALIZATION
     ======================================================================== */

  document.addEventListener('DOMContentLoaded', async function () {
    var slug = getSlugFromURL();

    if (!slug) {
      showNotFound();
      return;
    }

    var post = await loadPost(slug);

    if (post) {
      loadRelatedPosts(post.category, slug);
    }
  });

})();
