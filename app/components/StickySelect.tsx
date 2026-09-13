"use client";

import { useEffect, useId, useRef, useState } from "react";

export type StickySelectOption = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  value: string;
  options: StickySelectOption[];
  onChange: (value: string) => void;
};

export function StickySelect({ label, value, options, onChange }: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  useEffect(() => {
    if (!open) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const closeOnFocusIn = (event: FocusEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("focusin", closeOnFocusIn);
    rootRef.current
      ?.querySelector<HTMLButtonElement>(`[data-option-index="${selectedIndex}"]`)
      ?.focus({ preventScroll: false });

    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("focusin", closeOnFocusIn);
    };
  }, [open, selectedIndex]);

  function choose(option: StickySelectOption) {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function moveFocus(event: React.KeyboardEvent, optionIndex: number) {
    let nextIndex = optionIndex;
    if (event.key === "ArrowDown") nextIndex = Math.min(options.length - 1, optionIndex + 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, optionIndex - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else return;

    event.preventDefault();
    rootRef.current
      ?.querySelector<HTMLButtonElement>(`[data-option-index="${nextIndex}"]`)
      ?.focus({ preventScroll: false });
  }

  function renderOption(option: StickySelectOption, optionIndex: number, first = false) {
    return (
      <button
        type="button"
        className={`sticky-select-option${first ? " sticky-select-option-first" : ""}`}
        role="option"
        aria-selected={option.value === value}
        key={option.value || "all"}
        data-option-index={optionIndex}
        onClick={() => choose(option)}
        onKeyDown={(event) => moveFocus(event, optionIndex)}
      >
        {option.label}
      </button>
    );
  }

  return (
    <div className="toolbar-select" ref={rootRef}>
      <span id={`${id}-label`}>{label}</span>
      <button
        type="button"
        className="sticky-select-trigger"
        ref={triggerRef}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-controls={`${id}-options`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        <span id={`${id}-value`}>{selected?.label ?? ""}</span>
        <span aria-hidden="true">▾</span>
      </button>
      <div
        className="sticky-select-menu"
        id={`${id}-options`}
        role="listbox"
        aria-labelledby={`${id}-label`}
        hidden={!open}
      >
        {options[0] ? renderOption(options[0], 0, true) : null}
        <div className="sticky-select-scroll">
          {options.slice(1).map((option, index) => renderOption(option, index + 1))}
        </div>
      </div>
    </div>
  );
}
