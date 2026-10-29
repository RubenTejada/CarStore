import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CompareTray } from "@/components/compare/compare-tray";
import { AutoSubmit } from "@/components/ui/auto-submit";
import { SavedSync } from "@/components/saved/saved-sync";
import { getCurrentUser } from "@/lib/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CompareTray />
      <AutoSubmit />
      {user && <SavedSync userId={user.id} />}
    </>
  );
}
