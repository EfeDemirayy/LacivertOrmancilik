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

type ToolSourceLink = {
  label: string;
  url: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type SeoInternalLink = {
  href: string;
  label: string;
};

type LegacySeoProfile = {
  heading: string;
  paragraphs: string[];
  links: SeoInternalLink[];
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
  isEstimated?: boolean;
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
const LOADED_STYLESHEET_HREFS = new Set<string>();

type ToolCardIconName =
  | "mining"
  | "energy"
  | "geo"
  | "convert"
  | "finance"
  | "docs"
  | "planning"
  | "photo"
  | "default";

const TOOL_ITEMS: ToolItem[] = [
  {
    slug: "madencilik-orman-izin-bedeli",
    title: "Madencilikte Orman İzin Bedelleri Hesaplama Aracı",
    summary: "Madencilik izin süreçlerinde arazi bedeli, ağaçlandırma ve katsayı etkisini birlikte görün.",
    tags: ["Hesap Araçları", "Madencilik", "Orman İzinleri"],
    image: "/img/panel-16-front.jpg",
    sectionTitle: "Neden Doğru Orman İzni Hesaplaması Yapmalısınız",
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
  {
    slug: "agaclandirma-bakim-butce-hesaplama",
    title: "Ağaçlandırma ve Bakım Bütçesi Hesaplama Aracı",
    summary: "Fidan adedi, dikim işçiliği ve çok yıllı bakım giderlerini tek panelde hesaplayın.",
    tags: ["Hesap Araçları", "Ormancılık", "Saha Planlama"],
    image: "/img/fidandikim3.jpg",
    sectionTitle: "Ağaçlandırma Maliyetini Önceden Planlayın",
    sectionText:
      "Ağaçlandırma projelerinde ilk yatırım ve bakım dönemindeki maliyetleri birlikte görmek, bütçe doğruluğunu ciddi ölçüde artırır.",
    bullets: [
      "Hektar bazında fidan ihtiyacı ve kayıp oranı etkisini birlikte hesaplar.",
      "Dikim işçiliği ve bakım maliyetini ayrı kalemler halinde sunar.",
      "Ara toplam, KDV ve genel toplamı aynı ekranda üretir.",
    ],
  },
  {
    slug: "orman-yolu-metraj-kesif",
    title: "Orman Yolu Metraj ve Keşif Hesaplama Aracı",
    summary: "Yol platformu için kazı, dolgu, stabilize hacmi ve maliyetleri hızlıca çıkarın.",
    tags: ["Hesap Araçları", "Ormancılık", "Mühendislik"],
    image: "/img/proje-yolu2.jpg",
    sectionTitle: "Yol Projelerinde Metraj ve Keşif Netliği",
    sectionText:
      "Yol uzunluğu, platform genişliği ve birim fiyatlara bağlı metraj hesabını standartlaştırarak ihale ve saha planlamasını kolaylaştırır.",
    bullets: [
      "Kazı, dolgu ve stabilize hacmini otomatik hesaplar.",
      "Birim fiyatlara göre maliyet kırılımı verir.",
      "Drenaj/yardımcı işler için yüzdesel ek payı dahil eder.",
    ],
  },
  {
    slug: "il-katsayisi-karsilastirma",
    title: "İl Katsayısı Karşılaştırma Aracı (Ek-3)",
    summary: "Aynı izin senaryosunda iki ilin katsayı etkisini resmi Ek-3 verisine göre kıyaslayın.",
    tags: ["Hesap Araçları", "Ormancılık", "Orman İzinleri"],
    image: "/img/ogm2.jpg",
    sectionTitle: "İl Katsayısı Etkisini Net Görün",
    sectionText:
      "İl katsayıları izin bedelinde doğrudan çarpan etkisi oluşturur. Bu araç, aynı alan ve aynı izin türünde farklı illerin maliyet etkisini tek ekranda karşılaştırır.",
    bullets: [
      "Ek-3 il katsayılarını resmi liste üzerinden kullanır.",
      "Aynı alan için iki il arasındaki maliyet farkını tutar ve yüzde olarak verir.",
      "Yıl, izin türü ve kapalılık parametrelerini birlikte analiz eder.",
    ],
  },
  {
    slug: "izin-katsayi-karsilastirma",
    title: "İzin Türü Katsayı Karşılaştırma Aracı (Ek-1)",
    summary: "Seçilen alan ve yılda tüm izin türlerini resmi Ek-1 katsayılarına göre karşılaştırın.",
    tags: ["Hesap Araçları", "Ormancılık", "Orman İzinleri"],
    image: "/img/kanunlar.jpg",
    sectionTitle: "İzin Türleri Arasındaki Bedel Farkını Ölçün",
    sectionText:
      "İzin türüne bağlı katsayı farklılıkları maliyeti önemli ölçüde değiştirir. Bu araç, aynı saha verisinde tüm izin türlerini tablo halinde kıyaslayarak hızlı karar desteği sağlar.",
    bullets: [
      "Ek-1 katsayılarıyla tüm izin türleri tek tabloda.",
      "Alan, il katsayısı ve kapalılık etkisini birlikte uygular.",
      "En düşük ve en yüksek bedelli izin türlerini anında gösterir.",
    ],
  },
];

const TOOL_CARD_ICON_BY_SLUG: Record<string, ToolCardIconName> = {
  "madencilik-orman-izin-bedeli": "mining",
  "madde-17-3-res-ges-yol": "energy",
  "koordinattan-kml-dxf-uretim": "geo",
  "gelismis-ed50-donusum-kml-indirme": "geo",
  "cad-gis-donusum-dxf-kml": "convert",
  "kistele-yevmiye-hesaplama": "finance",
  "karbon-su-emisyon-analiz": "planning",
  "temdit-mahsup-hesaplama": "finance",
  "damga-vergi-noter-bedeli": "docs",
  "iletisim-panolari-bedel": "planning",
  "ydo-bak-guncel-deger-hesaplama": "finance",
  "epdk-izinlerinde-kml-olusturma": "geo",
  "kdv-ayirma-ekleme-yuzde-degisim": "finance",
  "pdf-donustur-birlestir-ayir-gorsel": "docs",
  "fidan-cit-kazik-hesaplama": "planning",
  "ucretsiz-fotograf-kirpma-araci": "photo",
  "fotograf-koordinatlandirma-araci": "photo",
  "agaclandirma-bakim-butce-hesaplama": "planning",
  "orman-yolu-metraj-kesif": "convert",
  "il-katsayisi-karsilastirma": "mining",
  "izin-katsayi-karsilastirma": "mining",
};

const ToolCardIcon = ({ name }: { name: ToolCardIconName }) => {
  switch (name) {
    case "mining":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 6h16" />
          <path d="M9 6l3 5 3-5" />
          <path d="M12 11v9" />
          <path d="M8 20h8" />
        </svg>
      );
    case "energy":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M13 2 5 13h6l-1 9 9-12h-6l1-8Z" />
        </svg>
      );
    case "geo":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3V7Z" />
          <path d="M9 4v13" />
          <path d="M15 7v13" />
        </svg>
      );
    case "convert":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 6h11" />
          <path d="m12 3 3 3-3 3" />
          <path d="M20 18H9" />
          <path d="m12 15-3 3 3 3" />
        </svg>
      );
    case "finance":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 19h16" />
          <path d="M7 15v-3" />
          <path d="M12 15V9" />
          <path d="M17 15V6" />
        </svg>
      );
    case "docs":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M8 3h6l5 5v13H8z" />
          <path d="M14 3v5h5" />
          <path d="M11 13h5M11 17h5" />
        </svg>
      );
    case "planning":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case "photo":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="6" width="18" height="14" rx="2" />
          <circle cx="12" cy="13" r="3.2" />
          <path d="M8 6l1.5-2h5L16 6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M8 8h8M8 12h3M13 12h3M8 16h3M13 16h3" />
        </svg>
      );
  }
};

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
const AGACLANDIRMA_BAKIM_BUTCE_TOOL_SLUG = "agaclandirma-bakim-butce-hesaplama";
const ORMAN_YOLU_METRAJ_TOOL_SLUG = "orman-yolu-metraj-kesif";
const IL_KATSAYI_KARSILASTIRMA_TOOL_SLUG = "il-katsayisi-karsilastirma";
const IZIN_KATSAYI_KARSILASTIRMA_TOOL_SLUG = "izin-katsayi-karsilastirma";
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

const OFFICIAL_MINING_APPLICATION_YEARS: MiningYearOption[] = [
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

const ENERGY_PERMIT_TYPES: MiningPermitOption[] = [
  { id: "enh", label: "ENH", coefficient: 0.05 },
  { id: "res", label: "RES", coefficient: 0.08 },
  { id: "ges", label: "GES", coefficient: 0.1 },
  { id: "yol", label: "Yol", coefficient: 0.06 },
  { id: "rod", label: "Rüzgar ölçüm Diregi", coefficient: 0.04 },
];

const ENERGY_CLOSURE_LEVELS: MiningClosureOption[] = [
  { id: "closure_10", label: "Düşük kapalılık", coefficient: 1.0 },
  { id: "closure_11_40", label: "Orta kapalılık", coefficient: 1.2 },
  { id: "closure_41_70", label: "Yüksek kapalılık", coefficient: 1.4 },
];

const PANO_PERMIT_TYPES: MiningPermitOption[] = [
  { id: "non_lit_panel", label: "Işıksız İletişim Panosu", coefficient: 0.875 },
  { id: "lit_panel", label: "Işıklı İletişim Panosu", coefficient: 1.0 },
  { id: "totem_panel", label: "Totem / Yüksek Pano", coefficient: 1.15 },
  { id: "digital_panel", label: "Dijital / Led Pano", coefficient: 1.3 },
];

const YDO_PRIMARY_SOURCE_URL = "https://www.gib.gov.tr/node/177112";
const YDO_RATE_BY_TARGET_YEAR: Array<{ year: number; rate: number }> = [
  { year: 2001, rate: 56 },
  { year: 2002, rate: 53.2 },
  { year: 2003, rate: 59 },
  { year: 2004, rate: 28.5 },
  { year: 2005, rate: 11.2 },
  { year: 2006, rate: 9.8 },
  { year: 2007, rate: 7.8 },
  { year: 2008, rate: 7.2 },
  { year: 2009, rate: 12 },
  { year: 2010, rate: 2.2 },
  { year: 2011, rate: 7.7 },
  { year: 2012, rate: 10.26 },
  { year: 2013, rate: 7.8 },
  { year: 2014, rate: 3.93 },
  { year: 2015, rate: 10.11 },
  { year: 2016, rate: 5.58 },
  { year: 2017, rate: 3.83 },
  { year: 2018, rate: 14.47 },
  { year: 2019, rate: 21.25 },
  { year: 2020, rate: 23.73 },
  { year: 2021, rate: 9.11 },
  { year: 2022, rate: 36.2 },
  { year: 2023, rate: 122.93 },
  { year: 2024, rate: 58.46 },
  { year: 2025, rate: 43.93 },
  { year: 2026, rate: 25.49 },
];
const YDO_RATE_INDEX = new Map(YDO_RATE_BY_TARGET_YEAR.map((item) => [item.year, item.rate]));
const MINING_APPLICATION_YEARS: MiningYearOption[] = [...OFFICIAL_MINING_APPLICATION_YEARS].sort(
  (a, b) => b.year - a.year,
);

const MINING_YEAR_INDEX = new Map(MINING_APPLICATION_YEARS.map((item) => [item.year, item]));
const MINING_OPERATION_INDEX = new Map(MINING_OPERATION_TYPES.map((item) => [item.id, item]));
const MINING_PERMIT_INDEX = new Map(MINING_PERMIT_TYPES.map((item) => [item.id, item]));
const MINING_CLOSURE_INDEX = new Map(MINING_CLOSURE_LEVELS.map((item) => [item.id, item]));
const MINING_PROVINCE_INDEX = new Map(MINING_PROVINCES.map((item) => [item.name, item.coefficient]));

const ENERGY_APPLICATION_YEARS: MiningYearOption[] = [...MINING_APPLICATION_YEARS];
const ENERGY_PROVINCES: MiningProvinceOption[] = [...MINING_PROVINCES];
const ENERGY_YEAR_INDEX = new Map(ENERGY_APPLICATION_YEARS.map((item) => [item.year, item]));
const ENERGY_PROVINCE_INDEX = new Map(ENERGY_PROVINCES.map((item) => [item.name, item.coefficient]));
const ENERGY_PERMIT_INDEX = new Map(ENERGY_PERMIT_TYPES.map((item) => [item.id, item]));
const ENERGY_CLOSURE_INDEX = new Map(ENERGY_CLOSURE_LEVELS.map((item) => [item.id, item]));
const PANO_PERMIT_INDEX = new Map(PANO_PERMIT_TYPES.map((item) => [item.id, item]));

const MINING_REFERENCE_LINKS: ToolSourceLink[] = [
  {
    label: "Orman Kanununun 16 ncı Maddesi Uygulama Yönetmeliği (22.08.2025 / 32994 RG)",
    url: "https://www.ogm.gov.tr/tr/e-kutuphane-sitesi/mevzuat-sitesi/Yonetmelikler/Orman%20Kanununun%2016%20nc%C4%B1%20Madde%20Y%C3%B6netmeli%C4%9Fi%2022.08.2025%20tarih%20ve%2032994%20R.G.%20De%C4%9Fi%C5%9Fiklikleri%20%C4%B0%C5%9Flenmi%C5%9F%20Son%20Hali.pdf",
  },
  ...OFFICIAL_MINING_APPLICATION_YEARS.map((item) => ({
    label: `${item.year} Yılı OGM Birim Bedelleri`,
    url: item.sourceUrl,
  })),
];

const YDO_REFERENCE_LINKS: ToolSourceLink[] = [
  {
    label: "2025 Yılı İçin Yeniden Değerleme Oranı (%25,49) - VUK Genel Tebliği (Sıra No: 585)",
    url: "https://cdn.gib.gov.tr/api/gibportal-file/file/getFile?objectKey=DUYURU%2FUNIVERSAL%2F2025%2F213_Teblig_585_not.pdf",
  },
  {
    label: "2024 Yılı İçin Yeniden Değerleme Oranı (%43,93) - VUK Genel Tebliği (Sıra No: 574)",
    url: "https://www.gib.gov.tr/node/176158",
  },
  {
    label: "2023 Yılı İçin Yeniden Değerleme Oranı (%58,46) - VUK Genel Tebliği (Sıra No: 561)",
    url: "https://www.gib.gov.tr/node/174730",
  },
  {
    label: "GİB Duyuruları (Yeniden Değerleme Oranı)",
    url: YDO_PRIMARY_SOURCE_URL,
  },
];

const TOOL_SOURCE_LINKS: Record<string, ToolSourceLink[]> = {
  [MINING_TOOL_SLUG]: MINING_REFERENCE_LINKS,
  [ENERGY_TOOL_SLUG]: MINING_REFERENCE_LINKS,
  [ILETISIM_PANO_TOOL_SLUG]: MINING_REFERENCE_LINKS,
  [IL_KATSAYI_KARSILASTIRMA_TOOL_SLUG]: MINING_REFERENCE_LINKS,
  [IZIN_KATSAYI_KARSILASTIRMA_TOOL_SLUG]: MINING_REFERENCE_LINKS,
  [YDO_BAK_TOOL_SLUG]: YDO_REFERENCE_LINKS,
  [DAMGA_NOTER_TOOL_SLUG]: [
    {
      label: "Damga Vergisi Kanunu Genel Tebliği (Seri No: 71) - 2025",
      url: "https://cdn.gib.gov.tr/api/gibportal-file/file/getFile?objectKey=MEVZUAT_TEBLIGLER%2FUNIVERSAL%2F2025%2F488_Teblig71.pdf",
    },
    {
      label: "Damga Vergisi Kanunu (1) Sayılı Tablo - 01.10.2025",
      url: "https://cdn.gib.gov.tr/api/gibportal-file/file/getFile?objectKey=MEVZUAT_TEBLIGLER%2FUNIVERSAL%2F2025%2F488_Tablo1_01102025.pdf",
    },
    {
      label: "Türkiye Noterler Birliği - Noterlik Ücret Tarifesi",
      url: "https://www.tnb.org.tr/tr/mevzuat/noterlik-ucret-tarifesi",
    },
  ],
  [KDV_YUZDE_TOOL_SLUG]: [
    {
      label: "GİB KDV Sirküleri / Tebliğ Duyuruları",
      url: "https://cdn.gib.gov.tr/api/gibportal-file/file/getFile?objectKey=DUYURU%2FUNIVERSAL%2F2025%2FKDVSerno55Teb_abn.pdf",
    },
  ],
  [CARBON_TOOL_SLUG]: [
    {
      label: "IPCC 2006 Guidelines for National Greenhouse Gas Inventories",
      url: "https://www.ipcc-nggip.iges.or.jp/public/2006gl/",
    },
  ],
  [AGACLANDIRMA_BAKIM_BUTCE_TOOL_SLUG]: [
    {
      label: "OGM e-Kütüphane (resmi talimat, teknik esas ve birim bedeller)",
      url: "https://www.ogm.gov.tr/tr/e-kutuphane-sitesi",
    },
  ],
  [ORMAN_YOLU_METRAJ_TOOL_SLUG]: [
    {
      label: "OGM e-Kütüphane (resmi talimat, teknik esas ve birim bedeller)",
      url: "https://www.ogm.gov.tr/tr/e-kutuphane-sitesi",
    },
  ],
  [FIDAN_CIT_TOOL_SLUG]: [
    {
      label: "OGM e-Kütüphane (resmi talimat, teknik esas ve birim bedeller)",
      url: "https://www.ogm.gov.tr/tr/e-kutuphane-sitesi",
    },
  ],
};

const SITE_ORIGIN = "https://lacivert.cc";
const TOOLS_ROUTE_PATH = "/hesap-araclari";
const DEFAULT_TOOL_OG_IMAGE = "/img/panel-16-front.jpg";
const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

const CUSTOM_ROUTE_BASE_HEAD_NODES = [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">',
  '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">',
  '<link rel="stylesheet" href="/css/styleorman.css">',
];

type CustomRouteSeoConfig = {
  title: string;
  headNodes: string[];
};

const toAbsoluteSiteUrl = (pathOrUrl: string): string => {
  if (!pathOrUrl) return SITE_ORIGIN;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_ORIGIN}${normalized}`;
};

const ORGANIZATION_SCHEMA = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "Lacivert Ormancılık Mühendislik San. Tic. Ltd. Şti.",
  url: `${SITE_ORIGIN}/`,
  logo: toAbsoluteSiteUrl("/img/logo-yeni.png"),
  image: toAbsoluteSiteUrl("/img/logo-yeni.png"),
  telephone: "+90 530 909 41 08",
  email: "omer@lacivert.cc",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Selahattin Eyyübi Caddesi, Serdar Mahallesi, No:36, İç Kapı No: 11, 41 OFFİCE",
    addressLocality: "Başiskele",
    addressRegion: "Kocaeli",
    postalCode: "41000",
    addressCountry: "TR",
  },
  areaServed: {
    "@type": "Country",
    name: "Türkiye",
  },
  sameAs: [
    "https://www.instagram.com/lacivertormancilik?igsh=MWw0b2pmcm9ib2ZmMw==",
    "https://www.linkedin.com/company/laci%CC%87vert-ormancilik-m%C3%BChendi%CC%87sli%CC%87k-san-ti%CC%87c-ltd-%C5%9Fti%CC%87/?viewAsMember=true",
    "https://www.google.com/maps/place/Lacivert+Ormanc%C4%B1l%C4%B1k+M%C3%BChendislik/@40.7145355,29.9389795,19z",
  ],
} as const;

const LOCAL_SERVICE_SCHEMA = {
  "@type": "ProfessionalService",
  "@id": `${SITE_ORIGIN}/#professional-service`,
  name: "Lacivert Ormancılık",
  url: `${SITE_ORIGIN}/`,
  provider: { "@id": ORGANIZATION_ID },
  areaServed: "TR",
  serviceType: [
    "Orman izin süreç yönetimi",
    "Madde 16 ormancılık izin hizmetleri",
    "Madde 17 ormancılık izin hizmetleri",
    "Madencilikte orman izin bedeli danışmanlığı",
    "Teknik evrak ve rapor hazırlama",
  ],
} as const;

const TOOLS_LIST_FAQ_ITEMS: FaqItem[] = [
  {
    question: "Madencilikte orman izin bedeli hesaplama nasıl yapılır?",
    answer:
      "Hesaplama, izin türü katsayısı, il katsayısı, kapalılık oranı, alan ve yıl birim bedelleri birlikte değerlendirilerek yapılır.",
  },
  {
    question: "17/3 kapsamındaki RES ve GES izinlerinde hangi veriler gerekir?",
    answer:
      "İzin türü, toplam alan, uygulama yılı, il ve kapalılık verileri girilerek arazi bedeli ile ağaçlandırma bedeli ayrı ayrı hesaplanır.",
  },
  {
    question: "Hesaplama araçları resmi mevzuata uygun mu?",
    answer:
      "Araçlarda kullanılan katsayı ve açıklamalar, ilgili OGM mevzuatı ve resmi kaynak bağlantıları referans alınarak düzenlenmiştir.",
  },
];

const escapeHtmlAttribute = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

const trimText = (value: string, maxLength: number): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const buildSeoHeadNodes = ({
  title,
  description,
  keywords,
  canonicalUrl,
  imageUrl,
  robots,
  ogType,
  jsonLd,
}: {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  imageUrl: string;
  robots: string;
  ogType: "website" | "article";
  jsonLd: Record<string, unknown>;
}): string[] => {
  const escapedTitle = escapeHtmlAttribute(title);
  const escapedDescription = escapeHtmlAttribute(description);
  const escapedKeywords = escapeHtmlAttribute(keywords);
  const escapedCanonical = escapeHtmlAttribute(canonicalUrl);
  const escapedImage = escapeHtmlAttribute(imageUrl);
  const escapedRobots = escapeHtmlAttribute(robots);

  return [
    ...CUSTOM_ROUTE_BASE_HEAD_NODES,
    `<meta name="description" content="${escapedDescription}">`,
    `<meta name="keywords" content="${escapedKeywords}">`,
    `<meta name="robots" content="${escapedRobots}">`,
    '<meta name="author" content="Lacivert Ormancılık">',
    '<meta name="language" content="tr-TR">',
    '<meta name="theme-color" content="#0a1f44">',
    `<link rel="canonical" href="${escapedCanonical}">`,
    `<link rel="alternate" hreflang="tr-TR" href="${escapedCanonical}">`,
    `<link rel="alternate" hreflang="x-default" href="${escapedCanonical}">`,
    '<meta property="og:locale" content="tr_TR">',
    '<meta property="og:locale:alternate" content="tr_TR">',
    '<meta property="og:site_name" content="Lacivert Ormancılık">',
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:title" content="${escapedTitle}">`,
    `<meta property="og:description" content="${escapedDescription}">`,
    `<meta property="og:url" content="${escapedCanonical}">`,
    `<meta property="og:image" content="${escapedImage}">`,
    `<meta property="og:image:alt" content="${escapedTitle}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapedTitle}">`,
    `<meta name="twitter:description" content="${escapedDescription}">`,
    `<meta name="twitter:url" content="${escapedCanonical}">`,
    `<meta name="twitter:image" content="${escapedImage}">`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ];
};

const buildFaqSchema = (id: string, items: FaqItem[]) => ({
  "@type": "FAQPage",
  "@id": id,
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
});

const getToolFaqItems = (tool: ToolItem): FaqItem[] => [
  {
    question: `${tool.title} ne işe yarar?`,
    answer: `${tool.summary} Araç, proje planlama aşamasında hızlı ve karşılaştırmalı sonuç üretmek için kullanılır.`,
  },
  {
    question: `${tool.title} için hangi veriler gerekir?`,
    answer:
      "Araç türüne göre alan, katsayı, yıl ve işlem parametreleri girilir. Formdaki tüm zorunlu alanlar doldurulduğunda sonuç otomatik üretilir.",
  },
  {
    question: "Hesaplama sonuçları resmi başvuruda nasıl kullanılır?",
    answer:
      "Sonuçlar ön fizibilite ve maliyet öngörüsü amacıyla kullanılır. Resmi başvurularda güncel mevzuat ve kurum değerlendirmesi esas alınmalıdır.",
  },
];

const buildCustomRouteSeoConfig = (route: Exclude<CustomRoute, null>, tool: ToolItem | null): CustomRouteSeoConfig => {
  const websiteSchema = {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_ORIGIN}/`,
    name: "Lacivert Ormancılık",
    inLanguage: "tr-TR",
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_ORIGIN}/hesap-araclari?ara={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  if (route.kind === "list") {
    const canonicalUrl = toAbsoluteSiteUrl(TOOLS_ROUTE_PATH);
    const title = "Hesaplama Araçları | Ormancılık ve Madencilik Hesaplama Merkezi | Lacivert Ormancılık";
    const description = trimText(
      "Madencilikte orman izin bedeli, 17/3 izin bedeli, kıstelyevm, KDV ve diğer ormancılık hesaplama araçlarını Lacivert Ormancılık hesaplama merkezinde ücretsiz kullanın.",
      170,
    );
    const keywords = [
      "hesaplama araçları",
      "orman izin bedeli hesaplama",
      "madencilikte orman izin bedelleri",
      "17/3 izin bedeli hesaplama",
      "kıstelyevm hesaplama",
      "KDV hesaplama aracı",
      "Lacivert Ormancılık",
    ].join(", ");
    const imageUrl = toAbsoluteSiteUrl(DEFAULT_TOOL_OG_IMAGE);

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        websiteSchema,
        ORGANIZATION_SCHEMA,
        LOCAL_SERVICE_SCHEMA,
        {
          "@type": "CollectionPage",
          "@id": `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: title,
          description,
          inLanguage: "tr-TR",
          isPartOf: { "@id": WEBSITE_ID },
          breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${canonicalUrl}#breadcrumb`,
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Anasayfa", item: `${SITE_ORIGIN}/` },
            { "@type": "ListItem", position: 2, name: "Hesaplama Araçları", item: canonicalUrl },
          ],
        },
        {
          "@type": "ItemList",
          "@id": `${canonicalUrl}#itemlist`,
          name: "Lacivert Ormancılık Hesaplama Araçları",
          numberOfItems: TOOL_ITEMS.length,
          itemListElement: TOOL_ITEMS.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.title,
            url: toAbsoluteSiteUrl(`${TOOLS_ROUTE_PATH}/${item.slug}`),
          })),
        },
        buildFaqSchema(`${canonicalUrl}#faq`, TOOLS_LIST_FAQ_ITEMS),
      ],
    };

    return {
      title,
      headNodes: buildSeoHeadNodes({
        title,
        description,
        keywords,
        canonicalUrl,
        imageUrl,
        robots: "index, follow, max-image-preview:large",
        ogType: "website",
        jsonLd,
      }),
    };
  }

  if (!tool) {
    const canonicalUrl = toAbsoluteSiteUrl(TOOLS_ROUTE_PATH);
    const title = "Hesap Aracı Bulunamadı | Lacivert Ormancılık";
    const description = "Aradığınız hesaplama aracı bulunamadı. Güncel hesaplama araçları listesine geri dönebilirsiniz.";
    const keywords = "hesaplama aracı, Lacivert Ormancılık, ormancılık hesaplama";
    const imageUrl = toAbsoluteSiteUrl(DEFAULT_TOOL_OG_IMAGE);
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        websiteSchema,
        ORGANIZATION_SCHEMA,
        {
          "@type": "WebPage",
          "@id": `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: title,
          description,
          inLanguage: "tr-TR",
          isPartOf: { "@id": WEBSITE_ID },
        },
      ],
    };

    return {
      title,
      headNodes: buildSeoHeadNodes({
        title,
        description,
        keywords,
        canonicalUrl,
        imageUrl,
        robots: "noindex, follow",
        ogType: "website",
        jsonLd,
      }),
    };
  }

  const canonicalUrl = toAbsoluteSiteUrl(`${TOOLS_ROUTE_PATH}/${tool.slug}`);
  const title = `${tool.title} | Lacivert Ormancılık`;
  const description = trimText(`${tool.summary} ${tool.sectionText}`, 170);
  const keywords = Array.from(
    new Set([
      tool.title,
      ...tool.tags,
      "hesaplama aracı",
      "ormancılık hesaplama",
      "madencilik hesaplama",
      "Lacivert Ormancılık",
    ]),
  ).join(", ");
  const imageUrl = toAbsoluteSiteUrl(tool.image || DEFAULT_TOOL_OG_IMAGE);
  const faqItems = getToolFaqItems(tool);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      websiteSchema,
      ORGANIZATION_SCHEMA,
      LOCAL_SERVICE_SCHEMA,
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        description,
        inLanguage: "tr-TR",
        isPartOf: { "@id": WEBSITE_ID },
        breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Anasayfa", item: `${SITE_ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "Hesaplama Araçları", item: toAbsoluteSiteUrl(TOOLS_ROUTE_PATH) },
          { "@type": "ListItem", position: 3, name: tool.title, item: canonicalUrl },
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${canonicalUrl}#application`,
        name: tool.title,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: canonicalUrl,
        image: imageUrl,
        description,
        featureList: tool.bullets,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "TRY",
        },
        publisher: {
          "@type": "Organization",
          name: "Lacivert Ormancılık",
          url: `${SITE_ORIGIN}/`,
        },
      },
      {
        "@type": "Service",
        "@id": `${canonicalUrl}#service`,
        name: tool.title,
        description,
        provider: { "@id": ORGANIZATION_ID },
        areaServed: "TR",
        url: canonicalUrl,
      },
      buildFaqSchema(`${canonicalUrl}#faq`, faqItems),
    ],
  };

  return {
    title,
    headNodes: buildSeoHeadNodes({
      title,
      description,
      keywords,
      canonicalUrl,
      imageUrl,
      robots: "index, follow, max-image-preview:large",
      ogType: "article",
      jsonLd,
    }),
  };
};

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

const BASE_LEGACY_INTERNAL_LINKS: SeoInternalLink[] = [
  { href: "/hesap-araclari", label: "Ormancılık Hesaplama Araçları" },
  { href: "/madde16.html", label: "Madde 16 Orman İzin Süreçleri" },
  { href: "/madde17.html", label: "Madde 17 Orman İzin Süreçleri" },
  { href: "/ormanizinleri.html", label: "Orman İzinleri Hizmetleri" },
  { href: "/kanunveyonetmelikler.html", label: "Kanun ve Yönetmelikler Rehberi" },
  { href: "/iletisim.html", label: "Teklif ve İletişim" },
];

const LEGACY_ROUTE_SEO_PROFILES: Record<string, LegacySeoProfile> = {
  "/madde16": {
    heading: "Madde 16 Orman İzin Süreçlerinde Teknik Planlama",
    paragraphs: [
      "Orman Kanunu Madde 16 kapsamındaki maden arama, işletme ve altyapı süreçlerinde doğru teknik planlama, başvuru dosyasının onay süresini doğrudan etkiler.",
      "Lacivert Ormancılık; saha ölçümü, koordinat kontrolü, teknik rapor tanzimi ve kurum revizyon takibini aynı süreç yönetim modeli içinde yürütür.",
      "Başvuru öncesinde risk analizi ve maliyet öngörüsü yapılması, proje yatırım takvimini korumak ve izin sürecini hızlandırmak için kritik önemdedir.",
    ],
    links: BASE_LEGACY_INTERNAL_LINKS,
  },
  "/madde17": {
    heading: "Madde 17 Kapsamında Madencilik ve Altyapı İzin Yönetimi",
    paragraphs: [
      "Madde 17 süreçlerinde maden, enerji ve ulaşım yatırımları için güzergâh, alan ve teknik dosya uyumu birlikte değerlendirilmelidir.",
      "Proje dosyasında kullanılan koordinat, aplikasyon ve raporlama verilerinin mevzuata uygun hazırlanması, tekrar revizyon riskini düşürür.",
      "Sahaya özel planlama ve mevzuat kontrollü dokümantasyon, proje süresini ve toplam izin maliyetini daha öngörülebilir hale getirir.",
    ],
    links: BASE_LEGACY_INTERNAL_LINKS,
  },
  "/ormanizinleri": {
    heading: "Orman İzinleri İçin Uygulanabilir Süreç Kurgusu",
    paragraphs: [
      "Orman izin süreçlerinde ön izin, kesin izin, ek talep ve revizyon adımlarının her biri farklı teknik belge ve zaman planı gerektirir.",
      "Lacivert Ormancılık, proje türüne göre uygun belge setini oluşturarak kurum süreçlerinde uyumlu bir başvuru akışı sağlar.",
      "Doğru hazırlanan evrak ve ölçüm altyapısı, izin sürecinde gecikmeye neden olan eksik belge ve uyumsuz veri risklerini azaltır.",
    ],
    links: BASE_LEGACY_INTERNAL_LINKS,
  },
  "/kanunveyonetmelikler": {
    heading: "Orman Mevzuatının Projeye Doğru Uyarlanması",
    paragraphs: [
      "Orman Kanunu ve ilgili yönetmeliklerin proje özelinde doğru yorumlanması, uygulama aşamasında hukuki ve teknik uyumluluğu güçlendirir.",
      "Madde 16 ve Madde 17 uygulamalarında mevzuat değişikliklerinin düzenli takibi, proje bütçesi ve izin takvimi açısından stratejik değer taşır.",
      "Kurum beklentisine uygun evrak dili ve teknik içerik standardı, dosyanın değerlendirme süresini optimize eder.",
    ],
    links: BASE_LEGACY_INTERNAL_LINKS,
  },
  "/izinirtifak": {
    heading: "İzin ve İrtifak Süreçlerinde Belgelerin Teknik Tutarlılığı",
    paragraphs: [
      "İzin ve irtifak süreçlerinde saha verileri ile idari dosya arasında tutarlılık sağlanması, başvuru güvenilirliğinin temel unsurudur.",
      "Güzergâh, alan ve kullanım amacı verilerinin doğru eşleştirilmesi, kurum aşamalarında tekrar çalışma ihtiyacını düşürür.",
      "Planlı süreç yönetimi ile teknik denetim adımları birlikte yürütüldüğünde izin/irtifak kararları daha hızlı sonuçlanır.",
    ],
    links: BASE_LEGACY_INTERNAL_LINKS,
  },
  "/diger": {
    heading: "Diğer Ormancılık İşlerinde Proje Bazlı Çözüm",
    paragraphs: [
      "Madde 16 ve Madde 17 dışındaki özel ormancılık işlerinde teknik dosya kurgusu proje türüne göre farklılaşır.",
      "Tapulu kesim, ağaç röleve planı ve benzeri süreçlerde saha gerçekliği ile mevzuat uyumunu aynı çerçevede ele almak gerekir.",
      "Lacivert Ormancılık, kurum süreçlerine uygun raporlama ve başvuru planlaması ile proje sahibine operasyonel netlik sağlar.",
    ],
    links: BASE_LEGACY_INTERNAL_LINKS,
  },
  "/muhendislik": {
    heading: "Ormancılık Mühendislik Hizmetlerinde Uçtan Uca Yönetim",
    paragraphs: [
      "Ormancılık mühendislik hizmetlerinde ölçüm, raporlama, mevzuat uyumu ve kurum takibi adımlarının tek bir planla ilerlemesi gerekir.",
      "Sahadan ofise veri standardı kurulması, revizyon sayısını azaltarak proje teslim süresini daha istikrarlı hale getirir.",
      "Teknik ekip, doğru evrak kurgusu ve iç süreç disiplini ile yatırım kararlarını destekleyen güvenilir çıktı üretir.",
    ],
    links: BASE_LEGACY_INTERNAL_LINKS,
  },
  "/hakkimizda": {
    heading: "Lacivert Ormancılık Yaklaşımı ve Hizmet Modeli",
    paragraphs: [
      "Lacivert Ormancılık, ormancılık ve madencilik izin süreçlerinde teknik doğruluk, mevzuat uyumu ve zaman yönetimini birlikte ele alır.",
      "Her projede saha verisi, evrak kurgusu ve kurum takibi aynı standartla yönetilerek başvurunun sürdürülebilirliği güçlendirilir.",
      "Hizmet modelimiz; başvuru öncesi hazırlık, uygulama yönetimi ve dosya kapanış süreçlerini tek çatı altında birleştirir.",
    ],
    links: BASE_LEGACY_INTERNAL_LINKS,
  },
  "/iletisim": {
    heading: "Orman İzin Projeleriniz İçin Hızlı Ön Değerlendirme",
    paragraphs: [
      "Madde 16, Madde 17 ve diğer ormancılık süreçlerinde doğru başlangıç kurgusu, proje süresini doğrudan etkiler.",
      "İletişim aşamasında proje türü, lokasyon ve izin hedeflerinin netleştirilmesi, teklif ve iş planı doğruluğunu artırır.",
      "Teknik ekibimiz, süreç kapsamına göre uygulanabilir yol haritasını kısa sürede paylaşarak proje kararlarını hızlandırır.",
    ],
    links: BASE_LEGACY_INTERNAL_LINKS,
  },
  "/surdurulebilirlik": {
    heading: "Sürdürülebilir Ormancılık İçin Ölçülebilir Teknik Yaklaşım",
    paragraphs: [
      "Sürdürülebilirlik odaklı ormancılık uygulamalarında çevresel etki, süreç verimliliği ve mevzuat uyumu birlikte değerlendirilmelidir.",
      "Proje planlamasında ölçülebilir hedefler kullanmak, saha uygulamalarının uzun vadeli performansını güçlendirir.",
      "Doğru teknik raporlama, kurumsal sürdürülebilirlik hedeflerini somut veri ile destekleyen bir karar altyapısı sunar.",
    ],
    links: BASE_LEGACY_INTERNAL_LINKS,
  },
};

const resolveLegacySeoProfile = (routePath: string, pageTitle: string): LegacySeoProfile | null => {
  const normalized = normalizePath(routePath || "/");

  if (LEGACY_ROUTE_SEO_PROFILES[normalized]) {
    return LEGACY_ROUTE_SEO_PROFILES[normalized];
  }

  if (normalized.startsWith("/projeler/")) {
    return {
      heading: "Proje Uygulamasında Teknik Süreç ve Mevzuat Uyumu",
      paragraphs: [
        `${pageTitle} kapsamında yapılan ormancılık çalışmaları; saha verisi, teknik rapor ve kurum koordinasyonu adımlarıyla birlikte yürütülür.`,
        "Proje dosyasının teknik doğruluğu ve mevzuat uyumu, izin sürecinin kesintisiz ilerlemesi için temel kriterdir.",
        "Kategori bazlı referans projeler ve hesaplama araçları, benzer süreçlerde ön planlama yapmayı kolaylaştırır.",
      ],
      links: [
        { href: "/madde16.html", label: "Madde 16 Projeleri" },
        { href: "/madde17.html", label: "Madde 17 Projeleri" },
        { href: "/diger.html", label: "Diğer Projeler" },
        { href: "/hesap-araclari", label: "Hesaplama Araçları Merkezi" },
        { href: "/iletisim.html", label: "Proje İçin Teklif Alın" },
      ],
    };
  }

  return null;
};

const ensurePrimaryHeading = (doc: Document, fallbackTitle: string): void => {
  const main = doc.querySelector("main") || doc.body;
  if (!main) return;
  if (main.querySelector("h1")) return;

  const sourceHeading = main.querySelector<HTMLElement>(".page-hero__title, .hero-card__title, h2, h3");
  const text = (sourceHeading?.textContent || fallbackTitle).replace(/\s+/g, " ").trim();
  if (!text) return;

  const h1 = doc.createElement("h1");
  h1.className = "legacy-seo-h1";
  h1.textContent = text;
  main.prepend(h1);
};

const ensureImageAltTexts = (doc: Document, fallbackTitle: string): void => {
  let imageIndex = 1;

  doc.querySelectorAll("img").forEach((node) => {
    if (!(node instanceof HTMLImageElement)) return;
    const currentAlt = (node.getAttribute("alt") || "").trim();
    if (currentAlt.length > 0) return;

    node.setAttribute("alt", `${fallbackTitle} görseli ${imageIndex}`);
    imageIndex += 1;
  });
};

const injectLegacySeoContent = (doc: Document, routePath: string, pageTitle: string): void => {
  const profile = resolveLegacySeoProfile(routePath, pageTitle);
  if (!profile) return;

  const main = doc.querySelector("main");
  if (!(main instanceof HTMLElement)) return;
  if (main.querySelector(".legacy-seo-support")) return;

  const section = doc.createElement("section");
  section.className = "legacy-seo-support section section--compact";

  const container = doc.createElement("div");
  container.className = "container legacy-seo-support__inner";

  const heading = doc.createElement("h2");
  heading.textContent = profile.heading;
  container.appendChild(heading);

  profile.paragraphs.forEach((text) => {
    const paragraph = doc.createElement("p");
    paragraph.textContent = text;
    container.appendChild(paragraph);
  });

  const linksHeading = doc.createElement("h3");
  linksHeading.textContent = "İlgili Sayfalar ve İç Linkler";
  container.appendChild(linksHeading);

  const linksList = doc.createElement("ul");
  linksList.className = "legacy-seo-support__links";

  const uniqueLinks = new Set<string>();
  profile.links.forEach((link) => {
    const key = `${link.href}|${link.label}`;
    if (uniqueLinks.has(key)) return;
    uniqueLinks.add(key);

    const item = doc.createElement("li");
    const anchor = doc.createElement("a");
    anchor.href = link.href;
    anchor.textContent = link.label;
    item.appendChild(anchor);
    linksList.appendChild(item);
  });

  container.appendChild(linksList);
  section.appendChild(container);
  main.appendChild(section);
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

const ensureHomeMenuLink = (doc: Document, routePath: string): void => {
  const normalizedRoute = normalizePath(routePath);

  doc.querySelectorAll("#navLinks").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;

    const directItems = () =>
      Array.from(node.querySelectorAll(":scope > li")).filter((item): item is HTMLLIElement => item instanceof HTMLLIElement);

    let homeItem = directItems().find((item) => {
      const link = item.querySelector(":scope > a");
      if (!(link instanceof HTMLAnchorElement)) return false;
      const href = normalizePath(link.getAttribute("href") || "");
      return href === "/" || href === "/index.html";
    }) ?? null;

    if (!homeItem) {
      homeItem = doc.createElement("li");
      const link = doc.createElement("a");
      link.href = "/";
      link.className = "nav__link";
      link.textContent = "Anasayfa";
      homeItem.appendChild(link);
      node.insertBefore(homeItem, node.firstElementChild);
    }

    const homeLink = homeItem.querySelector(":scope > a");
    if (homeLink instanceof HTMLAnchorElement) {
      homeLink.href = "/";
      if (normalizedRoute === "/") {
        homeLink.classList.add("is-current");
        homeLink.setAttribute("aria-current", "page");
      } else {
        homeLink.classList.remove("is-current");
        homeLink.removeAttribute("aria-current");
      }
    }
  });
};

const parsePage = (rawHtml: string, routePath: string): ParsedPage => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  ensureHomeMenuLink(doc, routePath);
  ensureToolsMenuLink(doc);

  const title = doc.title || "Lacivert Ormancılık";
  const headNodes: string[] = [];

  Array.from(doc.head.children).forEach((node) => {
    const tag = node.tagName.toLowerCase();

    if (tag === "title" || tag === "script") return;

    if (tag === "meta") {
      const charset = node.getAttribute("charset");
      const name = (node.getAttribute("name") || "").toLowerCase();
      const httpEquiv = (node.getAttribute("http-equiv") || "").toLowerCase();
      if (charset || name === "viewport" || httpEquiv === "refresh") return;
    }

    headNodes.push(node.outerHTML);
  });

  Array.from(doc.body.querySelectorAll("script")).forEach((scriptNode) => {
    scriptNode.remove();
  });

  // Legacy sayfalarda ilk açılışta soluk görünümü engellemek için
  // fade bileşenlerini başlangıçta görünür işaretle.
  doc.querySelectorAll<HTMLElement>("[data-fade]").forEach((node) => {
    node.classList.add("visible");
  });

  ensurePrimaryHeading(doc, title);
  ensureImageAltTexts(doc, title);
  injectLegacySeoContent(doc, routePath, title);

  return {
    title,
    headNodes,
    bodyHtml: doc.body.innerHTML,
  };
};

const resolveLegacyRedirectPath = (payload: LazyPagePayload): string | null => {
  if (!payload.html) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(payload.html, "text/html");

  let target = "";

  const refreshMeta = doc.querySelector<HTMLMetaElement>('meta[http-equiv="refresh" i]');
  if (refreshMeta) {
    const content = refreshMeta.getAttribute("content") || "";
    const refreshMatch = content.match(/url\s*=\s*([^;]+)/i);
    if (refreshMatch?.[1]) {
      target = refreshMatch[1].trim();
    }
  }

  if (!target) {
    const scripts = Array.from(doc.querySelectorAll("script"));
    for (const script of scripts) {
      const text = script.textContent || "";
      const scriptMatch =
        text.match(/window\.location\.replace\((['"])(.*?)\1\)/i) ||
        text.match(/window\.location\.href\s*=\s*(['"])(.*?)\1/i) ||
        text.match(/window\.location\.assign\((['"])(.*?)\1\)/i);

      if (scriptMatch?.[2]) {
        target = scriptMatch[2].trim();
        break;
      }
    }
  }

  if (!target) return null;

  const sanitized = target.replace(/^['"]|['"]$/g, "");
  if (!sanitized || sanitized.startsWith("#")) return null;

  try {
    const sourcePath = payload.source.startsWith("/") ? payload.source : `/${payload.source}`;
    const baseUrl = new URL(sourcePath, window.location.origin);
    const resolved = new URL(sanitized, baseUrl);

    if (resolved.origin !== window.location.origin) return null;

    const resolvedPath = normalizePath(resolved.pathname);
    const currentRoute = normalizePath(payload.route);

    if (resolvedPath === currentRoute) return null;
    return resolvedPath;
  } catch {
    return null;
  }
};

const createElementFromHtml = (html: string): Element | null => {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
};

const normalizeHref = (href: string): string => {
  try {
    return new URL(href, window.location.origin).href;
  } catch {
    return href;
  }
};

const isLocalStylesheetHref = (href: string): boolean => {
  if (!href || href.startsWith("data:")) return false;

  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
};

const hasStylesheetInHead = (href: string): boolean => {
  const normalized = normalizeHref(href);
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"]')).some((link) => {
    const existingHref = link.getAttribute("href");
    if (!existingHref) return false;
    return normalizeHref(existingHref) === normalized;
  });
};

const waitForStylesheet = (link: HTMLLinkElement): Promise<void> => {
  const rawHref = link.getAttribute("href") || "";
  const hrefKey = normalizeHref(rawHref);
  if (hrefKey && LOADED_STYLESHEET_HREFS.has(hrefKey)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let fallbackTimer = 0;

    const done = () => {
      if (settled) return;
      settled = true;
      if (hrefKey) {
        LOADED_STYLESHEET_HREFS.add(hrefKey);
      }
      window.clearTimeout(fallbackTimer);
      resolve();
    };

    if (link.sheet) {
      done();
      return;
    }

    link.addEventListener("load", done, { once: true });
    link.addEventListener("error", done, { once: true });

    // Sonsuz bekleme engeli: yerel stil için kısa güvenlik zamanlayıcı.
    fallbackTimer = window.setTimeout(done, 1200);
  });
};

const runAfterNextPaint = (callback: () => void): void => {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback);
  });
};

const syncSiteHeaderOffsets = (): void => {
  const root = document.documentElement;
  const topbar = document.querySelector<HTMLElement>(".topbar");
  const nav = document.querySelector<HTMLElement>("header.nav");
  if (!nav) return;

  const topbarHeight = Math.max(0, Math.floor(topbar?.getBoundingClientRect().height ?? 0));
  const navRect = nav.getBoundingClientRect();
  const navBottom = Math.max(0, Math.floor(navRect.bottom));
  const headerOffset = Math.max(navBottom, topbarHeight + Math.floor(navRect.height));

  if (topbarHeight > 0) {
    root.style.setProperty("--site-topbar-offset", `${topbarHeight}px`);
  }
  if (headerOffset > 0) {
    root.style.setProperty("--site-header-offset", `${headerOffset}px`);
  }
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

const setupLegacyMobileNavigation = (): (() => void) => {
  const isMobileViewport = () => window.matchMedia("(max-width: 900px)").matches;

  const getNavElements = () => {
    const nav = document.querySelector<HTMLElement>("header.nav");
    if (!nav) return null;

    const burger = nav.querySelector<HTMLElement>("#burger");
    const navLinks = nav.querySelector<HTMLElement>("#navLinks");
    if (!burger || !navLinks) return null;

    return { nav, burger, navLinks };
  };

  const initDropdownAria = () => {
    const elements = getNavElements();
    if (!elements) return;

    const { navLinks } = elements;
    navLinks.querySelectorAll<HTMLElement>(".nav__dropdown").forEach((item) => {
      const trigger = item.querySelector<HTMLAnchorElement>(":scope > a");
      const panel = item.querySelector<HTMLElement>(":scope > .dropdown");
      if (!trigger || !panel) return;

      trigger.setAttribute("aria-haspopup", "true");
      if (!trigger.hasAttribute("aria-expanded")) {
        trigger.setAttribute("aria-expanded", "false");
      }
      panel.setAttribute("aria-hidden", item.classList.contains("is-open") ? "false" : "true");
    });
  };

  const closeDropdowns = () => {
    const elements = getNavElements();
    if (!elements) return;

    const { navLinks } = elements;
    navLinks.querySelectorAll<HTMLElement>(".nav__dropdown").forEach((item) => {
      item.classList.remove("is-open");
      const trigger = item.querySelector<HTMLAnchorElement>(":scope > a");
      const panel = item.querySelector<HTMLElement>(":scope > .dropdown");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      if (panel) panel.setAttribute("aria-hidden", "true");
    });
  };

  const closeMenu = () => {
    const elements = getNavElements();
    if (!elements) return;

    const { burger, navLinks } = elements;
    navLinks.classList.remove("show");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-controls", navLinks.id || "navLinks");
    document.body.classList.remove("legacy-menu-open");
    closeDropdowns();
  };

  const openMenu = () => {
    const elements = getNavElements();
    if (!elements) return;

    const { burger, navLinks } = elements;
    navLinks.classList.add("show");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-controls", navLinks.id || "navLinks");
    if (isMobileViewport()) {
      document.body.classList.add("legacy-menu-open");
    }
  };

  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target) return;

    const elements = getNavElements();
    if (!elements) return;

    const { nav } = elements;

    const burger = target.closest("#burger");
    if (burger && nav.contains(burger)) {
      event.preventDefault();
      if (elements.navLinks.classList.contains("show")) {
        closeMenu();
      } else {
        openMenu();
      }
      return;
    }

    const dropdownTrigger = target.closest<HTMLAnchorElement>(".nav__dropdown > a");
    if (dropdownTrigger && nav.contains(dropdownTrigger) && isMobileViewport()) {
      const parent = dropdownTrigger.closest<HTMLElement>(".nav__dropdown");
      const panel = parent?.querySelector<HTMLElement>(":scope > .dropdown");
      if (!parent || !panel) return;

      event.preventDefault();

      const shouldOpen = !parent.classList.contains("is-open");
      closeDropdowns();

      if (shouldOpen) {
        parent.classList.add("is-open");
        dropdownTrigger.setAttribute("aria-expanded", "true");
        panel.setAttribute("aria-hidden", "false");
      }
      return;
    }

    if (!isMobileViewport()) return;

    if (!nav.contains(target)) {
      closeMenu();
      return;
    }

    const clickedLink = target.closest("a");
    if (!clickedLink) return;

    const parentDropdown = clickedLink.closest<HTMLElement>(".nav__dropdown");
    const parentTrigger = parentDropdown?.querySelector<HTMLAnchorElement>(":scope > a");
    if (parentTrigger === clickedLink) return;

    closeMenu();
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    closeMenu();
  };

  const handleResize = () => {
    if (!isMobileViewport()) {
      closeMenu();
    }
  };

  initDropdownAria();
  closeMenu();
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleEscape);
  window.addEventListener("resize", handleResize);

  return () => {
    document.removeEventListener("click", handleDocumentClick);
    document.removeEventListener("keydown", handleEscape);
    window.removeEventListener("resize", handleResize);
    closeMenu();
  };
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
              <li>
                <a className={navClass(isActive("/"))} href="/" onClick={closeMenu}>
                  Anasayfa
                </a>
              </li>
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
        {TOOL_ITEMS.map((tool) => {
          const iconName = TOOL_CARD_ICON_BY_SLUG[tool.slug] ?? "default";
          return (
            <a key={tool.slug} href={`/hesap-araclari/${tool.slug}`} className={`tool-card tool-card--${iconName}`}>
              <div className="tool-card__head">
                <span className={`tool-card__icon tool-card__icon--${iconName}`}>
                  <ToolCardIcon name={iconName} />
                </span>
                <span className="tool-card__cta">Aracı Aç</span>
              </div>
              <div className="tool-card__body">
                <div className="tool-card__tags">
                  {tool.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <h2>{tool.title}</h2>
              </div>
            </a>
          );
        })}
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

  const parsedAreaInput = parseLocaleNumber(areaValue);
  const canAddRow = Number.isFinite(parsedAreaInput) && parsedAreaInput > 0;

  const handleAddRow = () => {
    const areaM2 = parsedAreaInput;
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

  const handleClearRows = () => {
    setRows([]);
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
          <h1>Neden Doğru Orman İzni Hesaplaması Yapmalısınız</h1>
          <p>
            Madencilik ve altyapı faaliyetlerinde orman izin süreçleri, proje maliyetlerini doğrudan etkiler.
            6831 sayılı Kanun kapsamında tahakkuk eden bedellerin doğru planlanması, nakit akışında ve
            fizibilite çalışmalarında kritik avantaj sağlar.
          </p>

          <h2>İzin Bedellerini Belirleyen Temel Kriterler</h2>
          <p>Hesaplamada doğrudan etkili ana parametreler aşağıdadır:</p>
          <ol>
            <li>
              <strong>İl katsayısı:</strong> Ek-3'e göre 1.0 ile 3.0 aralığında değişir.
            </li>
            <li>
              <strong>Ekolojik denge (kapalılık) katsayısı:</strong> Ek-2'ye göre 1.0 ile 2.0 aralığındadır.
            </li>
            <li>
              <strong>İzin türü katsayısı:</strong> Ek-1'e göre izin türüne bağlı olarak 0.2 ile 2.0 aralığında
              uygulanır.
            </li>
            <li>
              <strong>Cari yıl ağaçlandırma birim bedeli:</strong> OGM tarafından yıl bazında ilan edilen
              TL/hektar değeri kullanılır.
            </li>
          </ol>

          <div className="tool-detail__sources">
            <h3>Veri Kaynakları</h3>
            <ul>
              <li>
                <a href={MINING_REGULATION_URL} target="_blank" rel="noopener">
                  Orman Kanununun 16 nci Maddesi Uygulama Yönetmeliği (son hali, Ek-1/Ek-2/Ek-3)
                </a>
              </li>
              {MINING_APPLICATION_YEARS.map((option) => (
                <li key={option.year}>
                  <a href={option.sourceUrl} target="_blank" rel="noopener">
                    {option.year} Yılı Birim Bedelleri (OGM Talimatlar)
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
              5 hektarlık arazi bedeli muafiyeti ve ilk işletme izinlerindeki %50 arazi bedeli indirimi
              seçilen işlem türüne göre uygulanır.
            </p>
          </div>

          <div className="tool-calc__controls mining-calc__controls">
            <label>
              İşlem Türü
              <select value={operationId} onChange={(event) => setOperationId(event.target.value)}>
                {MINING_OPERATION_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Uygulama Yılı
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
              İl Katsayısı
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
              İzin Türü (Madencilik)
              <select value={permitId} onChange={(event) => setPermitId(event.target.value)}>
                {MINING_PERMIT_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alan (m²)
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={areaValue}
                onChange={(event) => setAreaValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canAddRow) {
                    event.preventDefault();
                    handleAddRow();
                  }
                }}
              />
            </label>
            <label>
              Kapalılık
              <select value={closureId} onChange={(event) => setClosureId(event.target.value)}>
                {MINING_CLOSURE_LEVELS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {formatNumber(option.coefficient)} ({option.label})
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={handleAddRow} disabled={!canAddRow}>EKLE</button>
          </div>

          <div className="tool-calc__table-wrap">
            <table className="tool-calc__table mining-calc__table">
              <thead>
                <tr>
                  <th>Madencilik Kalemi</th>
                  <th>Alan (m²)</th>
                  <th>Arazi Bedeli</th>
                  <th>Ağaçlandırma</th>
                  <th>Sil</th>
                </tr>
              </thead>
              <tbody>
                {calculatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Henüz kalem eklenmedi.</td>
                  </tr>
                ) : (
                  calculatedRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.permitLabel}</strong>
                        <small>
                          İzin katsayısı {formatNumber(row.permitCoefficient)} | Kapalılık{" "}
                          {formatNumber(row.closureCoefficient)}
                        </small>
                      </td>
                      <td>
                        {formatAreaM2(row.areaM2)} m²
                        {row.exemptedAreaM2 > 0 ? (
                          <small>{formatAreaM2(row.exemptedAreaM2)} m² muaf</small>
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
            <span>Kalem Sayısı: {calculatedRows.length}</span>
            <span>Toplam Alan: {formatAreaM2(totals.areaM2)} m²</span>
            <span>Arazi Bedeli Toplamı: {formatTry(totals.landAmount)}</span>
            <span>Ağaçlandırma Toplamı: {formatTry(totals.afforestationAmount)}</span>
            <span>Genel Toplam: {formatTry(grandTotal)}</span>
            <button
              type="button"
              className="calc-action-btn calc-action-btn--muted"
              onClick={handleClearRows}
              disabled={calculatedRows.length === 0}
            >
              Tümünü Temizle
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
};

const EnergyToolDetailPage = (_props: ToolDetailPageProps) => {
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

  const parsedAreaInput = parseLocaleNumber(areaValue);
  const canAddRow = Number.isFinite(parsedAreaInput) && parsedAreaInput > 0;

  const handleAddRow = () => {
    const areaM2 = parsedAreaInput;
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

  const handleClearRows = () => {
    setRows([]);
  };

  const handleDeleteRow = (id: number) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const grandTotal = totals.landAmount + totals.afforestationAmount;

  return (
    <section className="tool-detail tool-detail--energy">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="tool-detail__layout tool-detail__layout--energy">
        <article className="tool-detail__content tool-detail__content--energy">
          <h2>Orman İzin Bedelleri Hesaplama Aracı Hakkında</h2>
          <p>
            Bu hesaplama aracı, 17/3 kapsamındaki enerji ve altyapı izinlerinde tahmini bedellerin hızlı
            analiz edilmesi için hazırlandı. Uygulama yılı birim bedeli, il katsayısı, izin türü ve kapalılık
            seçimleriyle tahakkuk edecek kalemleri tek panelde görmenizi sağlar.
          </p>

          <h3>Hangi Kalemleri Kapsar</h3>
          <ol>
            <li>
              <strong>Arazi İzin Bedeli:</strong> yıl birim bedeli, izin türü katsayısı, kapalılık katsayısı ve il
              katsayısı çarpımı ile hesaplanır.
            </li>
            <li>
              <strong>Ağaçlandırma Bedeli:</strong> izin verilen alan için m² bazlı tek seferlik ağaçlandırma
              bedeli üzerinden hesaplanır.
            </li>
            <li>
              <strong>Toplam Bedel:</strong> arazi ve ağaçlandırma kalemlerinin toplam tutarı birlikte izlenir.
            </li>
          </ol>
        </article>

        <aside className="tool-calc energy-calc">
          <div className="tool-calc__head energy-calc__head">
            <h2>Enerji ve Diğer Yatırımlar İçin Orman İzni Bedel Hesaplama Aracı</h2>
            <p>Genişletilmiş tarih seçenekli mevzuat analizli hesaplama paneli.</p>
          </div>

          <div className="tool-calc__controls energy-calc__controls">
            <label>
              Uygulama Yılı (hektar bedeli)
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
              İl Katsayısı
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
              İzin Türü
              <select value={permitId} onChange={(event) => setPermitId(event.target.value)}>
                {ENERGY_PERMIT_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alan (m²)
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={areaValue}
                onChange={(event) => setAreaValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canAddRow) {
                    event.preventDefault();
                    handleAddRow();
                  }
                }}
              />
            </label>
            <label>
              Kapalılık
              <select value={closureId} onChange={(event) => setClosureId(event.target.value)}>
                {ENERGY_CLOSURE_LEVELS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {formatNumber(option.coefficient)} ({option.label})
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={handleAddRow} disabled={!canAddRow}>EKLE</button>
          </div>

          <div className="tool-calc__table-wrap">
            <table className="tool-calc__table energy-calc__table">
              <thead>
                <tr>
                  <th>İzin Türü</th>
                  <th>Alan (m²)</th>
                  <th>Arazi Bedeli</th>
                  <th>Ağaçlandırma</th>
                  <th>Sil</th>
                </tr>
              </thead>
              <tbody>
                {calculatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Henüz izin eklenmedi.</td>
                  </tr>
                ) : (
                  calculatedRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.permitLabel}</strong>
                        <small>
                          Katsayı: {formatNumber(row.permitCoefficient)} | Kapalılık:{" "}
                          {formatNumber(row.closureCoefficient)}
                        </small>
                      </td>
                      <td>{formatAreaM2(row.areaM2)} m²</td>
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
            <span>Kalem Sayısı: {calculatedRows.length}</span>
            <span>Toplam Alan: {formatAreaM2(totals.areaM2)} m²</span>
            <span>Arazi Bedeli Toplamı: {formatTry(totals.landAmount)}</span>
            <span>Ağaçlandırma Toplamı: {formatTry(totals.afforestationAmount)}</span>
            <span>Genel Toplam: {formatTry(grandTotal)}</span>
            <button
              type="button"
              className="calc-action-btn calc-action-btn--muted"
              onClick={handleClearRows}
              disabled={calculatedRows.length === 0}
            >
              Tümünü Temizle
            </button>
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
            <h1>ED50&apos;den KML&apos;ye Dönüştürücü Neler Yapar?</h1>
            <p>
              Bu araç, Türkiye&apos;de yaygın kullanılan ED50 datumundaki verileri WGS84 tabanlı harita
              sistemlerine hızlı biçimde dönüştürür. Lacivert Ormancılık saha planlama süreçlerinde
              koordinat uyumluluğunu bu panelle kolaylaştırır.
            </p>
            <ul>
              <li>
                <strong>Toplu Dönüşüm:</strong> Excel veya metin listelerindeki satırları tek seferde işler.
              </li>
              <li>
                <strong>Otomatik Alan Oluşturma:</strong> girdiğiniz noktalardan poligon ve alan hesabı üretir.
              </li>
              <li>
                <strong>Nokta İşaretleme:</strong> her nokta için haritada doğrulama imkanı sunar.
              </li>
              <li>
                <strong>Hassas Datum Dönüşümü:</strong> orman izin dosyaları için tutarlı koordinat çıktıları verir.
              </li>
            </ul>
          </article>

          <aside className="coord-panel">
            <div className="coord-panel__head">
              <h2>Gelişmiş ED50 6° Dönüşüm ve KML İndirme Aracı</h2>
              <p>Çalışma alanınızı haritada seçin ve ilgili UTM bölgesinde parselleri oluşturun.</p>
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
                Seçili Bölge (UTM Zone):
                <select value={zone} onChange={(event) => setZone(event.target.value)}>
                  <option value="35">Zone 35 (Marmara / Ege)</option>
                  <option value="36">Zone 36 (İç Anadolu / Akdeniz)</option>
                  <option value="37">Zone 37 (Karadeniz / Doğu)</option>
                </select>
              </label>
              <label>
                Koordinat Sistemi:
                <select value={coordinateSystem} onChange={(event) => setCoordinateSystem(event.target.value)}>
                  <option>ED50 6° UTM (Zone)</option>
                  <option>ITRF96 6° UTM (Zone)</option>
                  <option>WGS84 6° UTM (Zone)</option>
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
                placeholder={"Koordinatları buraya yapıştırın...\nÖrn: 500123.56 4400567.80"}
              />

              <button type="button" className="coord-add" onClick={addPolygon}>+ Yeni Parsel Ekle</button>
            </div>

            <div className="coord-actions">
              <button type="button" className="coord-btn coord-btn--blue">HARİTADA GÖR</button>
              <button type="button" className="coord-btn coord-btn--dark">KML OLARAK İNDİR</button>
              <button
                type="button"
                className="coord-btn coord-btn--muted"
                onClick={() => {
                  setPolygons([{ id: 1, name: "Poligon 1", text: "" }]);
                  setActivePolygonId(1);
                }}
              >
                TEMİZLE
              </button>
            </div>

            <div className="coord-card coord-card--area">
              <strong>Toplam Parsel Alanı (m²)</strong>
              <span>{formatAreaM2(totalArea)}</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

const CadConversionToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [selectedFileName, setSelectedFileName] = useState<string>("Dosya seçilmedi");

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFileName(file ? file.name : "Dosya seçilmedi");
  };

  return (
    <section className="tool-detail tool-detail--cad">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>
      <div className="tool-detail__layout tool-detail__layout--cad">
        <article className="tool-detail__content cad-content">
          <h1>Orman İzinleri ve Teknik Veri Dönüşümü</h1>
          <p>
            Lacivert Ormancılık olarak, orman izin süreçlerinde kullandığınız teknik dosyaların hızlı ve
            tutarlı biçimde dönüştürülmesi için CAD-GIS dönüşüm panelini bu sisteme entegre ettik.
          </p>
          <p>
            Bu ekran ile DXF ve KML/KMZ formatları arasında geçişleri kolaylaştırabilir, saha planı
            uyumluluğunu kontrol ederek izin dosyalarınızı daha hızlı hazırlayabilirsiniz.
          </p>

          <h2>Teknik Özellikler ve Hizmetlerimiz</h2>
          <ul>
            <li>
              <strong>DXF&apos;den KML&apos;ye Dönüşüm:</strong> teknik çizimlerinizi saha görüntülemeye uygun çıktıya
              çevirir.
            </li>
            <li>
              <strong>KML&apos;den DXF&apos;ye Dönüşüm:</strong> saha verilerini proje çizim akışına dahil eder.
            </li>
            <li>
              <strong>Otomatik PDF çıktısı:</strong> dönüşen teknik içeriği raporlama akışına hazırlar.
            </li>
            <li>
              <strong>Web Tabanlı Hız:</strong> ek kurulum olmadan tarayıcı üzerinden dönüşüm işlemi sağlar.
            </li>
          </ul>
        </article>

        <aside className="cad-panel">
          <div className="tool-calc__head cad-panel__head">
            <h2>Dosya Dönüştürme Aracı</h2>
            <p>CAD ve GIS Veri Dönüşüm Merkezi: DXF ↔ KML</p>
          </div>

          <div className="cad-map">
            <iframe
              title={`${tool.title} harita önizleme`}
              src="https://www.openstreetmap.org/export/embed.html?bbox=24.7%2C35.6%2C45.2%2C42.5&layer=mapnik"
              loading="lazy"
            />
          </div>

          <div className="cad-upload">
            <span>DOSYA SEÇ (.DXF, .KML, .KMZ)</span>
            <label className="cad-upload__field">
              <input type="file" accept=".dxf,.kml,.kmz" onChange={handleFileChange} />
              <strong>Dosya Seç</strong>
              <em>{selectedFileName}</em>
            </label>
            <button type="button">DOSYAYI ANALİZ ET VE GÖSTER</button>
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
      setError("Yıllık arazi izin bedeli geçerli bir tutar olmalıdır.");
      setResult(null);
      return;
    }
    if (!startDate || !endDate) {
      setError("Lütfen vade ve bitiş tarihlerini seçin.");
      setResult(null);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Tarih alanları geçersiz.");
      setResult(null);
      return;
    }
    if (end < start) {
      setError("İzin bitiş tarihi, vade tarihinden önce olamaz.");
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
          <h1>Kıstelyevm Hesaplaması Nasıl Yapılır?</h1>
          <p>
            Bu hesap aracı, güncel mevzuata uygun olarak 360 gün esası ile kıst bedel tahmini üretir.
            Başlangıç ve bitiş tarihleri arasındaki net gün farkına göre arazi izin bedelini prorata olarak
            hesaplar.
          </p>
          <ul>
            <li>
              <strong>360 Gün Esası:</strong> yıllık bedel 360&apos;a bölünerek günlük birim tutar üretilir.
            </li>
            <li>
              <strong>Net Gün Farkı:</strong> başlangıç ve bitiş tarihleri arasında gün sayısı otomatik hesaplanır.
            </li>
            <li>
              <strong>KDV Entegrasyonu:</strong> hesaplanan ana tutara %20 KDV otomatik eklenir.
            </li>
            <li>
              <strong>Kontrol:</strong> sahaya ait rakamların kurum kayıtlarıyla teyit edilmesi önerilir.
            </li>
          </ul>
        </article>

        <aside className="tool-calc kist-calc">
          <div className="tool-calc__head">
            <h2>{tool.title}</h2>
            <p>Kıstelyevm hesap adımlarını tek formda tamamlayın.</p>
          </div>

          <div className="kist-calc__body">
            <label>
              Vade Tarihi
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>

            <label>
              İzin Bitiş Tarihi
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>

            <label>
              Yıllık Arazi İzin Bedeli (TL)
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
                <span>Net Gün: {result.dayCount}</span>
                <span>Günlük Bedel: {formatTry(result.dailyAmount)}</span>
                <span>Kıst Ana Tutar: {formatTry(result.principal)}</span>
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

const CarbonAnalysisToolDetailPage = (_props: ToolDetailPageProps) => {
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
      setError("Saha alanı 0'dan büyük olmalıdır.");
      setResult(null);
      return;
    }
    if (!Number.isFinite(standingVolume) || standingVolume <= 0) {
      setError("Dikili servet değeri 0'dan büyük olmalıdır.");
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

      <div className="carbon-stock-layout">
        <article className="carbon-stock-info">
          <h1>Orman Ekosistemlerinde Karbon Stok Analizi</h1>
          <p>
            Bu araç, orman izin süreçlerinde talep edilen karbon stok analizini hızlı bir ön değerlendirme
            olarak sunar. Amenajman planı (Plan Özet No: 8) temelli yaklaşımla hesaplama adımları
            sadeleştirilmiştir.
          </p>

          <h2>Karbon Hesaplaması Neden Gereklidir?</h2>
          <p>
            Orman alanlarında yapılacak faaliyetlerin iklim etkisini ortaya koymak, iznin teknik
            fizibilitesini doğru okumak için gereklidir. Hesaplama; yalnızca ağaçları değil, ölü örtü ve
            toprak organik karbonunu da dikkate alır.
          </p>

          <h2>Hesaplamada Kullanılan Temel Havuzlar</h2>
          <ul>
            <li>
              <strong>Canlı Biyokütle:</strong> gövde, dal, yaprak ve kök sistemleri.
            </li>
            <li>
              <strong>Ölü Organik Madde:</strong> ölü odun ve ölü örtü tabakası.
            </li>
            <li>
              <strong>Toprak Karbonu:</strong> ekosistemdeki en büyük karbon havuzlarından biri.
            </li>
          </ul>
        </article>

        <aside className="carbon-stock-panel">
          <div className="carbon-stock-panel__head">
            <h2>Orman Karbon Stok Hesaplama Aracı</h2>
            <p>IPCC ve Ulusal Orman Envanteri Metodolojisi</p>
          </div>

          <div className="carbon-stock-panel__body">
            <div className="carbon-stock-panel__grid">
              <label>
                Saha Alanı (Hektar)
                <input
                  type="text"
                  inputMode="decimal"
                  value={areaHectareValue}
                  onChange={(event) => setAreaHectareValue(event.target.value)}
                />
              </label>

              <label>
                Dikili Servet (m³)
                <input
                  type="text"
                  inputMode="decimal"
                  value={standingVolumeValue}
                  onChange={(event) => setStandingVolumeValue(event.target.value)}
                />
              </label>

              <label>
                Ağaç Türü Grubu
                <select value={speciesGroup} onChange={(event) => setSpeciesGroup(event.target.value)}>
                  <option value="needleleaf">İbreli Orman</option>
                  <option value="broadleaf">Yapraklı Orman</option>
                  <option value="mixed">Karışık Orman</option>
                </select>
              </label>

              <label>
                Kapalılık Durumu
                <select value={closureClass} onChange={(event) => setClosureClass(event.target.value)}>
                  <option value="normal">Normal (%11-100)</option>
                  <option value="sparse">Boşluklu Kapalı (%1-10)</option>
                </select>
              </label>
            </div>

            <button type="button" className="carbon-stock-panel__button" onClick={handleCalculate}>
              STOK HESAPLA
            </button>

            {error ? <p className="carbon-stock-panel__error">{error}</p> : null}

            {result ? (
              <div className="carbon-stock-result">
                <span>Canlı Biyokütle Karbonu: {formatNumber(result.livingCarbon)} ton C</span>
                <span>Ölü Odun Karbonu: {formatNumber(result.deadWoodCarbon)} ton C</span>
                <span>Ölü Örtü Karbonu: {formatNumber(result.litterCarbon)} ton C</span>
                <span>Toprak Karbonu: {formatNumber(result.soilCarbon)} ton C</span>
                <span>Toplam Karbon Stoku: {formatNumber(result.totalCarbon)} ton C</span>
              </div>
            ) : null}

            <div className="carbon-stock-note">
              <h3>Hesaplama Aracının Bilimsel Temeli</h3>
              <ul>
                <li>Toprak üstü canlı biyokütle = DGH x hacim ağırlığı x genişletme katsayısı</li>
                <li>Toprak altı canlı biyokütle = Toprak üstü biyokütle x kök/gövde oranı</li>
                <li>Ölü odun = Toprak üstü canlı biyokütlenin %1&apos;i x 0.47</li>
                <li>Ölü örtü ve toprak karbonu tür grubuna göre hektar bazlı katsayıyla hesaplanır</li>
              </ul>
              <p>Not: Boşluklu kapalı alanlarda (%1-10) ölü örtü ve toprak karbonu 1/4 oranında alınmıştır.</p>
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
      setError("Ödenen bedel geçerli bir tutar olmalıdır.");
      setResult(null);
      return;
    }
    if (!dueDate || !newStartDate) {
      setError("Lütfen vade tarihi ve yeni izin başlangıç tarihini seçin.");
      setResult(null);
      return;
    }

    const due = new Date(dueDate);
    const start = new Date(newStartDate);
    if (Number.isNaN(due.getTime()) || Number.isNaN(start.getTime())) {
      setError("Tarih alanları geçersiz.");
      setResult(null);
      return;
    }

    const parsedTermDays = manualTerm ? Number.parseInt(termDaysValue, 10) : 365;
    if (!Number.isFinite(parsedTermDays) || parsedTermDays <= 0) {
      setError("Vade gün sayısı 1 veya daha büyük olmalıdır.");
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
          <h1>Orman İzin Mahsup İşlemleri Hakkında Bilgilendirme</h1>
          <p>
            Hazırladığımız <strong>Orman İzin Mükerrer Ödeme Hesaplayıcı</strong>, temdit (süre uzatımı),
            dönüşüm veya devir süreçlerinde oluşabilecek mükerrer ödemeleri önceden analiz etmeniz için
            tasarlandı.
          </p>

          <h2>Önemli Notlar</h2>
          <ul>
            <li>
              <strong>Tahmini Sonuçlar:</strong> bu araç matematiksel bir modelleme sunar ve tahmini sonuç üretir.
            </li>
            <li>
              <strong>Değişken Parametreler:</strong> birim bedel, Yİ-ÜFE, il katsayısı ve bölge uygulamaları
              nihai tutarı değiştirebilir.
            </li>
            <li>
              <strong>Resmi Geçerlilik:</strong> çıktılar resmi tahakkuk belgesi değildir; kesin tutar kurum
              kararlarına göre netleşir.
            </li>
          </ul>

          <blockquote>
            Tavsiye: Mahsup işlemlerine başlamadan önce bağlı bulunduğunuz orman idaresi birimlerinden güncel
            uygulama talimatlarını doğrulayın.
          </blockquote>
        </article>

        <aside className="temdit-panel">
          <div className="temdit-panel__head">
            <h2>{tool.title}</h2>
            <p>Mükerrer Gün ve Ödeme Hesaplama</p>
          </div>

          <div className="temdit-form">
            <div className="temdit-form__grid">
              <label>
                1. İzin Vade Tarihi
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </label>

              <label>
                Ödenen Bedel (TL)
                <input
                  type="text"
                  inputMode="decimal"
                  value={paidAmountValue}
                  onChange={(event) => setPaidAmountValue(event.target.value)}
                  placeholder="Örn: 50.000"
                />
              </label>
            </div>

            <label className="temdit-check">
              <input
                type="checkbox"
                checked={manualTerm}
                onChange={(event) => setManualTerm(event.target.checked)}
              />
              <span>Vade süresi 1 yıldan farklı (manuel gün gir)</span>
            </label>

            {manualTerm ? (
              <label>
                Vade Gün Sayısı
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
              2. (Yeni) İzin Başlangıç Tarihi
              <input type="date" value={newStartDate} onChange={(event) => setNewStartDate(event.target.value)} />
            </label>

            <button type="button" onClick={handleCalculate}>HESAPLA</button>

            {error ? <p className="temdit-error">{error}</p> : null}

            {result ? (
              <div className="temdit-result">
                <span>Vade Gün Sayısı: {result.termDays}</span>
                <span>Kalan Gün: {result.remainingDays}</span>
                <span>Günlük Bedel: {formatTry(result.dailyAmount)}</span>
                <span>Mahsup Tutarı: {formatTry(result.mahsupAmount)}</span>
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
  const [damgaRatePerThousandValue, setDamgaRatePerThousandValue] = useState<string>("9,48");
  const [noterRatePerThousandValue, setNoterRatePerThousandValue] = useState<string>("");
  const [pageUnitFeeValue, setPageUnitFeeValue] = useState<string>("");
  const [copyUnitFeeValue, setCopyUnitFeeValue] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{
    dayCount: number;
    yearRatio: number;
    matrah: number;
    damgaRatePerThousand: number;
    noterRatePerThousand: number;
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
    const damgaRatePerThousand = parseLocaleNumber(damgaRatePerThousandValue);
    const noterRatePerThousand = parseLocaleNumber(noterRatePerThousandValue);
    const pageUnitFee = parseLocaleNumber(pageUnitFeeValue);
    const copyUnitFee = parseLocaleNumber(copyUnitFeeValue);

    if (!startDate || !endDate) {
      setError("Lütfen izin başlangıç ve bitiş tarihlerini seçin.");
      setResult(null);
      return;
    }
    if (!Number.isFinite(annualFee) || annualFee <= 0) {
      setError("Yıllık arazi izin bedeli geçerli bir tutar olmalıdır.");
      setResult(null);
      return;
    }
    if (!Number.isFinite(pageCount) || pageCount <= 0 || !Number.isFinite(copyCount) || copyCount <= 0) {
      setError("Sayfa ve suret sayıları 1 veya daha büyük olmalıdır.");
      setResult(null);
      return;
    }
    if (
      !Number.isFinite(damgaRatePerThousand) ||
      !Number.isFinite(noterRatePerThousand) ||
      !Number.isFinite(pageUnitFee) ||
      !Number.isFinite(copyUnitFee)
    ) {
      setError("Damga/noter oranları ile maktu birim tutarları geçerli sayı olmalıdır.");
      setResult(null);
      return;
    }
    if (damgaRatePerThousand < 0 || noterRatePerThousand < 0 || pageUnitFee < 0 || copyUnitFee < 0) {
      setError("Oran ve birim tutar değerleri negatif olamaz.");
      setResult(null);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Tarih alanları geçersiz.");
      setResult(null);
      return;
    }
    if (end < start) {
      setError("İzin bitiş tarihi, izin başlangıç tarihinden önce olamaz.");
      setResult(null);
      return;
    }

    const diffMs = end.getTime() - start.getTime();
    const dayCount = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const yearRatio = dayCount / 365;
    const matrah = annualFee * yearRatio;
    const damgaTax = matrah * (damgaRatePerThousand / 1000);
    const noterFee = matrah * (noterRatePerThousand / 1000);
    const maktuCost = pageCount * pageUnitFee + copyCount * copyUnitFee;
    const vat = (noterFee + maktuCost) * 0.2;
    const total = damgaTax + noterFee + maktuCost + vat;

    setError("");
    setResult({
      dayCount,
      yearRatio,
      matrah,
      damgaRatePerThousand,
      noterRatePerThousand,
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
          <h1>Orman İzinlerinde Taahhüt Senedi Noter Masrafları ve Damga Vergisi Rehberi</h1>
          <p>
            Orman Genel Müdürlüğü&apos;nden alınan izinlerin kesinleşmesi sürecinde noter onaylı taahhüt
            senedi düzenlenir. Bu adımda oluşan noter masrafları ve damga vergisi, proje maliyetini doğrudan
            etkileyen kalemlerdendir.
          </p>

          <h2>Taahhüt Senedi Masrafları Nasıl Hesaplanır?</h2>
          <p>Hesaplama aşağıdaki kalemler üzerinden yapılır:</p>
          <ol>
            <li>
              <strong>Nispi Damga Vergisi:</strong> toplam taahhüt bedeli (matrah) üzerinden binde oran ile
              hesaplanır.
            </li>
            <li>
              <strong>Noter Harcı:</strong> matrah üzerinden nispi noterlik harcı oranı ile belirlenir.
            </li>
            <li>
              <strong>Maktu Giderler:</strong> sayfa ve suret başına güncel tarifeden alınan birim tutarlarla
              hesaplanır.
            </li>
            <li>
              <strong>KDV:</strong> noterlik hizmet kalemlerine %20 KDV uygulanır.
            </li>
          </ol>
          <p>
            Not: Noterlik harç oranı ve maktu birim tutarlar yıl içinde güncellenebildiği için, formdaki ilgili
            alanlara güncel resmi tarife değerlerini girmeniz gerekir.
          </p>
        </article>

        <aside className="noter-panel">
          <div className="noter-panel__head">
            <h2>{tool.title}</h2>
            <p>Güncel tarife girdileri ile dinamik hesaplama</p>
          </div>

          <div className="noter-form">
            <div className="noter-form__grid">
              <label>
                İzin Başlangıç
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </label>
              <label>
                İzin Bitiş
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </label>
            </div>

            <div className="noter-form__grid">
              <label>
                Sayfa Sayısı
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={pageCountValue}
                  onChange={(event) => setPageCountValue(event.target.value)}
                />
              </label>
              <label>
                Suret Sayısı
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
              Yıllık Arazi İzin Bedeli (TL)
              <input
                type="text"
                inputMode="decimal"
                value={annualFeeValue}
                onChange={(event) => setAnnualFeeValue(event.target.value)}
                placeholder="10.000,00 TL"
              />
            </label>

            <div className="noter-form__grid">
              <label>
                Damga Vergisi Oranı (binde)
                <input
                  type="text"
                  inputMode="decimal"
                  value={damgaRatePerThousandValue}
                  onChange={(event) => setDamgaRatePerThousandValue(event.target.value)}
                  placeholder="9,48"
                />
              </label>
              <label>
                Noter Harç Oranı (binde)
                <input
                  type="text"
                  inputMode="decimal"
                  value={noterRatePerThousandValue}
                  onChange={(event) => setNoterRatePerThousandValue(event.target.value)}
                  placeholder="Güncel oranı girin"
                />
              </label>
            </div>

            <div className="noter-form__grid">
              <label>
                Sayfa Başına Maktu (TL)
                <input
                  type="text"
                  inputMode="decimal"
                  value={pageUnitFeeValue}
                  onChange={(event) => setPageUnitFeeValue(event.target.value)}
                  placeholder="Güncel tarifeden"
                />
              </label>
              <label>
                Suret Başına Maktu (TL)
                <input
                  type="text"
                  inputMode="decimal"
                  value={copyUnitFeeValue}
                  onChange={(event) => setCopyUnitFeeValue(event.target.value)}
                  placeholder="Güncel tarifeden"
                />
              </label>
            </div>

            <button type="button" onClick={handleCalculate}>HESAPLA</button>

            {error ? <p className="noter-error">{error}</p> : null}

            {result ? (
              <div className="noter-result">
                <span>Süre: {result.dayCount} gün ({formatNumber(result.yearRatio)} yıl)</span>
                <span>Matrah: {formatTry(result.matrah)}</span>
                <span>Damga Vergisi (‰{formatNumber(result.damgaRatePerThousand)}): {formatTry(result.damgaTax)}</span>
                <span>Noter Harcı (‰{formatNumber(result.noterRatePerThousand)}): {formatTry(result.noterFee)}</span>
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
  const totalAreaM2 = useMemo(
    () => calculatedRows.reduce((sum, row) => sum + row.areaM2, 0),
    [calculatedRows],
  );

  const parsedAreaInput = parseLocaleNumber(areaValue);
  const canAddRow = Number.isFinite(parsedAreaInput) && parsedAreaInput > 0;

  const handleAddRow = () => {
    const areaM2 = parsedAreaInput;
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

  const handleClearRows = () => {
    setRows([]);
  };

  return (
    <section className="tool-detail tool-detail--pano">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="pano-layout">
        <article className="pano-info">
          <h2>Orman Alanlarında İletişim Panosu İzin Süreçleri</h2>
          <p>
            6831 sayılı Kanun kapsamında reklam ve ilan panoları için izin süreci; uygulama yılı birim
            bedeli, il katsayısı, pano türü artırım katsayısı ve kapalılık (K.EKO) parametreleriyle birlikte
            değerlendirilir.
          </p>

          <h3>Bedel Hesaplama ve Güncel Katsayılar</h3>
          <p>
            Hesaplama aracında önce uygulama yılı/hektar bedeli seçilir. Ardından il katsayısı ve pano türü
            katsayısı seçilerek m² bazlı tutar hesaplanır.
          </p>

          <h3>İzin Türü Katsayısı</h3>
          <p>
            Reklam ve ilan amaçlı pano izinlerinde baz katsayı 0.875 alınmış, pano teknik özelliklerine göre
            artırımlı katsayı seçenekleri eklenmiştir.
          </p>
        </article>

        <aside className="pano-panel">
          <div className="pano-panel__head">
            <h2>{tool.title}</h2>
            <p>OGM Mevzuatı ve Güncel Katsayı</p>
          </div>

          <div className="pano-panel__controls">
            <label>
              Uygulama Yılı (Hektar Bedeli)
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
              İl Katsayısı
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
              Pano Türü (Artırımlı)
              <select value={permitId} onChange={(event) => setPermitId(event.target.value)}>
                {PANO_PERMIT_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Yüzey Alanı (m²)
              <input
                type="text"
                inputMode="decimal"
                value={areaValue}
                onChange={(event) => setAreaValue(event.target.value)}
                placeholder="0,00"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canAddRow) {
                    event.preventDefault();
                    handleAddRow();
                  }
                }}
              />
            </label>

            <label>
              Kapalılık (K.EKO)
              <select value={closureId} onChange={(event) => setClosureId(event.target.value)}>
                {MINING_CLOSURE_LEVELS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {formatNumber(option.coefficient)} ({option.label})
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={handleAddRow} disabled={!canAddRow}>EKLE</button>
          </div>

          <div className="pano-table-wrap">
            <table className="pano-table">
              <thead>
                <tr>
                  <th>Pano Tanımı</th>
                  <th>Alan (m²)</th>
                  <th>K.Eko</th>
                  <th>Bedel</th>
                  <th>Sil</th>
                </tr>
              </thead>
              <tbody>
                {calculatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Henüz veri girilmedi.</td>
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
            <span>Kalem Sayısı: {calculatedRows.length}</span>
            <span>Toplam Alan: {formatAreaM2(totalAreaM2)} m²</span>
            <span>Toplam Tahmini Bedel: {formatTry(totalAmount)}</span>
            <button
              type="button"
              className="calc-action-btn calc-action-btn--muted"
              onClick={handleClearRows}
              disabled={calculatedRows.length === 0}
            >
              Tümünü Temizle
            </button>
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
      setError("Tutar alanı geçerli bir değer olmalıdır.");
      setResult(null);
      return;
    }
    if (startYear > targetYear) {
      setError("Başlangıç yılı hedef yıldan büyük olamaz.");
      setResult(null);
      return;
    }

    const appliedRates: Array<{ year: number; rate: number }> = [];
    let coefficient = 1;

    for (let year = startYear + 1; year <= targetYear; year += 1) {
      const rate = YDO_RATE_INDEX.get(year);
      if (typeof rate !== "number") {
        setError(`${year} yılı için YDO verisi bulunamadı.`);
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
          <h1>Yeniden Değerleme Oranı Bedel Hesaplama Rehberi</h1>
          <p>
            Ormancılık, maden ve enerji süreçlerinde eski bedellerin bugünkü karşılığını görmek için
            Yeniden Değerleme Oranı (YDO) katsayısı kullanılır. Bu araç, seçilen başlangıç yılından
            {` ${targetYear} `}yılına kadar olan kümülatif çarpanla güncel bedeli hesaplar.
          </p>
          <p>
            YDO; Vergi Usul Kanunu kapsamında Yİ-ÜFE ortalama fiyat artışını yansıtır ve birçok vergi/harç
            kaleminin yıllık güncellenmesinde referans olarak kullanılır.
          </p>

          <h2>Yeniden Değerleme Oranı Nedir?</h2>
          <p>
            YDO, bir önceki yıl ortalamalarına göre ilan edilen resmi artıştır. Gelecek yılların bedel
            projeksiyonunda her yıl için ilan edilen oranlar ardışık katsayı olarak çarpılır.
          </p>
        </article>

        <aside className="ydo-panel">
          <div className="ydo-panel__head">
            <h2>{tool.title}</h2>
            <p>
              Hedef Yıl: {targetYear} | Veri Aralığı: {earliestStartYear}-{targetYear}
            </p>
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
                Başlangıç Yılı
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
                <span>Kümülatif Katsayı: {formatNumber(result.coefficient)}</span>
                <span>Güncel Bedel ({targetYear}): {formatTry(result.updatedAmount)}</span>
                <span>Uygulanan Yıl Sayısı: {result.appliedRates.length}</span>
                <div className="ydo-rates">
                  {result.appliedRates.length === 0 ? (
                    <small>Başlangıç yılı hedef yıl ile aynı olduğu için çarpan uygulanmadı.</small>
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
            Bu panel ile KDV ayırma/ekleme işlemlerini anlık yapabilir, aynı ekranda iki farklı değer
            arasındaki yüzde değişimi hesaplayabilirsiniz. Finansal teklif, fatura ve maliyet analizlerinde
            hızlı ön kontrol sağlar.
          </p>
        </article>

        <aside className="finance-kdv">
          <div className="finance-kdv__head">
            <h2>{tool.title}</h2>
            <p>Hızlı ve Hassas Finansal Analiz</p>
          </div>

          <div className="finance-kdv__tabs">
            <button
              type="button"
              className={mode === "ayirma" ? "is-active" : ""}
              onClick={() => setMode("ayirma")}
            >
              KDV Ayırma
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
              <span>KDV Oranı (%)</span>
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
                  Diğer
                </button>
              </div>
              {ratePreset === "other" ? (
                <input
                  type="text"
                  inputMode="decimal"
                  value={customRateValue}
                  onChange={(event) => setCustomRateValue(event.target.value)}
                  placeholder="KDV oranını girin"
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
            <h2>Yüzde Değişim Hesaplama</h2>
            <p>Eski ve Yeni Değer Arasındaki Fark Analizi</p>
          </div>
          <div className="finance-percent__body">
            <div className="finance-percent__grid">
              <label>
                Eski Değer
                <input
                  type="text"
                  inputMode="decimal"
                  value={oldValue}
                  onChange={(event) => setOldValue(event.target.value)}
                />
              </label>
              <label>
                Yeni Değer
                <input
                  type="text"
                  inputMode="decimal"
                  value={newValue}
                  onChange={(event) => setNewValue(event.target.value)}
                />
              </label>
            </div>

            <div className="finance-percent__result">
              <small>Hesaplanan Değişim Oranı</small>
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
          <h2>Hızlı Analiz Rehberi</h2>
          <p>
            KDV ayırma/ekleme işlemiyle yüzde değişim panelini birlikte kullanarak teklif revizyonu, fatura
            kontrolü, maliyet artışı veya indirim etkisini aynı ekranda görebilirsiniz.
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
      "BagimsizAlan1\tÖngörülen Santral Sahası\t1\t355962.818\t4328976.270\t39",
      "BagimsizAlan1\tÖngörülen Santral Sahası\t2\t355806.903\t4328040.746\t39",
      "BagimsizAlan1\tÖngörülen Santral Sahası\t3\t355332.082\t4328285.586\t39",
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
      setStatus("Geçerli formatta satır bulunamadı. Sütun sırasını kontrol edin.");
      return;
    }
    setStatus(`${areaCount} alan için ${parsedRows.length} nokta hazırlandı.`);
  };

  const handleDownloadKml = () => {
    if (parsedRows.length === 0) {
      setStatus("KML oluşturmak için önce geçerli satırlar girin.");
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
            <description>Tür: ${orderedRows[0]?.itemType ?? "-"}</description>
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

    setStatus(`${areaCount} alan için KML dosyası indirildi.`);
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
          <h1>Nasıl Kullanılır?</h1>
          <ol>
            <li>Verileri Hazırlayın: Alan Adi, Tür, Sıra No, Y(E), X(N), DOM sırasıyla kopyalayın.</li>
            <li>Yapıştırın: Satırları paneldeki metin alanına ekleyin.</li>
            <li>Haritada Kontrol Edin: Haritada Göster ile satırların işlenmesini doğrulayın.</li>
            <li>Opsiyonel Noktalar: Nokta placemarklarını dahil etmek için seçeneği açın.</li>
            <li>KML Olarak İndir: KML dosyasını indirip kurum dosyasına ekleyin.</li>
          </ol>

          <h2>Önemli Notlar</h2>
          <ul>
            <li>
              <strong>Sütun Sırası:</strong> Alan Adi | Tür | No | Y | X | DOM
            </li>
            <li>
              <strong>DOM:</strong> Dönüşüm için bölge değeri (Örn: 27, 30, 33, 36, 39, 42, 45) gerekli.
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
            <span>Sütun Sırası: Alan Adi | Tur | No | Y (E) | X (N) | DOM</span>
            <label>
              <input
                type="checkbox"
                checked={showPoints}
                onChange={(event) => setShowPoints(event.target.checked)}
              />
              KML&apos;de Noktalari Göster
            </label>
          </div>

          <textarea
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder="Örnek format (her satır: AlanAdi Tür No Y X DOM)"
          />

          <div className="epdk-actions">
            <button type="button" className="epdk-btn epdk-btn--blue" onClick={handlePreview}>
              HARİTADA GÖSTER
            </button>
            <button type="button" className="epdk-btn epdk-btn--green" onClick={handleDownloadKml}>
              KML OLARAK İNDİR
            </button>
            <button type="button" className="epdk-btn epdk-btn--gray" onClick={handleClear}>
              TEMİZLE
            </button>
          </div>

          <p className="epdk-status">{status || "Hazır."}</p>
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
      setStatus("Geçerli koordinat bulunamadı. Örnek: 464801 4334415");
      return;
    }

    const converted = utmToLatLon(parsed.easting, parsed.northing, dom);
    if (!Number.isFinite(converted.lat) || !Number.isFinite(converted.lon)) {
      setStatus("Koordinat dönüşümü başarısız. DOM değerini kontrol edin.");
      return;
    }

    const label =
      photoNo.trim().length > 0
        ? photoNo.trim()
        : photoFile?.name
          ? photoFile.name
          : `Fotoğraf-${rows.length + 1}`;

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
    setStatus(`Kayıt eklendi. Toplam ${rows.length + 1} satır.`);
  };

  const handleDownloadRow = (row: PhotoCoordRow) => {
    if (!row.file) {
      setStatus("İndirme için bu satıra bir fotoğraf dosyası eklenmemiş.");
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
    setStatus("Kayıt listeden silindi.");
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
            <h2>1. Sistem &amp; DOM Seçimi</h2>
            <label>
              Koordinat Sistemi
              <select value={coordSystem} onChange={(event) => setCoordSystem(event.target.value)}>
                <option value="ed50-6-utm">ED50 (6 Derece UTM)</option>
              </select>
            </label>

            <div className="photo-coord-dom">
              <span>Seçili DOM:</span>
              <input
                type="number"
                min={27}
                max={45}
                step={1}
                value={dom}
                onChange={(event) => handleDomChange(event.target.value)}
              />
              <small>(Haritaya tiklayarak değişir)</small>
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
            <h2>3. Fotoğraf Girisi</h2>
            <label className="photo-coord-file">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} />
              <span>{photoFile ? photoFile.name : "Dosya seçilmedi"}</span>
            </label>

            <input
              type="text"
              value={photoNo}
              onChange={(event) => setPhotoNo(event.target.value)}
              placeholder="Fotoğraf No"
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
          <h2>Saha Kayıt Listesi</h2>
          <div className="photo-coord-table-wrap">
            <table className="photo-coord-table">
              <thead>
                <tr>
                  <th>Fotoğraf</th>
                  <th>Koordinat (Y/X)</th>
                  <th>İndir</th>
                  <th>Sil</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Henüz kayit bulunmuyor.</td>
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
                          İNDİR
                        </button>
                      </td>
                      <td>
                        <button type="button" onClick={() => handleDeleteRow(row.id)}>
                          SİL
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
  const [status, setStatus] = useState<string>("Fotoğraf seçilmedi.");
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
      setStatus("Görsel yüklenemedi. Lütfen farklı bir dosya deneyin.");
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
      ctx.fillText("Onizleme Alanı", previewWidth / 2, previewHeight / 2);
    }

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(guideX, guideY, guideWidth, guideHeight);
  }, [loadedImage, targetWidthValue, targetHeightValue, zoom]);

  const applyFiles = (incoming: File[]) => {
    const selected = incoming.find((file) => file.type.startsWith("image/"));
    if (!selected) {
      setStatus("Lütfen geçerli bir fotoğraf dosyası seçin.");
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
      setStatus("İndirme için önce bir fotoğraf seçin.");
      return;
    }

    const target = getTargetSize();
    const source = calculateSourceRect(loadedImage, target.width, target.height, zoom);
    const output = document.createElement("canvas");
    output.width = Math.max(1, Math.round(target.width));
    output.height = Math.max(1, Math.round(target.height));
    const outCtx = output.getContext("2d");
    if (!outCtx) {
      setStatus("Çıktı oluşturulamadı.");
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
        setStatus("Dosya oluşturulamadı.");
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
      setStatus("Kırpılmış görsel indirildi.");
    }, "image/png");
  };

  return (
    <section className="tool-detail tool-detail--photocrop">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>

      <div className="photocrop-shell">
        <header className="photocrop-head">
          <span>✂</span>
          <h1>{tool.title}</h1>
          <p>Hızlı, optimize edilmiş ve merkezleme asistanlı düzenleyici.</p>
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
              1. Fotoğraf Yükle
              <input type="file" accept="image/*" onChange={handleFileChange} />
              <span>Fotoğraf Seç veya Sürükle Bırak</span>
            </label>

            <label>
              2. Boyut Şablonu
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
                Genişlik
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetWidthValue}
                  onChange={(event) => setTargetWidthValue(event.target.value)}
                />
              </label>
              <label>
                Yükseklik
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetHeightValue}
                  onChange={(event) => setTargetHeightValue(event.target.value)}
                />
              </label>
            </div>

            <label className="photocrop-zoom">
              3. Yakınlaştır <strong>{Math.round(zoom * 100)}%</strong>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => setZoom(Number.parseFloat(event.target.value))}
              />
            </label>

            <button type="button" onClick={handleDownload}>Görseli İndir</button>
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
          <h2>Fidan Dikim Adedi ve Arazi Planlaması Hakkında</h2>
          <p>
            Fidan dikim planında toplam alan, sınır payı, sıra arası ve sıra üzeri mesafeler birlikte
            değerlendirilmelidir. Araç, bu parametrelere göre yaklaşık fidan ihtiyacını hızlı hesaplar.
          </p>
          <p>
            Sınır payı, parselin kenar bölgesindeki emniyet şeridini temsil eder. Bu boşluk fidan dikim
            alanından düşülür.
          </p>
        </article>

        <aside className="fidan-card fidan-card--seedling">
          <div className="fidan-card__head">
            <h2>{tool.title}</h2>
            <p>Sınır Boşluğu ve Alan Analizi</p>
          </div>
          <div className="fidan-card__body">
            <label>
              Toplam Arazi Alanı (m²)
              <input
                type="text"
                inputMode="decimal"
                value={totalAreaValue}
                onChange={(event) => setTotalAreaValue(event.target.value)}
              />
            </label>
            <label>
              Sınır Payı / Kenar Boşluğu (metre)
              <input
                type="text"
                inputMode="decimal"
                value={borderGapValue}
                onChange={(event) => setBorderGapValue(event.target.value)}
              />
            </label>
            <div className="fidan-card__grid">
              <label>
                Sıra Arası (m)
                <input
                  type="text"
                  inputMode="decimal"
                  value={rowSpacingValue}
                  onChange={(event) => setRowSpacingValue(event.target.value)}
                />
              </label>
              <label>
                Sıra Üzeri (m)
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
                <span>Net Dikim Alanı: {formatAreaM2(fidanResult.effectiveArea)} m²</span>
                <span>Tahmini Fidan Adedi: {fidanResult.seedlingCount.toLocaleString("tr-TR")}</span>
              </div>
            ) : null}
          </div>
        </aside>

        <aside className="fidan-card fidan-card--fence">
          <div className="fidan-card__head">
            <h2>Çit ve Kazık Hesaplama Aracı</h2>
            <p>Arazi Çevreleme ve Malzeme Analizi</p>
          </div>
          <div className="fidan-card__body">
            <label>
              Toplam Çevre veya Tel Uzunluğu (Metre)
              <input
                type="text"
                inputMode="decimal"
                value={fenceLengthValue}
                onChange={(event) => setFenceLengthValue(event.target.value)}
              />
            </label>
            <label>
              Kazık Aralık Mesafesi (Metre)
              <input
                type="text"
                inputMode="decimal"
                value={stakeSpacingValue}
                onChange={(event) => setStakeSpacingValue(event.target.value)}
              />
            </label>
            <label>
              Çekilecek Tel Sıra Sayısı
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
                <span>Gerekli Kazık Adedi: {fenceResult.postCount.toLocaleString("tr-TR")}</span>
                <span>Toplam Tel Uzunluğu: {formatAreaM2(fenceResult.wireLength)} m</span>
                <span>+%10 Paylı Tel: {formatAreaM2(fenceResult.suggestedWireLength)} m</span>
              </div>
            ) : null}
          </div>
        </aside>

        <article className="fidan-note">
          <h2>Çit Kurulumu ve Malzeme Planlaması Hakkında</h2>
          <p>
            Çevreleme analizinde toplam uzunluk, kazık aralığı ve tel sıra sayısı birlikte ele alınmalıdır.
            Arazi eğimi ve kapı geçişleri gibi sahaya özel detaylar, uygulama öncesi ayrıca kontrol edilmelidir.
          </p>
        </article>
      </div>
    </section>
  );
};

const AgaclandirmaButceToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [areaHectareValue, setAreaHectareValue] = useState<string>("10");
  const [seedlingsPerHectareValue, setSeedlingsPerHectareValue] = useState<string>("1666");
  const [lossRatePercentValue, setLossRatePercentValue] = useState<string>("10");
  const [seedlingUnitPriceValue, setSeedlingUnitPriceValue] = useState<string>("");
  const [plantingLaborPerSeedlingValue, setPlantingLaborPerSeedlingValue] = useState<string>("");
  const [maintenanceYearsValue, setMaintenanceYearsValue] = useState<string>("3");
  const [maintenancePerHectarePerYearValue, setMaintenancePerHectarePerYearValue] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{
    totalSeedlings: number;
    seedlingCost: number;
    plantingLaborCost: number;
    maintenanceCost: number;
    subtotal: number;
    vat: number;
    total: number;
  } | null>(null);

  const handleReset = () => {
    setAreaHectareValue("10");
    setSeedlingsPerHectareValue("1666");
    setLossRatePercentValue("10");
    setSeedlingUnitPriceValue("");
    setPlantingLaborPerSeedlingValue("");
    setMaintenanceYearsValue("3");
    setMaintenancePerHectarePerYearValue("");
    setError("");
    setResult(null);
  };

  const handleCalculate = () => {
    const areaHectare = parseLocaleNumber(areaHectareValue);
    const seedlingsPerHectare = parseLocaleNumber(seedlingsPerHectareValue);
    const lossRatePercent = parseLocaleNumber(lossRatePercentValue);
    const seedlingUnitPrice = parseLocaleNumber(seedlingUnitPriceValue);
    const plantingLaborPerSeedling = parseLocaleNumber(plantingLaborPerSeedlingValue);
    const maintenanceYears = Number.parseInt(maintenanceYearsValue, 10);
    const maintenancePerHectarePerYear = parseLocaleNumber(maintenancePerHectarePerYearValue);

    if (
      !Number.isFinite(areaHectare) ||
      !Number.isFinite(seedlingsPerHectare) ||
      !Number.isFinite(lossRatePercent) ||
      !Number.isFinite(seedlingUnitPrice) ||
      !Number.isFinite(plantingLaborPerSeedling) ||
      !Number.isFinite(maintenanceYears) ||
      !Number.isFinite(maintenancePerHectarePerYear)
    ) {
      setError("Lütfen tüm alanlara geçerli sayısal değer girin.");
      setResult(null);
      return;
    }

    if (
      areaHectare <= 0 ||
      seedlingsPerHectare <= 0 ||
      seedlingUnitPrice <= 0 ||
      plantingLaborPerSeedling <= 0 ||
      maintenanceYears <= 0 ||
      maintenancePerHectarePerYear <= 0
    ) {
      setError("Alan, adet, birim fiyat ve yıl değerleri sıfırdan büyük olmalıdır.");
      setResult(null);
      return;
    }

    if (lossRatePercent < 0 || lossRatePercent > 90) {
      setError("Kayıp oranı %0 ile %90 arasında olmalıdır.");
      setResult(null);
      return;
    }

    const totalSeedlings = Math.ceil(areaHectare * seedlingsPerHectare * (1 + lossRatePercent / 100));
    const seedlingCost = totalSeedlings * seedlingUnitPrice;
    const plantingLaborCost = totalSeedlings * plantingLaborPerSeedling;
    const maintenanceCost = areaHectare * maintenancePerHectarePerYear * maintenanceYears;
    const subtotal = seedlingCost + plantingLaborCost + maintenanceCost;
    const vat = subtotal * 0.2;
    const total = subtotal + vat;

    setError("");
    setResult({
      totalSeedlings,
      seedlingCost,
      plantingLaborCost,
      maintenanceCost,
      subtotal,
      vat,
      total,
    });
  };

  return (
    <section className="tool-detail tool-detail--afforestation-budget">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>
      <div className="tool-detail__layout">
        <article className="tool-detail__content">
          <h1>Ağaçlandırma Bütçe Planlaması Nasıl Yapılır?</h1>
          <p>
            Ağaçlandırma projelerinde toplam maliyet; fidan adedi, dikim işçiliği ve çok yıllı bakım giderlerinden
            oluşur. Bu panel, tüm kalemleri tek akışta hesaplayarak teklif ve uygulama bütçesini hızlandırır.
          </p>
          <p>
            Birim fiyat alanları varsayılan sabit değer içermez. Resmi kurum fiyatları, ihale birim fiyatları veya
            güncel sözleşme bedellerinizi doğrudan girerek hesaplama yapın.
          </p>

          <h2>Hesaplama Kapsamı</h2>
          <ol>
            <li>
              <strong>Fidan Adedi:</strong> hektar alan, hektar başı dikim yoğunluğu ve kayıp oranı dikkate alınır.
            </li>
            <li>
              <strong>Dikim Maliyeti:</strong> toplam fidan adedi üzerinden birim fidan + birim işçilik tutarı
              çarpılır.
            </li>
            <li>
              <strong>Bakım Maliyeti:</strong> yıllık bakım bedeli, alan ve bakım yılı ile projelendirilir.
            </li>
            <li>
              <strong>Genel Toplam:</strong> ara toplam + KDV ile nihai bütçe görülür.
            </li>
          </ol>
        </article>

        <aside className="tool-calc aff-budget-calc">
          <div className="tool-calc__head">
            <h2>{tool.title}</h2>
            <p>Fidan + işçilik + bakım bütçesini güncel resmi birim fiyatlarla hesaplayın.</p>
          </div>

          <div className="tool-calc__controls aff-budget-calc__controls">
            <label>
              Proje Alanı (ha)
              <input type="text" inputMode="decimal" value={areaHectareValue} onChange={(event) => setAreaHectareValue(event.target.value)} />
            </label>
            <label>
              Hektar Başına Fidan (adet)
              <input type="text" inputMode="decimal" value={seedlingsPerHectareValue} onChange={(event) => setSeedlingsPerHectareValue(event.target.value)} />
            </label>
            <label>
              Kayıp Oranı (%)
              <input type="text" inputMode="decimal" value={lossRatePercentValue} onChange={(event) => setLossRatePercentValue(event.target.value)} />
            </label>
            <label>
              Birim Fidan Bedeli (TL/adet)
              <input
                type="text"
                inputMode="decimal"
                value={seedlingUnitPriceValue}
                onChange={(event) => setSeedlingUnitPriceValue(event.target.value)}
                placeholder="Güncel resmi birim fiyat"
              />
            </label>
            <label>
              Dikim İşçilik Bedeli (TL/adet)
              <input
                type="text"
                inputMode="decimal"
                value={plantingLaborPerSeedlingValue}
                onChange={(event) => setPlantingLaborPerSeedlingValue(event.target.value)}
                placeholder="Güncel ihale/birim fiyat"
              />
            </label>
            <label>
              Bakım Süresi (yıl)
              <input type="number" min={1} step={1} value={maintenanceYearsValue} onChange={(event) => setMaintenanceYearsValue(event.target.value)} />
            </label>
            <label>
              Yıllık Bakım Bedeli (TL/ha)
              <input
                type="text"
                inputMode="decimal"
                value={maintenancePerHectarePerYearValue}
                onChange={(event) => setMaintenancePerHectarePerYearValue(event.target.value)}
                placeholder="Güncel resmi birim fiyat"
              />
            </label>
          </div>

          <div className="tool-calc__summary aff-budget-calc__actions">
            <button type="button" onClick={handleCalculate}>HESAPLA</button>
            <button type="button" className="calc-action-btn calc-action-btn--muted" onClick={handleReset}>
              SIFIRLA
            </button>
          </div>

          {error ? <p className="kist-calc__error">{error}</p> : null}

          {result ? (
            <div className="tool-calc__summary aff-budget-calc__summary">
              <span>Toplam Fidan: {result.totalSeedlings.toLocaleString("tr-TR")} adet</span>
              <span>Fidan Bedeli: {formatTry(result.seedlingCost)}</span>
              <span>Dikim İşçiliği: {formatTry(result.plantingLaborCost)}</span>
              <span>Bakım Bedeli: {formatTry(result.maintenanceCost)}</span>
              <span>Ara Toplam: {formatTry(result.subtotal)}</span>
              <span>KDV (%20): {formatTry(result.vat)}</span>
              <span>Genel Toplam: {formatTry(result.total)}</span>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
};

const OrmanYoluMetrajToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [roadLengthKmValue, setRoadLengthKmValue] = useState<string>("3,5");
  const [platformWidthValue, setPlatformWidthValue] = useState<string>("6");
  const [cutDepthValue, setCutDepthValue] = useState<string>("0,8");
  const [fillDepthValue, setFillDepthValue] = useState<string>("0,5");
  const [stabilizeThicknessCmValue, setStabilizeThicknessCmValue] = useState<string>("15");
  const [cutUnitCostValue, setCutUnitCostValue] = useState<string>("");
  const [fillUnitCostValue, setFillUnitCostValue] = useState<string>("");
  const [stabilizeUnitCostValue, setStabilizeUnitCostValue] = useState<string>("");
  const [overheadPercentValue, setOverheadPercentValue] = useState<string>("0");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{
    planAreaM2: number;
    cutVolumeM3: number;
    fillVolumeM3: number;
    stabilizeVolumeM3: number;
    cutCost: number;
    fillCost: number;
    stabilizeCost: number;
    overheadCost: number;
    totalCost: number;
  } | null>(null);

  const handleReset = () => {
    setRoadLengthKmValue("3,5");
    setPlatformWidthValue("6");
    setCutDepthValue("0,8");
    setFillDepthValue("0,5");
    setStabilizeThicknessCmValue("15");
    setCutUnitCostValue("");
    setFillUnitCostValue("");
    setStabilizeUnitCostValue("");
    setOverheadPercentValue("0");
    setError("");
    setResult(null);
  };

  const handleCalculate = () => {
    const roadLengthKm = parseLocaleNumber(roadLengthKmValue);
    const platformWidth = parseLocaleNumber(platformWidthValue);
    const cutDepth = parseLocaleNumber(cutDepthValue);
    const fillDepth = parseLocaleNumber(fillDepthValue);
    const stabilizeThicknessCm = parseLocaleNumber(stabilizeThicknessCmValue);
    const cutUnitCost = parseLocaleNumber(cutUnitCostValue);
    const fillUnitCost = parseLocaleNumber(fillUnitCostValue);
    const stabilizeUnitCost = parseLocaleNumber(stabilizeUnitCostValue);
    const overheadPercent = parseLocaleNumber(overheadPercentValue);

    if (
      !Number.isFinite(roadLengthKm) ||
      !Number.isFinite(platformWidth) ||
      !Number.isFinite(cutDepth) ||
      !Number.isFinite(fillDepth) ||
      !Number.isFinite(stabilizeThicknessCm) ||
      !Number.isFinite(cutUnitCost) ||
      !Number.isFinite(fillUnitCost) ||
      !Number.isFinite(stabilizeUnitCost) ||
      !Number.isFinite(overheadPercent)
    ) {
      setError("Lütfen tüm alanlara geçerli sayısal değer girin.");
      setResult(null);
      return;
    }

    if (
      roadLengthKm <= 0 ||
      platformWidth <= 0 ||
      cutDepth < 0 ||
      fillDepth < 0 ||
      stabilizeThicknessCm <= 0 ||
      cutUnitCost < 0 ||
      fillUnitCost < 0 ||
      stabilizeUnitCost < 0 ||
      overheadPercent < 0 ||
      overheadPercent > 100
    ) {
      setError("Uzunluk/genişlik/kalınlık pozitif; ek pay oranı %0-%100 arasında olmalıdır.");
      setResult(null);
      return;
    }

    const roadLengthM = roadLengthKm * 1000;
    const planAreaM2 = roadLengthM * platformWidth;
    const cutVolumeM3 = planAreaM2 * cutDepth;
    const fillVolumeM3 = planAreaM2 * fillDepth;
    const stabilizeVolumeM3 = planAreaM2 * (stabilizeThicknessCm / 100);

    const cutCost = cutVolumeM3 * cutUnitCost;
    const fillCost = fillVolumeM3 * fillUnitCost;
    const stabilizeCost = stabilizeVolumeM3 * stabilizeUnitCost;
    const baseCost = cutCost + fillCost + stabilizeCost;
    const overheadCost = baseCost * (overheadPercent / 100);
    const totalCost = baseCost + overheadCost;

    setError("");
    setResult({
      planAreaM2,
      cutVolumeM3,
      fillVolumeM3,
      stabilizeVolumeM3,
      cutCost,
      fillCost,
      stabilizeCost,
      overheadCost,
      totalCost,
    });
  };

  return (
    <section className="tool-detail tool-detail--forest-road">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>
      <div className="tool-detail__layout">
        <article className="tool-detail__content">
          <h1>Orman Yolu Metraj ve Keşif Hesabı</h1>
          <p>
            Yol platformu için kazı, dolgu ve stabilize kalemlerini aynı modelde görmek; saha üretim planı,
            makine ekipman kapasitesi ve yaklaşık maliyet hesapları için kritik önem taşır.
          </p>
          <p>
            Birim fiyat alanlarına resmi poz numarası karşılığı güncel maliyetleri girerek keşif oluşturun.
            Hesaplama modeli sabittir, birim maliyet verisi kullanıcı tarafından belirlenir.
          </p>

          <h2>Hesaplama Modeli</h2>
          <ol>
            <li>
              <strong>Plan Alanı:</strong> yol uzunluğu (m) x platform genişliği (m)
            </li>
            <li>
              <strong>Kazı / Dolgu Hacmi:</strong> plan alanı x ortalama derinlik
            </li>
            <li>
              <strong>Stabilize Hacmi:</strong> plan alanı x stabilize kalınlığı
            </li>
            <li>
              <strong>Toplam Keşif:</strong> birim fiyatlı kalemlerin toplamı + yardımcı işler payı
            </li>
          </ol>
        </article>

        <aside className="tool-calc forest-road-calc">
          <div className="tool-calc__head">
            <h2>{tool.title}</h2>
            <p>Kazı, dolgu ve stabilize metrajını güncel birim fiyatlarla maliyete dönüştürün.</p>
          </div>

          <div className="tool-calc__controls forest-road-calc__controls">
            <label>
              Yol Uzunluğu (km)
              <input type="text" inputMode="decimal" value={roadLengthKmValue} onChange={(event) => setRoadLengthKmValue(event.target.value)} />
            </label>
            <label>
              Platform Genişliği (m)
              <input type="text" inputMode="decimal" value={platformWidthValue} onChange={(event) => setPlatformWidthValue(event.target.value)} />
            </label>
            <label>
              Ortalama Kazı Derinliği (m)
              <input type="text" inputMode="decimal" value={cutDepthValue} onChange={(event) => setCutDepthValue(event.target.value)} />
            </label>
            <label>
              Ortalama Dolgu Derinliği (m)
              <input type="text" inputMode="decimal" value={fillDepthValue} onChange={(event) => setFillDepthValue(event.target.value)} />
            </label>
            <label>
              Stabilize Kalınlığı (cm)
              <input
                type="text"
                inputMode="decimal"
                value={stabilizeThicknessCmValue}
                onChange={(event) => setStabilizeThicknessCmValue(event.target.value)}
              />
            </label>
            <label>
              Kazı Birim Fiyatı (TL/m³)
              <input
                type="text"
                inputMode="decimal"
                value={cutUnitCostValue}
                onChange={(event) => setCutUnitCostValue(event.target.value)}
                placeholder="Güncel resmi birim fiyat"
              />
            </label>
            <label>
              Dolgu Birim Fiyatı (TL/m³)
              <input
                type="text"
                inputMode="decimal"
                value={fillUnitCostValue}
                onChange={(event) => setFillUnitCostValue(event.target.value)}
                placeholder="Güncel resmi birim fiyat"
              />
            </label>
            <label>
              Stabilize Birim Fiyatı (TL/m³)
              <input
                type="text"
                inputMode="decimal"
                value={stabilizeUnitCostValue}
                onChange={(event) => setStabilizeUnitCostValue(event.target.value)}
                placeholder="Güncel resmi birim fiyat"
              />
            </label>
            <label>
              Yardımcı İşler Ek Payı (%)
              <input
                type="text"
                inputMode="decimal"
                value={overheadPercentValue}
                onChange={(event) => setOverheadPercentValue(event.target.value)}
                placeholder="0"
              />
            </label>
          </div>

          <div className="tool-calc__summary forest-road-calc__actions">
            <button type="button" onClick={handleCalculate}>HESAPLA</button>
            <button type="button" className="calc-action-btn calc-action-btn--muted" onClick={handleReset}>
              SIFIRLA
            </button>
          </div>

          {error ? <p className="kist-calc__error">{error}</p> : null}

          {result ? (
            <div className="tool-calc__summary forest-road-calc__summary">
              <span>Plan Alanı: {formatAreaM2(result.planAreaM2)} m²</span>
              <span>Kazı Hacmi: {formatAreaM2(result.cutVolumeM3)} m³</span>
              <span>Dolgu Hacmi: {formatAreaM2(result.fillVolumeM3)} m³</span>
              <span>Stabilize Hacmi: {formatAreaM2(result.stabilizeVolumeM3)} m³</span>
              <span>Kazı Maliyeti: {formatTry(result.cutCost)}</span>
              <span>Dolgu Maliyeti: {formatTry(result.fillCost)}</span>
              <span>Stabilize Maliyeti: {formatTry(result.stabilizeCost)}</span>
              <span>Yardımcı İşler Payı: {formatTry(result.overheadCost)}</span>
              <span>Genel Toplam: {formatTry(result.totalCost)}</span>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
};

const IlKatsayiKarsilastirmaToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [applicationYear, setApplicationYear] = useState<number>(MINING_APPLICATION_YEARS[0].year);
  const [permitId, setPermitId] = useState<string>(MINING_PERMIT_TYPES[1].id);
  const [closureId, setClosureId] = useState<string>(MINING_CLOSURE_LEVELS[2].id);
  const [provinceA, setProvinceA] = useState<string>(MINING_PROVINCES[0]?.name ?? "Ankara");
  const [provinceB, setProvinceB] = useState<string>(
    MINING_PROVINCES.find((item) => item.name === "İstanbul")?.name ?? MINING_PROVINCES[1]?.name ?? "İzmir",
  );
  const [areaValue, setAreaValue] = useState<string>("10000");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{
    areaM2: number;
    permitLabel: string;
    closureLabel: string;
    unitPricePerM2: number;
    landAmountA: number;
    landAmountB: number;
    afforestationAmount: number;
    totalAmountA: number;
    totalAmountB: number;
    deltaAmount: number;
    deltaPercent: number;
  } | null>(null);

  const handleCalculate = () => {
    const areaM2 = parseLocaleNumber(areaValue);
    if (!Number.isFinite(areaM2) || areaM2 <= 0) {
      setError("Alan (m²) değeri sıfırdan büyük olmalıdır.");
      setResult(null);
      return;
    }

    const selectedYear = MINING_YEAR_INDEX.get(applicationYear) ?? MINING_APPLICATION_YEARS[0];
    const permit = MINING_PERMIT_INDEX.get(permitId) ?? MINING_PERMIT_TYPES[0];
    const closure = MINING_CLOSURE_INDEX.get(closureId) ?? MINING_CLOSURE_LEVELS[0];
    const provinceCoefficientA = MINING_PROVINCE_INDEX.get(provinceA);
    const provinceCoefficientB = MINING_PROVINCE_INDEX.get(provinceB);

    if (typeof provinceCoefficientA !== "number" || typeof provinceCoefficientB !== "number") {
      setError("Seçilen il katsayıları bulunamadı.");
      setResult(null);
      return;
    }

    const unitPricePerM2 = selectedYear.afforestationPerHectare / M2_PER_HECTARE;
    const afforestationAmount = areaM2 * unitPricePerM2;

    const landAmountA = areaM2 * unitPricePerM2 * permit.coefficient * closure.coefficient * provinceCoefficientA;
    const landAmountB = areaM2 * unitPricePerM2 * permit.coefficient * closure.coefficient * provinceCoefficientB;

    const totalAmountA = landAmountA + afforestationAmount;
    const totalAmountB = landAmountB + afforestationAmount;

    const deltaAmount = totalAmountB - totalAmountA;
    const denominator = totalAmountA === 0 ? 1 : totalAmountA;
    const deltaPercent = (deltaAmount / denominator) * 100;

    setError("");
    setResult({
      areaM2,
      permitLabel: permit.label,
      closureLabel: closure.label,
      unitPricePerM2,
      landAmountA,
      landAmountB,
      afforestationAmount,
      totalAmountA,
      totalAmountB,
      deltaAmount,
      deltaPercent,
    });
  };

  const handleReset = () => {
    setApplicationYear(MINING_APPLICATION_YEARS[0].year);
    setPermitId(MINING_PERMIT_TYPES[1].id);
    setClosureId(MINING_CLOSURE_LEVELS[2].id);
    setProvinceA(MINING_PROVINCES[0]?.name ?? "Ankara");
    setProvinceB(MINING_PROVINCES.find((item) => item.name === "İstanbul")?.name ?? MINING_PROVINCES[1]?.name ?? "İzmir");
    setAreaValue("10000");
    setError("");
    setResult(null);
  };

  return (
    <section className="tool-detail tool-detail--province-compare">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>
      <div className="tool-detail__layout">
        <article className="tool-detail__content">
          <h1>İl Katsayısı Karşılaştırması</h1>
          <p>
            Ek-3 il katsayıları aynı izin senaryosunda önemli tutar farkı oluşturur. Bu araçta aynı alan, yıl,
            izin türü ve kapalılık için iki il doğrudan kıyaslanır.
          </p>

          <h2>Model</h2>
          <ol>
            <li>
              <strong>Arazi İzin Bedeli:</strong> alan x yıl birim bedeli x izin katsayısı x kapalılık x il katsayısı
            </li>
            <li>
              <strong>Ağaçlandırma Bedeli:</strong> alan x yıl birim bedeli
            </li>
            <li>
              <strong>Genel Toplam:</strong> arazi izin bedeli + ağaçlandırma bedeli
            </li>
          </ol>
        </article>

        <aside className="tool-calc province-compare-calc">
          <div className="tool-calc__head">
            <h2>{tool.title}</h2>
            <p>Ek-3 il katsayılarının toplam bedel etkisini resmi verilerle karşılaştırın.</p>
          </div>

          <div className="tool-calc__controls">
            <label>
              Uygulama Yılı
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
              İzin Türü
              <select value={permitId} onChange={(event) => setPermitId(event.target.value)}>
                {MINING_PERMIT_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Kapalılık
              <select value={closureId} onChange={(event) => setClosureId(event.target.value)}>
                {MINING_CLOSURE_LEVELS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Alan (m²)
              <input
                type="text"
                inputMode="decimal"
                value={areaValue}
                onChange={(event) => setAreaValue(event.target.value)}
                placeholder="10.000"
              />
            </label>

            <label>
              İl 1
              <select value={provinceA} onChange={(event) => setProvinceA(event.target.value)}>
                {MINING_PROVINCES.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>

            <label>
              İl 2
              <select value={provinceB} onChange={(event) => setProvinceB(event.target.value)}>
                {MINING_PROVINCES.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="tool-calc__summary">
            <button type="button" onClick={handleCalculate}>HESAPLA</button>
            <button type="button" className="calc-action-btn calc-action-btn--muted" onClick={handleReset}>
              SIFIRLA
            </button>
          </div>

          {error ? <p className="kist-calc__error">{error}</p> : null}

          {result ? (
            <div className="tool-calc__summary province-compare-calc__summary">
              <span>Birim Bedel (m²): {formatTry(result.unitPricePerM2)}</span>
              <span>Seçilen İzin Türü: {result.permitLabel}</span>
              <span>Seçilen Kapalılık: {result.closureLabel}</span>
              <span>{provinceA} Toplam: {formatTry(result.totalAmountA)}</span>
              <span>{provinceB} Toplam: {formatTry(result.totalAmountB)}</span>
              <span>Fark ({provinceB} - {provinceA}): {formatTry(result.deltaAmount)}</span>
              <span>Fark Oranı: %{formatNumber(result.deltaPercent)}</span>
              <small>
                Karşılaştırma alanı: {formatAreaM2(result.areaM2)} m² | Ağaçlandırma bedeli her iki il için
                aynıdır ({formatTry(result.afforestationAmount)}).
              </small>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
};

const IzinKatsayiKarsilastirmaToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [applicationYear, setApplicationYear] = useState<number>(MINING_APPLICATION_YEARS[0].year);
  const [province, setProvince] = useState<string>(MINING_PROVINCES[0]?.name ?? "Ankara");
  const [closureId, setClosureId] = useState<string>(MINING_CLOSURE_LEVELS[2].id);
  const [areaValue, setAreaValue] = useState<string>("10000");
  const [error, setError] = useState<string>("");
  const [rows, setRows] = useState<
    Array<{ id: string; permitLabel: string; permitCoefficient: number; landAmount: number; totalAmount: number }>
  >([]);

  const handleCalculate = () => {
    const areaM2 = parseLocaleNumber(areaValue);
    if (!Number.isFinite(areaM2) || areaM2 <= 0) {
      setError("Alan (m²) değeri sıfırdan büyük olmalıdır.");
      setRows([]);
      return;
    }

    const selectedYear = MINING_YEAR_INDEX.get(applicationYear) ?? MINING_APPLICATION_YEARS[0];
    const closure = MINING_CLOSURE_INDEX.get(closureId) ?? MINING_CLOSURE_LEVELS[0];
    const provinceCoefficient = MINING_PROVINCE_INDEX.get(province);

    if (typeof provinceCoefficient !== "number") {
      setError("Seçilen il katsayısı bulunamadı.");
      setRows([]);
      return;
    }

    const unitPricePerM2 = selectedYear.afforestationPerHectare / M2_PER_HECTARE;
    const afforestationAmount = areaM2 * unitPricePerM2;

    const calculated = MINING_PERMIT_TYPES.map((permit) => {
      const landAmount = areaM2 * unitPricePerM2 * permit.coefficient * closure.coefficient * provinceCoefficient;
      return {
        id: permit.id,
        permitLabel: permit.label,
        permitCoefficient: permit.coefficient,
        landAmount,
        totalAmount: landAmount + afforestationAmount,
      };
    }).sort((a, b) => a.totalAmount - b.totalAmount);

    setError("");
    setRows(calculated);
  };

  const handleReset = () => {
    setApplicationYear(MINING_APPLICATION_YEARS[0].year);
    setProvince(MINING_PROVINCES[0]?.name ?? "Ankara");
    setClosureId(MINING_CLOSURE_LEVELS[2].id);
    setAreaValue("10000");
    setError("");
    setRows([]);
  };

  const bestOption = rows[0];
  const highestOption = rows[rows.length - 1];

  return (
    <section className="tool-detail tool-detail--permit-compare">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>
      <div className="tool-detail__layout">
        <article className="tool-detail__content">
          <h1>İzin Türü Katsayı Karşılaştırması</h1>
          <p>
            Ek-1 izin türü katsayıları aynı alan için farklı tahakkuk bedelleri oluşturur. Bu araç, seçilen yıl ve
            ilde tüm izin türlerini tek tabloda karşılaştırır.
          </p>

          <h2>Hesaplama Parametreleri</h2>
          <ul>
            <li>Uygulama yılına ait OGM birim bedeli (TL/ha)</li>
            <li>İl katsayısı (Ek-3)</li>
            <li>Kapalılık/ekolojik denge katsayısı (Ek-2)</li>
            <li>İzin türü katsayısı (Ek-1)</li>
          </ul>
        </article>

        <aside className="tool-calc permit-compare-calc">
          <div className="tool-calc__head">
            <h2>{tool.title}</h2>
            <p>Ek-1 katsayılarına göre izin türü bazlı toplam bedel sıralaması üretin.</p>
          </div>

          <div className="tool-calc__controls">
            <label>
              Uygulama Yılı
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
              İl
              <select value={province} onChange={(event) => setProvince(event.target.value)}>
                {MINING_PROVINCES.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Kapalılık
              <select value={closureId} onChange={(event) => setClosureId(event.target.value)}>
                {MINING_CLOSURE_LEVELS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({formatNumber(option.coefficient)})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Alan (m²)
              <input
                type="text"
                inputMode="decimal"
                value={areaValue}
                onChange={(event) => setAreaValue(event.target.value)}
                placeholder="10.000"
              />
            </label>
          </div>

          <div className="tool-calc__summary">
            <button type="button" onClick={handleCalculate}>HESAPLA</button>
            <button type="button" className="calc-action-btn calc-action-btn--muted" onClick={handleReset}>
              SIFIRLA
            </button>
          </div>

          {error ? <p className="kist-calc__error">{error}</p> : null}

          <div className="tool-calc__table-wrap">
            <table className="tool-calc__table">
              <thead>
                <tr>
                  <th>İzin Türü</th>
                  <th>Katsayı</th>
                  <th>Arazi Bedeli</th>
                  <th>Toplam (Arazi + Ağaçlandırma)</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Hesaplama için parametre girip HESAPLA butonuna basın.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.permitLabel}</td>
                      <td>{formatNumber(row.permitCoefficient)}</td>
                      <td>{formatTry(row.landAmount)}</td>
                      <td>{formatTry(row.totalAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {rows.length > 0 && bestOption && highestOption ? (
            <div className="tool-calc__summary permit-compare-calc__summary">
              <span>En Düşük Toplam: {bestOption.permitLabel} ({formatTry(bestOption.totalAmount)})</span>
              <span>En Yüksek Toplam: {highestOption.permitLabel} ({formatTry(highestOption.totalAmount)})</span>
              <span>Fark: {formatTry(highestOption.totalAmount - bestOption.totalAmount)}</span>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
};

const GenericToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  const [permitType, setPermitType] = useState<string>("Maden İşletme");
  const [applicationYear, setApplicationYear] = useState<string>(
    String(MINING_APPLICATION_YEARS[0]?.year ?? 2026),
  );
  const [province, setProvince] = useState<string>(MINING_PROVINCES[0]?.name ?? "Ankara");
  const [closure, setClosure] = useState<string>("1.4");
  const [areaValue, setAreaValue] = useState<string>("");
  const [rows, setRows] = useState<GenericCalcRow[]>([]);

  const totalArea = useMemo(() => rows.reduce((sum, row) => sum + row.area, 0), [rows]);

  const parsedAreaInput = parseLocaleNumber(areaValue);
  const canAddRow = Number.isFinite(parsedAreaInput) && parsedAreaInput > 0;

  const handleAddRow = () => {
    const area = parsedAreaInput;
    if (!Number.isFinite(area) || area <= 0) return;

    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
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

  const handleClearRows = () => {
    setRows([]);
  };

  return (
    <section className="tool-detail">
      <a className="tool-detail__back" href="/hesap-araclari">Hesap Araçları menüsü</a>
      <div className="tool-detail__layout">
        <article className="tool-detail__content">
          <h1>{tool.sectionTitle}</h1>
          <p>{tool.sectionText}</p>

          <h2>İzin Bedellerini Belirleyen Temel Kriterler</h2>
          <ul>
            {tool.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </article>

        <aside className="tool-calc">
          <div className="tool-calc__head">
            <h2>{tool.title}</h2>
            <p>Değerleri girip kalemleri ekleyin; toplam alanı anlık takip edin.</p>
          </div>

          <div className="tool-calc__controls">
            <label>
              İşlem Türü
              <select value={permitType} onChange={(event) => setPermitType(event.target.value)}>
                <option>Maden İşletme</option>
                <option>Yeni İzin / İlave</option>
                <option>Rehabilitasyon</option>
              </select>
            </label>
            <label>
              Uygulama Yılı
              <select value={applicationYear} onChange={(event) => setApplicationYear(event.target.value)}>
                {MINING_APPLICATION_YEARS.slice(0, 15).map((yearOption) => (
                  <option key={yearOption.year} value={String(yearOption.year)}>
                    {yearOption.year}
                  </option>
                ))}
              </select>
            </label>
            <label>
              İl Katsayısı
              <select value={province} onChange={(event) => setProvince(event.target.value)}>
                {MINING_PROVINCES.map((provinceOption) => (
                  <option key={provinceOption.name} value={provinceOption.name}>
                    {provinceOption.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="tool-calc__row-input">
            <label>
              Alan (m²)
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={areaValue}
                onChange={(event) => setAreaValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canAddRow) {
                    event.preventDefault();
                    handleAddRow();
                  }
                }}
              />
            </label>
            <label>
              Kapalılık
              <select value={closure} onChange={(event) => setClosure(event.target.value)}>
                <option value="1.0">1.0</option>
                <option value="1.2">1.2</option>
                <option value="1.4">1.4</option>
                <option value="1.6">1.6</option>
              </select>
            </label>
            <button type="button" onClick={handleAddRow} disabled={!canAddRow}>EKLE</button>
          </div>

          <div className="tool-calc__table-wrap">
            <table className="tool-calc__table">
              <thead>
                <tr>
                  <th>Kalem</th>
                  <th>Alan</th>
                  <th>Kapalılık</th>
                  <th>Sil</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Henüz kalem eklenmedi.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.permitType}</td>
                      <td>{row.area.toFixed(1)} m²</td>
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
            <span>Kalem Sayısı: {rows.length}</span>
            <span>Yıl: {applicationYear}</span>
            <span>İl: {province}</span>
            <span>Toplam Alan: {formatAreaM2(totalArea)} m²</span>
            <button
              type="button"
              className="calc-action-btn calc-action-btn--muted"
              onClick={handleClearRows}
              disabled={rows.length === 0}
            >
              Tümünü Temizle
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
};

const ToolDetailLead = ({ tool }: ToolDetailPageProps) => {
  const sourceLinks = TOOL_SOURCE_LINKS[tool.slug] ?? [];

  return (
    <section className="calc-lead" aria-label={`${tool.title} özeti`}>
      <div className="calc-lead__main">
        <span className="calc-lead__eyebrow">Lacivert Ormancılık Hesaplama Merkezi</span>
        <h1>{tool.title}</h1>
        <p>{tool.sectionText}</p>
        <div className="calc-lead__tags">
          {tool.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>

      <aside className="calc-lead__panel">
        <h2>{tool.sectionTitle}</h2>
        <ul>
          {tool.bullets.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {sourceLinks.length > 0 ? (
          <div className="calc-lead__sources">
            <h3>Veri Kaynakları</h3>
            <ul>
              {sourceLinks.map((source) => (
                <li key={`${source.label}-${source.url}`}>
                  <a href={source.url} target="_blank" rel="noopener">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </section>
  );
};

const ToolDetailPage = ({ tool }: ToolDetailPageProps) => {
  let detailContent: ReactNode;

  if (tool.slug === MINING_TOOL_SLUG) {
    detailContent = <MiningToolDetailPage tool={tool} />;
  } else if (tool.slug === ENERGY_TOOL_SLUG) {
    detailContent = <EnergyToolDetailPage tool={tool} />;
  } else if (tool.slug === COORD_TOOL_SLUG || tool.slug === ADVANCED_ED50_TOOL_SLUG) {
    detailContent = <CoordinateToolDetailPage tool={tool} />;
  } else if (tool.slug === CAD_TOOL_SLUG) {
    detailContent = <CadConversionToolDetailPage tool={tool} />;
  } else if (tool.slug === KIST_TOOL_SLUG) {
    detailContent = <KistelyevmToolDetailPage tool={tool} />;
  } else if (tool.slug === CARBON_TOOL_SLUG) {
    detailContent = <CarbonAnalysisToolDetailPage tool={tool} />;
  } else if (tool.slug === TEMDIT_MAHSUP_TOOL_SLUG) {
    detailContent = <TemditMahsupToolDetailPage tool={tool} />;
  } else if (tool.slug === DAMGA_NOTER_TOOL_SLUG) {
    detailContent = <DamgaNoterToolDetailPage tool={tool} />;
  } else if (tool.slug === ILETISIM_PANO_TOOL_SLUG) {
    detailContent = <IletisimPanosuToolDetailPage tool={tool} />;
  } else if (tool.slug === YDO_BAK_TOOL_SLUG) {
    detailContent = <YdoBakToolDetailPage tool={tool} />;
  } else if (tool.slug === EPDK_KML_TOOL_SLUG) {
    detailContent = <EpdkKmlToolDetailPage tool={tool} />;
  } else if (tool.slug === KDV_YUZDE_TOOL_SLUG) {
    detailContent = <KdvYuzdeToolDetailPage tool={tool} />;
  } else if (tool.slug === PDF_TOOL_SLUG) {
    detailContent = <PdfToolkitToolDetailPage tool={tool} />;
  } else if (tool.slug === FIDAN_CIT_TOOL_SLUG) {
    detailContent = <FidanCitToolDetailPage tool={tool} />;
  } else if (tool.slug === AGACLANDIRMA_BAKIM_BUTCE_TOOL_SLUG) {
    detailContent = <AgaclandirmaButceToolDetailPage tool={tool} />;
  } else if (tool.slug === ORMAN_YOLU_METRAJ_TOOL_SLUG) {
    detailContent = <OrmanYoluMetrajToolDetailPage tool={tool} />;
  } else if (tool.slug === IL_KATSAYI_KARSILASTIRMA_TOOL_SLUG) {
    detailContent = <IlKatsayiKarsilastirmaToolDetailPage tool={tool} />;
  } else if (tool.slug === IZIN_KATSAYI_KARSILASTIRMA_TOOL_SLUG) {
    detailContent = <IzinKatsayiKarsilastirmaToolDetailPage tool={tool} />;
  } else if (tool.slug === PHOTO_CROP_TOOL_SLUG) {
    detailContent = <PhotoCropToolDetailPage tool={tool} />;
  } else if (tool.slug === PHOTO_COORD_TOOL_SLUG) {
    detailContent = <PhotoCoordinateToolDetailPage tool={tool} />;
  } else {
    detailContent = <GenericToolDetailPage tool={tool} />;
  }

  return (
    <>
      <div className="tool-detail-globalnav">
        <a className="tool-detail__back tool-detail__back--global" href="/hesap-araclari">
          Hesap Araçları menüsü
        </a>
      </div>
      <ToolDetailLead tool={tool} />
      {detailContent}
    </>
  );
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
      setLoadError("Sayfa bulunamadı");
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
        const redirectPath = resolveLegacyRedirectPath(payload);

        if (redirectPath && !cancelled) {
          const currentPath = canonicalizeBrowserPath();
          if (redirectPath !== currentPath) {
            window.history.replaceState(null, "", `${redirectPath}${window.location.search}${window.location.hash}`);
            setPathname(canonicalizeBrowserPath());
            return;
          }
        }

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
        setLoadError(error instanceof Error ? error.message : "Sayfa yüklenemedi");
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
      return parsePage(lazyPage.html, lazyPage.route);
    } catch {
      return null;
    }
  }, [lazyPage]);

  useEffect(() => {
    const sync = () => syncSiteHeaderOffsets();

    runAfterNextPaint(sync);
    const quickTimer = window.setTimeout(sync, 120);
    const lateTimer = window.setTimeout(sync, 420);

    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      window.clearTimeout(quickTimer);
      window.clearTimeout(lateTimer);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, [pathname, customRoute, parsedPage, headReady]);

  useEffect(() => {
    document.querySelectorAll(`[${MANAGED_HEAD_ATTR}]`).forEach((node) => {
      if (node instanceof HTMLLinkElement && node.rel.toLowerCase().includes("stylesheet")) return;
      node.remove();
    });
    setHeadReady(false);

    if (customRoute) {
      const seoConfig = buildCustomRouteSeoConfig(customRoute, activeTool);
      document.title = seoConfig.title;

      const mountedNodes: Element[] = [];
      const stylesheetWaiters: Array<Promise<void>> = [];
      let cancelled = false;

      seoConfig.headNodes.forEach((headHtml) => {
        const node = createElementFromHtml(headHtml);
        if (!node) return;

        if (node instanceof HTMLLinkElement && node.rel.toLowerCase().includes("stylesheet")) {
          const href = node.getAttribute("href") || "";
          if (!href || hasStylesheetInHead(href)) return;

          node.setAttribute(MANAGED_HEAD_ATTR, "1");
          document.head.appendChild(node);

          if (isLocalStylesheetHref(href)) {
            stylesheetWaiters.push(waitForStylesheet(node));
          }
          return;
        }

        node.setAttribute(MANAGED_HEAD_ATTR, "1");
        document.head.appendChild(node);
        mountedNodes.push(node);
      });

      if (stylesheetWaiters.length === 0) {
        runAfterNextPaint(() => {
          if (!cancelled) setHeadReady(true);
        });
      } else {
        void Promise.allSettled(stylesheetWaiters).then(() => {
          runAfterNextPaint(() => {
            if (!cancelled) setHeadReady(true);
          });
        });
      }

      return () => {
        cancelled = true;
        mountedNodes.forEach((node) => node.remove());
      };
    }

    if (!parsedPage) {
      document.title = "Sayfa Bulunamadı | Lacivert Ormancılık";
      return;
    }

    document.title = parsedPage.title;

    const mountedNodes: Element[] = [];
    const stylesheetWaiters: Array<Promise<void>> = [];
    let cancelled = false;

    parsedPage.headNodes.forEach((headHtml) => {
      const node = createElementFromHtml(headHtml);
      if (!node) return;

      if (node instanceof HTMLLinkElement && node.rel.toLowerCase().includes("stylesheet")) {
        const href = node.getAttribute("href") || "";
        if (!href || hasStylesheetInHead(href)) return;

        node.setAttribute(MANAGED_HEAD_ATTR, "1");
        document.head.appendChild(node);

        if (isLocalStylesheetHref(href)) {
          stylesheetWaiters.push(waitForStylesheet(node));
        }
        return;
      }

      node.setAttribute(MANAGED_HEAD_ATTR, "1");
      document.head.appendChild(node);
      mountedNodes.push(node);
    });

    if (stylesheetWaiters.length === 0) {
      runAfterNextPaint(() => {
        if (!cancelled) setHeadReady(true);
      });
    } else {
      void Promise.allSettled(stylesheetWaiters).then(() => {
        runAfterNextPaint(() => {
          if (!cancelled) setHeadReady(true);
        });
      });
    }

    return () => {
      cancelled = true;
      mountedNodes.forEach((node) => node.remove());
    };
  }, [customRoute, activeTool, parsedPage]);

  useEffect(() => {
    if (customRoute || !parsedPage) return;
    return setupLegacyMobileNavigation();
  }, [customRoute, parsedPage, pathname]);

  if (customRoute && !headReady) {
    return (
      <main className="legacy-not-found">
        <section className="legacy-not-found__card">
          <h1>Yükleniyor</h1>
          <p>Sayfa içeriği hazırlanıyor...</p>
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
              <h1>Araç bulunamadı</h1>
              <p>Bu hesap aracı taşınmış veya kaldırılmış olabilir.</p>
              <p>
                <a href="/hesap-araclari">Tüm hesap araçlarına dön</a>
              </p>
            </section>
          </main>
        )}
      </ToolsShell>
    );
  }

  if (loading) {
    return (
      <main className="legacy-not-found">
        <section className="legacy-not-found__card">
          <h1>Yükleniyor</h1>
          <p>Sayfa içeriği hazırlanıyor...</p>
        </section>
      </main>
    );
  }

  if (!parsedPage) {
    return (
      <main className="legacy-not-found">
        <section className="legacy-not-found__card">
          <h1>Sayfa bulunamadı</h1>
          <p>{loadError || "Aradığınız içerik taşınmış veya silinmiş olabilir."}</p>
          <p>
            <a href="/">Anasayfaya dön</a>
          </p>
        </section>
      </main>
    );
  }

  return <div className="legacy-page-content" dangerouslySetInnerHTML={{ __html: parsedPage.bodyHtml }} />;
};

export default App;











