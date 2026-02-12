(() => {
  const FALLBACK_IMAGES = [
    "../img/proje-yolu.jpg",
    "../img/proje-yolu2.jpg",
    "../img/surdurulebilir-orman.jpg",
    "../img/drone-haritalama.jpg",
    "../img/res-projesi.jpg",
    "../img/batikaradeniz3.jpg",
  ];

  const params = new URLSearchParams(window.location.search);
  const get = (key, fallback = "") => String(params.get(key) || fallback).trim();

  const firma = get("firma", "Belirtilmeyen Firma");
  const konu = get("konu", "Bu kayıt için detay metni paylaşılmamıştır.");
  const madde = get("madde", "Belirtilmeyen Madde");
  const grup = get("grup", "Belirtilmeyen Grup");
  const firmaTuru = get("firma_turu", "");
  const tarih = get("tarih", "-");
  const yil = get("yil", "-");
  const sira = get("sira", "-");
  const rawImage = get("img", "");

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

  const compactText = (value = "") => normalizeKey(value).replace(/\s+/g, "");

  const containsAny = (value = "", keywords = []) => {
    const text = normalizeKey(value);
    return keywords.some((keyword) => text.includes(keyword));
  };

  const classifyRecord = () => {
    const maddeCompact = compactText(madde);
    if (maddeCompact.startsWith("17")) return "17";

    const hasTapuluKesim =
      containsAny(madde, ["tapulu kesim", "tapulu kesim islemleri"]) ||
      containsAny(konu, ["tapulu kesim", "tapulu kesim islemleri"]);
    const hasAgacRoleve =
      containsAny(madde, ["agac roleve", "agac roleve plani"]) ||
      containsAny(konu, ["agac roleve", "agac roleve plani"]);
    if (hasTapuluKesim || hasAgacRoleve) return "DIGER";

    const hasMadde16 = maddeCompact.startsWith("16");
    const hasMaden = containsAny(madde, ["maden"]) || containsAny(grup, ["maden", "meden"]);
    const hasTeknikRapor =
      containsAny(madde, ["teknik rapor", "teknik rapor tanzim"]) ||
      containsAny(konu, ["teknik rapor", "teknik rapor tanzim"]);
    if (hasMadde16 || hasMaden || hasTeknikRapor) return "16";

    return "DIGER";
  };

  const resolveBackLink = () => {
    const category = classifyRecord();
    if (category === "16") return "../madde16.html";
    if (category === "17") return "../madde17.html";
    return "../diger.html";
  };

  const hashString = (value = "") => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const resolveImage = () => {
    if (rawImage) {
      if (rawImage.startsWith("http") || rawImage.startsWith("../")) return rawImage;
      if (rawImage.startsWith("img/")) return `../${rawImage}`;
    }
    const index = hashString(`${firma}-${grup}-${madde}`) % FALLBACK_IMAGES.length;
    return FALLBACK_IMAGES[index];
  };

  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  const safeFirma = firma;
  document.title = `${safeFirma} | Lacivert Ormancılık`;

  const badgeMadde = madde && madde !== "-" ? madde : "Sınıflandırılmış Kayıt";

  setText("recordTitle", safeFirma);
  setText("recordSubtitle", `${tarih} tarihli kayıt • ${grup}`);
  setText("recordBadge", `Madde ${badgeMadde} • ${grup}`);
  setText("recordHeading", `${safeFirma} Proje Kaydı`);
  setText("recordKonu", konu);

  const image = document.getElementById("recordImage");
  if (image) {
    image.src = resolveImage();
    image.alt = `${safeFirma} proje görseli`;
  }

  const meta = document.getElementById("recordMeta");
  if (meta) {
    const fields = [
      ["Firma", firma],
      ["Kayıt Türü", firmaTuru || "Şirket"],
      ["Tarih", tarih],
      ["Yıl", yil],
      ["Madde", madde],
      ["Grup", grup],
      ["Kayıt Sırası", sira],
    ];

    meta.innerHTML = "";
    fields.forEach(([label, value]) => {
      const item = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = `${label}:`;
      item.appendChild(strong);
      item.append(` ${value || "-"}`);
      meta.appendChild(item);
    });
  }

  const backBtn = document.getElementById("recordBackBtn");
  if (backBtn) {
    backBtn.href = resolveBackLink();
  }
})();
