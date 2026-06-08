import { NextResponse } from "next/server";

const USER_AGENT = "JapanOSImmersionPlayer/1.0 (contact@example.com)";

async function fetchJsonSafely(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  
  if (!res.ok) {
    throw new Error(`Wikimedia API responded with status ${res.status}`);
  }
  
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`Wikimedia API returned non-JSON content-type: ${contentType}`);
  }
  
  return await res.json();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get("word") || "";

    if (!word) {
      return NextResponse.json({ success: true, imageUrl: null });
    }

    // Tier 1: Direct Japanese Wikipedia Page Image
    const jaWikiDirectUrl = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      word
    )}&prop=pageimages&format=json&pithumbsize=400&redirects=1`;

    try {
      console.log(`[Image API] Tier 1 lookup for: "${word}"`);
      const data = await fetchJsonSafely(jaWikiDirectUrl);
      const pages = data?.query?.pages;

      if (pages) {
        for (const key in pages) {
          const page = pages[key];
          if (page.thumbnail?.source) {
            console.log(`[Image API] Tier 1 success: Found image for "${word}" - ${page.thumbnail.source}`);
            return NextResponse.json({ success: true, imageUrl: page.thumbnail.source });
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Image API] Tier 1 lookup failed for "${word}":`, err.message || err);
    }

    // Tier 2: Japanese Wikipedia Search Fallback
    const jaWikiSearchUrl = `https://ja.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      word
    )}&gsrlimit=3&prop=pageimages&format=json&pithumbsize=400`;

    try {
      console.log(`[Image API] Tier 2 search lookup for: "${word}"`);
      const data = await fetchJsonSafely(jaWikiSearchUrl);
      const pages = data?.query?.pages;

      if (pages) {
        const pageList = Object.values(pages).sort(
          (a: any, b: any) => (a.index || 0) - (b.index || 0)
        );
        for (const page of pageList as any[]) {
          if (page.thumbnail?.source) {
            console.log(`[Image API] Tier 2 success: Found search image for "${word}" - ${page.thumbnail.source}`);
            return NextResponse.json({ success: true, imageUrl: page.thumbnail.source });
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Image API] Tier 2 search failed for "${word}":`, err.message || err);
    }

    // Tier 3: Wikimedia Commons Search Fallback
    const commonsSearchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      word
    )}&gsrlimit=3&prop=imageinfo&iiprop=url&format=json&iiurlwidth=400`;

    try {
      console.log(`[Image API] Tier 3 Commons lookup for: "${word}"`);
      const data = await fetchJsonSafely(commonsSearchUrl);
      const pages = data?.query?.pages;

      if (pages) {
        const pageList = Object.values(pages).sort(
          (a: any, b: any) => (a.index || 0) - (b.index || 0)
        );
        for (const page of pageList as any[]) {
          if (page.imageinfo?.[0]?.thumburl) {
            const imgUrl = page.imageinfo[0].thumburl;
            console.log(`[Image API] Tier 3 success: Found Commons image for "${word}" - ${imgUrl}`);
            return NextResponse.json({ success: true, imageUrl: imgUrl });
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Image API] Tier 3 Commons search failed for "${word}":`, err.message || err);
    }

    console.log(`[Image API] No image found for "${word}" after trying all tiers`);
    return NextResponse.json({ success: true, imageUrl: null });
  } catch (globalErr) {
    console.error(`[Image API] Global error in image lookup route:`, globalErr);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
