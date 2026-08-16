/**
 * Media and category CRUD operations via Supabase.
 */
(function () {
    'use strict';

    const PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const VIDEO_TYPES = ['video/mp4', 'video/webm'];
    const THUMB_MAX = 600;

    function db() {
        return window.PortfolioDB.getClient();
    }

    // ── Public reads ──────────────────────────────────────────

    async function getCategories() {
        const { data, error } = await db()
            .from('categories')
            .select('*')
            .order('display_order', { ascending: true });
        if (error) throw error;
        return data;
    }

    async function getPublishedMedia(opts = {}) {
        let query = db()
            .from('media')
            .select('*, categories(name, slug)')
            .eq('published', true)
            .order('display_order', { ascending: true });

        if (opts.mediaType) query = query.eq('media_type', opts.mediaType);
        if (opts.categorySlug) {
            const cats = await getCategories();
            const cat = cats.find((c) => c.slug === opts.categorySlug);
            if (cat) query = query.eq('category_id', cat.id);
        }
        if (opts.subcategory) query = query.eq('subcategory', opts.subcategory);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async function getAllMedia(opts = {}) {
        let query = db()
            .from('media')
            .select('*, categories(name, slug)')
            .order('display_order', { ascending: true });

        if (opts.mediaType) query = query.eq('media_type', opts.mediaType);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    // ── Admin auth ────────────────────────────────────────────

    async function signIn(email, password) {
        const { data, error } = await db().auth.signInWithPassword({ email, password });
        if (error) throw error;
        const isAdmin = await checkIsAdmin(data.user.id);
        if (!isAdmin) {
            await db().auth.signOut();
            throw new Error('Access denied. This account is not authorized as admin.');
        }
        return data;
    }

    async function signOut() {
        const { error } = await db().auth.signOut();
        if (error) throw error;
    }

    async function getSession() {
        const { data } = await db().auth.getSession();
        return data.session;
    }

    async function checkIsAdmin(userId) {
        if (!userId) return false;
        const { data, error } = await db()
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .maybeSingle();
        if (error) return false;
        return data?.is_admin === true;
    }

    async function requireAdmin() {
        const session = await getSession();
        if (!session) throw new Error('Not authenticated');
        const isAdmin = await checkIsAdmin(session.user.id);
        if (!isAdmin) throw new Error('Not authorized');
        return session;
    }

    // ── Thumbnail generation ──────────────────────────────────

    function createThumbnail(file, maxSize = THUMB_MAX) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(
                    (blob) => (blob ? resolve(blob) : reject(new Error('Thumbnail failed'))),
                    'image/jpeg',
                    0.82
                );
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Could not load image for thumbnail'));
            };
            img.src = url;
        });
    }

    // ── Storage upload ────────────────────────────────────────

    function storagePath(bucket, categorySlug, filename) {
        const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const ts = Date.now();
        return `${categorySlug || 'other'}/${ts}_${safe}`;
    }

    async function uploadFile(bucket, path, file) {
        const { error } = await db().storage.from(bucket).upload(path, file, {
            cacheControl: '3600',
            upsert: false
        });
        if (error) throw error;
        const { data } = db().storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    }

    async function deleteStorageFile(bucket, path) {
        if (!path) return;
        const { error } = await db().storage.from(bucket).remove([path]);
        if (error) console.warn('Storage delete warning:', error.message);
    }

    // ── Media CRUD ────────────────────────────────────────────

    async function uploadPhoto(file, meta) {
        await requireAdmin();
        const bucket = 'photos';
        const path = storagePath(bucket, meta.categorySlug, file.name);
        const mediaUrl = await uploadFile(bucket, path, file);

        let thumbUrl = null;
        let thumbPath = null;
        if (PHOTO_TYPES.includes(file.type)) {
            try {
                const thumbBlob = await createThumbnail(file);
                thumbPath = path.replace(/(\.[^.]+)$/, '_thumb.jpg');
                thumbUrl = await uploadFile(bucket, thumbPath, thumbBlob);
            } catch (e) {
                console.warn('Thumbnail skipped:', e.message);
                thumbUrl = mediaUrl;
            }
        }

        const { data, error } = await db()
            .from('media')
            .insert({
                title: meta.title || '',
                description: meta.description || '',
                media_url: mediaUrl,
                thumbnail_url: thumbUrl || mediaUrl,
                storage_path: path,
                media_type: 'photo',
                category_id: meta.categoryId,
                subcategory: meta.subcategory || null,
                display_order: meta.displayOrder ?? 0,
                published: meta.published ?? false,
                photo_date: meta.photoDate || null
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async function uploadVideo(file, meta) {
        await requireAdmin();
        const bucket = 'videos';
        const path = storagePath(bucket, meta.categorySlug, file.name);
        const mediaUrl = await uploadFile(bucket, path, file);

        const { data, error } = await db()
            .from('media')
            .insert({
                title: meta.title || '',
                description: meta.description || '',
                media_url: mediaUrl,
                thumbnail_url: meta.thumbnailUrl || null,
                storage_path: path,
                media_type: 'video',
                category_id: meta.categoryId,
                subcategory: meta.subcategory || null,
                display_order: meta.displayOrder ?? 0,
                published: meta.published ?? false,
                photo_date: meta.photoDate || null
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async function updateMedia(id, updates) {
        await requireAdmin();
        const { data, error } = await db()
            .from('media')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async function replacePhotoFile(id, file) {
        await requireAdmin();
        const { data: existing, error: fetchErr } = await db()
            .from('media')
            .select('*, categories(slug)')
            .eq('id', id)
            .single();
        if (fetchErr) throw fetchErr;

        const bucket = 'photos';
        const categorySlug = existing.categories?.slug || 'other';
        const path = storagePath(bucket, categorySlug, file.name);
        const mediaUrl = await uploadFile(bucket, path, file);

        let thumbUrl = mediaUrl;
        try {
            const thumbBlob = await createThumbnail(file);
            const thumbPath = path.replace(/(\.[^.]+)$/, '_thumb.jpg');
            thumbUrl = await uploadFile(bucket, thumbPath, thumbBlob);
        } catch (_) { /* use full image */ }

        await deleteStorageFile(bucket, existing.storage_path);

        return updateMedia(id, {
            media_url: mediaUrl,
            thumbnail_url: thumbUrl,
            storage_path: path
        });
    }

    async function deleteMedia(id) {
        await requireAdmin();
        const { data: item, error: fetchErr } = await db()
            .from('media')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchErr) throw fetchErr;

        const bucket = item.media_type === 'video' ? 'videos' : 'photos';
        await deleteStorageFile(bucket, item.storage_path);

        const { error } = await db().from('media').delete().eq('id', id);
        if (error) throw error;
    }

    // ── Category CRUD ─────────────────────────────────────────

    async function createCategory(name, slug, displayOrder) {
        await requireAdmin();
        const { data, error } = await db()
            .from('categories')
            .insert({ name, slug, display_order: displayOrder })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async function updateCategory(id, updates) {
        await requireAdmin();
        const { data, error } = await db()
            .from('categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async function deleteCategory(id) {
        await requireAdmin();
        const { error } = await db().from('categories').delete().eq('id', id);
        if (error) throw error;
    }

    // Nature subcategories for the gallery page
    const NATURE_SUBCATEGORIES = [
        'Sunsets & Evenings',
        'Sunrise',
        'Forests & Trees',
        'Clouds & Sky',
        'Night Photography',
        'Rain & Monsoon',
        'Landscapes'
    ];

    window.MediaService = {
        PHOTO_TYPES,
        VIDEO_TYPES,
        NATURE_SUBCATEGORIES,
        getCategories,
        getPublishedMedia,
        getAllMedia,
        signIn,
        signOut,
        getSession,
        checkIsAdmin,
        requireAdmin,
        uploadPhoto,
        uploadVideo,
        updateMedia,
        replacePhotoFile,
        deleteMedia,
        createCategory,
        updateCategory,
        deleteCategory,
        createThumbnail
    };
})();
