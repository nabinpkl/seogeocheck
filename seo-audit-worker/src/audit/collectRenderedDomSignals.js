import {
  buildAnchorRecord,
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
    const fragmentTargets = Array.from(document.querySelectorAll("[id], [name]"))
      .map((element) => element.id || element.getAttribute("name"))
      .filter(Boolean);

    return {
      title: document.title ?? "",
      metaDescription: attr('meta[name="description"]', "content"),
      canonicalUrl: attr('link[rel="canonical"]', "href"),
      h1Count: document.querySelectorAll("h1").length,
      lang: document.documentElement.getAttribute("lang"),
      robotsContent: attr('meta[name="robots"]', "content"),
      openGraphTitle: attr('meta[property="og:title"]', "content"),
      openGraphDescription: attr('meta[property="og:description"]', "content"),
      bodyText: document.body?.innerText ?? document.body?.textContent ?? "",
      sourceAnchors: Array.from(document.querySelectorAll("a")).map((anchor) => ({
        href: anchor.getAttribute("href"),
        text: textOf(anchor.innerText || anchor.textContent),
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
    lang: snapshot.lang,
    robotsContent: snapshot.robotsContent,
    openGraphTitle: snapshot.openGraphTitle,
    openGraphDescription: snapshot.openGraphDescription,
    wordCount: countWords(snapshot.bodyText),
    sourceAnchors: snapshot.sourceAnchors.map((anchor) =>
      buildAnchorRecord(anchor, finalUrl, snapshot.fragmentTargets)
    ),
    linkedImages: snapshot.linkedImages.map((image) =>
      buildLinkedImageRecord(image, finalUrl)
    ),
    structuredDataKinds: snapshot.structuredDataKinds,
  };
}
