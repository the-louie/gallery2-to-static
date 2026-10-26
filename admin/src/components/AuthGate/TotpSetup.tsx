import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { api, ApiError } from "../../api";
import type { TotpSetup as TotpSetupData } from "../../types";
import { TotpVerify } from "./TotpVerify";
import "./TotpSetup.css";

/**
 * First login: fetches a fresh secret (`POST /api/auth/totp/setup`), shows it
 * as a QR code (the `otpauth://` URL) and as text, then the code form.
 */
export function TotpSetup({
  onVerified,
}: {
  onVerified: () => void | Promise<void>;
}): ReactNode {
  const [setup, setSetup] = useState<TotpSetupData | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .totpSetup()
      .then(async (data) => {
        if (cancelled) return;
        setSetup(data);
        try {
          const url = await QRCode.toDataURL(data.otpauthUrl, {
            width: 220,
            margin: 1,
          });
          if (!cancelled) setQr(url);
        } catch {
          if (!cancelled) setQr(null);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError && e.status === 409
            ? "An authenticator is already enrolled. Enter its code below."
            : e instanceof Error
              ? e.message
              : String(e)
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="totp-setup">
      <h1>Set up your authenticator</h1>
      <p>
        Scan the code with an authenticator app (or type the secret), then enter
        the 6-digit code it shows. The code is asked for on every login.
      </p>
      {error && <p className="error">{error}</p>}
      {setup && (
        <>
          {qr ? (
            <img
              className="totp-setup-qr"
              src={qr}
              width={220}
              height={220}
              alt="QR code of the authenticator secret"
            />
          ) : (
            <p className="muted">QR code unavailable; use the secret below.</p>
          )}
          <p className="totp-setup-secret">
            <span className="muted">Secret: </span>
            <code data-testid="totp-secret">{setup.secret}</code>
          </p>
        </>
      )}
      <TotpVerify onVerified={onVerified} compact />
    </div>
  );
}
