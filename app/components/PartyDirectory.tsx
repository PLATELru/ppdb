"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { Party } from "../../lib/parties";
import { LogoImage } from "./LogoImage";

type Props = {
  countries: string[];
  parties: Party[];
};

function SeatValue({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <span>
      <b>{value}</b> {label}
    </span>
  );
}

function getUrlLabel() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("label") ?? "";
}

function getUrlCountry() {
  if (typeof window === "undefined") return "all";
  return new URLSearchParams(window.location.search).get("country") ?? "all";
}

function getUrlStatus() {
  if (typeof window === "undefined") return "all";
  return new URLSearchParams(window.location.search).get("status") ?? "all";
}

function subscribeToUrlFilters(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("popstate", onChange);
  window.addEventListener("ppdb-filter-change", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("ppdb-filter-change", onChange);
  };
}

function updateUrlFilters(filters: { label?: string; country?: string; status?: string }) {
  const url = new URL(window.location.href);
  Object.entries(filters).forEach(([name, value]) => {
    if (value && value !== "all") url.searchParams.set(name, value);
    else url.searchParams.delete(name);
  });
  window.history.replaceState({}, "", url);
  window.dispatchEvent(new Event("ppdb-filter-change"));
}

export function PartyDirectory({ countries, parties }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [view, setView] = useState<"cards" | "rows">("cards");
  const activeLabel = useSyncExternalStore(subscribeToUrlFilters, getUrlLabel, () => "");
  const country = useSyncExternalStore(subscribeToUrlFilters, getUrlCountry, () => "all");
  const status = useSyncExternalStore(subscribeToUrlFilters, getUrlStatus, () => "all");

  const statuses = useMemo(
    () =>
      Array.from(new Set(parties.map((party) => party.status).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "en"),
      ),
    [parties],
  );

  const classificationLabels = useMemo(
    () =>
      Array.from(new Set(parties.flatMap((party) => party.labels))).sort((a, b) =>
        a.localeCompare(b, "en"),
      ),
    [parties],
  );

  function chooseLabel(label: string) {
    setQuery("");
    updateUrlFilters({ label, country: "", status: "" });
    document.getElementById("party-index-heading")?.scrollIntoView({ block: "start" });
  }

  function chooseCountry(value: string) {
    setQuery("");
    updateUrlFilters({ country: value, status: "", label: "" });
    document.getElementById("party-index-heading")?.scrollIntoView({ block: "start" });
  }

  function chooseStatus(value: string) {
    setQuery("");
    updateUrlFilters({ status: value, country: "", label: "" });
    document.getElementById("party-index-heading")?.scrollIntoView({ block: "start" });
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return parties
      .filter((party) => {
        const searchable = [
          party.name,
          party.nativeName,
          party.acronym,
          party.country,
          party.status,
          ...party.labels,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          (!needle || searchable.includes(needle)) &&
          (country === "all" || party.country === country) &&
          (status === "all" || party.status === status) &&
          (!activeLabel || party.labels.includes(activeLabel))
        );
      })
      .sort((a, b) => {
        if (sort === "country") {
          return `${a.country}\u0000${a.name}`.localeCompare(`${b.country}\u0000${b.name}`, "en");
        }
        if (sort === "newest") {
          return (b.established ?? "").localeCompare(a.established ?? "");
        }
        if (sort === "status") {
          return `${a.status ?? ""}\u0000${a.name}`.localeCompare(
            `${b.status ?? ""}\u0000${b.name}`,
            "en",
          );
        }
        if (sort === "label") {
          return `${a.labels[0] ?? ""}\u0000${a.name}`.localeCompare(
            `${b.labels[0] ?? ""}\u0000${b.name}`,
            "en",
          );
        }
        return a.name.localeCompare(b.name, "en");
      });
  }, [activeLabel, country, parties, query, sort, status]);

  return (
    <section className="panel directory-panel" aria-labelledby="party-index-heading">
      <div className="section-label" id="party-index-heading">
        Index
      </div>

      <div className="directory-summary">
        <div>
          <strong>{visible.length}</strong> of {parties.length} party records
        </div>
        <div>{countries.length} countries represented</div>
      </div>

      <div className="toolbar">
        <label className="search-field">
          <span className="sr-only">Search parties</span>
          <input
            type="search"
            placeholder="Search name, acronym, country, status or label"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span>Country</span>
          <select
            value={country}
            onChange={(event) => {
              updateUrlFilters({ country: event.target.value, label: "" });
            }}
          >
            <option value="all">All countries</option>
            {countries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => {
              updateUrlFilters({ status: event.target.value, label: "" });
            }}
          >
            <option value="all">All statuses</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Label</span>
          <select value={activeLabel} onChange={(event) => chooseLabel(event.target.value)}>
            <option value="">All labels</option>
            {classificationLabels.map((item) => (
              <option key={`label-${item}`} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="name">Name A–Z</option>
            <option value="country">Country A–Z</option>
            <option value="status">Status A–Z</option>
            <option value="label">First label A–Z</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
        <div className="view-switch" aria-label="Display style">
          <button
            type="button"
            className={view === "cards" ? "active" : ""}
            onClick={() => setView("cards")}
          >
            Cards
          </button>
          <button
            type="button"
            className={view === "rows" ? "active" : ""}
            onClick={() => setView("rows")}
          >
            Rows
          </button>
        </div>
      </div>

      {visible.length ? (
        <div className={`party-grid ${view === "rows" ? "row-view" : ""}`}>
          {visible.map((party) => (
            <article
              className="party-card"
              key={party.id}
              style={{ "--party-color": party.color } as React.CSSProperties}
            >
              <div className="card-link">
                <Link className="party-logo-wrap" href={`/party/${party.id}`} aria-label={`View ${party.name}`}>
                  <LogoImage
                    src={party.logo}
                    alt=""
                    className="party-logo"
                    fallback={party.acronym ?? party.name.slice(0, 2)}
                    fallbackClassName="logo-placeholder"
                  />
                </Link>
                <div className="party-card-copy">
                  <h2><Link href={`/party/${party.id}`}>{party.name}</Link></h2>
                  {party.nativeName && party.nativeName !== party.name ? <p>{party.nativeName}</p> : null}
                  <div className="party-meta">
                    {party.acronym ? <span>{party.acronym}</span> : null}
                  </div>
                  <div className="context-filter-list">
                    <button type="button" onClick={() => chooseCountry(party.country)}>{party.country}</button>
                    {party.status ? (
                      <button type="button" onClick={() => chooseStatus(party.status)}>{party.status}</button>
                    ) : null}
                  </div>
                  <div className="label-list">
                    {party.labels.slice(0, 3).map((label) => (
                      <button type="button" key={label} onClick={() => chooseLabel(label)}>{label}</button>
                    ))}
                  </div>
                  <div className="seat-line">
                    <SeatValue label="lower" value={party.seats.lowerHouse} />
                    <SeatValue label="upper" value={party.seats.upperHouse} />
                    <SeatValue label="MEPs" value={party.seats.mep} />
                  </div>
                </div>
                <Link className="open-record" href={`/party/${party.id}`}>Open record →</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No matching records.</strong>
          <span>Try a broader search or reset one of the filters.</span>
        </div>
      )}
    </section>
  );
}
