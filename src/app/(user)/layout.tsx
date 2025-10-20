import { UserHeader } from "@/components/user/user-header";
import { UserSidebar } from "@/components/user/user-sidebar";
import { UserBottomNav } from "@/components/user/user-bottom-nav";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
        <UserSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
            <UserHeader />
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
                {children}
            </main>
        </div>
        <UserBottomNav />
    </div>
  );
}
