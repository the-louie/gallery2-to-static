/**
 * Database row field validation helpers for Gallery 2 extraction.
 *
 * MySQL query results can contain unexpected types (Buffer for BLOB fields,
 * string representations of numbers, etc.). These helpers validate and coerce
 * fields to their expected types, logging warnings for unexpected values
 * rather than crashing the extraction.
 */

/** Maximum lengths for string fields (safety limits, not schema constraints) */
export const MAX_LENGTHS = {
  title: 255,
  description: 65535,
  summary: 65535,
  pathComponent: 255,
  ownerName: 255,
} as const;

/**
 * Validate a nullable string field from a database row.
 * Handles: string (pass-through), number (convert), Buffer (decode UTF-8).
 * Returns null for null/undefined or unrecognized types (with warning).
 */
export function validateNullableString(
  value: unknown,
  fieldName: string,
  maxLength: number,
  rowContext: string
): string | null {
  if (value == null) return null;
  let str: string;
  if (typeof value === 'string') {
    str = value;
  } else if (typeof value === 'number') {
    str = String(value);
  } else if (Buffer.isBuffer(value)) {
    str = value.toString('utf8');
  } else {
    console.warn(
      `[${rowContext}] Field '${fieldName}' has unexpected type ${typeof value} (${Object.prototype.toString.call(value)}), using null`
    );
    return null;
  }
  if (str.length > maxLength) {
    console.warn(
      `[${rowContext}] Field '${fieldName}' exceeds max length (${str.length} > ${maxLength}), truncating`
    );
    str = str.slice(0, maxLength);
  }
  return str;
}

/**
 * Validate a required string field. Throws if the value cannot be coerced to a string.
 */
export function validateRequiredString(
  value: unknown,
  fieldName: string,
  maxLength: number,
  rowContext: string
): string {
  const result = validateNullableString(value, fieldName, maxLength, rowContext);
  if (result === null) {
    throw new Error(`[${rowContext}] Required field '${fieldName}' is null or invalid`);
  }
  return result;
}

/**
 * Validate a nullable number field from a database row.
 * Handles: number (pass-through), string (parse if numeric).
 * Returns null for null/undefined or unrecognized types (with warning).
 */
export function validateNullableNumber(
  value: unknown,
  fieldName: string,
  rowContext: string
): number | null {
  if (value == null) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      console.warn(`[${rowContext}] Field '${fieldName}' is non-finite number (${value}), using null`);
      return null;
    }
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      console.warn(`[${rowContext}] Field '${fieldName}' string '${value.slice(0, 50)}' is not a valid number, using null`);
      return null;
    }
    return parsed;
  }
  console.warn(
    `[${rowContext}] Field '${fieldName}' has unexpected type ${typeof value}, using null`
  );
  return null;
}

/**
 * Validate a required number field. Throws if the value cannot be coerced to a finite number.
 */
export function validateRequiredNumber(
  value: unknown,
  fieldName: string,
  rowContext: string
): number {
  const result = validateNullableNumber(value, fieldName, rowContext);
  if (result === null) {
    throw new Error(`[${rowContext}] Required field '${fieldName}' is null or invalid`);
  }
  return result;
}
