// frontend/utils/formatters.js

/**
 * A centralized utility to format raw text from the AI into semantic HTML.
 * It correctly handles paragraphs, line breaks, and basic markdown.
 * @param {string | null | undefined} rawText - The raw string from the AI.
 * @returns {string} - A clean, semantic HTML string.
 */
export function formatNarrative(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  // Pre-processing: Unescape critical characters from the JSON string payload.
  // 1. Convert literal "\\n" into actual newline characters.
  // 2. Convert escaped quotes `\"` into standard quotes `"`.
  const unescapedText = rawText.replace(/\\n/g, "\n").replace(/\\"/g, '"');

  const processedText = unescapedText
    .trim()
    // Then, handle the markdown conversions.
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Now, split into paragraphs and process each one.
  const paragraphs = processedText.split(/\n\n+/);

  return paragraphs
    .map((p) => {
      const trimmedParagraph = p.trim();
      if (!trimmedParagraph) {
        return "";
      }
      // Within each paragraph, convert single newlines to <br> tags.
      const contentWithBreaks = trimmedParagraph.replace(/\n/g, "<br>");
      return `<p>${contentWithBreaks}</p>`;
    })
    .join("");
}
