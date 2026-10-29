import { redirect } from "next/navigation";
import { BellRing, Building2, Car, CreditCard, Import, Inbox, LayoutDashboard, Plus, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PanelShell } from "@/components/panel/shell";
import type { NavItem } from "@/components/panel/side-nav";

export const metadata = { title: "Mi panel", robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "BUYER") redirect("/cuenta");
  const items: NavItem[] = [
    { href: "/panel", label: "Resumen", icon: <LayoutDashboard className="size-4.5" aria-hidden />, exact: true },
    { href: "/panel/vehiculos", label: "Mis vehículos", icon: <Car className="size-4.5" aria-hidden />, exact: true },
    { href: "/panel/vehiculos/nuevo", label: "Publicar vehículo", icon: <Plus className="size-4.5" aria-hidden /> },
    ...(user.dealerId
      ? [
          { href: "/panel/vehiculos/importar", label: "Importar inventario", icon: <Import className="size-4.5" aria-hidden /> },
          { href: "/panel/dealer", label: "Mi dealer", icon: <Building2 className="size-4.5" aria-hidden /> },
          { href: "/panel/equipo", label: "Equipo", icon: <Users className="size-4.5" aria-hidden /> },
        ]
      : []),
    { href: "/panel/solicitudes", label: "Solicitudes", icon: <Inbox className="size-4.5" aria-hidden /> },
    { href: "/panel/planes", label: "Mi plan", icon: <CreditCard className="size-4.5" aria-hidden /> },
    { href: "/cuenta", label: "Alertas y guardados", icon: <BellRing className="size-4.5" aria-hidden /> },
  ];
  return (
    <PanelShell title={user.dealer ? user.dealer.name : "Vendedor particular"} user={user} items={items}>
      {children}
    </PanelShell>
  );
}
