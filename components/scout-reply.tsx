import type { ReactNode } from "react";

const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

export function normalizeScoutMarkdown(source: string): string {
  return source
    .replace(EMOJI_PATTERN, "")
    .replace(/\r\n/g, "\n")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\s+-\s+\*\*/g, "\n- **")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter((token) => token.length > 0);
  return tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return <strong key={index}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return <code key={index}>{token.slice(1, -1)}</code>;
    }
    return <span key={index}>{token}</span>;
  });
}

export function ScoutReply({ text }: { text: string }) {
  const lines = normalizeScoutMarkdown(text).split("\n");
  const nodes: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    nodes.push(<p key={`p-${nodes.length}`}>{renderInline(paragraph.join(" "))}</p>);
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`}>
        {list.map((item, index) => <li key={index}>{renderInline(item)}</li>)}
      </ul>,
    );
    list = [];
  }

  for (const line of lines) {
    if (!line.trim()) {
      flushList();
      flushParagraph();
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushList();
  flushParagraph();

  return <div className="scout-reply">{nodes}</div>;
}
