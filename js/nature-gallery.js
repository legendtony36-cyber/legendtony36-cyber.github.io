/**
 * Dynamic nature gallery loader for nature.html
 */
(function () {
    'use strict';

    const CATEGORY_MAP = {
        'Sunsets & Evenings': 'sunsets-evenings',
        'Sunrise': 'sunrise',
        'Forests & Trees': 'forests-trees',
        'Clouds & Sky': 'clouds-sky',
        'Night Photography': 'night-photography',
        'Rain & Monsoon': 'rain-monsoon',
        'Landscapes': 'landscapes'
    };

    const FALLBACK_DATA = [
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.35 AM (1).jpeg', category: 'Sunsets & Evenings', title: 'Golden Rail Sunset' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.35 AM (2).jpeg', category: 'Sunsets & Evenings', title: 'Dusk Horizon' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.35 AM.jpeg', category: 'Sunsets & Evenings', title: 'Evening Glow' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.36 AM (1).jpeg', category: 'Sunsets & Evenings', title: 'Bridge at Dusk' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.36 AM (2).jpeg', category: 'Sunsets & Evenings', title: 'Orange Sky' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.36 AM.jpeg', category: 'Sunsets & Evenings', title: 'Clouded Twilight' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.37 AM (1).jpeg', category: 'Clouds & Sky', title: 'Soft Cloud Drift' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.37 AM (2).jpeg', category: 'Night Photography', title: 'Moonlit Silhouette' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.37 AM.jpeg', category: 'Night Photography', title: 'Night Calm' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.38 AM (1).jpeg', category: 'Night Photography', title: 'Moon Through the Trees' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.38 AM (2).jpeg', category: 'Night Photography', title: 'Quiet Night Sky' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.38 AM.jpeg', category: 'Forests & Trees', title: 'Canopy Under Moonlight' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.39 AM (1).jpeg', category: 'Landscapes', title: 'City Skyline at Dusk' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.39 AM.jpeg', category: 'Clouds & Sky', title: 'Stormy Evening Air' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.40 AM (1).jpeg', category: 'Landscapes', title: 'Night Road View' },
        { file: 'images/WhatsApp Image 2026-08-15 at 12.27.40 AM.jpeg', category: 'Clouds & Sky', title: 'Evening Sky Layers' }
    ];

    function buildCard(item, index) {
        const card = document.createElement('article');
        card.className = 'nature-card';
        card.setAttribute('aria-label', `${item.title} photograph`);
        card.style.animationDelay = `${index * 70}ms`;

        const imageUrl = item.media_url || encodeURI(item.file);
        const fullUrl = item.media_url || encodeURI(item.file);
        const category = item.subcategory || item.category;
        const title = item.title;

        card.innerHTML = `
            <a class="download-link" href="${fullUrl}" download aria-label="Download ${title}">⬇ Download</a>
            <img src="${item.thumbnail_url || imageUrl}" alt="${title}" loading="lazy" data-full="${fullUrl}">
            <div class="card-overlay">
                <div class="card-meta">
                    <span class="card-tag">${category}</span>
                    <span class="card-title">${title}</span>
                </div>
            </div>
        `;
        return card;
    }

    function buildFromFallback() {
        const sections = document.querySelectorAll('.gallery-section');
        sections.forEach((section) => {
            const gallery = section.querySelector('.nature-gallery');
            const items = FALLBACK_DATA.filter((item) => CATEGORY_MAP[item.category] === section.id);
            items.forEach((item, index) => gallery.appendChild(buildCard(item, index)));
        });
        initLightbox();
    }

    async function loadNatureGallery() {
        if (!window.PortfolioDB?.isConfigured()) {
            buildFromFallback();
            return;
        }

        try {
            const items = await window.MediaService.getPublishedMedia({
                mediaType: 'photo',
                categorySlug: 'nature'
            });

            if (!items || items.length === 0) {
                buildFromFallback();
                return;
            }

            const sections = document.querySelectorAll('.gallery-section');
            sections.forEach((section) => {
                const gallery = section.querySelector('.nature-gallery');
                gallery.innerHTML = '';
                const sectionItems = items.filter(
                    (item) => CATEGORY_MAP[item.subcategory] === section.id
                );
                sectionItems.forEach((item, index) => gallery.appendChild(buildCard(item, index)));
            });

            initLightbox();
        } catch (err) {
            console.error('Nature gallery load error:', err.message);
            buildFromFallback();
        }
    }

    function initLightbox() {
        const lightbox = document.getElementById('lightbox');
        const lightboxImage = document.querySelector('.lightbox-image');
        const lightboxCurrent = document.getElementById('lightbox-current');
        const lightboxTotal = document.getElementById('lightbox-total');
        const closeButton = document.querySelector('.lightbox-close');
        const prevButton = document.querySelector('.lightbox-prev');
        const nextButton = document.querySelector('.lightbox-next');
        let currentIndex = 0;

        const cards = Array.from(document.querySelectorAll('.nature-card')).map((card) => ({
            src: card.querySelector('img').dataset.full || card.querySelector('img').src,
            alt: card.querySelector('img').alt
        }));

        function updateLightbox() {
            const item = cards[currentIndex];
            if (!item) return;
            lightboxImage.src = item.src;
            lightboxImage.alt = item.alt;
            lightboxCurrent.textContent = currentIndex + 1;
            lightboxTotal.textContent = cards.length;
        }

        function openLightbox(index) {
            currentIndex = index;
            updateLightbox();
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }

        document.querySelectorAll('.nature-card').forEach((card, index) => {
            card.addEventListener('click', (event) => {
                if (event.target.closest('.download-link')) return;
                openLightbox(index);
            });
        });

        closeButton.addEventListener('click', closeLightbox);
        prevButton.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + cards.length) % cards.length;
            updateLightbox();
        });
        nextButton.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % cards.length;
            updateLightbox();
        });

        lightbox.addEventListener('click', (event) => {
            if (event.target === lightbox) closeLightbox();
        });

        document.addEventListener('keydown', (event) => {
            if (!lightbox.classList.contains('active')) return;
            if (event.key === 'Escape') closeLightbox();
            if (event.key === 'ArrowRight') {
                currentIndex = (currentIndex + 1) % cards.length;
                updateLightbox();
            }
            if (event.key === 'ArrowLeft') {
                currentIndex = (currentIndex - 1 + cards.length) % cards.length;
                updateLightbox();
            }
        });

        let touchStartX = 0;
        let touchStartY = 0;
        document.addEventListener('touchstart', (event) => {
            const touch = event.changedTouches[0];
            touchStartX = touch.screenX;
            touchStartY = touch.screenY;
        }, { passive: true });

        document.addEventListener('touchend', (event) => {
            if (!lightbox.classList.contains('active')) return;
            const touch = event.changedTouches[0];
            const diffX = touch.screenX - touchStartX;
            const diffY = touch.screenY - touchStartY;
            if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
                currentIndex = diffX < 0
                    ? (currentIndex + 1) % cards.length
                    : (currentIndex - 1 + cards.length) % cards.length;
                updateLightbox();
            }
        }, { passive: true });
    }

    document.addEventListener('DOMContentLoaded', loadNatureGallery);
})();
