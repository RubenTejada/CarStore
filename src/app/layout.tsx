import type { Metadata } from "next";
import { Archivo, Saira } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Solo para el logo (TUCARRO / ONLINE).
const saira = Saira({
  variable: "--font-saira",
  subsets: ["latin"],
  style: "italic",
});

export const metadata: Metadata = {
  title: { default: "TuCarroOnline — Vehículos nuevos y usados en República Dominicana", template: "%s | TuCarroOnline" },
  applicationName: "TuCarroOnline",
  description:
    "Encuentra jeepetas, sedanes, camionetas y más de dealers verificados en toda la República Dominicana. Busca por tipo, marca y modelo, y ubica cada vehículo en el mapa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-DO" className={`${archivo.variable} ${saira.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
