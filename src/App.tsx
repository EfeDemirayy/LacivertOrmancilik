import { useEffect, useMemo, useState } from "react";
import { ALIAS_TO_PAGE_ID } from "./generated/pageManifest";

type ScriptSpec = {
  src?: string;
  text?: string;
  attributes: Record<string, string>;
};

type ParsedPage = {
  title: string;
  headNodes: string[];
  bodyHtml: string;
  bodyScripts: ScriptSpec[];
};

type LazyPagePayload = {
  id: number;
  route: string;
  source: string;
  html: string;
  aliases: string[];
};

const MANAGED_HEAD_ATTR = "data-react-page-head";
const MANAGED_SCRIPT_ATTR = "data-react-page-script";

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

const parsePage = (rawHtml: string): ParsedPage => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  const title = doc.title || "Lacivert Ormancilik";
  const headNodes: string[] = [];

  Array.from(doc.head.children).forEach((node) => {
    const tag = node.tagName.toLowerCase();

    if (tag === "title") return;

    if (tag === "meta") {
      const charset = node.getAttribute("charset");
      const name = (node.getAttribute("name") || "").toLowerCase();
      if (charset || name === "viewport") return;
    }

    headNodes.push(node.outerHTML);
  });

  const bodyScripts: ScriptSpec[] = [];

  Array.from(doc.body.querySelectorAll("script")).forEach((scriptNode) => {
    const attributes: Record<string, string> = {};
    Array.from(scriptNode.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });

    const src = scriptNode.getAttribute("src") || undefined;
    const text = src ? undefined : scriptNode.textContent || "";

    bodyScripts.push({ src, text, attributes });
    scriptNode.remove();
  });

  return {
    title,
    headNodes,
    bodyHtml: doc.body.innerHTML,
    bodyScripts,
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

const App = () => {
  const [pathname, setPathname] = useState<string>(() => canonicalizeBrowserPath());
  const [lazyPage, setLazyPage] = useState<LazyPagePayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");

  const pageId = useMemo(() => resolvePageId(pathname), [pathname]);

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
    let cancelled = false;

    if (pageId === null) {
      setLazyPage(null);
      setLoadError("Sayfa bulunamadi");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    const loadPage = async () => {
      try {
        const response = await fetch(`/page-data/pages/${pageId}.json`, { cache: "default" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as LazyPagePayload;

        if (!cancelled) {
          setLazyPage(payload);
          setLoading(false);
        }
      } catch (error) {
        if (cancelled) return;
        setLazyPage(null);
        setLoading(false);
        setLoadError(error instanceof Error ? error.message : "Sayfa yuklenemedi");
      }
    };

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [pageId]);

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

    if (!parsedPage) {
      document.title = "Sayfa Bulunamadi | Lacivert Ormancilik";
      return;
    }

    document.title = parsedPage.title;

    const mountedNodes: Element[] = [];

    parsedPage.headNodes.forEach((headHtml) => {
      const node = createElementFromHtml(headHtml);
      if (!node) return;

      node.setAttribute(MANAGED_HEAD_ATTR, "1");
      document.head.appendChild(node);
      mountedNodes.push(node);
    });

    return () => {
      mountedNodes.forEach((node) => node.remove());
    };
  }, [parsedPage]);

  useEffect(() => {
    document.querySelectorAll(`[${MANAGED_SCRIPT_ATTR}]`).forEach((node) => node.remove());

    if (!parsedPage) return;

    const mountedScripts: HTMLScriptElement[] = [];
    let cancelled = false;

    const mountScript = (spec: ScriptSpec): Promise<void> =>
      new Promise((resolve) => {
        const script = document.createElement("script");
        script.setAttribute(MANAGED_SCRIPT_ATTR, "1");

        Object.entries(spec.attributes).forEach(([key, value]) => {
          if (key.toLowerCase() === "src") return;
          script.setAttribute(key, value);
        });

        if (spec.src) {
          script.src = spec.src;
          script.async = false;
          script.onload = () => resolve();
          script.onerror = () => resolve();
          document.body.appendChild(script);
          mountedScripts.push(script);
          return;
        }

        if (spec.text) script.text = spec.text;
        document.body.appendChild(script);
        mountedScripts.push(script);
        resolve();
      });

    const bootstrapScripts = async () => {
      for (const scriptSpec of parsedPage.bodyScripts) {
        if (cancelled) return;
        await mountScript(scriptSpec);
      }

      if (!cancelled) {
        document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true, cancelable: true }));
      }
    };

    void bootstrapScripts();

    return () => {
      cancelled = true;
      mountedScripts.forEach((script) => script.remove());
    };
  }, [parsedPage]);

  if (loading) {
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
