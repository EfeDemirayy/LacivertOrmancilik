import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SITE_ORIGIN = "https://lacivert.cc";
const PAGE_DATA_DIR = path.join(ROOT, "public", "page-data", "pages");
const APP_FILE = path.join(ROOT, "src", "App.tsx");
const SITEMAP_FILE = path.join(ROOT, "public", "sitemap.xml");
const ROBOTS_FILE = path.join(ROOT, "public", "robots.txt");
const TODAY = new Date().toISOString().slice(0, 10);

const normalizePath = (input) => {
  if (!input) return "/";
  let value = input.startsWith("/") ? input : `/${input}`;
  value = value.replace(/\/+/g, "/");

  if (value === "/index.html" || value === "/index.htm") return "/";
  if (value.length > 1 && value.endsWith("/")) value = value.slice(0, -1);
  return value || "/";
};

const isRedirectPayload = (html) => {
  if (!html) return false;
  if (/<meta[^>]+http-equiv=["']refresh["']/i.test(html)) return true;
  if (/window\.location\.(replace|assign)\(/i.test(html)) return true;
  if (/window\.location\.href\s*=/i.test(html)) return true;
  return false;
};

const extractCanonicalPath = (payload) => {
  const html = payload?.html || "";
  const source = payload?.source || "/";
  const route = payload?.route || "/";

  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  const rawCanonical = canonicalMatch?.[1]?.trim();

  try {
    const basePath = source.startsWith("/") ? source : `/${source}`;
    const baseUrl = new URL(basePath, SITE_ORIGIN);

    if (rawCanonical) {
      const canonicalUrl = new URL(rawCanonical, baseUrl);
      if (canonicalUrl.origin === SITE_ORIGIN) {
        return normalizePath(canonicalUrl.pathname);
      }
    }
  } catch {
    // Fallback route is used below.
  }

  return normalizePath(route);
};

const classifyUrl = (pathname) => {
  const lower = pathname.toLowerCase();

  if (lower === "/") return { changefreq: "weekly", priority: "1.0" };
  if (lower === "/hesap-araclari") return { changefreq: "weekly", priority: "0.95" };
  if (lower.startsWith("/hesap-araclari/")) return { changefreq: "weekly", priority: "0.90" };
  if (lower.startsWith("/projeler/")) return { changefreq: "monthly", priority: "0.70" };

  const highIntentPages = new Set([
    "/diger.html",
    "/hakkimizda.html",
    "/iletisim.html",
    "/kanunveyonetmelikler.html",
    "/madde16.html",
    "/madde17.html",
    "/ormanizinleri.html",
  ]);

  if (highIntentPages.has(lower)) {
    return { changefreq: "weekly", priority: "0.90" };
  }

  return { changefreq: "monthly", priority: "0.80" };
};

const toAbsoluteUrl = (pathname) => {
  const normalized = normalizePath(pathname);
  return normalized === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${normalized}`;
};

const xmlEscape = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const buildSitemapXml = (entries) => {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

  for (const entry of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(entry.loc)}</loc>`);
    lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push(`    <priority>${entry.priority}</priority>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  lines.push("");
  return lines.join("\n");
};

const extractToolSlugs = async () => {
  const source = await fs.readFile(APP_FILE, "utf8");
  const slugs = new Set();

  for (const match of source.matchAll(/slug:\s*"([^"]+)"/g)) {
    const slug = match[1]?.trim();
    if (slug) slugs.add(slug);
  }

  return Array.from(slugs);
};

const readPagePayloads = async () => {
  const names = await fs.readdir(PAGE_DATA_DIR);
  const jsonFiles = names.filter((name) => name.endsWith(".json"));
  const payloads = [];

  for (const fileName of jsonFiles) {
    const filePath = path.join(PAGE_DATA_DIR, fileName);
    const raw = await fs.readFile(filePath, "utf8");
    const payload = JSON.parse(raw);
    payloads.push(payload);
  }

  return payloads;
};

const buildRobotsTxt = () => {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /page-data/",
    "Disallow: /.vs/",
    "",
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    "Host: lacivert.cc",
    "",
  ].join("\n");
};

const main = async () => {
  const payloads = await readPagePayloads();
  const toolSlugs = await extractToolSlugs();

  const uniquePaths = new Set();

  for (const payload of payloads) {
    const html = payload?.html || "";
    if (isRedirectPayload(html)) continue;

    const canonicalPath = extractCanonicalPath(payload);
    if (!canonicalPath) continue;
    uniquePaths.add(canonicalPath);
  }

  uniquePaths.add("/hesap-araclari");
  for (const slug of toolSlugs) {
    uniquePaths.add(`/hesap-araclari/${slug}`);
  }

  const entries = Array.from(uniquePaths)
    .map((pathname) => {
      const { changefreq, priority } = classifyUrl(pathname);
      return {
        pathname,
        loc: toAbsoluteUrl(pathname),
        lastmod: TODAY,
        changefreq,
        priority,
      };
    })
    .sort((a, b) => {
      if (a.pathname === "/") return -1;
      if (b.pathname === "/") return 1;
      return a.pathname.localeCompare(b.pathname, "tr");
    });

  await fs.writeFile(SITEMAP_FILE, buildSitemapXml(entries), "utf8");
  await fs.writeFile(ROBOTS_FILE, buildRobotsTxt(), "utf8");

  console.log(`SEO assets hazirlandi: ${entries.length} URL sitemap'e yazildi.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
