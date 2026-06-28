// F1 news aggregated from public RSS feeds. We show title + summary and link
// out to the source (no full-text republishing). Cached for 30 minutes.
const REVALIDATE_SECONDS = 1800;
const MAX_ITEMS = 12;

export interface NewsItem {
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
  image: string | null;
}

export interface NewsSource {
  id: string;
  name: string;
  items: NewsItem[];
}

interface SourceConfig {
  id: string;
  name: string;
  url: string;
}

const SOURCES: SourceConfig[] = [
  {
    id: "f1",
    name: "Formula 1",
    url: "https://www.formula1.com/en/latest/all.xml",
  },
  {
    id: "motorsport",
    name: "Motorsport",
    url: "https://www.motorsport.com/rss/f1/news/",
  },
  {
    id: "autosport",
    name: "Autosport",
    url: "https://www.autosport.com/rss/f1/news/",
  },
];

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function pickTag(block: string, tag: string): string | null {
  const match = block.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
  );
  return match ? match[1].trim() : null;
}

function pickAttr(block: string, tag: string, attr: string): string | null {
  const match = block.match(
    new RegExp(`<${tag}[^>]*\\b${attr}="([^"]+)"`, "i"),
  );
  return match ? match[1] : null;
}

function cleanSummary(raw: string | null): string {
  if (!raw) return "";
  let text = decodeEntities(raw)
    .replace(/<a\b[\s\S]*?<\/a>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > 180) {
    text = `${text.slice(0, 177).trimEnd()}…`;
  }
  return text;
}

function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks) {
    const title = decodeEntities(pickTag(block, "title") ?? "").trim();
    const link = decodeEntities(pickTag(block, "link") ?? "").trim();
    if (!title || !link) continue;

    let publishedAt: string | null = null;
    const pub = pickTag(block, "pubDate");
    if (pub) {
      const date = new Date(pub);
      if (!Number.isNaN(date.getTime())) publishedAt = date.toISOString();
    }

    const image =
      pickAttr(block, "media:content", "url") ??
      pickAttr(block, "media:thumbnail", "url") ??
      pickAttr(block, "enclosure", "url");

    items.push({
      title,
      link,
      summary: cleanSummary(pickTag(block, "description")),
      publishedAt,
      image: image ?? null,
    });

    if (items.length >= MAX_ITEMS) break;
  }

  return items;
}

async function fetchSource(src: SourceConfig): Promise<NewsSource> {
  try {
    const res = await fetch(src.url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return { id: src.id, name: src.name, items: [] };
    const xml = await res.text();
    return { id: src.id, name: src.name, items: parseRss(xml) };
  } catch {
    return { id: src.id, name: src.name, items: [] };
  }
}

/** Latest F1 news per source (parallel, fail-soft). */
export async function getNews(): Promise<NewsSource[]> {
  return Promise.all(SOURCES.map(fetchSource));
}
