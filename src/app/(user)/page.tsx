
import { redirect } from 'next/navigation';

export default function RootPage() {
  // The root of the app now redirects to the main user-facing dashboard.
  redirect('/dashboard');
}
