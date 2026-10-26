/**
 * Types of the admin API contract (docs/architecture/admin-api.md and
 * admin-service.md). Field names follow the JSON the service sends.
 */

export type Role = "admin" | "user";

/** One row of `items` as the admin API presents it. */
export interface AdminItem {
  id: number;
  type: "album" | "photo";
  parentId: number | null;
  position: number;
  title: string | null;
  description: string | null;
  summary: string | null;
  urlSegment: string;
  urlLocked: boolean;
  path: string;
  eventAt: number | null;
  width: number | null;
  height: number | null;
  owner: string | null;
  viewCount: number | null;
  hidden: boolean;
  deletedAt: string | null;
  highlightPhotoId: number | null;
  /** albums: the photo shown as the highlight (chosen, else the first photo) */
  currentHighlightPhotoId?: number | null;
  thumbnailUrl: string | null;
  childCount?: number;
  canWrite: boolean;
}

export interface BreadcrumbEntry {
  id: number;
  title: string;
}

/** `GET /api/albums/:id`; `album` is null for a delegated user's synthetic root. */
export interface AlbumView {
  album: AdminItem | null;
  breadcrumb: BreadcrumbEntry[];
  children: AdminItem[];
}

export interface RegenStatus {
  pending: boolean;
  running: boolean;
  lastRun: { mode: string; finishedAt: string | null; ok: boolean } | null;
  dirty: number;
  /** albums are published once their last change is older than this (ms) */
  settleMs?: number;
}

export interface Profile {
  nickname: string | null;
  fullName: string | null;
  showFullName: boolean;
  hasPicture: boolean;
  email: string;
  role: Role;
}

/** `publicUser` from the service: never carries the TOTP secret. */
export interface AdminUser {
  id: number;
  email: string;
  role: Role;
  enabled: boolean;
  nickname: string | null;
  fullName: string | null;
  showFullName: boolean;
  totpEnrolled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  /** Delegated album ids (admin user list only). */
  albums?: number[];
}

/** `GET /api/me`. */
export interface Me {
  user: AdminUser;
  role: Role;
  albums: number[];
  session: { createdAt: string; expiresAt: string };
}

export interface TotpSetup {
  secret: string;
  otpauthUrl: string;
}

export interface AuditEntry {
  id: number;
  at: string;
  user_id: number | null;
  email: string | null;
  ip: string | null;
  action: string;
  target: string | null;
  result: string;
  detail: unknown;
}

export interface AuditPage {
  entries: AuditEntry[];
  next: number | null;
}

export interface UploadResult {
  created: AdminItem[];
  rejected: Array<{ name: string; reason: string }>;
}

export interface NewAlbumInput {
  parentId: number;
  title: string;
  description?: string;
  summary?: string;
  eventAt?: number | null;
}

export interface AlbumPatch {
  title?: string;
  description?: string;
  summary?: string;
  eventAt?: number | null;
  urlSegment?: string;
  force?: boolean;
}

export interface PhotoPatch {
  title?: string;
  description?: string;
  eventAt?: number | null;
}

export interface ProfilePatch {
  nickname?: string | null;
  fullName?: string | null;
  showFullName?: boolean;
}
