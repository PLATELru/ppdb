import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async () => {
  const entries = await getCollection("parties");
  const data = entries
    .map((entry) => ({ ...entry.data, routeId: entry.id }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
};
