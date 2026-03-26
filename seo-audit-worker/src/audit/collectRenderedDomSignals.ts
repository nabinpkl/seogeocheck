import {
  buildAnchorRecord,
  buildBodyImageRecord,
  buildHeadingRecord,
  buildLinkedImageRecord,
  countWords,
} from "./signalUtils.js";

export async function collectRenderedDomSignals({
  requestedUrl,
  finalUrl,
  response,
  page,
  settleTimeMs = 1500,
}) {
  await page.waitForTimeout(settleTimeMs);

  const snapshot = await page.evaluate(() => {
    const textOf = (value) => (typeof value === "string" ? value : "");
    const attr = (selector, name) => document.querySelector(selector)?.getAttribute(name) ?? null;
    const attrs = (selector, name) =>
      Array.from(document.querySelectorAll(selector)).map((element) => element.getAttribute(name));
    const fragmentTargets = Array.from(document.querySelectorAll("[id], [name]"))
      .map((element) => element.id || element.getAttribute("name"))
      .filter(Boolean);
    const mapLinkElements = (selector) =>
      Array.from(document.querySelectorAll(selector)).map((element) => ({
        href: element.getAttribute("href"),
        rel: element.getAttribute("rel"),
        hreflang: element.getAttribute("hreflang"),
        media: element.getAttribute("media"),
        type: element.getAttribute("type"),
      }));

    return {
      title: document.title ?? "",
      metaDescription: attr('meta[name="description"]', "content"),
      canonicalUrl: attr('link[rel="canonical"]', "href"),
      h1Count: document.querySelectorAll("h1").length,
      headingOutline: Array.from(
        document.querySelectorAll("body h1, body h2, body h3, body h4, body h5, body h6")
      ).map((heading) => ({
        level: Number.parseInt(heading.tagName.slice(1), 10),
        text: textOf((heading as HTMLElement).innerText || heading.textContent),
      })),
      bodyImages: Array.from(document.querySelectorAll("body img")).map((image) => ({
        src: image.getAttribute("src"),
        alt: image.getAttribute("alt"),
        role: image.getAttribute("role"),
        ariaHidden: image.getAttribute("aria-hidden"),
        width: image.getAttribute("width"),
        height: image.getAttribute("height"),
      })),
      lang: document.documentElement.getAttribute("lang"),
      robotsContent: attr('meta[name="robots"]', "content"),
      metaRobotsTags: attrs('meta[name="robots"]', "content"),
      googlebotRobotsTags: attrs('meta[name="googlebot"]', "content"),
      metaRefreshTags: Array.from(document.querySelectorAll("meta[http-equiv]"))
        .filter(
          (element) =>
            (element.getAttribute("http-equiv") ?? "").trim().toLowerCase() === "refresh"
        )
        .map((element) => element.getAttribute("content"))
        .filter((value) => typeof value === "string"),
      openGraphTitle: attr('meta[property="og:title"]', "content"),
      openGraphDescription: attr('meta[property="og:description"]', "content"),
      bodyText: document.body?.innerText ?? document.body?.textContent ?? "",
      htmlCanonicalLinks: mapLinkElements('link[rel="canonical"]'),
      htmlAlternateLinks: mapLinkElements('link[rel~="alternate"]'),
      sourceAnchors: Array.from(document.querySelectorAll("a")).map((anchor) => ({
        href: anchor.getAttribute("href"),
        text: textOf(anchor.innerText || anchor.textContent),
        rel: anchor.getAttribute("rel"),
      })),
      linkedImages: Array.from(document.querySelectorAll("a img")).map((image) => ({
        href: image.closest("a")?.getAttribute("href") ?? null,
        alt: image.getAttribute("alt"),
      })),
      structuredDataKinds: [
        ...(document.querySelector('script[type="application/ld+json"]') ? ["json-ld"] : []),
        ...(document.querySelector("[itemscope]") ? ["microdata"] : []),
        ...(document.querySelector("[typeof]") ? ["rdfa"] : []),
      ],
      fragmentTargets,
    };
  });

  const responseHeaders = typeof response?.headers === "function" ? response.headers() : {};
  const contentType =
    responseHeaders?.["content-type"] ??
    responseHeaders?.["Content-Type"] ??
    null;

  return {
    requestedUrl,
    finalUrl,
    statusCode: typeof response?.status === "function" ? response.status() : null,
    contentType,
    title: snapshot.title,
    metaDescription: snapshot.metaDescription,
    canonicalUrl: snapshot.canonicalUrl,
    h1Count: snapshot.h1Count,
    headingOutline: snapshot.headingOutline
      .map((heading) => buildHeadingRecord(heading))
      .filter(Boolean),
    bodyImages: snapshot.bodyImages.map((image) => buildBodyImageRecord(image, finalUrl)),
    lang: snapshot.lang,
    robotsContent: snapshot.robotsContent,
    metaRobotsTags: snapshot.metaRobotsTags,
    googlebotRobotsTags: snapshot.googlebotRobotsTags,
    metaRefreshTags: snapshot.metaRefreshTags,
    openGraphTitle: snapshot.openGraphTitle,
    openGraphDescription: snapshot.openGraphDescription,
    wordCount: countWords(snapshot.bodyText),
    htmlCanonicalLinks: snapshot.htmlCanonicalLinks,
    htmlAlternateLinks: snapshot.htmlAlternateLinks,
    sourceAnchors: snapshot.sourceAnchors.map((anchor) =>
      buildAnchorRecord(anchor, finalUrl, snapshot.fragmentTargets)
    ),
    linkedImages: snapshot.linkedImages.map((image) =>
      buildLinkedImageRecord(image, finalUrl)
    ),
    structuredDataKinds: snapshot.structuredDataKinds,
  };
}
