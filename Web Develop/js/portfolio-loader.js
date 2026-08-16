/**
 * Dynamic portfolio loader for index.html
 */
(function () {
    'use strict';

    const FILTER_MAP = {
        all: null,
        portrait: 'portraits',
        landscape: 'travel',
        fashion: 'other',
        event: 'events'
    };

    const FALLBACK_PORTFOLIO = [
        {
            title: 'Nature',
            tag: 'Nature',
            category: 'nature',
            link: 'nature.html',
            img: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1000&q=85',
            isLink: true
        },
        {
            title: 'Velvet Frame',
            tag: 'Fashion',
            category: 'fashion',
            img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=85'
        },
        {
            title: 'Golden Horizon',
            tag: 'Landscape',
            category: 'landscape',
            img: 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1000&q=85'
        },
        {
            title: 'Afterglow',
            tag: 'Event',
            category: 'event',
            img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=85'
        },
        {
            title: 'Stillness',
            tag: 'Portrait',
            category: 'portrait',
            img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1000&q=85'
        },
        {
            title: 'Night Drift',
            tag: 'Landscape',
            category: 'landscape',
            img: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1000&q=85'
        }
    ];

    function slugToFilter(slug) {
        for (const [filter, catSlug] of Object.entries(FILTER_MAP)) {
            if (catSlug === slug) return filter;
        }
        if (slug === 'nature') return 'landscape';
        return 'all';
    }

    function buildPhotoCard(item, index) {
        const isNature = item.categories?.slug === 'nature' || item.isLink;
        const tag = item.categories?.name || item.tag || 'Photo';
        const title = item.title || 'Untitled';
        const imgSrc = item.thumbnail_url || item.media_url || item.img;
        const filterCat = item.dataCategory || slugToFilter(item.categories?.slug) || 'portrait';

        const wrapper = document.createElement(isNature ? 'a' : 'div');
        wrapper.className = 'photo';
        wrapper.setAttribute('data-category', filterCat);
        if (isNature) {
            wrapper.href = 'nature.html';
            wrapper.classList.add('photo-link');
            wrapper.id = 'nature-portfolio-card';
        } else {
            wrapper.setAttribute('data-media-id', item.id || '');
            wrapper.setAttribute('data-full-url', item.media_url || item.img);
        }

        const iconClass = isNature ? 'fa-external-link-alt' : 'fa-expand';
        wrapper.innerHTML = `
            <img src="${imgSrc}" alt="${title}" loading="lazy">
            <div class="photo-overlay"><i class="fas ${iconClass}"></i></div>
            <div class="photo-meta">
                <span class="photo-tag">${tag}</span>
                <span class="photo-title">${title}</span>
            </div>
        `;
        return wrapper;
    }

    async function loadPortfolio() {
        const gallery = document.querySelector('.gallery');
        if (!gallery) return;

        if (!window.PortfolioDB?.isConfigured()) {
            console.info('Supabase not configured — using static portfolio fallback.');
            return;
        }

        try {
            const items = await window.MediaService.getPublishedMedia({ mediaType: 'photo' });
            if (!items || items.length === 0) return;

            const natureItems = items.filter((i) => i.categories?.slug === 'nature');
            const otherItems = items.filter((i) => i.categories?.slug !== 'nature');
            const natureCard = document.getElementById('nature-portfolio-card');

            if (natureItems.length > 0 && natureCard) {
                const featured = natureItems[0];
                const img = natureCard.querySelector('img');
                img.src = featured.thumbnail_url || featured.media_url;
                img.alt = featured.title || 'Nature Photography';
                natureCard.querySelector('.photo-title').textContent = featured.title || 'Nature';
            }

            if (otherItems.length > 0) {
                document.querySelectorAll('.gallery .photo:not(.photo-link)').forEach((el) => el.remove());
                otherItems.forEach((item) => {
                    gallery.appendChild(buildPhotoCard({
                        ...item,
                        dataCategory: slugToFilter(item.categories?.slug)
                    }));
                });
            }

            window.dispatchEvent(new CustomEvent('portfolio-loaded'));
        } catch (err) {
            console.error('Portfolio load error:', err.message);
        }
    }

    document.addEventListener('DOMContentLoaded', loadPortfolio);
})();
