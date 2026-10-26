import { useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "../../api";
import "./TotpVerify.css";

/**
 * The 6-digit code form (`POST /api/auth/totp/verify`). `compact` drops the
 * heading when it sits under the enrolment screen.
 */
export function TotpVerify({
  onVerified,
  compact = false,
}: {
  onVerified: () => void | Promise<void>;
  compact?: boolean;
}): ReactNode {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(ev: FormEvent<HTMLFormElement>): Promise<void> {
    ev.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6 digits.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.totpVerify(code);
      setCode("");
      await onVerified();
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError("Too many attempts. Wait five minutes and try again.");
      } else if (e instanceof ApiError && e.status === 401) {
        setError("Wrong code. Try the next one your app shows.");
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="totp-verify" onSubmit={(ev) => void submit(ev)}>
      {!compact && <h1>Enter your authenticator code</h1>}
      <div className="field">
        <label htmlFor="totp-code">6-digit code</label>
        <input
          id="totp-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(ev) => setCode(ev.target.value.replace(/\D/g, ""))}
          autoFocus
          required
        />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="primary" disabled={busy}>
        {busy ? "Checking…" : "Verify"}
      </button>
    </form>
  );
}
