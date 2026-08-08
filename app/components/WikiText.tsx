import Link from "next/link";
import { Fragment } from "react";
import { getParty } from "../../lib/parties";

function InlineWikiText({ text }: { text: string }) {
  const pattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const parts = [];
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
            style={{ "--party-link-color": linkedParty.color } as React.CSSProperties}
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

export function WikiText({ text }: { text: string }) {
  return text.split(/\n\s*\n/).map((paragraph, index) => (
    <p key={index}>
      <InlineWikiText text={paragraph} />
    </p>
  ));
}
