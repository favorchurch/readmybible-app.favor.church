/**
 * Sanitization and normalization for notes rich text content (Issue 183).
 *
 * Enforces strict whitelist:
 * - Allowed tags: p, strong, b, em, i, u, ul, ol, li, br, span
 * - Allowed styles on span: font-family restricted strictly to:
 *   Favor Sans, Agharti, Arial, Inter
 * - All script, iframe, object, event handlers, and arbitrary styles are stripped.
 */

export const ALLOWED_FONTS = ["Favor Sans", "Agharti", "Arial", "Inter"] as const;
export type AllowedFont = (typeof ALLOWED_FONTS)[number];

const ALLOWED_TAG_SET = new Set<string>([
  "p",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "br",
  "span",
]);
const STRIP_TAG_SET = new Set<string>([
  "script",
  "style",
  "iframe",
  "frame",
  "object",
  "embed",
  "applet",
  "form",
  "svg",
  "canvas",
]);

export function canonicalFontName(font: string | null | undefined): AllowedFont | null {
  if (!font) return null;
  const cleaned = font
    .replace(/^['"]|['"]$/g, "")
    .trim()
    .toLowerCase();

  for (const allowed of ALLOWED_FONTS) {
    if (cleaned === allowed.toLowerCase()) {
      return allowed;
    }
  }
  return null;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

/**
 * Sanitizes HTML using DOMParser when available (browser and jsdom),
 * falling back to a safe regex-based filter in environments without DOM.
 */
export function sanitizeNoteHtml(html: string): string {
  if (!html) return "";

  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<!doctype html><body>${html}</body>`, "text/html");
      const body = doc.body;

      function cleanNode(node: Node): void {
        if (node.nodeType === 1) {
          // Element node
          const el = node as HTMLElement;
          const tagName = el.tagName.toLowerCase();

          if (STRIP_TAG_SET.has(tagName)) {
            el.remove();
            return;
          }

          // Recursively clean children first
          const children = Array.from(el.childNodes);
          for (const child of children) {
            cleanNode(child);
          }

          if (!ALLOWED_TAG_SET.has(tagName)) {
            // Unwrap non-whitelisted elements (keep text content)
            while (el.firstChild) {
              el.parentNode?.insertBefore(el.firstChild, el);
            }
            el.remove();
            return;
          }

          // Check attributes
          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            if (tagName === "span" && attr.name.toLowerCase() === "style") {
              const match = attr.value.match(/font-family\s*:\s*([^;]+)/i);
              const font = match ? canonicalFontName(match[1]) : null;
              if (font) {
                el.setAttribute("style", `font-family: ${font};`);
              } else {
                el.removeAttribute("style");
              }
            } else {
              el.removeAttribute(attr.name);
            }
          }

          // Unwrap spans that ended up with no attributes
          if (tagName === "span" && !el.getAttribute("style")) {
            while (el.firstChild) {
              el.parentNode?.insertBefore(el.firstChild, el);
            }
            el.remove();
          }
        }
      }

      const bodyChildren = Array.from(body.childNodes);
      for (const child of bodyChildren) {
        cleanNode(child);
      }

      return body.innerHTML;
    } catch {
      // Fall through to regex sanitizer on parser failure
    }
  }

  // Regex fallback (no DOMParser, e.g. server-side): weaker than the DOMParser
  // path above -- it does not catch every payload (e.g. onerror on an <img>,
  // javascript: hrefs, <object>). Safe today only because every read path
  // routes through normalizeContentToHtml/sanitizeNoteHtml before rendering;
  // nothing sanitizes on write (saveNote stores the client's HTML as-is).
  // A new consumer that renders note content without going through this
  // module would break that invariant.
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

  // Remove dangerous attributes like onclick, onload, etc.
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*(['"]).*?\1/gi, "");
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*[^ >]+/gi, "");

  return cleaned;
}

/**
 * Counts visible characters in note HTML, ignoring markup overhead
 * (tags, attributes) so the "N/1000" readout reflects what the user typed,
 * not the serialized HTML byte count.
 */
export function plainTextLength(html: string): number {
  if (!html) return 0;

  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, "text/html");
      return (doc.body.textContent ?? "").length;
    } catch {
      // Fall through to regex fallback on parser failure
    }
  }

  return html.replace(/<[^>]*>/g, "").length;
}

/**
 * Normalizes existing notes (which might be plain text) to sanitized HTML paragraphs.
 */
export function normalizeContentToHtml(content: string | null | undefined): string {
  if (!content) return "";
  const trimmed = content.trim();
  if (!trimmed) return "";

  if (isHtmlContent(trimmed)) {
    return sanitizeNoteHtml(trimmed);
  }

  // Plain-text note: preserve paragraphs separated by newlines
  const paragraphs = trimmed
    .split(/\r?\n\r?\n|\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p>${escapeHtml(line)}</p>`);

  return paragraphs.length > 0 ? paragraphs.join("") : `<p>${escapeHtml(trimmed)}</p>`;
}
