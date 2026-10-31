/**
 * Application Controller for Bill Watanabe's Personal Website
 * Manages Navigation, Story Reader, Dual-mode Photo Attachment, Story Studio, and Photo Vault.
 */

document.addEventListener('DOMContentLoaded', () => {
  const app = new WatanabeApp();
  window.appInstance = app;
});

class WatanabeApp {
  constructor() {
    this.storage = window.storyArchiveStorage;
    this.currentView = 'home';
    this.currentStoryId = null;
    this.activeFilter = 'All';

    // State for Story Studio
    this.studioDraft = {
      title: '',
      subtitle: '',
      category: 'Little Tokyo Chronicles',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      paragraphs: [''],
      sidePhotos: [], // { paragraphIndex, photoId, caption }
      appendixPhotos: [] // { photoId, caption, notes }
    };

    // State for Photo Selection modal
    this.pendingPhotoSelection = null; // { type: 'side' | 'appendix', paragraphIndex?: number }

    // State for Paginated Memoir Reader
    this.currentMemoirChapterIndex = parseInt(localStorage.getItem('bw_memoir_active_chapter') || '0', 10);
    this.memoirFontSize = 'normal'; // 'normal' | 'large' | 'xlarge'
    this.memoirViewMode = 'chapter'; // 'chapter' | 'continuous'
    this.memoirTocOpen = false;

    this.initDOM();
    this.bindEvents();
    this.renderCurrentView();
  }

  initDOM() {
    // Navigation elements
    this.navLinks = document.querySelectorAll('.nav-link');
    this.viewSections = document.querySelectorAll('.view-section');
    this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
    this.navLinksContainer = document.getElementById('navLinks');

    // Lightbox modal elements
    this.lightboxOverlay = document.getElementById('lightboxOverlay');
    this.lightboxImage = document.getElementById('lightboxImage');
    this.lightboxTitle = document.getElementById('lightboxTitle');
    this.lightboxCaption = document.getElementById('lightboxCaption');

    // Photo Upload modal elements
    this.uploadModal = document.getElementById('uploadModal');
    this.photoSelectModal = document.getElementById('photoSelectModal');

    // Toast element
    this.toastContainer = document.getElementById('toastContainer');
  }

  bindEvents() {
    // Top bar navigation links
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.getAttribute('data-view');
        this.navigateTo(targetView);
        if (this.navLinksContainer.classList.contains('mobile-open')) {
          this.navLinksContainer.classList.remove('mobile-open');
        }
      });
    });

    // Mobile menu toggle
    if (this.mobileMenuBtn) {
      this.mobileMenuBtn.addEventListener('click', () => {
        this.navLinksContainer.classList.toggle('mobile-open');
      });
    }

    // Brand lockup clicks navigate to Home
    document.querySelectorAll('.brand-lockup').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo('home');
      });
    });

    // Lightbox close button & overlay click
    const lightboxClose = document.getElementById('lightboxClose');
    if (lightboxClose) {
      lightboxClose.addEventListener('click', () => this.closeLightbox());
    }
    if (this.lightboxOverlay) {
      this.lightboxOverlay.addEventListener('click', (e) => {
        if (e.target === this.lightboxOverlay) this.closeLightbox();
      });
    }

    // Close modals on escape key & arrow navigation for memoir reader
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeLightbox();
        this.closeModal(this.uploadModal);
        this.closeModal(this.photoSelectModal);
        this.closeMemoirToc();
      }

      // Arrow navigation for memoir reader
      if (this.currentView === 'story-reader' && this.currentStoryId === 'memoir-bringing-people-together') {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.stepMemoirChapter(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.stepMemoirChapter(1);
        }
      }
    });

    // Photo Upload Modal triggers
    document.querySelectorAll('[data-action="open-upload-modal"]').forEach(btn => {
      btn.addEventListener('click', () => this.openUploadModal());
    });

    // New Story button triggers
    document.querySelectorAll('[data-action="new-story"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.resetStudioDraft();
        this.navigateTo('studio');
      });
    });

    // Handle Upload Drop Zone & File Selection
    this.setupUploadHandlers();
  }

  navigateTo(viewName, params = {}) {
    this.currentView = viewName;
    if (params.storyId) {
      this.currentStoryId = params.storyId;
    }

    // Update nav active states
    this.navLinks.forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Switch view sections
    this.viewSections.forEach(section => {
      if (section.id === `view-${viewName}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.renderCurrentView();
  }

  renderCurrentView() {
    switch (this.currentView) {
      case 'home':
        this.renderHome();
        break;
      case 'stories':
        this.renderStoriesList();
        break;
      case 'story-reader':
        this.renderStoryReader(this.currentStoryId);
        break;
      case 'vault':
        this.renderPhotoVault();
        break;
      case 'studio':
        this.renderStoryStudio();
        break;
      case 'about':
        // Static content ready in HTML
        break;
    }
  }

  /* ==========================================================================
     HOME VIEW
     ========================================================================== */
  renderHome() {
    const stories = this.storage.getStories();
    const photos = this.storage.getPhotos();

    // Featured Stories container
    const featuredContainer = document.getElementById('homeFeaturedStories');
    if (featuredContainer) {
      featuredContainer.innerHTML = stories.slice(0, 3).map(story => this.createStoryCardHTML(story)).join('');
      this.attachStoryCardClickHandlers(featuredContainer);
    }

    // Recent Archives Preview container
    const homeVaultPreview = document.getElementById('homeVaultPreview');
    if (homeVaultPreview) {
      homeVaultPreview.innerHTML = photos.slice(0, 4).map(photo => `
        <div class="vault-card" data-photo-id="${photo.id}">
          <div class="vault-card-frame" onclick="window.appInstance.openLightbox('${photo.id}')">
            <img src="${photo.url}" alt="${photo.title}" loading="lazy">
            <span class="vault-card-year-tag">${photo.year}</span>
          </div>
          <div class="vault-card-body">
            <h4 class="vault-card-title">${photo.title}</h4>
            <p class="vault-card-caption">${photo.caption}</p>
          </div>
        </div>
      `).join('');
    }
  }

  /* ==========================================================================
     STORIES LIST VIEW
     ========================================================================== */
  renderStoriesList() {
    const stories = this.storage.getStories();
    const container = document.getElementById('storiesListGrid');
    const filterPillsContainer = document.getElementById('storiesFilterPills');

    if (!container) return;

    // Filter categories
    const categories = ['All', 'Memoir & Archives', 'Little Tokyo Chronicles', 'Community Building', 'Reflections & Heritage'];

    if (filterPillsContainer) {
      filterPillsContainer.innerHTML = categories.map(cat => `
        <button class="filter-pill ${this.activeFilter === cat ? 'active' : ''}" data-category="${cat}">
          ${cat}
        </button>
      `).join('');

      filterPillsContainer.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          this.activeFilter = btn.getAttribute('data-category');
          this.renderStoriesList();
        });
      });
    }

    const filteredStories = this.activeFilter === 'All'
      ? stories
      : stories.filter(s => s.category === this.activeFilter);

    if (filteredStories.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <p style="font-size: 1.1rem; color: var(--ink-muted);">No stories found in this category.</p>
          <button class="btn-primary" style="margin-top: 1rem;" onclick="window.appInstance.navigateTo('studio')">+ Write the First Story</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredStories.map(story => this.createStoryCardHTML(story)).join('');
    this.attachStoryCardClickHandlers(container);
  }

  createStoryCardHTML(story) {
    const totalPhotos = (story.sidePhotos?.length || 0) + (story.appendixPhotos?.length || 0);
    const coverImage = story.featuredImage || 'images/little_tokyo_historic.jpg';
    const isBookMemoir = story.chapters && story.chapters.length > 0;

    return `
      <article class="story-card ${isBookMemoir ? 'story-card-memoir' : ''}" data-story-id="${story.id}">
        <div class="story-card-cover">
          <img src="${coverImage}" alt="${story.title}" loading="lazy">
          <span class="card-category-badge">${isBookMemoir ? 'Full Book Memoir' : (story.category || 'Chronicle')}</span>
          ${isBookMemoir ? `
            <span class="card-photo-count-badge" style="background: rgba(194, 79, 51, 0.95); font-weight: 700;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              ${story.chapters.length} Chapters
            </span>
          ` : (totalPhotos > 0 ? `
            <span class="card-photo-count-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              ${totalPhotos} ${totalPhotos === 1 ? 'Photo' : 'Photos'}
            </span>
          ` : '')}
        </div>
        <div class="story-card-body">
          <div class="story-card-meta">
            <span>${story.date}</span>
            <span>•</span>
            <span>${story.readTime || '5 min read'}</span>
          </div>
          <h3 class="story-card-title">${story.title}</h3>
          ${story.subtitle ? `<p style="font-family: var(--font-serif); font-style: italic; font-size: 0.92rem; color: var(--ink-secondary); margin-bottom: 0.5rem; line-height: 1.4;">${story.subtitle}</p>` : ''}
          <p class="story-card-summary">${story.summary || ''}</p>
          <div class="story-card-footer">
            <span>${isBookMemoir ? 'Read Full Memoir (29 Chapters)' : 'Read Story'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </div>
        </div>
      </article>
    `;
  }

  attachStoryCardClickHandlers(container) {
    container.querySelectorAll('.story-card').forEach(card => {
      card.addEventListener('click', () => {
        const storyId = card.getAttribute('data-story-id');
        this.navigateTo('story-reader', { storyId });
      });
    });
  }

  /* ==========================================================================
     STORY READER VIEW (DUAL-MODE PHOTO DISPLAY)
     ========================================================================== */
  renderStoryReader(storyId) {
    const story = this.storage.getStoryById(storyId);
    const readerContainer = document.getElementById('storyReaderContent');
    if (!readerContainer) return;

    if (!story) {
      readerContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem;">
          <h2>Story Not Found</h2>
          <p style="color: var(--ink-muted); margin-top: 0.5rem;">The story you requested does not exist or was deleted.</p>
          <button class="btn-primary" style="margin-top: 1.5rem;" onclick="window.appInstance.navigateTo('stories')">Return to Stories</button>
        </div>
      `;
      return;
    }

    // Check if this story has chapters (such as the 29-chapter memoir)
    if (story.chapters && story.chapters.length > 0) {
      this.renderPaginatedMemoirReader(story);
      return;
    }

    // Build the dual-mode editorial content stream
    const paragraphsHTML = (story.paragraphs || []).map((paragraphText, idx) => {
      // Find if there is an anchored side photo for this paragraph
      const sidePhotoAttachment = (story.sidePhotos || []).find(p => p.paragraphIndex === idx);

      let sidePhotoCardHTML = '';
      if (sidePhotoAttachment) {
        // Resolve photo data either from vault ID or direct URL
        const photoData = this.storage.getPhotoById(sidePhotoAttachment.photoId) || {
          title: 'Documentary Record',
          url: sidePhotoAttachment.url || sidePhotoAttachment.photoId,
          year: sidePhotoAttachment.year || 'Historical Archive',
          caption: sidePhotoAttachment.caption || ''
        };

        const caption = sidePhotoAttachment.caption || photoData.caption || '';
        const year = sidePhotoAttachment.year || photoData.year || '';

        sidePhotoCardHTML = `
          <div class="side-photo-column">
            <aside class="side-photo-card" aria-label="Accompanying Photograph">
              <span class="side-photo-tag">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Archival Record
              </span>
              <div class="side-photo-frame" onclick="window.appInstance.openLightbox('${photoData.id || ''}', '${photoData.url}', '${escapeHTML(photoData.title || '')}', '${escapeHTML(caption)}')">
                <img src="${photoData.url}" alt="${photoData.title || 'Historical Archive'}" loading="lazy">
                <div class="zoom-indicator" title="Click to view full size">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </div>
              </div>
              ${caption ? `<figcaption class="side-photo-caption">${caption}</figcaption>` : ''}
              ${year ? `<span class="side-photo-year">${year}</span>` : ''}
            </aside>
          </div>
        `;
      }

      return `
        <div class="content-row ${sidePhotoAttachment ? 'has-side-photo' : 'no-side-photo'}">
          <div class="prose-text">
            <p>${paragraphText}</p>
          </div>
          ${sidePhotoCardHTML}
        </div>
      `;
    }).join('');

    // Build the Appendix Gallery (photographic records at bottom of story)
    let appendixHTML = '';
    if (story.appendixPhotos && story.appendixPhotos.length > 0) {
      const appendixCardsHTML = story.appendixPhotos.map((item, index) => {
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
        const plateLabel = `Plate ${romanNumerals[index] || (index + 1)}`;
        
        const photoData = this.storage.getPhotoById(item.photoId) || {
          title: item.title || 'Archive Item',
          url: item.url || item.photoId,
          caption: item.caption || '',
          notes: item.notes || ''
        };

        const caption = item.caption || photoData.caption || '';
        const notes = item.notes || photoData.notes || '';

        return `
          <div class="appendix-card">
            <span class="appendix-plate-number">${plateLabel}</span>
            <div class="appendix-photo-frame" onclick="window.appInstance.openLightbox('${photoData.id || ''}', '${photoData.url}', '${escapeHTML(photoData.title || plateLabel)}', '${escapeHTML(caption)}')">
              <img src="${photoData.url}" alt="${photoData.title || plateLabel}" loading="lazy">
              <div class="zoom-indicator" title="View Full Size">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
            </div>
            ${caption ? `<p class="appendix-photo-caption">${caption}</p>` : ''}
            ${notes ? `<p class="appendix-photo-notes">${notes}</p>` : ''}
          </div>
        `;
      }).join('');

      appendixHTML = `
        <section class="story-appendix-section" aria-label="Story Photographic Appendix">
          <div class="appendix-header">
            <span class="appendix-badge">Archival Appendix</span>
            <div>
              <h3 class="appendix-title">Photographic Records & Historic Documents</h3>
              <p class="appendix-description">Supplementary visual archives and historical materials documenting this story.</p>
            </div>
          </div>
          <div class="appendix-grid">
            ${appendixCardsHTML}
          </div>
        </section>
      `;
    }

    readerContainer.innerHTML = `
      <div class="story-reader-view">
        <div class="reader-back-bar">
          <button class="btn-back" onclick="window.appInstance.navigateTo('stories')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back to All Stories
          </button>
          <div class="reader-actions">
            <button class="btn-secondary" onclick="window.appInstance.editCurrentStory('${story.id}')" title="Edit this story">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit Story
            </button>
            <button class="btn-secondary" onclick="window.print()" title="Print / Save PDF">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Print
            </button>
          </div>
        </div>

        <header class="reader-header">
          <span class="reader-category">${story.category || 'Story'}</span>
          <h1 class="reader-title">${story.title}</h1>
          ${story.subtitle ? `<p class="reader-subtitle">${story.subtitle}</p>` : ''}
          <div class="reader-meta-bar">
            <span class="reader-author">By ${story.author || 'Bill Watanabe'}</span>
            <span>•</span>
            <span>${story.date}</span>
            <span>•</span>
            <span>${story.readTime || '5 min read'}</span>
          </div>
        </header>

        <div class="reader-body">
          ${paragraphsHTML}
        </div>

        ${appendixHTML}
      </div>
    `;
  }

  /* ==========================================================================
     PAGINATED MEMOIR READER VIEW (29 CHAPTERS)
     Features Chapter-by-Chapter pagination, reading progress, TOC drawer,
     archival sidebars, photo callouts, font resizing, and continuous mode.
     ========================================================================== */
  renderPaginatedMemoirReader(story) {
    const readerContainer = document.getElementById('storyReaderContent');
    if (!readerContainer) return;

    const totalChapters = (story.chapters || []).length;
    if (totalChapters === 0) return;

    // Ensure valid current chapter index
    if (this.currentMemoirChapterIndex < 0) this.currentMemoirChapterIndex = 0;
    if (this.currentMemoirChapterIndex >= totalChapters) this.currentMemoirChapterIndex = totalChapters - 1;

    const curChapter = story.chapters[this.currentMemoirChapterIndex];
    const prevChapter = this.currentMemoirChapterIndex > 0 ? story.chapters[this.currentMemoirChapterIndex - 1] : null;
    const nextChapter = this.currentMemoirChapterIndex < totalChapters - 1 ? story.chapters[this.currentMemoirChapterIndex + 1] : null;

    const progressPct = Math.round(((this.currentMemoirChapterIndex + 1) / totalChapters) * 100);

    const renderChapterItemsHTML = (chapter) => {
      return (chapter.items || []).map((item) => {
        if (item.type === 'sidebar') {
          return `
            <aside class="memoir-sidebar-card" aria-label="Sidebar: ${escapeHTML(item.title || 'Archival Note')}">
              <div class="sidebar-header">
                <span class="sidebar-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Archival Sidebar
                </span>
                <span class="sidebar-title">${escapeHTML(item.title || 'Historical Note')}</span>
              </div>
              <div class="sidebar-body">
                ${item.html}
              </div>
            </aside>
          `;
        }

        if (item.type === 'photo_callout') {
          const imageList = Array.isArray(item.images)
            ? item.images
            : (item.image ? [item.image] : (item.imageUrl ? [item.imageUrl] : []));
          const plateLabel = item.photoNumber ? `Plate #${item.photoNumber}` : 'Archival Photo Reference';
          const captionText = item.caption || item.text || '';

          let imagesHTML = '';
          if (imageList.length === 1) {
            const imgSrc = imageList[0];
            imagesHTML = `
              <div class="photo-callout-image-wrap" onclick="window.appInstance.openLightbox('', '${escapeHTML(imgSrc)}', '${escapeHTML(plateLabel)}', '${escapeHTML(captionText)}')">
                <img src="${escapeHTML(imgSrc)}" alt="${escapeHTML(captionText || plateLabel)}" loading="lazy" class="photo-callout-img" onerror="this.closest('.photo-callout-image-wrap').style.display='none'">
                <div class="zoom-indicator" title="Click to view full size">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                  <span>Enlarge</span>
                </div>
              </div>
            `;
          } else if (imageList.length > 1) {
            imagesHTML = `
              <div class="photo-callout-grid">
                ${imageList.map((imgSrc, idx) => `
                  <div class="photo-callout-image-wrap grid-item" onclick="window.appInstance.openLightbox('', '${escapeHTML(imgSrc)}', '${escapeHTML(plateLabel)} (${idx + 1}/${imageList.length})', '${escapeHTML(captionText)}')">
                    <img src="${escapeHTML(imgSrc)}" alt="${escapeHTML(plateLabel)}" loading="lazy" class="photo-callout-img" onerror="this.closest('.photo-callout-image-wrap').style.display='none'">
                    <div class="zoom-indicator" title="Click to view full size">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                    </div>
                  </div>
                `).join('')}
              </div>
            `;
          }

          return `
            <figure class="memoir-photo-callout-card ${imageList.length > 0 ? 'has-photo' : 'text-only'}" aria-label="Archival Photo Record">
              <div class="photo-callout-header">
                <span class="photo-callout-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Archival Photo Reference
                </span>
                ${item.photoNumber ? `<span class="photo-plate-tag">${plateLabel}</span>` : ''}
              </div>
              ${imagesHTML}
              <div class="photo-callout-body">
                <p>${item.html}</p>
              </div>
            </figure>
          `;
        }

        // Standard body paragraph
        return `<p class="memoir-p">${item.html}</p>`;
      }).join('');
    };

    // Body content: Either single chapter or all chapters in continuous mode
    let mainContentHTML = '';
    if (this.memoirViewMode === 'continuous') {
      mainContentHTML = story.chapters.map(ch => `
        <article class="memoir-continuous-chapter" id="chapter-anchor-${ch.chapterNumber}">
          <header class="memoir-chapter-header">
            <div class="memoir-chapter-badge-row">
              <span class="memoir-chapter-pill">Chapter ${ch.chapterNumber} of ${totalChapters}</span>
              <span class="memoir-meta-pill">•</span>
              <span class="memoir-meta-pill">${ch.readTime}</span>
              <span class="memoir-meta-pill">•</span>
              <span class="memoir-meta-pill">${ch.wordCount.toLocaleString()} words</span>
            </div>
            <h2 class="memoir-chapter-title">${ch.title}</h2>
          </header>
          <div class="memoir-prose-container font-size-${this.memoirFontSize}">
            ${renderChapterItemsHTML(ch)}
          </div>
        </article>
      `).join('');
    } else {
      mainContentHTML = `
        <article class="memoir-single-chapter">
          <header class="memoir-chapter-header">
            <span class="memoir-book-tagline">Bringing People Together to Make a Better World</span>
            <div class="memoir-chapter-badge-row">
              <span class="memoir-chapter-pill">Chapter ${curChapter.chapterNumber} of ${totalChapters}</span>
              <span class="memoir-meta-pill">•</span>
              <span class="memoir-meta-pill">${curChapter.readTime}</span>
              <span class="memoir-meta-pill">•</span>
              <span class="memoir-meta-pill">${curChapter.wordCount.toLocaleString()} words</span>
              <span class="memoir-meta-pill">•</span>
              <span class="memoir-meta-pill">${progressPct}% of Book</span>
            </div>
            <h1 class="memoir-chapter-title">${curChapter.title}</h1>
          </header>

          <div class="memoir-prose-container font-size-${this.memoirFontSize}">
            ${renderChapterItemsHTML(curChapter)}
          </div>

          <!-- Bottom Pagination Controls -->
          <nav class="memoir-bottom-nav" aria-label="Chapter Pagination">
            ${prevChapter ? `
              <button class="memoir-page-card prev" onclick="window.appInstance.goToMemoirChapter(${this.currentMemoirChapterIndex - 1})">
                <span class="page-card-sub">← Previous Chapter (${curChapter.chapterNumber - 1})</span>
                <span class="page-card-title">${prevChapter.title}</span>
              </button>
            ` : `<div class="memoir-page-card-empty"></div>`}

            <div class="memoir-page-center-indicator">
              <button class="btn-secondary" onclick="window.appInstance.openMemoirToc()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line></svg>
                Table of Contents
              </button>
              <span class="page-progress-pill">Chapter ${curChapter.chapterNumber} of ${totalChapters} (${progressPct}%)</span>
              <button class="btn-text-only" onclick="window.scrollTo({ top: 0, behavior: 'smooth' })">↑ Top of Chapter</button>
            </div>

            ${nextChapter ? `
              <button class="memoir-page-card next" onclick="window.appInstance.goToMemoirChapter(${this.currentMemoirChapterIndex + 1})">
                <span class="page-card-sub">Next Chapter (${curChapter.chapterNumber + 1}) →</span>
                <span class="page-card-title">${nextChapter.title}</span>
              </button>
            ` : `
              <button class="memoir-page-card finish" onclick="window.appInstance.goToMemoirChapter(0)">
                <span class="page-card-sub">Completed! ★</span>
                <span class="page-card-title">Return to Introduction</span>
              </button>
            `}
          </nav>
        </article>
      `;
    }

    // Build Photographic Appendix if present
    let appendixHTML = '';
    if (story.appendixPhotos && story.appendixPhotos.length > 0) {
      const appendixCardsHTML = story.appendixPhotos.map((item, index) => {
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
        const plateLabel = `Plate ${romanNumerals[index] || (index + 1)}`;
        const photoData = this.storage.getPhotoById(item.photoId) || {
          title: item.title || 'Archive Item',
          url: item.url || item.photoId,
          caption: item.caption || '',
          notes: item.notes || ''
        };
        const caption = item.caption || photoData.caption || '';
        const notes = item.notes || photoData.notes || '';

        return `
          <div class="appendix-card">
            <span class="appendix-plate-number">${plateLabel}</span>
            <div class="appendix-photo-frame" onclick="window.appInstance.openLightbox('${photoData.id || ''}', '${photoData.url}', '${escapeHTML(photoData.title || plateLabel)}', '${escapeHTML(caption)}')">
              <img src="${photoData.url}" alt="${photoData.title || plateLabel}" loading="lazy">
              <div class="zoom-indicator" title="View Full Size">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
            </div>
            ${caption ? `<p class="appendix-photo-caption">${caption}</p>` : ''}
            ${notes ? `<p class="appendix-photo-notes">${notes}</p>` : ''}
          </div>
        `;
      }).join('');

      appendixHTML = `
        <section class="story-appendix-section" aria-label="Memoir Photographic Appendix">
          <div class="appendix-header">
            <span class="appendix-badge">Archival Appendix</span>
            <div>
              <h3 class="appendix-title">Photographic Records & Historic Documents</h3>
              <p class="appendix-description">Documentary images from Bill Watanabe's personal archives and Little Tokyo institutions.</p>
            </div>
          </div>
          <div class="appendix-grid">
            ${appendixCardsHTML}
          </div>
        </section>
      `;
    }

    // Assemble full reader template
    readerContainer.innerHTML = `
      <div class="memoir-reader-view">
        <!-- Pinned Reading Progress Bar -->
        <div class="memoir-reading-progress-track">
          <div class="memoir-reading-progress-fill" style="width: ${progressPct}%;"></div>
        </div>

        <!-- Sticky Top Navigation & Chapter Bar -->
        <div class="memoir-top-nav-bar">
          <div class="memoir-top-nav-left">
            <button class="btn-back" onclick="window.appInstance.navigateTo('stories')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              <span>Stories</span>
            </button>

            <!-- Table of Contents trigger -->
            <button class="btn-toc" id="memoirTocBtn" onclick="window.appInstance.openMemoirToc()" title="Open Table of Contents (29 Chapters)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              <span>Contents</span>
              <span class="toc-counter">${curChapter.chapterNumber}/${totalChapters}</span>
            </button>

            <!-- Quick Chapter Dropdown with Step buttons -->
            <div class="memoir-chapter-quick-nav">
              <button class="btn-step" onclick="window.appInstance.stepMemoirChapter(-1)" ${!prevChapter ? 'disabled' : ''} title="Previous Chapter (← Left Arrow)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <select class="memoir-chapter-dropdown" aria-label="Jump to Chapter" onchange="window.appInstance.goToMemoirChapter(parseInt(this.value, 10))">
                ${story.chapters.map((ch, idx) => `
                  <option value="${idx}" ${idx === this.currentMemoirChapterIndex ? 'selected' : ''}>
                    Ch ${ch.chapterNumber}: ${ch.title}
                  </option>
                `).join('')}
              </select>
              <button class="btn-step" onclick="window.appInstance.stepMemoirChapter(1)" ${!nextChapter ? 'disabled' : ''} title="Next Chapter (→ Right Arrow)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>

          <!-- Reader Controls: Font Size, View Mode, Print -->
          <div class="memoir-controls-group">
            <div class="btn-font-size" title="Adjust Font Size">
              <span>Text</span>
              <span class="btn-font-toggle ${this.memoirFontSize === 'normal' ? 'active' : ''}" onclick="window.appInstance.setMemoirFontSize('normal')">A</span>
              <span class="btn-font-toggle ${this.memoirFontSize === 'large' ? 'active' : ''}" onclick="window.appInstance.setMemoirFontSize('large')">A+</span>
              <span class="btn-font-toggle ${this.memoirFontSize === 'xlarge' ? 'active' : ''}" onclick="window.appInstance.setMemoirFontSize('xlarge')">A++</span>
            </div>

            <button class="btn-view-mode" onclick="window.appInstance.toggleMemoirViewMode()" title="Toggle Paginated vs Continuous Reading">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              <span>${this.memoirViewMode === 'continuous' ? 'Chapter View' : 'All Chapters'}</span>
            </button>

            <button class="btn-secondary" onclick="window.print()" title="Print / Save PDF">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            </button>
          </div>
        </div>

        <!-- Main Content (Chapter or Continuous) -->
        ${mainContentHTML}

        <!-- Archival Photographic Appendix -->
        ${appendixHTML}

        <!-- Table of Contents Slide-out Drawer -->
        <div class="memoir-toc-overlay ${this.memoirTocOpen ? 'open' : ''}" id="memoirTocOverlay" onclick="if(event.target === this) window.appInstance.closeMemoirToc()">
          <div class="memoir-toc-drawer" aria-label="Table of Contents">
            <div class="memoir-toc-header">
              <div>
                <h3>Table of Contents</h3>
                <p>Bringing People Together to Make a Better World • 29 Chapters</p>
              </div>
              <button class="btn-close-drawer" onclick="window.appInstance.closeMemoirToc()" aria-label="Close Table of Contents">✕</button>
            </div>

            <div class="memoir-toc-search-wrap">
              <input type="text" id="memoirTocSearchInput" class="memoir-toc-search-input" placeholder="Search chapters by keyword (e.g. Budokan, Housing)..." oninput="window.appInstance.filterMemoirToc(this.value)">
            </div>

            <div class="memoir-toc-list" id="memoirTocList">
              ${story.chapters.map((ch, idx) => `
                <div class="memoir-toc-item ${idx === this.currentMemoirChapterIndex ? 'active' : ''}" onclick="window.appInstance.goToMemoirChapter(${idx})">
                  <span class="toc-item-number">${ch.chapterNumber.toString().padStart(2, '0')}</span>
                  <div class="toc-item-info">
                    <h4 class="toc-item-title">${ch.title}</h4>
                    <div class="toc-item-meta">
                      <span>${ch.readTime}</span>
                      <span>•</span>
                      <span>${ch.wordCount.toLocaleString()} words</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  goToMemoirChapter(index) {
    const story = this.storage.getStoryById('memoir-bringing-people-together');
    if (!story || !story.chapters) return;
    if (index < 0 || index >= story.chapters.length) return;

    this.currentMemoirChapterIndex = index;
    try {
      localStorage.setItem('bw_memoir_active_chapter', index.toString());
    } catch (e) { }

    this.memoirTocOpen = false;
    this.renderPaginatedMemoirReader(story);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  stepMemoirChapter(delta) {
    this.goToMemoirChapter(this.currentMemoirChapterIndex + delta);
  }

  openMemoirToc() {
    this.memoirTocOpen = true;
    const overlay = document.getElementById('memoirTocOverlay');
    if (overlay) overlay.classList.add('open');
    setTimeout(() => {
      const input = document.getElementById('memoirTocSearchInput');
      if (input) input.focus();
    }, 100);
  }

  closeMemoirToc() {
    this.memoirTocOpen = false;
    const overlay = document.getElementById('memoirTocOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  toggleMemoirToc() {
    if (this.memoirTocOpen) this.closeMemoirToc();
    else this.openMemoirToc();
  }

  filterMemoirToc(query) {
    const story = this.storage.getStoryById('memoir-bringing-people-together');
    const listContainer = document.getElementById('memoirTocList');
    if (!story || !story.chapters || !listContainer) return;

    const q = (query || '').toLowerCase().trim();
    const filtered = q
      ? story.chapters.filter(ch => ch.title.toLowerCase().includes(q) || (ch.chapterNumber + '').includes(q))
      : story.chapters;

    listContainer.innerHTML = filtered.map(ch => {
      const idx = story.chapters.findIndex(c => c.chapterNumber === ch.chapterNumber);
      return `
        <div class="memoir-toc-item ${idx === this.currentMemoirChapterIndex ? 'active' : ''}" onclick="window.appInstance.goToMemoirChapter(${idx})">
          <span class="toc-item-number">${ch.chapterNumber.toString().padStart(2, '0')}</span>
          <div class="toc-item-info">
            <h4 class="toc-item-title">${ch.title}</h4>
            <div class="toc-item-meta">
              <span>${ch.readTime}</span>
              <span>•</span>
              <span>${ch.wordCount.toLocaleString()} words</span>
            </div>
          </div>
        </div>
      `;
    }).join('') || '<p style="text-align: center; color: var(--ink-muted); padding: 2rem 1rem;">No chapters matching your search.</p>';
  }

  setMemoirFontSize(size) {
    this.memoirFontSize = size;
    const story = this.storage.getStoryById('memoir-bringing-people-together');
    if (story && story.chapters) {
      this.renderPaginatedMemoirReader(story);
    }
  }

  toggleMemoirViewMode() {
    this.memoirViewMode = this.memoirViewMode === 'chapter' ? 'continuous' : 'chapter';
    const story = this.storage.getStoryById('memoir-bringing-people-together');
    if (story && story.chapters) {
      this.renderPaginatedMemoirReader(story);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ==========================================================================
     STORY STUDIO (CREATE & EDIT STORIES)
     ========================================================================== */
  resetStudioDraft() {
    this.studioDraft = {
      title: '',
      subtitle: '',
      category: 'Little Tokyo Chronicles',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      paragraphs: [''],
      sidePhotos: [],
      appendixPhotos: []
    };
    this.editingStoryId = null;
  }

  editCurrentStory(storyId) {
    const story = this.storage.getStoryById(storyId);
    if (!story) return;

    this.editingStoryId = story.id;
    this.studioDraft = {
      id: story.id,
      title: story.title || '',
      subtitle: story.subtitle || '',
      category: story.category || 'Little Tokyo Chronicles',
      date: story.date || '',
      paragraphs: story.paragraphs && story.paragraphs.length > 0 ? [...story.paragraphs] : [''],
      sidePhotos: story.sidePhotos ? JSON.parse(JSON.stringify(story.sidePhotos)) : [],
      appendixPhotos: story.appendixPhotos ? JSON.parse(JSON.stringify(story.appendixPhotos)) : []
    };

    this.navigateTo('studio');
  }

  renderStoryStudio() {
    const container = document.getElementById('storyStudioContent');
    if (!container) return;

    const draft = this.studioDraft;

    container.innerHTML = `
      <div class="studio-container">
        <div class="studio-header">
          <div class="studio-title-group">
            <h2>${this.editingStoryId ? 'Edit Story' : 'Story Studio: Create New Chronicle'}</h2>
            <p>Write your narrative, attach pictures alongside specific paragraphs, and build an appendix gallery.</p>
          </div>
          <div class="studio-mode-toggle">
            <button class="mode-btn active" id="btnStudioEditTab">Write & Attach</button>
            <button class="mode-btn" id="btnStudioPreviewTab">Live Preview</button>
          </div>
        </div>

        <div id="studioEditPane">
          <form id="storyStudioForm" onsubmit="return false;">
            <div class="form-group">
              <label class="form-label" for="storyTitle">Story Title</label>
              <input type="text" id="storyTitle" class="form-input" placeholder="e.g. The Night We Protected the Senor Citizen Center" value="${escapeHTML(draft.title)}" required>
            </div>

            <div class="form-group">
              <label class="form-label" for="storySubtitle">Subtitle / Excerpt <span class="form-label-hint">(Optional narrative hook)</span></label>
              <input type="text" id="storySubtitle" class="form-input" placeholder="e.g. Reflections on community solidarity and the battles of 1982" value="${escapeHTML(draft.subtitle)}">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="storyCategory">Category</label>
                <select id="storyCategory" class="form-select">
                  <option value="Little Tokyo Chronicles" ${draft.category === 'Little Tokyo Chronicles' ? 'selected' : ''}>Little Tokyo Chronicles</option>
                  <option value="Community Building" ${draft.category === 'Community Building' ? 'selected' : ''}>Community Building</option>
                  <option value="Reflections & Heritage" ${draft.category === 'Reflections & Heritage' ? 'selected' : ''}>Reflections & Heritage</option>
                  <option value="Memoirs & Milestones" ${draft.category === 'Memoirs & Milestones' ? 'selected' : ''}>Memoirs & Milestones</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="storyDate">Date Display</label>
                <input type="text" id="storyDate" class="form-input" value="${escapeHTML(draft.date)}">
              </div>
            </div>

            <!-- Paragraph Blocks & Per-Paragraph Side Photo Attacher -->
            <div class="paragraphs-builder">
              <div class="builder-heading">
                <div>
                  <h3>Story Paragraphs & Side-by-Side Photo Placements</h3>
                  <p style="font-size: 0.85rem; color: var(--ink-muted);">Attach pictures to specific paragraphs to display them alongside the story.</p>
                </div>
                <button type="button" class="btn-secondary" id="btnAddParagraph">
                  + Add Paragraph
                </button>
              </div>

              <div id="paragraphsList">
                ${draft.paragraphs.map((pText, idx) => this.renderParagraphCardHTML(pText, idx)).join('')}
              </div>
            </div>

            <!-- Appendix Photos Builder Section -->
            <div class="appendix-builder">
              <div class="appendix-builder-header">
                <div>
                  <h3 style="font-family: var(--font-serif); font-size: 1.35rem; color: var(--ink-primary);">Story Appendix: Photo Records</h3>
                  <p style="font-size: 0.84rem; color: var(--ink-muted);">Photos added here will appear in the full-width appendix gallery at the end of the post.</p>
                </div>
                <button type="button" class="btn-secondary" id="btnAddAppendixPhoto">
                  + Attach to Appendix
                </button>
              </div>

              <div id="appendixList" class="appendix-items-list">
                ${draft.appendixPhotos.length === 0 ? `
                  <p style="font-size: 0.86rem; color: var(--ink-muted); font-style: italic; grid-column: 1 / -1;">No photos attached to the appendix yet. Click "+ Attach to Appendix" to add records.</p>
                ` : draft.appendixPhotos.map((item, idx) => this.renderAppendixItemChipHTML(item, idx)).join('')}
              </div>
            </div>

            <div class="studio-footer-actions">
              <button type="button" class="btn-secondary" onclick="window.appInstance.navigateTo('stories')">Cancel</button>
              <button type="button" class="btn-primary" id="btnPublishStory">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ${this.editingStoryId ? 'Save Changes' : 'Publish Story'}
              </button>
            </div>
          </form>
        </div>

        <div id="studioPreviewPane" style="display: none;">
          <div id="studioLivePreviewTarget"></div>
        </div>
      </div>
    `;

    this.bindStudioEvents();
  }

  renderParagraphCardHTML(text, index) {
    const sidePhoto = this.studioDraft.sidePhotos.find(p => p.paragraphIndex === index);
    let photoData = null;
    if (sidePhoto) {
      photoData = this.storage.getPhotoById(sidePhoto.photoId) || {
        url: sidePhoto.url || sidePhoto.photoId,
        title: 'Side Photo',
        caption: sidePhoto.caption || ''
      };
    }

    return `
      <div class="paragraph-block-card" data-index="${index}">
        <div class="block-header">
          <span class="block-badge">Paragraph ${index + 1}</span>
          <div class="block-actions">
            ${this.studioDraft.paragraphs.length > 1 ? `
              <button type="button" class="btn-icon-tiny" onclick="window.appInstance.removeParagraph(${index})" title="Delete paragraph">
                ✕ Remove
              </button>
            ` : ''}
          </div>
        </div>

        <textarea class="paragraph-textarea" placeholder="Type paragraph content here..." oninput="window.appInstance.updateParagraphText(${index}, this.value)">${escapeHTML(text)}</textarea>

        <div class="side-attachment-wrapper">
          ${sidePhoto ? `
            <div class="side-attachment-box">
              <div class="side-attachment-preview">
                <img src="${photoData.url}" alt="Attached preview">
              </div>
              <div class="side-attachment-info">
                <h5>Side Photo: ${escapeHTML(photoData.title || 'Attached Picture')}</h5>
                <p>${escapeHTML(sidePhoto.caption || photoData.caption || 'Displays alongside this paragraph.')}</p>
              </div>
              <button type="button" class="btn-icon-tiny" onclick="window.appInstance.removeSidePhoto(${index})" title="Remove side photo attachment">
                ✕ Remove
              </button>
            </div>
          ` : `
            <button type="button" class="btn-icon-text" onclick="window.appInstance.promptAttachSidePhoto(${index})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              + Attach Picture to this Paragraph (Side Callout)
            </button>
          `}
        </div>
      </div>
    `;
  }

  renderAppendixItemChipHTML(item, index) {
    const photoData = this.storage.getPhotoById(item.photoId) || {
      url: item.url || item.photoId,
      title: 'Appendix Record',
      caption: item.caption || ''
    };

    return `
      <div class="appendix-item-chip" data-appendix-index="${index}">
        <img src="${photoData.url}" alt="Appendix thumbnail">
        <div class="appendix-item-chip-content">
          <div class="appendix-item-chip-title">${escapeHTML(photoData.title)}</div>
          <div class="appendix-item-chip-caption">${escapeHTML(item.caption || photoData.caption || 'Archival plate')}</div>
        </div>
        <button type="button" class="btn-icon-tiny" onclick="window.appInstance.removeAppendixPhoto(${index})" title="Remove from appendix">✕</button>
      </div>
    `;
  }

  bindStudioEvents() {
    // Mode toggling (Edit vs Preview)
    const btnEditTab = document.getElementById('btnStudioEditTab');
    const btnPreviewTab = document.getElementById('btnStudioPreviewTab');
    const editPane = document.getElementById('studioEditPane');
    const previewPane = document.getElementById('studioPreviewPane');

    if (btnEditTab && btnPreviewTab) {
      btnEditTab.addEventListener('click', () => {
        btnEditTab.classList.add('active');
        btnPreviewTab.classList.remove('active');
        editPane.style.display = 'block';
        previewPane.style.display = 'none';
      });

      btnPreviewTab.addEventListener('click', () => {
        this.syncDraftFromForm();
        btnPreviewTab.classList.add('active');
        btnEditTab.classList.remove('active');
        editPane.style.display = 'none';
        previewPane.style.display = 'block';
        this.renderStudioLivePreview();
      });
    }

    // Add Paragraph
    const btnAddParagraph = document.getElementById('btnAddParagraph');
    if (btnAddParagraph) {
      btnAddParagraph.addEventListener('click', () => {
        this.syncDraftFromForm();
        this.studioDraft.paragraphs.push('');
        this.renderStoryStudio();
      });
    }

    // Add to Appendix
    const btnAddAppendixPhoto = document.getElementById('btnAddAppendixPhoto');
    if (btnAddAppendixPhoto) {
      btnAddAppendixPhoto.addEventListener('click', () => {
        this.syncDraftFromForm();
        this.promptAttachAppendixPhoto();
      });
    }

    // Publish / Save
    const btnPublish = document.getElementById('btnPublishStory');
    if (btnPublish) {
      btnPublish.addEventListener('click', () => this.saveDraftStory());
    }
  }

  syncDraftFromForm() {
    const titleInput = document.getElementById('storyTitle');
    const subtitleInput = document.getElementById('storySubtitle');
    const categoryInput = document.getElementById('storyCategory');
    const dateInput = document.getElementById('storyDate');

    if (titleInput) this.studioDraft.title = titleInput.value;
    if (subtitleInput) this.studioDraft.subtitle = subtitleInput.value;
    if (categoryInput) this.studioDraft.category = categoryInput.value;
    if (dateInput) this.studioDraft.date = dateInput.value;
  }

  updateParagraphText(index, value) {
    if (this.studioDraft.paragraphs[index] !== undefined) {
      this.studioDraft.paragraphs[index] = value;
    }
  }

  removeParagraph(index) {
    this.syncDraftFromForm();
    if (this.studioDraft.paragraphs.length > 1) {
      this.studioDraft.paragraphs.splice(index, 1);
      // Adjust any side photos anchored beyond or at this index
      this.studioDraft.sidePhotos = this.studioDraft.sidePhotos
        .filter(p => p.paragraphIndex !== index)
        .map(p => p.paragraphIndex > index ? { ...p, paragraphIndex: p.paragraphIndex - 1 } : p);
      this.renderStoryStudio();
    }
  }

  removeSidePhoto(paragraphIndex) {
    this.syncDraftFromForm();
    this.studioDraft.sidePhotos = this.studioDraft.sidePhotos.filter(p => p.paragraphIndex !== paragraphIndex);
    this.renderStoryStudio();
  }

  removeAppendixPhoto(index) {
    this.syncDraftFromForm();
    this.studioDraft.appendixPhotos.splice(index, 1);
    this.renderStoryStudio();
  }

  promptAttachSidePhoto(paragraphIndex) {
    this.pendingPhotoSelection = { type: 'side', paragraphIndex };
    this.openPhotoSelectModal('Attach Picture as Side Callout');
  }

  promptAttachAppendixPhoto() {
    this.pendingPhotoSelection = { type: 'appendix' };
    this.openPhotoSelectModal('Attach Picture to Story Appendix');
  }

  renderStudioLivePreview() {
    const target = document.getElementById('studioLivePreviewTarget');
    if (!target) return;

    // Use current draft state to render reader view
    const dummyStory = {
      ...this.studioDraft,
      author: 'Bill Watanabe',
      readTime: '3 min read'
    };

    // Temporarily register in memory for render
    this.storage.saveStories([dummyStory, ...this.storage.getStories().filter(s => s.id !== dummyStory.id)]);
    this.renderStoryReader(dummyStory.id);

    // Grab inner HTML and put inside target
    const rendered = document.getElementById('storyReaderContent').innerHTML;
    target.innerHTML = rendered;

    // Remove the temporary dummy registration
    this.storage.deleteStory(dummyStory.id);
  }

  saveDraftStory() {
    this.syncDraftFromForm();

    if (!this.studioDraft.title.trim()) {
      this.showToast('Please enter a story title.', 'error');
      document.getElementById('storyTitle')?.focus();
      return;
    }

    // Filter empty paragraphs
    const paragraphs = this.studioDraft.paragraphs.map(p => p.trim()).filter(Boolean);
    if (paragraphs.length === 0) {
      this.showToast('Please add at least one paragraph of text.', 'error');
      return;
    }

    const storyPayload = {
      ...this.studioDraft,
      paragraphs
    };

    let savedStory;
    if (this.editingStoryId) {
      savedStory = this.storage.updateStory(this.editingStoryId, storyPayload);
      this.showToast('Story updated successfully!');
    } else {
      savedStory = this.storage.addStory(storyPayload);
      this.showToast('Story published to your archives!');
    }

    this.resetStudioDraft();
    this.navigateTo('story-reader', { storyId: savedStory.id });
  }

  /* ==========================================================================
     PHOTO VAULT VIEW (IMAGE ARCHIVES & STORAGE)
     ========================================================================== */
  renderPhotoVault() {
    const photos = this.storage.getPhotos();
    const container = document.getElementById('vaultGrid');
    const countEl = document.getElementById('vaultPhotoCount');
    const searchInput = document.getElementById('vaultSearchInput');

    if (!container) return;

    if (countEl) {
      countEl.textContent = `${photos.length} Photographic Records Stored`;
    }

    const searchTerm = (searchInput ? searchInput.value.toLowerCase().trim() : '');
    const filteredPhotos = searchTerm
      ? photos.filter(p => 
          p.title.toLowerCase().includes(searchTerm) || 
          p.caption.toLowerCase().includes(searchTerm) ||
          (p.tags && p.tags.some(t => t.toLowerCase().includes(searchTerm))) ||
          p.year.includes(searchTerm)
        )
      : photos;

    if (filteredPhotos.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <p style="font-size: 1.1rem; color: var(--ink-muted);">No pictures matched your search.</p>
          <button class="btn-secondary" style="margin-top: 1rem;" onclick="document.getElementById('vaultSearchInput').value = ''; window.appInstance.renderPhotoVault();">Clear Search</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredPhotos.map(photo => `
      <div class="vault-card" data-photo-id="${photo.id}">
        <div class="vault-card-frame" onclick="window.appInstance.openLightbox('${photo.id}')">
          <img src="${photo.url}" alt="${photo.title}" loading="lazy">
          <span class="vault-card-year-tag">${photo.year}</span>
        </div>
        <div class="vault-card-body">
          <h4 class="vault-card-title">${photo.title}</h4>
          <p class="vault-card-caption">${photo.caption}</p>
          ${photo.tags ? `
            <div class="vault-card-tags">
              ${photo.tags.map(t => `<span class="vault-tag">#${t}</span>`).join('')}
            </div>
          ` : ''}
          <div class="vault-card-actions">
            <button class="btn-icon-text" onclick="window.appInstance.usePhotoInNewStory('${photo.id}')" title="Write a story featuring this photo">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Feature in Story
            </button>
            <button class="btn-icon-tiny" onclick="window.appInstance.deleteVaultPhoto('${photo.id}')" title="Delete from vault">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Bind search input listener once
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = 'true';
      searchInput.addEventListener('input', () => this.renderPhotoVault());
    }
  }

  usePhotoInNewStory(photoId) {
    this.resetStudioDraft();
    this.studioDraft.sidePhotos.push({
      paragraphIndex: 0,
      photoId: photoId,
      caption: ''
    });
    this.navigateTo('studio');
    this.showToast('Photo attached to paragraph 1 of your new story draft!');
  }

  deleteVaultPhoto(photoId) {
    if (confirm('Are you sure you want to remove this photograph from your vault?')) {
      this.storage.deletePhoto(photoId);
      this.showToast('Photograph deleted.');
      this.renderPhotoVault();
    }
  }

  /* ==========================================================================
     PHOTO SELECTION MODAL (PICK FOR SIDE OR APPENDIX)
     ========================================================================== */
  openPhotoSelectModal(title) {
    const modal = this.photoSelectModal;
    const titleEl = document.getElementById('photoSelectModalTitle');
    const gridEl = document.getElementById('photoSelectGrid');

    if (!modal || !gridEl) return;
    if (titleEl) titleEl.textContent = title;

    const photos = this.storage.getPhotos();

    gridEl.innerHTML = photos.map(photo => `
      <div class="vault-card" style="cursor: pointer;" onclick="window.appInstance.handlePhotoSelected('${photo.id}')">
        <div class="vault-card-frame">
          <img src="${photo.url}" alt="${photo.title}">
          <span class="vault-card-year-tag">${photo.year}</span>
        </div>
        <div class="vault-card-body" style="padding: 0.75rem;">
          <h5 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.2rem;">${photo.title}</h5>
          <p style="font-size: 0.76rem; color: var(--ink-secondary);">${photo.caption.slice(0, 75)}...</p>
        </div>
      </div>
    `).join('');

    this.openModal(modal);
  }

  handlePhotoSelected(photoId) {
    if (!this.pendingPhotoSelection) return;

    const photo = this.storage.getPhotoById(photoId);
    if (!photo) return;

    if (this.pendingPhotoSelection.type === 'side') {
      const pIndex = this.pendingPhotoSelection.paragraphIndex;
      // Remove any existing side photo on this paragraph
      this.studioDraft.sidePhotos = this.studioDraft.sidePhotos.filter(p => p.paragraphIndex !== pIndex);
      this.studioDraft.sidePhotos.push({
        paragraphIndex: pIndex,
        photoId: photo.id,
        caption: photo.caption
      });
      this.showToast(`Attached to paragraph ${pIndex + 1} as side callout!`);
    } else if (this.pendingPhotoSelection.type === 'appendix') {
      this.studioDraft.appendixPhotos.push({
        photoId: photo.id,
        caption: photo.caption,
        notes: `${photo.location} (${photo.year})`
      });
      this.showToast('Attached to story appendix!');
    }

    this.closeModal(this.photoSelectModal);
    this.pendingPhotoSelection = null;
    this.renderStoryStudio();
  }

  /* ==========================================================================
     UPLOAD PHOTO HANDLERS
     ========================================================================== */
  openUploadModal() {
    this.openModal(this.uploadModal);
    this.resetUploadForm();
  }

  setupUploadHandlers() {
    const dropZone = document.getElementById('uploadDropZone');
    const fileInput = document.getElementById('photoFileInput');
    const previewBox = document.getElementById('photoPreviewBox');
    const previewImg = document.getElementById('photoPreviewImg');
    const uploadForm = document.getElementById('photoUploadForm');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        this.handleFileSelected(fileInput.files[0]);
      }
    });

    if (uploadForm) {
      uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveUploadedPhoto();
      });
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close-btn, [data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModal(this.uploadModal);
        this.closeModal(this.photoSelectModal);
      });
    });
  }

  handleFileSelected(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImageDataUrl = e.target.result;
      const previewBox = document.getElementById('photoPreviewBox');
      const previewImg = document.getElementById('photoPreviewImg');
      if (previewBox && previewImg) {
        previewImg.src = this.uploadedImageDataUrl;
        previewBox.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  }

  resetUploadForm() {
    this.uploadedImageDataUrl = null;
    const form = document.getElementById('photoUploadForm');
    if (form) form.reset();
    const previewBox = document.getElementById('photoPreviewBox');
    if (previewBox) previewBox.style.display = 'none';
  }

  saveUploadedPhoto() {
    const title = document.getElementById('photoUploadTitle')?.value.trim();
    const year = document.getElementById('photoUploadYear')?.value.trim();
    const location = document.getElementById('photoUploadLocation')?.value.trim();
    const caption = document.getElementById('photoUploadCaption')?.value.trim();
    const tags = document.getElementById('photoUploadTags')?.value.trim();

    if (!this.uploadedImageDataUrl) {
      alert('Please select or drag an image file to upload.');
      return;
    }

    if (!title) {
      alert('Please provide a title for this photograph.');
      return;
    }

    const newPhoto = this.storage.addPhoto({
      title,
      year: year || 'Unknown Date',
      location: location || '',
      caption: caption || '',
      tags: tags ? tags.split(',').map(t => t.trim()) : ['Community'],
      url: this.uploadedImageDataUrl
    });

    this.showToast('Photograph saved to Photo Vault!');
    this.closeModal(this.uploadModal);
    this.renderPhotoVault();

    // If we were in the middle of attaching a photo in the studio, auto-attach it!
    if (this.pendingPhotoSelection) {
      this.handlePhotoSelected(newPhoto.id);
    }
  }

  /* ==========================================================================
     LIGHTBOX & MODAL UTILITIES
     ========================================================================== */
  openLightbox(photoId, directUrl, directTitle, directCaption) {
    const photo = photoId ? this.storage.getPhotoById(photoId) : null;
    const url = photo ? photo.url : directUrl;
    const title = photo ? photo.title : directTitle;
    const caption = photo ? `${photo.caption} ${photo.year ? `(${photo.year})` : ''}` : directCaption;

    if (!url) return;

    if (this.lightboxImage) this.lightboxImage.src = url;
    if (this.lightboxTitle) this.lightboxTitle.textContent = title || 'Archival Photograph';
    if (this.lightboxCaption) this.lightboxCaption.textContent = caption || '';

    if (this.lightboxOverlay) {
      this.lightboxOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeLightbox() {
    if (this.lightboxOverlay) {
      this.lightboxOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  openModal(modalElement) {
    if (modalElement) {
      modalElement.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal(modalElement) {
    if (modalElement) {
      modalElement.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  showToast(message, type = 'success') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>${escapeHTML(message)}</span>
    `;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
