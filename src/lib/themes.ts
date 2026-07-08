export type BrandId = 'supra' | 'bmw' | 'porsche' | 'maserati' | 'aston';

export type BrandShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type BrandPalette = Record<BrandShade, string>;

/** RGB channels as "r g b" for CSS variables */
export const BRAND_PALETTES: Record<BrandId, { light: BrandPalette; dark: BrandPalette }> = {
  supra: {
    light: {
      50: '254 242 242',
      100: '254 226 226',
      200: '254 202 202',
      300: '252 165 165',
      400: '248 113 113',
      500: '239 68 68',
      600: '220 38 38',
      700: '185 28 28',
      800: '153 27 27',
      900: '127 29 29',
    },
    dark: {
      50: '69 10 10',
      100: '127 29 29',
      200: '153 27 27',
      300: '185 28 28',
      400: '220 38 38',
      500: '239 68 68',
      600: '248 113 113',
      700: '252 165 165',
      800: '254 202 202',
      900: '254 226 226',
    },
  },
  bmw: {
    light: {
      50: '239 246 255',
      100: '219 234 254',
      200: '191 219 254',
      300: '147 197 253',
      400: '96 165 250',
      500: '59 130 246',
      600: '28 105 212',
      700: '29 78 216',
      800: '30 64 175',
      900: '30 58 138',
    },
    dark: {
      50: '23 37 84',
      100: '30 58 138',
      200: '30 64 175',
      300: '29 78 216',
      400: '28 105 212',
      500: '59 130 246',
      600: '96 165 250',
      700: '147 197 253',
      800: '191 219 254',
      900: '219 234 254',
    },
  },
  porsche: {
    light: {
      50: '255 241 242',
      100: '255 228 230',
      200: '254 205 211',
      300: '253 164 175',
      400: '251 113 133',
      500: '244 63 94',
      600: '213 0 28',
      700: '190 18 60',
      800: '159 18 57',
      900: '136 19 55',
    },
    dark: {
      50: '76 5 25',
      100: '136 19 55',
      200: '159 18 57',
      300: '190 18 60',
      400: '213 0 28',
      500: '244 63 94',
      600: '251 113 133',
      700: '253 164 175',
      800: '254 205 211',
      900: '255 228 230',
    },
  },
  maserati: {
    light: {
      50: '239 246 255',
      100: '219 234 254',
      200: '191 219 254',
      300: '147 197 253',
      400: '96 165 250',
      500: '59 130 246',
      600: '21 101 192',
      700: '12 35 64',
      800: '15 45 82',
      900: '12 28 48',
    },
    dark: {
      50: '12 28 48',
      100: '15 45 82',
      200: '12 35 64',
      300: '21 101 192',
      400: '59 130 246',
      500: '96 165 250',
      600: '147 197 253',
      700: '191 219 254',
      800: '219 234 254',
      900: '239 246 255',
    },
  },
  aston: {
    light: {
      50: '236 253 245',
      100: '209 250 229',
      200: '167 243 208',
      300: '110 231 183',
      400: '52 211 153',
      500: '16 185 129',
      600: '0 86 64',
      700: '4 120 87',
      800: '6 95 70',
      900: '6 78 59',
    },
    dark: {
      50: '6 78 59',
      100: '6 95 70',
      200: '4 120 87',
      300: '0 86 64',
      400: '16 185 129',
      500: '52 211 153',
      600: '110 231 183',
      700: '167 243 208',
      800: '209 250 229',
      900: '236 253 245',
    },
  },
};

export const BRAND_IDS: BrandId[] = ['supra', 'bmw', 'porsche', 'maserati', 'aston'];

export function brandIdFromIndex(index: number): BrandId {
  return BRAND_IDS[((index % BRAND_IDS.length) + BRAND_IDS.length) % BRAND_IDS.length];
}

export function brandIndexFromId(id: BrandId): number {
  return BRAND_IDS.indexOf(id);
}

export function applyBrandPalette(brandId: BrandId, darkMode: boolean) {
  const palette = BRAND_PALETTES[brandId][darkMode ? 'dark' : 'light'];
  const root = document.documentElement;

  for (const [shade, rgb] of Object.entries(palette)) {
    root.style.setProperty(`--brand-${shade}`, rgb);
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const [r, g, b] = palette[600].split(' ').map(Number);
    meta.setAttribute('content', rgbToHex(r, g, b));
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
