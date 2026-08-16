/**
 * Admin dashboard logic
 */
(function () {
    'use strict';

    let categories = [];
    let pendingPhotoFiles = [];
    let pendingVideoFile = null;
    let deleteTargetId = null;

    // ── Auth guard ────────────────────────────────────────────
    async function init() {
        if (!window.PortfolioDB?.isConfigured()) {
            window.location.href = 'index.html';
            return;
        }
        try {
            await MediaService.requireAdmin();
        } catch {
            window.location.href = 'index.html';
            return;
        }

        setupNavigation();
        setupLogout();
        await loadCategories();
        setupPhotoUpload();
        setupVideoUpload();
        setupEditModal();
        setupDeleteModal();
        setupCategoryManagement();
        await loadPhotos();
        await loadVideos();
    }

    // ── Navigation ────────────────────────────────────────────
    function setupNavigation() {
        document.querySelectorAll('.sidebar-link').forEach((link) => {
            link.addEventListener('click', () => showPanel(link.dataset.panel));
        });
    }

    window.showPanel = function (panelId) {
        document.querySelectorAll('.sidebar-link').forEach((l) => {
            l.classList.toggle('active', l.dataset.panel === panelId);
        });
        document.querySelectorAll('.panel').forEach((p) => {
            p.classList.toggle('active', p.id === `panel-${panelId}`);
        });
    };

    function setupLogout() {
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await MediaService.signOut();
            window.location.href = 'index.html';
        });
    }

    // ── Categories ────────────────────────────────────────────
    async function loadCategories() {
        categories = await MediaService.getCategories();
        populateCategorySelects();
        renderCategoryList();
    }

    function populateCategorySelects() {
        const selects = ['photo-category', 'video-category', 'edit-category'];
        selects.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = categories.map((c) =>
                `<option value="${c.id}" data-slug="${c.slug}">${c.name}</option>`
            ).join('');
        });

        const subSelects = ['photo-subcategory', 'edit-subcategory'];
        const subOptions = MediaService.NATURE_SUBCATEGORIES.map((s) =>
            `<option value="${s}">${s}</option>`
        ).join('');
        subSelects.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<option value="">— Select —</option>' + subOptions;
        });
    }

    function toggleSubcategory(selectId, groupId) {
        const select = document.getElementById(selectId);
        const group = document.getElementById(groupId);
        const opt = select.options[select.selectedIndex];
        group.style.display = opt?.dataset?.slug === 'nature' ? 'block' : 'none';
    }

    document.getElementById('photo-category')?.addEventListener('change', () =>
        toggleSubcategory('photo-category', 'photo-subcategory-group')
    );
    document.getElementById('edit-category')?.addEventListener('change', () =>
        toggleSubcategory('edit-category', 'edit-subcategory-group')
    );

    function renderCategoryList() {
        const list = document.getElementById('category-list');
        if (!categories.length) {
            list.innerHTML = '<div class="empty-state"><p>No categories yet.</p></div>';
            return;
        }
        list.innerHTML = categories.map((cat) => `
            <li class="category-item" data-id="${cat.id}">
                <input type="number" class="order-input" value="${cat.display_order}" data-field="display_order" min="0">
                <input type="text" class="name-input" value="${cat.name}" data-field="name">
                <span style="font-size:11px;color:var(--secondary-text);">${cat.slug}</span>
                <button class="btn btn-sm btn-outline save-cat-btn" data-id="${cat.id}">Save</button>
                <button class="btn btn-sm btn-danger delete-cat-btn" data-id="${cat.id}" data-name="${cat.name}">Delete</button>
            </li>
        `).join('');

        list.querySelectorAll('.save-cat-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const item = btn.closest('.category-item');
                const id = btn.dataset.id;
                const name = item.querySelector('[data-field="name"]').value.trim();
                const display_order = parseInt(item.querySelector('[data-field="display_order"]').value, 10) || 0;
                try {
                    await MediaService.updateCategory(id, { name, display_order });
                    showMsg('category-success', 'Category updated.');
                    await loadCategories();
                } catch (err) {
                    showMsg('category-error', err.message, true);
                }
            });
        });

        list.querySelectorAll('.delete-cat-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!confirm(`Delete category "${btn.dataset.name}"? Media in this category will become uncategorized.`)) return;
                try {
                    await MediaService.deleteCategory(btn.dataset.id);
                    showMsg('category-success', 'Category deleted.');
                    await loadCategories();
                } catch (err) {
                    showMsg('category-error', err.message, true);
                }
            });
        });
    }

    function setupCategoryManagement() {
        document.getElementById('add-category-btn').addEventListener('click', async () => {
            const name = prompt('Category name:');
            if (!name) return;
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            try {
                await MediaService.createCategory(name, slug, categories.length);
                showMsg('category-success', 'Category created.');
                await loadCategories();
            } catch (err) {
                showMsg('category-error', err.message, true);
            }
        });
    }

    // ── Photo upload ──────────────────────────────────────────
    function setupPhotoUpload() {
        const zone = document.getElementById('photo-drop-zone');
        const input = document.getElementById('photo-file-input');
        const preview = document.getElementById('photo-preview-grid');

        zone.addEventListener('click', () => input.click());
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            addPhotoFiles(e.dataTransfer.files);
        });
        input.addEventListener('change', () => addPhotoFiles(input.files));

        function addPhotoFiles(fileList) {
            Array.from(fileList).forEach((file) => {
                if (!MediaService.PHOTO_TYPES.includes(file.type)) return;
                pendingPhotoFiles.push(file);
            });
            renderPhotoPreviews();
        }

        function renderPhotoPreviews() {
            preview.innerHTML = pendingPhotoFiles.map((file, i) => {
                const url = URL.createObjectURL(file);
                return `<div class="preview-item">
                    <img src="${url}" alt="Preview">
                    <button type="button" class="remove-preview" data-index="${i}">&times;</button>
                </div>`;
            }).join('');
            preview.querySelectorAll('.remove-preview').forEach((btn) => {
                btn.addEventListener('click', () => {
                    pendingPhotoFiles.splice(parseInt(btn.dataset.index, 10), 1);
                    renderPhotoPreviews();
                });
            });
        }

        document.getElementById('photo-upload-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('photo-upload-btn');
            const errEl = document.getElementById('upload-photo-error');
            const okEl = document.getElementById('upload-photo-success');
            errEl.classList.remove('show');
            okEl.classList.remove('show');

            if (!pendingPhotoFiles.length) {
                errEl.textContent = 'Please select at least one photo.';
                errEl.classList.add('show');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Uploading...';

            const catSelect = document.getElementById('photo-category');
            const catId = catSelect.value;
            const catSlug = catSelect.options[catSelect.selectedIndex].dataset.slug;
            const meta = {
                title: document.getElementById('photo-title').value.trim(),
                description: document.getElementById('photo-description').value.trim(),
                categoryId: catId,
                categorySlug: catSlug,
                subcategory: document.getElementById('photo-subcategory').value || null,
                photoDate: document.getElementById('photo-date').value || null,
                displayOrder: parseInt(document.getElementById('photo-order').value, 10) || 0,
                published: document.getElementById('photo-published').checked
            };

            let uploaded = 0;
            try {
                for (let i = 0; i < pendingPhotoFiles.length; i++) {
                    const fileMeta = { ...meta };
                    if (!fileMeta.title && pendingPhotoFiles.length > 1) {
                        fileMeta.title = `Photo ${i + 1}`;
                    } else if (!fileMeta.title) {
                        fileMeta.title = pendingPhotoFiles[i].name.replace(/\.[^.]+$/, '');
                    }
                    fileMeta.displayOrder = meta.displayOrder + i;
                    await MediaService.uploadPhoto(pendingPhotoFiles[i], fileMeta);
                    uploaded++;
                }
                okEl.textContent = `${uploaded} photo(s) uploaded successfully.`;
                okEl.classList.add('show');
                pendingPhotoFiles = [];
                preview.innerHTML = '';
                document.getElementById('photo-upload-form').reset();
                document.getElementById('photo-order').value = '0';
                document.getElementById('photo-published').checked = true;
                await loadPhotos();
            } catch (err) {
                errEl.textContent = err.message;
                errEl.classList.add('show');
            }
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-upload"></i> Upload & Save';
        });
    }

    // ── Video upload ──────────────────────────────────────────
    function setupVideoUpload() {
        const zone = document.getElementById('video-drop-zone');
        const input = document.getElementById('video-file-input');
        const preview = document.getElementById('video-preview-grid');

        zone.addEventListener('click', () => input.click());
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            if (e.dataTransfer.files[0]) setVideoFile(e.dataTransfer.files[0]);
        });
        input.addEventListener('change', () => { if (input.files[0]) setVideoFile(input.files[0]); });

        function setVideoFile(file) {
            if (!MediaService.VIDEO_TYPES.includes(file.type)) return;
            pendingVideoFile = file;
            const url = URL.createObjectURL(file);
            preview.innerHTML = `<div class="preview-item">
                <video src="${url}" muted></video>
                <button type="button" class="remove-preview" id="remove-video">&times;</button>
            </div>`;
            document.getElementById('remove-video').addEventListener('click', () => {
                pendingVideoFile = null;
                preview.innerHTML = '';
            });
        }

        document.getElementById('video-upload-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('video-upload-btn');
            const errEl = document.getElementById('upload-video-error');
            const okEl = document.getElementById('upload-video-success');
            errEl.classList.remove('show');
            okEl.classList.remove('show');

            if (!pendingVideoFile) {
                errEl.textContent = 'Please select a video file.';
                errEl.classList.add('show');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Uploading...';

            const catSelect = document.getElementById('video-category');
            const meta = {
                title: document.getElementById('video-title').value.trim(),
                description: document.getElementById('video-description').value.trim(),
                categoryId: catSelect.value,
                categorySlug: catSelect.options[catSelect.selectedIndex].dataset.slug,
                displayOrder: parseInt(document.getElementById('video-order').value, 10) || 0,
                published: document.getElementById('video-published').checked
            };

            try {
                await MediaService.uploadVideo(pendingVideoFile, meta);
                okEl.textContent = 'Video uploaded successfully.';
                okEl.classList.add('show');
                pendingVideoFile = null;
                preview.innerHTML = '';
                document.getElementById('video-upload-form').reset();
                await loadVideos();
            } catch (err) {
                errEl.textContent = err.message;
                errEl.classList.add('show');
            }
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-upload"></i> Upload & Save';
        });
    }

    // ── Load & render media lists ─────────────────────────────
    async function loadPhotos() {
        const container = document.getElementById('photos-list');
        try {
            const items = await MediaService.getAllMedia({ mediaType: 'photo' });
            if (!items.length) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-camera"></i><p>No photos yet. Upload your first photo!</p></div>';
                return;
            }
            container.innerHTML = items.map(renderMediaCard).join('');
            bindMediaActions(container, 'photo');
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
        }
    }

    async function loadVideos() {
        const container = document.getElementById('videos-list');
        try {
            const items = await MediaService.getAllMedia({ mediaType: 'video' });
            if (!items.length) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-video"></i><p>No videos yet.</p></div>';
                return;
            }
            container.innerHTML = items.map(renderMediaCard).join('');
            bindMediaActions(container, 'video');
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
        }
    }

    function renderMediaCard(item) {
        const thumb = item.thumbnail_url || item.media_url;
        const isVideo = item.media_type === 'video';
        const thumbHtml = isVideo
            ? `<video src="${item.media_url}" muted></video>`
            : `<img src="${thumb}" alt="${item.title}" loading="lazy">`;

        return `<div class="media-card" data-id="${item.id}">
            <div class="media-card-thumb">${thumbHtml}</div>
            <div class="media-card-body">
                <div class="media-card-title">${item.title || 'Untitled'}</div>
                <div class="media-card-meta">${item.categories?.name || '—'} ${item.subcategory ? '· ' + item.subcategory : ''}</div>
                <span class="status-badge ${item.published ? 'published' : 'draft'}">${item.published ? 'Published' : 'Draft'}</span>
                <div class="media-card-actions">
                    <button class="btn btn-sm btn-outline edit-btn" data-id="${item.id}">Edit</button>
                    <button class="btn btn-sm btn-outline toggle-pub-btn" data-id="${item.id}" data-published="${item.published}">
                        ${item.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${item.id}" data-name="${item.title || 'this item'}">Delete</button>
                </div>
            </div>
        </div>`;
    }

    function bindMediaActions(container) {
        container.querySelectorAll('.edit-btn').forEach((btn) => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });
        container.querySelectorAll('.toggle-pub-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const published = btn.dataset.published === 'true';
                await MediaService.updateMedia(btn.dataset.id, { published: !published });
                await loadPhotos();
                await loadVideos();
            });
        });
        container.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                deleteTargetId = btn.dataset.id;
                document.getElementById('delete-item-name').textContent = btn.dataset.name;
                document.getElementById('delete-modal').classList.add('active');
            });
        });
    }

    // ── Edit modal ────────────────────────────────────────────
    async function openEditModal(id) {
        const items = await MediaService.getAllMedia();
        const item = items.find((i) => i.id === id);
        if (!item) return;

        document.getElementById('edit-modal-title').textContent =
            item.media_type === 'video' ? 'Edit Video' : 'Edit Photo';
        document.getElementById('edit-id').value = item.id;
        document.getElementById('edit-title').value = item.title || '';
        document.getElementById('edit-description').value = item.description || '';
        document.getElementById('edit-category').value = item.category_id || '';
        document.getElementById('edit-subcategory').value = item.subcategory || '';
        document.getElementById('edit-date').value = item.photo_date || '';
        document.getElementById('edit-order').value = item.display_order || 0;
        document.getElementById('edit-published').checked = item.published;
        document.getElementById('edit-replace-file').value = '';
        toggleSubcategory('edit-category', 'edit-subcategory-group');
        document.getElementById('edit-error').classList.remove('show');
        document.getElementById('edit-modal').classList.add('active');
    }

    function setupEditModal() {
        document.getElementById('edit-cancel').addEventListener('click', () => {
            document.getElementById('edit-modal').classList.remove('active');
        });

        document.getElementById('edit-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const errEl = document.getElementById('edit-error');

            try {
                await MediaService.updateMedia(id, {
                    title: document.getElementById('edit-title').value.trim(),
                    description: document.getElementById('edit-description').value.trim(),
                    category_id: document.getElementById('edit-category').value,
                    subcategory: document.getElementById('edit-subcategory').value || null,
                    photo_date: document.getElementById('edit-date').value || null,
                    display_order: parseInt(document.getElementById('edit-order').value, 10) || 0,
                    published: document.getElementById('edit-published').checked
                });

                const replaceFile = document.getElementById('edit-replace-file').files[0];
                if (replaceFile) {
                    const items = await MediaService.getAllMedia();
                    const item = items.find((i) => i.id === id);
                    if (item.media_type === 'photo') {
                        await MediaService.replacePhotoFile(id, replaceFile);
                    }
                }

                document.getElementById('edit-modal').classList.remove('active');
                await loadPhotos();
                await loadVideos();
            } catch (err) {
                errEl.textContent = err.message;
                errEl.classList.add('show');
            }
        });
    }

    // ── Delete modal ──────────────────────────────────────────
    function setupDeleteModal() {
        document.getElementById('delete-cancel').addEventListener('click', () => {
            document.getElementById('delete-modal').classList.remove('active');
            deleteTargetId = null;
        });
        document.getElementById('delete-confirm').addEventListener('click', async () => {
            if (!deleteTargetId) return;
            try {
                await MediaService.deleteMedia(deleteTargetId);
                document.getElementById('delete-modal').classList.remove('active');
                deleteTargetId = null;
                await loadPhotos();
                await loadVideos();
            } catch (err) {
                alert('Delete failed: ' + err.message);
            }
        });
    }

    function showMsg(id, text, isError) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text;
        el.classList.add('show');
        if (isError) el.classList.replace('success-msg', 'error-msg');
        setTimeout(() => el.classList.remove('show'), 4000);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
