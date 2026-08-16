# Vivek Kumthe — Photography Portfolio

Professional photography portfolio for Vivek Kumthe (Luciffer Photography).

## Live Site

Hosted on GitHub Pages. The public site is fully static; content is managed through Supabase.

## Admin CMS

Manage photos, videos, and categories from any device:

- **Login:** `/admin`
- **Dashboard:** `/admin/dashboard`

## Setup

See **[SETUP.md](SETUP.md)** for complete Supabase configuration instructions.

Quick start:

1. Create a Supabase project
2. Run `supabase/schema.sql` in the SQL Editor
3. Ensure `config.js` contains your Supabase URL and anon/publishable key (this file is committed for GitHub Pages)
4. Create an admin user in Supabase Auth and grant admin role (see SETUP.md)
5. Deploy to GitHub Pages

## Project Structure

```
├── index.html              Homepage
├── nature.html             Nature photography gallery
├── config.js               Supabase credentials (anon key only)
├── admin/
│   ├── index.html          Admin login
│   └── dashboard.html      Admin dashboard
├── js/
│   ├── supabase-client.js  Supabase initialization
│   ├── media-service.js    Upload, edit, delete, auth
│   ├── portfolio-loader.js Dynamic homepage portfolio
│   └── nature-gallery.js   Dynamic nature gallery
└── supabase/
    └── schema.sql          Database schema + RLS policies
```
