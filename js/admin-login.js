/**
 * Shared admin login logic for homepage modal and /admin/ fallback page.
 * Uses MediaService.signIn / signOut — no duplicate auth system.
 */
(function () {
    'use strict';

    function getDashboardUrl() {
        return window.location.pathname.includes('/admin/')
            ? 'dashboard.html'
            : 'admin/dashboard.html';
    }

    async function prepareLogin() {
        if (!window.PortfolioDB?.isConfigured()) {
            throw new Error(
                'Supabase is not configured. Copy config.example.js to config.js and add your credentials. See SETUP.md.'
            );
        }
        try {
            await MediaService.signOut();
        } catch (_) { /* no active session to clear */ }
    }

    async function performLogin(email, password) {
        await MediaService.signIn(email, password);
        window.location.href = getDashboardUrl();
    }

    function initHomepageModal() {
        const modal = document.getElementById('admin-login-modal');
        if (!modal) return;

        const trigger = document.getElementById('admin-login-trigger');
        const closeBtn = document.getElementById('admin-login-close');
        const backdrop = document.getElementById('admin-login-backdrop');
        const form = document.getElementById('admin-login-form');
        const errorMsg = document.getElementById('admin-login-error');
        const loginBtn = document.getElementById('admin-login-btn');
        const emailInput = document.getElementById('admin-login-email');
        const passwordInput = document.getElementById('admin-login-password');

        function openModal() {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            errorMsg.classList.remove('show');
            errorMsg.textContent = '';
            form.reset();
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';

            prepareLogin().catch((err) => {
                errorMsg.textContent = err.message;
                errorMsg.classList.add('show');
                loginBtn.disabled = true;
            });

            document.getElementById('hamburger')?.classList.remove('active');
            document.querySelector('nav ul')?.classList.remove('mobile-active');

            setTimeout(() => emailInput?.focus(), 100);
        }

        function closeModal() {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            errorMsg.classList.remove('show');
            errorMsg.textContent = '';
            form.reset();
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }

        trigger?.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });

        closeBtn?.addEventListener('click', closeModal);
        backdrop?.addEventListener('click', closeModal);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMsg.classList.remove('show');
            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';

            try {
                await performLogin(emailInput.value.trim(), passwordInput.value);
            } catch (err) {
                errorMsg.textContent = err.message || 'Login failed. Check your credentials.';
                errorMsg.classList.add('show');
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        });
    }

    function initStandalonePage() {
        const form = document.getElementById('login-form');
        if (!form) return;

        const errorMsg = document.getElementById('error-msg');
        const loginBtn = document.getElementById('login-btn');

        prepareLogin().catch((err) => {
            errorMsg.textContent = err.message;
            errorMsg.classList.add('show');
            loginBtn.disabled = true;
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMsg.classList.remove('show');
            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';

            try {
                await performLogin(
                    document.getElementById('email').value.trim(),
                    document.getElementById('password').value
                );
            } catch (err) {
                errorMsg.textContent = err.message || 'Login failed. Check your credentials.';
                errorMsg.classList.add('show');
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        });
    }

    window.AdminLogin = {
        prepareLogin,
        performLogin,
        getDashboardUrl
    };

    document.addEventListener('DOMContentLoaded', () => {
        initHomepageModal();
        initStandalonePage();
    });
})();
