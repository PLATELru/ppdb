"use client";

import { useEffect } from "react";

export function ThemeButton() {
  useEffect(() => {
    const saved = window.localStorage.getItem("ppdb-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const enabled = saved ? saved === "dark" : prefersDark;
    document.documentElement.dataset.theme = enabled ? "dark" : "light";
  }, []);

  function toggle() {
    const next = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem("ppdb-theme", next ? "dark" : "light");
  }

  return (
    <button className="retro-button theme-button" type="button" onClick={toggle}>
      <span aria-hidden="true">◐</span>
      Theme
    </button>
  );
}
