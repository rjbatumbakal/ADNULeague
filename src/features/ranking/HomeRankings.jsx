import { ChevronDown, HelpCircle, Lock, Medal, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Skeleton } from "@heroui/react";
import { getAppSettings } from "../../services/appSettingsService";
import { isSupabaseConfigured, supabase } from "../../services/supabaseClient";
import { useAsyncData } from "../../hooks/useAsyncData";
import {
  buildMasterTabulation,
  buildOverallStandings,
  formatPoints,
  formatRankLabel,
  getRankingReferenceData,
} from "../../services/rankingService";
import MasterTabulationBreakdown from "./MasterTabulationBreakdown";

function createInitialData() {
  return {
    departments: [],
    events: [],
    eventResults: [],
  };
}

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

const departmentColors = {
  COCS: "bg-slate-900",
  ABBS: "bg-red-800",
  STEP: "bg-gray-400",
  JPIA: "bg-yellow-400",
  COL: "bg-purple-700",
  ACHSS: "bg-pink-500",
  AXI: "bg-orange-500",
  ANSA: "bg-blue-800",
};

const lightDepartmentKeys = new Set(["STEP", "JPIA"]);

function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return `${num}st`;
  if (j === 2 && k !== 12) return `${num}nd`;
  if (j === 3 && k !== 13) return `${num}rd`;
  return `${num}th`;
}

function normalizeDepartmentKey(acronym) {
  return String(acronym ?? "").trim().toUpperCase();
}

function getLogoMonogram(acronym) {
  return String(acronym ?? "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();
}

function getDepartmentLogoUrl(acronym) {
  const filename = departmentLogoFilenames[normalizeDepartmentKey(acronym)];

  if (!filename) {
    return "";
  }

  return `/College Department Logos/${encodeURIComponent(filename)}`;
}

function getDepartmentTheme(acronym) {
  const key = normalizeDepartmentKey(acronym);
  const isLightBackground = lightDepartmentKeys.has(key);

  return {
    backgroundClassName: departmentColors[key] ?? "bg-slate-800",
    textClassName: isLightBackground ? "text-slate-900" : "text-white",
    secondaryTextClassName: isLightBackground ? "text-slate-800" : "text-white/85",
    tertiaryTextClassName: isLightBackground ? "text-slate-700" : "text-white/70",
    borderClassName: isLightBackground ? "border-slate-900/10" : "border-white/10",
    badgeClassName: isLightBackground ? "bg-white/80 text-slate-900" : "bg-white/15 text-white",
    logoRingClassName: isLightBackground ? "border-slate-900/10 bg-transparent" : "border-white/20 bg-transparent",
    logoFallbackClassName: isLightBackground ? "bg-slate-900/10 text-slate-900" : "bg-white/10 text-white",
    chipClassName: isLightBackground ? "border-slate-900/10 bg-white/40" : "border-white/15 bg-white/10",
    overlayClassName: isLightBackground
      ? "bg-gradient-to-br from-white/35 via-white/10 to-black/10"
      : "bg-gradient-to-br from-white/15 via-transparent to-black/25",
  };
}

function getHiddenTeamAlias(place) {
  return `Team ${String.fromCharCode(64 + place)}`;
}

function getRankBadgeClassName(rank) {
  if (String(rank ?? "").trim().toUpperCase() === "D") {
    return "border border-slate-300 bg-slate-100 text-slate-500";
  }

  const numericRank = Number(rank);

  if (numericRank === 1) {
    return "bg-gradient-to-br from-[#FDE68A] via-[#FACC15] to-[#B45309] text-white font-bold shadow-md";
  }

  if (numericRank === 2) {
    return "bg-gradient-to-br from-[#E2E8F0] via-[#94A3B8] to-[#64748B] text-white font-bold shadow-md";
  }

  if (numericRank === 3) {
    return "bg-gradient-to-br from-[#FED7AA] via-[#FB923C] to-[#9A3412] text-white font-bold shadow-md";
  }

  return "bg-brand-blue/10 text-brand-blue";
}

function HomeRankings() {
  const loadRankingsData = useCallback(() => getRankingReferenceData(), []);
  const { data, loading, error } = useAsyncData(
    loadRankingsData,
    createInitialData(),
  );
  const [blackoutMode, setBlackoutMode] = useState("none");
  const [isBreakdownVisible, setIsBreakdownVisible] = useState(false);
  const [expandedBreakdownDepartmentIds, setExpandedBreakdownDepartmentIds] = useState(new Set());

  useEffect(() => {
    getAppSettings().then((settings) => {
      setBlackoutMode(settings.blackout_mode);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchInitialBreakdownVisibility() {
      if (!isSupabaseConfigured) {
        return;
      }

      const { data, error } = await supabase
        .from("app_settings")
        .select("is_breakdown_visible")
        .eq("id", 1)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn(
          "Failed to fetch app_settings.is_breakdown_visible:",
          error.message,
        );
        return;
      }

      setIsBreakdownVisible(Boolean(data?.is_breakdown_visible));
    }

    fetchInitialBreakdownVisibility();

    if (!isSupabaseConfigured || typeof supabase.channel !== "function") {
      return () => {
        cancelled = true;
      };
    }

    const channel = supabase
      .channel("public:app_settings_breakdown_visibility")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_settings",
          filter: "id=eq.1",
        },
        (payload) => {
          const nextValue = Boolean(payload?.new?.is_breakdown_visible);
          setIsBreakdownVisible(nextValue);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    setExpandedBreakdownDepartmentIds(new Set());
  }, [blackoutMode]);

  const isBreakdownUnlocked = blackoutMode === "none" && isBreakdownVisible;

  function isPositionHidden(place) {
    if (blackoutMode === "all") return true;
    if (blackoutMode === "top5" && place <= 5) return true;
    if (blackoutMode === "top3" && place <= 3) return true;
    return false;
  }

  const overallStandings = useMemo(
    () => buildOverallStandings(data.departments, data.eventResults),
    [data.departments, data.eventResults],
  );
  const masterTabulation = useMemo(
    () => buildMasterTabulation(data.departments, data.events, data.eventResults),
    [data.departments, data.events, data.eventResults],
  );
  const podiumStandings = useMemo(
    () => overallStandings.slice(0, 3),
    [overallStandings],
  );
  const remainingStandings = useMemo(
    () => overallStandings.slice(3),
    [overallStandings],
  );
  const podiumSlots = useMemo(() => {
    const slots = [
      {
        standing: podiumStandings[1] ?? null,
        place: 2,
        label: "2ND",
        Icon: Medal,
        orderClassName: "order-2 z-20 md:order-1",
        mobileSpanClassName: "col-span-1",
        overlapClassName: "md:-mr-6",
        cardHeightClassName: "min-h-[13.5rem] sm:min-h-[15rem] md:min-h-[20rem]",
        cardShadowClassName: "animate-pulse-glow",
        podiumScaleClassName: "md:scale-95",
        rankBorderClassName: "border-4 border-[#CBD5E1]",
        frameGlowStyle: {
          "--podium-glow-outer": "rgba(226,232,240,0.4)",
          "--podium-glow-middle": "rgba(226,232,240,0.3)",
          "--podium-glow-inner": "rgba(226,232,240,0.2)",
          "--podium-glow-outer-strong": "rgba(226,232,240,0.58)",
          "--podium-glow-middle-strong": "rgba(226,232,240,0.45)",
          "--podium-glow-inner-strong": "rgba(226,232,240,0.34)",
        },
        iconClassName:
          "text-[#E2E8F0] drop-shadow-[0_8px_12px_rgba(226,232,240,0.34)]",
        medalTextClassName: "text-[#E2E8F0]",
      },
      {
        standing: podiumStandings[0] ?? null,
        place: 1,
        label: "1ST",
        Icon: Trophy,
        orderClassName: "order-1 z-30 md:order-2",
        mobileSpanClassName: "col-span-2",
        overlapClassName: "",
        cardHeightClassName: "min-h-[15rem] sm:min-h-[16.5rem] md:min-h-[22rem]",
        cardShadowClassName: "animate-pulse-glow",
        podiumScaleClassName: "md:scale-110",
        rankBorderClassName: "border-4 border-[#FACC15]",
        frameGlowStyle: {
          "--podium-glow-outer": "rgba(250,204,21,0.4)",
          "--podium-glow-middle": "rgba(250,204,21,0.3)",
          "--podium-glow-inner": "rgba(250,204,21,0.2)",
          "--podium-glow-outer-strong": "rgba(250,204,21,0.6)",
          "--podium-glow-middle-strong": "rgba(250,204,21,0.5)",
          "--podium-glow-inner-strong": "rgba(250,204,21,0.4)",
        },
        logoGlowClassName: "drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]",
        iconClassName:
          "text-[#FACC15] drop-shadow-[0_8px_14px_rgba(250,204,21,0.35)]",
        medalTextClassName: "text-[#FACC15]",
      },
      {
        standing: podiumStandings[2] ?? null,
        place: 3,
        label: "3RD",
        Icon: Medal,
        orderClassName: "order-3 z-10",
        mobileSpanClassName: "col-span-1",
        overlapClassName: "md:-ml-6",
        cardHeightClassName: "min-h-[13.5rem] sm:min-h-[15rem] md:min-h-[20rem]",
        cardShadowClassName: "animate-pulse-glow",
        podiumScaleClassName: "md:scale-90 md:opacity-90",
        rankBorderClassName: "border-4 border-[#B45309]",
        frameGlowStyle: {
          "--podium-glow-outer": "rgba(253,186,116,0.36)",
          "--podium-glow-middle": "rgba(253,186,116,0.28)",
          "--podium-glow-inner": "rgba(180,83,9,0.22)",
          "--podium-glow-outer-strong": "rgba(253,186,116,0.52)",
          "--podium-glow-middle-strong": "rgba(253,186,116,0.4)",
          "--podium-glow-inner-strong": "rgba(180,83,9,0.3)",
        },
        iconClassName:
          "text-[#FDBA74] drop-shadow-[0_8px_12px_rgba(253,186,116,0.3)]",
        medalTextClassName: "text-[#FDBA74]",
      },
    ];

    return slots.filter((slot) => slot.standing);
  }, [podiumStandings]);

  return (
    <article className="rounded-3xl border border-theme-border bg-theme-surface p-6 shadow-panel sm:p-8">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-[0_14px_28px_rgba(15,59,120,0.24)]">
          <Trophy className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-blue">
            Leaderboard
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-theme-text sm:text-[1.95rem]">
            Departments' Overall Points
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 space-y-8">
          <section className="rounded-[2rem] border border-theme-border-soft bg-gradient-to-br from-white via-[#F8FAFC] to-[#EEF6FF] px-3 py-4 shadow-[0_22px_48px_rgba(15,23,42,0.06)] sm:px-4 sm:py-5 md:px-5">
            <div className="grid grid-cols-2 items-stretch gap-3 md:flex md:items-center md:justify-center md:gap-0">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex w-full flex-col ${i === 1 ? "col-span-2 md:col-span-1" : "col-span-1"} md:flex-1 md:basis-0`}
                >
                  <div className={`relative flex w-full flex-col overflow-hidden rounded-2xl border-4 border-gray-200 bg-white px-3 py-4 sm:px-4 sm:py-5 md:px-5 md:py-6 ${i === 1 ? "min-h-[15rem] sm:min-h-[16.5rem]" : "min-h-[13.5rem] sm:min-h-[15rem]"} md:min-h-[20rem]`}>
                    <div className="mb-4 flex flex-col items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <Skeleton className="h-4 w-16 rounded-lg" />
                    </div>
                    <div className="mb-4 flex justify-center">
                      <Skeleton className="h-16 w-16 rounded-full sm:h-18 sm:w-18 md:h-20 md:w-20" />
                    </div>
                    <div className="flex flex-col items-center gap-2 mt-auto">
                      <Skeleton className="h-5 w-24 rounded-lg md:h-6" />
                      <Skeleton className="hidden h-4 w-32 rounded-lg md:block" />
                      <Skeleton className="mt-2 h-7 w-16 rounded-lg md:h-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </section>
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-theme-muted">
          Unable to load the leaderboard right now.
        </p>
      ) : !overallStandings.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-theme-border-soft bg-theme-surface-soft px-4 py-6 text-sm text-theme-muted">
          Rankings will appear after event results are encoded.
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <section className="rounded-[2rem] border border-theme-border-soft bg-gradient-to-br from-white via-[#F8FAFC] to-[#EEF6FF] px-3 py-4 shadow-[0_22px_48px_rgba(15,23,42,0.06)] sm:px-4 sm:py-5 md:px-5">
            <div className="grid grid-cols-2 items-stretch gap-3 md:flex md:items-center md:justify-center md:gap-0">
              {podiumSlots.map((slot) => (
                (() => {
                  const isMystery = isPositionHidden(slot.place);
                  const theme = isMystery
                    ? {
                        backgroundClassName: "bg-slate-700",
                        textClassName: "text-white",
                        secondaryTextClassName: "text-white/70",
                        tertiaryTextClassName: "text-white/60",
                        borderClassName: "border-white/15",
                        chipClassName: "border-white/20 bg-white/12",
                        overlayClassName: "bg-gradient-to-br from-white/10 via-transparent to-black/10",
                        logoFallbackClassName: "bg-white/12 text-white",
                      }
                    : getDepartmentTheme(slot.standing.department_acronym);
                  const logoUrl = isMystery ? "" : getDepartmentLogoUrl(slot.standing.department_acronym);

                  return (
                    <div
                      key={slot.place}
                      className={`flex w-full flex-col transition-all duration-300 ${slot.mobileSpanClassName} ${slot.orderClassName} md:flex-1 md:basis-0 ${slot.podiumScaleClassName} ${slot.overlapClassName}`}
                    >
                      <Card
                        isPressable
                        className={`relative flex w-full flex-col overflow-hidden rounded-2xl px-2.5 py-3 sm:px-3 sm:py-4 md:px-4 md:py-5 ${isMystery ? 'border-2 border-slate-600' : slot.rankBorderClassName} ${theme.backgroundClassName} ${slot.cardHeightClassName} ${slot.cardShadowClassName}`}
                        style={slot.frameGlowStyle}
                      >
                        <div className={`absolute inset-0 ${theme.overlayClassName}`} />
                        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />

                        <div className="relative z-10 flex h-full flex-col items-center justify-between text-center">
                          <div className="flex w-full flex-col items-center justify-center gap-2 min-[420px]:flex-row min-[420px]:gap-3">
                            <div
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border sm:h-11 sm:w-11 md:h-12 md:w-12 ${theme.chipClassName}`}
                            >
                              <slot.Icon
                                className={`h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 ${isMystery ? "text-white/40" : slot.iconClassName}`}
                              />
                            </div>
                            <p
                              className={`text-[10px] font-black uppercase tracking-[0.2em] sm:text-xs md:text-sm ${isMystery ? "text-white/40" : slot.medalTextClassName}`}
                            >
                              {slot.label}
                            </p>
                          </div>

                          <div
                            className={`mx-auto mt-2.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mt-4 sm:h-16 sm:w-16 md:h-20 md:w-20 ${isMystery ? '' : (slot.logoGlowClassName || '')}`}
                          >
                            {isMystery ? (
                              <div className="flex h-full w-full items-center justify-center rounded-full bg-white/10">
                                <HelpCircle className="h-7 w-7 text-white/30 sm:h-9 sm:w-9 md:h-10 md:w-10" />
                              </div>
                            ) : logoUrl ? (
                              <img
                                src={logoUrl}
                                alt={`${slot.standing.department_name} logo`}
                                className="h-full w-full animate-spin-y rounded-full object-contain"
                                style={{ transformStyle: 'preserve-3d' }}
                              />
                            ) : (
                              <div
                                className={`flex h-full w-full items-center justify-center rounded-full ${theme.logoFallbackClassName}`}
                              >
                                <span className={`text-base font-black uppercase tracking-[0.16em] sm:text-sm md:text-lg ${theme.textClassName}`}>
                                  {getLogoMonogram(slot.standing.department_acronym)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-2.5 flex w-full flex-1 flex-col items-center justify-center sm:mt-4">
                            {isMystery ? (
                              <>
                                <p className="w-full text-center truncate text-base font-black uppercase tracking-[0.24em] text-white/50 sm:text-lg md:text-2xl">
                                  {getHiddenTeamAlias(slot.place)}
                                </p>
                                <p className="mt-1.5 hidden w-full text-center text-xs font-semibold uppercase leading-tight tracking-[0.14em] text-white/30 md:block md:line-clamp-2">
                                  Official Rankings Hidden
                                </p>
                              </>
                            ) : (
                              <>
                                <p className={`w-full text-center truncate text-sm font-black uppercase tracking-[0.2em] sm:text-lg md:text-2xl ${theme.textClassName}`}>
                                  {slot.standing.department_acronym}
                                </p>
                                <p className={`mt-1 hidden w-full text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] md:block md:line-clamp-2 ${theme.secondaryTextClassName}`}>
                                  {slot.standing.department_name}
                                </p>
                              </>
                            )}
                          </div>

                          <div className="mt-2.5 flex w-full flex-col items-center justify-center sm:mt-4">
                            <p className={`text-lg font-black leading-none sm:text-2xl md:text-4xl ${theme.textClassName}`}>
                              {isMystery ? "???" : formatPoints(slot.standing.total_points)}
                            </p>
                            <p className={`mt-1 text-[8px] font-bold uppercase tracking-[0.18em] sm:text-[10px] md:text-xs ${theme.tertiaryTextClassName}`}>
                              POINTS
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })()
              ))}
            </div>
          </section>

          {remainingStandings.length ? (
            <section className="rounded-[2rem] border border-theme-border-soft bg-gradient-to-br from-white via-[#F8FAFC] to-[#F1F5F9] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-5">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-blue">
                  Full standings
                </p>
              </div>

              <div className="space-y-3">
                {remainingStandings.map((standing, index) => {
                  const place = index + 4;
                  const isMystery = isPositionHidden(place);
                  const theme = isMystery
                    ? {
                        backgroundClassName: "bg-slate-600",
                        textClassName: "text-white/55",
                        pointsTextClassName: "text-white",
                        secondaryTextClassName: "text-white/40",
                        tertiaryTextClassName: "text-white/75",
                        borderClassName: "border-white/15",
                        badgeClassName: "bg-white/15 text-white/45",
                        logoRingClassName: "border-white/15 bg-transparent",
                        logoFallbackClassName: "bg-white/15 text-white/45",
                      }
                    : getDepartmentTheme(standing.department_acronym);
                  const logoUrl = isMystery ? "" : getDepartmentLogoUrl(standing.department_acronym);

                  return (
                    <div
                      key={standing.id}
                      className={`flex items-center justify-between gap-3 rounded-[1.5rem] border px-4 py-3.5 ${isMystery ? '' : 'shadow-[0_16px_32px_rgba(15,23,42,0.14)]'} ${theme.backgroundClassName} ${theme.borderClassName}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${isMystery ? '' : 'shadow-[0_10px_22px_rgba(15,23,42,0.18)]'} ${theme.badgeClassName}`}>
                          {getOrdinalSuffix(place)}
                        </div>
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${theme.logoRingClassName}`}>
                          {isMystery ? (
                            <HelpCircle className="h-5 w-5 text-white/20" />
                          ) : logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={`${standing.department_name} logo`}
                              className="h-full w-full rounded-full object-contain"
                            />
                          ) : (
                            <div className={`flex h-full w-full items-center justify-center rounded-full ${theme.logoFallbackClassName}`}>
                              <span className={`text-[11px] font-black uppercase tracking-[0.14em] ${theme.textClassName}`}>
                                {getLogoMonogram(standing.department_acronym)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-black uppercase tracking-[0.18em] sm:text-base ${theme.textClassName}`}>
                            {isMystery ? getHiddenTeamAlias(place) : standing.department_acronym}
                          </p>
                          <p className={`mt-1 hidden text-[11px] font-semibold uppercase tracking-[0.16em] sm:block ${theme.secondaryTextClassName}`}>
                            {isMystery ? "Official Rankings Hidden" : standing.department_name}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-lg font-black sm:text-xl ${theme.pointsTextClassName || theme.textClassName}`}>
                          {isMystery ? "???" : formatPoints(standing.total_points)}
                        </p>
                        <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] sm:text-xs ${theme.tertiaryTextClassName}`}>
                          POINTS
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-theme-border-soft bg-gradient-to-br from-white via-[#F8FAFC] to-[#F1F5F9] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-blue">
                  Official Tabulations
                </p>
                <h3 className="mt-2 text-xl font-bold text-theme-text">
                  Event Points Breakdown
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-muted">
                  Explore how every department accumulated points across each event category.
                </p>
              </div>
            </div>

            {!isBreakdownUnlocked ? (
              <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-10 text-center shadow-[0_24px_48px_rgba(15,23,42,0.18)]">
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                  <Lock className="h-7 w-7" />
                </div>
                <p className="mt-4 text-lg font-bold text-white">
                  Points Breakdown Locked
                </p>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  🔒 Points Breakdown will be revealed after the conclusion of the Intramural Events.
                </p>
              </div>
            ) : !masterTabulation.length ? (
              <div className="mt-6 rounded-2xl border border-dashed border-theme-border-soft bg-theme-bg px-4 py-6 text-sm text-theme-muted">
                Points breakdowns will appear after event results are encoded.
              </div>
            ) : (
              <div className="mt-6 space-y-2">
                {masterTabulation.map((dept, index) => {
                  const isExpanded = expandedBreakdownDepartmentIds.has(
                    dept.department_id,
                  );
                  const logoUrl = getDepartmentLogoUrl(
                    dept.department_acronym,
                  );

                  return (
                    <div
                      key={dept.department_id}
                      className="overflow-hidden rounded-[1.5rem] border border-theme-border-soft bg-white transition shadow-[0_16px_32px_rgba(15,23,42,0.06)]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedBreakdownDepartmentIds((currentExpanded) => {
                            const nextExpanded = new Set(currentExpanded);

                            if (nextExpanded.has(dept.department_id)) {
                              nextExpanded.delete(dept.department_id);
                            } else {
                              nextExpanded.add(dept.department_id);
                            }

                            return nextExpanded;
                          })
                        }
                        className="w-full px-4 py-4 text-left transition hover:bg-theme-surface-hover sm:px-5"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10 text-sm font-black text-brand-blue">
                              #{index + 1}
                            </div>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-theme-border-soft bg-theme-surface">
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt={`${dept.department_name} logo`}
                                  className="h-full w-full rounded-full object-contain"
                                />
                              ) : (
                                <span className="text-xs font-black uppercase tracking-[0.16em] text-theme-muted">
                                  {getLogoMonogram(dept.department_acronym)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black uppercase tracking-[0.18em] text-theme-text sm:text-base">
                                {dept.department_acronym}
                              </p>
                              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-theme-subtle sm:text-xs">
                                {dept.department_name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xl font-black text-brand-blue sm:text-2xl">
                                {formatPoints(dept.total_points)}
                              </p>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-theme-subtle sm:text-xs">
                                Points
                              </p>
                            </div>
                            <ChevronDown
                              className={`h-5 w-5 text-theme-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </div>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="border-t border-theme-border-soft bg-theme-surface px-4 py-4 sm:px-5">
                          <MasterTabulationBreakdown
                            breakdownByCategory={dept.event_breakdown_by_category}
                            formatRankLabel={formatRankLabel}
                            getRankBadgeClassName={getRankBadgeClassName}
                            emptyMessage="No event results recorded for this department yet."
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </article>
  );
}

export default HomeRankings;
