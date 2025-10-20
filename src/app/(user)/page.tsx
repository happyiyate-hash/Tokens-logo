import { redirect } from 'next/navigation';

// The root of the user group redirects to the main user dashboard page.
export default function UserRootPage() {
  redirect('/dashboard');
}
