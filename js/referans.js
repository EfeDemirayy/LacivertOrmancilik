/* index.js – Lacivert Ormancılık
 * --------------------------------------------------------------
 * Tüm sayfalar (index.html + references.html) için tek JS dosyası
 * Güvenli null kontrolleri, DOMContentLoaded koruması eklenmiştir.
 */

(() => {
  'use strict';

  /* ---------------- Helpers ---------------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

  /* -------------- DOM Ready --------------- */
  document.addEventListener('DOMContentLoaded', () => {

    /* ---------- Preloader ---------- */
    const preloader = $('#preloader');
    if (preloader) window.addEventListener('load', () => preloader.classList.add('hide'));

    /* ---------- Global Scroll Logic ---------- */
    const progressBar = $('.progress__bar');
    const nav         = $('.nav');
    const toTopBtn    = $('#toTop');

    const navLinksAll = Array.from($$('.nav__link'));
    const internalLinks = navLinksAll.filter(a => a.getAttribute('href').startsWith('#'));
    const sections = internalLinks.map(l => $(l.getAttribute('href')));

    if (progressBar || nav || toTopBtn || sections.length) {
      window.addEventListener('scroll', () => {
        const y = window.scrollY;

        nav?.classList.toggle('scrolled', y > 50);

        if (progressBar) {
          const docH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          progressBar.style.width = `${(y / docH) * 100}%`;
        }

        toTopBtn?.classList.toggle('show', y > 600);

        sections.forEach((sec, i) => {
          if (!sec) return;
          const top = sec.getBoundingClientRect().top;
          if (top <= 100 && top > -sec.offsetHeight + 100) {
            internalLinks.forEach(l => l.classList.remove('active'));
            internalLinks[i].classList.add('active');
          }
        });
      });
    }

    /* ---------- Burger Menu ---------- */
    const burger   = $('#burger');
    const navLinks = $('#navLinks');
    burger?.addEventListener('click', () => {
      navLinks?.classList.toggle('show');
      burger.classList.toggle('open');
    });

    /* ---------- To‑Top ---------- */
    toTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    /* ---------- Button Ripple ---------- */
    document.addEventListener('click', e => {
      if (e.target.classList.contains('btn')) {
        const btn  = e.target;
        const span = document.createElement('span');
        span.classList.add('ripple');
        btn.appendChild(span);

        const d = Math.max(btn.clientWidth, btn.clientHeight);
        span.style.width = span.style.height = `${d}px`;

        const rect = btn.getBoundingClientRect();
        span.style.left = `${e.clientX - rect.left - d / 2}px`;
        span.style.top  = `${e.clientY - rect.top  - d / 2}px`;

        setTimeout(() => span.remove(), 600);
      }
    });

    /* ---------- GSAP Animations ---------- */
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      $$('[data-fade]').forEach(el => {
        gsap.fromTo(el, { opacity: 0, y: 40 }, {
          opacity: 1, y: 0,
          duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%' }
        });
      });

      $$('[data-count]').forEach(el => {
        const end = +el.dataset.count || 0;
        gsap.fromTo(el, { innerText: 0 }, {
          innerText: end,
          duration: 2,
          ease: 'power1.out',
          snap: { innerText: 0.1 },
          scrollTrigger: { trigger: el, start: 'top 85%' }
        });
      });
    }

    /* ---------- Swiper (Partners) ---------- */
    if (window.Swiper && $('.partners__swiper')) {
      new Swiper('.partners__swiper', {
        slidesPerView: 3,
        loop: true,
        spaceBetween: 30,
        autoplay: { delay: 2000 },
        breakpoints: {
          0   : { slidesPerView: 1 },
          640 : { slidesPerView: 2 },
          1024: { slidesPerView: 3 }
        }
      });
    }

    /* ---------- Typed.js (Hero) ---------- */
    if (window.Typed && $('#typed')) {
      new Typed('#typed', {
        strings: ["Doğayı Yaşa", "Ormanı Koru", "Geleceğe Nefes Ol"],
        typeSpeed: 70,
        backSpeed: 40,
        backDelay: 2000,
        loop: true
      });
    }

    /* ---------- Accordion (FAQ) ---------- */
    $$('.accordion__header').forEach(header => {
      header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        header.classList.toggle('active');
        content.style.maxHeight = header.classList.contains('active')
          ? content.scrollHeight + 'px'
          : null;
      });
    });

    /* ---------- Cookie Consent ---------- */
    const consent = $('#cookieConsent');
    if (consent && !localStorage.getItem('cookiesAccepted')) {
      consent.style.display = 'flex';
      $('#acceptCookies')?.addEventListener('click', () => {
        localStorage.setItem('cookiesAccepted', 'true');
        consent.remove();
      });
    } else {
      consent?.remove();
    }

    /* ==========================================================
       REFERANS MODAL (sadece references.html’de mevcut)
    ========================================================== */
    const refModal = $('#refModal');
    if (refModal) {
      const refCards = $$('.ref-card');
      const refImg   = $('#refModalImg');
      const refTitle = $('#refModalTitle');
      const refText  = $('#refModalText');
      const refClose = $('.ref-modal__close');

      const openModal = card => {
        if (refImg) {
          refImg.src = card.dataset.img || '';
          refImg.alt = card.dataset.title || '';
        }
        if (refTitle) refTitle.textContent = card.dataset.title || '';
        if (refText)  refText.textContent  = card.dataset.text || '';

        refModal.classList.add('show');
        document.body.style.overflow = 'hidden';
      };

      const closeModal = () => {
        refModal.classList.remove('show');
        document.body.style.overflow = '';
      };

      refCards.forEach(card => card.addEventListener('click', () => openModal(card)));
      refClose?.addEventListener('click', closeModal);
      refModal.addEventListener('click', e => { if (e.target === refModal) closeModal(); });
      window.addEventListener('keydown', e => { if (e.key === 'Escape' && refModal.classList.contains('show')) closeModal(); });
    }
  });
})();
