import AuthScreen from '@/components/auth/AuthScreen';

/**
 * Kept alongside "/" because things link here by name: the landing site's
 * "Login" button, and the `?next=` redirect middleware issues when a signed-out
 * visitor asks for an app page.
 */
export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
