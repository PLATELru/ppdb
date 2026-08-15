type LinkedParty = {
  acronym?: string | null;
  name?: string | null;
};

export type PartyLinkMarkup = {
  id: string;
  label: string | null;
  color: string | null;
};

export function normalizePartyLinkColor(value?: string | null) {
  const color = value?.trim() ?? "";
  return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(color) ? color : null;
}

export function parsePartyLinkMarkup(value: string): PartyLinkMarkup | null {
  const parts = value.split("|");
  if (parts.length > 3) return null;
  const id = parts[0]?.trim() ?? "";
  if (!id) return null;

  const label = parts.length >= 2 ? parts[1].trim() || null : null;
  const rawColor = parts.length === 3 ? parts[2].trim() : "";
  const color = rawColor ? normalizePartyLinkColor(rawColor) : null;
  if (rawColor && !color) return null;
  return { id, label, color };
}

export function partyLinkColor(
  explicitColor?: string | null,
  redirectColor?: string | null,
  partyColor?: string | null,
) {
  return normalizePartyLinkColor(explicitColor) ?? redirectColor ?? partyColor ?? null;
}

export function partyLinkLabel(
  party: LinkedParty | null | undefined,
  id: string,
  explicitLabel?: string | null,
) {
  return explicitLabel?.trim() || party?.acronym || party?.name || id;
}
