// Fixed approved palette. Every ball must use one of these colors as-is —
// no derived tints/shades.
export const PALETTE = {
  pink: "#FFCEE8",
  hotPink: "#FF98ED",
  purple: "#CE88FF",
  blue: "#76A6FF",
  skyBlue: "#0ED7FF",
  mintBlue: "#4CFFF6",
  coral: "#FF9276",
  orange: "#FFB473",
  softYellow: "#FCFFA6",
  lime: "#B7FD7E",
  emerald: "#00F18E",
  mintGreen: "#89FFDB",
} as const;

export type PaletteColor = (typeof PALETTE)[keyof typeof PALETTE];

export const ALL_COLORS: PaletteColor[] = Object.values(PALETTE);

export const WARM_COLORS: PaletteColor[] = [
  PALETTE.pink,
  PALETTE.hotPink,
  PALETTE.coral,
  PALETTE.orange,
  PALETTE.softYellow,
];

export const COOL_COLORS: PaletteColor[] = [
  PALETTE.purple,
  PALETTE.blue,
  PALETTE.skyBlue,
  PALETTE.mintBlue,
  PALETTE.lime,
  PALETTE.emerald,
  PALETTE.mintGreen,
];
