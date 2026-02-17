const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SITE_URL = 'https://lacivert.cc';
const BRAND = 'Lacivert Ormancılık';
const COMPANY_NAME = 'Lacivert Ormancılık Mühendislik San. Tic. Ltd. Şti.';
const PHONE = '+90 530 909 41 08';
const EMAIL = 'omer@lacivert.cc';
const MAPS_URL = 'https://www.google.com/maps/place/Lacivert+Ormanc%C4%B1l%C4%B1k+M%C3%BChendislik/@40.7145355,29.9389795,19z';
const ADDRESS = {
  streetAddress: 'Selahattin Eyyübi Caddesi, Serdar Mahallesi, No:36, İç Kapı No: 11, 41 OFFİCE',
  addressLocality: 'Başiskele',
  addressRegion: 'Kocaeli',
  postalCode: '41000',
  addressCountry: 'TR',
};

const BASE_KEYWORDS = [
  'Lacivert Ormancılık',
  'ormancılık',
  'orman izin süreç yönetimi',
  'ormancılık evrak hazırlama',
  'teknik rapor tanzimi',
  'proje dosyası hazırlama',
  'mevzuat uygunluk',
  'kurum süreç takibi',
];

const PAGE_META = {
  'index.html': {
    title: 'Lacivert Ormancılık | Madde 16, Madde 17 ve Orman İzin Süreç Yönetimi',
    description:
      'Madde 16, Madde 17 ve diğer ormancılık süreçlerinde teknik evrak hazırlama, rapor tanzimi ve kurum takip hizmetleriyle Lacivert Ormancılık.',
    keywords: ['Madde 16', 'Madde 17', 'ormancılık hizmetleri', 'ağaç röleve planı', 'tapulu kesim işlemleri'],
    image: '/img/panel-16-front.jpg',
  },
  'madde16.html': {
    title: 'Madde 16 Orman İzinleri | Teknik Evrak ve Rapor Tanzimi',
    description:
      'Orman Kanunu Madde 16 kapsamında maden izinleri, teknik rapor tanzimi, rehabilitasyon dosyaları ve kurum başvuru süreç yönetimi hizmetleri.',
    keywords: ['Orman Kanunu Madde 16', 'maden izin dosyası', 'rehabilitasyon projesi', 'maden teknik rapor tanzimi'],
    image: '/img/panel-16-front.jpg',
  },
  'madde17.html': {
    title: 'Madde 17 Orman İzinleri | Enerji ve Altyapı Süreç Yönetimi',
    description:
      'Orman Kanunu Madde 17 kapsamında enerji, ulaşım ve altyapı izinlerinde teknik evrak hazırlama, dosya revizyonu ve kurum süreç takibi.',
    keywords: ['Orman Kanunu Madde 17', 'enerji izin dosyası', 'altyapı izin süreçleri', 'RES GES HES izinleri'],
    image: '/img/panel-17-front.jpg',
  },
  'diger.html': {
    title: 'Diğer Ormancılık İşleri | Tapulu Kesim ve Ağaç Röleve Planı',
    description:
      'Madde 16 ve Madde 17 dışındaki tapulu kesim işlemleri, ağaç röleve planı ve özel teknik dosya süreçlerinde uzman ormancılık hizmeti.',
    keywords: ['tapulu kesim işlemleri', 'ağaç röleve planı', 'özel teknik dosya', 'orman mevzuat süreçleri'],
    image: '/img/panel-other-front.jpg',
  },
  'ormanizinleri.html': {
    title: 'Orman İzinleri Hizmetleri | Lacivert Ormancılık',
    description:
      'Orman izinleri, teknik başvuru dosyaları, saha kontrolleri ve mevzuat uyum süreçlerinde kurumlarla koordineli profesyonel ormancılık çözümleri.',
    keywords: ['orman izinleri', 'ormancılık danışmanlığı', 'teknik dosya hazırlama', 'kurum izin süreçleri'],
    image: '/img/surdurulebilir-orman.jpg',
  },
  'kanunveyonetmelikler.html': {
    title: 'Kanun ve Yönetmelikler | Ormancılık Mevzuat Rehberi',
    description:
      'Ormancılıkta güncel kanun ve yönetmelik başlıkları, uygulama süreçleri ve proje dosyalarına yansıyan mevzuat gereklilikleri.',
    keywords: ['orman mevzuatı', 'kanun ve yönetmelikler', 'Madde 16 mevzuatı', 'Madde 17 mevzuatı'],
    image: '/img/kanunlar.jpg',
  },
  'hakkimizda.html': {
    title: 'Hakkımızda | Lacivert Ormancılık Uzman Süreç Ekibi',
    description:
      'Lacivert Ormancılık; Madde 16, Madde 17 ve diğer ormancılık dosyalarında teknik uzmanlık, hızlı evrak hazırlama ve şeffaf süreç yönetimi sunar.',
    keywords: ['Lacivert Ormancılık hakkımızda', 'ormancılık uzman ekip', 'teknik süreç yönetimi'],
    image: '/img/vizyon.jpg',
  },
  'iletisim.html': {
    title: 'İletişim | Ormancılık Projeleriniz İçin Teklif Alın',
    description:
      'Madde 16, Madde 17 ve diğer ormancılık süreçleriniz için bizimle iletişime geçin. Teknik evrak hazırlama ve süreç yönetimi için teklif alın.',
    keywords: ['ormancılık iletişim', 'proje teklifi', 'Madde 16 teklif', 'Madde 17 danışmanlık'],
    image: '/img/drone-haritalama.jpg',
  },
  'galeri.html': {
    title: 'Galeri | Ormancılık Projeleri ve Saha Uygulamaları',
    description:
      'Lacivert Ormancılık saha uygulamaları, haritalama, teknik ölçüm ve proje süreçlerinden görsellerin yer aldığı galeri sayfası.',
    keywords: ['ormancılık galeri', 'saha uygulamaları', 'proje görselleri'],
    image: '/img/gallery/gal1.jpg',
  },
  'sss.html': {
    title: 'Sıkça Sorulan Sorular | Orman İzin Süreçleri',
    description:
      'Madde 16, Madde 17, teknik evrak hazırlama ve ormancılık izin süreçleri hakkında sıkça sorulan sorular ve net yanıtlar.',
    keywords: ['ormancılık SSS', 'Madde 16 sorular', 'Madde 17 sorular', 'izin süreçleri'],
    image: '/img/ogm.jpg',
  },
  'muhendislik.html': {
    title: 'Mühendislik Hizmetleri | Lacivert Ormancılık',
    description:
      'Ormancılık odaklı mühendislik çözümleri, teknik analizler, proje planlama ve saha uygulama süreçlerinde kurumsal destek.',
    keywords: ['ormancılık mühendislik', 'teknik analiz', 'saha planlama'],
    image: '/img/drone.jpg',
  },
  'izinirtifak.html': {
    title: 'İzin ve İrtifak Süreçleri | Lacivert Ormancılık',
    description:
      'İzin ve irtifak işlemlerinde teknik belge hazırlama, kurum başvuru takibi ve mevzuata uygun süreç yönetimi hizmetleri.',
    keywords: ['izin irtifak', 'ormancılık belge hazırlama', 'kurum başvuru süreçleri'],
    image: '/img/proje-yolu.jpg',
  },
  'surdurulebilirlik.html': {
    title: 'Sürdürülebilirlik | Ormancılıkta Uzun Vadeli Yaklaşım',
    description:
      'Sürdürülebilir ormancılık yaklaşımıyla çevresel etki, rehabilitasyon planları ve kalıcı saha yönetimi süreçleri.',
    keywords: ['sürdürülebilir ormancılık', 'rehabilitasyon', 'çevresel etki'],
    image: '/img/surdurulebilir-orman.jpg',
  },
  'gizlilik-politikasi.html': {
    title: 'Gizlilik Politikası | Lacivert Ormancılık',
    description: 'Lacivert Ormancılık gizlilik politikası, veri işleme ilkeleri ve kullanıcı haklarına dair bilgilendirme metni.',
    keywords: ['gizlilik politikası', 'veri güvenliği', 'Lacivert Ormancılık'],
    image: '/img/logo-yeni.png',
  },
};

function walkHtmlFiles(startDir) {
  const results = [];
  const skipDirs = new Set(['.git', '.vs', 'node_modules']);

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          walk(path.join(current, entry.name));
        }
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
        results.push(path.join(current, entry.name));
      }
    }
  }

  walk(startDir);
  return results;
}

function decodeHtmlEntities(value = '') {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&uuml;/g, 'ü')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&ouml;/g, 'ö')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&iacute;/g, 'ı')
    .replace(/&Iacute;/g, 'İ')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
}

function stripHtml(value = '') {
  return decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateAtWord(text, maxLen = 160) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  const cut = normalized.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}.`;
}

function escapeAttr(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function relToPosix(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function getDepth(relPath) {
  return relPath.split('/').length - 1;
}

function toAbsoluteUrl(relPath) {
  if (!relPath || relPath === 'index.html') {
    return `${SITE_URL}/`;
  }
  const normalized = String(relPath).replace(/^\/+/, '');
  return `${SITE_URL}/${normalized}`;
}

function getProjectCategory(badgeText = '', relPath = '') {
  const badge = badgeText.toLocaleLowerCase('tr');
  if (badge.includes('16')) {
    return { name: 'Madde 16', href: 'madde16.html' };
  }
  if (badge.includes('17')) {
    return { name: 'Madde 17', href: 'madde17.html' };
  }
  if (badge.includes('diğer') || badge.includes('diger')) {
    return { name: 'Diğer', href: 'diger.html' };
  }

  const slug = path.basename(relPath, '.html');
  const madde16Slugs = new Set([
    'aygm-gulermak',
    'kgm-1-bolge-mudurlugu',
    'kgm-2-bolge-mudurlugu-2m',
    'kgm-atis',
    'dsi',
    'ibb-istac',
    'egm',
    'teias',
    'derince-belediye-baskanligi',
    'igdas',
    'kbb',
    'iski',
    'istanbul-emniyet-mudurlugu',
    'tedas',
    'sariyer-belediyesi',
    'camlibel',
    'kar-kaynak',
    'deniz-kaynak',
    'kizilay-kaynak-sulari',
    'devin-su',
    'kaya-turistik-tesisleri-titreyengol-otelcilik-a-s',
  ]);

  const digerSlugs = new Set([
    'ss-sarkilibahce',
    'turknet-a-s',
    'huseyin-koyuncu',
    'erkan-ozkan',
    'osman-topcu',
    'ahmet-zakir-canik',
    'rafet-durmaz',
    'cemil-danis',
    'tamer-tatli',
    'mehmet-ali-meral',
    'hale-birsun',
    'beltas-celik-gida-oto-ins-nak-san-ve-tic-ltd-sti',
    'yektioglu-ins-teks-san-ve-tic-a-s',
    'netsis-grup-muh-mus-ins-tic-ltd-sti',
    'mehmet-ali-meral-yuklenicisi',
    'arikanlar-kumas-tekstil-ins-taah-san-ve-tic-a-s',
  ]);

  if (madde16Slugs.has(slug)) {
    return { name: 'Madde 16', href: 'madde16.html' };
  }
  if (digerSlugs.has(slug)) {
    return { name: 'Diğer', href: 'diger.html' };
  }

  return { name: 'Madde 17', href: 'madde17.html' };
}

function getOgImage(relPath) {
  if (PAGE_META[relPath]?.image) {
    return PAGE_META[relPath].image;
  }

  if (relPath.startsWith('projeler/')) {
    const slug = path.basename(relPath, '.html');
    const svgPath = path.join(ROOT, 'img', 'project-covers', `${slug}.svg`);
    if (fs.existsSync(svgPath)) {
      return `/img/project-covers/${slug}.svg`;
    }
  }

  return '/img/surdurulebilir-orman.jpg';
}

function removeExistingSeo(headContent) {
  const patterns = [
    /<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->\s*/gi,
    /\s*<meta\s+name=["']description["'][^>]*>\s*/gi,
    /\s*<meta\s+name=["']keywords["'][^>]*>\s*/gi,
    /\s*<meta\s+name=["']robots["'][^>]*>\s*/gi,
    /\s*<meta\s+name=["']author["'][^>]*>\s*/gi,
    /\s*<meta\s+name=["']theme-color["'][^>]*>\s*/gi,
    /\s*<meta\s+name=["']geo\.[^"']+["'][^>]*>\s*/gi,
    /\s*<meta\s+name=["']language["'][^>]*>\s*/gi,
    /\s*<link\s+rel=["']canonical["'][^>]*>\s*/gi,
    /\s*<link\s+rel=["']alternate["'][^>]*hreflang[^>]*>\s*/gi,
    /\s*<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi,
    /\s*<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi,
    /\s*<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi,
    /\s*<link\s+rel=["']sitemap["'][^>]*>\s*/gi,
  ];

  let result = headContent;
  for (const pattern of patterns) {
    result = result.replace(pattern, '\n');
  }
  return result;
}

function collectPageContent(rawHtml) {
  const title = stripHtml((rawHtml.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const h1 = stripHtml((rawHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');
  const badge = stripHtml((rawHtml.match(/<span[^>]*class=["'][^"']*page-hero__badge[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1] || '');
  const subtitle = stripHtml((rawHtml.match(/<p[^>]*class=["'][^"']*page-hero__subtitle[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || [])[1] || '');

  const faq = [];
  const faqRegex = /<button[^>]*class=["'][^"']*accordion__header[^"']*["'][^>]*>([\s\S]*?)<\/button>[\s\S]*?<div[^>]*class=["'][^"']*accordion__content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let match;
  while ((match = faqRegex.exec(rawHtml)) !== null) {
    const question = stripHtml(match[1]);
    const answer = truncateAtWord(stripHtml(match[2]), 260);
    if (!question || !answer) continue;
    faq.push({ question, answer });
    if (faq.length >= 12) break;
  }

  return { title, h1, badge, subtitle, faq };
}

function getPageMeta(relPath, pageData) {
  const isProjectPage = relPath.startsWith('projeler/');
  const explicit = PAGE_META[relPath];

  if (explicit) {
    return {
      title: explicit.title,
      description: truncateAtWord(explicit.description, 160),
      keywords: [...BASE_KEYWORDS, ...explicit.keywords],
      image: explicit.image,
      pageType: relPath === 'index.html' ? 'website' : 'article',
      projectCategory: null,
      projectName: null,
    };
  }

  if (isProjectPage) {
    const projectName = pageData.h1 || pageData.title.replace(/\s*\|\s*Lacivert Ormancılık\s*$/i, '').trim() || 'Ormancılık Projesi';
    const category = getProjectCategory(pageData.badge, relPath);
    const categoryText = category.name === 'Madde 16'
      ? 'Orman Kanunu Madde 16'
      : category.name === 'Madde 17'
      ? 'Orman Kanunu Madde 17'
      : 'özel ormancılık süreçleri';

    const title = `${projectName} Projesi | ${category.name} | ${BRAND}`;
    const description = truncateAtWord(
      `${projectName} projesinde ${categoryText} kapsamında teknik evrak hazırlama, süreç takibi ve kurum koordinasyonu hizmetleri Lacivert Ormancılık tarafından yürütülmektedir.`,
      160,
    );

    return {
      title,
      description,
      keywords: [
        ...BASE_KEYWORDS,
        'Madde 16',
        'Madde 17',
        'ağaç röleve planı',
        'tapulu kesim işlemleri',
        projectName,
        category.name,
      ],
      image: getOgImage(relPath),
      pageType: 'article',
      projectCategory: category,
      projectName,
    };
  }

  const fallbackTitleBase = pageData.h1 || pageData.title || 'Ormancılık Hizmetleri';
  const fallbackTitle = `${fallbackTitleBase} | ${BRAND}`;
  const fallbackDesc = truncateAtWord(
    `${fallbackTitleBase} kapsamında ormancılık süreç yönetimi, teknik evrak hazırlama ve mevzuat odaklı danışmanlık hizmetleri sunuyoruz.`,
    160,
  );

  return {
    title: fallbackTitle,
    description: fallbackDesc,
    keywords: [...BASE_KEYWORDS, 'Madde 16', 'Madde 17', fallbackTitleBase],
    image: getOgImage(relPath),
    pageType: 'article',
    projectCategory: null,
    projectName: null,
  };
}

function dedupeKeywords(items) {
  const set = new Set();
  const list = [];
  for (const item of items) {
    const clean = String(item || '').trim();
    if (!clean) continue;
    const key = clean.toLocaleLowerCase('tr');
    if (set.has(key)) continue;
    set.add(key);
    list.push(clean);
  }
  return list;
}

function buildBreadcrumb(relPath, canonical, meta) {
  const items = [{ name: 'Anasayfa', url: `${SITE_URL}/` }];

  if (relPath === 'index.html') {
    return items;
  }

  if (relPath.startsWith('projeler/')) {
    items.push({ name: 'Projeler', url: `${SITE_URL}/madde16.html` });
    if (meta.projectCategory) {
      items.push({ name: meta.projectCategory.name, url: `${SITE_URL}/${meta.projectCategory.href}` });
    }
    items.push({ name: meta.projectName || 'Proje Detayı', url: canonical });
    return items;
  }

  const plainName = meta.title.split('|')[0].trim();
  items.push({ name: plainName, url: canonical });
  return items;
}

function buildStructuredData(relPath, canonical, meta, pageData) {
  const orgId = `${SITE_URL}/#organization`;
  const websiteId = `${SITE_URL}/#website`;
  const webpageId = `${canonical}#webpage`;
  const breadcrumbId = `${canonical}#breadcrumb`;

  const graph = [];

  if (relPath === 'index.html') {
    graph.push(
      {
        '@type': 'Organization',
        '@id': orgId,
        name: COMPANY_NAME,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/img/logo-yeni.png`,
        image: `${SITE_URL}/img/logo-yeni.png`,
        telephone: PHONE,
        email: EMAIL,
        address: {
          '@type': 'PostalAddress',
          ...ADDRESS,
        },
        sameAs: [
          'https://www.instagram.com/lacivertormancilik?igsh=MWw0b2pmcm9ib2ZmMw==',
          'https://www.linkedin.com/company/laci%CC%87vert-ormancilik-m%C3%BChendi%CC%87sli%CC%87k-san-ti%CC%87c-ltd-%C5%9Fti%CC%87/?viewAsMember=true',
          MAPS_URL,
        ],
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: `${SITE_URL}/`,
        name: BRAND,
        inLanguage: 'tr-TR',
        publisher: { '@id': orgId },
      },
      {
        '@type': 'ProfessionalService',
        '@id': `${SITE_URL}/#professional-service`,
        name: BRAND,
        url: `${SITE_URL}/`,
        provider: { '@id': orgId },
        areaServed: 'TR',
        serviceType: [
          'Madde 16 izin süreç yönetimi',
          'Madde 17 izin süreç yönetimi',
          'Ormancılık evrak hazırlama',
          'Ağaç röleve planı',
          'Tapulu kesim işlemleri',
        ],
      },
    );
  }

  const breadcrumbItems = buildBreadcrumb(relPath, canonical, meta);

  graph.push(
    {
      '@type': 'WebPage',
      '@id': webpageId,
      url: canonical,
      name: meta.title,
      description: meta.description,
      inLanguage: 'tr-TR',
      isPartOf: { '@id': websiteId },
      about: dedupeKeywords(meta.keywords).slice(0, 6),
      breadcrumb: { '@id': breadcrumbId },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: breadcrumbItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    },
  );

  if (relPath === 'sss.html' && Array.isArray(pageData.faq) && pageData.faq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: pageData.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
  }

  if (relPath.startsWith('projeler/')) {
    graph.push({
      '@type': 'Service',
      '@id': `${canonical}#service`,
      name: meta.projectName ? `${meta.projectName} Teknik Süreç Yönetimi` : 'Ormancılık Proje Süreç Yönetimi',
      description: meta.description,
      serviceType: meta.projectCategory ? `${meta.projectCategory.name} kapsamında teknik evrak hazırlama` : 'Ormancılık teknik süreç yönetimi',
      provider: { '@id': orgId },
      areaServed: 'TR',
      url: canonical,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

function buildSeoBlock(relPath, meta, pageData) {
  const canonical = toAbsoluteUrl(relPath);
  const ogImage = toAbsoluteUrl(meta.image || getOgImage(relPath));
  const keywords = dedupeKeywords(meta.keywords).join(', ');
  const depth = getDepth(relPath);
  const rootPrefix = depth > 0 ? '../'.repeat(depth) : '';
  const schema = buildStructuredData(relPath, canonical, meta, pageData);
  const schemaJson = JSON.stringify(schema, null, 2);

  return [
    '  <!-- SEO:START -->',
    `  <meta name="description" content="${escapeAttr(meta.description)}">`,
    `  <meta name="keywords" content="${escapeAttr(keywords)}">`,
    '  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
    '  <meta name="author" content="Lacivert Ormancılık">',
    '  <meta name="language" content="tr-TR">',
    '  <meta name="theme-color" content="#0a1f44">',
    `  <meta name="geo.placename" content="${escapeAttr(ADDRESS.addressLocality)}, ${escapeAttr(ADDRESS.addressRegion)}">`,
    '  <meta name="geo.region" content="TR-41">',
    `  <link rel="canonical" href="${escapeAttr(canonical)}">`,
    '  <link rel="alternate" hreflang="tr-TR" href="' + escapeAttr(canonical) + '">',
    `  <link rel="sitemap" type="application/xml" href="${rootPrefix}sitemap.xml">`,
    `  <meta property="og:locale" content="tr_TR">`,
    `  <meta property="og:site_name" content="${escapeAttr(BRAND)}">`,
    `  <meta property="og:type" content="${meta.pageType}">`,
    `  <meta property="og:title" content="${escapeAttr(meta.title)}">`,
    `  <meta property="og:description" content="${escapeAttr(meta.description)}">`,
    `  <meta property="og:url" content="${escapeAttr(canonical)}">`,
    `  <meta property="og:image" content="${escapeAttr(ogImage)}">`,
    '  <meta name="twitter:card" content="summary_large_image">',
    `  <meta name="twitter:title" content="${escapeAttr(meta.title)}">`,
    `  <meta name="twitter:description" content="${escapeAttr(meta.description)}">`,
    `  <meta name="twitter:image" content="${escapeAttr(ogImage)}">`,
    '  <script type="application/ld+json">',
    schemaJson,
    '  </script>',
    '  <!-- SEO:END -->',
  ].join('\n');
}

function updateHtmlFile(filePath) {
  const relPath = relToPosix(filePath);
  let html = fs.readFileSync(filePath, 'utf8');
  const pageData = collectPageContent(html);
  const meta = getPageMeta(relPath, pageData);

  const titleTag = `  <title>${escapeAttr(meta.title)}</title>`;
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, titleTag);
  } else {
    html = html.replace(/<head>/i, `<head>\n${titleTag}`);
  }

  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
  if (!headMatch) {
    return null;
  }

  let headContent = headMatch[1];
  headContent = removeExistingSeo(headContent);
  const seoBlock = buildSeoBlock(relPath, meta, pageData);

  if (/<meta\s+name=["']viewport["'][^>]*>/i.test(headContent)) {
    headContent = headContent.replace(
      /(<meta\s+name=["']viewport["'][^>]*>)/i,
      `$1\n${seoBlock}`,
    );
  } else if (/<meta\s+charset=["'][^"']+["'][^>]*>/i.test(headContent)) {
    headContent = headContent.replace(
      /(<meta\s+charset=["'][^"']+["'][^>]*>)/i,
      `$1\n${seoBlock}`,
    );
  } else {
    headContent = `\n${seoBlock}\n${headContent}`;
  }

  const newHead = `<head>${headContent}\n</head>`;
  html = html.replace(/<head>[\s\S]*?<\/head>/i, newHead);

  fs.writeFileSync(filePath, html, 'utf8');

  return {
    relPath,
    canonical: toAbsoluteUrl(relPath),
  };
}

function buildSitemap(entries) {
  const today = new Date().toISOString().slice(0, 10);

  const sorted = [...entries].sort((a, b) => {
    if (a.relPath === 'index.html') return -1;
    if (b.relPath === 'index.html') return 1;
    return a.relPath.localeCompare(b.relPath, 'tr');
  });

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const entry of sorted) {
    const isHome = entry.relPath === 'index.html';
    const isProject = entry.relPath.startsWith('projeler/');
    const isCore = ['madde16.html', 'madde17.html', 'diger.html', 'ormanizinleri.html', 'kanunveyonetmelikler.html', 'iletisim.html'].includes(entry.relPath);

    const priority = isHome ? '1.0' : isCore ? '0.9' : isProject ? '0.7' : '0.8';
    const changefreq = isHome ? 'weekly' : isCore ? 'weekly' : isProject ? 'monthly' : 'monthly';

    lines.push('  <url>');
    lines.push(`    <loc>${entry.canonical}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>${changefreq}</changefreq>`);
    lines.push(`    <priority>${priority}</priority>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return `${lines.join('\n')}\n`;
}

function buildRobotsTxt() {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /.vs/',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join('\n');
}

function main() {
  const files = walkHtmlFiles(ROOT);
  const updated = [];

  for (const file of files) {
    const info = updateHtmlFile(file);
    if (info) {
      updated.push(info);
    }
  }

  const sitemap = buildSitemap(updated);
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), buildRobotsTxt(), 'utf8');

  console.log(`SEO update completed. Updated HTML files: ${updated.length}`);
}

main();
