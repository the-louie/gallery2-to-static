/**
 * Fuzzy filename match algorithm evaluator.
 *
 * DEPRECATED: With local g2data/albums, database paths match disk directly.
 * No fuzzy matching needed. Kept for reference or one-off analysis.
 *
 * Evaluates matching algorithms to map database-derived URLs (from the mismatch
 * report) to actual files in the file list. Target: ≥98% hit rate.
 *
 * Weighted fuzzy consensus algorithm: trigram filename index for candidate pool,
 * early-exit scoping (top 50), Jaro-Winkler + token-overlap strategies with
 * Borda count consensus, tiered threshold (confidence gap), depth penalty,
 * substring containment multiplier, numeric skeleton, stemming and optional
 * synonym map. Training mode (--train, --golden-set) tunes weights on a golden set.
 *
 * Inputs: mismatch markdown (URLs), file list (e.g. all-lanbilder-files.txt)
 * Output: stdout table of algorithm | hits | misses | hit rate, sorted by best
 *
 * Output strategy JSON schema (--output-strategy):
 *   { algorithm, type: "single"|"consensus", params, hits, total, hitRate }
 *   For single algorithms, params is null. For "Weighted fuzzy consensus
 *   (path+album+filename)", params includes threshold, confidenceGap,
 *   lowerThreshold, weights. Written for backend consumption.
 *
 * Usage:
 *   node scripts/fuzzy-filename-match-algorithms.mjs
 *   node scripts/fuzzy-filename-match-algorithms.mjs --mismatch-file path --file-list path
 *   node scripts/fuzzy-filename-match-algorithms.mjs --threshold 0.55 --confidence-gap 0.3 --lower-threshold 0.45
 *   node scripts/fuzzy-filename-match-algorithms.mjs --weights 0.2,0.4,0.4
 *   node scripts/fuzzy-filename-match-algorithms.mjs --train --golden-set path [--file-list path]
 *   node scripts/fuzzy-filename-match-algorithms.mjs --output-strategy [path]
 *     Writes best-strategy JSON for backend. Default path: fuzzy-match-strategy.json (repo root).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const defaultMismatchFile = path.join(repoRoot, '__docs', 'missing_images_20260201', '02-mismatch-backend-vs-extract-py.md');
const defaultFileList = path.join(repoRoot, '__docs', 'missing_images_20260201', 'all-lanbilder-files.txt');

function parseArgs() {
  const args = process.argv.slice(2);
  let mismatchFile = defaultMismatchFile;
  let fileList = defaultFileList;
  let train = false;
  let goldenSetPath = null;
  let threshold = 0.55;
  let confidenceGap = 0.3;
  let lowerThreshold = 0.45;
  let weightsStr = null;
  let outputStrategyPath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mismatch-file' && args[i + 1]) {
      mismatchFile = args[++i];
    } else if (args[i] === '--file-list' && args[i + 1]) {
      fileList = args[++i];
    } else if (args[i] === '--train') {
      train = true;
    } else if (args[i] === '--golden-set' && args[i + 1]) {
      goldenSetPath = args[++i];
    } else if (args[i] === '--threshold' && args[i + 1]) {
      threshold = Number(args[++i]);
    } else if (args[i] === '--confidence-gap' && args[i + 1]) {
      confidenceGap = Number(args[++i]);
    } else if (args[i] === '--lower-threshold' && args[i + 1]) {
      lowerThreshold = Number(args[++i]);
    } else if (args[i] === '--weights' && args[i + 1]) {
      weightsStr = args[++i];
    } else if (args[i] === '--output-strategy') {
      outputStrategyPath =
        args[i + 1] && !args[i + 1].startsWith('--')
          ? args[++i]
          : path.join(repoRoot, 'fuzzy-match-strategy.json');
    }
  }
  let weights = { ...DEFAULT_WEIGHTS };
  if (weightsStr) {
    const parts = weightsStr.split(/[,]/).map((p) => Number(p.trim()));
    if (parts.length >= 3) {
      weights = { pathWeight: parts[0], albumWeight: parts[1], fileWeight: parts[2] };
    }
  }
  return {
    mismatchFile,
    fileList,
    train,
    goldenSetPath,
    threshold,
    confidenceGap,
    lowerThreshold,
    weights,
    outputStrategyPath,
  };
}

function extractUrl(line) {
  const m = line.match(/https?:\/\/[^\s)]+/);
  return m ? m[0] : null;
}

/**
 * De-duplicate repeated base or extension in thumb filename (e.g. ___X___X.jpg -> X.jpg).
 */
function dedupeBaseFilename(str) {
  if (!str || typeof str !== 'string') return '';
  const triple = str.indexOf('___');
  if (triple === -1) return str;
  const after = str.slice(triple + 3);
  const ext = (after.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '').toLowerCase();
  const base = ext ? after.slice(0, -ext.length) : after;
  if (base.includes('___')) {
    const parts = base.split('___').filter(Boolean);
    const last = parts[parts.length - 1];
    const dot = last.lastIndexOf('.');
    const baseOnly = dot !== -1 ? last.slice(0, dot) : last;
    const deduped = baseOnly + ext;
    return deduped || str;
  }
  return after;
}

/**
 * Parse thumb filename to extract base filename for full-size lookup.
 * Format: __t_<uipath>___<pathcomponent>.jpg or __t_<uipath>.jpg
 * Returns pathcomponent if present, else uipath + '.jpg'; de-duplicated.
 */
function extractBaseFilename(thumbFilename) {
  if (!thumbFilename || typeof thumbFilename !== 'string') return '';
  const triple = thumbFilename.indexOf('___');
  let raw = '';
  if (triple !== -1) {
    const after = thumbFilename.slice(triple + 3);
    const dot = after.lastIndexOf('.');
    raw = dot !== -1 ? after.slice(0, dot) + after.slice(dot) : after;
  } else {
    const afterPrefix = thumbFilename.replace(/^__t_/, '');
    raw = !afterPrefix.endsWith('.jpg') && !afterPrefix.endsWith('.JPG')
      ? afterPrefix + '.jpg'
      : afterPrefix;
  }
  return dedupeBaseFilename(raw || thumbFilename) || raw;
}

function parseMismatchUrls(content) {
  const lines = content.split(/\r?\n/);
  const seen = new Set();
  const result = [];
  for (const line of lines) {
    if (!line.startsWith('- ')) continue;
    const url = extractUrl(line);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const pathPart = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '') || '';
    const segments = pathPart.split('/').filter(Boolean);
    if (segments.length === 0) continue;
    const thumbFilename = segments.pop();
    const dirSegments = segments;
    const urlPath = dirSegments.join('/');
    const baseFilename = extractBaseFilename(thumbFilename);
    result.push({
      url,
      urlPath,
      dirSegments,
      thumbFilename,
      baseFilename,
    });
  }
  return result;
}

/**
 * Parse a single URL into the same shape as parseMismatchUrls entries.
 */
function parseOneUrl(url) {
  const pathPart = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '') || '';
  const segments = pathPart.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  const thumbFilename = segments.pop();
  const dirSegments = segments;
  const urlPath = dirSegments.join('/');
  const baseFilename = extractBaseFilename(thumbFilename);
  return { url, urlPath, dirSegments, thumbFilename, baseFilename };
}

/**
 * Load golden set: one line per "url<TAB>fullPath" or JSON array of { url, fullPath }.
 */
function loadGoldenSet(content) {
  const trimmed = content.trim();
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(content);
      return arr.map((o) => ({ url: o.url, fullPath: o.fullPath })).filter((o) => o.url && o.fullPath);
    } catch {
      return [];
    }
  }
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result = [];
  for (const line of lines) {
    const idx = line.indexOf('\t');
    if (idx !== -1) {
      result.push({ url: line.slice(0, idx).trim(), fullPath: line.slice(idx + 1).trim() });
    }
  }
  return result;
}

function loadFileList(content) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    const p = line.replace(/^\.\//, '').replace(/\\/g, '/');
    const lastSlash = p.lastIndexOf('/');
    const dirPath = lastSlash === -1 ? '' : p.slice(0, lastSlash);
    const filename = lastSlash === -1 ? p : p.slice(lastSlash + 1);
    const dirSegments = dirPath ? dirPath.split('/') : [];
    entries.push({
      fullPath: p,
      dirPath,
      dirSegments,
      filename,
    });
  }
  return entries;
}

function buildFileIndex(entries) {
  const byExactPath = new Map();
  const byPathLower = new Map();
  const byLastSegment = new Map();
  const byDirPathLower = new Map();

  for (const e of entries) {
    const key = e.dirPath + '/' + e.filename;
    byExactPath.set(key, e);
    byExactPath.set(e.fullPath, e);

    const pathLower = (e.dirPath + '/' + e.filename).toLowerCase();
    if (!byPathLower.has(pathLower)) byPathLower.set(pathLower, []);
    byPathLower.get(pathLower).push(e);

    const lastSeg = e.dirSegments[e.dirSegments.length - 1] || '';
    const lastKey = lastSeg.toLowerCase();
    if (!byLastSegment.has(lastKey)) byLastSegment.set(lastKey, []);
    byLastSegment.get(lastKey).push(e);

    const dirLower = e.dirPath.toLowerCase();
    if (!byDirPathLower.has(dirLower)) byDirPathLower.set(dirLower, []);
    byDirPathLower.get(dirLower).push(e);
  }

  return {
    entries,
    byExactPath,
    byPathLower,
    byLastSegment,
    byDirPathLower,
    byFilenameLower: buildFilenameIndex(entries),
    trigramIndex: buildTrigramFilenameIndex(entries),
  };
}

/**
 * Trigram filename index: keys = 3-char substrings of filename (lowercase), value = list of file entries (dedupe by fullPath).
 */
function buildTrigramFilenameIndex(entries) {
  const map = new Map();
  for (const e of entries) {
    const fn = (e.filename || '').toLowerCase();
    for (let i = 0; i <= fn.length - 3; i++) {
      const tg = fn.slice(i, i + 3);
      if (!map.has(tg)) map.set(tg, []);
      map.get(tg).push(e);
    }
  }
  for (const list of map.values()) {
    const seen = new Set();
    const uniq = list.filter((e) => {
      if (seen.has(e.fullPath)) return false;
      seen.add(e.fullPath);
      return true;
    });
    list.length = 0;
    list.push(...uniq);
  }
  return map;
}

const CANDIDATE_CAP = 500;
const EARLY_EXIT_TOP = 50;

/**
 * Get trigrams from a string (lowercase, 3-char substrings).
 */
function getTrigrams(str) {
  const s = (str || '').toLowerCase();
  const set = new Set();
  for (let i = 0; i <= s.length - 3; i++) set.add(s.slice(i, i + 3));
  return set;
}

/**
 * Add up to sourceLimit new entries from entries into seen; returns nothing.
 */
function addFromSource(entries, sourceLimit, seen) {
  let added = 0;
  for (const e of entries) {
    if (added >= sourceLimit) break;
    if (!e || e.fullPath == null) continue;
    if (!seen.has(e.fullPath)) {
      seen.set(e.fullPath, e);
      added++;
    }
  }
}

/**
 * Union of last-segment, path-variant, and trigram-based candidates; dedupe by fullPath; cap 500; then early-exit scope to top 50.
 * Per-source quota (cap/3 each) prevents one strategy from starving the others (e.g. large last-segment blocking trigrams).
 */
function getCandidates(parsed, fileIndex, options = {}) {
  const cap = options.candidateCap ?? CANDIDATE_CAP;
  const topN = options.earlyExitTop ?? EARLY_EXIT_TOP;
  const perSourceCap = Math.max(1, Math.floor(cap / 3));
  const seen = new Map();

  const lastSeg = (parsed.dirSegments[parsed.dirSegments.length - 1] || '').toLowerCase();
  addFromSource(fileIndex.byLastSegment.get(lastSeg) || [], perSourceCap, seen);

  const variants = pathVariants(parsed.dirSegments);
  const variantEntries = [];
  for (const v of variants) {
    const dirLower = v.toLowerCase();
    for (const e of fileIndex.byDirPathLower.get(dirLower) || []) variantEntries.push(e);
  }
  addFromSource(variantEntries, perSourceCap, seen);

  const baseFn = (parsed.baseFilename || '').toLowerCase();
  const trigrams = getTrigrams(baseFn);
  const trigramEntries = [];
  for (const tg of trigrams) {
    for (const e of fileIndex.trigramIndex.get(tg) || []) trigramEntries.push(e);
  }
  addFromSource(trigramEntries, perSourceCap, seen);

  let pool = Array.from(seen.values());
  if (pool.length > cap) pool = pool.slice(0, cap);
  if (pool.length <= topN) return pool;

  const baseLen = baseFn.length;
  const firstCh = baseFn[0] || '';
  const scored = pool.map((e) => {
    const fn = (e.filename || '').toLowerCase();
    const eTrigrams = getTrigrams(fn);
    let overlap = 0;
    for (const t of trigrams) if (eTrigrams.has(t)) overlap++;
    const lenOk = Math.abs(fn.length - baseLen) <= 5;
    const firstOk = (fn[0] || '') === firstCh;
    const heuristic = overlap * 10 + (firstOk ? 5 : 0) + (lenOk ? 1 : 0);
    return { e, heuristic };
  });
  scored.sort((a, b) => b.heuristic - a.heuristic);
  return scored.slice(0, topN).map((x) => x.e);
}

const DEFAULT_WEIGHTS = { pathWeight: 0.2, albumWeight: 0.4, fileWeight: 0.4 };
const DEFAULT_THRESHOLD = 0.55;
const DEFAULT_CONFIDENCE_GAP = 0.3;
const DEFAULT_LOWER_THRESHOLD = 0.45;
const DEPTH_PENALTY_PER_LEVEL = 0.02;
const DEPTH_PENALTY_CAP = 0.1;
const CONTAINMENT_MULTIPLIER = 1.2;

/**
 * Score one candidate: pathSim, albumSim, fileSim (with optional skeleton bonus); containment multiplier; depth penalty.
 * options: { simFn (getJaroWinkler|getTokenOverlap), useSkeleton, containmentMultiplier }
 */
function scoreCandidate(parsed, fileEntry, weights, options = {}) {
  let w = { ...DEFAULT_WEIGHTS, ...weights };
  const sum = (w.pathWeight || 0) + (w.albumWeight || 0) + (w.fileWeight || 0);
  if (sum > 0) {
    w = {
      pathWeight: w.pathWeight / sum,
      albumWeight: w.albumWeight / sum,
      fileWeight: w.fileWeight / sum,
    };
  }
  const simFn = options.simFn || getJaroWinkler;

  const urlPath = (parsed.dirSegments || []).join('/');
  const filePath = (fileEntry.dirSegments || []).join('/');
  const urlAlbum = (parsed.dirSegments[parsed.dirSegments.length - 1] || '').toLowerCase();
  const fileAlbum = (fileEntry.dirSegments[fileEntry.dirSegments.length - 1] || '').toLowerCase();
  const baseFn = (parsed.baseFilename || '').toLowerCase();
  const fileFn = (fileEntry.filename || '').toLowerCase();

  let pathSim = simFn(urlPath, filePath);
  let albumSim = simFn(urlAlbum, fileAlbum);

  if (options.useStemming !== false) {
    const stemmedUrlPath = (parsed.dirSegments || []).map(stemSegment).join('/');
    const stemmedFilePath = (fileEntry.dirSegments || []).map(stemSegment).join('/');
    pathSim = Math.max(pathSim, simFn(stemmedUrlPath, stemmedFilePath));
    albumSim = Math.max(albumSim, simFn(stemSegment(urlAlbum), stemSegment(fileAlbum)));
  }
  if (options.useSynonyms) {
    const urlAlbumExp = SEGMENT_SYNONYMS.get(urlAlbum) || urlAlbum;
    albumSim = Math.max(albumSim, simFn(urlAlbumExp, fileAlbum));
  }
  if (urlAlbum && (fileAlbum.includes(urlAlbum) || urlAlbum.includes(fileAlbum))) {
    albumSim = Math.min(1, albumSim + 0.1);
  }

  let fileSim = simFn(baseFn, fileFn);

  if (options.useSkeleton) {
    const skUrl = preprocess(baseFn, { skeleton: true, dedupe: false });
    const skFile = preprocess(fileFn, { skeleton: true, dedupe: false });
    const skSim = simFn(skUrl, skFile);
    fileSim = Math.max(fileSim, skSim * 0.9);
  }

  const containUrlInFile = baseFn.length >= 2 && fileFn.includes(baseFn);
  const containFileInUrl = fileFn.length >= 2 && baseFn.includes(fileFn);
  if (containUrlInFile || containFileInUrl) {
    const mult = options.containmentMultiplier ?? CONTAINMENT_MULTIPLIER;
    fileSim = Math.min(1, fileSim * mult);
  }

  const depthDiff = Math.abs((parsed.dirSegments || []).length - (fileEntry.dirSegments || []).length);
  const depthPenalty = Math.min(DEPTH_PENALTY_CAP, depthDiff * DEPTH_PENALTY_PER_LEVEL);

  let score = pathSim * w.pathWeight + albumSim * w.albumWeight + fileSim * w.fileWeight;
  score -= depthPenalty;
  return Math.max(0, score);
}

/**
 * Best match from candidates: score each, sort desc, apply tiered threshold.
 * options: threshold, confidenceGap, lowerThreshold, weights, simFn, useSkeleton, etc.
 */
function bestMatch(parsed, fileIndex, weights, threshold, options = {}) {
  const thresh = threshold ?? options.threshold ?? DEFAULT_THRESHOLD;
  const confidenceGap = options.confidenceGap ?? DEFAULT_CONFIDENCE_GAP;
  const lowerThresh = options.lowerThreshold ?? DEFAULT_LOWER_THRESHOLD;
  const w = { ...DEFAULT_WEIGHTS, ...weights, ...options.weights };

  const candidates = getCandidates(parsed, fileIndex, options);
  if (candidates.length === 0) return null;

  const scored = candidates.map((e) => ({
    e,
    score: scoreCandidate(parsed, e, w, options),
  }));
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top) return null;
  if (top.score >= thresh) return top.e;

  const second = scored[1];
  if (second && (top.score - second.score) >= confidenceGap && top.score >= lowerThresh) return top.e;
  return null;
}

const BORDA_TOP_K = 3;
const MIN_CONSENSUS_POINTS = 2;

/**
 * Get top-K scored candidates for one strategy (same pool as bestMatch).
 */
function getTopKCandidates(parsed, fileIndex, weights, options, simFn, topK = BORDA_TOP_K) {
  const w = { ...DEFAULT_WEIGHTS, ...weights, ...options.weights };
  const candidates = getCandidates(parsed, fileIndex, options);
  const scored = candidates.map((e) => ({
    e,
    score: scoreCandidate(parsed, e, w, { ...options, simFn }),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Multi-algorithm consensus (Borda count): run two strategies, merge by fullPath, return winner if consensus.
 */
function consensusMatch(parsed, fileIndex, weights, threshold, options = {}) {
  const topK = options.bordaTopK ?? BORDA_TOP_K;
  const minPoints = options.minConsensusPoints ?? MIN_CONSENSUS_POINTS;
  const listA = getTopKCandidates(parsed, fileIndex, weights, options, getJaroWinkler, topK);
  const listB = getTopKCandidates(parsed, fileIndex, weights, options, getTokenOverlap, topK);

  const points = new Map();
  for (let r = 0; r < listA.length; r++) {
    const fullPath = listA[r].e.fullPath;
    points.set(fullPath, (points.get(fullPath) || 0) + (topK + 1 - r));
  }
  for (let r = 0; r < listB.length; r++) {
    const fullPath = listB[r].e.fullPath;
    points.set(fullPath, (points.get(fullPath) || 0) + (topK + 1 - r));
  }

  const ranked = Array.from(points.entries())
    .map(([fullPath, pts]) => ({ fullPath, pts }))
    .sort((a, b) => b.pts - a.pts);

  const top = ranked[0];
  if (top && top.pts >= minPoints) {
    const e = listA.find((x) => x.e.fullPath === top.fullPath)?.e ?? listB.find((x) => x.e.fullPath === top.fullPath)?.e;
    if (e) return e;
  }
  return bestMatch(parsed, fileIndex, weights, threshold, { ...options, simFn: getJaroWinkler });
}

function buildFilenameIndex(entries) {
  const byDirAndFilename = new Map();
  for (const e of entries) {
    const dirLower = e.dirPath.toLowerCase();
    const fnLower = e.filename.toLowerCase();
    const key = dirLower + '::' + fnLower;
    if (!byDirAndFilename.has(key)) byDirAndFilename.set(key, []);
    byDirAndFilename.get(key).push(e);
  }
  return byDirAndFilename;
}

function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length;
  const n = b.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function normalizeSpaces(s) {
  return String(s).replace(/\s+/g, '_').trim();
}

/**
 * Jaro-Winkler similarity in [0,1]. Handles empty/equal; no division by zero.
 */
function getJaroWinkler(s1, s2) {
  const a = String(s1 ?? '');
  const b = String(s2 ?? '');
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const matchWindowSafe = Math.max(0, matchWindow);
  const aMatch = new Array(a.length).fill(false);
  const bMatch = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindowSafe);
    const end = Math.min(b.length, i + matchWindowSafe + 1);
    for (let j = start; j < end; j++) {
      if (!bMatch[j] && a[i] === b[j]) {
        aMatch[i] = true;
        bMatch[j] = true;
        matches++;
        break;
      }
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  const pw = 0.1;
  return Math.min(1, jaro + prefix * pw * (1 - jaro));
}

/**
 * Token overlap (character bigram Jaccard) in [0,1].
 */
function getTokenOverlap(s1, s2) {
  const a = String(s1 ?? '').toLowerCase();
  const b = String(s2 ?? '').toLowerCase();
  if (a === b) return 1;
  const bigrams = (str) => {
    const set = new Set();
    for (let i = 0; i < str.length - 1; i++) set.add(str.slice(i, i + 2));
    return set;
  };
  const bgA = bigrams(a);
  const bgB = bigrams(b);
  if (bgA.size === 0 && bgB.size === 0) return 1;
  if (bgA.size === 0 || bgB.size === 0) return 0;
  let inter = 0;
  for (const x of bgA) if (bgB.has(x)) inter++;
  const union = bgA.size + bgB.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Normalized Levenshtein similarity: 1 - distance/maxLength, in [0,1].
 */
function getLevenshteinNorm(s1, s2) {
  const a = String(s1 ?? '');
  const b = String(s2 ?? '');
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const d = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, 1 - d / maxLen);
}

/**
 * Preprocess string: optional lowercase, strip underscores, strip digits; skeleton (digits -> #).
 * options: { lowercase, stripUnderscores, stripDigits, skeleton, dedupe }
 */
function preprocess(str, options = {}) {
  let s = String(str ?? '');
  if (options.dedupe !== false) s = dedupeBaseFilename(s);
  if (options.lowercase) s = s.toLowerCase();
  if (options.stripUnderscores) s = s.replace(/_/g, '');
  if (options.stripDigits) s = s.replace(/\d/g, '');
  if (options.skeleton) s = s.replace(/\d/g, '#');
  return s.trim();
}

/**
 * Stem segment: lowercase, remove vowels; deterministic for internationella/international etc.
 */
function stemSegment(seg) {
  const s = String(seg ?? '').toLowerCase();
  if (s.length <= 4) return s;
  return s.replace(/[aeiouy]/g, '');
}

/** Optional explicit synonym map for URL→file segment (e.g. internationella→international). */
const SEGMENT_SYNONYMS = new Map([
  ['internationella', 'international'],
  ['demoparties', 'demopartyn'],
]);

function pathVariants(segments) {
  const vars = new Set();
  const joined = segments.join('/');
  vars.add(joined);
  vars.add(joined.toLowerCase());
  vars.add(joined.toUpperCase());

  function addVariants(segs) {
    const j = segs.join('/');
    vars.add(j);
    vars.add(j.toLowerCase());
    vars.add(j.toUpperCase());
  }

  for (const sep of ['-', '_']) {
    const alt = segments.map((seg) => seg.replace(/-/g, sep).replace(/_/g, sep));
    addVariants(alt);
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const noHyphen = seg.replace(/-/g, '');
    const noUnderscore = seg.replace(/_/g, '');
    const collapsed = seg.replace(/[-_]/g, '');
    if (noHyphen !== seg) {
      const copy = [...segments];
      copy[i] = noHyphen;
      addVariants(copy);
    }
    if (noUnderscore !== seg) {
      const copy = [...segments];
      copy[i] = noUnderscore;
      addVariants(copy);
    }
    if (collapsed !== seg) {
      const copy = [...segments];
      copy[i] = collapsed;
      addVariants(copy);
    }
  }
  return Array.from(vars);
}

function numericSuffixVariants(segments) {
  const results = [segments.join('/')];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const m = seg.match(/^(.+)_(\d+)$/);
    if (m) {
      const without = m[1];
      const copy = [...segments];
      copy[i] = without;
      results.push(copy.join('/'));
    }
  }
  return results;
}

const ALGORITHMS = [
  {
    name: 'Exact normalized',
    run: (parsed, idx) => {
      const dirNorm = parsed.dirSegments.join('/').toLowerCase();
      const fnNorm = parsed.baseFilename.toLowerCase();
      const cand = dirNorm + '/' + fnNorm;
      const e = idx.byExactPath.get(cand) || idx.byPathLower.get(cand)?.[0];
      return e || null;
    },
  },
  {
    name: 'Case-insensitive path and filename',
    run: (parsed, idx) => {
      const dirLower = parsed.dirSegments.join('/').toLowerCase();
      const fnLower = parsed.baseFilename.toLowerCase();
      const key = dirLower + '::' + fnLower;
      return idx.byFilenameLower.get(key)?.[0] ?? null;
    },
  },
  {
    name: 'Path lowercase, filename case-insensitive',
    run: (parsed, idx) => {
      const dirLower = parsed.dirSegments.join('/').toLowerCase();
      const candidates = idx.byDirPathLower.get(dirLower) || [];
      const fnLower = parsed.baseFilename.toLowerCase();
      return candidates.find((e) => e.filename.toLowerCase() === fnLower) || null;
    },
  },
  {
    name: 'Segment case-insensitive',
    run: (parsed, idx) => {
      const urlDirLower = parsed.dirSegments.map((s) => s.toLowerCase()).join('/');
      const candidates = idx.byDirPathLower.get(urlDirLower) || [];
      const fnLower = parsed.baseFilename.toLowerCase();
      return candidates.find((e) => e.filename.toLowerCase() === fnLower) || null;
    },
  },
  {
    name: 'Album-first + Levenshtein on segments',
    run: (parsed, idx) => {
      const lastSeg = parsed.dirSegments[parsed.dirSegments.length - 1] || '';
      const fnLower = parsed.baseFilename.toLowerCase();
      const candidates = idx.byLastSegment.get(lastSeg.toLowerCase()) || [];
      let best = null;
      let bestScore = Infinity;
      for (const e of candidates) {
        if (e.filename.toLowerCase() !== fnLower) continue;
        const urlDir = parsed.dirSegments.join('/').toLowerCase();
        const fileDir = e.dirPath.toLowerCase();
        const urlSegs = parsed.dirSegments.map((s) => s.toLowerCase());
        const fileSegs = e.dirPath.split('/').map((s) => s.toLowerCase());
        if (urlSegs.length !== fileSegs.length) continue;
        let dist = 0;
        for (let i = 0; i < urlSegs.length; i++) {
          dist += levenshtein(urlSegs[i], fileSegs[i]);
        }
        if (dist < bestScore) {
          bestScore = dist;
          best = e;
        }
      }
      return best;
    },
  },
  {
    name: 'Hyphen/underscore variants',
    run: (parsed, idx) => {
      const fnLower = parsed.baseFilename.toLowerCase();
      const variants = pathVariants(parsed.dirSegments);
      for (const v of variants) {
        const dirLower = v.toLowerCase();
        const candidates = idx.byDirPathLower.get(dirLower) || [];
        const match = candidates.find((e) => e.filename.toLowerCase() === fnLower);
        if (match) return match;
      }
      return null;
    },
  },
  {
    name: 'Space/char normalization',
    run: (parsed, idx) => {
      const baseNorm = normalizeSpaces(parsed.baseFilename).toLowerCase();
      const dirNorm = parsed.dirSegments.map((s) => normalizeSpaces(s).toLowerCase()).join('/');
      const candidates = idx.byDirPathLower.get(dirNorm) || [];
      return candidates.find((e) => normalizeSpaces(e.filename).toLowerCase() === baseNorm) || null;
    },
  },
  {
    name: 'Last-segment priority',
    run: (parsed, idx) => {
      const lastSeg = parsed.dirSegments[parsed.dirSegments.length - 1] || '';
      const fnLower = parsed.baseFilename.toLowerCase();
      const candidates = idx.byLastSegment.get(lastSeg.toLowerCase()) || [];
      const match = candidates.find((e) => e.filename.toLowerCase() === fnLower);
      if (match) return match;
      for (const e of idx.entries) {
        if (e.filename.toLowerCase() === fnLower) return e;
      }
      return null;
    },
  },
  {
    name: 'Numeric suffix stripping',
    run: (parsed, idx) => {
      const fnLower = parsed.baseFilename.toLowerCase();
      const variants = numericSuffixVariants(parsed.dirSegments);
      for (const v of variants) {
        const dirLower = v.toLowerCase();
        const candidates = idx.byDirPathLower.get(dirLower) || [];
        const match = candidates.find((e) => e.filename.toLowerCase() === fnLower);
        if (match) return match;
      }
      return null;
    },
  },
  {
    name: 'Combined: album-first + all normalizations',
    run: (parsed, idx) => {
      const fnNorm = normalizeSpaces(parsed.baseFilename).toLowerCase();
      const lastSeg = (parsed.dirSegments[parsed.dirSegments.length - 1] || '').toLowerCase();
      const pathVariantsList = pathVariants(parsed.dirSegments);
      const numVariants = numericSuffixVariants(parsed.dirSegments);
      const allPathVariants = [...new Set([...pathVariantsList, ...numVariants])];

      for (const v of allPathVariants) {
        const dirLower = v.toLowerCase();
        const candidates = idx.byDirPathLower.get(dirLower) || [];
        const match = candidates.find(
          (e) =>
            e.filename.toLowerCase() === fnNorm ||
            normalizeSpaces(e.filename).toLowerCase() === fnNorm
        );
        if (match) return match;
      }

      const lastCandidates = idx.byLastSegment.get(lastSeg) || [];
      return (
        lastCandidates.find(
          (e) =>
            e.filename.toLowerCase() === fnNorm ||
            normalizeSpaces(e.filename).toLowerCase() === fnNorm
        ) || null
      );
    },
  },
  {
    name: 'Weighted fuzzy consensus (path+album+filename)',
    run: (parsed, idx, opts = {}) => {
      const w = opts.weights ?? DEFAULT_WEIGHTS;
      const thresh = opts.threshold ?? DEFAULT_THRESHOLD;
      const options = {
        threshold: thresh,
        confidenceGap: opts.confidenceGap ?? DEFAULT_CONFIDENCE_GAP,
        lowerThreshold: opts.lowerThreshold ?? DEFAULT_LOWER_THRESHOLD,
        useSkeleton: true,
        useSynonyms: true,
      };
      return consensusMatch(parsed, idx, w, thresh, options);
    },
  },
];

function runAlgorithms(parsedUrls, fileIndex, options = {}) {
  const results = [];
  for (const alg of ALGORITHMS) {
    let hits = 0;
    const hitExamples = [];
    const missExamples = [];
    for (const p of parsedUrls) {
      const match = alg.run.length >= 3 ? alg.run(p, fileIndex, options) : alg.run(p, fileIndex);
      if (match) {
        hits++;
        if (hitExamples.length < 5) hitExamples.push({ url: p.url, file: match.fullPath });
      } else {
        if (missExamples.length < 5) missExamples.push({ url: p.url });
      }
    }
    const misses = parsedUrls.length - hits;
    const rate = parsedUrls.length > 0 ? ((100 * hits) / parsedUrls.length).toFixed(1) : '0';
    results.push({
      name: alg.name,
      hits,
      misses,
      total: parsedUrls.length,
      hitRate: rate,
      hitExamples,
      missExamples,
    });
  }
  return results.sort((a, b) => b.hits - a.hits);
}

function main() {
  const {
    mismatchFile,
    fileList,
    train,
    goldenSetPath,
    threshold,
    confidenceGap,
    lowerThreshold,
    weights: cliWeights,
    outputStrategyPath,
  } = parseArgs();

  let fileListContent;
  try {
    fileListContent = fs.readFileSync(fileList, 'utf8');
  } catch (e) {
    console.error('Failed to read file list:', fileList, e.message);
    process.exit(1);
  }
  const fileEntries = loadFileList(fileListContent);
  const fileIndex = buildFileIndex(fileEntries);

  if (train && goldenSetPath) {
    let goldenContent;
    try {
      goldenContent = fs.readFileSync(goldenSetPath, 'utf8');
    } catch (e) {
      console.error('Failed to read golden set:', goldenSetPath, e.message);
      process.exit(1);
    }
    const golden = loadGoldenSet(goldenContent);
    const normalizePath = (p) => String(p ?? '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
    const opts = { threshold, confidenceGap, lowerThreshold, useSkeleton: true, useSynonyms: true };
    let bestHits = 0;
    let bestWeights = { ...DEFAULT_WEIGHTS };
    for (const pathW of [0.1, 0.2, 0.3]) {
      for (const albumW of [0.3, 0.4, 0.5]) {
        const fileW = 1 - pathW - albumW;
        if (fileW < 0) continue;
        const w = { pathWeight: pathW, albumWeight: albumW, fileWeight: fileW };
        let hits = 0;
        for (const { url, fullPath } of golden) {
          const parsed = parseOneUrl(url);
          if (!parsed) continue;
          const match = consensusMatch(parsed, fileIndex, w, threshold, opts);
          if (match && normalizePath(match.fullPath) === normalizePath(fullPath)) hits++;
        }
        if (hits > bestHits) {
          bestHits = hits;
          bestWeights = w;
        }
      }
    }
    console.log('Best weights (training):', bestWeights);
    console.log('Hits on golden set:', bestHits, '/', golden.length);
    process.exit(0);
  }

  let mismatchContent;
  try {
    mismatchContent = fs.readFileSync(mismatchFile, 'utf8');
  } catch (e) {
    console.error('Failed to read mismatch file:', mismatchFile, e.message);
    process.exit(1);
  }

  const parsedUrls = parseMismatchUrls(mismatchContent);

  console.log('Parsed', parsedUrls.length, 'mismatch URLs');
  console.log('Loaded', fileEntries.length, 'file entries');
  console.log('');

  const runOpts = {
    threshold,
    confidenceGap,
    lowerThreshold,
    weights: cliWeights,
  };
  const results = runAlgorithms(parsedUrls, fileIndex, runOpts);

  console.log('Algorithm Results (sorted by hits, best first)');
  console.log('=============================================');
  console.log('');
  console.log('| Algorithm | Hits | Misses | Hit rate |');
  console.log('|-----------|------|--------|----------|');
  for (const r of results) {
    console.log(`| ${r.name} | ${r.hits} | ${r.misses} | ${r.hitRate}% |`);
  }
  console.log('');

  const best = results[0];
  if (best && outputStrategyPath) {
    const FUZZY_CONSENSUS_NAME = 'Weighted fuzzy consensus (path+album+filename)';
    const strategyType = best.name.includes('consensus') ? 'consensus' : 'single';
    const params =
      best.name === FUZZY_CONSENSUS_NAME
        ? {
            threshold: runOpts.threshold,
            confidenceGap: runOpts.confidenceGap,
            lowerThreshold: runOpts.lowerThreshold,
            weights: runOpts.weights,
          }
        : null;
    /** Shape: { algorithm, type: 'single'|'consensus', params, hits, total, hitRate } */
    const strategyObject = {
      algorithm: best.name,
      type: strategyType,
      params,
      hits: best.hits,
      total: best.total,
      hitRate: best.hitRate,
    };
    try {
      fs.writeFileSync(outputStrategyPath, JSON.stringify(strategyObject, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write strategy file:', outputStrategyPath, e.message);
      process.exit(1);
    }
  }
  if (best && best.hitExamples.length > 0) {
    console.log('Sample hits (best algorithm):');
    for (const ex of best.hitExamples) {
      console.log('  URL:', ex.url);
      console.log('  File:', ex.file);
    }
    console.log('');
  }
  if (best && best.missExamples.length > 0) {
    console.log('Sample misses (best algorithm):');
    for (const ex of best.missExamples) {
      console.log('  URL:', ex.url);
    }
  }
}

main();
