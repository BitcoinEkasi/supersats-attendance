export const TSK_LEVELS = [
  { value: "Turtle Rookie",        tagline: "Beach & ocean safety, getting comfortable in the water" },
  { value: "Turtle Novice",        tagline: "Standing tall and loving the ocean" },
  { value: "Seal Intermediate",    tagline: "Catching green waves and turning" },
  { value: "Seal Proficient",      tagline: "Linking moves with control and flow" },
  { value: "Dolphin Advanced",     tagline: "Generating speed and adding style" },
  { value: "Dolphin Refined",      tagline: "Flowing through sections with power and confidence" },
  { value: "Shark Elite",          tagline: "Powered up and touring team ready" },
  { value: "Free Surfer",          tagline: "Skill, style and the love of the ocean — a surfer first and always" },
] as const;

export const TSK_LEVEL_MAP = Object.fromEntries(TSK_LEVELS.map((l) => [l.value, l.tagline]));

export const POD_LEVEL = "Shark Elite";
export const FREE_SURFER_LEVEL = "Free Surfer";
