export const CHELAKOT = [
  { id: 'OC', label: 'אורח חיים', english: 'Orach Chayim', sefaria: 'Orach_Chayim', simanCount: 697 },
  { id: 'YD', label: 'יורה דעה', english: 'Yoreh Deah', sefaria: 'Yoreh_Deah', simanCount: 403 },
  { id: 'EH', label: 'אבן העזר', english: 'Even HaEzer', sefaria: 'Even_HaEzer', simanCount: 178 },
  { id: 'CM', label: 'חושן משפט', english: 'Choshen Mishpat', sefaria: 'Choshen_Mishpat', simanCount: 427 },
];

// Exact Sefaria title prefixes per chelek
export const SEFARIA_CHELEK = {
  OC: 'Orach Chayim',
  YD: 'Yoreh Deah',
  EH: 'Even HaEzer',
  CM: 'Choshen Mishpat',
};

// Commentary config: Sefaria title prefix, display name, Hebrew name, badge colors
export const COMMENTARIES = [
  {
    id: 'bg',
    sefariaPrefix: { OC: "Be'er HaGolah on Shulchan Arukh, Orach Chayim", YD: "Be'er HaGolah on Shulchan Arukh, Yoreh Deah", EH: "Be'er HaGolah on Shulchan Arukh, Even HaEzer", CM: "Be'er HaGolah on Shulchan Arukh, Choshen Mishpat" },
    name: "Be'er HaGolah",
    hebrew: 'באר הגולה',
    colorVar: '--badge-bg',
    bgVar: '--badge-bg-bg',
  },
  {
    id: 'pm',
    sefariaPrefix: { OC: 'Peri Megadim on Orach Chayim, Eshel Avraham', YD: 'Peri Megadim, Yoreh Deah, Siftei Daat', EH: null, CM: null },
    sefariaAlt: { OC: 'Peri Megadim on Orach Chayim, Mishbezot Zahav' },
    name: 'Pri Megadim',
    hebrew: 'פרי מגדים',
    colorVar: '--badge-pm',
    bgVar: '--badge-pm-bg',
  },
  {
    id: 'mz',
    sefariaPrefix: { OC: 'Peri Megadim on Orach Chayim, Mishbezot Zahav', YD: 'Peri Megadim, Yoreh Deah, Mishbezot Zahav', EH: null, CM: null },
    name: 'Mishbetzos Zahav',
    hebrew: 'משבצות זהב',
    colorVar: '--badge-taz',
    bgVar: '--badge-taz-bg',
  },
  {
    id: 'er',
    sefariaPrefix: { OC: 'Eliyah Rabbah on Shulchan Arukh, Orach Chayim', YD: null, EH: null, CM: null },
    name: 'Elya Rabbah',
    hebrew: 'אליה רבה',
    colorVar: '--badge-er',
    bgVar: '--badge-er-bg',
  },
  {
    id: 'shach',
    sefariaPrefix: { OC: null, YD: 'Shach on Yoreh Deah', EH: null, CM: 'Shach on Choshen Mishpat' },
    name: 'Shach',
    hebrew: 'שך',
    colorVar: '--badge-shach',
    bgVar: '--badge-shach-bg',
  },
  {
    id: 'taz',
    sefariaPrefix: { OC: 'Turei Zahav on Shulchan Arukh, Orach Chayim', YD: 'Turei Zahav on Shulchan Arukh, Yoreh Deah', EH: 'Turei Zahav on Shulchan Arukh, Even HaEzer', CM: null },
    name: 'Taz',
    hebrew: 'ט"ז',
    colorVar: '--badge-taz',
    bgVar: '--badge-taz-bg',
  },
  {
    id: 'ma',
    sefariaPrefix: { OC: 'Magen Avraham', YD: null, EH: null, CM: null },
    name: 'Magen Avraham',
    hebrew: 'מגן אברהם',
    colorVar: '--badge-ma',
    bgVar: '--badge-ma-bg',
  },
  {
    id: 'pt',
    sefariaPrefix: { OC: null, YD: "Pitchei Teshuva on Shulchan Arukh, Yoreh Deah", EH: "Pitchei Teshuva on Shulchan Arukh, Even HaEzer", CM: "Pitchei Teshuva on Shulchan Arukh, Choshen Mishpat" },
    name: 'Pischei Teshuva',
    hebrew: 'פתחי תשובה',
    colorVar: '--badge-pt',
    bgVar: '--badge-pt-bg',
  },
  {
    id: 'bh',
    sefariaPrefix: { OC: "Ba'er Hetev on Shulchan Arukh, Orach Chayim", YD: "Ba'er Hetev on Shulchan Arukh, Yoreh Deah", EH: "Ba'er Hetev on Shulchan Arukh, Even HaEzer", CM: "Ba'er Hetev on Shulchan Arukh, Choshen Mishpat" },
    name: "Ba'er Hetev",
    hebrew: 'באר היטב',
    colorVar: '--badge-bh',
    bgVar: '--badge-bh-bg',
  },
  {
    id: 'mb',
    sefariaPrefix: { OC: 'Mishnah Berurah', YD: null, EH: null, CM: null },
    name: 'Mishnah Berurah',
    hebrew: 'משנה ברורה',
    colorVar: '--badge-mb',
    bgVar: '--badge-mb-bg',
  },
];

export const LAYOUT_OPTIONS = [
  { id: 'accordion', label: 'Accordion' },
  { id: 'stacked', label: 'Stacked' },
  { id: 'sidebyside', label: 'Side by side' },
  { id: 'tabbed', label: 'Tabbed' },
];

export const COLOR_THEMES = [
  { id: 'ocean',     label: 'Ocean Deep',  swatch: '#38bdf8', desc: 'Cool blue' },
  { id: 'parchment', label: 'Parchment',   swatch: '#B8860B', desc: 'Warm cream' },
  { id: 'scholar',   label: 'Night Scholar', swatch: '#818cf8', desc: 'Neutral' },
];

export const HEBREW_FONTS = [
  { id: 'frank-ruhl', label: 'Frank Ruhl Libre', desc: 'Traditional',    family: "'Frank Ruhl Libre', 'Times New Roman', serif",   url: null },
  { id: 'noto-serif', label: 'Noto Serif Hebrew', desc: 'Modern serif',  family: "'Noto Serif Hebrew', Georgia, serif",             url: 'https://fonts.googleapis.com/css2?family=Noto+Serif+Hebrew:wght@400;500;700&display=swap' },
  { id: 'heebo',      label: 'Heebo',             desc: 'Clean sans',    family: "'Heebo', Arial, sans-serif",                      url: 'https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap' },
  { id: 'rubik',      label: 'Rubik',             desc: 'Rounded modern', family: "'Rubik', system-ui, sans-serif",                 url: 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap' },
  { id: 'noto-sans',  label: 'Noto Sans Hebrew',  desc: 'Geometric sans', family: "'Noto Sans Hebrew', Arial, sans-serif",          url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;500;700&display=swap' },
  { id: 'david',      label: 'David Libre',        desc: 'Newspaper',    family: "'David Libre', Georgia, serif",                   url: 'https://fonts.googleapis.com/css2?family=David+Libre:wght@400;700&display=swap' },
  { id: 'suez',       label: 'Suez One',           desc: 'Bold headline', family: "'Suez One', Georgia, serif",                     url: 'https://fonts.googleapis.com/css2?family=Suez+One&display=swap' },
  { id: 'miriam',     label: 'Miriam Libre',       desc: 'Classic print', family: "'Miriam Libre', Georgia, serif",                 url: 'https://fonts.googleapis.com/css2?family=Miriam+Libre:wght@400;700&display=swap' },
];

// SA text source
export const SA_SOURCE = {
  id: 'sa',
  name: 'Shulchan Aruch',
  hebrew: 'שולחן ערוך',
  colorVar: '--badge-sa',
  bgVar: '--badge-sa-bg',
};
