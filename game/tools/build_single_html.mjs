import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const srcDir = path.join(root, 'src');
const configDir = path.join(root, 'config');
const assetsDir = path.join(root, 'assets');

const moduleOrder = [
  'assets.js',
  'audio.js',
  'battle.js',
  'config.js',
  'events.js',
  'fx.js',
  'gacha.js',
  'rng.js',
  'skills.js',
  'titles.js',
  'main.js',
];

const mimeTypes = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.mp3', 'audio/mpeg'],
  ['.json', 'application/json'],
  ['.webmanifest', 'application/manifest+json'],
]);

const safeJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

async function buildAssetMap() {
  const files = [
    ...await walkFiles(assetsDir),
    ...await Promise.all(
      [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'android-chrome-192x192.png',
        'android-chrome-512x512.png',
        'site.webmanifest',
      ].map(async (name) => {
        const fullPath = path.join(root, name);
        try {
          return (await stat(fullPath)).isFile() ? fullPath : null;
        } catch {
          return null;
        }
      }),
    ),
  ].filter(Boolean);

  const out = {};
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const ext = path.extname(file).toLowerCase();
    const mime = mimeTypes.get(ext) || 'application/octet-stream';
    const data = await readFile(file);
    out[rel] = `data:${mime};base64,${data.toString('base64')}`;
  }
  return out;
}

async function buildConfigMap() {
  const files = (await readdir(configDir)).filter((name) => name.endsWith('.json')).sort();
  const out = {};
  for (const file of files) {
    const key = path.basename(file, '.json');
    out[key] = JSON.parse(await readFile(path.join(configDir, file), 'utf8'));
  }
  return out;
}

function stripModuleSyntax(file, code) {
  let out = code.replace(/^import\s+[\s\S]*?;\s*$/gm, '');
  out = out.replace(/^export\s+(?=(async\s+function|function|const|let|var|class)\s)/gm, '');
  out = out.replace(/^export\s+\{[\s\S]*?\};\s*$/gm, '');
  if (file === 'fx.js') {
    out += '\nconst fx = { hitstop, isFrozen, shakeStage, flash, knockback, screenFlash, anim, popDamage, sprite, dust, burst };\n';
  }
  return `\n/* ---- ${file} ---- */\n${out}\n`;
}

async function buildScriptBundle() {
  const chunks = [];
  for (const file of moduleOrder) {
    const code = await readFile(path.join(srcDir, file), 'utf8');
    chunks.push(stripModuleSyntax(file, code));
  }
  return chunks.join('\n');
}

function rewriteCssUrls(css, assetMap) {
  return css
    .replace(/^@import\s+url\([^)]+\);\s*/m, '')
    .replace(/url\((['"]?)(\.\.\/assets\/[^'")]+|assets\/[^'")]+)\1\)/g, (_match, _q, rawPath) => {
      const key = rawPath.replace(/^(\.\.\/)+/, '');
      return assetMap[key] ? `url("${assetMap[key]}")` : `url("${rawPath}")`;
    });
}

const runtime = `
const __GAME_CONFIG__ = __CONFIG_DATA__;
const __GAME_ASSETS__ = __ASSET_DATA__;
const __ASSET_RE__ = /(?:(?:\\.\\.\\/)+|\\.\\/)?assets\\/[A-Za-z0-9_.\\/-]+\\.(?:png|jpg|jpeg|gif|webp|mp3|ico)/g;

function __assetKey(value) {
  const raw = String(value || '');
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('http:') || raw.startsWith('https:')) return null;
  const withoutQuery = raw.split(/[?#]/)[0];
  const assetIndex = withoutQuery.lastIndexOf('assets/');
  if (assetIndex >= 0) return withoutQuery.slice(assetIndex);
  return withoutQuery.replace(/^\\.\\//, '').replace(/^\\//, '');
}

function __asset(value) {
  const raw = String(value || '');
  const key = __assetKey(raw);
  return key && __GAME_ASSETS__[key] ? __GAME_ASSETS__[key] : raw;
}

function __rewriteAssetUrls(value) {
  return String(value).replace(__ASSET_RE__, (match) => __asset(match));
}

const __nativeFetch = window.fetch ? window.fetch.bind(window) : null;
window.fetch = async (resource, init) => {
  const raw = typeof resource === 'string' ? resource : resource && resource.url;
  const key = __assetKey(raw);
  const configMatch = key && key.match(/^config\\/([A-Za-z0-9_-]+)\\.json$/);
  if (configMatch && Object.prototype.hasOwnProperty.call(__GAME_CONFIG__, configMatch[1])) {
    return new Response(JSON.stringify(__GAME_CONFIG__[configMatch[1]]), {
      status: 200,
      headers: { 'content-type': 'application/json;charset=utf-8' },
    });
  }
  if (__nativeFetch) return __nativeFetch(resource, init);
  throw new Error('fetch is unavailable in this browser');
};

const __innerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
if (__innerHTML && __innerHTML.set && __innerHTML.get) {
  Object.defineProperty(Element.prototype, 'innerHTML', {
    configurable: true,
    enumerable: __innerHTML.enumerable,
    get() { return __innerHTML.get.call(this); },
    set(value) { __innerHTML.set.call(this, __rewriteAssetUrls(value)); },
  });
}

const __insertAdjacentHTML = Element.prototype.insertAdjacentHTML;
Element.prototype.insertAdjacentHTML = function(position, text) {
  return __insertAdjacentHTML.call(this, position, __rewriteAssetUrls(text));
};

const __setAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function(name, value) {
  const n = String(name).toLowerCase();
  const v = n === 'src' || n === 'href' || n === 'style' ? __rewriteAssetUrls(value) : value;
  return __setAttribute.call(this, name, v);
};

function __patchSrc(proto) {
  const desc = Object.getOwnPropertyDescriptor(proto, 'src');
  if (!desc || !desc.set || !desc.get) return;
  Object.defineProperty(proto, 'src', {
    configurable: true,
    enumerable: desc.enumerable,
    get() { return desc.get.call(this); },
    set(value) { desc.set.call(this, __asset(value)); },
  });
}
if (window.HTMLImageElement) __patchSrc(HTMLImageElement.prototype);
if (window.HTMLMediaElement) __patchSrc(HTMLMediaElement.prototype);

const __NativeAudio = window.Audio;
if (__NativeAudio) {
  window.Audio = function(src) {
    const audio = new __NativeAudio();
    if (src !== undefined) audio.src = __asset(src);
    return audio;
  };
  window.Audio.prototype = __NativeAudio.prototype;
}

function __applyAssetAttrs(root) {
  const nodes = [];
  if (root && root.nodeType === 1) nodes.push(root);
  if (root && root.querySelectorAll) nodes.push(...root.querySelectorAll('[src],[href],[style]'));
  for (const node of nodes) {
    for (const attr of ['src', 'href', 'style']) {
      if (!node.hasAttribute || !node.hasAttribute(attr)) continue;
      const current = node.getAttribute(attr);
      const next = attr === 'style' ? __rewriteAssetUrls(current) : __asset(current);
      if (next !== current) __setAttribute.call(node, attr, next);
    }
  }
}

new MutationObserver((records) => {
  for (const record of records) {
    if (record.type === 'childList') record.addedNodes.forEach(__applyAssetAttrs);
    else if (record.type === 'attributes') __applyAssetAttrs(record.target);
  }
}).observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['src', 'href', 'style'],
});
`;

async function main() {
  const [assetMap, configMap, bundle, rawCss] = await Promise.all([
    buildAssetMap(),
    buildConfigMap(),
    buildScriptBundle(),
    readFile(path.join(srcDir, 'style.css'), 'utf8'),
  ]);

  const css = rewriteCssUrls(rawCss, assetMap);
  const script = `${runtime
    .replace('__CONFIG_DATA__', safeJson(configMap))
    .replace('__ASSET_DATA__', safeJson(assetMap))}
${bundle}`;

  const html = `<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <title>少爷，请买单！</title>
  <link rel="icon" href="${assetMap['favicon.ico'] || ''}" sizes="any">
  <meta name="theme-color" content="#f6a740">
  <style>
${css}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
(() => {
${script}
})();
  </script>
</body>
</html>
`;

  await mkdir(distDir, { recursive: true });
  const outFile = path.join(distDir, 'index.html');
  await writeFile(outFile, html, 'utf8');
  const sizeMb = Buffer.byteLength(html, 'utf8') / 1024 / 1024;
  console.log(`Built ${path.relative(root, outFile)} (${sizeMb.toFixed(2)} MB)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
