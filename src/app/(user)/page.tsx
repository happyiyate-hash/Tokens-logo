// This page is no longer needed as the root now redirects to /dashboard.
// The content was part of the user dashboard.
// This file is being removed to resolve the parallel route conflict.
import { redirect } from 'next/navigation';

export default function UserRootPage() {
  redirect('/dashboard');
}
