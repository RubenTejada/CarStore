import { slugify } from "@/lib/labels";

type VehicleRef = { id: string; year: number; model: { name: string; brand: { name: string } } };

export const vehicleTitle = (v: VehicleRef) => `${v.model.brand.name} ${v.model.name}`;
export const vehicleUrl = (v: VehicleRef) => `/vehiculos/${v.id}/${slugify(`${vehicleTitle(v)} ${v.year}`)}`;
export const googleMapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export const whatsappUrl = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
