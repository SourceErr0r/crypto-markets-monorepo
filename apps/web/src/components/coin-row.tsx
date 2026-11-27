"use client";

import { useId, useState, type ReactNode } from "react";

type CoinRowProps = {
  name: string;
  symbol: string;
  image: string;
  rank: number | null;
  // Shown when the row is expanded. Passed in as an element, so whatever it
  // fetches only runs once the row opens (React mounts it then).
  details: ReactNode;
  // Right-hand column, e.g. price and market cap. Search results have none.
  children?: ReactNode;
};

// One coin in a list. Clicking it expands the row to show the coin's details
// in place, instead of navigating away from the list.
export function CoinRow({ name, symbol, image, rank, details, children }: CoinRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <li>
      <button
        type="button"
        className="coin-row"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="coin-rank">{rank ?? "–"}</span>
        {/* Decorative: the name next to it says the same thing. */}
        {image ? <img src={image} alt="" width={32} height={32} loading="lazy" /> : null}
        <span className="coin-name">
          {name}
          <span className="coin-symbol">{symbol.toUpperCase()}</span>
        </span>
        {children ? <span className="coin-values">{children}</span> : null}
        <span className="chevron" aria-hidden="true">
          {isOpen ? "▴" : "▾"}
        </span>
      </button>
      <div id={panelId} className="coin-panel" hidden={!isOpen}>
        {isOpen ? details : null}
      </div>
    </li>
  );
}
