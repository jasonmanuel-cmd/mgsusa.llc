/**
 * Lazy Load Module for mgsusa.llc
 * - IntersectionObserver-based image lazy loading
 * - Automatic detection of <img> tags with data-src
 * - Fallback for older browsers
 * - Performance optimized
 */

(function() {
  'use strict';

  // Detect support
  const supportsIntersectionObserver = 'IntersectionObserver' in window;

  // IntersectionObserver options
  const observerOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01
  };

  function lazyLoadImages() {
    if (!supportsIntersectionObserver) {
      // Fallback: load all images immediately
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
      return;
    }

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          
          // Load image
          if (img.dataset.src) {
            img.src = img.dataset.src;
          }
          
          // Load srcset if present
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
          }
          
          // Mark as loaded
          img.classList.add('lazy-loaded');
          img.removeAttribute('data-src');
          img.removeAttribute('data-srcset');
          
          // Stop observing this image
          observer.unobserve(img);
        }
      });
    }, observerOptions);

    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // Lazy load backgrounds for sections
  function lazyLoadBackgrounds() {
    if (!supportsIntersectionObserver) {
      document.querySelectorAll('[data-bg]').forEach(el => {
        el.style.backgroundImage = `url('${el.dataset.bg}')`;
        el.removeAttribute('data-bg');
      });
      return;
    }

    const bgObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          if (el.dataset.bg) {
            el.style.backgroundImage = `url('${el.dataset.bg}')`;
            el.classList.add('bg-loaded');
            el.removeAttribute('data-bg');
            observer.unobserve(el);
          }
        }
      });
    }, observerOptions);

    document.querySelectorAll('[data-bg]').forEach(el => {
      bgObserver.observe(el);
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      lazyLoadImages();
      lazyLoadBackgrounds();
    });
  } else {
    lazyLoadImages();
    lazyLoadBackgrounds();
  }
})();
