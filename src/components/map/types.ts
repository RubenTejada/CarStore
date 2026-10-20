export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  kind: "vehicle" | "dealer";
  title: string;
  subtitle?: string;
  href: string;
  image?: string | null;
};
