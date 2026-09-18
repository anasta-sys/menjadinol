const ALLOWED_TAGS =
  new Set([
    "b",
    "strong",
    "i",
    "em",
    "s",
    "strike",
    "p",
    "div",
    "br",
    "span",
    "blockquote",
  ]);

const ALLOWED_ALIGN =
  new Set([
    "left",
    "center",
    "right",
    "justify",
  ]);

const ALLOWED_QUOTE_COLORS =
  new Set([
    "gold",
    "green",
    "dark-green",
    "gray",
    "brown",
    "red",
    "blue",
  ]);

export function sanitizeRichText(
  input:string,
  maxLength = 50000
) {
  let value =
    String(input ?? "")
      .slice(0,maxLength);

  // Remove dangerous blocks entirely.
  value = value
    .replace(
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      ""
    )
    .replace(
      /<style[\s\S]*?>[\s\S]*?<\/style>/gi,
      ""
    )
    .replace(
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      ""
    )
    .replace(
      /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
      ""
    )
    .replace(
      /<embed[\s\S]*?>/gi,
      ""
    );

  value = value.replace(
    /<\/?([a-z0-9]+)([^>]*)>/gi,
    (
      full,
      tagRaw:string,
      attrs:string
    ) => {
      const tag =
        tagRaw.toLowerCase();

      if(!ALLOWED_TAGS.has(tag)) {
        return "";
      }

      if(full.startsWith("</")) {
        return `</${tag}>`;
      }

      if(tag === "br") {
        return "<br>";
      }

      // Browser justify commands commonly emit align="" or style="text-align:..."
      const alignMatch =
        attrs.match(
          /\balign\s*=\s*["']?(left|center|right|justify)["']?/i
        );

      const styleMatch =
        attrs.match(
          /text-align\s*:\s*(left|center|right|justify)/i
        );

      const align =
        (
          alignMatch?.[1] ??
          styleMatch?.[1] ??
          ""
        ).toLowerCase();

      const safeAlign =
        ALLOWED_ALIGN.has(align)
          ? ` style="text-align:${align}"`
          : "";

      let safeQuoteColor = "";

      if(tag === "blockquote") {
        const quoteColorMatch =
          attrs.match(
            /\bdata-quote-color\s*=\s*["']?(gold|green|dark-green|gray|brown|red|blue)["']?/i
          );

        const quoteColor =
          (quoteColorMatch?.[1] ?? "").toLowerCase();

        if(ALLOWED_QUOTE_COLORS.has(quoteColor)) {
          safeQuoteColor =
            ` data-quote-color="${quoteColor}"`;
        }
      }

      return `<${tag}${safeAlign}${safeQuoteColor}>`;
    }
  );

  return value;
}

export function richTextHasContent(
  value:string
) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi," ")
    .replace(/<[^>]+>/g,"")
    .replace(/&nbsp;/gi," ")
    .trim()
    .length > 0;
}
