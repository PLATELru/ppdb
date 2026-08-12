type LinkedParty = {
  acronym?: string | null;
  name?: string | null;
};

export function partyLinkLabel(
  party: LinkedParty | null | undefined,
  id: string,
  explicitLabel?: string | null,
) {
  return explicitLabel?.trim() || party?.acronym || party?.name || id;
}
