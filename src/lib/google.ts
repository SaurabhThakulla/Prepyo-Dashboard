const GSI_SRC = 'https://accounts.google.com/gsi/client';

export const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();

export interface GoogleCredentialResponse {
  credential?: string;
  error?: string;
}

export interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

export interface GoogleIdentityApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: 'popup' | 'redirect';
    itp_support?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentityApi } };
  }
}

let pending: Promise<GoogleIdentityApi> | null = null;

export function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  const ready = window.google?.accounts?.id;
  if (ready) return Promise.resolve(ready);
  if (pending) return pending;

  pending = new Promise<GoogleIdentityApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    const script = existing ?? document.createElement('script');

    script.addEventListener('load', () => {
      const api = window.google?.accounts?.id;
      if (api) {
        resolve(api);
        return;
      }
      pending = null;
      reject(new Error('Google Identity Services loaded without an accounts.id API'));
    });

    script.addEventListener('error', () => {
      pending = null;
      script.remove();
      reject(new Error('Google Identity Services could not be loaded'));
    });

    if (!existing) {
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return pending;
}
