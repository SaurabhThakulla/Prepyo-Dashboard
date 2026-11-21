import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signedOutPath } from '@/lib/signOutPath';

/**
 * Covers the app once this account signs in on another device: the server has
 * already ended this session, so the only way on is to log out.
 */
export default function SessionReplaced({ onLogOut }: { onLogOut: () => Promise<void> }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const logOut = async () => {
    setBusy(true);
    try {
      await onLogOut();
    } finally {
      navigate(signedOutPath(), { replace: true });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-replaced-title"
        aria-describedby="session-replaced-text"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 id="session-replaced-title" className="text-lg font-semibold text-foreground">
          Connection lost
        </h2>
        <p id="session-replaced-text" className="mt-2 text-sm text-muted-foreground">
          Your account was just signed in on another device. One account can be used on only one
          device at a time, so this device has been signed out.
        </p>
        <Button className="mt-6 w-full" onClick={logOut} disabled={busy} autoFocus>
          Log out
        </Button>
      </div>
    </div>
  );
}
