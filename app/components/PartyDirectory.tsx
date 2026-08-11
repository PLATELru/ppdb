"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { dateSortKey, formatLifeSpan, type Party } from "../../lib/parties";
import { LogoImage } from "./LogoImage";
import { RichText } from "./WikiText";

type Props = {
  countries: string[];
  parties: Party[];
};

const INDEX_PAGE_SIZE = 100;

function SeatValue({
  label,
  total,
  value,
}: {
  label: string;
  total: number | null;
  value: number | null;
}) {
  if (value == null) return null;
  return (
    <span>
      <b>{value}{total != null ? ` / ${total}` : ""}</b> {label}
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

function getUrlType() {
  if (typeof window === "undefined") return "all";
  return new URLSearchParams(window.location.search).get("type") ?? "all";
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

function updateUrlFilters(filters: { label?: string; country?: string; type?: string; status?: string }) {
  const url = new URL(window.location.href);
  Object.entries(filters).forEach(([name, value]) => {
    if (value && value !== "all") url.searchParams.set(name, value);
    else url.searchParams.delete(name);
  });
  window.history.replaceState({}, "", url);
  window.dispatchEvent(new Event("ppdb-filter-change"));
}

export function PartyDirectory({ countries, parties }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [view, setView] = useState<"cards" | "rows">("cards");
  const activeLabel = useSyncExternalStore(subscribeToUrlFilters, getUrlLabel, () => "");
  const country = useSyncExternalStore(subscribeToUrlFilters, getUrlCountry, () => "all");
  const type = useSyncExternalStore(subscribeToUrlFilters, getUrlType, () => "all");
  const status = useSyncExternalStore(subscribeToUrlFilters, getUrlStatus, () => "all");
  const paginationKey = JSON.stringify([activeLabel, country, query, sort, status, type]);
  const [pagination, setPagination] = useState({ key: paginationKey, limit: INDEX_PAGE_SIZE });
  const renderLimit = pagination.key === paginationKey ? pagination.limit : INDEX_PAGE_SIZE;

  const types = useMemo(
    () =>
      Array.from(new Set(parties.flatMap((party) => party.types))).sort((a, b) =>
        a.localeCompare(b, "en"),
      ),
    [parties],
  );

  const statuses = useMemo(
    () =>
      Array.from(new Set(parties.map((party) => party.status).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "en"),
      ),
    [parties],
  );

  const classificationLabels = useMemo(
    () =>
      Array.from(
        new Set(
          parties.flatMap((party) =>
            party.labelDetails.filter((label) => label.indexVisible).map((label) => label.name),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b, "en")),
    [parties],
  );

  function chooseLabel(label: string) {
    setQuery("");
    updateUrlFilters({ label });
    document.getElementById("party-index-heading")?.scrollIntoView({ block: "start" });
  }

  function chooseCountry(value: string) {
    setQuery("");
    updateUrlFilters({ country: value });
    document.getElementById("party-index-heading")?.scrollIntoView({ block: "start" });
  }

  function chooseType(value: string) {
    setQuery("");
    updateUrlFilters({ type: value });
    document.getElementById("party-index-heading")?.scrollIntoView({ block: "start" });
  }

  function chooseStatus(value: string) {
    setQuery("");
    updateUrlFilters({ status: value });
    document.getElementById("party-index-heading")?.scrollIntoView({ block: "start" });
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return parties
      .filter((party) => {
        const searchable = [
          party.name,
          party.nativeName,
          party.literalName,
          party.acronym,
          party.country,
          ...party.types,
          party.status,
          party.formerNames,
          ...party.labels,
          ...party.labelDetails.map((label) => label.display),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          (!needle || searchable.includes(needle)) &&
          (country === "all" || party.country === country) &&
          (type === "all" || party.types.includes(type)) &&
          (status === "all" || party.status === status) &&
          (!activeLabel ||
            party.labelDetails.some((label) => label.indexVisible && label.name === activeLabel))
        );
      })
      .sort((a, b) => {
        if (sort === "country") {
          return `${a.country}\u0000${a.name}`.localeCompare(`${b.country}\u0000${b.name}`, "en");
        }
        if (sort === "newest") {
          return dateSortKey(b.established).localeCompare(dateSortKey(a.established));
        }
        if (sort === "oldest") {
          const aDate = dateSortKey(a.established);
          const bDate = dateSortKey(b.established);
          if (!aDate) return bDate ? 1 : a.name.localeCompare(b.name, "en");
          if (!bDate) return -1;
          return aDate.localeCompare(bDate) || a.name.localeCompare(b.name, "en");
        }
        if (sort === "status") {
          return `${a.status ?? ""}\u0000${a.name}`.localeCompare(
            `${b.status ?? ""}\u0000${b.name}`,
            "en",
          );
        }
        if (sort === "label") {
          const aLabel = a.labelDetails.find((label) => label.indexVisible)?.name ?? "";
          const bLabel = b.labelDetails.find((label) => label.indexVisible)?.name ?? "";
          return `${aLabel}\u0000${a.name}`.localeCompare(
            `${bLabel}\u0000${b.name}`,
            "en",
          );
        }
        return a.name.localeCompare(b.name, "en");
      });
  }, [activeLabel, country, parties, query, sort, status, type]);

  const renderedParties = useMemo(
    () => visible.slice(0, renderLimit),
    [renderLimit, visible],
  );
  const hasMore = renderedParties.length < visible.length;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setPagination((current) => ({
          key: paginationKey,
          limit: Math.min(
            (current.key === paginationKey ? current.limit : INDEX_PAGE_SIZE) + INDEX_PAGE_SIZE,
            visible.length,
          ),
        }));
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, paginationKey, visible.length]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".party-card"));
    if (view === "rows") {
      cards.forEach((card) => card.style.removeProperty("grid-row-end"));
      return;
    }

    let animationFrame = 0;
    const measureCards = () => {
      const gridStyle = window.getComputedStyle(grid);
      const rowHeight = Number.parseFloat(gridStyle.gridAutoRows);
      const rowGap = Number.parseFloat(gridStyle.rowGap);
      if (!Number.isFinite(rowHeight) || !Number.isFinite(rowGap)) return;

      cards.forEach((card) => {
        const content = card.querySelector<HTMLElement>(".card-link");
        if (!content) return;
        const cardStyle = window.getComputedStyle(card);
        const borderHeight =
          Number.parseFloat(cardStyle.borderTopWidth) +
          Number.parseFloat(cardStyle.borderBottomWidth);
        const span = Math.ceil((content.scrollHeight + borderHeight + rowGap) / (rowHeight + rowGap));
        const nextValue = `span ${span}`;
        if (card.style.gridRowEnd !== nextValue) card.style.gridRowEnd = nextValue;
      });
    };
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measureCards);
    };

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(grid);
    cards.forEach((card) => {
      const content = card.querySelector<HTMLElement>(".card-link");
      if (content) resizeObserver.observe(content);
    });
    scheduleMeasure();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      cards.forEach((card) => card.style.removeProperty("grid-row-end"));
    };
  }, [renderedParties, view]);

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
            placeholder="Search name, acronym, country, type, status or label"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span>Country</span>
          <select
            value={country}
            onChange={(event) => {
              updateUrlFilters({ country: event.target.value });
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
          <span>Type</span>
          <select
            value={type}
            onChange={(event) => {
              updateUrlFilters({ type: event.target.value });
            }}
          >
            <option value="all">All types</option>
            {types.map((item) => (
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
              updateUrlFilters({ status: event.target.value });
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
            <option value="oldest">Oldest first</option>
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
        <>
          <div ref={gridRef} className={`party-grid ${view === "rows" ? "row-view" : ""}`}>
          {renderedParties.map((party) => (
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
                <Link className="open-record" href={`/party/${party.id}`}>Open record →</Link>
                <div className="party-card-copy">
                  <h2>
                    <Link href={`/party/${party.id}`}>
                      <RichText text={party.name} runs={party.formatting.name} />
                    </Link>
                  </h2>
                  {party.nativeName && party.nativeName !== party.name ? (
                    <p className="native-party-name">
                      <RichText text={party.nativeName} runs={party.formatting.nativeName} />
                    </p>
                  ) : null}
                  {party.literalName ? (
                    <p className="literal-party-name">
                      (<RichText text={party.literalName} runs={party.formatting.literalName} />)
                    </p>
                  ) : null}
                  <div className="party-meta">
                    {party.acronym ? (
                      <span><RichText text={party.acronym} runs={party.formatting.acronym} /></span>
                    ) : null}
                  </div>
                  <div className="context-filter-list">
                    <button type="button" onClick={() => chooseCountry(party.country)}>
                      <RichText text={party.country} runs={party.formatting.country} />
                    </button>
                    {party.types.map((item, typeIndex) => (
                      <button type="button" key={item} onClick={() => chooseType(item)}>
                        <RichText text={item} runs={party.formatting.types[typeIndex]} />
                      </button>
                    ))}
                    {party.status ? (
                      <button type="button" onClick={() => chooseStatus(party.status)}>
                        <RichText text={party.status} runs={party.formatting.status} />
                      </button>
                    ) : null}
                  </div>
                  <div className="label-list">
                    {party.labelDetails.filter((label) => label.indexVisible).map((label) => (
                      <button type="button" key={label.name} onClick={() => chooseLabel(label.name)}>
                        <RichText text={label.display} runs={label.runs} />
                      </button>
                    ))}
                  </div>
                  <div className="seat-line">
                    {party.dissolved && formatLifeSpan(party.established, party.dissolved) ? (
                      <span><b>{formatLifeSpan(party.established, party.dissolved)}</b></span>
                    ) : (
                      <>
                        <SeatValue
                          label={party.seats.legislatureName}
                          value={party.seats.legislature}
                          total={party.seats.legislatureTotal}
                        />
                        <SeatValue
                          label={party.seats.lowerHouseName}
                          value={party.seats.lowerHouse}
                          total={party.seats.lowerHouseTotal}
                        />
                        <SeatValue
                          label={party.seats.upperHouseName}
                          value={party.seats.upperHouse}
                          total={party.seats.upperHouseTotal}
                        />
                        <SeatValue label="MEPs" value={party.seats.mep} total={party.seats.mepTotal} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
          </div>
          {hasMore ? (
            <div className="directory-load-more" ref={loadMoreRef}>
              <button
                type="button"
                onClick={() =>
                  setPagination((current) => ({
                    key: paginationKey,
                    limit: Math.min(
                      (current.key === paginationKey ? current.limit : INDEX_PAGE_SIZE) +
                        INDEX_PAGE_SIZE,
                      visible.length,
                    ),
                  }))
                }
              >
                Load next {Math.min(INDEX_PAGE_SIZE, visible.length - renderedParties.length)} entries
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty-state">
          <strong>No matching records.</strong>
          <span>Try a broader search or reset one of the filters.</span>
        </div>
      )}
    </section>
  );
}
