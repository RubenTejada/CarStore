import { Building2, Car, CreditCard, Layers, LayoutDashboard, ListChecks, Receipt, Tags, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { sweepExpiredSubscriptions } from "@/lib/listing-rules";
import { PanelShell } from "@/components/panel/shell";
import type { NavItem } from "@/components/panel/side-nav";

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: <LayoutDashboard className="size-4.5" aria-hidden />, exact: true },
  { href: "/admin/suscripciones", label: "Pagos y planes", icon: <Receipt className="size-4.5" aria-hidden /> },
  { href: "/admin/dealers", label: "Dealers", icon: <Building2 className="size-4.5" aria-hidden /> },
  { href: "/admin/vehiculos", label: "Vehículos", icon: <Car className="size-4.5" aria-hidden /> },
  { href: "/admin/usuarios", label: "Usuarios", icon: <Users className="size-4.5" aria-hidden /> },
  { href: "/admin/catalogo", label: "Marcas y modelos", icon: <Tags className="size-4.5" aria-hidden /> },
  { href: "/admin/versiones", label: "Versiones", icon: <Layers className="size-4.5" aria-hidden /> },
  { href: "/admin/caracteristicas", label: "Características", icon: <ListChecks className="size-4.5" aria-hidden /> },
  { href: "/admin/planes", label: "Planes", icon: <CreditCard className="size-4.5" aria-hidden /> },
];

export const metadata = { title: "Administración", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser("ADMIN");
  await sweepExpiredSubscriptions();
  return (
    <PanelShell title="Administración" user={user} items={ITEMS}>
      {children}
    </PanelShell>
  );
}
