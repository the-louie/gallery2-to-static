/**
 * BBCode Parser Utility
 *
 * Parses BBCode tags in text and converts them to React elements with proper
 * sanitization to prevent XSS attacks. Supports common formatting tags:
 * [b], [i], [u], [s], [color], [size]
 *
 * @module frontend/src/utils/bbcode
 */

import React from 'react';

/**
 * Options for BBCode parsing
 */
export interface BBCodeParseOptions {
  /** Whether to enable caching (default: true) */
  enableCache?: boolean;
  /** Maximum cache size (default: 1000) */
  maxCacheSize?: number;
}

/**
 * Cached parsing result
 */
interface CachedResult {
  result: React.ReactNode;
  timestamp: number;
}

/**
 * Tag configuration for BBCode tags
 */
interface TagConfig {
  /** Tag name (lowercase) */
  name: string;
  /** React element type to render */
  element: keyof JSX.IntrinsicElements;
  /** Whether tag requires closing tag */
  requiresClosing: boolean;
  /** Whether tag supports attributes */
  supportsAttributes: boolean;
  /** Attribute validator function */
  validateAttribute?: (value: string) => boolean;
  /** Attribute transformer function */
  transformAttribute?: (value: string) => string;
}

/**
 * Supported BBCode tags configuration
 */
const TAG_CONFIGS: Record<string, TagConfig> = {
  b: {
    name: 'b',
    element: 'strong',
    requiresClosing: true,
    supportsAttributes: false,
  },
  i: {
    name: 'i',
    element: 'em',
    requiresClosing: true,
    supportsAttributes: false,
  },
  u: {
    name: 'u',
    element: 'u',
    requiresClosing: true,
    supportsAttributes: false,
  },
  s: {
    name: 's',
    element: 's',
    requiresClosing: true,
    supportsAttributes: false,
  },
  color: {
    name: 'color',
    element: 'span',
    requiresClosing: true,
    supportsAttributes: true,
    validateAttribute: (value: string) => {
      // Allow hex colors (#rgb, #rrggbb), rgb/rgba, and named colors
      const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
      // Strict RGB/RGBA pattern: rgb(r, g, b) or rgba(r, g, b, a)
      // RGB values: 0-255 (1-3 digits), alpha: 0-1 (0, 1, or 0.x format)
      const rgbMatch = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10);
        const g = parseInt(rgbMatch[2], 10);
        const b = parseInt(rgbMatch[3], 10);
        if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
          return true;
        }
        return false;
      }
      const rgbaMatch = value.match(/^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/i);
      if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1], 10);
        const g = parseInt(rgbaMatch[2], 10);
        const b = parseInt(rgbaMatch[3], 10);
        const a = parseFloat(rgbaMatch[4]);
        if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255 && a >= 0 && a <= 1) {
          return true;
        }
        return false;
      }
      const namedColors = [
        'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
        'orange', 'purple', 'pink', 'brown', 'gray', 'grey', 'silver', 'gold',
      ];
      return hexPattern.test(value) || namedColors.includes(value.toLowerCase());
    },
    transformAttribute: (value: string) => {
      // Return sanitized color value
      return value.trim();
    },
  },
  size: {
    name: 'size',
    element: 'span',
    requiresClosing: true,
    supportsAttributes: true,
    validateAttribute: (value: string) => {
      // Allow numeric values (will add px unit)
      const numValue = parseInt(value, 10);
      return !isNaN(numValue) && numValue > 0 && numValue <= 72; // Reasonable font size limit
    },
    transformAttribute: (value: string) => {
      // Add px unit if not present
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        return `${numValue}px`;
      }
      return value;
    },
  },
};

/**
 * Parse cache (LRU-style with size limit)
 */
const parseCache = new Map<string, CachedResult>();
const DEFAULT_CACHE_SIZE = 1000;

/**
 * Clear the parse cache
 */
export function clearBBCodeCache(): void {
  parseCache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getBBCodeCacheStats(): { size: number; maxSize: number } {
  return {
    size: parseCache.size,
    maxSize: DEFAULT_CACHE_SIZE,
  };
}

/**
 * Escape HTML entities in text
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Validate and sanitize style attribute value
 */
function sanitizeStyleValue(property: string, value: string): string | null {
  if (property === 'color') {
    const config = TAG_CONFIGS.color;
    if (config.validateAttribute && !config.validateAttribute(value)) {
      return null; // Invalid color value
    }
    return config.transformAttribute ? config.transformAttribute(value) : value;
  }
  if (property === 'font-size') {
    const config = TAG_CONFIGS.size;
    if (config.validateAttribute && !config.validateAttribute(value)) {
      return null; // Invalid size value
    }
    return config.transformAttribute ? config.transformAttribute(value) : value;
  }
  return null; // Unknown property
}

/**
 * Parse attribute from tag (e.g., "color=red" or "size=12")
 */
function parseAttribute(tagContent: string, tagName: string): Record<string, string> | null {
  const config = TAG_CONFIGS[tagName.toLowerCase()];
  if (!config || !config.supportsAttributes) {
    return null;
  }

  const equalIndex = tagContent.indexOf('=');
  if (equalIndex === -1) {
    return null;
  }

  const attrName = tagContent.substring(0, equalIndex).trim().toLowerCase();
  const attrValue = tagContent.substring(equalIndex + 1).trim();

  // Remove quotes if present
  const cleanValue = attrValue.replace(/^["']|["']$/g, '');

  // Validate attribute
  if (attrName === 'color' || attrName === 'size') {
    const sanitized = sanitizeStyleValue(attrName === 'color' ? 'color' : 'font-size', cleanValue);
    if (sanitized === null) {
      return null; // Invalid attribute value
    }
    return { [attrName]: sanitized };
  }

  return null;
}

/**
 * Parse BBCode tag and extract tag name and attributes
 */
function parseTag(tagText: string): { name: string; isClosing: boolean; attributes: Record<string, string> | null } | null {
  // Remove brackets
  const content = tagText.slice(1, -1).trim();

  if (!content) {
    return null;
  }

  // Check if closing tag
  if (content.startsWith('/')) {
    const tagName = content.substring(1).trim().toLowerCase();
    if (TAG_CONFIGS[tagName]) {
      return { name: tagName, isClosing: true, attributes: null };
    }
    return null; // Unknown closing tag
  }

  // Parse opening tag
  const spaceIndex = content.indexOf(' ');
  let tagName: string;
  let attrString = '';

  if (spaceIndex === -1) {
    tagName = content.toLowerCase();
  } else {
    tagName = content.substring(0, spaceIndex).toLowerCase();
    attrString = content.substring(spaceIndex + 1).trim();
  }

  const config = TAG_CONFIGS[tagName];
  if (!config) {
    return null; // Unknown tag
  }

  // Parse attributes if present
  let attributes: Record<string, string> | null = null;
  if (attrString && config.supportsAttributes) {
    attributes = parseAttribute(attrString, tagName);
  }

  return { name: tagName, isClosing: false, attributes };
}

/**
 * Find matching closing tag for an opening tag
 */
function findMatchingClosingTag(
  text: string,
  tagName: string,
  startIndex: number,
): number {
  let depth = 1;
  let i = startIndex;

  while (i < text.length) {
    // Check for literal brackets
    if (i < text.length - 1 && text[i] === '[' && text[i + 1] === '[') {
      i += 2;
      continue;
    }
    if (i < text.length - 1 && text[i] === ']' && text[i + 1] === ']') {
      i += 2;
      continue;
    }

    if (text[i] === '[') {
      const tagEnd = text.indexOf(']', i);
      if (tagEnd === -1) {
        break;
      }

      const tagText = text.substring(i, tagEnd + 1);
      const tagMatch = parseTag(tagText);

      if (tagMatch) {
        if (tagMatch.name === tagName) {
          if (tagMatch.isClosing) {
            depth--;
            if (depth === 0) {
              return i; // Found matching closing tag
            }
          } else {
            depth++; // Nested opening tag of same type
          }
        }
      }

      i = tagEnd + 1;
    } else {
      i++;
    }
  }

  return -1; // No matching closing tag found
}

/**
 * Parse BBCode text and convert to React elements
 */
function parseBBCodeInternal(text: string): React.ReactNode {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < text.length) {
    // Check for literal opening bracket [[
    if (i < text.length - 1 && text[i] === '[' && text[i + 1] === '[') {
      result.push(escapeHtml('['));
      i += 2;
      continue;
    }

    // Check for literal closing bracket ]]
    if (i < text.length - 1 && text[i] === ']' && text[i + 1] === ']') {
      result.push(escapeHtml(']'));
      i += 2;
      continue;
    }

    // Look for BBCode tag
    if (text[i] === '[') {
      const tagEnd = text.indexOf(']', i);
      if (tagEnd === -1) {
        // No closing bracket, treat rest as text
        result.push(escapeHtml(text.substring(i)));
        break;
      }

      const tagText = text.substring(i, tagEnd + 1);
      const tagMatch = parseTag(tagText);

      if (tagMatch && !tagMatch.isClosing) {
        // Opening tag - find matching closing tag
        const closingTagIndex = findMatchingClosingTag(text, tagMatch.name, tagEnd + 1);

        if (closingTagIndex !== -1) {
          // Get content between tags
          const contentStart = tagEnd + 1;
          const content = text.substring(contentStart, closingTagIndex);
          const closingTagEnd = text.indexOf(']', closingTagIndex) + 1;

          // Recursively parse content
          const contentElements = parseBBCodeInternal(content);

          // Build React element
          const config = TAG_CONFIGS[tagMatch.name];
          const props: Record<string, string | React.CSSProperties> = {};

          if (tagMatch.attributes) {
            if (tagMatch.attributes.color) {
              props.style = { color: tagMatch.attributes.color };
            } else if (tagMatch.attributes.size) {
              props.style = { fontSize: tagMatch.attributes.size };
            }
          }

          const element = React.createElement(config.element, props, contentElements);
          result.push(element);

          i = closingTagEnd;
          continue;
        }
        // No matching closing tag - treat as literal text
      }

      // Invalid or unmatched tag - treat entire tag as literal text
      result.push(escapeHtml(tagText));
      i = tagEnd + 1;
      continue;
    }

    // Regular text - collect until next bracket
    const textStart = i;
    while (i < text.length && text[i] !== '[') {
      // Skip literal closing brackets
      if (i < text.length - 1 && text[i] === ']' && text[i + 1] === ']') {
        break;
      }
      i++;
    }

    if (i > textStart) {
      const textContent = text.substring(textStart, i);
      result.push(escapeHtml(textContent));
    }
  }

  // Return single string if only one text node, otherwise return fragment
  if (result.length === 0) {
    return '';
  }
  if (result.length === 1) {
    return result[0];
  }
  return React.createElement(React.Fragment, {}, ...result);
}

/**
 * Result of extracting a URL from BBCode [url=...]...[/url] or [url]...[/url].
 */
export interface ExtractedUrl {
  /** The URL (http or https only). */
  url: string;
  /** Optional label (inner text); when [url]...[/url], same as url. */
  label?: string;
}

const URL_SCHEME_REGEX = /^https?:\/\//i;

/**
 * Extract the first [url=...]...[/url] or [url]...[/url] from text.
 * Returns the URL and optional label for use as a standalone link in the root album list.
 * Only http and https URLs are accepted; invalid schemes (e.g. javascript:) return null.
 *
 * @param text - Summary or description that may contain BBCode URL tags
 * @returns { url, label? } or null if no valid match
 *
 * @example
 * extractUrlFromBBCode('[url=https://example.com]Example[/url]') // { url: 'https://...', label: 'Example' }
 * extractUrlFromBBCode('[url]https://example.com[/url]')         // { url: 'https://...', label: 'https://...' }
 * extractUrlFromBBCode('no url here')                            // null
 */
export function extractUrlFromBBCode(text: string): ExtractedUrl | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed) return null;

  // [url=URL]label[/url]
  const attrMatch = trimmed.match(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/i);
  if (attrMatch) {
    const rawUrl = attrMatch[1].trim().replace(/^["']|["']$/g, '');
    const label = attrMatch[2].trim();
    if (!URL_SCHEME_REGEX.test(rawUrl)) return null;
    return { url: rawUrl, label: label || undefined };
  }

  // [url]URL[/url]
  const simpleMatch = trimmed.match(/\[url\]([\s\S]*?)\[\/url\]/i);
  if (simpleMatch) {
    const rawUrl = simpleMatch[1].trim();
    if (!URL_SCHEME_REGEX.test(rawUrl)) return null;
    return { url: rawUrl, label: rawUrl || undefined };
  }

  return null;
}

/**
 * Parse BBCode text and convert to React elements
 *
 * @param text - Text containing BBCode tags
 * @param options - Parsing options
 * @returns React element(s) representing the parsed BBCode
 *
 * @example
 * ```tsx
 * parseBBCode('[b]Bold text[/b]') // Returns <strong>Bold text</strong>
 * parseBBCode('[i]Italic text[/i]') // Returns <em>Italic text</em>
 * parseBBCode('[color=red]Red text[/color]') // Returns <span style="color: red;">Red text</span>
 * ```
 */
export function parseBBCode(text: string, options: BBCodeParseOptions = {}): React.ReactNode {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const enableCache = options.enableCache !== false;
  const maxCacheSize = options.maxCacheSize || DEFAULT_CACHE_SIZE;

  // Check cache
  if (enableCache && parseCache.has(text)) {
    const cached = parseCache.get(text)!;
    return cached.result;
  }

  // Parse
  const result = parseBBCodeInternal(text);

  // Store in cache
  if (enableCache) {
    // Implement simple LRU: if cache is full, remove oldest entries
    if (parseCache.size >= maxCacheSize) {
      // Remove 10% of oldest entries
      const entriesToRemove = Math.floor(maxCacheSize * 0.1);
      const entries = Array.from(parseCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < entriesToRemove; i++) {
        parseCache.delete(entries[i][0]);
      }
    }

    parseCache.set(text, {
      result,
      timestamp: Date.now(),
    });
  }

  return result;
}
