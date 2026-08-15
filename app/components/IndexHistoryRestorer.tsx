"use client";

import { useEffect } from "react";

const INDEX_URL_SESSION_PREFIX = "ppdb:index-state:url:";

function savedScrollPosition() {
  try {
    const raw = window.sessionStorage.getItem(
      `${INDEX_URL_SESSION_PREFIX}${window.location.pathname}${window.location.search}`,
    );
    if (!raw) return null;
    const value = JSON.parse(raw) as { scrollY?: unknown };
    return typeof value.scrollY === "number" && Number.isFinite(value.scrollY)
      ? Math.max(0, value.scrollY)
      : null;
  } catch {
    return null;
  }
}

function restoreIndexScroll() {
  const targetScrollY = savedScrollPosition();
  const anchorId = decodeURIComponent(window.location.hash.slice(1));
  if (targetScrollY == null && !anchorId) return;
  let attempts = 0;
  const restore = () => {
    attempts += 1;
    const index = document.getElementById("party-index-heading");
    if (!index) {
      if (attempts < 24) window.requestAnimationFrame(restore);
      return;
    }

    const anchor = anchorId ? document.getElementById(anchorId) : null;
    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const anchorScrollY = anchor
      ? window.scrollY + anchor.getBoundingClientRect().top - window.innerHeight / 3
      : 0;
    const desiredScrollY = targetScrollY && targetScrollY > 0 ? targetScrollY : anchorScrollY;
    window.scrollTo({ top: Math.min(Math.max(0, desiredScrollY), maxScrollY), behavior: "auto" });
    if (attempts < 24 && (!anchor || window.scrollY < desiredScrollY - 2)) {
      window.requestAnimationFrame(restore);
    }
  };
  window.requestAnimationFrame(restore);
}

export function IndexHistoryRestorer() {
  useEffect(() => {
    const restoreAfterHistoryNavigation = () => restoreIndexScroll();
    const restoreAfterPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) restoreIndexScroll();
    };
    window.addEventListener("popstate", restoreAfterHistoryNavigation);
    window.addEventListener("pageshow", restoreAfterPageShow);
    return () => {
      window.removeEventListener("popstate", restoreAfterHistoryNavigation);
      window.removeEventListener("pageshow", restoreAfterPageShow);
    };
  }, []);

  return null;
}
