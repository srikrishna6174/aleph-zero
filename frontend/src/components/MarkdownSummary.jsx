import { Fragment } from "react";
import { Sparkles, Quote } from "lucide-react";

/**
 * Renders inline Markdown formatting: **bold**, *italic*, `code`, and safe http(s) links.
 */
function renderInline(text) {
  if (!text) return null;
  const tokens = [];
  const regex =
    /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  let lastIdx = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      tokens.push(
        <Fragment key={key++}>{text.slice(lastIdx, match.index)}</Fragment>,
      );
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      tokens.push(
        <strong key={key++} className="font-semibold text-stone-900">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      tokens.push(
        <em key={key++} className="italic text-stone-700">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      tokens.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-800 font-mono text-[12px]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        tokens.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:text-blue-800 underline underline-offset-2"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        tokens.push(<Fragment key={key++}>{token}</Fragment>);
      }
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    tokens.push(<Fragment key={key++}>{text.slice(lastIdx)}</Fragment>);
  }

  return tokens;
}

/**
 * Parses Gemini's structured summary Markdown into semantic blocks.
 */
function parseBlocks(markdown) {
  const lines = (markdown || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let listItems = [];
  let listOrdered = false;
  let paragraphLines = [];
  let quoteLines = [];
  let currentSection = "";

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      const text = paragraphLines.join(" ").trim();
      if (text) {
        blocks.push({ type: "paragraph", text, section: currentSection });
      }
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({
        type: "list",
        ordered: listOrdered,
        items: listItems,
        section: currentSection,
      });
      listItems = [];
    }
  };

  const flushQuote = () => {
    if (quoteLines.length > 0) {
      blocks.push({
        type: "quote",
        text: quoteLines.join(" ").trim(),
        section: currentSection,
      });
      quoteLines = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    const boldHeadingMatch = line.match(
      /^\*\*(TL;DR|Key Points|Details|Notable Quotes|Likely Topics|Note)\*\*:?\s*(.*)$/i,
    );

    if (headingMatch) {
      flushParagraph();
      flushList();
      flushQuote();
      const title = headingMatch[1].replace(/\*\*/g, "").trim();
      currentSection = title.toLowerCase();
      blocks.push({ type: "heading", text: title });
      continue;
    }

    if (boldHeadingMatch) {
      flushParagraph();
      flushList();
      flushQuote();
      const title = boldHeadingMatch[1].trim();
      currentSection = title.toLowerCase();
      blocks.push({ type: "heading", text: title });
      if (boldHeadingMatch[2]) {
        blocks.push({
          type: "paragraph",
          text: boldHeadingMatch[2].trim(),
          section: currentSection,
        });
      }
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      flushList();
      quoteLines.push(line.replace(/^>\s*/, ""));
      continue;
    }

    const ulMatch = line.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      flushQuote();
      if (listItems.length > 0 && listOrdered) flushList();
      listOrdered = false;
      listItems.push(ulMatch[1]);
      continue;
    }

    const olMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      flushQuote();
      if (listItems.length > 0 && !listOrdered) flushList();
      listOrdered = true;
      listItems.push(olMatch[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  flushQuote();

  return blocks;
}

export default function MarkdownSummary({ content }) {
  const blocks = parseBlocks(content);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed text-stone-700">
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          const isTldr = block.text.toLowerCase().includes("tl;dr");
          return (
            <div
              key={idx}
              className={`flex items-center gap-2 ${idx > 0 ? "pt-2" : ""}`}
            >
              {isTldr && (
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              )}
              <h4
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  isTldr ? "text-blue-700" : "text-stone-500"
                }`}
              >
                {block.text}
              </h4>
              <div className="h-px flex-1 bg-stone-200/80" />
            </div>
          );
        }

        if (block.type === "paragraph") {
          const isTldrSection = block.section.includes("tl;dr");
          if (isTldrSection) {
            return (
              <div
                key={idx}
                className="rounded-xl px-4 py-3 bg-[#f2f6fc] border border-[#dce6f7] border-l-[3px] border-l-blue-600 text-stone-800 text-[13.5px] leading-relaxed font-medium"
              >
                {renderInline(block.text)}
              </div>
            );
          }
          return (
            <p key={idx} className="text-stone-700 leading-relaxed">
              {renderInline(block.text)}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={idx} className="space-y-2 pl-0.5">
              {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  <span className="text-stone-700 leading-relaxed">
                    {renderInline(item)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={idx}
              className="flex items-start gap-2.5 rounded-xl px-4 py-3 bg-stone-50 border border-stone-200 border-l-[3px] border-l-stone-400 text-stone-700 italic"
            >
              <Quote className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-1" />
              <span>{renderInline(block.text)}</span>
            </blockquote>
          );
        }

        return null;
      })}
    </div>
  );
}
