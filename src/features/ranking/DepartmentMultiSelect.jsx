import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";

const departmentLogoFilenames = {
  ABBS: "ABBS_LOGO_withBG.png",
  ACHSS: "ACCHS_LOGO_withBG.png",
  ANSA: "ANSA_LOGO_withBG.png",
  AXI: "AXI_LOGO_withBG.png",
  COCS: "COCS_LOGO_withBG.png",
  COL: "COL_LOGO_withBG.png",
  JPIA: "JPIA_LOGO_withBG.png",
  STEP: "STEP_LOGO_withBG.png",
};

function normalizeDepartmentKey(acronym) {
  return String(acronym ?? "")
    .trim()
    .toUpperCase();
}

function getDepartmentLogoUrl(acronym) {
  const filename = departmentLogoFilenames[normalizeDepartmentKey(acronym)];
  if (!filename) return "";
  return `/College Department Logos/${encodeURIComponent(filename)}`;
}

function DepartmentMultiSelect({
  departments,
  selectedDepartmentIds,
  disabledDepartmentIds = [],
  onChange,
  placeholder = "Select departments",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const disabledIds = useMemo(
    () => new Set(disabledDepartmentIds),
    [disabledDepartmentIds],
  );
  const selectedDepartments = useMemo(
    () =>
      departments.filter((department) =>
        selectedDepartmentIds.includes(department.id),
      ),
    [departments, selectedDepartmentIds],
  );
  const filteredDepartments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return departments;
    }

    return departments.filter((department) => {
      const acronym = String(department.acronym ?? "").toLowerCase();
      const name = String(department.name ?? "").toLowerCase();

      return (
        acronym.includes(normalizedQuery) || name.includes(normalizedQuery)
      );
    });
  }, [departments, searchQuery]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function toggleDepartment(departmentId) {
    if (selectedDepartmentIds.includes(departmentId)) {
      onChange(
        selectedDepartmentIds.filter(
          (currentDepartmentId) => currentDepartmentId !== departmentId,
        ),
      );
      return;
    }

    onChange([...selectedDepartmentIds, departmentId]);
  }

  function clearSelection() {
    onChange([]);
  }

  const buttonLabel = selectedDepartments.length
    ? selectedDepartments
        .map((department) => department.acronym || department.name)
        .join(", ")
    : placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen((currentState) => !currentState);
          }
        }}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-left text-sm text-theme-text outline-none transition focus:border-brand-gold",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span
          className={cn(
            "truncate",
            !selectedDepartments.length && "text-theme-subtle",
          )}
        >
          {buttonLabel}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-theme-subtle transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-20 mt-2 w-full min-w-[18rem] rounded-2xl border border-theme-border bg-theme-surface p-3 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-theme-subtle">
              Departments
            </p>
            {selectedDepartments.length ? (
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-1 rounded-full border border-theme-border-soft px-3 py-1 text-xs font-semibold text-theme-muted transition hover:bg-theme-surface-hover hover:text-theme-text"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            ) : null}
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search departments..."
              className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg py-2.5 pl-10 pr-3 text-sm text-theme-text outline-none transition placeholder:text-theme-subtle focus:border-brand-gold"
            />
          </div>

          <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-theme-border-soft [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
            {filteredDepartments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-theme-border-soft bg-theme-bg px-3 py-4 text-center text-sm text-theme-muted">
                No departments match your search.
              </div>
            ) : null}

            {filteredDepartments.map((department) => {
              const isSelected = selectedDepartmentIds.includes(department.id);
              const isDisabled = disabledIds.has(department.id) && !isSelected;

              return (
                <label
                  key={department.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 transition",
                    isSelected
                      ? "border-brand-gold/40 bg-brand-gold-soft/60"
                      : "border-theme-border-soft bg-theme-bg hover:bg-theme-surface-hover",
                    isDisabled && "cursor-not-allowed opacity-45",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleDepartment(department.id)}
                      className="h-4 w-4 rounded border-theme-border-soft accent-brand-gold"
                    />
                    {getDepartmentLogoUrl(department.acronym) ? (
                      <img
                        src={getDepartmentLogoUrl(department.acronym)}
                        alt={department.acronym}
                        className="h-6 w-6 shrink-0 rounded-full object-contain"
                      />
                    ) : (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-theme-surface text-[10px] font-bold text-theme-muted">
                        {department.acronym?.slice(0, 2) ?? "??"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-theme-text">
                        {department.name}
                      </p>
                      <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-theme-subtle">
                        {department.acronym}
                      </p>
                    </div>
                  </div>
                  {isSelected ? (
                    <Check className="h-4 w-4 shrink-0 text-brand-gold" />
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DepartmentMultiSelect;
