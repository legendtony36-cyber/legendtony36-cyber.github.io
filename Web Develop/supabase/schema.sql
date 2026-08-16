-- ============================================================
-- Vivek Kumthe Photography Portfolio - Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default categories
INSERT INTO categories (name, slug, display_order) VALUES
    ('Nature', 'nature', 1),
    ('Portraits', 'portraits', 2),
    ('Events', 'events', 3),
    ('Travel', 'travel', 4),
    ('Other', 'other', 5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- MEDIA TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    storage_path TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    subcategory TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    photo_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_category ON media(category_id);
CREATE INDEX IF NOT EXISTS idx_media_published ON media(published);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_display_order ON media(display_order);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS media_updated_at ON media;
CREATE TRIGGER media_updated_at
    BEFORE UPDATE ON media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PROFILES TABLE (Admin role management)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CATEGORIES policies
CREATE POLICY "Public can view categories"
    ON categories FOR SELECT
    USING (TRUE);

CREATE POLICY "Admin can insert categories"
    ON categories FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admin can update categories"
    ON categories FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admin can delete categories"
    ON categories FOR DELETE
    USING (is_admin());

-- MEDIA policies
CREATE POLICY "Public can view published media"
    ON media FOR SELECT
    USING (published = TRUE OR is_admin());

CREATE POLICY "Admin can insert media"
    ON media FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admin can update media"
    ON media FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admin can delete media"
    ON media FOR DELETE
    USING (is_admin());

-- PROFILES policies
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id OR is_admin());

CREATE POLICY "Admin can update profiles"
    ON profiles FOR UPDATE
    USING (is_admin());

-- ============================================================
-- STORAGE BUCKETS
-- Run these in Supabase Dashboard → Storage, or via SQL:
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('photos', 'photos', TRUE, 52428800, ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
    ('videos', 'videos', TRUE, 209715200, ARRAY['video/mp4','video/webm'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, admin write
CREATE POLICY "Public can view photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'photos');

CREATE POLICY "Public can view videos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'videos');

CREATE POLICY "Admin can upload photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'photos' AND is_admin());

CREATE POLICY "Admin can update photos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'photos' AND is_admin());

CREATE POLICY "Admin can delete photos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'photos' AND is_admin());

CREATE POLICY "Admin can upload videos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'videos' AND is_admin());

CREATE POLICY "Admin can update videos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'videos' AND is_admin());

CREATE POLICY "Admin can delete videos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'videos' AND is_admin());

-- ============================================================
-- AFTER CREATING YOUR ADMIN USER (see SETUP.md):
-- Run this to grant admin access (replace YOUR_USER_UUID):
--
-- INSERT INTO profiles (id, is_admin) VALUES ('YOUR_USER_UUID', TRUE);
-- ============================================================
