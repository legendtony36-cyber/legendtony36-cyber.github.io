# Photography Portfolio CMS — Setup Guide

This guide walks you through connecting your Vivek Kumthe photography website to Supabase so you can manage photos, videos, and categories from your phone or computer at `/admin`.

---

## Architecture

```
Visitor (Mobile/PC)  →  GitHub Pages  →  Supabase (Database + Storage)
Admin (Mobile/PC)    →  /admin        →  Supabase Auth  →  Dashboard
```

No server required. Your PC does not need to stay running.

---

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up / log in.
2. Click **New Project**.
3. Choose a name (e.g. `vivek-photography`), set a database password, and pick a region close to you.
4. Wait for the project to finish provisioning.

---

## Step 2: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**.
2. Click **New query**.
3. Open the file `supabase/schema.sql` from this project and copy its entire contents.
4. Paste into the SQL Editor and click **Run**.
5. Confirm there are no errors. This creates:
   - `categories` table (with default categories: Nature, Portraits, Events, Travel, Other)
   - `media` table (photos and videos)
   - `profiles` table (admin role)
   - Storage buckets (`photos`, `videos`)
   - Row Level Security policies

---

## Step 3: Configure Your Credentials

1. In Supabase, go to **Project Settings → API**.
2. Copy your **Project URL** and **anon public** key.
3. Open `config.js` and set your **Project URL** and **anon/publishable** key (safe to commit — public credentials only):

```javascript
window.SUPABASE_CONFIG = {
    url: 'https://abcdefghijklmnop.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

> **Important:** Only use the **anon** or **publishable** (public) key in `config.js`. This file is deployed to GitHub Pages. Never put the **service_role** key, secret key, or database password in frontend code.

---

## Step 4: Create Your Admin Account

1. In Supabase, go to **Authentication → Users**.
2. Click **Add user → Create new user**.
3. Enter your email and a strong password. This is your admin login.
4. After creating the user, click on the user row and copy their **User UID** (a UUID like `a1b2c3d4-...`).
5. Go back to **SQL Editor** and run:

```sql
INSERT INTO profiles (id, is_admin)
VALUES ('PASTE_YOUR_USER_UUID_HERE', TRUE);
```

Replace `PASTE_YOUR_USER_UUID_HERE` with the UUID you copied.

---

## Step 5: Verify Storage Buckets

1. Go to **Storage** in Supabase.
2. Confirm two buckets exist: `photos` and `videos`.
3. Both should be set to **Public** (the schema creates them this way).

Storage structure when you upload:

```
photos/
  nature/
  portraits/
  events/
  travel/
  other/

videos/
  nature/
  events/
  other/
```

---

## Step 6: Deploy to GitHub Pages

1. Push your project to GitHub.
2. Go to your repository **Settings → Pages**.
3. Set the source to your main branch (root or `/docs` depending on your setup).
4. If your site files are in the `Web Develop` folder, either:
   - Move them to the repository root, **or**
   - Set GitHub Pages to publish from that folder.

Your site will be live at `https://yourusername.github.io/`.

---

## Step 7: Test Everything

### Public site
- [ ] Homepage loads with portfolio cards
- [ ] Nature card links to `nature.html`
- [ ] Nature gallery shows photos (after uploading)

### Admin
- [ ] Go to `yoursite.com/admin`
- [ ] Log in with your admin email and password
- [ ] Upload a photo (Category: Nature, pick a subcategory)
- [ ] Check "Publish immediately"
- [ ] Confirm it appears on `nature.html` and the homepage Nature card

### Security
- [ ] Log out — dashboard should redirect to login
- [ ] Visiting `/admin/dashboard` while logged out should redirect to login
- [ ] Visitors cannot upload or delete from the public site

---

## Using the Admin Dashboard

### Upload a photo from your phone

1. Open `yoursite.com/admin` in your mobile browser.
2. Log in.
3. Tap **Upload Photo**.
4. Tap the upload zone → choose photos from your gallery.
5. Enter a title, select **Nature** as category, pick a subcategory (e.g. "Sunsets & Evenings").
6. Check **Publish immediately**.
7. Tap **Upload & Save**.

The photo appears on your public site immediately.

### Manage photos

- **Photos** tab: view all uploads with thumbnails, edit, publish/unpublish, delete.
- **Edit**: change title, description, category, date, display order, replace file.
- **Delete**: permanent — confirms before deleting from database and storage.

### Manage videos

- **Upload Video**: MP4 or WEBM files.
- **Videos** tab: same edit/publish/delete controls as photos.

### Manage categories

- **Categories** tab: rename, reorder, add new, or delete categories.
- Default categories: Nature, Portraits, Events, Travel, Other.

---

## Nature Page Subcategories

When uploading Nature photos, choose one of these subcategories so they appear in the correct gallery section on `nature.html`:

| Subcategory         | Section on nature.html   |
|---------------------|--------------------------|
| Sunsets & Evenings  | 🌄 Sunsets & Evenings    |
| Sunrise             | 🌅 Sunrise               |
| Forests & Trees     | 🌿 Forests & Trees       |
| Clouds & Sky        | ☁️ Clouds & Sky          |
| Night Photography   | 🌙 Night Photography     |
| Rain & Monsoon      | 🌧 Rain & Monsoon        |
| Landscapes          | 🏞 Landscapes            |

---

## Security Summary

| Who              | Can view published content | Can upload/edit/delete |
|------------------|---------------------------|------------------------|
| Public visitors  | Yes                       | No                     |
| Logged-in admin  | Yes (including drafts)    | Yes                    |
| Non-admin users  | Published only            | No                     |

- Row Level Security (RLS) enforces these rules at the database level.
- Storage policies restrict uploads to admin users only.
- The service-role key is never used in frontend code.

---

## Troubleshooting

### "Supabase is not configured"
Edit `config.js` with your real Project URL and anon key.

### "Access denied. This account is not authorized as admin."
Run the `INSERT INTO profiles` SQL from Step 4 with your user's UUID.

### Photos upload but don't appear on the site
- Check that **Publish immediately** was checked, or publish from the Photos tab.
- For Nature photos, make sure a **subcategory** was selected.
- Hard-refresh the page (Ctrl+Shift+R).

### Upload fails with a storage error
- Confirm `photos` and `videos` buckets exist in Supabase Storage.
- Re-run the storage section of `schema.sql` if buckets are missing.

### Login works but dashboard redirects back to login
- Verify the `profiles` row exists with `is_admin = TRUE` for your user UUID.

---

## File Reference

| File | Purpose |
|------|---------|
| `config.js` | Your Supabase URL and anon key |
| `config.example.js` | Template for config.js |
| `supabase/schema.sql` | Database tables, RLS, storage policies |
| `js/supabase-client.js` | Supabase client initialization |
| `js/media-service.js` | Upload, edit, delete, auth functions |
| `js/portfolio-loader.js` | Dynamic homepage portfolio |
| `js/nature-gallery.js` | Dynamic nature page gallery |
| `admin/index.html` | Admin login page |
| `admin/dashboard.html` | Admin dashboard |
| `admin/admin.css` | Admin panel styles |

---

## Migrating Existing Nature Photos

Your existing nature photos are referenced in `js/nature-gallery.js` as fallback data. To move them to Supabase:

1. Log in to the admin dashboard.
2. For each photo, use **Upload Photo** with category **Nature** and the matching subcategory.
3. Once all photos are uploaded and published, the site will load from Supabase automatically.
4. The local `images/` folder is no longer needed for new content.

---

*You can now manage your entire photography portfolio from any device — no VS Code or AI agent required.*
