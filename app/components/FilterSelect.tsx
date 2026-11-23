"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconCheck, IconChevronDown } from "./icons";

export type FilterOption = { value: string; label: string };

export default function FilterSelect({
  label,
  value,
  options: allOptions,
  onChange,
  disabled = false,
  className = "",
  id,
  invalid = false,
  describedBy,
  hidePlaceholder = false,
}: {
  label: ReactNode;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** Lets a form move focus to the trigger, e.g. to the first invalid field. */
  id?: string;
  /** Marks the control invalid for styling and assistive technology. */
  invalid?: boolean;
  /** Ids of the hint/error text that describe the control. */
  describedBy?: string;
  /** Keep the "" option as the trigger's placeholder only, not a menu row —
      for required form fields, where "Choose…" is not a valid answer. */
  hidePlaceholder?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const options = hidePlaceholder ? allOptions.filter((option) => option.value !== "") : allOptions;
  // -1 when nothing in the menu is chosen (a hidden placeholder is showing).
  const selectedIndex = options.findIndex((option) => option.value === value);
  const startIndex = Math.max(0, selectedIndex);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const labelId = useId();
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;
  // Type-to-jump, as a native select does: letters typed within a short window
  // build a prefix, and the first option whose label starts with it becomes
  // active. Needed for long lists such as the country list.
  const typeahead = useRef({ text: "", at: 0 });

  useEffect(() => {
    const list = listRef.current;
    const option = list?.children[activeIndex];
    if (!list || !option) return;
    const menu = list.getBoundingClientRect();
    const item = option.getBoundingClientRect();
    if (item.top < menu.top) list.scrollTop += item.top - menu.top;
    else if (item.bottom > menu.bottom) list.scrollTop += item.bottom - menu.bottom;
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isOpen]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setActiveIndex(index);
    setIsOpen(false);
  };

  const move = (direction: 1 | -1) => {
    setActiveIndex((current) => (current + direction + options.length) % options.length);
  };

  const jumpTo = (key: string) => {
    const now = Date.now();
    const state = typeahead.current;
    state.text = now - state.at > 700 ? key : state.text + key;
    state.at = now;
    const prefix = state.text.toLocaleLowerCase();
    const match = options.findIndex((option) => option.value !== "" && option.label.toLocaleLowerCase().startsWith(prefix));
    if (match < 0) return;
    setActiveIndex(match);
    if (!isOpen) setIsOpen(true);
  };

  const selectedOption = allOptions.find((option) => option.value === value) ?? allOptions[0];

  return (
    <div
      className={`content-filter-control content-select${isOpen ? " is-open" : ""}${disabled ? " is-disabled" : ""}${invalid ? " is-invalid" : ""}${className ? ` ${className}` : ""}`}
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false);
      }}
    >
      <span className="content-control-label" id={labelId}>{label}</span>
      <div className="content-select-shell">
        <button
          className={`content-control-field content-select-trigger${selectedOption?.value === "" ? " is-placeholder" : ""}`}
          id={id}
          type="button"
          role="combobox"
          aria-labelledby={labelId}
          aria-controls={listId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-activedescendant={isOpen ? optionId(activeIndex) : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          onClick={() => {
            if (isOpen) setIsOpen(false);
            else {
              setActiveIndex(startIndex);
              setIsOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
                setActiveIndex(startIndex);
              } else {
                move(event.key === "ArrowDown" ? 1 : -1);
              }
            } else if (event.key === "Home" || event.key === "End") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
            } else if ((event.key === "Enter" || event.key === " ") && isOpen) {
              event.preventDefault();
              choose(activeIndex);
            } else if (event.key === "Escape" && isOpen) {
              event.preventDefault();
              setIsOpen(false);
            } else if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
              event.preventDefault();
              jumpTo(event.key);
            }
          }}
        >
          <span className="content-select-value">{selectedOption?.label}</span>
          <IconChevronDown size={16} />
        </button>
        {isOpen ? (
          <ul className="content-select-menu" ref={listRef} id={listId} role="listbox" aria-labelledby={labelId}>
            {options.map((option, index) => {
              const isSelected = index === selectedIndex;
              const isActive = index === activeIndex;
              return (
                <li
                  className={`content-select-option${isActive ? " is-active" : ""}${isSelected ? " is-selected" : ""}`}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => choose(index)}
                  key={option.value}
                >
                  <span>{option.label}</span>
                  {isSelected ? <IconCheck size={15} /> : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
