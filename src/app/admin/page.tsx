
import { redirect } from 'next/navigation';

// The root of the admin group redirects to the main admin dashboard page.
export default function AdminRootPage() {
  redirect('/admin/dashboard');
}
