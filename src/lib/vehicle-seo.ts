import type { Metadata } from "next";
import type { Vehicle } from "@/generated/prisma/client";
import { BODY_TYPE_LABEL, CONDITION_LABEL, FUEL_LABEL, TRANSMISSION_LABEL, formatKm, formatPrice } from "@/lib/labels";
import { htmlToText } from "@/lib/html";
import { NO_INDEX, pageMetadata, siteUrl } from "@/lib/seo";
import { vehicleTitle, vehicleUrl } from "@/lib/urls";

type SeoVehicle = Pick<Vehicle, "id" | "year" | "trim" | "condition" | "price" | "currency" | "mileageKm" | "transmission" | "fuel" | "bodyType" | "extColor" | "description" | "province" | "status"> & {
  model: { name: string; brand: { name: string } };
  photos: { url: string }[];
  dealer: { name: string; slug: string } | null;
  owner: { name: string };
};

export function vehicleSeoName(v: SeoVehicle) {
  return `${vehicleTitle(v)} ${v.year}${v.trim ? ` ${v.trim}` : ""}`;
}

export function vehicleDescription(v: SeoVehicle) {
  const details = `${vehicleSeoName(v)} ${CONDITION_LABEL[v.condition].toLowerCase()} en venta en ${v.province}, República Dominicana por ${formatPrice(v.price, v.currency)}. ${formatKm(v.mileageKm)}, transmisión ${TRANSMISSION_LABEL[v.transmission].toLowerCase()}, ${FUEL_LABEL[v.fuel].toLowerCase()}.`;
  const sellerText = htmlToText(v.description ?? "").replace(/\s+/g, " ").trim();
  return sellerText ? `${details} ${sellerText}` : details;
}

export function vehicleMetadata(v: SeoVehicle | null): Metadata {
  // Las vistas previas privadas no deben divulgar datos ni imágenes en sus metadatos.
  if (!v || v.status !== "ACTIVE") return { title: "Vehículo no disponible", description: "Esta publicación no está disponible.", robots: NO_INDEX, openGraph: null, twitter: null };
  const description = vehicleDescription(v);
  return {
    ...pageMetadata({
      path: vehicleUrl(v),
      title: `${vehicleSeoName(v)} en venta en ${v.province}`,
      description: description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description,
      images: v.photos.slice(0, 4).map((photo) => photo.url),
    }),
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  };
}

export function vehicleStructuredData(v: SeoVehicle) {
  if (v.status !== "ACTIVE") return null;
  const url = siteUrl(vehicleUrl(v));
  const condition = `https://schema.org/${v.condition === "NEW" ? "NewCondition" : "UsedCondition"}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Product", "Car"],
        "@id": `${url}#vehicle`,
        url,
        name: vehicleSeoName(v),
        description: vehicleDescription(v),
        image: v.photos.map((photo) => siteUrl(photo.url)),
        sku: v.id,
        brand: { "@type": "Brand", name: v.model.brand.name },
        model: v.model.name,
        vehicleModelDate: String(v.year),
        vehicleConfiguration: v.trim ?? undefined,
        bodyType: BODY_TYPE_LABEL[v.bodyType],
        fuelType: FUEL_LABEL[v.fuel],
        vehicleTransmission: TRANSMISSION_LABEL[v.transmission],
        color: v.extColor ?? undefined,
        mileageFromOdometer: { "@type": "QuantitativeValue", value: v.mileageKm, unitCode: "KMT" },
        itemCondition: condition,
        offers: {
          "@type": "Offer",
          url,
          price: v.price,
          priceCurrency: v.currency,
          availability: "https://schema.org/InStock",
          itemCondition: condition,
          availableAtOrFrom: { "@type": "Place", address: { "@type": "PostalAddress", addressRegion: v.province, addressCountry: "DO" } },
          seller: v.dealer
            ? { "@type": "AutoDealer", name: v.dealer.name, url: siteUrl(`/dealers/${v.dealer.slug}`) }
            : { "@type": "Person", name: v.owner.name },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl() },
          { "@type": "ListItem", position: 2, name: "Vehículos", item: siteUrl("/vehiculos") },
          { "@type": "ListItem", position: 3, name: vehicleSeoName(v), item: url },
        ],
      },
    ],
  };
}
