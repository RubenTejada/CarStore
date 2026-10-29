import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { SavedVehicles } from "@/components/saved/saved-vehicles";
import { RecentlyViewed } from "@/components/saved/recently-viewed";

export const metadata: Metadata = { title: "Vehículos guardados", robots: { index: false } };

export default function SavedPage() {
  return (
    <>
      <PageHeader title="Guardados" description="Los vehículos que guardaste en este navegador." />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SavedVehicles />
      </div>
      <RecentlyViewed className="pb-16" />
    </>
  );
}
