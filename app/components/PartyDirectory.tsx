"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { dateSortKey, formatLifeSpan } from "../../lib/party-dates";
import type { PartyIndexEntry, PartyIndexPayload } from "../../lib/party-index";
import { comparePartiesBySeats } from "../../lib/party-sort";
import { FormattedText as RichText } from "./FormattedText";
import { LogoImage } from "./LogoImage";

type Props = {
  countries: string[];
  initialParties: PartyIndexEntry[];
  totalCount: number;
};

const INDEX_PAGE_SIZE = 100;
const INDEX_ENTRY_ID_KEY = "ppdbIndexEntryId";
const INDEX_STATE_KEY = "ppdbIndexState";
const INDEX_SESSION_PREFIX = "ppdb:index-state:";
const INDEX_URL_SESSION_PREFIX = "ppdb:index-state:url:";
const INDEX_SORTS = new Set(["seats", "name", "country", "status", "label", "newest", "oldest"]);

type IndexHistoryState = {
  query: string;
  sort: string;
  view: "cards" | "rows";
  limit: number;
  scrollY: number;
};

function getIndexEntryId() {
  const historyState = window.history.state ?? {};
  const existing = historyState[INDEX_ENTRY_ID_KEY];
  if (typeof existing === "string" && existing) return existing;
  const entryId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  window.history.replaceState(
    { ...historyState, [INDEX_ENTRY_ID_KEY]: entryId },
    "",
    window.location.href,
  );
  return entryId;
}

function normalizeIndexHistoryState(value: unknown): IndexHistoryState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<IndexHistoryState>;
  if (
    typeof state.query !== "string" ||
    typeof state.sort !== "string" ||
    !INDEX_SORTS.has(state.sort) ||
    (state.view !== "cards" && state.view !== "rows") ||
    !Number.isFinite(state.limit) ||
    !Number.isFinite(state.scrollY)
  ) return null;

  return {
    query: state.query,
    sort: state.sort,
    view: state.view,
    limit: Math.max(INDEX_PAGE_SIZE, Math.floor(state.limit ?? INDEX_PAGE_SIZE)),
    scrollY: Math.max(0, state.scrollY ?? 0),
  };
}

function readIndexHistoryState() {
  if (window.location.hash === "#party-index-heading") return null;
  const historyState = window.history.state ?? {};
  const direct = normalizeIndexHistoryState(historyState[INDEX_STATE_KEY]);
  if (direct) return direct;

  const entryId = historyState[INDEX_ENTRY_ID_KEY];
  try {
    const entryState = typeof entryId === "string" && entryId
      ? normalizeIndexHistoryState(
          JSON.parse(window.sessionStorage.getItem(`${INDEX_SESSION_PREFIX}${entryId}`) ?? "null"),
        )
      : null;
    if (entryState) return entryState;
    return normalizeIndexHistoryState(
      JSON.parse(
        window.sessionStorage.getItem(
          `${INDEX_URL_SESSION_PREFIX}${window.location.pathname}${window.location.search}`,
        ) ?? "null",
      ),
    );
  } catch {
    return null;
  }
}

function writeIndexHistoryState(state: IndexHistoryState) {
  const entryId = getIndexEntryId();
  window.history.replaceState(
    { ...(window.history.state ?? {}), [INDEX_STATE_KEY]: state },
    "",
    window.location.href,
  );
  try {
    window.sessionStorage.setItem(`${INDEX_SESSION_PREFIX}${entryId}`, JSON.stringify(state));
    window.sessionStorage.setItem(
      `${INDEX_URL_SESSION_PREFIX}${window.location.pathname}${window.location.search}`,
      JSON.stringify(state),
    );
  } catch {
    // History state remains the primary restoration mechanism when storage is unavailable.
  }
}

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
  window.history.replaceState({ ...(window.history.state ?? {}) }, "", url);
  window.dispatchEvent(new Event("ppdb-filter-change"));
}

export function PartyDirectory({ countries, initialParties, totalCount }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef<number | null>(null);
  const backToTopVisibleRef = useRef(false);
  const [parties, setParties] = useState(initialParties);
  const [indexStatus, setIndexStatus] = useState<"loading" | "ready" | "error">(
    initialParties.length >= totalCount ? "ready" : "loading",
  );
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("seats");
  const [view, setView] = useState<"cards" | "rows">("cards");
  const [historyReady, setHistoryReady] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const activeLabel = useSyncExternalStore(subscribeToUrlFilters, getUrlLabel, () => "");
  const country = useSyncExternalStore(subscribeToUrlFilters, getUrlCountry, () => "all");
  const type = useSyncExternalStore(subscribeToUrlFilters, getUrlType, () => "all");
  const status = useSyncExternalStore(subscribeToUrlFilters, getUrlStatus, () => "all");
  const deferredQuery = useDeferredValue(query);
  const deferredActiveLabel = useDeferredValue(activeLabel);
  const deferredCountry = useDeferredValue(country);
  const deferredType = useDeferredValue(type);
  const deferredStatus = useDeferredValue(status);
  const paginationKey = JSON.stringify([
    deferredActiveLabel,
    deferredCountry,
    deferredQuery,
    sort,
    deferredStatus,
    deferredType,
  ]);
  const [pagination, setPagination] = useState({ key: paginationKey, limit: INDEX_PAGE_SIZE });
  const renderLimit = pagination.key === paginationKey ? pagination.limit : INDEX_PAGE_SIZE;

  useEffect(() => {
    if (initialParties.length >= totalCount) return;

    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    void fetch(`${basePath}/data/party-index.json`, {
      cache: "force-cache",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Index request failed with ${response.status}`);
        return response.json() as Promise<PartyIndexPayload>;
      })
      .then((payload) => {
        if (!Array.isArray(payload.parties) || payload.count !== totalCount) {
          throw new Error("The index payload does not match the current database.");
        }
        setParties(payload.parties);
        setIndexStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setIndexStatus("error");
      });

    return () => controller.abort();
  }, [initialParties.length, loadAttempt, totalCount]);

  useLayoutEffect(() => {
    const restored = readIndexHistoryState();
    let cancelled = false;
    window.queueMicrotask(() => {
      if (cancelled) return;
      if (restored) {
        setQuery(restored.query);
        setSort(restored.sort);
        setView(restored.view);
        pendingScrollRef.current = restored.scrollY;
        setPagination({
          key: JSON.stringify([
            getUrlLabel(),
            getUrlCountry(),
            restored.query,
            restored.sort,
            getUrlStatus(),
            getUrlType(),
          ]),
          limit: restored.limit,
        });
      }
      setHistoryReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rememberIndexState = useCallback(() => {
    if (!historyReady || pendingScrollRef.current != null) return;
    writeIndexHistoryState({
      query,
      sort,
      view,
      limit: renderLimit,
      scrollY: window.scrollY,
    });
  }, [historyReady, query, renderLimit, sort, view]);

  const rememberPartyPosition = useCallback((partyId: string) => {
    const url = new URL(window.location.href);
    url.hash = `party-${partyId}`;
    window.history.replaceState({ ...(window.history.state ?? {}) }, "", url);
    rememberIndexState();
  }, [rememberIndexState]);

  useEffect(() => {
    rememberIndexState();
  }, [rememberIndexState]);

  useEffect(() => {
    if (!historyReady) return;
    let animationFrame = 0;
    const saveScroll = () => {
      const nextBackToTopVisible = window.scrollY > Math.max(500, window.innerHeight * 0.75);
      if (backToTopVisibleRef.current !== nextBackToTopVisible) {
        backToTopVisibleRef.current = nextBackToTopVisible;
        setShowBackToTop(nextBackToTopVisible);
      }
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(rememberIndexState);
    };
    saveScroll();
    window.addEventListener("scroll", saveScroll, { passive: true });
    window.addEventListener("pagehide", rememberIndexState);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", saveScroll);
      window.removeEventListener("pagehide", rememberIndexState);
    };
  }, [historyReady, rememberIndexState]);

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
    const needle = deferredQuery.trim().toLowerCase();
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
          ...party.labelDetails.map((label) => label.display),
          ...party.alliances.map((alliance) => alliance.display),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          (!needle || searchable.includes(needle)) &&
          (deferredCountry === "all" || party.country === deferredCountry) &&
          (deferredType === "all" || party.types.includes(deferredType)) &&
          (deferredStatus === "all" || party.status === deferredStatus) &&
          (!deferredActiveLabel ||
            party.labelDetails.some(
              (label) => label.indexVisible && label.name === deferredActiveLabel,
            ))
        );
      })
      .sort((a, b) => {
        if (sort === "seats") {
          return comparePartiesBySeats(a, b);
        }
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
  }, [
    deferredActiveLabel,
    deferredCountry,
    deferredQuery,
    deferredStatus,
    deferredType,
    parties,
    sort,
  ]);

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

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".party-card"));
    grid.classList.remove("masonry-ready");
    if (view === "rows") {
      cards.forEach((card) => card.style.removeProperty("grid-row-end"));
      return;
    }

    grid.classList.add("masonry-ready");

    let animationFrame = 0;
    const measureCards = () => {
      const gridStyle = window.getComputedStyle(grid);
      const rowHeight = Number.parseFloat(gridStyle.gridAutoRows);
      const rowGap = Number.parseFloat(gridStyle.rowGap);
      if (!Number.isFinite(rowHeight) || !Number.isFinite(rowGap)) return;

      const firstCardStyle = cards[0] ? window.getComputedStyle(cards[0]) : null;
      const borderHeight = firstCardStyle
        ? Number.parseFloat(firstCardStyle.borderTopWidth) +
          Number.parseFloat(firstCardStyle.borderBottomWidth)
        : 0;
      const measurements = cards.map((card) => {
        const content = card.querySelector<HTMLElement>(".card-link");
        if (!content) return null;
        const span = Math.ceil((content.scrollHeight + borderHeight + rowGap) / (rowHeight + rowGap));
        return { card, nextValue: `span ${span}` };
      });

      measurements.forEach((measurement) => {
        if (!measurement) return;
        const { card, nextValue } = measurement;
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
    measureCards();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      grid.classList.remove("masonry-ready");
      cards.forEach((card) => card.style.removeProperty("grid-row-end"));
    };
  }, [renderedParties, view]);

  useEffect(() => {
    if (!historyReady || pendingScrollRef.current == null) return;
    const targetScrollY = pendingScrollRef.current;
    let attempts = 0;
    let animationFrame = 0;
    const restoreScroll = () => {
      const anchorId = decodeURIComponent(window.location.hash.slice(1));
      const anchor = anchorId ? document.getElementById(anchorId) : null;
      const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const anchorScrollY = anchor
        ? window.scrollY + anchor.getBoundingClientRect().top - window.innerHeight / 3
        : 0;
      const desiredScrollY = targetScrollY > 0 ? targetScrollY : anchorScrollY;
      window.scrollTo({
        top: Math.min(Math.max(0, desiredScrollY), maxScrollY),
        behavior: "auto",
      });
      attempts += 1;
      if (attempts < 12 && (!anchor || window.scrollY < desiredScrollY - 2)) {
        animationFrame = window.requestAnimationFrame(restoreScroll);
      } else {
        pendingScrollRef.current = null;
      }
    };
    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = window.requestAnimationFrame(restoreScroll);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [historyReady, renderedParties.length, view]);

  return (
    <section
      className="panel directory-panel"
      aria-busy={indexStatus === "loading"}
      aria-labelledby="party-index-heading"
    >
      <div className="section-label" id="party-index-heading">
        Index
      </div>

      <div className="directory-summary">
        <div>
          <strong>{visible.length}</strong> of {totalCount} party records
        </div>
        <div className="index-load-status" role="status">
          <span>{countries.length} countries represented</span>
          {indexStatus === "loading" ? <span>Loading full index…</span> : null}
          {indexStatus === "error" ? (
            <button
              type="button"
              onClick={() => {
                setIndexStatus("loading");
                setLoadAttempt((value) => value + 1);
              }}
            >
              Retry loading all entries
            </button>
          ) : null}
        </div>
      </div>

      <div className="toolbar">
        <label className="search-field">
          <span className="sr-only">Search parties</span>
          <input
            type="search"
            placeholder="Search name, acronym, country, type, status, label or alliance"
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
            <option value="seats">Parliamentary seats</option>
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
              id={`party-${party.id}`}
              key={party.id}
              style={{ "--party-color": party.color } as React.CSSProperties}
            >
              <div className="card-link">
                <div className="party-card-media">
                  <Link
                    className="party-logo-wrap"
                    href={`/party/${party.id}`}
                    prefetch={false}
                    aria-label={`View ${party.name}`}
                    onClick={() => rememberPartyPosition(party.id)}
                  >
                    <LogoImage
                      src={party.logo}
                      alt=""
                      className="party-logo"
                      fallback={party.acronym ?? party.name.slice(0, 2)}
                      fallbackClassName="logo-placeholder"
                      thumbnail
                    />
                  </Link>
                  <Link
                    className="open-record"
                    href={`/party/${party.id}`}
                    prefetch={false}
                    onClick={() => rememberPartyPosition(party.id)}
                  >
                    Open record →
                  </Link>
                  {party.alliances.some((alliance) => alliance.indexVisible) ? (
                    <div className="alliance-list card-alliance-list" aria-label="International alliances">
                      {party.alliances.filter((alliance) => alliance.indexVisible).map((alliance) => (
                        <Link
                          className="alliance-badge"
                          href={`/party/${alliance.id}`}
                          prefetch={false}
                          key={`${alliance.id}-${alliance.display}`}
                          onClick={() => rememberPartyPosition(party.id)}
                          style={{ "--alliance-color": alliance.color } as React.CSSProperties}
                        >
                          <RichText text={alliance.display} runs={alliance.runs} />
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="party-card-copy">
                  <h2>
                    <Link
                      href={`/party/${party.id}`}
                      prefetch={false}
                      onClick={() => rememberPartyPosition(party.id)}
                    >
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
      {showBackToTop ? (
        <button
          type="button"
          className="back-to-top"
          aria-label="Back to top"
          onClick={() => {
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
          }}
        >
          ↑ Top
        </button>
      ) : null}
    </section>
  );
}
