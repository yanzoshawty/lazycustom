/**
 * Ambil ID video dari berbagai bentuk link YouTube, lalu bentuk link chat popout
 * yang dipakai OBS.
 */
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function extractVideoId(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const withScheme = /^[a-z]+:\/\//i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/")[1] ?? "";
    return ID_RE.test(id) ? id : null;
  }
  // Selain youtu.be, hanya domain YouTube yang diterima, termasuk untuk parameter ?v=.
  if (host !== "youtube.com" && host !== "studio.youtube.com") return null;
  const fromQuery = url.searchParams.get("v");
  if (fromQuery && ID_RE.test(fromQuery)) return fromQuery;
  const parts = url.pathname.split("/").filter(Boolean);
  const at = parts.findIndex((p) => p === "live" || p === "embed" || p === "video");
  const id = at >= 0 ? (parts[at + 1] ?? "") : "";
  return ID_RE.test(id) ? id : null;
}

export function popoutChatUrl(videoId: string): string {
  return `https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`;
}
