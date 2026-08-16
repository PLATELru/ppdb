import { Fragment, type ReactNode } from "react";
import type { RichTextRun } from "../../lib/rich-text";

export function FormattedText({ text, runs }: { text: string; runs?: RichTextRun[] }) {
  const contentRuns = runs?.length
    ? runs
    : [{ text, bold: false, italic: false }];

  return contentRuns.map((run, index) => {
    let content: ReactNode = run.text;
    if (run.italic) content = <em>{content}</em>;
    if (run.bold) content = <strong>{content}</strong>;
    return <Fragment key={index}>{content}</Fragment>;
  });
}
