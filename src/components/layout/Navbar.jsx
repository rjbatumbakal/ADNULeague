import { useEffect, useRef, useState } from "react";
import { CalendarDays, GitBranch, House, Menu, Trophy, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "../../utils/cn";

const primaryLinks = [
  { label: "Home", to: "/" },
  { label: "Schedule", to: "/schedule" },
  { label: "Bracketing", to: "/bracketing" },
  { label: "Ranking", to: "/ranking" },
];

const moreLinks = [
  { label: "Guidelines", to: "/more/guidelines" },
  { label: "Directory", to: "/more/directory" },
  { label: "About & Forums", to: "/more/about" },
];

const mobilePrimaryLinks = [
  { label: "Home", to: "/", icon: House, end: true },
  { label: "Schedule", to: "/schedule", icon: CalendarDays },
  { label: "Bracketing", to: "/bracketing", icon: GitBranch },
  { label: "Ranking", to: "/ranking", icon: Trophy },
];

function NavItem({ to, children, onClick, className }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "inline-flex min-h-[44px] min-w-[44px] items-center rounded-full px-4 py-2 text-base font-medium transition",
          isActive
            ? "bg-brand-gold text-[#ffffff]"
            : "text-theme-muted hover:bg-theme-surface-hover hover:text-theme-text",
          className,
        )
      }
    >
      {children}
    </NavLink>
  );
}

function MobilePrimaryNavItem({ to, label, icon: Icon, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "relative flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition",
          isActive ? "text-brand-blue" : "text-theme-muted",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "absolute inset-x-3 top-0 h-0.5 rounded-full transition",
              isActive ? "bg-brand-blue" : "bg-transparent",
            )}
          />
          <Icon className="h-5 w-5" strokeWidth={2.2} />
          <span className="text-[11px] font-semibold leading-none">
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const closeTimeoutRef = useRef(null);
  const isMoreActive = location.pathname.startsWith("/more");

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function openMoreMenu() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setMoreMenuOpen(true);
  }

  function closeMoreMenuWithDelay() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = setTimeout(() => {
      setMoreMenuOpen(false);
      closeTimeoutRef.current = null;
    }, 180);
  }

  function closeMoreMenuImmediately() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setMoreMenuOpen(false);
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-theme-border",
          mobileOpen ? "bg-theme-header" : "bg-theme-header",
        )}
      >
        <div className="w-full px-3 py-2 md:mx-auto md:max-w-3xl md:px-6 lg:max-w-7xl lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 sm:gap-3"
            >
              <div className="flex h-9 w-11 shrink-0 sm:h-10 sm:w-12 md:h-11 md:w-14">
                <img
                  src="/adnul_logo_glow.png"
                  alt="ADNULS3 logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <img
                  src="/adnuls3_name.png"
                  alt="ADNULS3"
                  className="h-auto w-[124px] max-w-full sm:w-40 md:w-44"
                />
              </div>
            </Link>

            <nav className="hidden items-center gap-2 lg:flex">
              {primaryLinks.map((link) => (
                <NavItem key={link.to} to={link.to}>
                  {link.label}
                </NavItem>
              ))}
              <div
                className="relative"
                onMouseEnter={openMoreMenu}
                onMouseLeave={closeMoreMenuWithDelay}
                onFocus={openMoreMenu}
                onBlur={closeMoreMenuWithDelay}
              >
                <button
                  type="button"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-full px-4 py-2 text-base font-medium text-theme-muted transition hover:bg-theme-surface-hover hover:text-theme-text"
                  aria-expanded={moreMenuOpen}
                  aria-haspopup="true"
                >
                  More
                </button>
                <div
                  className={cn(
                    "absolute right-0 top-full mt-3 flex min-w-[12rem] flex-col rounded-2xl border border-theme-border bg-theme-surface p-2 shadow-panel transition duration-150",
                    moreMenuOpen
                      ? "visible opacity-100"
                      : "invisible opacity-0",
                  )}
                  onMouseEnter={openMoreMenu}
                  onMouseLeave={closeMoreMenuWithDelay}
                >
                  {moreLinks.map((link) => (
                    <NavItem
                      key={link.to}
                      to={link.to}
                      onClick={closeMoreMenuImmediately}
                      className="w-full justify-start rounded-xl"
                    >
                      {link.label}
                    </NavItem>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-theme-border bg-[#F8FAFF] shadow-[0_-12px_30px_rgba(15,23,42,0.12)] lg:hidden">
        <nav className="mx-auto flex max-w-2xl items-stretch gap-1 px-2 pb-[env(safe-area-inset-bottom)] pt-2">
          {mobilePrimaryLinks.map((link) => (
            <MobilePrimaryNavItem
              key={link.to}
              to={link.to}
              label={link.label}
              icon={link.icon}
              end={link.end}
            />
          ))}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className={cn(
              "relative flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition",
              isMoreActive || mobileOpen
                ? "text-brand-blue"
                : "text-theme-muted",
            )}
            aria-label="Open more menu"
          >
            <span
              className={cn(
                "absolute inset-x-3 top-0 h-0.5 rounded-full transition",
                isMoreActive || mobileOpen ? "bg-brand-blue" : "bg-transparent",
              )}
            />
            <Menu className="h-5 w-5" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold leading-none">More</span>
          </button>
        </nav>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm border-l border-theme-border bg-theme-surface p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-theme-border-soft pb-3">
              <p className="text-base font-black uppercase tracking-[0.18em] text-theme-text">
                More
              </p>
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-theme-border-soft px-3 text-base"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {moreLinks.map((link) => (
                <NavItem
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="w-full justify-start rounded-2xl"
                >
                  {link.label}
                </NavItem>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default Navbar;
