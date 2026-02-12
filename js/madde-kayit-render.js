(() => {
  const PAGE_CONFIG = {
    "madde16.html": {
      id: "16",
      title: "Madde 16 Projeleri",
      intro: "Orman Kanunu 16. madde kapsamındaki izin süreçleri, Excel kayıtlarına göre yıllık bazda listelenmektedir.",
    },
    "madde17.html": {
      id: "17",
      title: "Madde 17 Projeleri",
      intro: "Orman Kanunu 17. madde kapsamındaki izin süreçleri, Excel kayıtlarına göre yıllık bazda listelenmektedir.",
    },
    "diger.html": {
      id: "DIGER",
      title: "Diğer Projeler",
      intro: "Tapulu kesim işlemleri ve ağaç röleve planı kayıtları yıllara göre otomatik olarak listelenmektedir.",
    },
  };

  const FALLBACK_IMAGES = [
    "img/batikaradeniz3.jpg",
    "img/surdurulebilir-orman.jpg",
    "img/proje-yolu.jpg",
    "img/proje-yolu2.jpg",
    "img/res-projesi.jpg",
    "img/drone-haritalama.jpg",
    "img/fidandikim3.jpg",
    "img/diger-referanslar.jpeg",
  ];

  const getCurrentPageName = () => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return (parts.pop() || "index.html").toLowerCase();
  };

  const normalizeKey = (value = "") => {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i")
      .replace(/&/g, " ve ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  };

  const slugifyKey = (value = "") => normalizeKey(value).replace(/\s+/g, "-");

  const compactText = (value = "") => normalizeKey(value).replace(/\s+/g, "");

  const containsAny = (value = "", keywords = []) => {
    const text = normalizeKey(value);
    return keywords.some((keyword) => text.includes(keyword));
  };

  const escapeRegExp = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const ENTITY_HINTS = [
    "as",
    "a s",
    "anonim",
    "ltd",
    "limited",
    "san",
    "tic",
    "ins",
    "inş",
    "nak",
    "maden",
    "enerji",
    "res",
    "belediye",
    "belediyesi",
    "mudurlugu",
    "müdürlüğü",
    "bakanligi",
    "genel mudurlugu",
    "kooperatif",
    "kooperatifi",
    "grup",
    "kurumu",
    "uygulama",
    "başkanlığı",
    "baskanligi",
  ];

  const isLikelyPersonName = (name = "") => {
    const normalized = normalizeKey(name);
    if (!normalized) return false;
    if (/[0-9]/.test(normalized)) return false;
    if (containsAny(normalized, ENTITY_HINTS)) return false;

    const words = normalized.split(" ").filter(Boolean);
    if (words.length < 2 || words.length > 3) return false;
    return words.every((word) => /^[a-z]+$/.test(word) && word.length >= 2);
  };

  const maskSurnameWord = (value = "") => {
    return String(value || "").trim();
  };

  const getNamePresentation = (firma = "") => {
    const fullName = String(firma || "").trim().replace(/\s+/g, " ");
    if (!fullName) {
      return {
        isPerson: false,
        typeLabel: "Şirket",
        displayName: "Belirtilmeyen Firma",
        firstName: "Belirtilmeyen Firma",
        surnameMasked: "",
      };
    }

    const isPerson = isLikelyPersonName(fullName);
    if (!isPerson) {
      return {
        isPerson: false,
        typeLabel: "Şirket",
        displayName: fullName,
        firstName: fullName,
        surnameMasked: "",
      };
    }

    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || fullName;
    const surnameMasked = nameParts.slice(1).join(" ");
    const displayName = fullName;

    return {
      isPerson: true,
      typeLabel: "Şahıs",
      displayName,
      firstName,
      surnameMasked,
    };
  };

  const anonymizePersonText = (text = "", originalName = "", displayName = "") => {
    let safeText = String(text || "");
    const fullName = String(originalName || "").trim();
    if (!safeText || !fullName) return safeText;

    safeText = safeText.replace(new RegExp(escapeRegExp(fullName), "giu"), displayName);

    const parts = fullName.split(/\s+/).filter(Boolean);
    parts.slice(1).forEach((surname) => {
      safeText = safeText.replace(new RegExp(escapeRegExp(surname), "giu"), maskSurnameWord(surname));
    });

    return safeText;
  };

  const classifyRecord = (record = {}) => {
    const maddeText = String(record.madde || "");
    const konuText = String(record.konu || "");
    const grupText = String(record.grup || "");
    const maddeCompact = compactText(maddeText);

    if (maddeCompact.startsWith("17")) return "17";

    const hasTapuluKesim =
      containsAny(maddeText, ["tapulu kesim", "tapulu kesim islemleri"]) ||
      containsAny(konuText, ["tapulu kesim", "tapulu kesim islemleri"]);
    const hasAgacRoleve =
      containsAny(maddeText, ["agac roleve", "agac roleve plani"]) ||
      containsAny(konuText, ["agac roleve", "agac roleve plani"]);

    if (hasTapuluKesim || hasAgacRoleve) return "DIGER";

    const hasMadde16 = maddeCompact.startsWith("16");
    const hasMaden = containsAny(maddeText, ["maden"]) || containsAny(grupText, ["maden", "meden"]);
    const hasTeknikRapor =
      containsAny(maddeText, ["teknik rapor", "teknik rapor tanzim"]) ||
      containsAny(konuText, ["teknik rapor", "teknik rapor tanzim"]);

    if (hasMadde16 || hasMaden || hasTeknikRapor) return "16";

    return "DISARI";
  };

  const parseDateValue = (value = "") => {
    const match = String(value).trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  };

  const formatDate = (value = "") => {
    const date = parseDateValue(value);
    if (!date) return String(value || "-");
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}.${month}.${date.getFullYear()}`;
  };

  const hashString = (value = "") => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const getFallbackImage = (seed = "") => {
    const index = hashString(seed) % FALLBACK_IMAGES.length;
    return FALLBACK_IMAGES[index];
  };

  const buildResolver = () => {
    const directory = window.PROJE_DIZIN || {};
    const pageSet = new Set(Array.isArray(directory.slugs) ? directory.slugs.map(String) : []);
    const coverSet = new Set(Array.isArray(directory.coverSlugs) ? directory.coverSlugs.map(String) : []);

    const aliasMap = new Map();
    const aliasSource = directory.aliases || {};
    Object.keys(aliasSource).forEach((rawKey) => {
      const key = normalizeKey(rawKey);
      const slug = String(aliasSource[rawKey] || "").trim();
      if (key && slug) aliasMap.set(key, slug);
    });

    pageSet.forEach((slug) => {
      const slugAsKey = normalizeKey(slug.replace(/-/g, " "));
      if (slugAsKey && !aliasMap.has(slugAsKey)) {
        aliasMap.set(slugAsKey, slug);
      }
    });

    const aliasEntries = Array.from(aliasMap.entries());

    const resolveProjectSlug = (firma) => {
      const key = normalizeKey(firma);
      if (!key) return null;

      if (aliasMap.has(key)) return aliasMap.get(key);

      const directSlug = slugifyKey(key);
      if (pageSet.has(directSlug)) return directSlug;

      const keyTokens = key.split(" ").filter(Boolean);
      let bestSlug = null;
      let bestScore = 0;

      aliasEntries.forEach(([aliasKey, slug]) => {
        if (!aliasKey || !slug) return;
        const aliasTokens = aliasKey.split(" ").filter(Boolean);
        if (!aliasTokens.length) return;

        let matched = 0;
        aliasTokens.forEach((token) => {
          const tokenMatched = keyTokens.some((item) => item.startsWith(token) || token.startsWith(item));
          if (tokenMatched) matched += 1;
        });

        const score = matched / aliasTokens.length;
        if (score > bestScore) {
          bestScore = score;
          bestSlug = slug;
        }
      });

      if (bestScore >= 0.7 && bestSlug) return bestSlug;
      return null;
    };

    const resolveImage = (slug, firma) => {
      if (slug && coverSet.has(slug)) {
        return `img/project-covers/${slug}.svg`;
      }
      return getFallbackImage(firma);
    };

    return { pageSet, resolveProjectSlug, resolveImage };
  };

  const createMetaItem = (label, value) => {
    const item = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = `${label}:`;
    const text = document.createTextNode(` ${value || "-"}`);
    item.appendChild(strong);
    item.appendChild(text);
    return item;
  };

  const buildProjectCard = (record, resolver) => {
    const firma = String(record.firma || "").trim() || "Belirtilmeyen Firma";
    const rawKonu = String(record.konu || "").trim() || `${firma} için yürütülen proje kaydı.`;
    const grup = String(record.grup || "").trim() || "Belirtilmeyen Grup";
    const madde = String(record.madde || "").trim() || "Belirtilmeyen Madde";
    const tarih = formatDate(record.tarih);
    const namePresentation = getNamePresentation(firma);
    const displayFirma = namePresentation.displayName;
    const konu = rawKonu;

    const slug = resolver.resolveProjectSlug(firma);
    const hasDedicatedPage = Boolean(slug && resolver.pageSet.has(slug));
    const imageSrc = resolver.resolveImage(slug, `${firma}-${grup}-${tarih}`);
    const detailHref = hasDedicatedPage
      ? `projeler/${slug}.html`
      : `projeler/proje-kaydi.html?${new URLSearchParams({
          firma: displayFirma,
          konu,
          grup,
          madde,
          tarih,
          yil: String(record.yil || ""),
          sira: String(record.sira || ""),
          firma_turu: namePresentation.typeLabel,
          img: imageSrc,
        }).toString()}`;

    const card = document.createElement("article");
    card.className = "project-card";
    card.setAttribute("data-fade", "");

    const media = document.createElement("a");
    media.className = "project-card__image";
    media.href = detailHref;
    media.setAttribute("aria-label", `${displayFirma} proje detayı`);

    const image = document.createElement("img");
    image.src = imageSrc;
    image.alt = `${displayFirma} proje görseli`;
    image.loading = "lazy";
    media.appendChild(image);

    const content = document.createElement("div");
    content.className = "project-card__content";

    const badge = document.createElement("span");
    badge.className = "project-card__badge";
    badge.textContent = grup;

    const heading = document.createElement("h3");
    if (namePresentation.isPerson) {
      heading.className = "project-card__person-name";
      const firstName = document.createElement("span");
      firstName.className = "project-card__person-first";
      firstName.textContent = namePresentation.firstName;

      const surname = document.createElement("span");
      surname.className = "project-card__person-surname";
      surname.textContent = namePresentation.surnameMasked || "•••";

      heading.appendChild(firstName);
      heading.appendChild(document.createTextNode(" "));
      heading.appendChild(surname);
    } else {
      heading.textContent = displayFirma;
    }

    const description = document.createElement("p");
    description.textContent = konu;

    const meta = document.createElement("ul");
    meta.className = "project-card__meta";
    meta.appendChild(createMetaItem("Tarih", tarih));
    meta.appendChild(createMetaItem("Madde", madde));
    meta.appendChild(createMetaItem("Grup", grup));
    meta.appendChild(createMetaItem("Kayıt Türü", namePresentation.typeLabel));

    const actions = document.createElement("div");
    actions.className = "project-card__actions";

    const detailBtn = document.createElement("a");
    detailBtn.className = "hero-btn hero-btn--ghost";
    detailBtn.href = detailHref;
    detailBtn.textContent = "Detay sayfa";
    actions.appendChild(detailBtn);

    content.appendChild(badge);
    content.appendChild(heading);
    content.appendChild(description);
    content.appendChild(meta);
    content.appendChild(actions);

    card.appendChild(media);
    card.appendChild(content);
    return card;
  };

  const createSummaryBox = (label, value) => {
    const box = document.createElement("article");
    box.className = "projects-summary__item";

    const valueEl = document.createElement("strong");
    valueEl.textContent = value;

    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    box.appendChild(valueEl);
    box.appendChild(labelEl);
    return box;
  };

  const buildYearTypeGroup = (title, records, resolver, extraClass) => {
    const group = document.createElement("div");
    group.className = `projects-year-group ${extraClass}`.trim();

    const head = document.createElement("div");
    head.className = "projects-year-group__head";
    head.setAttribute("data-fade", "");

    const heading = document.createElement("h3");
    heading.className = "projects-year-group__title";
    heading.textContent = title;

    const count = document.createElement("span");
    count.className = "projects-year-group__count";
    count.textContent = `${records.length} kayıt`;

    head.appendChild(heading);
    head.appendChild(count);

    const grid = document.createElement("div");
    grid.className = "project-grid";

    records.forEach((record) => {
      grid.appendChild(buildProjectCard(record, resolver));
    });

    group.appendChild(head);
    group.appendChild(grid);
    return group;
  };

  const render = () => {
    const pageName = getCurrentPageName();
    const pageConfig = PAGE_CONFIG[pageName];
    if (!pageConfig) return;

    const allRecords = Array.isArray(window.PROJE_KAYITLARI) ? window.PROJE_KAYITLARI : [];
    if (!allRecords.length) return;

    const main = document.querySelector("main.madde-main");
    const container = main?.querySelector(".section.section--compact .container");
    const filterBlock = container?.querySelector("[data-project-filter]");
    if (!main || !container || !filterBlock) return;

    const filtered = allRecords
      .filter((record) => classifyRecord(record) === pageConfig.id)
      .map((record) => ({
        yil: Number(record.yil) || 0,
        sira: Number(record.sira) || 0,
        tarih: String(record.tarih || "").trim(),
        firma: String(record.firma || "").trim(),
        konu: String(record.konu || "").trim(),
        madde: String(record.madde || "").trim(),
        grup: String(record.grup || "").trim(),
      }))
      .sort((a, b) => {
        if (b.yil !== a.yil) return b.yil - a.yil;
        return a.sira - b.sira;
      });

    container.querySelectorAll(".projects-summary, .projects-section, .projects-empty-state").forEach((el) => el.remove());

    const introText = main.querySelector(".madde-intro p");
    if (introText) {
      introText.textContent = `${pageConfig.intro} Toplam ${filtered.length} kayıt bulundu.`;
    }

    if (!filtered.length) {
      const empty = document.createElement("section");
      empty.className = "projects-empty-state";
      empty.setAttribute("data-fade", "");
      empty.innerHTML = "<h3>Kayıt bulunamadı</h3><p>Bu sayfa için eşleşen proje kaydı Excel dosyasında bulunmuyor.</p>";
      container.appendChild(empty);
      return;
    }

    const resolver = buildResolver();

    const years = new Set(filtered.map((item) => item.yil));
    const personCount = filtered.filter((item) => isLikelyPersonName(item.firma)).length;
    const companyCount = filtered.length - personCount;

    const summary = document.createElement("section");
    summary.className = "projects-summary";
    summary.setAttribute("data-fade", "");

    const summaryGrid = document.createElement("div");
    summaryGrid.className = "projects-summary__grid";
    summaryGrid.appendChild(createSummaryBox("Toplam Kayıt", String(filtered.length)));
    summaryGrid.appendChild(createSummaryBox("Yıl", String(years.size)));
    summaryGrid.appendChild(createSummaryBox("Şirket", String(companyCount)));
    summaryGrid.appendChild(createSummaryBox("Şahıs", String(personCount)));

    const note = document.createElement("p");
    note.className = "projects-summary__note";
    note.textContent =
      "Sınıflandırma kuralı: 17. madde kayıtları Madde 17, maden/teknik rapor kayıtları Madde 16, tapulu kesim ve ağaç röleve kayıtları Diğer sayfasında listelenir.";

    summary.appendChild(summaryGrid);
    summary.appendChild(note);
    container.insertBefore(summary, filterBlock);

    const recordsByYear = new Map();
    filtered.forEach((record) => {
      if (!recordsByYear.has(record.yil)) recordsByYear.set(record.yil, []);
      recordsByYear.get(record.yil).push(record);
    });

    Array.from(recordsByYear.keys())
      .sort((a, b) => b - a)
      .forEach((year) => {
        const yearRecords = recordsByYear.get(year) || [];
        const yearGroups = Array.from(new Set(yearRecords.map((item) => item.grup || "Belirtilmeyen Grup")));
        const yearPersonRecords = yearRecords.filter((item) => isLikelyPersonName(item.firma));
        const yearCompanyRecords = yearRecords.filter((item) => !isLikelyPersonName(item.firma));

        const section = document.createElement("section");
        section.className = "projects-section projects-section--year";
        section.dataset.year = String(year);

        const head = document.createElement("div");
        head.className = "projects-section__head";
        head.setAttribute("data-fade", "");

        const tag = document.createElement("span");
        tag.className = "projects-section__tag";
        tag.textContent = String(year);

        const title = document.createElement("h2");
        title.textContent = `${year} Projeleri`;

        const meta = document.createElement("p");
        meta.className = "projects-section__meta";
        meta.textContent = `${yearRecords.length} kayıt • ${yearGroups.join(" • ")} • ${yearCompanyRecords.length} şirket • ${yearPersonRecords.length} şahıs`;

        head.appendChild(tag);
        head.appendChild(title);
        head.appendChild(meta);

        section.appendChild(head);
        if (yearCompanyRecords.length) {
          section.appendChild(buildYearTypeGroup("Şirket Projeleri", yearCompanyRecords, resolver, "is-company"));
        }
        if (yearPersonRecords.length) {
          section.appendChild(buildYearTypeGroup("Şahıs Projeleri", yearPersonRecords, resolver, "is-person"));
        }
        container.appendChild(section);
      });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
