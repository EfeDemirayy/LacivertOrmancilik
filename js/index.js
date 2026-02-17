/* index.js - Lacivert Ormancılık (lacivert uyumlu sürüm)
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
    const normalizeHomepagePath = () => {
      const { pathname, search, hash } = window.location
      if (!/\/index\.html?$/i.test(pathname)) return
      const strippedPath = pathname.replace(/index\.html?$/i, "")
      const cleanPath = strippedPath.endsWith("/") ? strippedPath : `${strippedPath}/`
      window.history.replaceState(null, "", `${cleanPath}${search}${hash}`)
    }
    normalizeHomepagePath()

    const pinJivoToRightOnMobile = () => {
      const mobileQuery = window.matchMedia("(max-width: 900px)")
      const selectors = [
        "#jivo-iframe-container",
        "jdiv#jivo-iframe-container",
        "div#jivo-iframe-container",
        "#jivo-container",
        "jdiv#jivo-container",
        "div#jivo-container",
        ".jivo-iframe-container",
        "#jvlabelWrap",
        "jdiv#jvlabelWrap",
        "div#jvlabelWrap",
        "[id*='jivo-widget']",
        "[id*='jivo-container']",
        "[id*='jvlabel']",
      ]

      const applyPosition = () => {
        if (!mobileQuery.matches) return
        document.querySelectorAll(selectors.join(",")).forEach((node) => {
          const computed = window.getComputedStyle(node)
          const position = computed.position
          if (position !== "fixed" && position !== "absolute") return

          node.style.setProperty("left", "auto", "important")
          node.style.setProperty("right", "10px", "important")
          node.style.setProperty("inset-inline-start", "auto", "important")
          node.style.setProperty("inset-inline-end", "10px", "important")
          node.style.setProperty("bottom", "14px", "important")
          node.style.setProperty("transform", "none", "important")
          node.style.setProperty("z-index", "9998", "important")

          const nodeName = `${node.id || ""} ${node.className || ""}`.toLowerCase()
          if (nodeName.includes("jvlabel")) {
            node.style.setProperty("max-width", "62px", "important")
            node.style.setProperty("overflow", "hidden", "important")
          }
        })
      }

      applyPosition()
      window.addEventListener("resize", applyPosition, { passive: true })

      const observer = new MutationObserver(() => {
        applyPosition()
      })
      observer.observe(document.documentElement, { childList: true, subtree: true })

      let attempts = 0
      const intervalId = window.setInterval(() => {
        applyPosition()
        attempts += 1
        if (attempts >= 60) {
          window.clearInterval(intervalId)
          observer.disconnect()
        }
      }, 500)
    }
    pinJivoToRightOnMobile()

    // CSS değişkenlerini oku (lacivert palet)
    const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    const PRIMARY = cssVar("--clr-primary") || "#0a1f44"       // koyu lacivert
    const PRIMARY_LIGHT = cssVar("--clr-primary-light") || "#123d6d"
    const SECONDARY = cssVar("--clr-secondary") || "#1e56a0"
    const GRADIENT_PRIMARY = `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_LIGHT} 50%, ${SECONDARY} 100%)`
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

    if (nav) {
      nav.classList.toggle("is-scrolled", window.scrollY > 100)
    }

    if (progressBar || nav || toTopBtn) {
      window.addEventListener("scroll", () => {
        const y = window.scrollY

        // Navbar scroll effect
        if (nav) {
          nav.classList.toggle("is-scrolled", y > 100)
        }

        // Progress bar
        if (progressBar) {
          const docH = document.documentElement.scrollHeight - document.documentElement.clientHeight
          progressBar.style.width = `${(y / docH) * 100}%`
        }

        // To-top button
        toTopBtn?.classList.toggle("show", y > 600)

        // Parallax effect for hero (panel hero'da kapali; mobilde kapali)
        const hero = $(".hero")
        const canUseHeroParallax =
          hero &&
          !hero.classList.contains("hero--panels") &&
          window.matchMedia("(min-width: 901px)").matches &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches

        if (canUseHeroParallax && y < window.innerHeight) {
          const parallaxSpeed = y * 0.22
          hero.style.transform = `translateY(${parallaxSpeed}px)`
        } else if (hero) {
          hero.style.transform = ""
        }
      })
    }

    /* ---------- Unified Header / Navigation ---------- */
    const normalizeNavStructure = () => {
      const navLinksEl = $("#navLinks")
      if (!navLinksEl) return

      const path = (window.location.pathname || "").toLocaleLowerCase("tr")
      const currentFile = path.split("/").pop() || "index.html"
      const isProjectFolder = /\/projeler\//.test(path)
      const base = isProjectFolder ? "../" : ""

      const routeByFile = {
        "index.html": "index.html",
        "hakkimizda.html": "hakkimizda.html",
        "sss.html": "sss.html",
        "kanunveyonetmelikler.html": "kanunveyonetmelikler.html",
        "ormanizinleri.html": "ormanizinleri.html",
        "madde16.html": "madde16.html",
        "madde17.html": "madde17.html",
        "diger.html": "diger.html",
        "galeri.html": "galeri.html",
        "iletisim.html": "iletisim.html",
      }

      const currentSlug = currentFile.replace(/\.html$/i, "")
      const aliasBySlug = {
        index: ["", "index", "anasayfa"],
        hakkimizda: ["hakkimizda"],
        sss: ["sss", "sikca-sorulan-sorular"],
        kanunveyonetmelikler: ["kanunveyonetmelikler", "kanun-ve-yonetmelikler"],
        ormanizinleri: ["ormanizinleri", "orman-izinleri"],
        madde16: ["madde16", "madde-16"],
        madde17: ["madde17", "madde-17"],
        diger: ["diger"],
        galeri: ["galeri"],
        iletisim: ["iletisim"],
      }

      const href = (file) => {
        if (file === "index.html") return isProjectFolder ? "../" : "/"
        return `${base}${routeByFile[file] || file}`
      }
      const isCurrent = (file) => {
        const targetSlug = file.toLocaleLowerCase("tr").replace(/\.html$/i, "")
        if (currentSlug === targetSlug) return true
        return (aliasBySlug[targetSlug] || []).includes(currentSlug)
      }
      const currentAttr = (file) => (isCurrent(file) ? ' aria-current="page"' : "")
      const inHome = isCurrent("index.html")
      const inKurumsal = isCurrent("hakkimizda.html") || isCurrent("sss.html")
      const inOrmancilik = isCurrent("kanunveyonetmelikler.html") || isCurrent("ormanizinleri.html")
      const inProjeler = isCurrent("madde16.html") || isCurrent("madde17.html") || isCurrent("diger.html") || isProjectFolder
      const inGaleri = isCurrent("galeri.html")
      const inIletisim = isCurrent("iletisim.html")

      navLinksEl.innerHTML = `
        <li><a href="${href("index.html")}" class="nav__link${inHome ? " is-current" : ""}"${currentAttr("index.html")}>Anasayfa</a></li>
        <li class="nav__dropdown">
          <a href="${href("hakkimizda.html")}" class="nav__link${inKurumsal ? " is-current" : ""}">Kurumsal <i class="fa-solid fa-chevron-down"></i></a>
          <ul class="dropdown">
            <li><a href="${href("hakkimizda.html")}"${currentAttr("hakkimizda.html")}>Hakkımızda</a></li>
            <li><a href="${href("sss.html")}"${currentAttr("sss.html")}>Sıkça Sorulan Sorular</a></li>
          </ul>
        </li>
        <li class="nav__dropdown">
          <a href="${href("ormanizinleri.html")}" class="nav__link${inOrmancilik ? " is-current" : ""}">Ormancılık <i class="fa-solid fa-chevron-down"></i></a>
          <ul class="dropdown">
            <li><a href="${href("kanunveyonetmelikler.html")}"${currentAttr("kanunveyonetmelikler.html")}>Kanun ve Yönetmelikler</a></li>
            <li><a href="${href("ormanizinleri.html")}"${currentAttr("ormanizinleri.html")}>Orman İzinleri</a></li>
          </ul>
        </li>
        <li class="nav__dropdown">
          <a href="${href("madde16.html")}" class="nav__link${inProjeler ? " is-current" : ""}">Projeler <i class="fa-solid fa-chevron-down"></i></a>
          <ul class="dropdown">
            <li><a href="${href("madde16.html")}"${currentAttr("madde16.html")}>Madde 16</a></li>
            <li><a href="${href("madde17.html")}"${currentAttr("madde17.html")}>Madde 17</a></li>
            <li><a href="${href("diger.html")}"${currentAttr("diger.html")}>Diğer</a></li>
          </ul>
        </li>
        <li><a href="${href("galeri.html")}" class="nav__link${inGaleri ? " is-current" : ""}"${currentAttr("galeri.html")}>Galeri</a></li>
        <li><a href="${href("iletisim.html")}" class="nav__link${inIletisim ? " is-current" : ""}"${currentAttr("iletisim.html")}>İletişim</a></li>
      `
    }

    normalizeNavStructure()

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

        const hrefValue = (link.getAttribute("href") || "").trim()
        const isJumpOnly =
          !hrefValue ||
          hrefValue === "#" ||
          hrefValue.startsWith("#") ||
          hrefValue.toLowerCase().startsWith("javascript:")

        if (!isJumpOnly) return

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

    /* ---------- Homepage Directional Motion Setup ---------- */
    const setupHomeMotion = () => {
      const homeMain = $(".home-main")
      if (!homeMain) return

      const assignMotion = (selector, direction, delayStart = 0, delayStep = 90) => {
        const items = Array.from(homeMain.querySelectorAll(selector))
        if (!items.length) return

        items.forEach((item, index) => {
          const resolvedDirection = Array.isArray(direction)
            ? direction[index % direction.length]
            : direction

          if (!item.dataset.fadeDir) {
            item.dataset.fadeDir = resolvedDirection
          }

          if (!item.style.getPropertyValue("--fade-delay")) {
            item.style.setProperty("--fade-delay", `${delayStart + index * delayStep}ms`)
          }
        })
      }

      assignMotion(".index-overview__content[data-fade]", "left", 90, 0)
      assignMotion(".index-overview__visual[data-fade]", "right", 180, 0)

      assignMotion(".index-solutions .index-section__head[data-fade]", "up", 60, 0)
      assignMotion(
        ".index-solutions__grid .index-solution-card[data-fade]",
        ["left", "up", "right", "up"],
        110,
        90,
      )

      assignMotion(".index-process .index-section__head[data-fade]", "up", 60, 0)
      assignMotion(
        ".index-process__timeline .index-step[data-fade]",
        ["left", "up", "up", "right"],
        100,
        80,
      )

      assignMotion(".index-project-hub .index-section__head[data-fade]", "up", 60, 0)
      assignMotion(
        ".index-project-hub__grid .index-project-card[data-fade]",
        ["left", "up", "right"],
        110,
        75,
      )

      assignMotion(".index-map-card[data-fade]", "left", 90, 0)
      assignMotion(".index-contact-card[data-fade]", "right", 140, 0)
      assignMotion(".index-cta-band__content[data-fade]", "up", 90, 0)
    }

    setupHomeMotion()

    /* ---------- Global Directional Motion Setup (All Pages) ---------- */
    const setupGlobalMotion = () => {
      const fadeElements = Array.from($$("[data-fade]"))
      if (!fadeElements.length) return

      const directionCycle = ["left", "up", "right", "up"]
      const delayStep = 65
      const delayBase = 60
      const delayWave = 6

      // Keep manually provided direction/delay values and normalize aliases.
      fadeElements.forEach((el) => {
        if (!el.dataset.fadeDir && el.dataset.dir) {
          el.dataset.fadeDir = el.dataset.dir
        }

        if (!el.style.getPropertyValue("--fade-delay") && el.dataset.delay) {
          const raw = `${el.dataset.delay}`.trim()
          const numericDelay = Number.parseFloat(raw)
          if (Number.isFinite(numericDelay)) {
            const normalized = Math.max(0, numericDelay - 1)
            el.style.setProperty("--fade-delay", `${normalized * 90}ms`)
          } else if (/(ms|s)$/.test(raw)) {
            el.style.setProperty("--fade-delay", raw)
          }
        }
      })

      // Semantic presets: text from left, visuals from right, section heads from bottom.
      const presetDirections = [
        [".index-overview__content[data-fade], .content-text[data-fade], .project-detail__content[data-fade], .project-record__content[data-fade], .gallery-stage__copy[data-fade]", "left"],
        [".index-overview__visual[data-fade], .content-image[data-fade], .project-detail__visual[data-fade], .project-record__visual[data-fade], .gallery-stage__stack[data-fade], .faq-pro__accordion[data-fade]", "right"],
        [".index-section__head[data-fade], .section__header[data-fade], .projects-section__head[data-fade], .gallery-strip__head[data-fade], .gallery-console[data-fade], .projects-filter[data-fade]", "up"],
        [".faq-pro__meta[data-fade]", "down"],
      ]

      presetDirections.forEach(([selector, direction]) => {
        Array.from(document.querySelectorAll(selector)).forEach((el) => {
          if (!el.dataset.fadeDir) {
            el.dataset.fadeDir = direction
          }
        })
      })

      const groups = new Map()
      const groupSelector = [
        ".index-overview__grid",
        ".content-grid",
        ".project-detail__grid",
        ".index-solutions__grid",
        ".index-project-hub__grid",
        ".index-process__timeline",
        ".process-grid",
        ".stats-grid",
        ".projects-grid",
        ".projects-section",
        ".projects-year-group",
        ".faq-pro__layout",
        ".gallery-stage",
        ".gallery-mosaic",
        ".gallery-strip__rail",
        ".contact-pro__grid",
        ".index-map-wrap__grid",
      ].join(", ")

      fadeElements.forEach((el) => {
        const groupRoot = el.closest(groupSelector) || el.parentElement || document.body
        if (!groups.has(groupRoot)) groups.set(groupRoot, [])
        groups.get(groupRoot).push(el)
      })

      groups.forEach((items) => {
        items.forEach((el, index) => {
          if (!el.dataset.fadeDir) {
            el.dataset.fadeDir = directionCycle[index % directionCycle.length]
          }

          if (!el.style.getPropertyValue("--fade-delay")) {
            const waveIndex = index % delayWave
            el.style.setProperty("--fade-delay", `${delayBase + waveIndex * delayStep}ms`)
          }
        })
      })
    }

    setupGlobalMotion()

    /* ---------- FAQ Left Panel Downward Drift ---------- */
    const setupFaqMetaDrift = () => {
      const faqMeta = $(".faq-pro__meta[data-fade]")
      const faqSection = faqMeta?.closest(".faq-pro")
      if (!faqMeta || !faqSection) return

      let ticking = false
      const updateDrift = () => {
        const rect = faqSection.getBoundingClientRect()
        const vh = window.innerHeight || 1
        const total = rect.height + vh
        const progress = Math.max(0, Math.min(1, (vh - rect.top) / total))
        const drift = Math.min(34, progress * 40)
        faqMeta.style.setProperty("--faq-drift", `${drift.toFixed(1)}px`)
        ticking = false
      }

      const onScroll = () => {
        if (ticking) return
        ticking = true
        window.requestAnimationFrame(updateDrift)
      }

      window.addEventListener("scroll", onScroll, { passive: true })
      window.addEventListener("resize", onScroll)
      updateDrift()
    }

    setupFaqMetaDrift()

    /* ---------- Cinematic Parallax for Key Blocks ---------- */
    const setupCinematicParallax = () => {
      const targets = Array.from(
        document.querySelectorAll(
          ".index-section__head[data-fade], .section__header[data-fade], .page-hero__content[data-fade], .gallery-stage__copy[data-fade], .index-cta-band__content[data-fade], .faq-pro__meta[data-fade]",
        ),
      )
      if (!targets.length) return

      let rafId = 0
      const update = () => {
        const vh = window.innerHeight || 1
        targets.forEach((el) => {
          const rect = el.getBoundingClientRect()
          if (rect.bottom < 0 || rect.top > vh) return
          const center = rect.top + rect.height / 2
          const normalized = (center - vh / 2) / vh
          const drift = Math.max(-12, Math.min(12, -normalized * 18))
          el.style.setProperty("--parallax-y", `${drift.toFixed(2)}px`)
        })
        rafId = 0
      }

      const requestUpdate = () => {
        if (rafId) return
        rafId = window.requestAnimationFrame(update)
      }

      window.addEventListener("scroll", requestUpdate, { passive: true })
      window.addEventListener("resize", requestUpdate)
      requestUpdate()
    }

    setupCinematicParallax()

    /* ---------- Interactive Tilt + Spotlight ---------- */
    const setupTiltSpotlight = () => {
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return

      const tiltSelector = [
        ".index-solution-card[data-fade]",
        ".index-project-card[data-fade]",
        ".project-card[data-fade]",
        ".permit-card[data-fade]",
        ".law-card[data-fade]",
        ".law-alert[data-fade]",
        ".service-card[data-fade]",
        ".process-step[data-fade]",
        ".project-detail__content[data-fade]",
        ".project-detail__visual[data-fade]",
        ".project-record__content[data-fade]",
        ".project-record__visual[data-fade]",
        ".contact-pro__panel[data-fade]",
        ".gallery-console[data-fade]",
        ".index-map-card[data-fade]",
        ".index-contact-card[data-fade]",
        ".madde-brief[data-fade]",
        ".projects-filter[data-fade]",
      ].join(", ")

      const tiltCards = Array.from(document.querySelectorAll(tiltSelector))
      if (!tiltCards.length) return

      tiltCards.forEach((card) => {
        card.classList.add("fx-tilt")
        if (!card.querySelector(":scope > .fx-spotlight")) {
          const spot = document.createElement("span")
          spot.className = "fx-spotlight"
          card.appendChild(spot)
        }

        let frame = 0
        let pointerX = 0
        let pointerY = 0

        const update = () => {
          const rect = card.getBoundingClientRect()
          if (!rect.width || !rect.height) {
            frame = 0
            return
          }

          const px = Math.min(1, Math.max(0, (pointerX - rect.left) / rect.width))
          const py = Math.min(1, Math.max(0, (pointerY - rect.top) / rect.height))
          const tiltY = (px - 0.5) * 9.6
          const tiltX = (0.5 - py) * 8.6

          card.style.setProperty("--fx-mx", `${(px * 100).toFixed(2)}%`)
          card.style.setProperty("--fx-my", `${(py * 100).toFixed(2)}%`)
          card.style.setProperty("--fx-rotate-x", `${tiltX.toFixed(2)}deg`)
          card.style.setProperty("--fx-rotate-y", `${tiltY.toFixed(2)}deg`)
          frame = 0
        }

        const requestUpdate = () => {
          if (frame) return
          frame = window.requestAnimationFrame(update)
        }

        card.addEventListener("mouseenter", () => {
          card.classList.add("fx-tilt-active")
        })

        card.addEventListener("mousemove", (event) => {
          pointerX = event.clientX
          pointerY = event.clientY
          requestUpdate()
        })

        card.addEventListener("mouseleave", () => {
          if (frame) {
            window.cancelAnimationFrame(frame)
            frame = 0
          }
          card.classList.remove("fx-tilt-active")
          card.style.setProperty("--fx-rotate-x", "0deg")
          card.style.setProperty("--fx-rotate-y", "0deg")
          card.style.setProperty("--fx-mx", "50%")
          card.style.setProperty("--fx-my", "50%")
        })
      })
    }

    setupTiltSpotlight()

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

            observer.unobserve(entry.target)
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
        const showProjectsBtn = card.querySelector(".js-show-projects")
        const panelItems = Array.from(projectsPanel?.querySelectorAll(".hero-panel__item") || [])
        const cardTitle = card.querySelector(".hero-card__title")?.textContent?.trim() || "Proje"

        const simplifyProjectsButton = () => {
          if (!showProjectsBtn) return
          showProjectsBtn.classList.add("hero-btn--projects")
          showProjectsBtn.innerHTML = "Projeleri Gör"
        }

        const simplifyPanelHeader = () => {
          if (!projectsPanel) return

          const summary = projectsPanel.querySelector(".hero-panel__summary")
          if (summary) summary.remove()

          const head = projectsPanel.querySelector(".hero-panel__head")
          if (!head) return

          const meta = head.querySelector(".hero-panel__meta")
          if (meta) {
            const basicLabel = document.createElement("span")
            basicLabel.textContent = `${cardTitle} Projeleri`
            meta.replaceWith(basicLabel)
          } else {
            const basicLabel = head.querySelector("span")
            if (basicLabel) basicLabel.textContent = `${cardTitle} Projeleri`
          }
        }

        const closeAllPanels = () => {
          projectsPanel?.classList.remove("active")
          detailPanel?.classList.remove("active")
          card.classList.remove("is-panel-open")
        }

        const enhanceProjectItem = (btn) => {
          const title = btn.dataset.title || btn.textContent.trim() || "Proje"
          const desc = btn.dataset.text || "Detaylı proje sayfasını görüntüleyin."

          btn.innerHTML = ""

          const titleEl = document.createElement("span")
          titleEl.className = "hero-panel__item-title"
          titleEl.textContent = title

          const descEl = document.createElement("span")
          descEl.className = "hero-panel__item-desc"
          descEl.textContent = desc

          btn.append(titleEl, descEl)
          btn.classList.add("is-ready")
        }

        simplifyProjectsButton()
        simplifyPanelHeader()

        showProjectsBtn?.addEventListener("click", () => {
          if (window.matchMedia("(max-width: 900px)").matches) {
            const mobileHref = card
              .querySelector(".hero-card__actions .hero-btn--ghost")
              ?.getAttribute("href")
            if (mobileHref) {
              window.location.href = mobileHref
              return
            }
          }

          if (projectsPanel?.classList.contains("active")) return
          closeAllPanels()
          card.classList.add("is-panel-open")
          detailPanel?.classList.remove("active")
          requestAnimationFrame(() => projectsPanel?.classList.add("active"))
        })

        panelItems.forEach((btn) => {
          enhanceProjectItem(btn)
          btn.addEventListener("click", () => {
            const targetUrl = btn.dataset.url
            if (targetUrl) {
              window.location.href = targetUrl
              return
            }

            const title = btn.dataset.title || "Detay"
            const text = btn.dataset.text || ""
            if (detailTitle) detailTitle.textContent = title
            if (detailText) detailText.textContent = text
            projectsPanel.classList.remove("active")
            detailPanel?.classList.add("active")
          })
        })

        projectsPanel?.querySelector(".js-close-panel")?.addEventListener("click", () => {
          closeAllPanels()
        })

        projectsPanel?.addEventListener("click", (event) => {
          if (event.target === projectsPanel) {
            closeAllPanels()
          }
        })

        detailPanel?.querySelector(".js-back-projects")?.addEventListener("click", () => {
          detailPanel.classList.remove("active")
          projectsPanel?.classList.add("active")
        })

        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") closeAllPanels()
        })
      })
    }
    bindHeroPanels()

    /* ---------- Madde Sayfaları Filtreleme ---------- */
    const bindProjectFilters = () => {
      const filterBlocks = $$("[data-project-filter]")
      if (!filterBlocks.length) return

      const normalize = (value = "") => value.toLocaleLowerCase("tr")

      filterBlocks.forEach((filterBlock) => {
        const sectionRoot = filterBlock.closest(".section") || document
        const cards = Array.from(sectionRoot.querySelectorAll(".project-card"))
        const sections = Array.from(sectionRoot.querySelectorAll(".projects-section"))
        if (!cards.length) return

        const chipsHost = filterBlock.querySelector("[data-filter-chips]")
        const searchInput = filterBlock.querySelector("[data-filter-search]")
        const resetBtn = filterBlock.querySelector("[data-filter-reset]")

        const groups = Array.from(
          new Set(
            cards
              .map((card) => card.querySelector(".project-card__badge")?.textContent?.trim())
              .filter(Boolean),
          ),
        )

        let activeGroup = "Tümü"
        const createChip = (label) => {
          const chip = document.createElement("button")
          chip.type = "button"
          chip.className = "projects-filter__chip"
          chip.textContent = label
          chip.dataset.group = label
          chip.addEventListener("click", () => {
            activeGroup = label
            chipsHost?.querySelectorAll(".projects-filter__chip").forEach((item) => {
              item.classList.toggle("is-active", item.dataset.group === activeGroup)
            })
            applyFilter()
          })
          return chip
        }

        chipsHost?.appendChild(createChip("Tümü"))
        groups.forEach((group) => chipsHost?.appendChild(createChip(group)))
        chipsHost?.querySelector(".projects-filter__chip")?.classList.add("is-active")

        const applyFilter = () => {
          const query = normalize(searchInput?.value || "")

          cards.forEach((card) => {
            const group = card.querySelector(".project-card__badge")?.textContent?.trim() || ""
            const title = card.querySelector("h3")?.textContent || ""
            const desc = card.querySelector("p")?.textContent || ""
            const haystack = normalize(`${group} ${title} ${desc}`)
            const groupOk = activeGroup === "Tümü" || group === activeGroup
            const textOk = !query || haystack.includes(query)
            card.classList.toggle("is-hidden", !(groupOk && textOk))
          })

          sections.forEach((section) => {
            const hasVisibleCard = Array.from(section.querySelectorAll(".project-card")).some(
              (card) => !card.classList.contains("is-hidden"),
            )
            section.classList.toggle("is-hidden-section", !hasVisibleCard)
          })

          const yearGroups = Array.from(sectionRoot.querySelectorAll(".projects-year-group"))
          yearGroups.forEach((group) => {
            const hasVisibleCard = Array.from(group.querySelectorAll(".project-card")).some(
              (card) => !card.classList.contains("is-hidden"),
            )
            group.classList.toggle("is-hidden-group", !hasVisibleCard)
          })
        }

        searchInput?.addEventListener("input", applyFilter)
        resetBtn?.addEventListener("click", () => {
          activeGroup = "Tümü"
          if (searchInput) searchInput.value = ""
          chipsHost?.querySelectorAll(".projects-filter__chip").forEach((item) => {
            item.classList.toggle("is-active", item.dataset.group === activeGroup)
          })
          applyFilter()
        })

        applyFilter()
      })
    }

    bindProjectFilters()

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

