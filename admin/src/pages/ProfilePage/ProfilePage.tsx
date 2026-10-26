import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "../../api";
import { useSession } from "../../session/SessionContext";
import type { Profile } from "../../types";
import "./ProfilePage.css";

/**
 * The signed-in user's profile: nickname (public "Owner:" name), optional full
 * name and whether to show it instead, plus the admin-side picture
 * (`PUT /api/me/picture`, previewed from `GET /api/me/picture`).
 */
export function ProfilePage(): ReactNode {
  const { refresh } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [showFullName, setShowFullName] = useState(false);
  const [pictureVersion, setPictureVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function apply(p: Profile): void {
    setProfile(p);
    setNickname(p.nickname ?? "");
    setFullName(p.fullName ?? "");
    setShowFullName(p.showFullName);
  }

  useEffect(() => {
    let cancelled = false;
    api
      .profile()
      .then((p) => {
        if (!cancelled) apply(p);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(ev: FormEvent<HTMLFormElement>): Promise<void> {
    ev.preventDefault();
    if (!profile) return;
    const patch: Parameters<typeof api.updateProfile>[0] = {};
    const nick = nickname.trim();
    const full = fullName.trim();
    if (nick !== (profile.nickname ?? "")) patch.nickname = nick || null;
    if (full !== (profile.fullName ?? "")) patch.fullName = full || null;
    if (showFullName !== profile.showFullName)
      patch.showFullName = showFullName;
    if (Object.keys(patch).length === 0) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      apply(await api.updateProfile(patch));
      setSaved(true);
      await refresh();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? "That nickname is taken (it may belong to a historical Gallery 2 owner)."
          : e instanceof ApiError
            ? `${e.message} (${e.status})`
            : String(e)
      );
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File): Promise<void> {
    if (file.size > 2 * 1024 * 1024) {
      setError("The picture must be 2 MB or smaller.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      apply(await api.uploadPicture(file));
      setPictureVersion((v) => v + 1);
    } catch (e) {
      setError(
        e instanceof ApiError ? `${e.message} (${e.status})` : String(e)
      );
    } finally {
      setBusy(false);
    }
  }

  if (!profile && !error)
    return (
      <p className="muted" role="status">
        Loading…
      </p>
    );

  return (
    <div className="profile-page">
      <h1>Profile</h1>
      {profile && (
        <p className="muted">
          {profile.email} · {profile.role}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {profile && (
        <div className="profile-grid">
          <form
            className="card profile-form"
            onSubmit={(ev) => void save(ev)}
            aria-label="Profile"
          >
            <div className="field">
              <label htmlFor="profile-nickname">
                Nickname (shown publicly as "Owner:")
              </label>
              <input
                id="profile-nickname"
                type="text"
                value={nickname}
                onChange={(ev) => setNickname(ev.target.value)}
                maxLength={60}
              />
            </div>
            <div className="field">
              <label htmlFor="profile-fullname">Full name (optional)</label>
              <input
                id="profile-fullname"
                type="text"
                value={fullName}
                onChange={(ev) => setFullName(ev.target.value)}
                maxLength={120}
              />
            </div>
            <div className="field field-inline">
              <input
                id="profile-show-full"
                type="checkbox"
                checked={showFullName}
                onChange={(ev) => setShowFullName(ev.target.checked)}
              />
              <label htmlFor="profile-show-full">
                Show my full name instead of the nickname on the public site
              </label>
            </div>
            <div className="actions">
              <button type="submit" className="primary" disabled={busy}>
                Save
              </button>
              {saved && (
                <span className="muted" role="status">
                  Saved.
                </span>
              )}
            </div>
          </form>

          <section
            className="card profile-picture"
            aria-label="Profile picture"
          >
            <h2>Picture</h2>
            <p className="muted">
              Shown only inside the admin UI. JPEG/PNG, up to 2 MB.
            </p>
            {profile.hasPicture ? (
              <img
                className="profile-picture-img"
                src={`/api/me/picture?v=${pictureVersion}`}
                width={128}
                height={128}
                alt="Your profile picture"
              />
            ) : (
              <div
                className="profile-picture-empty"
                role="img"
                aria-label="No picture yet"
              >
                ?
              </div>
            )}
            <div className="field">
              <label htmlFor="profile-picture-file">Upload a new picture</label>
              <input
                id="profile-picture-file"
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  if (f) void upload(f);
                  ev.target.value = "";
                }}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
