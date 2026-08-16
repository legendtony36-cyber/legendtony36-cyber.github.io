/**
 * Supabase client initialization.
 * Requires config.js (copy from config.example.js) and Supabase CDN.
 */
(function () {
    'use strict';

    let client = null;

    function getConfig() {
        if (!window.SUPABASE_CONFIG) {
            throw new Error(
                'Supabase not configured. Copy config.example.js to config.js and add your credentials. See SETUP.md.'
            );
        }
        const { url, anonKey } = window.SUPABASE_CONFIG;
        const isPlaceholderUrl = !url || url.includes('YOUR_PROJECT');
        const isPlaceholderKey = !anonKey || anonKey.includes('YOUR_SUPABASE') || anonKey.includes('YOUR_PROJECT');
        if (isPlaceholderUrl || isPlaceholderKey) {
            throw new Error('Supabase credentials are not set. Edit config.js with your project URL and anon/publishable key.');
        }
        return { url, anonKey };
    }

    function getClient() {
        if (client) return client;
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase JS library not loaded. Include the CDN script before this file.');
        }
        const { url, anonKey } = getConfig();
        client = supabase.createClient(url, anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
        return client;
    }

    function isConfigured() {
        try {
            getConfig();
            return true;
        } catch {
            return false;
        }
    }

    window.PortfolioDB = {
        getClient,
        isConfigured
    };
})();
