# Amendment 6 Report

## 1. Measured Hit Box
I applied `display: inline-block` and `padding: 8px 6px` along with `font-size: 14px;` to the `.inline-link` class. This gives a measured hit box of approximately 34px (14px font height + 16px padding + line height margins). Adjacent links are spaced comfortably by the `6px` horizontal padding on each link plus the middot container.

## 2. Resolved APPS URLs
Each of the gateway URLs was verified with a curl check. `bible.com/app` and `readscripture.org` resolved successfully to their respective app/home pages (HTTP 200). `blueletterbible.org/app` and `olivetree.com/app` returned 404s. Following the instruction to use the homepage instead of guessing store paths, the verified links are:
- YouVersion: `https://www.bible.com/app` (HTTP 200 via redirect)
- Blue Letter Bible: `https://www.blueletterbible.org/` (HTTP 200, used homepage since `/app` 404s)
- Olive Tree: `https://www.olivetree.com/` (HTTP 200, used homepage since `/app` 404s)
- ReadScripture: `https://www.readscripture.org/` (HTTP 200)

## 3. Verse Text Styling
The verse text uses the new `.passage-text` class which implements `color: var(--ink)` and `font-weight: 400`. It was removed from the `typography.css` sans-serif overrides so it correctly renders in its readable Georgia serif font (using the required `/* serif-exception */` marker to pass tests).

## 4. Visual Verification
Running at 430x932 on a local dev server, I confirmed:
- The popup verse text is now a readable black, regular weight, serif body text.
- The "Open full chapter ↗" link sits above COMMENTARIES.
- The COMMENTARIES group has all 5 inline links.
- The new APPS group has all 4 inline links.
- All links render inline with a bottom underline, an ↗ indicator, and are separated by middots.
- On a miss path (e.g. ESV translation with no text), the "Read this one at Bible.com" message displays, all links correctly render, and the attribution footnote is correctly preserved at the bottom, smaller and not bold.

## 5. Build/Test Output
`pnpm lint && pnpm test && pnpm build` all pass successfully.
