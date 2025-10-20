// This page is now part of the (user) route group.
// The content has been moved to src/app/(user)/page.tsx
// This file can be removed, but we'll keep it as a redirector for now.
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
