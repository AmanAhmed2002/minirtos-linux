import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import clsx from "clsx";

const NAV_ITEMS = [
  { to: "/learn", label: "Learn" },
  { to: "/simulator", label: "Simulator" },
  { to: "/runs", label: "Runs" },
  { to: "/analysis", label: "Analysis" },
  { to: "/looker", label: "Looker" },
  { to: "/glossary", label: "Glossary" },
];

export function AppNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="app-nav">
      <Link to="/" className="app-nav__brand" onClick={() => setIsOpen(false)}>
        <span className="app-nav__logo" aria-hidden="true">
          ◵
        </span>
        <span className="app-nav__brand-text">MiniRTOS Playground</span>
      </Link>

      <button
        type="button"
        className="app-nav__toggle"
        aria-expanded={isOpen}
        aria-label="Toggle navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span aria-hidden="true">{isOpen ? "✕" : "☰"}</span>
      </button>

      <nav
        className={clsx("app-nav__links", { "app-nav__links--open": isOpen })}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx("app-nav__link", { "app-nav__link--active": isActive })
            }
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
