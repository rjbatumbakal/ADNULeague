export const matchupDayOptions = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

export const matchupVenueOptions = [
  "Gymnasium",
  "Covered Courts",
  "Football Field",
  "Tennis Court",
  "Xavier Hall",
  "Phelan Lab (P217)",
  "Phelan Lab (P216)",
  "Santos Building (Lab 2)",
  "Santos Building (MMLab)",
  "3rd Floor Bonoan",
  "Arrupe",
  "Barcade",
  "Civic Center",
];

export const matchupTeamOptions = [
  "ABBS",
  "ACHSS",
  "ANSA",
  "AXI",
  "COCS",
  "COL",
  "JPIA",
  "STEP",
];

export const teamLogoByName = {
  ABBS: "/College Department Logos/ABBS_LOGO_withBG.png",
  ACHSS: "/College Department Logos/ACHSS_Logo.png",
  ANSA: "/College Department Logos/ANSA_LOGO_withBG.png",
  AXI: "/College Department Logos/AXI_LOGO_withBG.png",
  COCS: "/College Department Logos/COCS_LOGO_withBG.png",
  COL: "/College Department Logos/COL_LOGO_withBG.png",
  JPIA: "/College Department Logos/JPIA_LOGO_withBG.png",
  STEP: "/College Department Logos/STEP_LOGO_withBG.png",
};

export function getTeamLogo(teamName) {
  return teamLogoByName[String(teamName ?? "").trim().toUpperCase()] ?? null;
}
