import type { ThemeName } from "../lib/course";

export type Palette = {
  label: string;
  fairway: [number, number, number];
  rough: [number, number, number];
  woods: [number, number, number];
  green: [number, number, number];
  fringe: [number, number, number];
  sand: [number, number, number];
  tee: [number, number, number];
  water: number;
  skyTop: number;
  skyBottom: number;
  fog: number;
  sun: number;
  oak: number[];
  pine: number[];
  trunk: number;
};

export const PALETTES: Record<ThemeName, Palette> = {
  parkland: {
    label: "Parkland",
    fairway: [96, 178, 74],
    rough: [62, 132, 52],
    woods: [38, 84, 36],
    green: [120, 205, 92],
    fringe: [104, 186, 80],
    sand: [236, 218, 170],
    tee: [104, 186, 80],
    water: 0x2f7fb5,
    skyTop: 0x3b82d6,
    skyBottom: 0xcfe6f7,
    fog: 0xc6deef,
    sun: 0xfff3dc,
    oak: [0x2e6b2f, 0x3a7d34, 0x275e2a, 0x4a8a3a],
    pine: [0x1f4d2b, 0x24583a, 0x1a4426],
    trunk: 0x5a4030,
  },
  links: {
    label: "Links",
    fairway: [150, 176, 88],
    rough: [142, 156, 84],
    woods: [104, 116, 62],
    green: [132, 190, 84],
    fringe: [140, 182, 86],
    sand: [226, 206, 150],
    tee: [140, 182, 86],
    water: 0x3d6f8e,
    skyTop: 0x6b8fb8,
    skyBottom: 0xe2e6e4,
    fog: 0xd6dcda,
    sun: 0xfff6e8,
    oak: [0x58703a, 0x6a7d40, 0x4b6234],
    pine: [0x34503a, 0x2c4632],
    trunk: 0x5b4a38,
  },
  autumn: {
    label: "Autumn",
    fairway: [112, 168, 70],
    rough: [96, 130, 56],
    woods: [92, 74, 44],
    green: [124, 196, 88],
    fringe: [114, 180, 78],
    sand: [232, 212, 168],
    tee: [114, 180, 78],
    water: 0x356f9a,
    skyTop: 0x5d8fc9,
    skyBottom: 0xf3e2c8,
    fog: 0xe8d9c2,
    sun: 0xffe2b8,
    oak: [0xd2691e, 0xc0392b, 0xe0a030, 0xb8541a, 0x8f3b1b, 0xd9a441],
    pine: [0x2b4d2e, 0x355a33],
    trunk: 0x4a3324,
  },
  desert: {
    label: "Desert",
    fairway: [110, 176, 82],
    rough: [178, 150, 104],
    woods: [196, 160, 112],
    green: [118, 196, 94],
    fringe: [112, 184, 86],
    sand: [240, 214, 164],
    tee: [112, 184, 86],
    water: 0x2a8fb0,
    skyTop: 0x2f7fd4,
    skyBottom: 0xf6dfc0,
    fog: 0xf0dcc0,
    sun: 0xfff0d0,
    oak: [0x6f7f3a, 0x7d8a46, 0x5c6b30],
    pine: [0x4f6b38, 0x5a7840],
    trunk: 0x6b5236,
  },
};
