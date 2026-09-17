import { isHtmlContent, normalizeContentToHtml } from "./sanitize";

/**
 * Late-fetch merge rule (Issue 183):
 * If the user typed before the fetched notes arrived, the result must be:
 *   TYPED CONTENT + FETCHED CONTENT
 * — typed content PREPENDED, never overwritten.
 *
 * Merges typed and fetched content while respecting rich-text HTML and plain-text formats.
 */
export function mergeNoteContents({
  typedContent,
  fetchedContent,
}: {
  typedContent: string;
  fetchedContent: string;
}): string {
  const trimmedTyped = typedContent.trim();
  const trimmedFetched = fetchedContent.trim();

  // If typed is empty or just an empty paragraph, use fetched content
  if (!trimmedTyped || trimmedTyped === "<p></p>") {
    return fetchedContent;
  }

  // If fetched is empty or just an empty paragraph, keep typed content
  if (!trimmedFetched || trimmedFetched === "<p></p>") {
    return typedContent;
  }

  const isTypedHtml = isHtmlContent(trimmedTyped);
  const isFetchedHtml = isHtmlContent(trimmedFetched);

  if (isTypedHtml || isFetchedHtml) {
    const normTyped = isTypedHtml
      ? trimmedTyped.replace(/<p><\/p>$/i, "").trim()
      : normalizeContentToHtml(trimmedTyped);
    const normFetched = isFetchedHtml
      ? trimmedFetched.replace(/^<p><\/p>/i, "").trim()
      : normalizeContentToHtml(trimmedFetched);

    return `${normTyped}${normFetched}`;
  }

  // Plain-text merge: prepends typed content with paragraph separation
  return `${trimmedTyped}\n\n${trimmedFetched}`;
}
