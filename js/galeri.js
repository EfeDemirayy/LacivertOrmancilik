(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const chips = Array.from(document.querySelectorAll('.gallery-chip'))
    const cards = Array.from(document.querySelectorAll('.mosaic-card'))
    const countEl = document.querySelector('[data-gallery-count]')
    const activeEl = document.querySelector('[data-gallery-active]')

    let activeFilter = 'all'

    const applyFilter = () => {
      let visibleCount = 0

      cards.forEach((card) => {
        const isVisible = activeFilter === 'all' || card.dataset.category === activeFilter
        card.hidden = !isVisible
        if (isVisible) visibleCount += 1
      })

      if (countEl) countEl.textContent = String(visibleCount)

      const activeChip = chips.find((chip) => chip.dataset.filter === activeFilter)
      if (activeEl && activeChip) {
        activeEl.textContent = activeChip.textContent.trim()
      }
    }

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        activeFilter = chip.dataset.filter || 'all'
        chips.forEach((item) => item.classList.toggle('is-active', item === chip))
        applyFilter()
      })
    })

    applyFilter()

    const lightbox = document.getElementById('galleryLightbox')
    if (!lightbox || !cards.length) return

    const lightboxImage = document.getElementById('galleryLightboxImage')
    const lightboxTitle = document.getElementById('galleryLightboxTitle')
    const lightboxText = document.getElementById('galleryLightboxText')
    const closeButtons = Array.from(lightbox.querySelectorAll('[data-lightbox-close]'))
    const prevButton = lightbox.querySelector('[data-lightbox-prev]')
    const nextButton = lightbox.querySelector('[data-lightbox-next]')

    let visibleCards = []
    let currentIndex = 0

    const getVisibleCards = () => cards.filter((card) => !card.hidden)

    const setContent = (card) => {
      if (!card || !lightboxImage || !lightboxTitle || !lightboxText) return

      const image = card.dataset.image || ''
      const title = card.dataset.title || ''
      const description = card.dataset.desc || ''

      lightboxImage.src = image
      lightboxImage.alt = title
      lightboxTitle.textContent = title
      lightboxText.textContent = description
    }

    const openLightbox = (card) => {
      visibleCards = getVisibleCards()
      if (!visibleCards.length) return

      currentIndex = Math.max(0, visibleCards.indexOf(card))
      setContent(visibleCards[currentIndex])

      lightbox.classList.add('is-active')
      lightbox.setAttribute('aria-hidden', 'false')
      document.body.style.overflow = 'hidden'
    }

    const closeLightbox = () => {
      lightbox.classList.remove('is-active')
      lightbox.setAttribute('aria-hidden', 'true')
      document.body.style.overflow = ''
    }

    const stepLightbox = (step) => {
      visibleCards = getVisibleCards()
      if (!visibleCards.length) return

      currentIndex = (currentIndex + step + visibleCards.length) % visibleCards.length
      setContent(visibleCards[currentIndex])
    }

    cards.forEach((card) => {
      const openButton = card.querySelector('.mosaic-card__open')
      const image = card.querySelector('img')

      openButton?.addEventListener('click', (event) => {
        event.preventDefault()
        openLightbox(card)
      })

      image?.addEventListener('click', () => openLightbox(card))
    })

    closeButtons.forEach((button) => {
      button.addEventListener('click', closeLightbox)
    })

    prevButton?.addEventListener('click', () => stepLightbox(-1))
    nextButton?.addEventListener('click', () => stepLightbox(1))

    document.addEventListener('keydown', (event) => {
      if (!lightbox.classList.contains('is-active')) return

      if (event.key === 'Escape') closeLightbox()
      if (event.key === 'ArrowLeft') stepLightbox(-1)
      if (event.key === 'ArrowRight') stepLightbox(1)
    })
  })
})()
