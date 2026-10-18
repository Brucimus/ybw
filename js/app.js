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

    // Close modals on escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeLightbox();
        this.closeModal(this.uploadModal);
        this.closeModal(this.photoSelectModal);
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
    const categories = ['All', 'Little Tokyo Chronicles', 'Community Building', 'Reflections & Heritage'];

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

    return `
      <article class="story-card" data-story-id="${story.id}">
        <div class="story-card-cover">
          <img src="${coverImage}" alt="${story.title}" loading="lazy">
          <span class="card-category-badge">${story.category || 'Chronicle'}</span>
          ${totalPhotos > 0 ? `
            <span class="card-photo-count-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              ${totalPhotos} ${totalPhotos === 1 ? 'Photo' : 'Photos'}
            </span>
          ` : ''}
        </div>
        <div class="story-card-body">
          <div class="story-card-meta">
            <span>${story.date}</span>
            <span>•</span>
            <span>${story.readTime || '5 min read'}</span>
          </div>
          <h3 class="story-card-title">${story.title}</h3>
          <p class="story-card-summary">${story.summary || ''}</p>
          <div class="story-card-footer">
            <span>Read Story</span>
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
