import AuthScreen from '@/components/auth/AuthScreen';

/**
 * "/" is the sign-in screen.
 *
 * This app only serves the signed-in product — the marketing site that used to
 * live here is a separate Astro project (prepyo-landing). Rendering the form
 * here rather than redirecting to /login means the front door costs one request
 * instead of two; middleware sends anyone who already has a session on to
 * /dashboard before this renders.
 */
export default function RootPage() {
  return <AuthScreen mode="login" />;
}
