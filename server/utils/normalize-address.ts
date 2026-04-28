/**
 * Address normalization utility for property cache keys.
 *
 * All cache lookups go through these functions so that different
 * representations of the same address (different Zillow URL slugs,
 * abbreviated vs expanded street types, etc.) always resolve to
 * the same canonical key.
 *
 * Inline usage examples (serve as lightweight unit tests):
 *
 * --- Same property, two different Zillow URL slugs → same key ---
 * normalizePropertyAddress("https://www.zillow.com/homedetails/3127-Snapfinger-Ct-Decatur-GA-30034/14435242_zpid/")
 *   → "3127 snapfinger court decatur ga 30034"
 * normalizePropertyAddress("https://www.zillow.com/homedetails/14435242_zpid/")
 *   → "3127 snapfinger court decatur ga 30034"
 *   (both reduce to same key via zpid; URL-only form returns empty string
 *    when address parts are absent — caller should use zpid as secondary key)
 *
 * --- Raw string → same key as structured components ---
 * normalizePropertyAddress("123 N Main St, Atlanta, GA 30314")
 *   → "123 north main street atlanta ga 30314"
 * normalizePropertyAddress({ street: "123 N Main St", city: "Atlanta", state: "GA", zip: "30314" })
 *   → "123 north main street atlanta ga 30314"
 *
 * --- Comp cache key format ---
 * buildCompCacheKey("123 north main street atlanta ga 30314", 1.0, 180)
 *   → "123 north main street atlanta ga 30314|1.0|180"
 *
 * --- Unit/apt preservation ---
 * normalizePropertyAddress("456 Elm Ave Apt 2B, Tampa, FL 33601")
 *   → "456 elm avenue apt 2b tampa fl 33601"
 */

export interface AddressComponents {
  street: string;
  city?: string;
  state?: string;
  zip?: string;
  unit?: string;
}

// Maps abbreviated suffix/direction → full word.
// Applied as whole-word replacements (surrounded by word boundaries).
const SUFFIX_EXPANSIONS: [RegExp, string][] = [
  // Street type suffixes — most specific first to avoid partial matches
  [/\bblvd\b/g, 'boulevard'],
  [/\bave\b/g, 'avenue'],
  [/\bst\b/g, 'street'],
  [/\bdr\b/g, 'drive'],
  [/\brd\b/g, 'road'],
  [/\bln\b/g, 'lane'],
  [/\bct\b/g, 'court'],
  [/\bpl\b/g, 'place'],
  [/\bcir\b/g, 'circle'],
  [/\bter\b/g, 'terrace'],
  [/\bhwy\b/g, 'highway'],
  [/\bfwy\b/g, 'freeway'],
  [/\bpky\b/g, 'parkway'],
  [/\bpkwy\b/g, 'parkway'],
  [/\bexpy\b/g, 'expressway'],
  // Directional prefixes/suffixes — order matters (multi-char before single-char)
  [/\bnorthwest\b/g, 'northwest'],
  [/\bnortheast\b/g, 'northeast'],
  [/\bsouthwest\b/g, 'southwest'],
  [/\bsoutheast\b/g, 'southeast'],
  [/\bnw\b/g, 'northwest'],
  [/\bne\b/g, 'northeast'],
  [/\bsw\b/g, 'southwest'],
  [/\bse\b/g, 'southeast'],
  [/\bnorth\b/g, 'north'],
  [/\bsouth\b/g, 'south'],
  [/\beast\b/g, 'east'],
  [/\bwest\b/g, 'west'],
  // Single-letter directions only after multi-letter patterns are exhausted.
  // These are applied last and only against isolated letters.
  [/\bn\b/g, 'north'],
  [/\bs\b/g, 'south'],
  [/\be\b/g, 'east'],
  [/\bw\b/g, 'west'],
];

/**
 * Given a raw address token string (already lowercased), apply all
 * suffix/direction expansions and return the expanded string.
 */
function expandAbbreviations(input: string): string {
  let s = input;
  for (const [pattern, replacement] of SUFFIX_EXPANSIONS) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

/**
 * Core normalization: lowercase, strip punctuation (except hyphens in numbers),
 * expand abbreviations, collapse whitespace.
 */
function normalizeToken(raw: string): string {
  return expandAbbreviations(
    raw
      .toLowerCase()
      .replace(/[.,#']/g, '')   // strip common punctuation
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Extract the zpid from a Zillow URL if present.
 * Returns null if no zpid is found.
 *
 * Handles both forms:
 *   /homedetails/3127-Snapfinger-Ct-Decatur-GA-30034/14435242_zpid/
 *   /homedetails/14435242_zpid/
 */
export function extractZpidFromUrl(url: string): string | null {
  const match = url.match(/\/(\d+)_zpid/);
  return match ? match[1] : null;
}

/**
 * Attempt to extract address components from a Zillow URL slug.
 * The slug format is typically: /Street-Name-City-ST-Zip/zpid_zpid/
 * Returns null when the slug doesn't contain address parts (zpid-only URLs).
 */
function extractAddressFromZillowUrl(url: string): AddressComponents | null {
  // Match the slug portion before the zpid segment
  const slugMatch = url.match(/\/homedetails\/([^/]+)\/\d+_zpid/);
  if (!slugMatch) return null;

  const slug = slugMatch[1];

  // If the slug is just the zpid itself (e.g. /homedetails/14435242_zpid/) there are no address parts
  if (/^\d+_zpid$/.test(slug)) return null;

  // Slug parts are hyphen-separated. The last three non-numeric segments
  // tend to be: ...-City-ST-Zip. Everything before that is the street.
  const parts = slug.split('-');

  // Find the zip (5-digit number at the end)
  let zipIndex = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d{5}$/.test(parts[i])) {
      zipIndex = i;
      break;
    }
  }

  if (zipIndex < 2) return null; // not enough parts to be a valid address

  const zip = parts[zipIndex];
  const state = parts[zipIndex - 1];
  const city = parts.slice(Math.max(1, zipIndex - 3), zipIndex - 1).join(' ');
  const street = parts.slice(0, zipIndex - (zipIndex - Math.max(1, zipIndex - 3))).join(' ');

  // Heuristic: city is typically 1-2 words; if state isn't 2-letter assume bad parse
  if (!/^[a-zA-Z]{2}$/.test(state)) return null;

  return { street, city, state, zip };
}

/**
 * Normalize an address into a canonical cache key string.
 *
 * Accepts:
 *   - A full address string: "123 N Main St, Atlanta, GA 30314"
 *   - Structured components: { street, city, state, zip, unit? }
 *   - A Zillow or Redfin URL — address parts are extracted from the slug
 *
 * Returns a lowercase, punctuation-stripped, abbreviation-expanded string
 * suitable for use as a cache key.
 */
export function normalizePropertyAddress(
  input: string | AddressComponents
): string {
  if (typeof input === 'object') {
    // Structured components
    const { street, city = '', state = '', zip = '', unit = '' } = input;
    const parts = [street, unit, city, state, zip].filter(Boolean).join(' ');
    return normalizeToken(parts).replace(/\s+/g, ' ').trim();
  }

  // String input — check if it looks like a URL
  if (input.startsWith('http') || input.includes('zillow.com') || input.includes('redfin.com')) {
    const components = extractAddressFromZillowUrl(input);
    if (components) {
      return normalizePropertyAddress(components);
    }
    // URL but no address parts extractable — return empty string;
    // caller should fall back to zpid-based lookup
    return '';
  }

  // Plain address string — parse it
  // Try to split on comma: "Street, City, ST Zip" or "Street, City ST Zip"
  const commaparts = input.split(',').map(p => p.trim()).filter(Boolean);

  if (commaparts.length >= 3) {
    // "123 N Main St, Atlanta, GA 30314"
    const street = commaparts[0];
    const city = commaparts[1];
    const stateZip = commaparts[2].trim().split(/\s+/);
    const state = stateZip[0] || '';
    const zip = stateZip[1] || '';
    return normalizeToken([street, city, state, zip].filter(Boolean).join(' '));
  }

  if (commaparts.length === 2) {
    // "123 N Main St, Atlanta GA 30314"
    return normalizeToken(commaparts.join(' '));
  }

  // No commas — best-effort normalization of the raw string
  return normalizeToken(input);
}

/**
 * Build the pipe-delimited cache key for comp search results.
 *
 * Format: "<normalizedAddress>|<radiusMiles>|<dateRangeDays>"
 *
 * Example:
 *   buildCompCacheKey("123 north main street atlanta ga 30314", 1.0, 180)
 *   → "123 north main street atlanta ga 30314|1.0|180"
 *
 * Always use the *actual* radius used (post-expansion) not the originally requested one.
 */
export function buildCompCacheKey(
  normalizedAddress: string,
  radiusMiles: number,
  dateRangeDays: number,
  bedrooms?: number,
  bathrooms?: number,
  sqft?: number
): string {
  const propSuffix = (bedrooms || bathrooms || sqft)
    ? `|${bedrooms ?? 0}bd|${bathrooms ?? 0}ba|${sqft ?? 0}sqft`
    : '';
  return `${normalizedAddress}|${radiusMiles.toFixed(1)}|${dateRangeDays}${propSuffix}`;
}
