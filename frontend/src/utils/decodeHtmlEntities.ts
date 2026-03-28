/**
 * Re-export shared decodeHtmlEntities for frontend use.
 *
 * The implementation lives in shared/decodeHtmlEntities.ts (single source of truth
 * for both backend and frontend). This re-export preserves the @/utils/decodeHtmlEntities
 * import path used by all frontend consumers.
 *
 * @module frontend/src/utils/decodeHtmlEntities
 */
export { decodeHtmlEntities } from '../../../shared/decodeHtmlEntities';
