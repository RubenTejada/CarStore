import type { Metadata } from "next";
import { Archivo, Saira } from "next/font/google";
import { LOOK } from "@/components/layout/look";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/seo";
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
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  applicationName: SITE_NAME,
  description: SITE_DESCRIPTION,
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-DO" data-look={LOOK} className={`${archivo.variable} ${saira.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
