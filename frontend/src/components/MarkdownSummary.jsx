import { Fragment } from "react";
import { Sparkles, Quote } from "lucide-react";

/**
 * Renders inline Markdown formatting: **bold**, *italic*, `code`, and safe http(s) links.
 */
function renderInline(text) {
  if (!text) return null;
  const tokens = [];
  // Match **bold**, *italic*, `code`, or [label](url)
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
        <strong key={key++} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      tokens.push(
        <em key={key++} className="italic text-zinc-200">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      tokens.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-white/10 text-blue-300 font-mono text-[12px]"
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
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
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

    // Markdown headings: #, ##, ### or standalone bold section labels like "**TL;DR**:"
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

    // Blockquotes
    if (line.startsWith(">")) {
      flushParagraph();
      flushList();
      quoteLines.push(line.replace(/^>\s*/, ""));
      continue;
    }

    // Unordered list items
    const ulMatch = line.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      flushQuote();
      if (listItems.length > 0 && listOrdered) flushList();
      listOrdered = false;
      listItems.push(ulMatch[1]);
      continue;
    }

    // Ordered list items
    const olMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      flushQuote();
      if (listItems.length > 0 && !listOrdered) flushList();
      listOrdered = true;
      listItems.push(olMatch[1]);
      continue;
    }

    // Plain paragraph text
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
    <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          const isTldr = block.text.toLowerCase().includes("tl;dr");
          return (
            <div
              key={idx}
              className={`flex items-center gap-2 ${idx > 0 ? "pt-2" : ""}`}
            >
              {isTldr && (
                <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )}
              <h4
                className={`text-xs font-bold uppercase tracking-wider ${
                  isTldr ? "text-blue-300" : "text-zinc-200"
                }`}
              >
                {block.text}
              </h4>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
          );
        }

        if (block.type === "paragraph") {
          const isTldrSection = block.section.includes("tl;dr");
          if (isTldrSection) {
            return (
              <div
                key={idx}
                className="rounded-lg px-3.5 py-2.5 bg-blue-500/10 border border-blue-500/20 text-zinc-100 text-[13.5px] leading-relaxed font-medium"
              >
                {renderInline(block.text)}
              </div>
            );
          }
          return (
            <p key={idx} className="text-zinc-300 leading-relaxed">
              {renderInline(block.text)}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={idx} className="space-y-2 pl-1">
              {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400/80 shrink-0 shadow-[0_0_6px_rgba(96,165,250,0.6)]" />
                  <span className="text-zinc-300 leading-relaxed">
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
              className="flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 bg-white/[0.03] border-l-2 border-indigo-400/70 text-zinc-200 italic"
            >
              <Quote className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-1" />
              <span>{renderInline(block.text)}</span>
            </blockquote>
          );
        }

        return null;
      })}
    </div>
  );
}
