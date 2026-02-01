/**
 * Fuzzy filename matching for resolving database-derived image paths to actual file paths.
 *
 * Maps parsed URLs (dirSegments + baseFilename) to file list entries using the
 * weighted fuzzy consensus algorithm (Jaro-Winkler + token-overlap with Borda count).
 *
 * ParsedUrl: { dirSegments: string[], baseFilename: string }
 * FileEntry: { fullPath, dirPath, dirSegments, filename }
 * resolveFuzzy returns fullPath (no leading ./) or null.
 */

export interface ParsedUrl {
  dirSegments: string[];
  baseFilename: string;
}

export interface FileEntry {
  fullPath: string;
  dirPath: string;
  dirSegments: string[];
  filename: string;
}

export interface FuzzyStrategy {
  algorithm: string;
  type: 'single' | 'consensus';
  params: {
    threshold: number;
    confidenceGap: number;
    lowerThreshold: number;
    weights: { pathWeight: number; albumWeight: number; fileWeight: number };
  } | null;
}

export interface FileIndex {
  entries: FileEntry[];
  byExactPath: Map<string, FileEntry>;
  byPathLower: Map<string, FileEntry[]>;
  byLastSegment: Map<string, FileEntry[]>;
  byDirPathLower: Map<string, FileEntry[]>;
  byFilenameLower: Map<string, FileEntry[]>;
  trigramIndex: Map<string, FileEntry[]>;
}

const DEFAULT_WEIGHTS = { pathWeight: 0.2, albumWeight: 0.4, fileWeight: 0.4 };
const DEFAULT_THRESHOLD = 0.55;
const DEFAULT_CONFIDENCE_GAP = 0.3;
const DEFAULT_LOWER_THRESHOLD = 0.45;
const CANDIDATE_CAP = 500;
const EARLY_EXIT_TOP = 50;
const BORDA_TOP_K = 3;
const MIN_CONSENSUS_POINTS = 2;
const DEPTH_PENALTY_PER_LEVEL = 0.02;
const DEPTH_PENALTY_CAP = 0.1;
const CONTAINMENT_MULTIPLIER = 1.2;

const SEGMENT_SYNONYMS = new Map<string, string>([
  ['internationella', 'international'],
  ['demoparties', 'demopartyn'],
]);

function dedupeBaseFilename(str: string): string {
  if (!str || typeof str !== 'string') return '';
  const triple = str.indexOf('___');
  if (triple === -1) return str;
  const after = str.slice(triple + 3);
  const ext = (after.match(/\.[a-zA-Z0-9]+$/i)?.[0] ?? '').toLowerCase();
  const base = ext ? after.slice(0, -ext.length) : after;
  if (base.includes('___')) {
    const parts = base.split('___').filter(Boolean);
    const last = parts[parts.length - 1];
    const dot = last.lastIndexOf('.');
    const baseOnly = dot !== -1 ? last.slice(0, dot) : last;
    return baseOnly + ext || str;
  }
  return after;
}

function preprocess(str: string, options: { skeleton?: boolean; dedupe?: boolean } = {}): string {
  let s = String(str ?? '');
  if (options.dedupe !== false) s = dedupeBaseFilename(s);
  if (options.skeleton) s = s.replace(/\d/g, '#');
  return s.trim();
}

function stemSegment(seg: string): string {
  const s = String(seg ?? '').toLowerCase();
  if (s.length <= 4) return s;
  return s.replace(/[aeiouy]/g, '');
}

function normalizeSpaces(s: string): string {
  return String(s).replace(/\s+/g, '_').trim();
}

function getTrigrams(str: string): Set<string> {
  const s = (str || '').toLowerCase();
  const set = new Set<string>();
  for (let i = 0; i <= s.length - 3; i++) set.add(s.slice(i, i + 3));
  return set;
}

function getJaroWinkler(s1: string, s2: string): number {
  const a = String(s1 ?? '');
  const b = String(s2 ?? '');
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const matchWindowSafe = Math.max(0, matchWindow);
  const aMatch = new Array(a.length).fill(false) as boolean[];
  const bMatch = new Array(b.length).fill(false) as boolean[];
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

function getTokenOverlap(s1: string, s2: string): number {
  const a = String(s1 ?? '').toLowerCase();
  const b = String(s2 ?? '').toLowerCase();
  if (a === b) return 1;
  const bigrams = (str: string) => {
    const set = new Set<string>();
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

function pathVariants(segments: string[]): string[] {
  const vars = new Set<string>();
  const joined = segments.join('/');
  vars.add(joined);
  vars.add(joined.toLowerCase());
  vars.add(joined.toUpperCase());

  function addVariants(segs: string[]) {
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

function addFromSource(
  entries: FileEntry[],
  sourceLimit: number,
  seen: Map<string, FileEntry>,
): void {
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

interface Weights {
  pathWeight: number;
  albumWeight: number;
  fileWeight: number;
}

function scoreCandidate(
  parsed: ParsedUrl,
  fileEntry: FileEntry,
  weights: Weights,
  options: {
    simFn: (a: string, b: string) => number;
    useStemming?: boolean;
    useSynonyms?: boolean;
    useSkeleton?: boolean;
    containmentMultiplier?: number;
  },
): number {
  let w = { ...DEFAULT_WEIGHTS, ...weights };
  const sum = (w.pathWeight || 0) + (w.albumWeight || 0) + (w.fileWeight || 0);
  if (sum > 0) {
    w = {
      pathWeight: w.pathWeight / sum,
      albumWeight: w.albumWeight / sum,
      fileWeight: w.fileWeight / sum,
    };
  }
  const simFn = options.simFn;

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

function getCandidates(
  parsed: ParsedUrl,
  fileIndex: FileIndex,
  options: { candidateCap?: number; earlyExitTop?: number } = {},
): FileEntry[] {
  const cap = options.candidateCap ?? CANDIDATE_CAP;
  const topN = options.earlyExitTop ?? EARLY_EXIT_TOP;
  const perSourceCap = Math.max(1, Math.floor(cap / 3));
  const seen = new Map<string, FileEntry>();

  const lastSeg = (parsed.dirSegments[parsed.dirSegments.length - 1] || '').toLowerCase();
  addFromSource(fileIndex.byLastSegment.get(lastSeg) || [], perSourceCap, seen);

  const variants = pathVariants(parsed.dirSegments);
  const variantEntries: FileEntry[] = [];
  for (const v of variants) {
    const dirLower = v.toLowerCase();
    for (const e of fileIndex.byDirPathLower.get(dirLower) || []) variantEntries.push(e);
  }
  addFromSource(variantEntries, perSourceCap, seen);

  const baseFn = (parsed.baseFilename || '').toLowerCase();
  const trigrams = getTrigrams(baseFn);
  const trigramEntries: FileEntry[] = [];
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

function getTopKCandidates(
  parsed: ParsedUrl,
  fileIndex: FileIndex,
  weights: Weights,
  options: Record<string, unknown> & { weights?: Weights },
  simFn: (a: string, b: string) => number,
  topK: number = BORDA_TOP_K,
): Array<{ e: FileEntry; score: number }> {
  const w = { ...DEFAULT_WEIGHTS, ...weights, ...options.weights };
  const candidateCap = typeof options.candidateCap === 'number' ? options.candidateCap : undefined;
  const earlyExitTop = typeof options.earlyExitTop === 'number' ? options.earlyExitTop : undefined;
  const candidates = getCandidates(parsed, fileIndex, { candidateCap, earlyExitTop });
  const scored = candidates.map((e) => ({
    e,
    score: scoreCandidate(parsed, e, w, {
      ...options,
      simFn,
      useStemming: true,
      useSynonyms: true,
      useSkeleton: true,
    } as Parameters<typeof scoreCandidate>[3]),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function bestMatch(
  parsed: ParsedUrl,
  fileIndex: FileIndex,
  weights: Weights,
  threshold: number,
  options: Record<string, unknown> & {
    threshold?: number;
    confidenceGap?: number;
    lowerThreshold?: number;
    weights?: Weights;
  },
): FileEntry | null {
  const thresh = threshold ?? options.threshold ?? DEFAULT_THRESHOLD;
  const confidenceGap = (options.confidenceGap ?? DEFAULT_CONFIDENCE_GAP) as number;
  const lowerThresh = (options.lowerThreshold ?? DEFAULT_LOWER_THRESHOLD) as number;
  const w = { ...DEFAULT_WEIGHTS, ...weights, ...(options.weights as Weights | undefined) };

  const candidateCap = typeof options.candidateCap === 'number' ? options.candidateCap : undefined;
  const earlyExitTop = typeof options.earlyExitTop === 'number' ? options.earlyExitTop : undefined;
  const candidates = getCandidates(parsed, fileIndex, { candidateCap, earlyExitTop });
  if (candidates.length === 0) return null;

  const scored = candidates.map((e) => ({
    e,
    score: scoreCandidate(parsed, e, w, {
      ...options,
      simFn: getJaroWinkler,
      useStemming: true,
      useSynonyms: true,
      useSkeleton: true,
    } as Parameters<typeof scoreCandidate>[3]),
  }));
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top) return null;
  if (top.score >= thresh) return top.e;

  const second = scored[1];
  if (second && top.score - second.score >= confidenceGap && top.score >= lowerThresh) return top.e;
  return null;
}

function consensusMatch(
  parsed: ParsedUrl,
  fileIndex: FileIndex,
  weights: Weights,
  threshold: number,
  options: Record<string, unknown> & {
    threshold?: number;
    confidenceGap?: number;
    lowerThreshold?: number;
    weights?: Weights;
    bordaTopK?: number;
    minConsensusPoints?: number;
  },
): FileEntry | null {
  const topK = (options.bordaTopK ?? BORDA_TOP_K) as number;
  const minPoints = (options.minConsensusPoints ?? MIN_CONSENSUS_POINTS) as number;
  const listA = getTopKCandidates(
    parsed,
    fileIndex,
    weights,
    options,
    getJaroWinkler,
    topK,
  );
  const listB = getTopKCandidates(
    parsed,
    fileIndex,
    weights,
    options,
    getTokenOverlap,
    topK,
  );

  const points = new Map<string, number>();
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

function exactOrCaseInsensitiveMatch(parsed: ParsedUrl, fileIndex: FileIndex): FileEntry | null {
  const dirNorm = parsed.dirSegments.join('/').toLowerCase();
  const fnNorm = parsed.baseFilename.toLowerCase();
  const cand = dirNorm + '/' + fnNorm;
  const e = fileIndex.byExactPath.get(cand) || fileIndex.byPathLower.get(cand)?.[0];
  if (e) return e;
  const key = dirNorm + '::' + fnNorm;
  return fileIndex.byFilenameLower.get(key)?.[0] ?? null;
}

/**
 * Load file list from content. One path per line, ./ prefix optional, backslash normalized.
 */
export function loadFileList(content: string): FileEntry[] {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const entries: FileEntry[] = [];
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

function buildFilenameIndex(entries: FileEntry[]): Map<string, FileEntry[]> {
  const byDirAndFilename = new Map<string, FileEntry[]>();
  for (const e of entries) {
    const dirLower = e.dirPath.toLowerCase();
    const fnLower = e.filename.toLowerCase();
    const key = dirLower + '::' + fnLower;
    if (!byDirAndFilename.has(key)) byDirAndFilename.set(key, []);
    byDirAndFilename.get(key)!.push(e);
  }
  return byDirAndFilename;
}

function buildTrigramFilenameIndex(entries: FileEntry[]): Map<string, FileEntry[]> {
  const map = new Map<string, FileEntry[]>();
  for (const e of entries) {
    const fn = (e.filename || '').toLowerCase();
    for (let i = 0; i <= fn.length - 3; i++) {
      const tg = fn.slice(i, i + 3);
      if (!map.has(tg)) map.set(tg, []);
      map.get(tg)!.push(e);
    }
  }
  for (const list of map.values()) {
    const seen = new Set<string>();
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

/**
 * Build file index from entries. Includes trigram index for fuzzy matching.
 */
export function buildFileIndex(entries: FileEntry[]): FileIndex {
  const byExactPath = new Map<string, FileEntry>();
  const byPathLower = new Map<string, FileEntry[]>();
  const byLastSegment = new Map<string, FileEntry[]>();
  const byDirPathLower = new Map<string, FileEntry[]>();

  for (const e of entries) {
    const key = e.dirPath + '/' + e.filename;
    byExactPath.set(key, e);
    byExactPath.set(e.fullPath, e);

    const pathLower = (e.dirPath + '/' + e.filename).toLowerCase();
    if (!byPathLower.has(pathLower)) byPathLower.set(pathLower, []);
    byPathLower.get(pathLower)!.push(e);

    const lastSeg = e.dirSegments[e.dirSegments.length - 1] || '';
    const lastKey = lastSeg.toLowerCase();
    if (!byLastSegment.has(lastKey)) byLastSegment.set(lastKey, []);
    byLastSegment.get(lastKey)!.push(e);

    const dirLower = e.dirPath.toLowerCase();
    if (!byDirPathLower.has(dirLower)) byDirPathLower.set(dirLower, []);
    byDirPathLower.get(dirLower)!.push(e);
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
 * Resolve parsed URL to actual file path using fuzzy matching.
 * Returns fullPath (no leading ./) or null. Tries exact match first, then strategy-based match.
 */
export function resolveFuzzy(
  parsed: ParsedUrl,
  fileIndex: FileIndex,
  strategy: FuzzyStrategy,
): string | null {
  if (!parsed.dirSegments?.length && !parsed.baseFilename?.trim()) return null;
  if (fileIndex.entries.length === 0) return null;

  const exact = exactOrCaseInsensitiveMatch(parsed, fileIndex);
  if (exact) return exact.fullPath.replace(/^\.\//, '');

  if (strategy.type === 'consensus' && strategy.params) {
    const p = strategy.params;
    const weights = p.weights ?? DEFAULT_WEIGHTS;
    const options = {
      threshold: p.threshold,
      confidenceGap: p.confidenceGap,
      lowerThreshold: p.lowerThreshold,
      useSkeleton: true,
      useSynonyms: true,
    };
    const match = consensusMatch(parsed, fileIndex, weights, p.threshold, options);
    return match ? match.fullPath.replace(/^\.\//, '') : null;
  }

  const fnNorm = normalizeSpaces(parsed.baseFilename).toLowerCase();
  const variants = pathVariants(parsed.dirSegments);
  for (const v of variants) {
    const dirLower = v.toLowerCase();
    const candidates = fileIndex.byDirPathLower.get(dirLower) || [];
    const simpleMatch = candidates.find(
      (e) =>
        e.filename.toLowerCase() === fnNorm ||
        normalizeSpaces(e.filename).toLowerCase() === fnNorm ||
        e.filename.toLowerCase() === parsed.baseFilename.toLowerCase(),
    );
    if (simpleMatch) return simpleMatch.fullPath.replace(/^\.\//, '');
  }
  return null;
}
