const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'index.source.html');
const OUTPUT = path.join(ROOT, process.argv[2] || 'index.local.html');
const LOGO_PATH = path.join(ROOT, 'logo.png');
const LOGO_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// Original site colors
const NAVY = '#0F2744';
const NAVY_DARK = '#0A1C33';
const NAVY_MID = '#1a3a5f';
const GOLD = '#C79A3B';
const GOLD_LIGHT = '#d4a94a';

// mycolor.space palette from primary #000000 (logo black)
// Generic: #000000 → #412728 → #7F4D3E → #B87C4C → #E2B659 → #F9F871
// Matching gradient: #000000 → #2A272A → #4B4A54 → #677381 → #82A0AA → #A3CFCD
const PALETTE = {
  black: '#000000',
  darkWarm: '#2A272A',      // overlays, elevated dark surfaces
  deepAccent: '#412728',    // icon boxes, deep warm accents
  textAccent: '#7F4D3E',    // labels/links on white backgrounds
  accentHover: '#B87C4C',   // hover borders, secondary gold
  accent: '#E2B659',        // buttons, borders, icons, primary CTA
  highlight: '#F9F871',     // soft yellow — text on dark backgrounds only
};

const LOGO_BLOCK = /<div style="width: 42px; height: 42px; border-radius: 9px; background: #[0-9A-Fa-f]{6}; display: grid; place-items: center; border: 1\.5px solid #[0-9A-Fa-f]{6}">\s*<span style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 15px; color: #fff(?:; letter-spacing: \.5px)?">M7<\/span>\s*<\/div>/g;
const LOGO_BLOCK_COMPACT = /<div style="width: 42px; height: 42px; border-radius: 9px; background: #[0-9A-Fa-f]{6}; display: grid; place-items: center; border: 1\.5px solid #[0-9A-Fa-f]{6}"><span style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 15px; color: #fff">M7<\/span><\/div>/g;
const LOGO_IMG = '<img src="' + LOGO_UUID + '" alt="Midwest Rehab 7 logo" style="width: 130px; height: auto; object-fit: contain; display: block;">';

function applyTheme(text) {
  let out = text;

  // Navy → black-based palette
  for (const c of [NAVY, NAVY.toLowerCase(), NAVY_DARK, NAVY_DARK.toLowerCase()]) {
    out = out.split(c).join(PALETTE.black);
  }
  out = out.split(NAVY_MID).join(PALETTE.darkWarm);
  out = out.split(NAVY_MID.toUpperCase()).join(PALETTE.darkWarm);

  // Gold text on light sections → warm brown (readable, palette-matched)
  out = out.replace(/color:\s*#C79A3B/gi, 'color: ' + PALETTE.textAccent);
  out = out.replace(/color:\s*#c79a3b/gi, 'color: ' + PALETTE.textAccent);

  // Gold backgrounds, borders, strokes → muted gold accent
  for (const c of [GOLD, GOLD.toLowerCase()]) out = out.split(c).join(PALETTE.accent);
  out = out.split(GOLD_LIGHT).join(PALETTE.accentHover);
  out = out.split(GOLD_LIGHT.toUpperCase()).join(PALETTE.accentHover);

  // Restore soft yellow for text on dark backgrounds
  out = out.replace(/(<footer[\s\S]*?)color: #7F4D3E/gi, (_, p) => p + 'color: ' + PALETTE.highlight);
  out = out.replace(/(min-height: 92vh[\s\S]{0,4000}?)color: #7F4D3E/gi, (_, p) => p + 'color: ' + PALETTE.highlight);
  out = out.replace(
    /(text-transform: uppercase; color: )#7F4D3E(; font-weight: 600">Property Solutions)/g,
    '$1' + PALETTE.highlight + '$2'
  );
  out = out.replace(
    /(font-weight: 800; color: )#7F4D3E(; line-height: 1">10\+)/g,
    '$1' + PALETTE.highlight + '$2'
  );
  out = out.replace(
    /(font-weight: 800; color: )#7F4D3E(; line-height: 1">4<)/g,
    '$1' + PALETTE.highlight + '$2'
  );
  out = out.replace(
    /(font-weight: 800; color: )#7F4D3E(; line-height: 1">3<)/g,
    '$1' + PALETTE.highlight + '$2'
  );
  out = out.replace(
    /(Building Stronger Communities Through <span style="color: )#7F4D3E(;">Property Preservation)/g,
    '$1' + PALETTE.highlight + '$2'
  );

  // Hero overlay — warm dark gradient from matching palette (#2A272A)
  out = out.split('rgba(9,24,44,').join('rgba(0,0,0,');
  out = out.split('rgba(15,39,68,').join('rgba(42,39,42,');
  out = out.split('rgba(15,39,68,.45)').join('rgba(0,0,0,.55)');

  // Navy-tinted shadows → neutral warm shadows
  out = out.split('rgba(15,39,68,.12)').join('rgba(42,39,42,.12)');
  out = out.split('rgba(15,39,68,.35)').join('rgba(0,0,0,.35)');

  // Gold button glow → muted gold glow
  out = out.split('rgba(199,154,59,.35)').join('rgba(226,182,89,.35)');
  out = out.split('rgba(199,154,59,.25)').join('rgba(226,182,89,.25)');

  // Nav hover → accent gold
  out = out.replace(/style-hover="color: #7F4D3E"/g, 'style-hover="color: ' + PALETTE.accent + '"');

  // Service card icon backgrounds (were navy) → deep warm accent
  out = out.replace(
    /width: 54px; height: 54px; border-radius: 12px; background: #000000/g,
    'width: 54px; height: 54px; border-radius: 12px; background: ' + PALETTE.deepAccent
  );

  return out;
}

function extractScript(content, type) {
  const open = '<script type="__bundler/' + type + '">';
  const start = content.indexOf(open);
  if (start < 0) throw new Error('Missing ' + type);
  const dataStart = start + open.length;
  const end = content.indexOf('</script>', dataStart);
  return { start, end: end + '</script>'.length, data: content.slice(dataStart, end).trim() };
}

function safeStringify(obj) {
  return JSON.stringify(obj).replace(/<\//g, '<\\u002F');
}

function build() {
  let content = fs.readFileSync(SOURCE, 'utf8');
  const logoBase64 = fs.readFileSync(LOGO_PATH).toString('base64');

  const manifestBlock = extractScript(content, 'manifest');
  const templateBlock = extractScript(content, 'template');

  const manifest = JSON.parse(manifestBlock.data);
  manifest[LOGO_UUID] = { mime: 'image/png', compressed: false, data: logoBase64 };

  let template = JSON.parse(templateBlock.data);
  template = template.replace(LOGO_BLOCK, LOGO_IMG).replace(LOGO_BLOCK_COMPACT, LOGO_IMG);
  template = applyTheme(template);

  const newManifest = JSON.stringify(manifest);
  const newTemplate = safeStringify(template);

  let output = content.slice(0, manifestBlock.start)
    + '<script type="__bundler/manifest">\n' + newManifest + '\n  </script>'
    + content.slice(manifestBlock.end, templateBlock.start)
    + '<script type="__bundler/template">\n' + newTemplate + '\n  </script>'
    + content.slice(templateBlock.end);

  const shellEnd = output.indexOf('<script type="__bundler/manifest">');
  output = applyTheme(output.slice(0, shellEnd)) + output.slice(shellEnd);
  output = output.replace(
    /<div id="__bundler_thumbnail">[\s\S]*?<\/div>/,
    '<div id="__bundler_thumbnail" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#000;z-index:9999;"><img src="logo.png" alt="Loading" style="width:180px;height:auto;"></div>'
  );

  fs.writeFileSync(OUTPUT, output, 'utf8');
  JSON.parse(extractScript(output, 'manifest').data);
  JSON.parse(extractScript(output, 'template').data);

  console.log('Built', OUTPUT);
  console.log('Palette:', PALETTE);
  console.log('Logos:', (template.match(/Midwest Rehab 7 logo/g) || []).length);
}

build();
