import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { getParty, type RichTextRun } from "../../lib/parties";

function InlineWikiText({ text }: { text: string }) {
  const pattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    const [, id, label] = match;
    const linkedParty = getParty(id);
    parts.push(
      linkedParty ? (
        <span className="party-inline-link" key={`${id}-${match.index}`}>
          <span
            className="party-link-swatch"
            style={{ "--party-link-color": linkedParty.color } as CSSProperties}
            aria-hidden="true"
          />
          <Link href={`/party/${id}`}>{label ?? id}</Link>
        </span>
      ) : (
        label ?? id
      ),
    );
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return parts.map((part, index) => <Fragment key={index}>{part}</Fragment>);
}

function StyledRun({ run }: { run: RichTextRun }) {
  let content: ReactNode = <InlineWikiText text={run.text} />;
  if (run.italic) content = <em>{content}</em>;
  if (run.bold) content = <strong>{content}</strong>;
  return content;
}

function paragraphRuns(runs: RichTextRun[]) {
  const paragraphs: RichTextRun[][] = [[]];
  for (const run of runs) {
    const parts = run.text.split(/(\n\s*\n)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\n\s*\n$/.test(part)) {
        if (paragraphs.at(-1)?.length) paragraphs.push([]);
      } else {
        paragraphs.at(-1)?.push({ ...run, text: part });
      }
    }
  }
  return paragraphs.filter((paragraph) => paragraph.length);
}

export function RichText({
  text,
  runs,
  paragraphs = false,
}: {
  text: string;
  runs?: RichTextRun[];
  paragraphs?: boolean;
}) {
  const contentRuns = runs?.length
    ? runs
    : [{ text, bold: false, italic: false }];

  if (!paragraphs) {
    return contentRuns.map((run, index) => <StyledRun key={index} run={run} />);
  }

  return paragraphRuns(contentRuns).map((paragraph, paragraphIndex) => (
    <p key={paragraphIndex}>
      {paragraph.map((run, runIndex) => <StyledRun key={runIndex} run={run} />)}
    </p>
  ));
}

export function WikiText({ text, runs }: { text: string; runs?: RichTextRun[] }) {
  return <RichText text={text} runs={runs} paragraphs />;
}
