// Provincias de República Dominicana con su centroide aproximado (capital provincial).
export const PROVINCES = [
  { name: "Distrito Nacional", lat: 18.4861, lng: -69.9312 },
  { name: "Santo Domingo", lat: 18.5001, lng: -69.8559 },
  { name: "Santiago", lat: 19.4517, lng: -70.697 },
  { name: "La Altagracia", lat: 18.5818, lng: -68.4043 },
  { name: "La Romana", lat: 18.4273, lng: -68.9728 },
  { name: "San Pedro de Macorís", lat: 18.4539, lng: -69.3086 },
  { name: "Puerto Plata", lat: 19.7934, lng: -70.6884 },
  { name: "La Vega", lat: 19.2221, lng: -70.5296 },
  { name: "San Cristóbal", lat: 18.4167, lng: -70.1 },
  { name: "Duarte", lat: 19.3001, lng: -70.2525 },
  { name: "Espaillat", lat: 19.3833, lng: -70.4167 },
  { name: "Monseñor Nouel", lat: 18.9333, lng: -70.4 },
  { name: "Peravia", lat: 18.2796, lng: -70.3319 },
  { name: "Azua", lat: 18.4532, lng: -70.7349 },
  { name: "Barahona", lat: 18.2085, lng: -71.1008 },
  { name: "San Juan", lat: 18.8058, lng: -71.2295 },
  { name: "Valverde", lat: 19.5667, lng: -70.9833 },
  { name: "Monte Plata", lat: 18.8073, lng: -69.7843 },
  { name: "Hato Mayor", lat: 18.7629, lng: -69.2566 },
  { name: "El Seibo", lat: 18.7656, lng: -69.0389 },
  { name: "Samaná", lat: 19.2056, lng: -69.3369 },
  { name: "María Trinidad Sánchez", lat: 19.3754, lng: -69.8474 },
  { name: "Hermanas Mirabal", lat: 19.3833, lng: -70.3667 },
  { name: "Sánchez Ramírez", lat: 19.05, lng: -70.15 },
  { name: "Montecristi", lat: 19.8484, lng: -71.6458 },
  { name: "Dajabón", lat: 19.5486, lng: -71.7083 },
  { name: "Santiago Rodríguez", lat: 19.4667, lng: -71.3333 },
  { name: "Elías Piña", lat: 18.8767, lng: -71.7047 },
  { name: "Bahoruco", lat: 18.4833, lng: -71.4167 },
  { name: "Independencia", lat: 18.4833, lng: -71.85 },
  { name: "Pedernales", lat: 18.0384, lng: -71.744 },
  { name: "San José de Ocoa", lat: 18.5465, lng: -70.5065 },
] as const;

export const PROVINCE_NAMES = PROVINCES.map((p) => p.name) as string[];

// Centro y zoom por defecto del mapa de República Dominicana.
export const DR_CENTER = { lat: 18.85, lng: -70.3 };
export const DR_ZOOM = 8;
