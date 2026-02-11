/* index.js – Lacivert Ormancılık (lacivert uyumlu sürüm)
 * --------------------------------------------------------------
 * Tüm sayfalar için birleştirilmiş ve güncellenmiş JS dosyası.
 * Gerekli tüm fonksiyonlar ve olay dinleyicileri burada yer almaktadır.
 * Güvenli null kontrolleri ve DOMContentLoaded koruması içerir.
 */

// Global alanda tanımlanan yardımcı fonksiyonlar
const $ = (sel, ctx = document) => ctx.querySelector(sel)
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel)

// onclick="scrollToSection(...)" gibi satır içi olayların çalışması için
// bu fonksiyonun global alanda olması gerekir.
function scrollToSection(selector) {
  const element = $(`#${selector}`)
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" })
  }
}

// HEX -> RGBA dönüştürücü
function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(0,0,0,${alpha})`
  let c = hex.replace("#", "")
  if (c.length === 3) {
    c = c.split("").map(ch => ch + ch).join("")
  }
  const num = parseInt(c, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

;(() => {
  /* -------------- DOM Hazır Olduğunda Çalışacak Kodlar --------------- */
  document.addEventListener("DOMContentLoaded", () => {
    // CSS değişkenlerini oku (lacivert palet)
    const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    const PRIMARY = cssVar("--clr-primary") || "#0a1f44"       // koyu lacivert
    const PRIMARY_LIGHT = cssVar("--clr-primary-light") || "#123d6d"
    const SECONDARY = cssVar("--clr-secondary") || "#1e56a0"
    const GRADIENT_PRIMARY = `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_LIGHT} 50%, ${SECONDARY} 100%)`
    const PRIMARY_95 = hexToRgba(PRIMARY, 0.95)
    const PRIMARY_GLOW = hexToRgba(PRIMARY, 0.3)

    /* ---------- Hero Slider ---------- */
    const heroSlides = $$(".hero__slide")
    if (heroSlides.length > 1) {
      let currentSlide = 0

      setInterval(() => {
        heroSlides[currentSlide].classList.remove("active")
        currentSlide = (currentSlide + 1) % heroSlides.length
        heroSlides[currentSlide].classList.add("active")
      }, 6000)
    }

    /* ---------- Global Scroll Logic ---------- */
    const progressBar = $(".progress__bar")
    const nav = $(".nav")
    const toTopBtn = $("#toTop")

    // İlk yüklemede nav'a lacivert degrade uygula
    if (nav) {
      nav.style.background = GRADIENT_PRIMARY
    }

    if (progressBar || nav || toTopBtn) {
      window.addEventListener("scroll", () => {
        const y = window.scrollY

        // Navbar scroll effect (lacivert tonlar)
        if (nav) {
          if (y > 100) {
            nav.style.background = PRIMARY_95
            nav.style.backdropFilter = "blur(20px)"
          } else {
            nav.style.background = GRADIENT_PRIMARY
            nav.style.backdropFilter = "none"
          }
        }

        // Progress bar
        if (progressBar) {
          const docH = document.documentElement.scrollHeight - document.documentElement.clientHeight
          progressBar.style.width = `${(y / docH) * 100}%`
        }

        // To-top button
        toTopBtn?.classList.toggle("show", y > 600)

        // Parallax effect for hero
        const hero = $(".hero")
        if (hero && y < window.innerHeight) {
          const parallaxSpeed = y * 0.3
          hero.style.transform = `translateY(${parallaxSpeed}px)`
        }
      })
    }

    /* ---------- Burger Menu ---------- */
    const burger = $("#burger")
    const navLinks = $("#navLinks")

    burger?.addEventListener("click", () => {
      navLinks?.classList.toggle("show")
      burger.classList.toggle("open")

      // Animate burger lines
      const spans = burger.querySelectorAll("span")
      if (burger.classList.contains("open")) {
        spans[0].style.transform = "translateY(7px) rotate(45deg)"
        spans[1].style.opacity = "0"
        spans[2].style.transform = "translateY(-7px) rotate(-45deg)"
      } else {
        spans[0].style.transform = "none"
        spans[1].style.opacity = "1"
        spans[2].style.transform = "none"
      }
    })

    /* ---------- Dropdown Stability (Desktop + Mobile Tap) ---------- */
    const dropdownLinks = $$(".nav__dropdown > .nav__link")
    const closeAllDropdowns = () => {
      $$(".nav__dropdown.is-open").forEach((item) => item.classList.remove("is-open"))
    }

    dropdownLinks.forEach((link) => {
      const parent = link.parentElement
      link.addEventListener("click", (e) => {
        const isTouchLayout =
          window.matchMedia("(max-width: 768px)").matches ||
          window.matchMedia("(hover: none)").matches

        if (!isTouchLayout) return

        // İlk dokunuşta menüyü aç, ikinci dokunuşta linke git.
        if (!parent.classList.contains("is-open")) {
          e.preventDefault()
          closeAllDropdowns()
          parent.classList.add("is-open")
        }
      })
    })

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".nav__dropdown")) {
        closeAllDropdowns()
      }
    })

    /* ---------- To-Top Button ---------- */
    toTopBtn?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    })

    /* ---------- Smooth Scroll for Anchor Links ---------- */
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault()
        const target = $(link.getAttribute("href"))
        if (target) {
          const offsetTop = target.offsetTop - 120
          window.scrollTo({ top: offsetTop, behavior: "smooth" })
        }
      })
    })

    /* ---------- Service Cards Enhanced Hover Effects ---------- */
    $$(".service-card").forEach((card) => {
      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-15px) scale(1.02)"

        // Lacivert glow effect
        const icon = card.querySelector(".service-card__icon")
        if (icon) {
          icon.style.boxShadow = `0 0 30px ${PRIMARY_GLOW}`
        }
      })

      card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0) scale(1)"

        const icon = card.querySelector(".service-card__icon")
        if (icon) {
          icon.style.boxShadow = "none"
        }
      })
    })

    /* ---------- References Carousel Control ---------- */
    const referencesTrack = $(".references__track")
    if (referencesTrack) {
      // Pause animation on hover
      referencesTrack.addEventListener("mouseenter", () => {
        referencesTrack.style.animationPlayState = "paused"
      })

      referencesTrack.addEventListener("mouseleave", () => {
        referencesTrack.style.animationPlayState = "running"
      })

      // Add click handlers for reference cards
      $$(".reference-card").forEach((card) => {
        card.addEventListener("click", () => {
          // Add click animation
          card.style.transform = "scale(0.95)"
          setTimeout(() => {
            card.style.transform = "scale(1)"
          }, 150)
        })
      })
    }

    /* ---------- Enhanced Intersection Observer ---------- */
    if (window.IntersectionObserver) {
      const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")

            // Add staggered animation for grid items
            if (entry.target.closest(".services__grid")) {
              const delay = Array.from(entry.target.parentNode.children).indexOf(entry.target) * 200
              entry.target.style.transitionDelay = `${delay}ms`
            }

            // Add special animation for feature items
            if (entry.target.classList.contains("feature-item")) {
              const delay = Array.from(entry.target.parentNode.children).indexOf(entry.target) * 150
              entry.target.style.transitionDelay = `${delay}ms`
            }
          }
        })
      }, observerOptions)

      $$("[data-fade]").forEach((el) => {
        observer.observe(el)
      })
    }

    /* ---------- Counter Animation ---------- */
    const counters = $$("[data-count]")
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const counter = entry.target
            const target = Number.parseInt(counter.dataset.count)
            const duration = 2000
            const increment = target / (duration / 16)
            let current = 0

            const updateCounter = () => {
              current += increment
              if (current < target) {
                counter.textContent = Math.floor(current)
                requestAnimationFrame(updateCounter)
              } else {
                counter.textContent = target
              }
            }

            updateCounter()
            counterObserver.unobserve(counter)
          }
        })
      },
      { threshold: 0.5 },
    )

    counters.forEach((counter) => counterObserver.observe(counter))

    /* ---------- Enhanced Button Ripple Effect ---------- */
    document.addEventListener("click", (e) => {
      if (e.target.matches(".btn, .btn *")) {
        const button = e.target.closest(".btn")
        const ripple = document.createElement("span")
        const rect = button.getBoundingClientRect()
        const size = Math.max(rect.width, rect.height)
        const x = e.clientX - rect.left - size / 2
        const y = e.clientY - rect.top - size / 2

        ripple.style.cssText = `
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          transform: scale(0);
          animation: ripple 0.6s linear;
          width: ${size}px;
          height: ${size}px;
          left: ${x}px;
          top: ${y}px;
          pointer-events: none;
          z-index: 0;
        `

        if (!button.style.position || button.style.position === "static") {
          button.style.position = "relative"
        }

        button.appendChild(ripple)
        setTimeout(() => ripple.remove(), 600)
      }
    })

    /* ---------- Cookie Consent ---------- */
    const consentKey = "cookieConsentAccepted"
    const consentBanner = $("#cookieConsent")
    const acceptBtn = $("#acceptCookies")
    const cookieDetailsBtn = $("#cookieDetailsBtn")
    const cookieModal = $("#cookieModal")
    const closeCookieModalBtn = $("#closeCookieModal")
    const cookieModalOverlay = $(".cookie-modal__overlay")

    const showCookieModal = () => {
      if (cookieModal) {
        cookieModal.style.display = "flex"
        document.body.style.overflow = "hidden"
      }
    }

    const closeCookieModal = () => {
      if (cookieModal) {
        cookieModal.style.display = "none"
        document.body.style.overflow = ""
      }
    }

    if (consentBanner) {
      if (localStorage.getItem(consentKey)) {
        consentBanner.style.display = "none"
      } else {
        setTimeout(() => {
          consentBanner.style.display = "block"
        }, 2000)
      }
    }

    acceptBtn?.addEventListener("click", () => {
      localStorage.setItem(consentKey, "true")
      consentBanner.style.display = "none"
    })

    cookieDetailsBtn?.addEventListener("click", showCookieModal)
    closeCookieModalBtn?.addEventListener("click", closeCookieModal)
    cookieModalOverlay?.addEventListener("click", closeCookieModal)

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && cookieModal && cookieModal.style.display === "flex") {
        closeCookieModal()
      }
    })

    /* ---------- Accordion for FAQ ---------- */
    $$(".accordion__header").forEach((header) => {
      header.addEventListener("click", () => {
        const content = header.nextElementSibling
        const isActive = header.classList.contains("active")

        // Close other accordions
        $$(".accordion__header.active").forEach((activeHeader) => {
          if (activeHeader !== header) {
            activeHeader.classList.remove("active")
            activeHeader.nextElementSibling.style.maxHeight = null
          }
        })

        // Toggle current accordion
        header.classList.toggle("active")
        content.style.maxHeight = !isActive ? content.scrollHeight + "px" : null
      })
    })

    /* ---------- Enhanced Scroll Animations ---------- */
    const animateOnScroll = () => {
      const elements = $$(".hero__feature, .service-card, .reference-card, .feature-item")

      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect()
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0

        if (isVisible && !el.classList.contains("animated")) {
          setTimeout(() => {
            el.style.opacity = "1"
            el.style.transform = "translateY(0)"
            el.classList.add("animated")
          }, index * 100)
        }
      })
    }

    window.addEventListener("scroll", animateOnScroll)
    animateOnScroll() // Run once on load

    /* ---------- Projeler paneli + detay döngüsü ---------- */
    const bindHeroPanels = () => {
      $$(".hero-card").forEach((card) => {
        const projectsPanel = card.querySelector(".hero-projects")
        const detailPanel = card.querySelector(".hero-detail")
        const detailTitle = card.querySelector(".hero-detail__title")
        const detailText = card.querySelector(".hero-detail__text")

        card.querySelector(".js-show-projects")?.addEventListener("click", () => {
          projectsPanel?.classList.add("active")
        })

        projectsPanel?.querySelectorAll(".hero-panel__item").forEach((btn) => {
          btn.addEventListener("click", () => {
            const title = btn.dataset.title || "Detay"
            const text = btn.dataset.text || ""
            if (detailTitle) detailTitle.textContent = title
            if (detailText) detailText.textContent = text
            projectsPanel.classList.remove("active")
            detailPanel?.classList.add("active")
          })
        })

        projectsPanel?.querySelector(".js-close-panel")?.addEventListener("click", () => {
          projectsPanel.classList.remove("active")
        })

        detailPanel?.querySelector(".js-back-projects")?.addEventListener("click", () => {
          detailPanel.classList.remove("active")
          projectsPanel?.classList.add("active")
        })
      })
    }

    bindHeroPanels()

    /* ---------- Performance Optimizations ---------- */
    // Debounce scroll events
    let scrollTimeout
    const originalScrollHandler = window.onscroll

    window.addEventListener("scroll", () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      scrollTimeout = setTimeout(() => {
        if (originalScrollHandler) originalScrollHandler()
      }, 10)
    })

    // Lazy load images
    const images = $$("img[data-src]")
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target
          img.src = img.dataset.src
          img.removeAttribute("data-src")
          imageObserver.unobserve(img)
        }
      })
    })

    images.forEach((img) => imageObserver.observe(img))
  })

  /* ---------- Add Enhanced CSS Animations ---------- */
  const styles = `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(50px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .hero__feature,
    .service-card,
    .reference-card,
    .feature-item {
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .animated {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }

    .btn {
      overflow: hidden;
      position: relative;
    }

    .service-card {
      will-change: transform;
    }

    .reference-card {
      will-change: transform;
    }

    /* Enhanced hover effects */
    .service-card:hover .service-card__icon {
      animation: iconBounce 0.6s ease;
    }

    @keyframes iconBounce {
      0%, 100% { transform: scale(1) rotate(0deg); }
      50% { transform: scale(1.1) rotate(5deg); }
    }

    /* Smooth transitions for all interactive elements */
    * {
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    }
  `

  const styleSheet = document.createElement("style")
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
})()
