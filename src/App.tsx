import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { ALIAS_TO_PAGE_ID } from "./generated/pageManifest";

type ParsedPage = {
  title: string;
  headNodes: string[];
  bodyHtml: string;
};

type LazyPagePayload = {
  id: number;
  route: string;
  source: string;
  html: string;
  aliases: string[];
};

type ToolItem = {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  image: string;
  sectionTitle: string;
  sectionText: string;
  bullets: string[];
};

type GenericCalcRow = {
  id: number;
  permitType: string;
  area: number;
  closure: number;
};

type MiningYearOption = {
  year: number;
  afforestationPerHectare: number;
  sourceUrl: string;
};

type MiningPermitOption = {
  id: string;
  label: string;
  coefficient: number;
};

type MiningClosureOption = {
  id: string;
  label: string;
  coefficient: number;
};

type MiningOperationOption = {
  id: string;
  label: string;
  landMultiplier: number;
  afforestationMultiplier: number;
  exemptionAreaM2: number;
  legalNote: string;
};

type MiningProvinceOption = {
  name: string;
  coefficient: number;
};

type MiningCalcInputRow = {
  id: number;
  permitId: string;
  closureId: string;
  areaM2: number;
};

type MiningCalculatedRow = {
  id: number;
  permitLabel: string;
  permitCoefficient: number;
  closureLabel: string;
  closureCoefficient: number;
  areaM2: number;
  exemptedAreaM2: number;
  billableAreaM2: number;
  landAmount: number;
  afforestationAmount: number;
};

type CoordinatePolygon = {
  id: number;
  name: string;
  text: string;
};

type CustomRoute =
  | { kind: "list" }
  | { kind: "detail"; slug: string }
  | null;

const MANAGED_HEAD_ATTR = "data-react-page-head";

const TOOL_ITEMS: ToolItem[] = [
  {
    slug: "madencilik-orman-izin-bedeli",
    title: "Madencilikte Orman İzin Bedelleri Hesaplama Aracı",
    summary: "Madencilik izin süreçlerinde arazi bedeli, ağaçlandırma ve katsayı etkisini birlikte görün.",
    tags: ["Hesap Araçları", "Madencilik", "Orman İzinleri"],
    image: "/img/panel-16-front.jpg",
    sectionTitle: "Neden Doğru Orman İzni Hesaplaması Yapmalısınız?",
    sectionText:
      "Madencilik ve altyapı faaliyetlerinde orman izin süreçleri proje maliyetini doğrudan etkiler. Bu yüzden izin bedellerini planlama aşamasında net görmek, sürecin fizibilitesini ve nakit akışını güvenceye alır.",
    bullets: [
      "İl katsayısı ve kapalılık etkisini birlikte değerlendirir.",
      "İzin türüne göre kalem bazlı maliyet kırılımı üretir.",
      "Toplam bedeli anlık takip ederek bütçe kontrolünü kolaylaştırır.",
    ],
  },
  {
    slug: "madde-17-3-res-ges-yol",
    title: "17/3. Madde İzinleri (RES/GES/RÖD/Yol/ENH) Bedel Aracı",
    summary: "17/3 kapsamındaki enerji ve altyapı yatırımlarında izin bedellerini tek panelde yönetin.",
    tags: ["Hesap Araçları", "Enerji Tesisleri", "Orman İzinleri"],
    image: "/img/panel-17-front.jpg",
    sectionTitle: "17/3 Süreçlerinde Hızlı ve Şeffaf Planlama",
    sectionText:
      "Enerji ve altyapı yatırımlarında izin bedelleri birden fazla parametreye bağlıdır. Araç; uygulama yılı, alan ve izin türüne göre hızlı kıyaslama sunarak karar süresini kısaltır.",
    bullets: [
      "RES, GES, ENH ve yol kalemlerinde standartlaştırılmış hesaplama.",
      "Proje revizyonlarında yeni senaryoları saniyeler içinde test etme.",
      "Kurum dosyasına uygun maliyet özetinin hazır alınması.",
    ],
  },
  {
    slug: "koordinattan-kml-dxf-uretim",
    title: "Koordinattan KML/DXF Üretim Paneli",
    summary: "Koordinat listelerinden KML ve DXF çıktıları üretip dosya hazırlığını hızlandırın.",
    tags: ["Hesap Araçları", "CBS", "Genel"],
    image: "/img/drone-haritalama.jpg",
    sectionTitle: "Teknik Çıktıları Hızla Üretin",
    sectionText:
      "Saha verisini doğru formatta üretmek kurum süreçlerinin en kritik adımlarından biridir. Bu panel, koordinatları hızlıca standardize ederek KML/DXF çıktısına dönüştürür.",
    bullets: [
      "Tek tıklamayla KML ve DXF çıktı üretimi.",
      "Koordinat formatlarını tek yapıda normalize etme.",
      "Dosya hazırlık süresini sahadan ofise indirgeme.",
    ],
  },
  {
    slug: "gelismis-ed50-donusum-kml-indirme",
    title: "Gelişmiş ED50 6 Derece Dönüşüm ve KML İndirme Aracı",
    summary: "ED50 UTM koordinatlarını haritada doğrulayıp parsel bazlı KML çıktıları oluşturun.",
    tags: ["Hesap Araçları", "CBS", "Genel"],
    image: "/img/drone-haritalama.jpg",
    sectionTitle: "Gelişmiş ED50 Dönüşüm İş Akışı",
    sectionText:
      "UTM bölge seçimi, parsel yönetimi ve KML çıktı adımlarını tek ekranda birleştirerek saha verisini daha hızlı teslim etmenizi sağlar.",
    bullets: [
      "ED50 6 derece UTM ve zone seçimine uygun net iş akışı.",
      "Çoklu parsel girişi ve alan takibi.",
      "Haritada görüntüleme ve KML indirme adımlarını hızlandırma.",
    ],
  },
  {
    slug: "cad-gis-donusum-dxf-kml",
    title: "CAD ve GIS Veri Dönüşüm Aracı: DXF-KML",
    summary: "DXF ve KML verilerini çift yönlü dönüştürerek saha ve ofis verisini aynı hatta tutun.",
    tags: ["Hesap Araçları", "CBS", "Genel"],
    image: "/img/proje-yolu2.jpg",
    sectionTitle: "Veri Dönüşümünde Tutarlılık",
    sectionText:
      "Farklı ekiplerin kullandığı formatlar arasında geçiş kayıpları oluşabilir. Dönüşüm aracı, veri bütünlüğünü koruyarak proje ekipleri arasında ortak bir çalışma standardı sağlar.",
    bullets: [
      "DXF-KML dönüşümünde geometri kaybını minimize etme.",
      "Farklı yazılım ekosistemleriyle uyumlu çıktı.",
      "Proje dosyalarında tek kaynaklı veri yönetimi.",
    ],
  },
  {
    slug: "kistele-yevmiye-hesaplama",
    title: "Kıstelyevm Hesaplama Aracı",
    summary: "Kıstelyevm hesaplarında dönemsel dağılımı doğru ve hızlı şekilde çıkarın.",
    tags: ["Hesap Araçları", "Madencilik", "Orman İzinleri"],
    image: "/img/katmadegerliuretim.jpg",
    sectionTitle: "Kıstelyevm Dağılımını Netleştirin",
    sectionText:
      "Dönemsel maliyet paylaşımı doğru yapılmadığında izin dosyalarında tutarsızlık oluşur. Araç, kıstelyevm hesabını standartlaştırıp raporlamayı kolaylaştırır.",
    bullets: [
      "Dönem bazlı otomatik maliyet dağılımı.",
      "Hatalı manuel hesap riskinin azaltılması.",
      "Rapor ve kontrol süreçlerinde hız kazanımı.",
    ],
  },
  {
    slug: "karbon-su-emisyon-analiz",
    title: "Karbon, Su ve Emisyon Analiz Aracı",
    summary: "Projelerde çevresel performans göstergelerini tek panelde takip edin.",
    tags: ["Hesap Araçları", "Enerji Tesisleri"],
    image: "/img/surdurulebilir-orman.jpg",
    sectionTitle: "Çevresel Etkiyi Ölçülebilir Hale Getirin",
    sectionText:
      "Karbon, su ve emisyon göstergeleri proje kararlarını doğrudan etkiler. Analiz aracı, çevresel verileri sade bir rapora dönüştürerek sürdürülebilirlik kararlarını destekler.",
    bullets: [
      "Temel çevresel metrikleri tek dashboard'da toplama.",
      "Senaryo bazlı karşılaştırmalı çıktı üretimi.",
      "Yatırım sunumları için hızlı rapor formatı.",
    ],
  },
  {
    slug: "temdit-mahsup-hesaplama",
    title: "Temdit/Dönüşüm İzinlerinde Mahsup Hesaplama",
    summary: "Temdit ve dönüşüm süreçlerinde mahsup kalemlerini hızlı karşılaştırın.",
    tags: ["Hesap Araçları", "Madencilik", "Orman İzinleri"],
    image: "/img/ogm2.jpg",
    sectionTitle: "Temdit Süreçlerinde Bütçe Netliği",
    sectionText:
      "Temdit ve dönüşüm adımlarında mahsup hesapları karmaşıklaşabilir. Araç, kalem bazlı kırılımla süreci sadeleştirir ve karar almayı hızlandırır.",
    bullets: [
      "Kalem bazlı mahsup mantığıyla şeffaf sonuç.",
      "Farklı senaryolar için hızlı karşılaştırma.",
      "Dosya kontrolünde eksik kalem riskini azaltma.",
    ],
  },
  {
    slug: "damga-vergi-noter-bedeli",
    title: "Damga Vergisi ve Noter Bedelleri Hesaplama Aracı",
    summary: "Sözleşme ve resmi işlem bedellerini tek akışta hesaplayın.",
    tags: ["Hesap Araçları", "Madencilik", "Orman İzinleri"],
    image: "/img/kanunlar.jpg",
    sectionTitle: "Resmi Bedelleri Önceden Görün",
    sectionText:
      "Damga vergisi ve noter bedelleri proje bütçesinde sıklıkla gözden kaçar. Bu araç resmi giderleri önceden görünür hale getirerek mali planı netleştirir.",
    bullets: [
      "Sözleşme tutarına bağlı bedellerin otomatik hesaplanması.",
      "Resmi giderleri proje bütçesine erken dahil etme.",
      "Maliyet sürprizlerini azaltan öngörü sağlar.",
    ],
  },
  {
    slug: "iletisim-panolari-bedel",
    title: "İletişim Panoları (Tabela) Bedel Hesaplama Aracı",
    summary: "Tabela ve pano izinlerinde alan-tür bazlı bedelleri hızlıca görün.",
    tags: ["Hesap Araçları", "Genel", "Orman İzinleri"],
    image: "/img/proje-yolu.jpg",
    sectionTitle: "Tabela ve Pano Süreçlerini Hızlandırın",
    sectionText:
      "İletişim panoları gibi özel izin tiplerinde kalemler değişkenlik gösterir. Araç, tür ve alan bazlı hesapla doğru bedeli kısa sürede üretir.",
    bullets: [
      "Pano türüne göre dinamik hesaplama.",
      "Alan bazlı hızlı maliyet tahmini.",
      "Ön dosya hazırlığında pratik özet oluşturma.",
    ],
  },
  {
    slug: "ydo-bak-guncel-deger-hesaplama",
    title: "YDO/BAK Güncel Değer Hesaplama Aracı",
    summary: "Geçmiş yıllardaki bedelleri YDO katsayılarıyla güncel değerine hızlıca taşıyın.",
    tags: ["Hesap Araçları", "Genel", "Orman İzinleri"],
    image: "/img/kanunlar.jpg",
    sectionTitle: "YDO ile Bedel Güncelleme",
    sectionText:
      "Vergi, harç ve izin bedellerinde geçmiş tutarları güncel yıla taşımak için yeniden değerleme oranları kullanılır.",
    bullets: [
      "Başlangıç yılı seçimiyle otomatik katsayı birikimi.",
      "YDO çarpanlarını açık şekilde gösterme.",
      "Güncel bedeli tek adımda raporlama.",
    ],
  },
  {
    slug: "epdk-izinlerinde-kml-olusturma",
    title: "EPDK İzinlerinde KML Oluşturma Aracı",
    summary: "EPDK excel formatındaki koordinat satırlarını tek panelde KML çıktıya dönüştürün.",
    tags: ["Hesap Araçları", "CBS", "Enerji Tesisleri"],
    image: "/img/panel-17-front.jpg",
    sectionTitle: "EPDK Uyumlu KML Hazırlama",
    sectionText:
      "Alan adı, tür, no, Y(E), X(N) ve DOM sütunlarına uygun verileri hızlıca işleyerek kurum dosyasına uygun teknik çıktı üretir.",
    bullets: [
      "EPDK sütun sırasına uygun metin tabanlı veri girişi.",
      "Harita kontrolü ve KML indirme adımlarını tek panelde yönetme.",
      "Çoklu alan satırlarını aynı dosyada toplu dönüştürme.",
    ],
  },
  {
    slug: "kdv-ayirma-ekleme-yuzde-degisim",
    title: "KDV Ayırma/Ekleme ve Yüzde Değişim Aracı",
    summary: "KDV analizleri ve yüzde değişim hesaplarını tek panelde hızlı şekilde yönetin.",
    tags: ["Hesap Araçları", "Genel", "Finansal Analiz"],
    image: "/img/kanunlar.jpg",
    sectionTitle: "KDV ve Yüzde Analiz",
    sectionText:
      "KDV dahil-hariç tutar analizi ve iki değer arasındaki yüzde değişim hesabını tek araçta birleştirir.",
    bullets: [
      "KDV ayırma ve KDV ekleme modları.",
      "Hazır KDV oran düğmeleri ve manuel oran girişi.",
      "Eski-yeni değer karşılaştırmasında yüzde değişim sonucu.",
    ],
  },
  {
    slug: "pdf-donustur-birlestir-ayir-gorsel",
    title: "PDF Dönüştür / Birleştir / Ayır Aracı",
    summary: "PDF ve görsel dosyalarınızı tek panelde yükleyip birleştirme-ayırma akışına hazırlayın.",
    tags: ["Hesap Araçları", "Genel", "Doküman"],
    image: "/img/kanunlar.jpg",
    sectionTitle: "Doküman İşlem Merkezi",
    sectionText:
      "PDF/JPG/PNG dosyalarını tek alanda yöneterek birleştirme veya sayfa ayırma iş akışını hızlandırır.",
    bullets: [
      "Birleştir modunda çoklu dosya toplama.",
      "Ayırma modunda sayfa bazlı çıktı hazırlığı.",
      "Sürükle-bırak destekli hızlı dosya yükleme.",
    ],
  },
  {
    slug: "fidan-cit-kazik-hesaplama",
    title: "Fidan ve Çit/Kazık Hesaplama Aracı",
    summary: "Fidan adedi ile çit-kazık malzeme planını tek ekranda hızlı şekilde hesaplayın.",
    tags: ["Hesap Araçları", "Genel", "Saha Planlama"],
    image: "/img/fidandikim.jpg",
    sectionTitle: "Saha Yerleşim ve Malzeme Planı",
    sectionText:
      "Fidan dikim ve çevreleme çalışmalarında alan, sıra ve aralık parametrelerine göre planlama yapmanızı kolaylaştırır.",
    bullets: [
      "Sınır boşluğu ve sıra mesafesine göre fidan adedi analizi.",
      "Toplam çevre uzunluğundan kazık ve tel miktarı hesaplama.",
      "Teknik ekip için hızlı sahaya çıkış özetleri.",
    ],
  },
  {
    slug: "ucretsiz-fotograf-kirpma-araci",
    title: "Ücretsiz Fotoğraf Kırpma Aracı",
    summary: "Fotoğrafları hedef ölçülerde hızlı kırpın, önizleyin ve görsel olarak indirin.",
    tags: ["Hesap Araçları", "Genel", "Doküman"],
    image: "/img/dijitallesme-opt.jpg",
    sectionTitle: "Fotoğraf Boyutlandırma ve Kırpma",
    sectionText:
      "Teknik rapor, sunum ve dosya teslimlerinde kullanacağınız görselleri hedef boyuta uygun ve temiz biçimde hazırlar.",
    bullets: [
      "Hazır oran şablonları ile hızlı kırpma.",
      "Manuel genişlik-yükseklik girişi ve zoom ayarı.",
      "Merkezleme temelli güvenli çıktı indirme.",
    ],
  },
  {
    slug: "fotograf-koordinatlandirma-araci",
    title: "Fotoğraf Koordinatlandırma Aracı",
    summary: "Saha fotoğraflarını koordinat ve DOM bilgisiyle kaydedip liste halinde yönetin.",
    tags: ["Hesap Araçları", "CBS", "Saha Planlama"],
    image: "/img/drone-haritalama.jpg",
    sectionTitle: "Saha Fotoğrafı ve Koordinat Kayıt Akışı",
    sectionText:
      "Fotoğraf no, açıklama notu ve koordinat bilgisini aynı panelde toplayarak saha dokümantasyonunu hızlandırır.",
    bullets: [
      "ED50 UTM koordinatını harita merkezine otomatik taşıma.",
      "Fotoğraf dosyası, not ve koordinatı tek kayıtta birleştirme.",
      "Saha kayıt listesinden satır bazlı indirme ve silme.",
    ],
  },
];
const TOOL_INDEX = new Map(TOOL_ITEMS.map((item) => [item.slug, item]));
const MINING_TOOL_SLUG = "madencilik-orman-izin-bedeli";
const ENERGY_TOOL_SLUG = "madde-17-3-res-ges-yol";
const COORD_TOOL_SLUG = "koordinattan-kml-dxf-uretim";
const ADVANCED_ED50_TOOL_SLUG = "gelismis-ed50-donusum-kml-indirme";
const CAD_TOOL_SLUG = "cad-gis-donusum-dxf-kml";
const KIST_TOOL_SLUG = "kistele-yevmiye-hesaplama";
const CARBON_TOOL_SLUG = "karbon-su-emisyon-analiz";
const TEMDIT_MAHSUP_TOOL_SLUG = "temdit-mahsup-hesaplama";
const DAMGA_NOTER_TOOL_SLUG = "damga-vergi-noter-bedeli";
const ILETISIM_PANO_TOOL_SLUG = "iletisim-panolari-bedel";
const YDO_BAK_TOOL_SLUG = "ydo-bak-guncel-deger-hesaplama";
const EPDK_KML_TOOL_SLUG = "epdk-izinlerinde-kml-olusturma";
const KDV_YUZDE_TOOL_SLUG = "kdv-ayirma-ekleme-yuzde-degisim";
const PDF_TOOL_SLUG = "pdf-donustur-birlestir-ayir-gorsel";
const FIDAN_CIT_TOOL_SLUG = "fidan-cit-kazik-hesaplama";
const PHOTO_CROP_TOOL_SLUG = "ucretsiz-fotograf-kirpma-araci";
const PHOTO_COORD_TOOL_SLUG = "fotograf-koordinatlandirma-araci";
const M2_PER_HECTARE = 10_000;
const FIVE_HECTARES_M2 = 5 * M2_PER_HECTARE;

const TRY_CURRENCY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const TR_DECIMAL = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const TR_AREA = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatTry = (value: number): string => TRY_CURRENCY.format(value);
const formatNumber = (value: number): string => TR_DECIMAL.format(value);
const formatAreaM2 = (value: number): string => TR_AREA.format(value);

const parseLocaleNumber = (value: string): number => {
  const cleaned = value.trim().replace(/\s+/g, "");
  if (!cleaned) return Number.NaN;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    return Number.parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  if (hasComma) {
    return Number.parseFloat(cleaned.replace(",", "."));
  }
  return Number.parseFloat(cleaned);
};

type CoordPoint = { x: number; y: number };

const parseCoordinateText = (value: string): CoordPoint[] => {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(",", ".").split(/[;\s]+/).filter(Boolean))
    .filter((parts) => parts.length >= 2)
    .map((parts) => ({ x: Number.parseFloat(parts[0]), y: Number.parseFloat(parts[1]) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
};

const polygonAreaFromPoints = (points: CoordPoint[]): number => {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum / 2);
};

const MINING_APPLICATION_YEARS: MiningYearOption[] = [
  {
    year: 2026,
    afforestationPerHectare: 323_694,
    sourceUrl:
      "https://www.ogm.gov.tr/tr/e-kutuphane-sitesi/mevzuat-sitesi/Talimatlar/01.01.2026 Tarihinden İtibaren 2026 Yılı Birim Bedelleri.pdf",
  },
  {
    year: 2025,
    afforestationPerHectare: 254_853.9,
    sourceUrl:
      "https://www.ogm.gov.tr/tr/e-kutuphane-sitesi/mevzuat-sitesi/Talimatlar/01.01.2025 Tarihinden İtibaren 2025 Yılı Birim Bedellleri.pdf",
  },
  {
    year: 2024,
    afforestationPerHectare: 196_024.5,
    sourceUrl: "https://www.ogm.gov.tr/tr/e-kutuphane-sitesi/mevzuat-sitesi/Talimatlar/2024 Yılı Birim Bedelleri.pdf",
  },
  {
    year: 2023,
    afforestationPerHectare: 98_078,
    sourceUrl: "https://www.ogm.gov.tr/tr/e-kutuphane-sitesi/mevzuat-sitesi/Talimatlar/2023 Yılı Birim Bedelleri.pdf",
  },
];

const MINING_OPERATION_TYPES: MiningOperationOption[] = [
  {
    id: "new_or_additional",
    label: "Yeni izin / ilave",
    landMultiplier: 1,
    afforestationMultiplier: 1,
    exemptionAreaM2: FIVE_HECTARES_M2,
    legalNote: "Madde 9/2: aynı ruhsatta 5 hektara kadar arazi izin bedeli alınmaz.",
  },
  {
    id: "first_operation",
    label: "İlk işletme (%50 arazi bedeli)",
    landMultiplier: 0.5,
    afforestationMultiplier: 1,
    exemptionAreaM2: FIVE_HECTARES_M2,
    legalNote: "Madde 9/1-c: ilk 10 yıl arazi izin bedelinin %50'si alınır.",
  },
  {
    id: "transfer",
    label: "Devir işlemi",
    landMultiplier: 1,
    afforestationMultiplier: 0,
    exemptionAreaM2: 0,
    legalNote: "Madde 10: devirde arazi izin bedeli yeniden hesaplanır.",
  },
  {
    id: "extension",
    label: "Süre uzatımı / temdit",
    landMultiplier: 1,
    afforestationMultiplier: 0,
    exemptionAreaM2: 0,
    legalNote: "Madde 8 ve 15: süre uzatımlarında ağaçlandırma bedeli tekrar alınmaz.",
  },
];

const MINING_PERMIT_TYPES: MiningPermitOption[] = [
  { id: "drilling_search", label: "Sondaj usulü maden arama", coefficient: 0.2 },
  { id: "mining_operation", label: "Maden arama / işletme / hammadde", coefficient: 0.4 },
  { id: "facility_infrastructure", label: "Maden tesis ve altyapı tesis", coefficient: 0.5 },
  { id: "soil_fill", label: "Toprak dolgu ve altyapı tesisi", coefficient: 2 },
];

const MINING_CLOSURE_LEVELS: MiningClosureOption[] = [
  { id: "open_land", label: "Ağaçsız alanlar", coefficient: 1.0 },
  { id: "closure_10", label: "%10 ve altı kapalı + BMak", coefficient: 1.1 },
  { id: "closure_11_40", label: "%11-%40 kapalı + Mak", coefficient: 1.4 },
  { id: "closure_41_70", label: "%41-%70 kapalı orman", coefficient: 1.7 },
  { id: "closure_71_plus", label: "%71+ kapalı / ağaçlandırma / Maka3", coefficient: 2.0 },
];

const MINING_PROVINCES: MiningProvinceOption[] = [
  { name: "Adana", coefficient: 2.0 },
  { name: "Adıyaman", coefficient: 1.0 },
  { name: "Afyonkarahisar", coefficient: 1.2 },
  { name: "Ağrı", coefficient: 1.0 },
  { name: "Aksaray", coefficient: 1.0 },
  { name: "Amasya", coefficient: 1.2 },
  { name: "Ankara", coefficient: 1.6 },
  { name: "Antalya", coefficient: 2.4 },
  { name: "Ardahan", coefficient: 1.0 },
  { name: "Artvin", coefficient: 2.0 },
  { name: "Aydın", coefficient: 2.0 },
  { name: "Balıkesir", coefficient: 2.0 },
  { name: "Bartın", coefficient: 2.0 },
  { name: "Batman", coefficient: 1.0 },
  { name: "Bayburt", coefficient: 1.0 },
  { name: "Bilecik", coefficient: 1.6 },
  { name: "Bingöl", coefficient: 1.0 },
  { name: "Bitlis", coefficient: 1.0 },
  { name: "Bolu", coefficient: 2.0 },
  { name: "Burdur", coefficient: 1.6 },
  { name: "Bursa", coefficient: 2.0 },
  { name: "Çanakkale", coefficient: 2.4 },
  { name: "Çankırı", coefficient: 1.2 },
  { name: "Çorum", coefficient: 1.2 },
  { name: "Denizli", coefficient: 1.6 },
  { name: "Diyarbakır", coefficient: 1.0 },
  { name: "Düzce", coefficient: 2.0 },
  { name: "Edirne", coefficient: 1.6 },
  { name: "Elazığ", coefficient: 1.0 },
  { name: "Erzincan", coefficient: 1.0 },
  { name: "Erzurum", coefficient: 1.0 },
  { name: "Eskişehir", coefficient: 1.6 },
  { name: "Gaziantep", coefficient: 1.2 },
  { name: "Giresun", coefficient: 1.6 },
  { name: "Gümüşhane", coefficient: 1.0 },
  { name: "Hakkari", coefficient: 1.0 },
  { name: "Hatay", coefficient: 1.0 },
  { name: "Iğdır", coefficient: 1.0 },
  { name: "Isparta", coefficient: 1.6 },
  { name: "İstanbul", coefficient: 3.0 },
  { name: "İzmir", coefficient: 2.8 },
  { name: "Kahramanmaraş", coefficient: 1.0 },
  { name: "Karabük", coefficient: 2.0 },
  { name: "Karaman", coefficient: 1.0 },
  { name: "Kars", coefficient: 1.0 },
  { name: "Kastamonu", coefficient: 2.0 },
  { name: "Kayseri", coefficient: 1.6 },
  { name: "Kırıkkale", coefficient: 1.6 },
  { name: "Kırklareli", coefficient: 1.6 },
  { name: "Kırşehir", coefficient: 1.2 },
  { name: "Kilis", coefficient: 1.0 },
  { name: "Kocaeli", coefficient: 2.8 },
  { name: "Konya", coefficient: 1.6 },
  { name: "Kütahya", coefficient: 2.0 },
  { name: "Malatya", coefficient: 1.0 },
  { name: "Manisa", coefficient: 2.0 },
  { name: "Mardin", coefficient: 1.0 },
  { name: "Mersin", coefficient: 2.0 },
  { name: "Muğla", coefficient: 2.4 },
  { name: "Muş", coefficient: 1.0 },
  { name: "Nevşehir", coefficient: 1.2 },
  { name: "Niğde", coefficient: 1.2 },
  { name: "Ordu", coefficient: 1.6 },
  { name: "Osmaniye", coefficient: 1.0 },
  { name: "Rize", coefficient: 1.6 },
  { name: "Sakarya", coefficient: 2.4 },
  { name: "Samsun", coefficient: 2.0 },
  { name: "Siirt", coefficient: 1.0 },
  { name: "Sinop", coefficient: 1.6 },
  { name: "Sivas", coefficient: 1.0 },
  { name: "Şanlıurfa", coefficient: 1.0 },
  { name: "Şırnak", coefficient: 1.0 },
  { name: "Tekirdağ", coefficient: 1.6 },
  { name: "Tokat", coefficient: 1.2 },
  { name: "Trabzon", coefficient: 1.6 },
  { name: "Tunceli", coefficient: 1.0 },
  { name: "Uşak", coefficient: 1.6 },
  { name: "Van", coefficient: 1.0 },
  { name: "Yalova", coefficient: 2.4 },
  { name: "Yozgat", coefficient: 1.2 },
  { name: "Zonguldak", coefficient: 2.0 },
].sort((a, b) => a.name.localeCompare(b.name, "tr"));
const MINING_YEAR_INDEX = new Map(MINING_APPLICATION_YEARS.map((item) => [item.year, item]));
const MINING_OPERATION_INDEX = new Map(MINING_OPERATION_TYPES.map((item) => [item.id, item]));
const MINING_PERMIT_INDEX = new Map(MINING_PERMIT_TYPES.map((item) => [item.id, item]));
const MINING_CLOSURE_INDEX = new Map(MINING_CLOSURE_LEVELS.map((item) => [item.id, item]));
const MINING_PROVINCE_INDEX = new Map(MINING_PROVINCES.map((item) => [item.name, item.coefficient]));

const ENERGY_APPLICATION_YEARS: MiningYearOption[] = [...MINING_APPLICATION_YEARS];

const ENERGY_PROVINCES: MiningProvinceOption[] = [
  { name: "Ankara", coefficient: 2.4 },
  { name: "Antalya", coefficient: 2.4 },
  { name: "Bursa", coefficient: 2.0 },
  { name: "Istanbul", coefficient: 3.0 },
  { name: "Izmir", coefficient: 2.8 },
  { name: "Kocaeli", coefficient: 2.8 },
  { name: "Konya", coefficient: 1.6 },
  { name: "Sakarya", coefficient: 2.4 },
  { name: "Tekirdag", coefficient: 1.6 },
].sort((a, b) => a.name.localeCompare(b.name, "tr"));

const ENERGY_PERMIT_TYPES: MiningPermitOption[] = [
  { id: "enh", label: "ENH", coefficient: 0.05 },
  { id: "res", label: "RES", coefficient: 0.08 },
  { id: "ges", label: "GES", coefficient: 0.1 },
  { id: "yol", label: "Yol", coefficient: 0.06 },
  { id: "rod", label: "Ruzgar Olcum Diregi", coefficient: 0.04 },
];

const ENERGY_CLOSURE_LEVELS: MiningClosureOption[] = [
  { id: "closure_10", label: "Dusuk kapalilik", coefficient: 1.0 },
  { id: "closure_11_40", label: "Orta kapalilik", coefficient: 1.2 },
  { id: "closure_41_70", label: "Yuksek kapalilik", coefficient: 1.4 },
];

const PANO_PERMIT_TYPES: MiningPermitOption[] = [
  { id: "non_lit_panel", label: "Isiksiz Iletisim Panosu", coefficient: 0.875 },
  { id: "lit_panel", label: "Isikli Iletisim Panosu", coefficient: 1.0 },
  { id: "totem_panel", label: "Totem / Yuksek Pano", coefficient: 1.15 },
  { id: "digital_panel", label: "Dijital / Led Pano", coefficient: 1.3 },
];

const ENERGY_YEAR_INDEX = new Map(ENERGY_APPLICATION_YEARS.map((item) => [item.year, item]));
const ENERGY_PROVINCE_INDEX = new Map(ENERGY_PROVINCES.map((item) => [item.name, item.coefficient]));
const ENERGY_PERMIT_INDEX = new Map(ENERGY_PERMIT_TYPES.map((item) => [item.id, item]));
const ENERGY_CLOSURE_INDEX = new Map(ENERGY_CLOSURE_LEVELS.map((item) => [item.id, item]));
const PANO_PERMIT_INDEX = new Map(PANO_PERMIT_TYPES.map((item) => [item.id, item]));

const YDO_RATE_BY_TARGET_YEAR: Array<{ year: number; rate: number }> = [
  { year: 2021, rate: 9.11 },
  { year: 2022, rate: 36.2 },
  { year: 2023, rate: 122.93 },
  { year: 2024, rate: 58.46 },
  { year: 2025, rate: 43.93 },
  { year: 2026, rate: 25.49 },
];
const YDO_RATE_INDEX = new Map(YDO_RATE_BY_TARGET_YEAR.map((item) => [item.year, item.rate]));

const CUSTOM_ROUTE_HEAD_NODES = [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">',
  '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">',
  '<link rel="stylesheet" href="/css/styleorman.css">',
];

const removeTrailingSlash = (value: string): string => {
  if (value.length > 1 && value.endsWith("/")) return value.slice(0, -1);
  return value;
};

const normalizePath = (value: string): string => {
  if (!value) return "/";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  const collapsed = withLeadingSlash.replace(/\/+/g, "/");
  const withoutIndex = collapsed.replace(/\/index\.html?$/i, "") || "/";
  return removeTrailingSlash(withoutIndex) || "/";
};

const canonicalizeBrowserPath = (): string => {
  const normalized = normalizePath(window.location.pathname || "/");
  const current = window.location.pathname || "/";

  if (normalized !== current) {
    window.history.replaceState(null, "", `${normalized}${window.location.search}${window.location.hash}`);
  }

  return normalized;
};

const resolveCustomRoute = (pathname: string): CustomRoute => {
  const normalized = normalizePath(pathname);

  if (normalized === "/hesap-araclari") {
    return { kind: "list" };
  }

  if (normalized.startsWith("/hesap-araclari/")) {
    const slug = normalized.slice("/hesap-araclari/".length).trim();
    if (slug.length > 0) return { kind: "detail", slug };
  }

  return null;
};

const isLocalStylesheetHref = (href: string): boolean => {
  const normalized = href.trim();
  if (!normalized) return false;
  if (normalized.startsWith("//")) return false;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(normalized)) return false;
  return true;
};

const resolvePageId = (pathname: string): number | null => {
  const normalized = normalizePath(pathname);
  const candidates = new Set<string>();

  candidates.add(normalized);

  if (normalized !== "/") {
    candidates.add(`${normalized}/`);
    candidates.add(`${normalized}.html`);
  }

  if (/\.html$/i.test(normalized)) {
    const withoutExt = normalized.slice(0, -".html".length) || "/";
    candidates.add(withoutExt);
    if (withoutExt !== "/") candidates.add(`${withoutExt}/`);
  }

  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    const pageId = ALIAS_TO_PAGE_ID[key];
    if (typeof pageId === "number") return pageId;
  }

  return null;
};

const ensureToolsMenuLink = (doc: Document): void => {
  doc.querySelectorAll("#navLinks").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;

    const directItems = () =>
      Array.from(node.querySelectorAll(":scope > li")).filter((item): item is HTMLLIElement => item instanceof HTMLLIElement);

    let toolsItem = directItems().find((item) => item.querySelector('a[href*="hesap-araclari"]')) ?? null;

    if (!toolsItem) {
      toolsItem = doc.createElement("li");
      const link = doc.createElement("a");
      link.href = "/hesap-araclari";
      link.className = "nav__link";
      link.textContent = "Hesap Araçları";
      toolsItem.appendChild(link);
      node.appendChild(toolsItem);
    }

    const normalizedLinkText = (item: HTMLLIElement): string =>
      (item.querySelector("a")?.textContent || "").trim().toLocaleLowerCase("tr-TR");

    const items = directItems();
    const galeriItem = items.find((item) => normalizedLinkText(item) === "galeri") ?? null;
    const iletisimItem = items.find((item) => normalizedLinkText(item) === "iletişim") ?? null;
    const anchorItem = galeriItem ?? iletisimItem;

    if (anchorItem && anchorItem !== toolsItem) {
      node.insertBefore(toolsItem, anchorItem);
    }
  });

  doc.querySelectorAll(".site-footer-pro__col").forEach((col) => {
    if (!(col instanceof HTMLElement)) return;
    if (col.querySelector('a[href*="hesap-araclari"]')) return;

    const hasMenuTitle =
      (col.querySelector("h4")?.textContent || "").toLowerCase().includes("menü") ||
      (col.querySelector("h4")?.textContent || "").toLowerCase().includes("menu");

    if (!hasMenuTitle) return;

    const link = doc.createElement("a");
    link.href = "/hesap-araclari";
    link.textContent = "Hesap Araçları";
    col.appendChild(link);
  });
};

const parsePage = (rawHtml: string): ParsedPage => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  ensureToolsMenuLink(doc);

  const title = doc.title || "Lacivert Ormancılık";
  const headNodes: string[] = [];

  Array.from(doc.head.children).forEach((node) => {
    const tag = node.tagName.toLowerCase();

    if (tag === "title" || tag === "script") return;

    if (tag === "meta") {
      const charset = node.getAttribute("charset");
      const name = (node.getAttribute("name") || "").toLowerCase();
      if (charset || name === "viewport") return;
    }

    headNodes.push(node.outerHTML);
  });

  Array.from(doc.body.querySelectorAll("script")).forEach((scriptNode) => {
    scriptNode.remove();
  });

  return {
    title,
    headNodes,
    bodyHtml: doc.body.innerHTML,
  };
};

const createElementFromHtml = (html: string): Element | null => {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
};

const isInternalNavigableLink = (anchor: HTMLAnchorElement): boolean => {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;

  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const rel = (anchor.getAttribute("rel") || "").toLowerCase();
  if (rel.includes("external")) return false;

  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  return true;
};

const revealFadeElements = (): void => {
  document.querySelectorAll<HTMLElement>("[data-fade]").forEach((node) => {
    node.classList.add("visible");
  });
};

type ToolsShellProps = {
  currentPath: string;
  children: ReactNode;
};

const ToolsShell = ({ currentPath, children }: ToolsShellProps) => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    setMenuOpen(false);
    setOpenDropdown(null);
  }, [currentPath]);

  const isActive = (targetPath: string): boolean => {
    const normalizedTarget = normalizePath(targetPath);
    if (currentPath === normalizedTarget) return true;
    if (normalizedTarget !== "/" && currentPath.startsWith(`${normalizedTarget}/`)) return true;
    return false;
  };

  const isAnyActive = (targets: string[]): boolean => targets.some((target) => isActive(target));
  const navClass = (active: boolean): string => (active ? "nav__link is-current" : "nav__link");

  const handleDropdownToggle = (event: ReactMouseEvent<HTMLAnchorElement>, key: string) => {
    if (window.innerWidth > 900) return;
    event.preventDefault();
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setOpenDropdown(null);
  };

  return (
    <div className="tools-site">
      <div className="topbar">
        <div className="topbar__left">
          <a href="mailto:omer@lacivert.cc" className="topbar__mail" target="_blank" rel="noopener">
            <i className="fa-solid fa-envelope" />
            <span>omer@lacivert.cc</span>
          </a>
          <span className="topbar__divider" />
          <span className="topbar__location">
            <i className="fa-solid fa-location-dot" /> Basiskele/KOCAELI
          </span>
        </div>
        <div className="topbar__right">
          <a
            href="https://www.instagram.com/lacivertormancilik?igsh=MWw0b2pmcm9ib2ZmMw=="
            target="_blank"
            rel="noopener"
            aria-label="Instagram"
          >
            <i className="fab fa-instagram" />
          </a>
          <a
            href="https://www.linkedin.com/company/laci%CC%87vert-ormancilik-m%C3%BChendi%CC%87sli%CC%87k-san-ti%CC%87c-ltd-%C5%9Fti%CC%87/?viewAsMember=true"
            target="_blank"
            rel="noopener"
            aria-label="LinkedIn"
          >
            <i className="fab fa-linkedin-in" />
          </a>
          <a
            href="https://www.google.com/maps/place/Lacivert+Ormanc%C4%B1l%C4%B1k+M%C3%BChendislik/@40.7145355,29.9389795,19z"
            target="_blank"
            rel="noopener"
            aria-label="Google Maps"
          >
            <i className="fa-solid fa-map-location-dot" />
          </a>
        </div>
      </div>

      <header className="nav">
        <div className="container nav__inner">
          <a href="/" className="nav__logo" aria-label="Lacivert Ormancılık" onClick={closeMenu}>
            <img
              src="/img/logo-yeni.png"
              alt="Lacivert Ormancılık Logo"
              style={{ height: "50px", verticalAlign: "middle" }}
              decoding="async"
            />
          </a>
          <nav aria-label="Ana Menü">
            <ul id="navLinks" className={`nav__links${menuOpen ? " show" : ""}`}>
              <li className={`nav__dropdown${openDropdown === "kurumsal" ? " is-open" : ""}`}>
                <a
                  href="/hakkimizda.html"
                  className={navClass(isAnyActive(["/hakkimizda", "/sss"]))}
                  onClick={(event) => handleDropdownToggle(event, "kurumsal")}
                >
                  Kurumsal <i className="fa-solid fa-chevron-down" />
                </a>
                <ul className="dropdown">
                  <li><a href="/hakkimizda.html" onClick={closeMenu}>Hakkımızda</a></li>
                  <li><a href="/sss.html" onClick={closeMenu}>Sıkça Sorulan Sorular</a></li>
                </ul>
              </li>

              <li className={`nav__dropdown${openDropdown === "ormancilik" ? " is-open" : ""}`}>
                <a
                  href="/ormanizinleri.html"
                  className={navClass(isAnyActive(["/ormanizinleri", "/kanunveyonetmelikler"]))}
                  onClick={(event) => handleDropdownToggle(event, "ormancilik")}
                >
                  Ormancılık <i className="fa-solid fa-chevron-down" />
                </a>
                <ul className="dropdown">
                  <li><a href="/kanunveyonetmelikler.html" onClick={closeMenu}>Kanun ve Yönetmelikler</a></li>
                  <li><a href="/ormanizinleri.html" onClick={closeMenu}>Orman İzinleri</a></li>
                </ul>
              </li>

              <li className={`nav__dropdown${openDropdown === "projeler" ? " is-open" : ""}`}>
                <a
                  href="/madde16.html"
                  className={navClass(isAnyActive(["/madde16", "/madde17", "/diger", "/projeler"]))}
                  onClick={(event) => handleDropdownToggle(event, "projeler")}
                >
                  Projeler <i className="fa-solid fa-chevron-down" />
                </a>
                <ul className="dropdown">
                  <li><a href="/madde16.html" onClick={closeMenu}>Madde 16</a></li>
                  <li><a href="/madde17.html" onClick={closeMenu}>Madde 17</a></li>
                  <li><a href="/diger.html" onClick={closeMenu}>Diğer</a></li>
                </ul>
              </li>

              <li>
                <a className={navClass(isActive("/hesap-araclari"))} href="/hesap-araclari" onClick={closeMenu}>
                  Hesap Araçları
                </a>
              </li>
              <li><a className={navClass(isActive("/galeri"))} href="/galeri.html" onClick={closeMenu}>Galeri</a></li>
              <li>
                <a className={navClass(isActive("/iletisim"))} href="/iletisim.html" onClick={closeMenu}>
                  İletişim
                </a>
              </li>
            </ul>
          </nav>
          <button
            id="burger"
            className="nav__burger"
            aria-label="Mobil Menü"
            aria-expanded={menuOpen}
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <main className="tools-main">
        <div className="container">{children}</div>
      </main>

      <footer className="site-footer-pro">
        <div className="site-footer-pro__texture" />
        <div className="container site-footer-pro__grid">
          <div className="site-footer-pro__brand">
            <img src="/img/logo-yeni.png" alt="Lacivert Ormancılık Logo" decoding="async" />
            <p>
              Lacivert Ormancılık, ormancılık ve maden izin süreçlerinde teknik planlama, uygulama ve raporlama
              adımlarını tek merkezde yöneten mühendislik çözüm ortağıdır.
            </p>
            <div className="site-footer-pro__social">
              <a
                href="https://www.instagram.com/lacivertormancilik?igsh=MWw0b2pmcm9ib2ZmMw=="
                target="_blank"
                rel="noopener"
                aria-label="Instagram"
              >
                <i className="fab fa-instagram" />
              </a>
              <a
                href="https://www.linkedin.com/company/laci%CC%87vert-ormancilik-m%C3%BChendi%CC%87sli%CC%87k-san-ti%CC%87c-ltd-%C5%9Fti%CC%87/?viewAsMember=true"
                target="_blank"
                rel="noopener"
                aria-label="LinkedIn"
              >
                <i className="fab fa-linkedin-in" />
              </a>
              <a
                href="https://www.google.com/maps/place/Lacivert+Ormanc%C4%B1l%C4%B1k+M%C3%BChendislik/@40.7145355,29.9389795,19z"
                target="_blank"
                rel="noopener"
                aria-label="Google Maps"
              >
                <i className="fa-solid fa-map-location-dot" />
              </a>
            </div>
          </div>
          <div className="site-footer-pro__col">
            <h4>Hızlı Menü</h4>
            <a href="/">Anasayfa</a>
            <a href="/hakkimizda.html">Hakkımızda</a>
            <a href="/hesap-araclari">Hesap Araçları</a>
            <a href="/iletisim.html">İletişim</a>
          </div>
          <div className="site-footer-pro__col">
            <h4>Proje Grupları</h4>
            <a href="/madde16.html">Madde 16</a>
            <a href="/madde17.html">Madde 17</a>
            <a href="/diger.html">Diğer</a>
            <a href="/projeler/ento-maden-global.html">Örnek Proje</a>
          </div>
          <div className="site-footer-pro__col">
            <h4>İletişim</h4>
            <span>Selahattin Eyyubi Caddesi, Serdar Mahallesi, No:36, İç Kapı No: 11, 41 OFFICE</span>
            <span>Başiskele/KOCAELİ</span>
            <a href="mailto:omer@lacivert.cc">omer@lacivert.cc</a>
            <a href="tel:+905309094108">(+90) 530 909 41 08</a>
          </div>
        </div>
        <div className="site-footer-pro__bottom">
          <p>&copy; 2026 Lacivert Ormancılık. Tüm hakları saklıdır.</p>
          <a href="/gizlilik-politikasi.html">Gizlilik Politikası</a>
        </div>
      </footer>
    </div>
  );
};

const ToolsListPage = () => {
  return (
    <section className="tools-page">
      <div className="tools-page__hero">
        <h1>Hesap Araçları</h1>
        <p>
          Orman izin bedelleri, teknik dönüşümler ve mali analiz adımları için ihtiyacınız olan tüm pratik
          araçları tek bir menüde topladık.
        </p>
      </div>

      <div className="tools-grid">
        {TOOL_ITEMS.map((tool) => (
          <a key={tool.slug} href={`/hesap-araclari/${tool.slug}`} className="tool-card">
            <img src={tool.image} alt={tool.title} loading="lazy" decoding="async" />
            <div className="tool-card__overlay" />
            <div className="tool-card__body">
              <div className="tool-card__tags">
                {tool.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <h2>{tool.title}</h2>
            </div>
          </a>
        ))}
      </div>

      <section className="tools-services">
        <div className="tools-services__head">
          <h2>Lacivert Ormancılık Hizmet ve Çalışmaları</h2>
          <p>
            Lacivert Ormancılık olarak maden izinleri tanzimi, kurum görüşlerinin alınması, teknik rapor
            hazırlanması ve ağaç röleve planlarının oluşturulması süreçlerini mevzuata uygun biçimde yürütüyoruz.
          </p>
        </div>
        <div className="tools-services__grid">
          <article>
            <h3>Maden İzinleri</h3>
          </article>
          <article>
            <h3>Ağaç Röleve Planı</h3>
          </article>
          <article>
            <h3>Teknik Rapor Tanzimi</h3>
          </article>
          <article>
            <h3>Kurum Görüşleri</h3>
          </article>
        </div>
      </section>
    </section>
  );
};

type ToolDetailPageProps = {
  tool: ToolItem;
};

const MINING_REGULATION_URL =
  "https://www.ogm.gov.tr/tr/e-kutuphane-sitesi/mevzuat-sitesi/Yonetmelikler/Orman%20Kanununun%2016%20nc%C4%B1%20Madde%20Y%C3%B6netmeli%C4%9Fi%2022.08.2025%20tarih%20ve%2032994%20R.G.%20De%C4%9Fi%C5%9Fiklikleri%20%C4%B0%C5%9Flenmi%C5%9F%20Son%20Hali.pdf";

const MiningToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [operationId, setOperationId] = useState<string>(MINING_OPERATION_TYPES[0].id);
  const [applicationYear, setApplicationYear] = useState<number>(MINING_APPLICATION_YEARS[0].year);
  const [province, setProvince] = useState<string>("Ankara");
  const [permitId, setPermitId] = useState<string>(MINING_PERMIT_TYPES[1].id);
  const [closureId, setClosureId] = useState<string>(MINING_CLOSURE_LEVELS[2].id);
  const [areaValue, setAreaValue] = useState<string>("");
  const [rows, setRows] = useState<MiningCalcInputRow[]>([]);

  const selectedYear = useMemo(
    () => MINING_YEAR_INDEX.get(applicationYear) ?? MINING_APPLICATION_YEARS[0],
    [applicationYear],
  );
  const selectedOperation = useMemo(
    () => MINING_OPERATION_INDEX.get(operationId) ?? MINING_OPERATION_TYPES[0],
    [operationId],
  );
  const provinceCoefficient = useMemo(() => MINING_PROVINCE_INDEX.get(province) ?? 1, [province]);
  const unitPricePerM2 = useMemo(
    () => selectedYear.afforestationPerHectare / M2_PER_HECTARE,
    [selectedYear.afforestationPerHectare],
  );

  const calculatedRows = useMemo<MiningCalculatedRow[]>(() => {
    let remainingExemption = selectedOperation.exemptionAreaM2;

    return rows.map((row) => {
      const permit = MINING_PERMIT_INDEX.get(row.permitId) ?? MINING_PERMIT_TYPES[0];
      const closure = MINING_CLOSURE_INDEX.get(row.closureId) ?? MINING_CLOSURE_LEVELS[0];

      const exemptedAreaM2 = Math.min(remainingExemption, row.areaM2);
      remainingExemption = Math.max(0, remainingExemption - exemptedAreaM2);

      const billableAreaM2 = row.areaM2 - exemptedAreaM2;
      const baseLandAmount =
        billableAreaM2 * unitPricePerM2 * permit.coefficient * closure.coefficient * provinceCoefficient;
      const landAmount = baseLandAmount * selectedOperation.landMultiplier;
      const afforestationAmount = row.areaM2 * unitPricePerM2 * selectedOperation.afforestationMultiplier;

      return {
        id: row.id,
        permitLabel: permit.label,
        permitCoefficient: permit.coefficient,
        closureLabel: closure.label,
        closureCoefficient: closure.coefficient,
        areaM2: row.areaM2,
        exemptedAreaM2,
        billableAreaM2,
        landAmount,
        afforestationAmount,
      };
    });
  }, [rows, unitPricePerM2, provinceCoefficient, selectedOperation]);

  const totals = useMemo(
    () =>
      calculatedRows.reduce(
        (acc, row) => ({
          areaM2: acc.areaM2 + row.areaM2,
          exemptedAreaM2: acc.exemptedAreaM2 + row.exemptedAreaM2,
          landAmount: acc.landAmount + row.landAmount,
          afforestationAmount: acc.afforestationAmount + row.afforestationAmount,
        }),
        { areaM2: 0, exemptedAreaM2: 0, landAmount: 0, afforestationAmount: 0 },
      ),
    [calculatedRows],
  );

  const handleAddRow = () => {
    const normalized = areaValue.replace(",", ".").trim();
    const areaM2 = Number.parseFloat(normalized);
    if (!Number.isFinite(areaM2) || areaM2 <= 0) return;

    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        permitId,
        closureId,
        areaM2,
      },
    ]);
    setAreaValue("");
  };

  const handleDeleteRow = (id: number) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const grandTotal = totals.landAmount + totals.afforestationAmount;

  return (
    <section className="tool-detail tool-detail--mining">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>
      <div className="tool-detail__layout">
        <article className="tool-detail__content tool-detail__content--mining">
          <h1>Neden Dogru Orman Izni Hesaplamasi Yapmalisiniz?</h1>
          <p>
            Madencilik ve altyapi faaliyetlerinde orman izin surecleri, proje maliyetlerini dogrudan etkiler.
            6831 sayili Kanun kapsaminda tahakkuk eden bedellerin dogru planlanmasi, nakit akisinda ve
            fizibilite calismalarinda kritik avantaj saglar.
          </p>

          <h2>Izin Bedellerini Belirleyen Temel Kriterler</h2>
          <p>Hesaplamada dogrudan etkili ana parametreler asagidadir:</p>
          <ol>
            <li>
              <strong>Il katsayisi:</strong> Ek-3'e gore 1.0 ile 3.0 araliginda degisir.
            </li>
            <li>
              <strong>Ekolojik denge (kapalilik) katsayisi:</strong> Ek-2'ye gore 1.0 ile 2.0 araligindadir.
            </li>
            <li>
              <strong>Izin turu katsayisi:</strong> Ek-1'e gore izin turune bagli olarak 0.2 ile 2.0 araliginda
              uygulanir.
            </li>
            <li>
              <strong>Cari yil agaclandirma birim bedeli:</strong> OGM tarafindan yil bazinda ilan edilen
              TL/hektar degeri kullanilir.
            </li>
          </ol>

          <div className="tool-detail__sources">
            <h3>Veri Kaynaklari</h3>
            <ul>
              <li>
                <a href={MINING_REGULATION_URL} target="_blank" rel="noopener">
                  Orman Kanununun 16 nci Maddesi Uygulama Yonetmeligi (son hali, Ek-1/Ek-2/Ek-3)
                </a>
              </li>
              {MINING_APPLICATION_YEARS.map((option) => (
                <li key={option.year}>
                  <a href={option.sourceUrl} target="_blank" rel="noopener">
                    {option.year} Yili Birim Bedelleri (OGM Talimatlar)
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <aside className="tool-calc mining-calc">
          <div className="tool-calc__head mining-calc__head">
            <h2>{tool.title}</h2>
            <p>
              5 hektarlik arazi bedeli muafiyeti ve ilk isletme izinlerindeki %50 arazi bedeli indirimi
              secilen islem turune gore uygulanir.
            </p>
          </div>

          <div className="tool-calc__controls mining-calc__controls">
            <label>
              Islem Turu
              <select value={operationId} onChange={(event) => setOperationId(event.target.value)}>
                {MINING_OPERATION_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Uygulama Yili
              <select
                value={applicationYear}
                onChange={(event) => setApplicationYear(Number.parseInt(event.target.value, 10))}
              >
                {MINING_APPLICATION_YEARS.map((option) => (
                  <option key={option.year} value={option.year}>
                    {option.year} (₺{formatNumber(option.afforestationPerHectare / 1000)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Il Katsayisi
              <select value={province} onChange={(event) => setProvince(event.target.value)}>
                {MINING_PROVINCES.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="tool-calc__row-input mining-calc__row-input">
            <label>
              Izin Turu (Madencilik)
              <select value={permitId} onChange={(event) => setPermitId(event.target.value)}>
                {MINING_PERMIT_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alan (mÂ²)
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={areaValue}
                onChange={(event) => setAreaValue(event.target.value)}
              />
            </label>
            <label>
              Kapalilik
              <select value={closureId} onChange={(event) => setClosureId(event.target.value)}>
                {MINING_CLOSURE_LEVELS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {formatNumber(option.coefficient)} ({option.label})
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={handleAddRow}>EKLE</button>
          </div>

          <div className="tool-calc__table-wrap">
            <table className="tool-calc__table mining-calc__table">
              <thead>
                <tr>
                  <th>Madencilik Kalemi</th>
                  <th>Alan (mÂ²)</th>
                  <th>Arazi Bedeli</th>
                  <th>Ağaçlandırma</th>
                  <th>Sil</th>
                </tr>
              </thead>
              <tbody>
                {calculatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Henuz kalem eklenmedi.</td>
                  </tr>
                ) : (
                  calculatedRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.permitLabel}</strong>
                        <small>
                          Izin katsayisi {formatNumber(row.permitCoefficient)} | Kapalilik{" "}
                          {formatNumber(row.closureCoefficient)}
                        </small>
                      </td>
                      <td>
                        {formatAreaM2(row.areaM2)} mÂ²
                        {row.exemptedAreaM2 > 0 ? (
                          <small>{formatAreaM2(row.exemptedAreaM2)} mÂ² muaf</small>
                        ) : null}
                      </td>
                      <td>{formatTry(row.landAmount)}</td>
                      <td>{formatTry(row.afforestationAmount)}</td>
                      <td>
                        <button type="button" onClick={() => handleDeleteRow(row.id)}>Sil</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mining-calc__totals">
            <span>Arazi Bedeli Toplami: {formatTry(totals.landAmount)}</span>
            <span>Ağaçlandırma Toplamı: {formatTry(totals.afforestationAmount)}</span>
            <span>Genel Toplam: {formatTry(grandTotal)}</span>
          </div>
        </aside>
      </div>
    </section>
  );
};

const EnergyToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [applicationYear, setApplicationYear] = useState<number>(ENERGY_APPLICATION_YEARS[0].year);
  const [province, setProvince] = useState<string>("Ankara");
  const [permitId, setPermitId] = useState<string>(ENERGY_PERMIT_TYPES[0].id);
  const [closureId, setClosureId] = useState<string>(ENERGY_CLOSURE_LEVELS[2].id);
  const [areaValue, setAreaValue] = useState<string>("");
  const [rows, setRows] = useState<MiningCalcInputRow[]>([]);

  const selectedYear = useMemo(
    () => ENERGY_YEAR_INDEX.get(applicationYear) ?? ENERGY_APPLICATION_YEARS[0],
    [applicationYear],
  );
  const provinceCoefficient = useMemo(() => ENERGY_PROVINCE_INDEX.get(province) ?? 1, [province]);
  const unitPricePerM2 = useMemo(
    () => selectedYear.afforestationPerHectare / M2_PER_HECTARE,
    [selectedYear.afforestationPerHectare],
  );

  const calculatedRows = useMemo<MiningCalculatedRow[]>(() => {
    return rows.map((row) => {
      const permit = ENERGY_PERMIT_INDEX.get(row.permitId) ?? ENERGY_PERMIT_TYPES[0];
      const closure = ENERGY_CLOSURE_INDEX.get(row.closureId) ?? ENERGY_CLOSURE_LEVELS[0];
      const landAmount = row.areaM2 * unitPricePerM2 * permit.coefficient * closure.coefficient * provinceCoefficient;
      const afforestationAmount = row.areaM2 * unitPricePerM2;

      return {
        id: row.id,
        permitLabel: permit.label,
        permitCoefficient: permit.coefficient,
        closureLabel: closure.label,
        closureCoefficient: closure.coefficient,
        areaM2: row.areaM2,
        exemptedAreaM2: 0,
        billableAreaM2: row.areaM2,
        landAmount,
        afforestationAmount,
      };
    });
  }, [rows, unitPricePerM2, provinceCoefficient]);

  const totals = useMemo(
    () =>
      calculatedRows.reduce(
        (acc, row) => ({
          areaM2: acc.areaM2 + row.areaM2,
          landAmount: acc.landAmount + row.landAmount,
          afforestationAmount: acc.afforestationAmount + row.afforestationAmount,
        }),
        { areaM2: 0, landAmount: 0, afforestationAmount: 0 },
      ),
    [calculatedRows],
  );

  const handleAddRow = () => {
    const normalized = areaValue.replace(",", ".").trim();
    const areaM2 = Number.parseFloat(normalized);
    if (!Number.isFinite(areaM2) || areaM2 <= 0) return;

    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        permitId,
        closureId,
        areaM2,
      },
    ]);
    setAreaValue("");
  };

  const handleDeleteRow = (id: number) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const grandTotal = totals.landAmount + totals.afforestationAmount;

  return (
    <section className="tool-detail tool-detail--energy">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="energy-hero">
        <img src="/img/panel-17-front.jpg" alt={tool.title} loading="eager" decoding="async" />
        <div className="energy-hero__overlay">
          <h1>Enerji ve Diger Yatirimlar Icin Orman Izni Bedel Hesaplama Araci</h1>
        </div>
      </div>

      <div className="tool-detail__layout tool-detail__layout--energy">
        <article className="tool-detail__content tool-detail__content--energy">
          <h2>Orman Izin Bedelleri Hesaplama Araci Hakkinda</h2>
          <p>
            Bu hesaplama araci, 17/3 kapsamindaki enerji ve altyapi izinlerinde tahmini bedellerin hizli
            analiz edilmesi icin hazirlandi. Uygulama yili birim bedeli, il katsayisi, izin turu ve kapalilik
            secimleriyle tahakkuk edecek kalemleri tek panelde gormenizi saglar.
          </p>

          <h3>Hangi Kalemleri Kapsar?</h3>
          <ol>
            <li>
              <strong>Arazi Izin Bedeli:</strong> yil birim bedeli, izin turu katsayisi, kapalilik katsayisi ve il
              katsayisi carpimi ile hesaplanir.
            </li>
            <li>
              <strong>Agaclandirma Bedeli:</strong> izin verilen alan icin mÂ² bazli tek seferlik agaclandirma
              bedeli uzerinden hesaplanir.
            </li>
            <li>
              <strong>Toplam Bedel:</strong> arazi ve agaclandirma kalemlerinin toplam tutari birlikte izlenir.
            </li>
          </ol>
        </article>

        <aside className="tool-calc energy-calc">
          <div className="tool-calc__head energy-calc__head">
            <h2>Enerji ve Diger Yatirimlar Icin Orman Izni Bedel Hesaplama Araci</h2>
            <p>Genisletilmis tarih secenekli mevzuat analizli hesaplama paneli.</p>
          </div>

          <div className="tool-calc__controls energy-calc__controls">
            <label>
              Uygulama Yili (hektar bedeli)
              <select
                value={applicationYear}
                onChange={(event) => setApplicationYear(Number.parseInt(event.target.value, 10))}
              >
                {ENERGY_APPLICATION_YEARS.map((option) => (
                  <option key={option.year} value={option.year}>
                    {option.year} (₺{formatNumber(option.afforestationPerHectare)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Il Katsayisi
              <select value={province} onChange={(event) => setProvince(event.target.value)}>
                {ENERGY_PROVINCES.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="tool-calc__row-input energy-calc__row-input">
            <label>
              Izin Turu
              <select value={permitId} onChange={(event) => setPermitId(event.target.value)}>
                {ENERGY_PERMIT_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alan (mÂ²)
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={areaValue}
                onChange={(event) => setAreaValue(event.target.value)}
              />
            </label>
            <label>
              Kapalilik
              <select value={closureId} onChange={(event) => setClosureId(event.target.value)}>
                {ENERGY_CLOSURE_LEVELS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {formatNumber(option.coefficient)} ({option.label})
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={handleAddRow}>EKLE</button>
          </div>

          <div className="tool-calc__table-wrap">
            <table className="tool-calc__table energy-calc__table">
              <thead>
                <tr>
                  <th>Izin Turu</th>
                  <th>Alan (mÂ²)</th>
                  <th>Arazi Bedeli</th>
                  <th>Agaclandirma</th>
                  <th>Sil</th>
                </tr>
              </thead>
              <tbody>
                {calculatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Henuz izin eklenmedi.</td>
                  </tr>
                ) : (
                  calculatedRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.permitLabel}</strong>
                        <small>
                          Katsayi: {formatNumber(row.permitCoefficient)} | Kapalilik:{" "}
                          {formatNumber(row.closureCoefficient)}
                        </small>
                      </td>
                      <td>{formatAreaM2(row.areaM2)} mÂ²</td>
                      <td>{formatTry(row.landAmount)}</td>
                      <td>{formatTry(row.afforestationAmount)}</td>
                      <td>
                        <button type="button" onClick={() => handleDeleteRow(row.id)}>Sil</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="energy-calc__totals">
            <span>Toplam Alan: {formatAreaM2(totals.areaM2)} mÂ²</span>
            <span>Arazi Bedeli Toplami: {formatTry(totals.landAmount)}</span>
            <span>Agaclandirma Toplami: {formatTry(totals.afforestationAmount)}</span>
            <span>Genel Toplam: {formatTry(grandTotal)}</span>
          </div>
        </aside>
      </div>
    </section>
  );
};

const CoordinateToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [coordinateSystem, setCoordinateSystem] = useState<string>("ED50 6° UTM (Zone)");
  const [zone, setZone] = useState<string>("36");
  const [polygons, setPolygons] = useState<CoordinatePolygon[]>([
    { id: 1, name: "Poligon 1", text: "" },
  ]);
  const [activePolygonId, setActivePolygonId] = useState<number>(1);

  const activePolygon = useMemo(
    () => polygons.find((polygon) => polygon.id === activePolygonId) ?? polygons[0],
    [polygons, activePolygonId],
  );

  const polygonAreas = useMemo(
    () =>
      polygons.map((polygon) => {
        const points = parseCoordinateText(polygon.text);
        return {
          id: polygon.id,
          area: polygonAreaFromPoints(points),
        };
      }),
    [polygons],
  );

  const totalArea = useMemo(
    () => polygonAreas.reduce((sum, polygon) => sum + polygon.area, 0),
    [polygonAreas],
  );

  const updateActivePolygonText = (text: string) => {
    setPolygons((prev) =>
      prev.map((polygon) => (polygon.id === activePolygon.id ? { ...polygon, text } : polygon)),
    );
  };

  const addPolygon = () => {
    setPolygons((prev) => {
      const id = Date.now();
      const next = [...prev, { id, name: `Poligon ${prev.length + 1}`, text: "" }];
      setActivePolygonId(id);
      return next;
    });
  };

  return (
    <section className="tool-detail tool-detail--coord">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="coord-tool">
        <div className="coord-tool__layout">
          <article className="coord-content">
            <h1>ED50&apos;den KML&apos;ye Donusturucu Neler Yapar?</h1>
            <p>
              Bu arac, Turkiye&apos;de yaygin kullanilan ED50 datumundaki verileri WGS84 tabanli harita
              sistemlerine hizli bicimde donusturur. Lacivert Ormancılık saha-planlama sureclerinde
              koordinat uyumlulugunu bu panelle kolaylastirir.
            </p>
            <ul>
              <li>
                <strong>Toplu Donusum:</strong> Excel veya metin listelerindeki satirlari tek seferde isler.
              </li>
              <li>
                <strong>Otomatik Alan Olusturma:</strong> girdiginiz noktalardan poligon ve alan hesabi uretir.
              </li>
              <li>
                <strong>Nokta Isaretleme:</strong> her nokta icin haritada dogrulama imkani sunar.
              </li>
              <li>
                <strong>Hassas Datum Donusumu:</strong> orman izin dosyalari icin tutarli koordinat ciktilari verir.
              </li>
            </ul>
          </article>

          <aside className="coord-panel">
            <div className="coord-panel__head">
              <h2>Gelismis ED50 6Â° Donusum ve KML Indirme Araci</h2>
              <p>Calisma alaninizi haritada secin ve ilgili UTM bolgesinde parselleri olusturun.</p>
            </div>

            <div className="coord-map">
              <iframe
                title={`${tool.title} harita`}
                src="https://www.openstreetmap.org/export/embed.html?bbox=24.7%2C35.6%2C45.2%2C42.5&layer=mapnik"
                loading="lazy"
              />
              <div className="coord-map__zone coord-map__zone--36">Zone 36</div>
              <div className="coord-map__zone coord-map__zone--37">Zone 37</div>
            </div>

            <div className="coord-card">
              <label>
                Secili Bolge (UTM Zone):
                <select value={zone} onChange={(event) => setZone(event.target.value)}>
                  <option value="35">Zone 35 (Marmara / Ege)</option>
                  <option value="36">Zone 36 (Ic Anadolu / Akdeniz)</option>
                  <option value="37">Zone 37 (Karadeniz / Dogu)</option>
                </select>
              </label>
              <label>
                Koordinat Sistemi:
                <select value={coordinateSystem} onChange={(event) => setCoordinateSystem(event.target.value)}>
                  <option>ED50 6Â° UTM (Zone)</option>
                  <option>ITRF96 6Â° UTM (Zone)</option>
                  <option>WGS84 6Â° UTM (Zone)</option>
                </select>
              </label>
            </div>

            <div className="coord-card coord-card--polygon">
              <div className="coord-polygon-switch">
                {polygons.map((polygon) => (
                  <button
                    key={polygon.id}
                    type="button"
                    className={polygon.id === activePolygon.id ? "is-active" : ""}
                    onClick={() => setActivePolygonId(polygon.id)}
                  >
                    {polygon.name.replace("Poligon", "Parsel")}
                  </button>
                ))}
              </div>

              <textarea
                value={activePolygon.text}
                onChange={(event) => updateActivePolygonText(event.target.value)}
                placeholder={"Koordinatlari buraya yapistirin...\nOrn: 500123.56 4400567.80"}
              />

              <button type="button" className="coord-add" onClick={addPolygon}>+ Yeni Parsel Ekle</button>
            </div>

            <div className="coord-actions">
              <button type="button" className="coord-btn coord-btn--blue">HARITADA GOR</button>
              <button type="button" className="coord-btn coord-btn--dark">KML OLARAK INDIR</button>
              <button
                type="button"
                className="coord-btn coord-btn--muted"
                onClick={() => {
                  setPolygons([{ id: 1, name: "Poligon 1", text: "" }]);
                  setActivePolygonId(1);
                }}
              >
                TEMIZLE
              </button>
            </div>

            <div className="coord-card coord-card--area">
              <strong>Toplam Parsel Alani (mÂ²)</strong>
              <span>{formatAreaM2(totalArea)}</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

const CadConversionToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [selectedFileName, setSelectedFileName] = useState<string>("Dosya secilmedi");

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFileName(file ? file.name : "Dosya secilmedi");
  };

  return (
    <section className="tool-detail tool-detail--cad">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>
      <div className="tool-detail__layout tool-detail__layout--cad">
        <article className="tool-detail__content cad-content">
          <h1>Orman Izinleri ve Teknik Veri Donusumu</h1>
          <p>
            Lacivert Ormancılık olarak, orman izin sureclerinde kullandiginiz teknik dosyalarin hizli ve
            tutarli bicimde donusturulmesi icin CAD-GIS donusum panelini bu sisteme entegre ettik.
          </p>
          <p>
            Bu ekran ile DXF ve KML/KMZ formatlari arasinda gecisleri kolaylastirabilir, saha-plani
            uyumlulugunu kontrol ederek izin dosyalarinizi daha hizli hazirlayabilirsiniz.
          </p>

          <h2>Teknik Ozellikler ve Hizmetlerimiz</h2>
          <ul>
            <li>
              <strong>DXF'den KML'ye Donusum:</strong> teknik cizimlerinizi saha goruntulemeye uygun ciktija
              cevirir.
            </li>
            <li>
              <strong>KML'den DXF'ye Donusum:</strong> saha verilerini proje cizim akisina dahil eder.
            </li>
            <li>
              <strong>Otomatik PDF Ciktisi:</strong> donusen teknik icerigi raporlama akisina hazirlar.
            </li>
            <li>
              <strong>Web Tabanli Hiz:</strong> ek kurulum olmadan tarayici uzerinden donusum islemi saglar.
            </li>
          </ul>
        </article>

        <aside className="cad-panel">
          <div className="tool-calc__head cad-panel__head">
            <h2>Dosya Donusturme Araci</h2>
            <p>CAD ve GIS Veri Donusum Merkezi: DXF ↔ KML</p>
          </div>

          <div className="cad-map">
            <iframe
              title={`${tool.title} harita onizleme`}
              src="https://www.openstreetmap.org/export/embed.html?bbox=24.7%2C35.6%2C45.2%2C42.5&layer=mapnik"
              loading="lazy"
            />
          </div>

          <div className="cad-upload">
            <span>DOSYA SEC (.DXF, .KML, .KMZ)</span>
            <label className="cad-upload__field">
              <input type="file" accept=".dxf,.kml,.kmz" onChange={handleFileChange} />
              <strong>Dosya Sec</strong>
              <em>{selectedFileName}</em>
            </label>
            <button type="button">DOSYAYI ANALIZ ET VE GOSTER</button>
          </div>
        </aside>
      </div>
    </section>
  );
};

const KistelyevmToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [annualValue, setAnnualValue] = useState<string>("10000");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{
    dayCount: number;
    dailyAmount: number;
    principal: number;
    vat: number;
    total: number;
  } | null>(null);

  const handleCalculate = () => {
    const annualFee = parseLocaleNumber(annualValue);
    if (!Number.isFinite(annualFee) || annualFee <= 0) {
      setError("Yillik arazi izin bedeli gecerli bir tutar olmalidir.");
      setResult(null);
      return;
    }
    if (!startDate || !endDate) {
      setError("Lutfen vade ve bitis tarihlerini secin.");
      setResult(null);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Tarih alanlari gecersiz.");
      setResult(null);
      return;
    }
    if (end < start) {
      setError("Izin bitis tarihi, vade tarihinden once olamaz.");
      setResult(null);
      return;
    }

    const diffMs = end.getTime() - start.getTime();
    const dayCount = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const dailyAmount = annualFee / 360;
    const principal = dayCount * dailyAmount;
    const vat = principal * 0.2;
    const total = principal + vat;

    setError("");
    setResult({ dayCount, dailyAmount, principal, vat, total });
  };

  return (
    <section className="tool-detail tool-detail--kist">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>
      <div className="tool-detail__layout tool-detail__layout--kist">
        <article className="tool-detail__content kist-content">
          <h1>Kistelyevm Hesaplamasi Nasil Yapilir?</h1>
          <p>
            Bu hesap araci, guncel mevzuata uygun olarak 360 gun esasi ile kist bedel tahmini uretir.
            Baslangic ve bitis tarihleri arasindaki net gun farkina gore arazi izin bedelini prorata olarak
            hesaplar.
          </p>
          <ul>
            <li>
              <strong>360 Gun Esasi:</strong> yillik bedel 360&apos;a bolunerek gunluk birim tutar uretilir.
            </li>
            <li>
              <strong>Net Gun Farki:</strong> baslangic ve bitis tarihleri arasinda gun sayisi otomatik hesaplanir.
            </li>
            <li>
              <strong>KDV Entegrasyonu:</strong> hesaplanan ana tutara %20 KDV otomatik eklenir.
            </li>
            <li>
              <strong>Kontrol:</strong> sahaya ait rakamlarin kurum kayitlariyla teyit edilmesi onerilir.
            </li>
          </ul>
        </article>

        <aside className="tool-calc kist-calc">
          <div className="tool-calc__head">
            <h2>{tool.title}</h2>
            <p>Kistelyevm hesap adimlarini tek formda tamamlayin.</p>
          </div>

          <div className="kist-calc__body">
            <label>
              Vade Tarihi
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>

            <label>
              Izin Bitis Tarihi
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>

            <label>
              Yillik Arazi Izin Bedeli (TL)
              <input
                type="text"
                inputMode="decimal"
                value={annualValue}
                onChange={(event) => setAnnualValue(event.target.value)}
                placeholder="10.000,00"
              />
            </label>

            <button type="button" onClick={handleCalculate}>HESAPLA</button>

            {error ? <p className="kist-calc__error">{error}</p> : null}

            {result ? (
              <div className="kist-calc__result">
                <span>Net Gun: {result.dayCount}</span>
                <span>Gunluk Bedel: {formatTry(result.dailyAmount)}</span>
                <span>Kist Ana Tutar: {formatTry(result.principal)}</span>
                <span>KDV (%20): {formatTry(result.vat)}</span>
                <span>Genel Toplam: {formatTry(result.total)}</span>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
};

const CarbonAnalysisToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [areaHectareValue, setAreaHectareValue] = useState<string>("10,00");
  const [standingVolumeValue, setStandingVolumeValue] = useState<string>("1500,00");
  const [speciesGroup, setSpeciesGroup] = useState<string>("needleleaf");
  const [closureClass, setClosureClass] = useState<string>("normal");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{
    livingCarbon: number;
    deadWoodCarbon: number;
    litterCarbon: number;
    soilCarbon: number;
    totalCarbon: number;
  } | null>(null);

  const handleCalculate = () => {
    const areaHectare = parseLocaleNumber(areaHectareValue);
    const standingVolume = parseLocaleNumber(standingVolumeValue);

    if (!Number.isFinite(areaHectare) || areaHectare <= 0) {
      setError("Saha alani 0'dan buyuk olmalidir.");
      setResult(null);
      return;
    }
    if (!Number.isFinite(standingVolume) || standingVolume <= 0) {
      setError("Dikili servet degeri 0'dan buyuk olmalidir.");
      setResult(null);
      return;
    }

    const speciesFactors: Record<string, { woodDensity: number; expansion: number; rootShoot: number; litterTon: number; soilTon: number }> = {
      needleleaf: { woodDensity: 0.446, expansion: 1.212, rootShoot: 0.29, litterTon: 7.46, soilTon: 76.56 },
      broadleaf: { woodDensity: 0.541, expansion: 1.31, rootShoot: 0.24, litterTon: 3.75, soilTon: 84.82 },
      mixed: { woodDensity: 0.494, expansion: 1.261, rootShoot: 0.265, litterTon: 5.6, soilTon: 80.69 },
    };
    const closureFactors: Record<string, number> = {
      sparse: 0.25,
      normal: 1,
    };

    const factor = speciesFactors[speciesGroup] ?? speciesFactors.mixed;
    const closureFactor = closureFactors[closureClass] ?? 1;

    const aboveBiomassTon = standingVolume * factor.woodDensity * factor.expansion;
    const belowBiomassTon = aboveBiomassTon * factor.rootShoot;
    const livingCarbon = (aboveBiomassTon + belowBiomassTon) * 0.5 * closureFactor;
    const deadWoodCarbon = aboveBiomassTon * 0.01 * 0.47 * closureFactor;
    const litterCarbon = areaHectare * factor.litterTon * 0.47 * closureFactor;
    const soilCarbon = areaHectare * factor.soilTon * closureFactor;
    const totalCarbon = livingCarbon + deadWoodCarbon + litterCarbon + soilCarbon;

    setError("");
    setResult({
      livingCarbon,
      deadWoodCarbon,
      litterCarbon,
      soilCarbon,
      totalCarbon,
    });
  };

  return (
    <section className="tool-detail tool-detail--carbon">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="carbon-stock-hero">
        <img src="/img/surdurulebilir-orman.jpg" alt={tool.title} loading="eager" decoding="async" />
      </div>

      <div className="carbon-stock-layout">
        <article className="carbon-stock-info">
          <h1>Orman Ekosistemlerinde Karbon Stok Analizi</h1>
          <p>
            Bu arac, orman izin sureclerinde talep edilen karbon stok analizini hizli bir on degerlendirme
            olarak sunar. Amenajman plani (Plan Ozet No: 8) temelli yaklasimla hesaplama adimlari
            sadeleştirilmiştir.
          </p>

          <h2>Karbon Hesaplamasi Neden Gereklidir?</h2>
          <p>
            Orman alanlarinda yapilacak faaliyetlerin iklim etkisini ortaya koymak, iznin teknik
            fizibilitesini dogru okumak icin gereklidir. Hesaplama; yalnizca agaclari degil, olu ortu ve
            toprak organik karbonunu da dikkate alir.
          </p>

          <h2>Hesaplamada Kullanilan Temel Havuzlar</h2>
          <ul>
            <li>
              <strong>Canli Biyokutle:</strong> govde, dal, yaprak ve kok sistemleri.
            </li>
            <li>
              <strong>Olu Organik Madde:</strong> olu odun ve olu ortu tabakasi.
            </li>
            <li>
              <strong>Toprak Karbonu:</strong> ekosistemdeki en buyuk karbon havuzlarindan biri.
            </li>
          </ul>
        </article>

        <aside className="carbon-stock-panel">
          <div className="carbon-stock-panel__head">
            <h2>Orman Karbon Stok Hesaplama Araci</h2>
            <p>IPCC ve Ulusal Orman Envanteri Metodolojisi</p>
          </div>

          <div className="carbon-stock-panel__body">
            <div className="carbon-stock-panel__grid">
              <label>
                Saha Alani (Hektar)
                <input
                  type="text"
                  inputMode="decimal"
                  value={areaHectareValue}
                  onChange={(event) => setAreaHectareValue(event.target.value)}
                />
              </label>

              <label>
                Dikili Servet (mÂ³)
                <input
                  type="text"
                  inputMode="decimal"
                  value={standingVolumeValue}
                  onChange={(event) => setStandingVolumeValue(event.target.value)}
                />
              </label>

              <label>
                Agac Turu Grubu
                <select value={speciesGroup} onChange={(event) => setSpeciesGroup(event.target.value)}>
                  <option value="needleleaf">Ibreli Orman</option>
                  <option value="broadleaf">Yaprakli Orman</option>
                  <option value="mixed">Karisik Orman</option>
                </select>
              </label>

              <label>
                Kapalilik Durumu
                <select value={closureClass} onChange={(event) => setClosureClass(event.target.value)}>
                  <option value="normal">Normal (%11-100)</option>
                  <option value="sparse">Bosluklu Kapali (%1-10)</option>
                </select>
              </label>
            </div>

            <button type="button" className="carbon-stock-panel__button" onClick={handleCalculate}>
              STOK HESAPLA
            </button>

            {error ? <p className="carbon-stock-panel__error">{error}</p> : null}

            {result ? (
              <div className="carbon-stock-result">
                <span>Canli Biyokutle Karbonu: {formatNumber(result.livingCarbon)} ton C</span>
                <span>Olu Odun Karbonu: {formatNumber(result.deadWoodCarbon)} ton C</span>
                <span>Olu Ortu Karbonu: {formatNumber(result.litterCarbon)} ton C</span>
                <span>Toprak Karbonu: {formatNumber(result.soilCarbon)} ton C</span>
                <span>Toplam Karbon Stogu: {formatNumber(result.totalCarbon)} ton C</span>
              </div>
            ) : null}

            <div className="carbon-stock-note">
              <h3>Hesaplama Aracinin Bilimsel Temeli</h3>
              <ul>
                <li>Toprak ustu canli biyokutle = DGH x hacim agirligi x genisletme katsayisi</li>
                <li>Toprak alti canli biyokutle = Toprak ustu biyokutle x kok/govde orani</li>
                <li>Olu odun = Toprak ustu canli biyokutlenin %1&apos;i x 0.47</li>
                <li>Olu ortu ve toprak karbonu tur grubuna gore hektar bazli katsayiyla hesaplanir</li>
              </ul>
              <p>Not: Bosluklu kapali alanlarda (%1-10) olu ortu ve toprak karbonu 1/4 oraninda alinmistir.</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

const TemditMahsupToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [dueDate, setDueDate] = useState<string>("");
  const [paidAmountValue, setPaidAmountValue] = useState<string>("50000");
  const [manualTerm, setManualTerm] = useState<boolean>(false);
  const [termDaysValue, setTermDaysValue] = useState<string>("365");
  const [newStartDate, setNewStartDate] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{
    termDays: number;
    remainingDays: number;
    dailyAmount: number;
    mahsupAmount: number;
  } | null>(null);

  const handleCalculate = () => {
    const paidAmount = parseLocaleNumber(paidAmountValue);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      setError("Odenen bedel gecerli bir tutar olmalidir.");
      setResult(null);
      return;
    }
    if (!dueDate || !newStartDate) {
      setError("Lutfen vade tarihi ve yeni izin baslangic tarihini secin.");
      setResult(null);
      return;
    }

    const due = new Date(dueDate);
    const start = new Date(newStartDate);
    if (Number.isNaN(due.getTime()) || Number.isNaN(start.getTime())) {
      setError("Tarih alanlari gecersiz.");
      setResult(null);
      return;
    }

    const parsedTermDays = manualTerm ? Number.parseInt(termDaysValue, 10) : 365;
    if (!Number.isFinite(parsedTermDays) || parsedTermDays <= 0) {
      setError("Vade gun sayisi 1 veya daha buyuk olmalidir.");
      setResult(null);
      return;
    }

    const dayMs = 1000 * 60 * 60 * 24;
    const rawRemaining = Math.floor((due.getTime() - start.getTime()) / dayMs) + 1;
    const remainingDays = Math.max(0, rawRemaining);
    const dailyAmount = paidAmount / parsedTermDays;
    const mahsupAmount = dailyAmount * remainingDays;

    setError("");
    setResult({
      termDays: parsedTermDays,
      remainingDays,
      dailyAmount,
      mahsupAmount,
    });
  };

  return (
    <section className="tool-detail tool-detail--temdit">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="temdit-layout">
        <article className="temdit-info">
          <h1>Orman Izin Mahsup Islemleri Hakkinda Bilgilendirme</h1>
          <p>
            Hazirladigimiz <strong>Orman Izin Mukerrer Odeme Hesaplayici</strong>, temdit (sure uzatimi),
            donusum veya devir sureclerinde olusabilecek mukerrer odemeleri onceden analiz etmeniz icin
            tasarlandi.
          </p>

          <h2>Onemli Notlar</h2>
          <ul>
            <li>
              <strong>Tahmini Sonuclar:</strong> bu arac matematiksel bir modelleme sunar ve tahmini sonuc uretir.
            </li>
            <li>
              <strong>Degisken Parametreler:</strong> birim bedel, YI-UFE, il katsayisi ve bolge uygulamalari
              nihai tutari degistirebilir.
            </li>
            <li>
              <strong>Resmi Gecerlilik:</strong> ciktilar resmi tahakkuk belgesi degildir; kesin tutar kurum
              kararlarina gore netlesir.
            </li>
          </ul>

          <blockquote>
            Tavsiye: Mahsup islemlerine baslamadan once bagli bulundugunuz orman idaresi birimlerinden guncel
            uygulama talimatlarini dogrulayin.
          </blockquote>
        </article>

        <aside className="temdit-panel">
          <div className="temdit-panel__head">
            <h2>{tool.title}</h2>
            <p>Mukerrer Gun ve Odeme Hesaplama</p>
          </div>

          <div className="temdit-form">
            <div className="temdit-form__grid">
              <label>
                1. Izin Vade Tarihi
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </label>

              <label>
                Odenen Bedel (TL)
                <input
                  type="text"
                  inputMode="decimal"
                  value={paidAmountValue}
                  onChange={(event) => setPaidAmountValue(event.target.value)}
                  placeholder="Orn: 50.000"
                />
              </label>
            </div>

            <label className="temdit-check">
              <input
                type="checkbox"
                checked={manualTerm}
                onChange={(event) => setManualTerm(event.target.checked)}
              />
              <span>Vade suresi 1 yildan farkli (manuel gun gir)</span>
            </label>

            {manualTerm ? (
              <label>
                Vade Gun Sayisi
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={termDaysValue}
                  onChange={(event) => setTermDaysValue(event.target.value)}
                />
              </label>
            ) : null}

            <label>
              2. (Yeni) Izin Baslangic Tarihi
              <input type="date" value={newStartDate} onChange={(event) => setNewStartDate(event.target.value)} />
            </label>

            <button type="button" onClick={handleCalculate}>HESAPLA</button>

            {error ? <p className="temdit-error">{error}</p> : null}

            {result ? (
              <div className="temdit-result">
                <span>Vade Gun Sayisi: {result.termDays}</span>
                <span>Kalan Gun: {result.remainingDays}</span>
                <span>Gunluk Bedel: {formatTry(result.dailyAmount)}</span>
                <span>Mahsup Tutari: {formatTry(result.mahsupAmount)}</span>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
};

const DamgaNoterToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [pageCountValue, setPageCountValue] = useState<string>("4");
  const [copyCountValue, setCopyCountValue] = useState<string>("2");
  const [annualFeeValue, setAnnualFeeValue] = useState<string>("10000");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{
    dayCount: number;
    yearRatio: number;
    matrah: number;
    damgaTax: number;
    noterFee: number;
    maktuCost: number;
    vat: number;
    total: number;
  } | null>(null);

  const handleCalculate = () => {
    const annualFee = parseLocaleNumber(annualFeeValue);
    const pageCount = Number.parseInt(pageCountValue, 10);
    const copyCount = Number.parseInt(copyCountValue, 10);

    if (!startDate || !endDate) {
      setError("Lutfen izin baslangic ve bitis tarihlerini secin.");
      setResult(null);
      return;
    }
    if (!Number.isFinite(annualFee) || annualFee <= 0) {
      setError("Yillik arazi izin bedeli gecerli bir tutar olmalidir.");
      setResult(null);
      return;
    }
    if (!Number.isFinite(pageCount) || pageCount <= 0 || !Number.isFinite(copyCount) || copyCount <= 0) {
      setError("Sayfa ve suret sayilari 1 veya daha buyuk olmalidir.");
      setResult(null);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Tarih alanlari gecersiz.");
      setResult(null);
      return;
    }
    if (end < start) {
      setError("Izin bitis tarihi, izin baslangic tarihinden once olamaz.");
      setResult(null);
      return;
    }

    const diffMs = end.getTime() - start.getTime();
    const dayCount = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const yearRatio = dayCount / 365;
    const matrah = annualFee * yearRatio;
    const damgaTax = matrah * 0.00948;
    const noterFee = matrah * 0.0113;
    const maktuCost = pageCount * 12 + copyCount * 8;
    const vat = (noterFee + maktuCost) * 0.2;
    const total = damgaTax + noterFee + maktuCost + vat;

    setError("");
    setResult({
      dayCount,
      yearRatio,
      matrah,
      damgaTax,
      noterFee,
      maktuCost,
      vat,
      total,
    });
  };

  return (
    <section className="tool-detail tool-detail--noter">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="noter-layout">
        <article className="noter-info">
          <h1>Orman Izinlerinde Taahhut Senedi Noter Masraflari ve Damga Vergisi Rehberi</h1>
          <p>
            Orman Genel Mudurlugu&apos;nden alinan izinlerin kesinlesmesi surecinde noter onayli taahhut
            senedi duzenlenir. Bu adimda olusan noter masraflari ve damga vergisi, proje maliyetini dogrudan
            etkileyen kalemlerdendir.
          </p>

          <h2>Taahhut Senedi Masraflari Nasil Hesaplanir?</h2>
          <p>Hesaplama su ana kalemler uzerinden tahmini olarak modellenir:</p>
          <ol>
            <li>
              <strong>Nispi Damga Vergisi:</strong> toplam taahhut bedeli (matrah) uzerinden binde 9.48
              oraninda hesaplanir.
            </li>
            <li>
              <strong>Noter Harci:</strong> matrah uzerinden nispi noterlilik harci oraniyla belirlenir.
            </li>
            <li>
              <strong>Maktu Giderler:</strong> sayfa sayisi ve suret sayisina bagli sabit giderleri icerir.
            </li>
            <li>
              <strong>KDV:</strong> noterlik hizmet kalemlerine %20 KDV uygulanir.
            </li>
          </ol>
        </article>

        <aside className="noter-panel">
          <div className="noter-panel__head">
            <h2>{tool.title}</h2>
            <p>Dinamik Sayfa ve Suret Hesaplama</p>
          </div>

          <div className="noter-form">
            <div className="noter-form__grid">
              <label>
                Izin Baslangic
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </label>
              <label>
                Izin Bitis
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </label>
            </div>

            <div className="noter-form__grid">
              <label>
                Sayfa Sayisi
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={pageCountValue}
                  onChange={(event) => setPageCountValue(event.target.value)}
                />
              </label>
              <label>
                Suret Sayisi
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={copyCountValue}
                  onChange={(event) => setCopyCountValue(event.target.value)}
                />
              </label>
            </div>

            <label>
              Yillik Arazi Izin Bedeli (TL)
              <input
                type="text"
                inputMode="decimal"
                value={annualFeeValue}
                onChange={(event) => setAnnualFeeValue(event.target.value)}
                placeholder="10.000,00 TL"
              />
            </label>

            <button type="button" onClick={handleCalculate}>HESAPLA</button>

            {error ? <p className="noter-error">{error}</p> : null}

            {result ? (
              <div className="noter-result">
                <span>Sure: {result.dayCount} gun ({formatNumber(result.yearRatio)} yil)</span>
                <span>Matrah: {formatTry(result.matrah)}</span>
                <span>Damga Vergisi: {formatTry(result.damgaTax)}</span>
                <span>Noter Harci: {formatTry(result.noterFee)}</span>
                <span>Maktu Giderler: {formatTry(result.maktuCost)}</span>
                <span>KDV: {formatTry(result.vat)}</span>
                <span>Toplam Tahmini Tutar: {formatTry(result.total)}</span>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
};

const IletisimPanosuToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const defaultProvince = MINING_PROVINCES.find((item) => item.coefficient === 3)?.name ?? MINING_PROVINCES[0].name;
  const [applicationYear, setApplicationYear] = useState<number>(MINING_APPLICATION_YEARS[0].year);
  const [province, setProvince] = useState<string>(defaultProvince);
  const [permitId, setPermitId] = useState<string>(PANO_PERMIT_TYPES[0].id);
  const [closureId, setClosureId] = useState<string>(MINING_CLOSURE_LEVELS[0].id);
  const [areaValue, setAreaValue] = useState<string>("");
  const [rows, setRows] = useState<Array<{ id: number; permitId: string; closureId: string; areaM2: number }>>([]);

  const selectedYear = useMemo(
    () => MINING_YEAR_INDEX.get(applicationYear) ?? MINING_APPLICATION_YEARS[0],
    [applicationYear],
  );
  const provinceCoefficient = useMemo(() => MINING_PROVINCE_INDEX.get(province) ?? 1, [province]);
  const unitPricePerM2 = useMemo(
    () => selectedYear.afforestationPerHectare / M2_PER_HECTARE,
    [selectedYear.afforestationPerHectare],
  );

  const calculatedRows = useMemo(
    () =>
      rows.map((row) => {
        const permit = PANO_PERMIT_INDEX.get(row.permitId) ?? PANO_PERMIT_TYPES[0];
        const closure = MINING_CLOSURE_INDEX.get(row.closureId) ?? MINING_CLOSURE_LEVELS[0];
        const amount = row.areaM2 * unitPricePerM2 * permit.coefficient * closure.coefficient * provinceCoefficient;

        return {
          id: row.id,
          permitLabel: permit.label,
          closureLabel: closure.label,
          closureCoefficient: closure.coefficient,
          areaM2: row.areaM2,
          amount,
        };
      }),
    [rows, unitPricePerM2, provinceCoefficient],
  );

  const totalAmount = useMemo(
    () => calculatedRows.reduce((sum, row) => sum + row.amount, 0),
    [calculatedRows],
  );

  const handleAddRow = () => {
    const areaM2 = parseLocaleNumber(areaValue);
    if (!Number.isFinite(areaM2) || areaM2 <= 0) return;

    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        permitId,
        closureId,
        areaM2,
      },
    ]);
    setAreaValue("");
  };

  const handleDeleteRow = (id: number) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  return (
    <section className="tool-detail tool-detail--pano">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="pano-hero">
        <img src="/img/panel-other-front.jpg" alt={tool.title} loading="eager" decoding="async" />
        <div className="pano-hero__overlay">
          <h1>Iletisim Panosu (Reklam / Ilan) Izin Bedeli Hesaplama Araci</h1>
        </div>
      </div>

      <div className="pano-layout">
        <article className="pano-info">
          <h2>Orman Alanlarinda Iletisim Panosu Izin Surecleri</h2>
          <p>
            6831 sayili Kanun kapsaminda reklam ve ilan panolari icin izin sureci; uygulama yili birim
            bedeli, il katsayisi, pano turu artirim katsayisi ve kapalilik (K.EKO) parametreleriyle birlikte
            degerlendirilir.
          </p>

          <h3>Bedel Hesaplama ve Guncel Katsayilar</h3>
          <p>
            Hesaplama aracinda once uygulama yili/hektar bedeli secilir. Ardindan il katsayisi ve pano turu
            katsayisi secilerek m2 bazli tutar hesaplanir.
          </p>

          <h3>Izin Turu Katsayisi</h3>
          <p>
            Reklam ve ilan amacli pano izinlerinde baz katsayi 0.875 alinmis, pano teknik ozelliklerine gore
            artirimli katsayi secenekleri eklenmistir.
          </p>
        </article>

        <aside className="pano-panel">
          <div className="pano-panel__head">
            <h2>{tool.title}</h2>
            <p>OGM Mevzuati ve Guncel Katsayi</p>
          </div>

          <div className="pano-panel__controls">
            <label>
              Uygulama Yili (Hektar Bedeli)
              <select
                value={applicationYear}
                onChange={(event) => setApplicationYear(Number.parseInt(event.target.value, 10))}
              >
                {MINING_APPLICATION_YEARS.map((option) => (
                  <option key={option.year} value={option.year}>
                    {option.year} ({formatTry(option.afforestationPerHectare)})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Il Katsayisi
              <select value={province} onChange={(event) => setProvince(event.target.value)}>
                {MINING_PROVINCES.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="pano-panel__row-input">
            <label>
              Pano Turu (Artirimli)
              <select value={permitId} onChange={(event) => setPermitId(event.target.value)}>
                {PANO_PERMIT_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Yuzey Alani (mÂ²)
              <input
                type="text"
                inputMode="decimal"
                value={areaValue}
                onChange={(event) => setAreaValue(event.target.value)}
                placeholder="0,00"
              />
            </label>

            <label>
              Kapalilik (K.EKO)
              <select value={closureId} onChange={(event) => setClosureId(event.target.value)}>
                {MINING_CLOSURE_LEVELS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {formatNumber(option.coefficient)} ({option.label})
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={handleAddRow}>EKLE</button>
          </div>

          <div className="pano-table-wrap">
            <table className="pano-table">
              <thead>
                <tr>
                  <th>Pano Tanimi</th>
                  <th>Alan (mÂ²)</th>
                  <th>K.Eko</th>
                  <th>Bedel</th>
                  <th>Sil</th>
                </tr>
              </thead>
              <tbody>
                {calculatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Veri girisi yapilmadi.</td>
                  </tr>
                ) : (
                  calculatedRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.permitLabel}</td>
                      <td>{formatAreaM2(row.areaM2)}</td>
                      <td>{formatNumber(row.closureCoefficient)}</td>
                      <td>{formatTry(row.amount)}</td>
                      <td>
                        <button type="button" onClick={() => handleDeleteRow(row.id)}>Sil</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pano-summary">
            <span>Toplam Tahmini Bedel: {formatTry(totalAmount)}</span>
          </div>
        </aside>
      </div>
    </section>
  );
};

const YdoBakToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const targetYear = YDO_RATE_BY_TARGET_YEAR[YDO_RATE_BY_TARGET_YEAR.length - 1]?.year ?? 2026;
  const earliestStartYear = (YDO_RATE_BY_TARGET_YEAR[0]?.year ?? targetYear) - 1;
  const startYearOptions = useMemo(() => {
    const total = targetYear - earliestStartYear + 1;
    return Array.from({ length: Math.max(total, 1) }, (_, index) => targetYear - index);
  }, [earliestStartYear, targetYear]);

  const [amountValue, setAmountValue] = useState<string>("10000,00");
  const [startYear, setStartYear] = useState<number>(startYearOptions[0] ?? targetYear);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{
    coefficient: number;
    updatedAmount: number;
    appliedRates: Array<{ year: number; rate: number }>;
  } | null>(null);

  const handleCalculate = () => {
    const principal = parseLocaleNumber(amountValue);
    if (!Number.isFinite(principal) || principal <= 0) {
      setError("Tutar alani gecerli bir deger olmalidir.");
      setResult(null);
      return;
    }
    if (startYear > targetYear) {
      setError("Baslangic yili hedef yildan buyuk olamaz.");
      setResult(null);
      return;
    }

    const appliedRates: Array<{ year: number; rate: number }> = [];
    let coefficient = 1;

    for (let year = startYear + 1; year <= targetYear; year += 1) {
      const rate = YDO_RATE_INDEX.get(year);
      if (typeof rate !== "number") {
        setError(`${year} yili icin YDO verisi bulunamadi.`);
        setResult(null);
        return;
      }
      coefficient *= 1 + rate / 100;
      appliedRates.push({ year, rate });
    }

    setError("");
    setResult({
      coefficient,
      updatedAmount: principal * coefficient,
      appliedRates,
    });
  };

  return (
    <section className="tool-detail tool-detail--ydo">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="ydo-layout">
        <article className="ydo-info">
          <h1>Yeniden Degerleme Orani Bedel Hesaplama Rehberi</h1>
          <p>
            Ormancilik, maden ve enerji sureclerinde eski bedellerin bugunku karsiligini gormek icin
            Yeniden Degerleme Orani (YDO) katsayisi kullanilir. Bu arac, secilen baslangic yilindan
            {` ${targetYear} `}yilina kadar olan kümülatif carpanla guncel bedeli hesaplar.
          </p>
          <p>
            YDO; Vergi Usul Kanunu kapsaminda YI-UFE ortalama fiyat artisini yansitir ve bircok vergi/harc
            kaleminin yillik guncellenmesinde referans olarak kullanilir.
          </p>

          <h2>Yeniden Degerleme Orani Nedir?</h2>
          <p>
            YDO, bir onceki yil ortalamalarina gore ilan edilen resmi artistir. Gececek yillarin bedel
            projeksiyonunda her yil icin ilan edilen oranlar ardisk katsayi olarak carpilir.
          </p>
        </article>

        <aside className="ydo-panel">
          <div className="ydo-panel__head">
            <h2>{tool.title}</h2>
            <p>Hedef Yil: {targetYear}</p>
          </div>

          <div className="ydo-form">
            <div className="ydo-form__grid">
              <label>
                Tutar (TL)
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountValue}
                  onChange={(event) => setAmountValue(event.target.value)}
                  placeholder="10.000,00 TL"
                />
              </label>

              <label>
                Baslangic Yili
                <select value={startYear} onChange={(event) => setStartYear(Number.parseInt(event.target.value, 10))}>
                  {startYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button type="button" onClick={handleCalculate}>HESAPLA</button>

            {error ? <p className="ydo-error">{error}</p> : null}

            {result ? (
              <div className="ydo-result">
                <span>Kümülatif Katsayi: {formatNumber(result.coefficient)}</span>
                <span>Guncel Bedel ({targetYear}): {formatTry(result.updatedAmount)}</span>
                <div className="ydo-rates">
                  {result.appliedRates.length === 0 ? (
                    <small>Baslangic yili hedef yil ile ayni oldugu icin carpan uygulanmadi.</small>
                  ) : (
                    result.appliedRates.map((entry) => (
                      <small key={entry.year}>
                        {entry.year}: %{formatNumber(entry.rate)}
                      </small>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
};

const KdvYuzdeToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [mode, setMode] = useState<"ayirma" | "ekleme">("ayirma");
  const [amountValue, setAmountValue] = useState<string>("0,00");
  const [ratePreset, setRatePreset] = useState<"1" | "10" | "20" | "other">("20");
  const [customRateValue, setCustomRateValue] = useState<string>("18");
  const [oldValue, setOldValue] = useState<string>("0,00");
  const [newValue, setNewValue] = useState<string>("0,00");

  const activeRate = useMemo(() => {
    if (ratePreset === "other") return parseLocaleNumber(customRateValue);
    return Number.parseFloat(ratePreset);
  }, [ratePreset, customRateValue]);

  const kdvResult = useMemo(() => {
    const amount = parseLocaleNumber(amountValue);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(activeRate) || activeRate < 0) {
      return { base: 0, vat: 0, total: 0 };
    }

    if (mode === "ayirma") {
      const base = amount / (1 + activeRate / 100);
      const vat = amount - base;
      return { base, vat, total: amount };
    }

    const vat = amount * (activeRate / 100);
    const total = amount + vat;
    return { base: amount, vat, total };
  }, [amountValue, activeRate, mode]);

  const percentResult = useMemo(() => {
    const oldAmount = parseLocaleNumber(oldValue);
    const newAmount = parseLocaleNumber(newValue);
    if (!Number.isFinite(oldAmount) || !Number.isFinite(newAmount) || oldAmount === 0) {
      return { valid: false, percent: 0, diff: 0 };
    }
    const diff = newAmount - oldAmount;
    const percent = (diff / oldAmount) * 100;
    return { valid: true, percent, diff };
  }, [oldValue, newValue]);

  return (
    <section className="tool-detail tool-detail--finance">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="finance-grid">
        <article className="finance-note">
          <h1>Finansal Hesaplama Rehberi</h1>
          <p>
            Bu panel ile KDV ayirma/ekleme islemlerini anlik yapabilir, ayni ekranda iki farkli deger
            arasindaki yuzde degisimi hesaplayabilirsiniz. Finansal teklif, fatura ve maliyet analizlerinde
            hizli on kontrol saglar.
          </p>
        </article>

        <aside className="finance-kdv">
          <div className="finance-kdv__head">
            <h2>{tool.title}</h2>
            <p>Hizli ve Hassas Finansal Analiz</p>
          </div>

          <div className="finance-kdv__tabs">
            <button
              type="button"
              className={mode === "ayirma" ? "is-active" : ""}
              onClick={() => setMode("ayirma")}
            >
              KDV Ayirma
            </button>
            <button
              type="button"
              className={mode === "ekleme" ? "is-active" : ""}
              onClick={() => setMode("ekleme")}
            >
              KDV Ekleme
            </button>
          </div>

          <div className="finance-kdv__body">
            <label>
              KDV Dahil Tutar (TL)
              <input
                type="text"
                inputMode="decimal"
                value={amountValue}
                onChange={(event) => setAmountValue(event.target.value)}
              />
            </label>

            <div className="finance-kdv__rates">
              <span>KDV Orani (%)</span>
              <div className="finance-kdv__rate-buttons">
                <button
                  type="button"
                  className={ratePreset === "1" ? "is-active" : ""}
                  onClick={() => setRatePreset("1")}
                >
                  %1
                </button>
                <button
                  type="button"
                  className={ratePreset === "10" ? "is-active" : ""}
                  onClick={() => setRatePreset("10")}
                >
                  %10
                </button>
                <button
                  type="button"
                  className={ratePreset === "20" ? "is-active" : ""}
                  onClick={() => setRatePreset("20")}
                >
                  %20
                </button>
                <button
                  type="button"
                  className={ratePreset === "other" ? "is-active" : ""}
                  onClick={() => setRatePreset("other")}
                >
                  Diger
                </button>
              </div>
              {ratePreset === "other" ? (
                <input
                  type="text"
                  inputMode="decimal"
                  value={customRateValue}
                  onChange={(event) => setCustomRateValue(event.target.value)}
                  placeholder="KDV oranini girin"
                />
              ) : null}
            </div>

            <div className="finance-kdv__result">
              <span>
                Ana Para (KDV Haric): <strong>{formatTry(kdvResult.base)}</strong>
              </span>
              <span>
                Hesaplanan KDV: <strong>{formatTry(kdvResult.vat)}</strong>
              </span>
              <span>
                Genel Toplam: <strong>{formatTry(kdvResult.total)}</strong>
              </span>
            </div>
          </div>
        </aside>

        <aside className="finance-percent">
          <div className="finance-percent__head">
            <h2>Yuzde Degisim Hesaplama</h2>
            <p>Eski ve Yeni Deger Arasindaki Fark Analizi</p>
          </div>
          <div className="finance-percent__body">
            <div className="finance-percent__grid">
              <label>
                Eski Deger
                <input
                  type="text"
                  inputMode="decimal"
                  value={oldValue}
                  onChange={(event) => setOldValue(event.target.value)}
                />
              </label>
              <label>
                Yeni Deger
                <input
                  type="text"
                  inputMode="decimal"
                  value={newValue}
                  onChange={(event) => setNewValue(event.target.value)}
                />
              </label>
            </div>

            <div className="finance-percent__result">
              <small>Hesaplanan Degisim Orani</small>
              <strong className={percentResult.valid && percentResult.percent < 0 ? "is-negative" : "is-positive"}>
                {percentResult.valid ? `%${formatNumber(percentResult.percent)}` : "- %0,00"}
              </strong>
              <span>
                Miktarsal Fark: {percentResult.valid ? formatTry(percentResult.diff) : formatTry(0)}
              </span>
            </div>
          </div>
        </aside>

        <article className="finance-note finance-note--quick">
          <h2>Hizli Analiz Rehberi</h2>
          <p>
            KDV ayirma/ekleme islemiyle yuzde degisim panelini birlikte kullanarak teklif revizyonu, fatura
            kontrolu, maliyet artisi veya indirim etkisini ayni ekranda gorebilirsiniz.
          </p>
        </article>
      </div>
    </section>
  );
};

const EpdkKmlToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  type EpdkRow = {
    areaName: string;
    itemType: string;
    rowNo: number;
    easting: number;
    northing: number;
    zone: number;
  };

  const [inputText, setInputText] = useState<string>(
    [
      "BagimsizAlan1\tOngorulen Santral Sahasi\t1\t355962.818\t4328976.270\t39",
      "BagimsizAlan1\tOngorulen Santral Sahasi\t2\t355806.903\t4328040.746\t39",
      "BagimsizAlan1\tOngorulen Santral Sahasi\t3\t355332.082\t4328285.586\t39",
    ].join("\n"),
  );
  const [showPoints, setShowPoints] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");

  const parsedRows = useMemo<EpdkRow[]>(() => {
    return inputText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(/\t+| {2,}/).map((value) => value.trim()).filter(Boolean);
        if (parts.length < 6) return null;

        const rowNo = Number.parseInt(parts[2], 10);
        const easting = parseLocaleNumber(parts[3]);
        const northing = parseLocaleNumber(parts[4]);
        const zone = Number.parseInt(parts[5], 10);
        if (!Number.isFinite(rowNo) || !Number.isFinite(easting) || !Number.isFinite(northing) || !Number.isFinite(zone)) {
          return null;
        }

        return {
          areaName: parts[0],
          itemType: parts[1],
          rowNo,
          easting,
          northing,
          zone,
        };
      })
      .filter((row): row is EpdkRow => row !== null);
  }, [inputText]);

  const areaCount = useMemo(() => new Set(parsedRows.map((row) => row.areaName)).size, [parsedRows]);

  const utmToLatLon = (easting: number, northing: number, zone: number): { lat: number; lon: number } => {
    const a = 6378137;
    const f = 1 / 298.257223563;
    const k0 = 0.9996;
    const e = Math.sqrt(f * (2 - f));
    const eSq = e * e;
    const ePrimeSq = eSq / (1 - eSq);
    const x = easting - 500000;
    const y = northing;
    const lonOrigin = (zone - 1) * 6 - 180 + 3;

    const m = y / k0;
    const mu = m / (a * (1 - eSq / 4 - (3 * eSq * eSq) / 64 - (5 * eSq * eSq * eSq) / 256));
    const e1 = (1 - Math.sqrt(1 - eSq)) / (1 + Math.sqrt(1 - eSq));

    const j1 = (3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32;
    const j2 = (21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32;
    const j3 = (151 * Math.pow(e1, 3)) / 96;
    const j4 = (1097 * Math.pow(e1, 4)) / 512;

    const fp = mu + j1 * Math.sin(2 * mu) + j2 * Math.sin(4 * mu) + j3 * Math.sin(6 * mu) + j4 * Math.sin(8 * mu);
    const sinFp = Math.sin(fp);
    const cosFp = Math.cos(fp);
    const tanFp = Math.tan(fp);

    const n1 = a / Math.sqrt(1 - eSq * sinFp * sinFp);
    const r1 = (a * (1 - eSq)) / Math.pow(1 - eSq * sinFp * sinFp, 1.5);
    const c1 = ePrimeSq * cosFp * cosFp;
    const t1 = tanFp * tanFp;
    const d = x / (n1 * k0);

    const lat =
      fp -
      ((n1 * tanFp) / r1) *
        ((d * d) / 2 -
          ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ePrimeSq) * Math.pow(d, 4)) / 24 +
          ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ePrimeSq - 3 * c1 * c1) * Math.pow(d, 6)) / 720);

    const lon =
      ((d - ((1 + 2 * t1 + c1) * Math.pow(d, 3)) / 6 + ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ePrimeSq + 24 * t1 * t1) * Math.pow(d, 5)) / 120) /
        cosFp) +
      (lonOrigin * Math.PI) / 180;

    return {
      lat: (lat * 180) / Math.PI,
      lon: (lon * 180) / Math.PI,
    };
  };

  const handlePreview = () => {
    if (parsedRows.length === 0) {
      setStatus("Gecerli formatta satir bulunamadi. Sutun sirasini kontrol edin.");
      return;
    }
    setStatus(`${areaCount} alan icin ${parsedRows.length} nokta hazirlandi.`);
  };

  const handleDownloadKml = () => {
    if (parsedRows.length === 0) {
      setStatus("KML olusturmak icin once gecerli satirlar girin.");
      return;
    }

    const grouped = new Map<string, EpdkRow[]>();
    parsedRows.forEach((row) => {
      const current = grouped.get(row.areaName) ?? [];
      current.push(row);
      grouped.set(row.areaName, current);
    });

    const placemarks: string[] = [];

    grouped.forEach((rows, areaName) => {
      const orderedRows = [...rows].sort((a, b) => a.rowNo - b.rowNo);
      const coords = orderedRows
        .map((row) => {
          const converted = utmToLatLon(row.easting, row.northing, row.zone);
          return `${converted.lon.toFixed(8)},${converted.lat.toFixed(8)},0`;
        });

      if (coords.length >= 3) {
        const polygonCoords = [...coords, coords[0]].join(" ");
        placemarks.push(`
          <Placemark>
            <name>${areaName}</name>
            <description>Tur: ${orderedRows[0]?.itemType ?? "-"}</description>
            <Polygon>
              <outerBoundaryIs>
                <LinearRing>
                  <coordinates>${polygonCoords}</coordinates>
                </LinearRing>
              </outerBoundaryIs>
            </Polygon>
          </Placemark>
        `);
      } else if (coords.length === 2) {
        placemarks.push(`
          <Placemark>
            <name>${areaName}</name>
            <LineString>
              <coordinates>${coords.join(" ")}</coordinates>
            </LineString>
          </Placemark>
        `);
      } else if (coords.length === 1) {
        placemarks.push(`
          <Placemark>
            <name>${areaName}</name>
            <Point><coordinates>${coords[0]}</coordinates></Point>
          </Placemark>
        `);
      }

      if (showPoints) {
        orderedRows.forEach((row) => {
          const converted = utmToLatLon(row.easting, row.northing, row.zone);
          placemarks.push(`
            <Placemark>
              <name>${areaName} - Nokta ${row.rowNo}</name>
              <Point><coordinates>${converted.lon.toFixed(8)},${converted.lat.toFixed(8)},0</coordinates></Point>
            </Placemark>
          `);
        });
      }
    });

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>EPDK KML Ciktisi</name>
    ${placemarks.join("\n")}
  </Document>
</kml>`;

    const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `epdk-kml-${Date.now()}.kml`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setStatus(`${areaCount} alan icin KML dosyasi indirildi.`);
  };

  const handleClear = () => {
    setInputText("");
    setShowPoints(false);
    setStatus("");
  };

  return (
    <section className="tool-detail tool-detail--epdk">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>
      <div className="epdk-layout">
        <article className="epdk-content">
          <h1>Nasil Kullanilir?</h1>
          <ol>
            <li>Verileri Hazirlayin: Alan Adi, Tur, Sira No, Y(E), X(N), DOM sirasiyla kopyalayin.</li>
            <li>Yapistirin: Satirlari paneldeki metin alanina ekleyin.</li>
            <li>Haritada Kontrol Edin: Haritada Goster ile satirlarin islenmesini dogrulayin.</li>
            <li>Opsiyonel Noktalar: Nokta placemarklarini dahil etmek icin secenegi acin.</li>
            <li>KML Olarak Indir: KML dosyasini indirip kurum dosyasina ekleyin.</li>
          </ol>

          <h2>Onemli Notlar</h2>
          <ul>
            <li>
              <strong>Sutun Sirasi:</strong> Alan Adi | Tur | No | Y | X | DOM
            </li>
            <li>
              <strong>DOM:</strong> Donusum icin bolge degeri (Orn: 27, 30, 33, 36, 39, 42, 45) gerekli.
            </li>
          </ul>
        </article>

        <aside className="epdk-panel">
          <div className="epdk-panel__head">
            <h2>{tool.title}</h2>
            <p>EPDK izinlerine ait Excel tablosuyla uyumludur.</p>
          </div>

          <div className="epdk-map">
            <iframe
              title={`${tool.title} harita`}
              src="https://www.openstreetmap.org/export/embed.html?bbox=24.7%2C35.6%2C45.2%2C42.5&layer=mapnik"
              loading="lazy"
            />
          </div>

          <div className="epdk-info-row">
            <span>Sutun Sirasi: Alan Adi | Tur | No | Y (E) | X (N) | DOM</span>
            <label>
              <input
                type="checkbox"
                checked={showPoints}
                onChange={(event) => setShowPoints(event.target.checked)}
              />
              KML&apos;de Noktalari Goster
            </label>
          </div>

          <textarea
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder="Ornek format (her satir: AlanAdi Tur No Y X DOM)"
          />

          <div className="epdk-actions">
            <button type="button" className="epdk-btn epdk-btn--blue" onClick={handlePreview}>
              HARITADA GOSTER
            </button>
            <button type="button" className="epdk-btn epdk-btn--green" onClick={handleDownloadKml}>
              KML OLARAK INDIR
            </button>
            <button type="button" className="epdk-btn epdk-btn--gray" onClick={handleClear}>
              TEMIZLE
            </button>
          </div>

          <p className="epdk-status">{status || "Hazir."}</p>
        </aside>
      </div>
    </section>
  );
};

const PhotoCoordinateToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  type PhotoCoordRow = {
    id: number;
    photoLabel: string;
    coordinateLabel: string;
    dom: number;
    lat: number;
    lon: number;
    note: string;
    file: File | null;
    fileName: string;
  };

  const [coordSystem, setCoordSystem] = useState<string>("ed50-6-utm");
  const [dom, setDom] = useState<number>(33);
  const [coordinateText, setCoordinateText] = useState<string>("");
  const [photoNo, setPhotoNo] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PhotoCoordRow[]>([]);
  const [status, setStatus] = useState<string>("Koordinat girdikten sonra harita otomatik merkezlenir.");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parseFirstCoordinate = (value: string): { easting: number; northing: number } | null => {
    const lines = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const line of lines) {
      const parts = line
        .replace(/,/g, ".")
        .split(/[;\s]+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (parts.length < 2) continue;

      const easting = parseLocaleNumber(parts[0]);
      const northing = parseLocaleNumber(parts[1]);
      if (Number.isFinite(easting) && Number.isFinite(northing)) {
        return { easting, northing };
      }
    }

    return null;
  };

  const utmToLatLon = (easting: number, northing: number, zone: number): { lat: number; lon: number } => {
    const a = 6378137;
    const f = 1 / 298.257223563;
    const k0 = 0.9996;
    const e = Math.sqrt(f * (2 - f));
    const eSq = e * e;
    const ePrimeSq = eSq / (1 - eSq);
    const x = easting - 500000;
    const y = northing;
    const lonOrigin = (zone - 1) * 6 - 180 + 3;

    const m = y / k0;
    const mu = m / (a * (1 - eSq / 4 - (3 * eSq * eSq) / 64 - (5 * eSq * eSq * eSq) / 256));
    const e1 = (1 - Math.sqrt(1 - eSq)) / (1 + Math.sqrt(1 - eSq));

    const j1 = (3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32;
    const j2 = (21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32;
    const j3 = (151 * Math.pow(e1, 3)) / 96;
    const j4 = (1097 * Math.pow(e1, 4)) / 512;

    const fp = mu + j1 * Math.sin(2 * mu) + j2 * Math.sin(4 * mu) + j3 * Math.sin(6 * mu) + j4 * Math.sin(8 * mu);
    const sinFp = Math.sin(fp);
    const cosFp = Math.cos(fp);
    const tanFp = Math.tan(fp);

    const n1 = a / Math.sqrt(1 - eSq * sinFp * sinFp);
    const r1 = (a * (1 - eSq)) / Math.pow(1 - eSq * sinFp * sinFp, 1.5);
    const c1 = ePrimeSq * cosFp * cosFp;
    const t1 = tanFp * tanFp;
    const d = x / (n1 * k0);

    const lat =
      fp -
      ((n1 * tanFp) / r1) *
        ((d * d) / 2 -
          ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ePrimeSq) * Math.pow(d, 4)) / 24 +
          ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ePrimeSq - 3 * c1 * c1) * Math.pow(d, 6)) / 720);

    const lon =
      ((d - ((1 + 2 * t1 + c1) * Math.pow(d, 3)) / 6 + ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ePrimeSq + 24 * t1 * t1) * Math.pow(d, 5)) / 120) /
        cosFp) +
      (lonOrigin * Math.PI) / 180;

    return {
      lat: (lat * 180) / Math.PI,
      lon: (lon * 180) / Math.PI,
    };
  };

  const previewPoint = useMemo(() => {
    const parsed = parseFirstCoordinate(coordinateText);
    if (!parsed) {
      return {
        valid: false,
        easting: 0,
        northing: 0,
        lat: 39.05,
        lon: 35.2,
      };
    }

    const converted = utmToLatLon(parsed.easting, parsed.northing, dom);
    if (!Number.isFinite(converted.lat) || !Number.isFinite(converted.lon)) {
      return {
        valid: false,
        easting: parsed.easting,
        northing: parsed.northing,
        lat: 39.05,
        lon: 35.2,
      };
    }

    return {
      valid: true,
      easting: parsed.easting,
      northing: parsed.northing,
      lat: Math.max(-85, Math.min(85, converted.lat)),
      lon: Math.max(-179, Math.min(179, converted.lon)),
    };
  }, [coordinateText, dom]);

  const mapSrc = useMemo(() => {
    const lat = previewPoint.lat;
    const lon = previewPoint.lon;
    const west = (lon - 3.2).toFixed(6);
    const east = (lon + 3.2).toFixed(6);
    const south = (lat - 1.7).toFixed(6);
    const north = (lat + 1.7).toFixed(6);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lon.toFixed(6)}`;
  }, [previewPoint.lat, previewPoint.lon]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setPhotoFile(selected);
  };

  const handleDomChange = (value: string) => {
    const next = Number.parseInt(value, 10);
    if (!Number.isFinite(next)) return;
    setDom(Math.max(27, Math.min(45, next)));
  };

  const handleAddRow = () => {
    const parsed = parseFirstCoordinate(coordinateText);
    if (!parsed) {
      setStatus("Gecerli koordinat bulunamadi. Ornek: 464801 4334415");
      return;
    }

    const converted = utmToLatLon(parsed.easting, parsed.northing, dom);
    if (!Number.isFinite(converted.lat) || !Number.isFinite(converted.lon)) {
      setStatus("Koordinat donusumu basarisiz. DOM degerini kontrol edin.");
      return;
    }

    const label =
      photoNo.trim().length > 0
        ? photoNo.trim()
        : photoFile?.name
          ? photoFile.name
          : `Fotograf-${rows.length + 1}`;

    const row: PhotoCoordRow = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      photoLabel: label,
      coordinateLabel: `${formatNumber(parsed.easting)} ${formatNumber(parsed.northing)}`,
      dom,
      lat: converted.lat,
      lon: converted.lon,
      note: note.trim(),
      file: photoFile,
      fileName: photoFile?.name ?? "-",
    };

    setRows((prev) => [row, ...prev]);
    setPhotoNo("");
    setNote("");
    setPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setStatus(`Kayit eklendi. Toplam ${rows.length + 1} satir.`);
  };

  const handleDownloadRow = (row: PhotoCoordRow) => {
    if (!row.file) {
      setStatus("Indirme icin bu satira bir fotograf dosyasi eklenmemis.");
      return;
    }

    const url = URL.createObjectURL(row.file);
    const link = document.createElement("a");
    link.href = url;
    link.download = row.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDeleteRow = (id: number) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
    setStatus("Kayit listeden silindi.");
  };

  return (
    <section className="tool-detail tool-detail--photo-coordinate">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>
      <div className="photo-coord-shell">
        <header className="photo-coord-head">
          <h1>{tool.title}</h1>
        </header>

        <div className="photo-coord-map">
          <iframe title={`${tool.title} harita`} src={mapSrc} loading="lazy" />
        </div>

        <div className="photo-coord-grid">
          <article className="photo-coord-card">
            <h2>1. Sistem &amp; DOM Secimi</h2>
            <label>
              Koordinat Sistemi
              <select value={coordSystem} onChange={(event) => setCoordSystem(event.target.value)}>
                <option value="ed50-6-utm">ED50 (6 Derece UTM)</option>
              </select>
            </label>

            <div className="photo-coord-dom">
              <span>Secili DOM:</span>
              <input
                type="number"
                min={27}
                max={45}
                step={1}
                value={dom}
                onChange={(event) => handleDomChange(event.target.value)}
              />
              <small>(Haritaya tiklayarak degisir)</small>
            </div>

            <h2>2. Koordinat Yapistir (Y X)</h2>
            <textarea
              value={coordinateText}
              onChange={(event) => setCoordinateText(event.target.value)}
              placeholder="Orn: 464801 4334415"
            />
            <p>* Koordinat girildiginde harita otomatik olarak merkezlenir.</p>
          </article>

          <article className="photo-coord-card">
            <h2>3. Fotograf Girisi</h2>
            <label className="photo-coord-file">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} />
              <span>{photoFile ? photoFile.name : "Dosya secilmedi"}</span>
            </label>

            <input
              type="text"
              value={photoNo}
              onChange={(event) => setPhotoNo(event.target.value)}
              placeholder="Fotograf No"
            />

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Aciklama Notlari..."
            />

            <button type="button" onClick={handleAddRow}>
              + LISTEYE EKLE
            </button>
          </article>
        </div>

        <section className="photo-coord-list">
          <h2>Saha Kayit Listesi</h2>
          <div className="photo-coord-table-wrap">
            <table className="photo-coord-table">
              <thead>
                <tr>
                  <th>Fotograf</th>
                  <th>Koordinat (Y/X)</th>
                  <th>Indir</th>
                  <th>Sil</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Henuz kayit bulunmuyor.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.photoLabel}</strong>
                        <small>DOM {row.dom} | {row.fileName}</small>
                        {row.note ? <small>{row.note}</small> : null}
                      </td>
                      <td>
                        <span>{row.coordinateLabel}</span>
                        <small>
                          {row.lat.toFixed(6)}, {row.lon.toFixed(6)}
                        </small>
                      </td>
                      <td>
                        <button type="button" onClick={() => handleDownloadRow(row)} disabled={!row.file}>
                          INDIR
                        </button>
                      </td>
                      <td>
                        <button type="button" onClick={() => handleDeleteRow(row.id)}>
                          SIL
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="photo-coord-status">
          {status}
          {previewPoint.valid ? ` | Aktif Nokta: ${previewPoint.easting.toFixed(2)} ${previewPoint.northing.toFixed(2)}` : ""}
        </p>
      </div>
    </section>
  );
};

const PdfToolkitToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [mode, setMode] = useState<"merge" | "split">("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Dosya seçilmedi.");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    setFiles([]);
    setStatus("Mod değişti. Yeni dosya seçimi yapabilirsiniz.");
  }, [mode]);

  const isPdfFile = (file: File): boolean => file.name.toLowerCase().endsWith(".pdf");
  const isImageFile = (file: File): boolean => /\.(jpg|jpeg|png)$/i.test(file.name);

  const isAllowedFile = (file: File) => {
    if (mode === "split") return isPdfFile(file);
    return isPdfFile(file) || isImageFile(file);
  };

  const applyFiles = (incomingFiles: File[]) => {
    const filtered = incomingFiles.filter((file) => isAllowedFile(file));
    if (filtered.length === 0) {
      setStatus(mode === "merge" ? "Geçerli dosya bulunamadı. Sadece PDF/JPG/PNG kabul edilir." : "Sayfa ayırma için yalnızca PDF dosyası seçin.");
      return;
    }

    const next = mode === "split" ? [filtered[0]] : filtered;
    setFiles(next);
    setStatus(
      `${next.length} dosya seçildi. İşlem modu: ${mode === "merge" ? "Birleştir / Görsellerden PDF" : "PDF Sayfalarını Ayır"}.`,
    );
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    applyFiles(selected);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(false);
    const dropped = event.dataTransfer.files ? Array.from(event.dataTransfer.files) : [];
    applyFiles(dropped);
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleMerge = async () => {
    if (files.length === 0) {
      setStatus("Birleştirme için önce dosya seçin.");
      return;
    }

    const outputPdf = await PDFDocument.create();

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      if (isPdfFile(file)) {
        const source = await PDFDocument.load(bytes);
        const pageIndices = source.getPageIndices();
        const pages = await outputPdf.copyPages(source, pageIndices);
        pages.forEach((page) => outputPdf.addPage(page));
        continue;
      }

      if (isImageFile(file)) {
        const lower = file.name.toLowerCase();
        const image = lower.endsWith(".png")
          ? await outputPdf.embedPng(bytes)
          : await outputPdf.embedJpg(bytes);
        const page = outputPdf.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }
    }

    if (outputPdf.getPageCount() === 0) {
      setStatus("Birleştirme için geçerli içerik bulunamadı.");
      return;
    }

    const pdfBytes = await outputPdf.save();
    const pdfCopy = new Uint8Array(pdfBytes.byteLength);
    pdfCopy.set(pdfBytes);
    triggerDownload(new Blob([pdfCopy], { type: "application/pdf" }), `birlestirilmis-dosyalar-${Date.now()}.pdf`);
    setStatus(`Birleştirme tamamlandı. Toplam ${outputPdf.getPageCount()} sayfa indirildi.`);
  };

  const handleSplit = async () => {
    if (files.length === 0) {
      setStatus("Sayfa ayırma için bir PDF seçin.");
      return;
    }

    const sourceFile = files[0];
    if (!isPdfFile(sourceFile)) {
      setStatus("Sayfa ayırma için yalnızca PDF dosyası desteklenir.");
      return;
    }

    const sourcePdf = await PDFDocument.load(await sourceFile.arrayBuffer());
    const pageCount = sourcePdf.getPageCount();
    if (pageCount === 0) {
      setStatus("PDF içinde ayırılacak sayfa bulunamadı.");
      return;
    }

    const zip = new JSZip();
    for (let i = 0; i < pageCount; i += 1) {
      const pagePdf = await PDFDocument.create();
      const [copied] = await pagePdf.copyPages(sourcePdf, [i]);
      pagePdf.addPage(copied);
      const bytes = await pagePdf.save();
      zip.file(`sayfa-${String(i + 1).padStart(2, "0")}.pdf`, bytes);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    triggerDownload(zipBlob, `ayrilmis-sayfalar-${Date.now()}.zip`);
    setStatus(`${pageCount} sayfa ayrı PDF olarak ZIP dosyasında indirildi.`);
  };

  const handleProcess = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      if (mode === "merge") {
        await handleMerge();
      } else {
        await handleSplit();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      setStatus(`İşlem sırasında hata oluştu: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="tool-detail tool-detail--pdfkit">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="pdfkit-shell">
        <header className="pdfkit-head">
          <h1>{tool.title}</h1>
          <p>PDF ve görsel formatta dosyaları ekleyip işlemi uygulayabilirsiniz.</p>
        </header>

        <div className="pdfkit-tabs">
          <button
            type="button"
            className={mode === "merge" ? "is-active" : ""}
            onClick={() => setMode("merge")}
            disabled={isProcessing}
          >
            Birleştir / Görsellerden PDF
          </button>
          <button
            type="button"
            className={mode === "split" ? "is-active" : ""}
            onClick={() => setMode("split")}
            disabled={isProcessing}
          >
            PDF Sayfalarını Ayır
          </button>
        </div>

        <label
          className={`pdfkit-dropzone${dragOver ? " is-active" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple={mode === "merge"}
            onChange={handleInputChange}
            disabled={isProcessing}
          />
          <span className="pdfkit-dropzone__icon">↑</span>
          <strong>Dosyaları buraya sürükleyin</strong>
          <small>veya tıklayarak seçin (PDF, JPG, PNG)</small>
        </label>

        {files.length > 0 ? (
          <ul className="pdfkit-filelist">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`}>
                {file.name}
                <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
              </li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          className="pdfkit-process"
          onClick={handleProcess}
          disabled={isProcessing || files.length === 0}
        >
          {isProcessing ? "İşlem sürüyor..." : mode === "merge" ? "PDF Birleştir ve İndir" : "Sayfaları Ayır ve ZIP İndir"}
        </button>

        <p className="pdfkit-status">{status}</p>
      </div>
    </section>
  );
};

const PhotoCropToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [presetId, setPresetId] = useState<string>("manual");
  const [targetWidthValue, setTargetWidthValue] = useState<string>("800");
  const [targetHeightValue, setTargetHeightValue] = useState<string>("600");
  const [zoom, setZoom] = useState<number>(1);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<string>("Fotograf secilmedi.");
  const [dragOver, setDragOver] = useState<boolean>(false);

  const presets = useMemo(
    () => [
      { id: "manual", label: "Manuel Olcu", width: 800, height: 600 },
      { id: "instagram_square", label: "Instagram Kare (1080x1080)", width: 1080, height: 1080 },
      { id: "story", label: "Story (1080x1920)", width: 1080, height: 1920 },
      { id: "landscape", label: "Sunum (1600x900)", width: 1600, height: 900 },
    ],
    [],
  );

  useEffect(() => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset || preset.id === "manual") return;
    setTargetWidthValue(String(preset.width));
    setTargetHeightValue(String(preset.height));
  }, [presetId, presets]);

  useEffect(() => {
    if (!imageUrl) {
      setLoadedImage(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setLoadedImage(img);
    };
    img.onerror = () => {
      setLoadedImage(null);
      setStatus("Gorsel yuklenemedi. Lutfen farkli bir dosya deneyin.");
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    return () => {
      if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const getTargetSize = () => {
    const width = parseLocaleNumber(targetWidthValue);
    const height = parseLocaleNumber(targetHeightValue);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return { width: 800, height: 600 };
    }
    return { width, height };
  };

  const calculateSourceRect = (img: HTMLImageElement, targetWidth: number, targetHeight: number, zoomRatio: number) => {
    const aspect = targetWidth / targetHeight;
    const imageAspect = img.width / img.height;

    let srcWidth = img.width;
    let srcHeight = img.height;

    if (imageAspect > aspect) {
      srcHeight = img.height / zoomRatio;
      srcWidth = srcHeight * aspect;
    } else {
      srcWidth = img.width / zoomRatio;
      srcHeight = srcWidth / aspect;
    }

    srcWidth = Math.min(srcWidth, img.width);
    srcHeight = Math.min(srcHeight, img.height);

    const srcX = (img.width - srcWidth) / 2;
    const srcY = (img.height - srcHeight) / 2;

    return { srcX, srcY, srcWidth, srcHeight, aspect };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const previewWidth = 820;
    const previewHeight = 500;
    canvas.width = previewWidth;
    canvas.height = previewHeight;

    ctx.fillStyle = "#081739";
    ctx.fillRect(0, 0, previewWidth, previewHeight);

    const target = getTargetSize();
    const aspect = target.width / target.height;
    const maxGuideWidth = previewWidth * 0.48;
    const maxGuideHeight = previewHeight * 0.44;

    let guideWidth = maxGuideWidth;
    let guideHeight = guideWidth / aspect;
    if (guideHeight > maxGuideHeight) {
      guideHeight = maxGuideHeight;
      guideWidth = guideHeight * aspect;
    }

    const guideX = (previewWidth - guideWidth) / 2;
    const guideY = (previewHeight - guideHeight) / 2;

    if (loadedImage) {
      const source = calculateSourceRect(loadedImage, target.width, target.height, zoom);
      ctx.drawImage(
        loadedImage,
        source.srcX,
        source.srcY,
        source.srcWidth,
        source.srcHeight,
        guideX,
        guideY,
        guideWidth,
        guideHeight,
      );
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(guideX, guideY, guideWidth, guideHeight);
      ctx.fillStyle = "#93a4be";
      ctx.font = "500 28px Inter";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Onizleme Alani", previewWidth / 2, previewHeight / 2);
    }

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(guideX, guideY, guideWidth, guideHeight);
  }, [loadedImage, targetWidthValue, targetHeightValue, zoom]);

  const applyFiles = (incoming: File[]) => {
    const selected = incoming.find((file) => file.type.startsWith("image/"));
    if (!selected) {
      setStatus("Lutfen gecerli bir fotograf dosyasi secin.");
      return;
    }

    const nextUrl = URL.createObjectURL(selected);
    setImageUrl((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return nextUrl;
    });
    setStatus(`Secilen dosya: ${selected.name}`);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files ? Array.from(event.target.files) : [];
    applyFiles(next);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(false);
    const next = event.dataTransfer.files ? Array.from(event.dataTransfer.files) : [];
    applyFiles(next);
  };

  const handleDownload = () => {
    if (!loadedImage) {
      setStatus("Indirme icin once bir fotograf secin.");
      return;
    }

    const target = getTargetSize();
    const source = calculateSourceRect(loadedImage, target.width, target.height, zoom);
    const output = document.createElement("canvas");
    output.width = Math.max(1, Math.round(target.width));
    output.height = Math.max(1, Math.round(target.height));
    const outCtx = output.getContext("2d");
    if (!outCtx) {
      setStatus("Cikti olusturulamadi.");
      return;
    }

    outCtx.drawImage(
      loadedImage,
      source.srcX,
      source.srcY,
      source.srcWidth,
      source.srcHeight,
      0,
      0,
      output.width,
      output.height,
    );

    output.toBlob((blob) => {
      if (!blob) {
        setStatus("Dosya olusturulamadi.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kirpilmis-gorsel-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("Kirpilmis gorsel indirildi.");
    }, "image/png");
  };

  return (
    <section className="tool-detail tool-detail--photocrop">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="photocrop-shell">
        <header className="photocrop-head">
          <span>✂</span>
          <h1>{tool.title}</h1>
          <p>Hizli, optimize edilmis ve merkezleme asistanli duzenleyici.</p>
        </header>

        <div className="photocrop-body">
          <aside className="photocrop-controls">
            <label
              className={`photocrop-upload${dragOver ? " is-active" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              1. Fotograf Yukle
              <input type="file" accept="image/*" onChange={handleFileChange} />
              <span>Fotograf Sec veya Surukle Birak</span>
            </label>

            <label>
              2. Boyut Sablonu
              <select value={presetId} onChange={(event) => setPresetId(event.target.value)}>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="photocrop-dims">
              <label>
                Genislik
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetWidthValue}
                  onChange={(event) => setTargetWidthValue(event.target.value)}
                />
              </label>
              <label>
                Yukseklik
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetHeightValue}
                  onChange={(event) => setTargetHeightValue(event.target.value)}
                />
              </label>
            </div>

            <label className="photocrop-zoom">
              3. Yakinlastir <strong>{Math.round(zoom * 100)}%</strong>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => setZoom(Number.parseFloat(event.target.value))}
              />
            </label>

            <button type="button" onClick={handleDownload}>Gorseli Indir</button>
            <p className="photocrop-status">{status}</p>
          </aside>

          <div className="photocrop-preview">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </section>
  );
};

const FidanCitToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [totalAreaValue, setTotalAreaValue] = useState<string>("10000");
  const [borderGapValue, setBorderGapValue] = useState<string>("2");
  const [rowSpacingValue, setRowSpacingValue] = useState<string>("3");
  const [inRowSpacingValue, setInRowSpacingValue] = useState<string>("2");
  const [fidanResult, setFidanResult] = useState<{
    effectiveArea: number;
    seedlingCount: number;
  } | null>(null);

  const [fenceLengthValue, setFenceLengthValue] = useState<string>("500");
  const [stakeSpacingValue, setStakeSpacingValue] = useState<string>("3");
  const [wireRowCountValue, setWireRowCountValue] = useState<string>("3");
  const [fenceResult, setFenceResult] = useState<{
    postCount: number;
    wireLength: number;
    suggestedWireLength: number;
  } | null>(null);

  const handleFidanCalculate = () => {
    const totalArea = parseLocaleNumber(totalAreaValue);
    const borderGap = parseLocaleNumber(borderGapValue);
    const rowSpacing = parseLocaleNumber(rowSpacingValue);
    const inRowSpacing = parseLocaleNumber(inRowSpacingValue);

    if (
      !Number.isFinite(totalArea) ||
      !Number.isFinite(borderGap) ||
      !Number.isFinite(rowSpacing) ||
      !Number.isFinite(inRowSpacing) ||
      totalArea <= 0 ||
      borderGap < 0 ||
      rowSpacing <= 0 ||
      inRowSpacing <= 0
    ) {
      setFidanResult(null);
      return;
    }

    const sideLength = Math.sqrt(totalArea);
    const effectiveSide = Math.max(0, sideLength - 2 * borderGap);
    const effectiveArea = effectiveSide * effectiveSide;
    const seedlingCount = Math.floor(effectiveArea / (rowSpacing * inRowSpacing));

    setFidanResult({
      effectiveArea,
      seedlingCount,
    });
  };

  const handleFenceCalculate = () => {
    const totalLength = parseLocaleNumber(fenceLengthValue);
    const stakeSpacing = parseLocaleNumber(stakeSpacingValue);
    const wireRowCount = parseLocaleNumber(wireRowCountValue);

    if (
      !Number.isFinite(totalLength) ||
      !Number.isFinite(stakeSpacing) ||
      !Number.isFinite(wireRowCount) ||
      totalLength <= 0 ||
      stakeSpacing <= 0 ||
      wireRowCount <= 0
    ) {
      setFenceResult(null);
      return;
    }

    const postCount = Math.floor(totalLength / stakeSpacing) + 1;
    const wireLength = totalLength * wireRowCount;
    const suggestedWireLength = wireLength * 1.1;

    setFenceResult({
      postCount,
      wireLength,
      suggestedWireLength,
    });
  };

  return (
    <section className="tool-detail tool-detail--fidan">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="fidan-grid">
        <article className="fidan-note">
          <h2>Fidan Dikim Adedi ve Arazi Planlamasi Hakkinda</h2>
          <p>
            Fidan dikim planinda toplam alan, sinir payi, sira arasi ve sira uzeri mesafeler birlikte
            degerlendirilmelidir. Arac, bu parametrelere gore yaklasik fidan ihtiyacini hizli hesaplar.
          </p>
          <p>
            Sinir payi, parselin kenar bolgesindeki emniyet seridini temsil eder. Bu bosluk fidan dikim
            alanindan dusulur.
          </p>
        </article>

        <aside className="fidan-card">
          <div className="fidan-card__head">
            <h2>{tool.title}</h2>
            <p>Sinir Boslugu ve Alan Analizi</p>
          </div>
          <div className="fidan-card__body">
            <label>
              Toplam Arazi Alani (mÂ²)
              <input
                type="text"
                inputMode="decimal"
                value={totalAreaValue}
                onChange={(event) => setTotalAreaValue(event.target.value)}
              />
            </label>
            <label>
              Sinir Payi / Kenar Boslugu (metre)
              <input
                type="text"
                inputMode="decimal"
                value={borderGapValue}
                onChange={(event) => setBorderGapValue(event.target.value)}
              />
            </label>
            <div className="fidan-card__grid">
              <label>
                Sira Arasi (m)
                <input
                  type="text"
                  inputMode="decimal"
                  value={rowSpacingValue}
                  onChange={(event) => setRowSpacingValue(event.target.value)}
                />
              </label>
              <label>
                Sira Uzeri (m)
                <input
                  type="text"
                  inputMode="decimal"
                  value={inRowSpacingValue}
                  onChange={(event) => setInRowSpacingValue(event.target.value)}
                />
              </label>
            </div>
            <button type="button" onClick={handleFidanCalculate}>HESAPLA</button>
            {fidanResult ? (
              <div className="fidan-card__result">
                <span>Net Dikim Alani: {formatAreaM2(fidanResult.effectiveArea)} mÂ²</span>
                <span>Tahmini Fidan Adedi: {fidanResult.seedlingCount.toLocaleString("tr-TR")}</span>
              </div>
            ) : null}
          </div>
        </aside>

        <aside className="fidan-card">
          <div className="fidan-card__head">
            <h2>Cit ve Kazik Hesaplama Araci</h2>
            <p>Arazi Cevreleme ve Malzeme Analizi</p>
          </div>
          <div className="fidan-card__body">
            <label>
              Toplam Cevre veya Tel Uzunlugu (Metre)
              <input
                type="text"
                inputMode="decimal"
                value={fenceLengthValue}
                onChange={(event) => setFenceLengthValue(event.target.value)}
              />
            </label>
            <label>
              Kazik Aralik Mesafesi (Metre)
              <input
                type="text"
                inputMode="decimal"
                value={stakeSpacingValue}
                onChange={(event) => setStakeSpacingValue(event.target.value)}
              />
            </label>
            <label>
              Cekilecek Tel Sira Sayisi
              <input
                type="text"
                inputMode="decimal"
                value={wireRowCountValue}
                onChange={(event) => setWireRowCountValue(event.target.value)}
              />
            </label>
            <button type="button" onClick={handleFenceCalculate}>HESAPLA</button>
            {fenceResult ? (
              <div className="fidan-card__result">
                <span>Gerekli Kazik Adedi: {fenceResult.postCount.toLocaleString("tr-TR")}</span>
                <span>Toplam Tel Uzunlugu: {formatAreaM2(fenceResult.wireLength)} m</span>
                <span>+%10 Payli Tel: {formatAreaM2(fenceResult.suggestedWireLength)} m</span>
              </div>
            ) : null}
          </div>
        </aside>

        <article className="fidan-note">
          <h2>Cit Kurulumu ve Malzeme Planlamasi Hakkinda</h2>
          <p>
            Cevreleme analizinde toplam uzunluk, kazik araligi ve tel sira sayisi birlikte ele alinmalidir.
            Arazi egimi ve kapi gecisleri gibi sahaya ozel detaylar, uygulama oncesi ayrica kontrol edilmelidir.
          </p>
        </article>
      </div>
    </section>
  );
};

const GenericToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [permitType, setPermitType] = useState<string>("Maden Isletme");
  const [applicationYear, setApplicationYear] = useState<string>("2026");
  const [province, setProvince] = useState<string>("Ankara");
  const [closure, setClosure] = useState<string>("1.4");
  const [areaValue, setAreaValue] = useState<string>("");
  const [rows, setRows] = useState<GenericCalcRow[]>([]);

  const totalArea = useMemo(() => rows.reduce((sum, row) => sum + row.area, 0), [rows]);

  const handleAddRow = () => {
    const area = Number.parseFloat(areaValue);
    if (!Number.isFinite(area) || area <= 0) return;

    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        permitType,
        area,
        closure: Number.parseFloat(closure),
      },
    ]);

    setAreaValue("");
  };

  const handleDeleteRow = (id: number) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  return (
    <section className="tool-detail">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>
      <div className="tool-detail__layout">
        <article className="tool-detail__content">
          <h1>{tool.sectionTitle}</h1>
          <p>{tool.sectionText}</p>

          <h2>Izin Bedellerini Belirleyen Temel Kriterler</h2>
          <ul>
            {tool.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </article>

        <aside className="tool-calc">
          <div className="tool-calc__head">
            <h2>{tool.title}</h2>
            <p>Degerleri girip kalemleri ekleyin; toplam alani anlik takip edin.</p>
          </div>

          <div className="tool-calc__controls">
            <label>
              Islem Turu
              <select value={permitType} onChange={(event) => setPermitType(event.target.value)}>
                <option>Maden Isletme</option>
                <option>Yeni Izin / Ilav</option>
                <option>Rehabilitasyon</option>
              </select>
            </label>
            <label>
              Uygulama Yili
              <select value={applicationYear} onChange={(event) => setApplicationYear(event.target.value)}>
                <option>2026</option>
                <option>2025</option>
                <option>2024</option>
              </select>
            </label>
            <label>
              Il Katsayisi
              <select value={province} onChange={(event) => setProvince(event.target.value)}>
                <option>Ankara</option>
                <option>Kocaeli</option>
                <option>Istanbul</option>
              </select>
            </label>
          </div>

          <div className="tool-calc__row-input">
            <label>
              Alan (mÂ²)
              <input
                type="number"
                min="0"
                step="0.1"
                value={areaValue}
                onChange={(event) => setAreaValue(event.target.value)}
              />
            </label>
            <label>
              Kapalilik
              <select value={closure} onChange={(event) => setClosure(event.target.value)}>
                <option value="1.0">1.0</option>
                <option value="1.2">1.2</option>
                <option value="1.4">1.4</option>
                <option value="1.6">1.6</option>
              </select>
            </label>
            <button type="button" onClick={handleAddRow}>EKLE</button>
          </div>

          <div className="tool-calc__table-wrap">
            <table className="tool-calc__table">
              <thead>
                <tr>
                  <th>Kalem</th>
                  <th>Alan</th>
                  <th>Kapalilik</th>
                  <th>Sil</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Henuz kalem eklenmedi.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.permitType}</td>
                      <td>{row.area.toFixed(1)} mÂ²</td>
                      <td>{row.closure.toFixed(1)}</td>
                      <td>
                        <button type="button" onClick={() => handleDeleteRow(row.id)}>Sil</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="tool-calc__summary">
            <span>Yil: {applicationYear}</span>
            <span>Il: {province}</span>
            <span>Toplam Alan: {totalArea.toFixed(1)} mÂ²</span>
          </div>
        </aside>
      </div>
    </section>
  );
};

const ToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  if (tool.slug === MINING_TOOL_SLUG) {
    return <MiningToolDetailPage tool={tool} />;
  }

  if (tool.slug === ENERGY_TOOL_SLUG) {
    return <EnergyToolDetailPage tool={tool} />;
  }

  if (tool.slug === COORD_TOOL_SLUG || tool.slug === ADVANCED_ED50_TOOL_SLUG) {
    return <CoordinateToolDetailPage tool={tool} />;
  }

  if (tool.slug === CAD_TOOL_SLUG) {
    return <CadConversionToolDetailPage tool={tool} />;
  }

  if (tool.slug === KIST_TOOL_SLUG) {
    return <KistelyevmToolDetailPage tool={tool} />;
  }

  if (tool.slug === CARBON_TOOL_SLUG) {
    return <CarbonAnalysisToolDetailPage tool={tool} />;
  }

  if (tool.slug === TEMDIT_MAHSUP_TOOL_SLUG) {
    return <TemditMahsupToolDetailPage tool={tool} />;
  }

  if (tool.slug === DAMGA_NOTER_TOOL_SLUG) {
    return <DamgaNoterToolDetailPage tool={tool} />;
  }

  if (tool.slug === ILETISIM_PANO_TOOL_SLUG) {
    return <IletisimPanosuToolDetailPage tool={tool} />;
  }

  if (tool.slug === YDO_BAK_TOOL_SLUG) {
    return <YdoBakToolDetailPage tool={tool} />;
  }

  if (tool.slug === EPDK_KML_TOOL_SLUG) {
    return <EpdkKmlToolDetailPage tool={tool} />;
  }

  if (tool.slug === KDV_YUZDE_TOOL_SLUG) {
    return <KdvYuzdeToolDetailPage tool={tool} />;
  }

  if (tool.slug === PDF_TOOL_SLUG) {
    return <PdfToolkitToolDetailPage tool={tool} />;
  }

  if (tool.slug === FIDAN_CIT_TOOL_SLUG) {
    return <FidanCitToolDetailPage tool={tool} />;
  }

  if (tool.slug === PHOTO_CROP_TOOL_SLUG) {
    return <PhotoCropToolDetailPage tool={tool} />;
  }

  if (tool.slug === PHOTO_COORD_TOOL_SLUG) {
    return <PhotoCoordinateToolDetailPage tool={tool} />;
  }

  return <GenericToolDetailPage tool={tool} />;
};

const App = () => {
  const [pathname, setPathname] = useState<string>(() => canonicalizeBrowserPath());
  const [lazyPage, setLazyPage] = useState<LazyPagePayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");
  const [headReady, setHeadReady] = useState<boolean>(false);

  const customRoute = useMemo(() => resolveCustomRoute(pathname), [pathname]);
  const activeTool = useMemo(
    () => (customRoute?.kind === "detail" ? TOOL_INDEX.get(customRoute.slug) ?? null : null),
    [customRoute],
  );

  const pageId = useMemo(() => (customRoute ? null : resolvePageId(pathname)), [pathname, customRoute]);

  useEffect(() => {
    const onPopState = () => {
      setPathname(canonicalizeBrowserPath());
    };

    window.addEventListener("popstate", onPopState);

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (!isInternalNavigableLink(anchor)) return;

      const url = new URL(anchor.href, window.location.href);

      event.preventDefault();
      window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
      setPathname(canonicalizeBrowserPath());
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    document.addEventListener("click", onDocumentClick);

    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (customRoute) {
      setLazyPage(null);
      setLoading(false);
      setLoadError("");
      return;
    }

    let cancelled = false;

    if (pageId === null) {
      setLazyPage(null);
      setLoadError("Sayfa bulunamadi");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");
    setHeadReady(false);

    const loadPage = async () => {
      try {
        const response = await fetch(`/page-data/pages/${pageId}.json`, { cache: "default" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as LazyPagePayload;

        if (!cancelled) {
          setHeadReady(false);
          setLazyPage(payload);
          setLoading(false);
        }
      } catch (error) {
        if (cancelled) return;
        setLazyPage(null);
        setLoading(false);
        setHeadReady(true);
        setLoadError(error instanceof Error ? error.message : "Sayfa yuklenemedi");
      }
    };

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [customRoute, pageId]);

  const parsedPage = useMemo(() => {
    if (!lazyPage) return null;

    try {
      return parsePage(lazyPage.html);
    } catch {
      return null;
    }
  }, [lazyPage]);

  useEffect(() => {
    document.querySelectorAll(`[${MANAGED_HEAD_ATTR}]`).forEach((node) => node.remove());
    setHeadReady(false);

    if (customRoute) {
      if (customRoute.kind === "list") {
        document.title = "Hesap Araçları | Lacivert Ormancılık";
      } else {
        document.title = activeTool ? `${activeTool.title} | Lacivert Ormancılık` : "Hesap Araci Bulunamadi";
      }

      const mountedNodes: Element[] = [];
      const stylesheetWaiters: Array<Promise<void>> = [];
      let cancelled = false;

      CUSTOM_ROUTE_HEAD_NODES.forEach((headHtml) => {
        const node = createElementFromHtml(headHtml);
        if (!node) return;

        node.setAttribute(MANAGED_HEAD_ATTR, "1");
        document.head.appendChild(node);
        mountedNodes.push(node);

        if (!(node instanceof HTMLLinkElement)) return;
        if (!node.rel.toLowerCase().includes("stylesheet")) return;

        const href = node.getAttribute("href") || "";
        if (!isLocalStylesheetHref(href)) return;

        stylesheetWaiters.push(
          new Promise((resolve) => {
            if (node.sheet) {
              resolve();
              return;
            }

            const done = () => resolve();
            node.addEventListener("load", done, { once: true });
            node.addEventListener("error", done, { once: true });
          }),
        );
      });

      if (stylesheetWaiters.length === 0) {
        setHeadReady(true);
      } else {
        void Promise.allSettled(stylesheetWaiters).then(() => {
          if (!cancelled) setHeadReady(true);
        });
      }

      return () => {
        cancelled = true;
        mountedNodes.forEach((node) => node.remove());
      };
    }

    if (!parsedPage) {
      document.title = "Sayfa Bulunamadi | Lacivert Ormancılık";
      return;
    }

    document.title = parsedPage.title;

    const mountedNodes: Element[] = [];
    const stylesheetWaiters: Array<Promise<void>> = [];
    let cancelled = false;

    parsedPage.headNodes.forEach((headHtml) => {
      const node = createElementFromHtml(headHtml);
      if (!node) return;

      node.setAttribute(MANAGED_HEAD_ATTR, "1");
      document.head.appendChild(node);
      mountedNodes.push(node);

      if (!(node instanceof HTMLLinkElement)) return;
      if (!node.rel.toLowerCase().includes("stylesheet")) return;

      const href = node.getAttribute("href") || "";
      if (!isLocalStylesheetHref(href)) return;

      stylesheetWaiters.push(
        new Promise((resolve) => {
          if (node.sheet) {
            resolve();
            return;
          }

          const done = () => resolve();
          node.addEventListener("load", done, { once: true });
          node.addEventListener("error", done, { once: true });
        }),
      );
    });

    if (stylesheetWaiters.length === 0) {
      setHeadReady(true);
    } else {
      void Promise.allSettled(stylesheetWaiters).then(() => {
        if (!cancelled) setHeadReady(true);
      });
    }

    return () => {
      cancelled = true;
      mountedNodes.forEach((node) => node.remove());
    };
  }, [customRoute, activeTool, parsedPage]);

  useEffect(() => {
    if (customRoute || !parsedPage) return;

    const fallbackTimer = window.setTimeout(revealFadeElements, 600);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [customRoute, parsedPage]);

  if (customRoute && !headReady) {
    return (
      <main className="legacy-not-found">
        <section className="legacy-not-found__card">
          <h1>Yukleniyor</h1>
          <p>Sayfa icerigi hazirlaniyor...</p>
        </section>
      </main>
    );
  }

  if (customRoute) {
    return (
      <ToolsShell currentPath={normalizePath(pathname)}>
        {customRoute.kind === "list" ? (
          <ToolsListPage />
        ) : activeTool ? (
          <ToolDetailPage tool={activeTool} />
        ) : (
          <main className="legacy-not-found">
            <section className="legacy-not-found__card">
              <h1>Arac bulunamadi</h1>
              <p>Bu hesap araci tasinmis veya kaldirilmis olabilir.</p>
              <p>
                <a href="/hesap-araclari">Tum hesap araclarina don</a>
              </p>
            </section>
          </main>
        )}
      </ToolsShell>
    );
  }

  if (loading || (parsedPage !== null && !headReady)) {
    return (
      <main className="legacy-not-found">
        <section className="legacy-not-found__card">
          <h1>Yukleniyor</h1>
          <p>Sayfa icerigi hazirlaniyor...</p>
        </section>
      </main>
    );
  }

  if (!parsedPage) {
    return (
      <main className="legacy-not-found">
        <section className="legacy-not-found__card">
          <h1>Sayfa bulunamadi</h1>
          <p>{loadError || "Aradiginiz icerik tasinmis veya silinmis olabilir."}</p>
          <p>
            <a href="/">Anasayfaya don</a>
          </p>
        </section>
      </main>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: parsedPage.bodyHtml }} />;
};

export default App;











