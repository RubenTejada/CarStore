import { slugify } from "@/lib/labels";

type VehicleRef = { id: string; year: number; model: { name: string; brand: { name: string } } };

export const vehicleTitle = (v: VehicleRef) => `${v.model.brand.name} ${v.model.name}`;
export const vehicleUrl = (v: VehicleRef) => `/vehiculos/${v.id}/${slugify(`${vehicleTitle(v)} ${v.year}`)}`;
export const googleMapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
// Rutas desde la ubicación actual del visitante (cada app la toma por defecto).
export const directionsUrls = (lat: number, lng: number) => ({
  google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  apple: `https://maps.apple.com/?daddr=${lat},${lng}`,
  uber: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}`,
});
export const whatsappUrl = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
