function validDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function normalizeFormerLogoDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (/^\d{4}$/.test(raw)) return raw;

  const isoMonth = /^(\d{4})-(\d{2})$/.exec(raw);
  if (isoMonth) {
    const month = Number(isoMonth[2]);
    return month >= 1 && month <= 12 ? raw : null;
  }

  const monthYear = /^(\d{1,2})-(\d{4})$/.exec(raw);
  if (monthYear) {
    const month = Number(monthYear[1]);
    return month >= 1 && month <= 12
      ? `${monthYear[2]}-${monthYear[1].padStart(2, "0")}`
      : null;
  }

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (isoDate) {
    const year = Number(isoDate[1]);
    const month = Number(isoDate[2]);
    const day = Number(isoDate[3]);
    return validDate(year, month, day) ? raw : null;
  }

  const europeanDate = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(raw);
  if (europeanDate) {
    const day = Number(europeanDate[1]);
    const month = Number(europeanDate[2]);
    const year = Number(europeanDate[3]);
    return validDate(year, month, day)
      ? `${europeanDate[3]}-${europeanDate[2].padStart(2, "0")}-${europeanDate[1].padStart(2, "0")}`
      : null;
  }

  return null;
}

export function parseFormerLogos(value, context = "FORMER_LOGO") {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split("|");
      if (parts.length !== 3) {
        throw new Error(
          `${context}, line ${index + 1}: expected logo|comment|until.`,
        );
      }

      const [rawUrl, rawComment, rawUntil] = parts;
      const url = rawUrl.trim();
      const comment = rawComment.trim() || null;
      const untilText = rawUntil.trim();
      const until = normalizeFormerLogoDate(untilText);

      if (!url) {
        throw new Error(`${context}, line ${index + 1}: the logo path or URL is empty.`);
      }
      if (untilText && !until) {
        throw new Error(`${context}, line ${index + 1}: invalid until date “${untilText}”.`);
      }

      return { url, comment, until };
    });
}
