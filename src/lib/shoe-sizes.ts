export const SHOE_SIZES = [
  "Kids 10", "Kids 11", "Kids 12", "Kids 13",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13",
] as const;

export type ShoeSize = (typeof SHOE_SIZES)[number];
