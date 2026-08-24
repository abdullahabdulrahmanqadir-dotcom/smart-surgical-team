"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconCheck, IconChevronDown } from "./icons";

export type FilterOption = { value: string; label: string };

export default function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className = "",
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

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

  const selectedOption = options[selectedIndex] ?? options[0];

  return (
    <div
      className={`content-filter-control content-select${isOpen ? " is-open" : ""}${disabled ? " is-disabled" : ""}${className ? ` ${className}` : ""}`}
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false);
      }}
    >
      <span className="content-control-label" id={labelId}>{label}</span>
      <div className="content-select-shell">
        <button
          className="content-control-field content-select-trigger"
          type="button"
          role="combobox"
          aria-labelledby={labelId}
          aria-controls={listId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-activedescendant={isOpen ? optionId(activeIndex) : undefined}
          disabled={disabled}
          onClick={() => {
            if (isOpen) setIsOpen(false);
            else {
              setActiveIndex(selectedIndex);
              setIsOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
                setActiveIndex(selectedIndex);
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
            }
          }}
        >
          <span className="content-select-value">{selectedOption?.label}</span>
          <IconChevronDown size={16} />
        </button>
        {isOpen ? (
          <ul className="content-select-menu" id={listId} role="listbox" aria-labelledby={labelId}>
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
                  onMouseEnter={() => setActiveIndex(index)}
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
