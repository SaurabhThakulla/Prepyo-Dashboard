import { redirect } from 'next/navigation';

/**
 * The app has no page of its own at "/".
 *
 * The marketing site that used to live here is a separate Astro project
 * (prepyo-landing) deployed at the root domain, so this app only serves the
 * signed-in product. Anyone landing here goes to sign-in; middleware sends
 * them straight on to /dashboard if they already have a session.
 */
export default function RootPage() {
  redirect('/login');
}
