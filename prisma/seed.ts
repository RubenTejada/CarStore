import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { BodyType, Drivetrain, FeatureCategory, Fuel, Transmission } from "../src/generated/prisma/enums";
import { slugify, toDop } from "../src/lib/labels";
import { PROVINCES } from "../src/lib/provinces";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// PRNG determinista para que el seed sea reproducible.
let state = 20261020;
const rand = () => {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1));

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

// ---------- Marcas y modelos ----------
const BRANDS: { name: string; icon?: string; color: string; models: [string, BodyType][] }[] = [
  { name: "Toyota", icon: "toyota", color: "EB0A1E", models: [["Corolla", "SEDAN"], ["Camry", "SEDAN"], ["Yaris", "HATCHBACK"], ["RAV4", "JEEPETA"], ["Land Cruiser Prado", "JEEPETA"], ["4Runner", "JEEPETA"], ["Hilux", "PICKUP"], ["Tacoma", "PICKUP"], ["Sienna", "MINIVAN"], ["Hiace", "VAN"]] },
  { name: "Honda", icon: "honda", color: "E40521", models: [["Civic", "SEDAN"], ["Accord", "SEDAN"], ["Fit", "HATCHBACK"], ["CR-V", "JEEPETA"], ["HR-V", "JEEPETA"], ["Pilot", "JEEPETA"], ["Odyssey", "MINIVAN"]] },
  { name: "Hyundai", icon: "hyundai", color: "002C5E", models: [["Accent", "SEDAN"], ["Elantra", "SEDAN"], ["Sonata", "SEDAN"], ["i30", "HATCHBACK"], ["Tucson", "JEEPETA"], ["Santa Fe", "JEEPETA"], ["Creta", "JEEPETA"], ["H-1", "VAN"]] },
  { name: "Kia", icon: "kia", color: "05141F", models: [["Rio", "SEDAN"], ["K5", "SEDAN"], ["Picanto", "HATCHBACK"], ["Sportage", "JEEPETA"], ["Sorento", "JEEPETA"], ["Seltos", "JEEPETA"], ["Carnival", "MINIVAN"]] },
  { name: "Nissan", icon: "nissan", color: "C3002F", models: [["Sentra", "SEDAN"], ["Altima", "SEDAN"], ["Versa", "SEDAN"], ["Kicks", "JEEPETA"], ["Juke", "JEEPETA"], ["X-Trail", "JEEPETA"], ["Frontier", "PICKUP"], ["GT-R", "COUPE"], ["Urvan", "VAN"]] },
  { name: "Mitsubishi", icon: "mitsubishi", color: "E60012", models: [["Mirage", "HATCHBACK"], ["Outlander", "JEEPETA"], ["Montero Sport", "JEEPETA"], ["L200", "PICKUP"]] },
  { name: "Suzuki", icon: "suzuki", color: "E30613", models: [["Swift", "HATCHBACK"], ["Vitara", "JEEPETA"], ["Jimny", "JEEPETA"], ["Ertiga", "MINIVAN"]] },
  { name: "Mazda", icon: "mazda", color: "101010", models: [["Mazda3", "SEDAN"], ["CX-5", "JEEPETA"], ["CX-30", "JEEPETA"], ["BT-50", "PICKUP"], ["MX-5", "CONVERTIBLE"]] },
  { name: "Ford", icon: "ford", color: "00274E", models: [["Mustang", "COUPE"], ["Explorer", "JEEPETA"], ["Expedition", "JEEPETA"], ["Escape", "JEEPETA"], ["F-150", "PICKUP"], ["F-150 Raptor", "PICKUP"], ["Ranger", "PICKUP"], ["Transit", "VAN"]] },
  { name: "Chevrolet", icon: "chevrolet", color: "CD9834", models: [["Spark", "HATCHBACK"], ["Camaro", "COUPE"], ["Corvette", "COUPE"], ["Tahoe", "JEEPETA"], ["Colorado", "PICKUP"], ["Silverado", "PICKUP"]] },
  { name: "Jeep", icon: "jeep", color: "000000", models: [["Wrangler", "JEEPETA"], ["Grand Cherokee", "JEEPETA"], ["Compass", "JEEPETA"], ["Gladiator", "PICKUP"]] },
  { name: "Dodge", icon: "dodge", color: "BA0C2F", models: [["Challenger", "COUPE"], ["Charger", "SEDAN"], ["Durango", "JEEPETA"]] },
  { name: "Volkswagen", icon: "volkswagen", color: "151F5D", models: [["Jetta", "SEDAN"], ["Golf", "HATCHBACK"], ["Polo", "HATCHBACK"], ["Tiguan", "JEEPETA"], ["Amarok", "PICKUP"], ["Transporter", "VAN"]] },
  { name: "BMW", icon: "bmw", color: "0066B1", models: [["Serie 3", "SEDAN"], ["Serie 5", "SEDAN"], ["Serie 7", "SEDAN"], ["Serie 4", "COUPE"], ["M4", "COUPE"], ["X3", "JEEPETA"], ["X5", "JEEPETA"]] },
  { name: "Mercedes-Benz", icon: "mercedes", color: "1F1F1F", models: [["Clase C", "SEDAN"], ["Clase E", "SEDAN"], ["CLA", "SEDAN"], ["AMG GT", "COUPE"], ["GLC", "JEEPETA"], ["GLE", "JEEPETA"], ["Sprinter", "VAN"]] },
  { name: "Audi", icon: "audi", color: "BB0A30", models: [["A4", "SEDAN"], ["A6", "SEDAN"], ["A7", "SEDAN"], ["R8", "COUPE"], ["Q5", "JEEPETA"], ["Q7", "JEEPETA"]] },
  { name: "Porsche", icon: "porsche", color: "B12B28", models: [["911", "COUPE"], ["718 Boxster", "CONVERTIBLE"], ["Panamera", "SEDAN"], ["Cayenne", "JEEPETA"], ["Macan", "JEEPETA"]] },
  { name: "Land Rover", icon: "landrover", color: "005A2B", models: [["Range Rover Sport", "JEEPETA"], ["Defender", "JEEPETA"], ["Discovery", "JEEPETA"]] },
  { name: "Lexus", icon: "lexus", color: "1A1A1A", models: [["IS", "SEDAN"], ["ES", "SEDAN"], ["NX", "JEEPETA"], ["RX", "JEEPETA"], ["LX", "JEEPETA"]] },
  { name: "Tesla", icon: "tesla", color: "CC0000", models: [["Model 3", "SEDAN"], ["Model S", "SEDAN"], ["Model Y", "JEEPETA"]] },
  { name: "Volvo", icon: "volvo", color: "003057", models: [["S60", "SEDAN"], ["XC60", "JEEPETA"], ["XC90", "JEEPETA"]] },
  { name: "Fiat", icon: "fiat", color: "941711", models: [["500", "HATCHBACK"], ["Pulse", "JEEPETA"]] },
  { name: "Isuzu", icon: "isuzu", color: "C8102E", models: [["D-Max", "PICKUP"], ["MU-X", "JEEPETA"]] },
  { name: "Subaru", icon: "subaru", color: "013C74", models: [["Impreza", "SEDAN"], ["Forester", "JEEPETA"], ["Outback", "JEEPETA"]] },
  { name: "Chery", icon: "chery", color: "B0001E", models: [["Tiggo 4", "JEEPETA"], ["Tiggo 7", "JEEPETA"], ["Arrizo 5", "SEDAN"]] },
  { name: "Changan", icon: "changan", color: "0047BB", models: [["CS35 Plus", "JEEPETA"], ["CS55 Plus", "JEEPETA"], ["Alsvin", "SEDAN"], ["Hunter", "PICKUP"]] },
  { name: "Geely", icon: "geely", color: "1E3C72", models: [["Coolray", "JEEPETA"], ["Emgrand", "SEDAN"]] },
  { name: "BYD", icon: "byd", color: "D3242B", models: [["Dolphin", "HATCHBACK"], ["Seal", "SEDAN"], ["Song Plus", "JEEPETA"], ["Shark", "PICKUP"]] },
  { name: "JAC", icon: "jac", color: "E60012", models: [["JS4", "JEEPETA"], ["T8", "PICKUP"]] },
];

// ---------- Fotos demo (Unsplash), clasificadas por marca / modelo ----------
type PhotoEntry = { brand: string; model: string; color: string; photos: string[]; minYear: number; price: [number, number]; currency?: "USD" };
const INTERIORS = ["1449965408869-eaa3f722e40d", "1610647752706-3bb12232b3ab"];
const CATALOG: PhotoEntry[] = [
  { brand: "Toyota", model: "Camry", color: "Gris", photos: ["1621007947382-bb3c3994e3fb"], minYear: 2019, price: [1_450_000, 2_300_000] },
  { brand: "Toyota", model: "RAV4", color: "Plata", photos: ["1617469767053-d3b523a0b982"], minYear: 2020, price: [1_900_000, 2_800_000] },
  { brand: "Toyota", model: "Tacoma", color: "Beige", photos: ["1559416523-140ddc3d238c"], minYear: 2018, price: [2_400_000, 3_600_000] },
  { brand: "Honda", model: "CR-V", color: "Blanco", photos: ["1519641471654-76ce0107ad1b"], minYear: 2018, price: [1_600_000, 2_500_000] },
  { brand: "Hyundai", model: "Accent", color: "Negro", photos: ["1619767886558-efdc259cde1a"], minYear: 2018, price: [780_000, 1_150_000] },
  { brand: "Hyundai", model: "i30", color: "Rojo", photos: ["1550355291-bbee04a92027"], minYear: 2019, price: [950_000, 1_400_000] },
  { brand: "Nissan", model: "Altima", color: "Azul", photos: ["1580414057403-c5f451f30e1c"], minYear: 2017, price: [980_000, 1_500_000] },
  { brand: "Nissan", model: "Juke", color: "Gris", photos: ["1609521263047-f8f205293f24"], minYear: 2019, price: [1_100_000, 1_550_000] },
  { brand: "Nissan", model: "GT-R", color: "Plata", photos: ["1568605117036-5fe5e7bab0b7"], minYear: 2017, price: [95_000, 125_000], currency: "USD" },
  { brand: "Ford", model: "Mustang", color: "Negro", photos: ["1494905998402-395d579af36f", "1533106418989-88406c7cc8ca"], minYear: 2018, price: [2_600_000, 3_900_000] },
  { brand: "Ford", model: "Mustang", color: "Gris", photos: ["1494976388531-d1058494cdd8", "1612544448445-b8232cff3b6c"], minYear: 2019, price: [2_800_000, 4_100_000] },
  { brand: "Ford", model: "Mustang", color: "Rojo", photos: ["1594502184342-2e12f877aa73"], minYear: 2017, price: [2_300_000, 3_200_000] },
  { brand: "Ford", model: "Mustang", color: "Verde", photos: ["1567818735868-e71b99932e29"], minYear: 2020, price: [3_100_000, 4_200_000] },
  { brand: "Ford", model: "Mustang", color: "Negro", photos: ["1625231334168-35067f8853ed"], minYear: 2021, price: [72_000, 95_000], currency: "USD" },
  { brand: "Ford", model: "Explorer", color: "Blanco", photos: ["1606611013016-969c19ba27bb"], minYear: 2018, price: [2_100_000, 3_000_000] },
  { brand: "Ford", model: "Expedition", color: "Blanco", photos: ["1533473359331-0135ef1b58bf"], minYear: 2019, price: [3_800_000, 5_200_000] },
  { brand: "Ford", model: "F-150", color: "Azul", photos: ["1551830820-330a71b99659"], minYear: 2018, price: [3_000_000, 4_300_000] },
  { brand: "Ford", model: "F-150 Raptor", color: "Gris", photos: ["1605893477799-b99e3b8b93fe"], minYear: 2020, price: [85_000, 110_000], currency: "USD" },
  { brand: "Chevrolet", model: "Camaro", color: "Azul", photos: ["1552519507-da3b142c6e3d"], minYear: 2017, price: [2_200_000, 3_300_000] },
  { brand: "Chevrolet", model: "Corvette", color: "Azul", photos: ["1619405399517-d7fce0f13302"], minYear: 2019, price: [88_000, 120_000], currency: "USD" },
  { brand: "Jeep", model: "Wrangler", color: "Negro", photos: ["1506015391300-4802dc74de2e"], minYear: 2018, price: [2_600_000, 3_900_000] },
  { brand: "Jeep", model: "Grand Cherokee", color: "Gris", photos: ["1511527844068-006b95d162c2"], minYear: 2018, price: [2_400_000, 3_700_000] },
  { brand: "Dodge", model: "Challenger", color: "Gris", photos: ["1609520505218-7421df70121d"], minYear: 2018, price: [2_500_000, 3_600_000] },
  { brand: "Dodge", model: "Challenger", color: "Negro", photos: ["1626668893632-6f3a4466d22f"], minYear: 2020, price: [3_000_000, 4_200_000] },
  { brand: "Volkswagen", model: "Golf", color: "Negro", photos: ["1471444928139-48c5bf5173f8"], minYear: 2016, price: [850_000, 1_300_000] },
  { brand: "Volkswagen", model: "Polo", color: "Azul", photos: ["1541899481282-d53bffe3c35d"], minYear: 2018, price: [780_000, 1_100_000] },
  { brand: "Volkswagen", model: "Transporter", color: "Amarillo", photos: ["1464219789935-c2d9d9aba644"], minYear: 1978, price: [650_000, 1_200_000] },
  { brand: "Volkswagen", model: "Transporter", color: "Beige", photos: ["1527786356703-4b100091cd2c"], minYear: 1975, price: [700_000, 1_300_000] },
  { brand: "BMW", model: "Serie 5", color: "Plata", photos: ["1555215695-3004980ad54e"], minYear: 2019, price: [3_400_000, 4_800_000] },
  { brand: "BMW", model: "Serie 5", color: "Negro", photos: ["1546614042-7df3c24c9e5d"], minYear: 2016, price: [1_900_000, 2_700_000] },
  { brand: "BMW", model: "Serie 7", color: "Gris", photos: ["1601362840469-51e4d8d58785"], minYear: 2020, price: [5_200_000, 7_000_000] },
  { brand: "BMW", model: "Serie 4", color: "Azul", photos: ["1502877338535-766e1452684a"], minYear: 2018, price: [2_600_000, 3_500_000] },
  { brand: "BMW", model: "M4", color: "Gris", photos: ["1580273916550-e323be2ae537"], minYear: 2019, price: [78_000, 98_000], currency: "USD" },
  { brand: "Mercedes-Benz", model: "CLA", color: "Gris", photos: ["1570733577524-3a047079e80d"], minYear: 2018, price: [2_000_000, 2_900_000] },
  { brand: "Mercedes-Benz", model: "Clase C", color: "Gris", photos: ["1514316454349-750a7fd3da3a", "1590362891991-f776e747a588"], minYear: 2019, price: [2_700_000, 3_800_000] },
  { brand: "Mercedes-Benz", model: "AMG GT", color: "Rojo", photos: ["1553440569-bcc63803a83d"], minYear: 2018, price: [115_000, 150_000], currency: "USD" },
  { brand: "Mercedes-Benz", model: "AMG GT", color: "Amarillo", photos: ["1605559424843-9e4c228bf1c2"], minYear: 2019, price: [120_000, 155_000], currency: "USD" },
  { brand: "Mercedes-Benz", model: "AMG GT", color: "Gris", photos: ["1618843479313-40f8afb4b4d8", "1617814076367-b759c7d7e738"], minYear: 2020, price: [130_000, 165_000], currency: "USD" },
  { brand: "Audi", model: "A6", color: "Gris", photos: ["1597007066704-67bf2068d5b2", "1606664515524-ed2f786a0bd6"], minYear: 2019, price: [2_900_000, 4_000_000] },
  { brand: "Audi", model: "A7", color: "Naranja", photos: ["1504215680853-026ed2a45def"], minYear: 2017, price: [2_600_000, 3_600_000] },
  { brand: "Audi", model: "A7", color: "Blanco", photos: ["1616422285623-13ff0162193c"], minYear: 2020, price: [4_200_000, 5_600_000] },
  { brand: "Audi", model: "Q5", color: "Blanco", photos: ["1517524008697-84bbe3c3fd98"], minYear: 2019, price: [2_900_000, 3_900_000] },
  { brand: "Audi", model: "R8", color: "Gris", photos: ["1603584173870-7f23fdae1b7a", "1612468008274-9445bd56161e"], minYear: 2018, price: [140_000, 185_000], currency: "USD" },
  { brand: "Porsche", model: "911", color: "Negro", photos: ["1580274455191-1c62238fa333", "1611821064430-0d40291d0f0b"], minYear: 2018, price: [135_000, 190_000], currency: "USD" },
  { brand: "Porsche", model: "911", color: "Blanco", photos: ["1614162692292-7ac56d7f7f1e", "1597404294360-feeeda04612e"], minYear: 2019, price: [125_000, 175_000], currency: "USD" },
  { brand: "Porsche", model: "718 Boxster", color: "Amarillo", photos: ["1632245889029-e406faaa34cd"], minYear: 2020, price: [85_000, 110_000], currency: "USD" },
  { brand: "Porsche", model: "Panamera", color: "Negro", photos: ["1503376780353-7e6692767b70", "1601929862217-f1bf94503333"], minYear: 2018, price: [95_000, 140_000], currency: "USD" },
  { brand: "Land Rover", model: "Range Rover Sport", color: "Negro", photos: ["1563720223185-11003d516935"], minYear: 2019, price: [5_000_000, 7_200_000] },
  { brand: "Tesla", model: "Model S", color: "Negro", photos: ["1536700503339-1e4b06520771", "1620891549027-942fdc95d3f5"], minYear: 2019, price: [3_400_000, 4_800_000] },
  { brand: "Tesla", model: "Model 3", color: "Blanco", photos: ["1606016159991-dfe4f2746ad5"], minYear: 2021, price: [2_300_000, 3_000_000] },
  { brand: "Tesla", model: "Model Y", color: "Blanco", photos: ["1600661653561-629509216228"], minYear: 2022, price: [2_800_000, 3_500_000] },
  { brand: "Volvo", model: "XC60", color: "Azul", photos: ["1629897048514-3dd7414fe72a"], minYear: 2019, price: [2_900_000, 3_900_000] },
  { brand: "Fiat", model: "500", color: "Azul", photos: ["1549317661-bd32c8ce0db2"], minYear: 2016, price: [620_000, 900_000] },
];

const COVERS = ["1543465077-db45d34b88a5", "1617788138017-80ad40651399", "1583121274602-3e2820c69888", "1590362891991-f776e747a588"];

// ---------- Características ----------
const FEATURES: [string, FeatureCategory, string][] = [
  ["Bolsas de aire frontales", "SEGURIDAD", "shield"],
  ["Bolsas de aire laterales", "SEGURIDAD", "shield"],
  ["Frenos ABS", "SEGURIDAD", "disc"],
  ["Control de estabilidad", "SEGURIDAD", "activity"],
  ["Cámara de reversa", "SEGURIDAD", "camera"],
  ["Cámara 360°", "SEGURIDAD", "cctv"],
  ["Sensores de parqueo", "SEGURIDAD", "parking"],
  ["Monitor de punto ciego", "SEGURIDAD", "eye"],
  ["Frenado autónomo de emergencia", "SEGURIDAD", "radar"],
  ["Alarma", "SEGURIDAD", "lock"],
  ["Anclajes ISOFIX", "SEGURIDAD", "baby"],
  ["Aire acondicionado", "CONFORT", "snowflake"],
  ["Climatizador bizona", "CONFORT", "thermometer"],
  ["Asientos en piel", "CONFORT", "seat"],
  ["Asientos eléctricos", "CONFORT", "seat"],
  ["Asientos ventilados", "CONFORT", "fan"],
  ["Sunroof / Techo panorámico", "CONFORT", "sun"],
  ["Encendido sin llave", "CONFORT", "key"],
  ["Arranque remoto", "CONFORT", "power"],
  ["Cristales eléctricos", "CONFORT", "wind"],
  ["Control crucero", "CONFORT", "gauge"],
  ["Control crucero adaptativo", "CONFORT", "radar"],
  ["Volante multifunción", "CONFORT", "hand"],
  ["Bluetooth", "TECNOLOGIA", "bluetooth"],
  ["Apple CarPlay / Android Auto", "TECNOLOGIA", "phone"],
  ["Navegación GPS", "TECNOLOGIA", "navigation"],
  ["Pantalla táctil", "TECNOLOGIA", "screen"],
  ["Sistema de sonido premium", "TECNOLOGIA", "speaker"],
  ["Cargador inalámbrico", "TECNOLOGIA", "battery"],
  ["Puertos USB", "TECNOLOGIA", "usb"],
  ["Wi-Fi a bordo", "TECNOLOGIA", "wifi"],
  ["Tablero digital", "TECNOLOGIA", "gauge"],
  ["Luces LED", "EXTERIOR", "light"],
  ["Aros de lujo", "EXTERIOR", "sparkles"],
  ["Barras de techo", "EXTERIOR", "package"],
  ["Gancho de remolque", "EXTERIOR", "route"],
  ["Tracción 4x4 con reductora", "EXTERIOR", "mountain"],
  ["Retrovisores eléctricos", "EXTERIOR", "eye"],
  ["Vidrios tintados", "EXTERIOR", "droplets"],
];

// ---------- Dealers ----------
const DEALERS = [
  { name: "Auto Caribe Motors", province: "Distrito Nacional", address: "Av. John F. Kennedy esq. Lope de Vega, Santo Domingo", lat: 18.4874, lng: -69.9338, premium: true, desc: "Más de 20 años vendiendo vehículos de alta gama en Santo Domingo. Financiamiento con los principales bancos y garantía extendida." },
  { name: "Quisqueya Autos", province: "Distrito Nacional", address: "Av. 27 de Febrero #410, Santo Domingo", lat: 18.4719, lng: -69.9461, premium: false, desc: "Vehículos nuevos y usados certificados. Aceptamos tu carro como parte del pago." },
  { name: "Cibao Motors", province: "Santiago", address: "Av. Estrella Sadhalá, Santiago de los Caballeros", lat: 19.4602, lng: -70.6865, premium: true, desc: "El dealer líder del Cibao: jeepetas, camionetas y sedanes con financiamiento aprobado en 24 horas." },
  { name: "Punta Cana Car Center", province: "La Altagracia", address: "Av. Barceló, Bávaro, Punta Cana", lat: 18.6849, lng: -68.4229, premium: false, desc: "Vehículos ideales para la zona turística del Este, rentadoras y particulares." },
  { name: "Costa Este Autos", province: "La Romana", address: "Av. Libertad #88, La Romana", lat: 18.4295, lng: -68.9711, premium: false, desc: "Atención personalizada y los mejores precios del Este." },
  { name: "Malecón Auto Import", province: "San Pedro de Macorís", address: "Av. Francisco Domínguez Charro, San Pedro de Macorís", lat: 18.4539, lng: -69.2989, premium: false, desc: "Importadores directos desde Estados Unidos y Corea." },
  { name: "Ámbar Motors", province: "Puerto Plata", address: "Av. Luis Ginebra, Puerto Plata", lat: 19.7808, lng: -70.6871, premium: false, desc: "Tu dealer de confianza en la costa norte." },
  { name: "Vega Real Autos", province: "La Vega", address: "Av. Pedro A. Rivera, La Vega", lat: 19.2196, lng: -70.5268, premium: false, desc: "Camionetas y jeepetas para el trabajo y la familia." },
  { name: "Autoplaza Oriental", province: "Santo Domingo", address: "Av. San Vicente de Paúl, Santo Domingo Este", lat: 18.5048, lng: -69.8501, premium: true, desc: "La plaza de vehículos más grande de Santo Domingo Este." },
  { name: "Bonao Auto Center", province: "Monseñor Nouel", address: "Autopista Duarte Km 83, Bonao", lat: 18.9369, lng: -70.4092, premium: false, desc: "Nuevo en el portal: pendiente de aprobación.", pending: true },
];

// Versiones de catálogo por modelo ("Marca/Modelo").
const MODEL_TRIMS: Record<string, string[]> = {
  "Toyota/Corolla": ["L", "LE", "SE", "XLE", "XSE", "GR"],
  "Toyota/Camry": ["LE", "SE", "XLE", "XSE", "TRD"],
  "Toyota/Yaris": ["L", "LE", "XLE"],
  "Toyota/RAV4": ["LE", "XLE", "XLE Premium", "Adventure", "Limited", "TRD Off-Road"],
  "Toyota/Land Cruiser Prado": ["TX", "TX-L", "VX", "VX-L"],
  "Toyota/4Runner": ["SR5", "TRD Off-Road", "TRD Pro", "Limited"],
  "Toyota/Hilux": ["SR", "SRV", "SRX", "GR-S"],
  "Toyota/Tacoma": ["SR", "SR5", "TRD Sport", "TRD Off-Road", "Limited", "TRD Pro"],
  "Toyota/Sienna": ["LE", "XLE", "XSE", "Limited", "Platinum"],
  "Toyota/Hiace": ["Standard", "Commuter", "GL"],
  "Honda/Civic": ["LX", "Sport", "EX", "Touring", "Si", "Type R"],
  "Honda/Accord": ["LX", "Sport", "EX-L", "Touring"],
  "Honda/Fit": ["LX", "Sport", "EX"],
  "Honda/CR-V": ["LX", "EX", "EX-L", "Touring"],
  "Honda/HR-V": ["LX", "Sport", "EX-L"],
  "Honda/Pilot": ["LX", "EX-L", "TrailSport", "Touring", "Elite"],
  "Honda/Odyssey": ["EX", "EX-L", "Touring", "Elite"],
  "Hyundai/Accent": ["GL", "GLS", "Limited"],
  "Hyundai/Elantra": ["SE", "SEL", "Limited", "N Line", "N"],
  "Hyundai/Sonata": ["SE", "SEL", "N Line", "Limited"],
  "Hyundai/i30": ["GL", "GLS", "N Line"],
  "Hyundai/Tucson": ["SE", "SEL", "N Line", "Limited"],
  "Hyundai/Santa Fe": ["SE", "SEL", "XRT", "Limited", "Calligraphy"],
  "Hyundai/Creta": ["GL", "GLS", "Limited"],
  "Hyundai/H-1": ["Cargo", "Pasajeros"],
  "Kia/Rio": ["LX", "S", "EX"],
  "Kia/K5": ["LXS", "GT-Line", "EX", "GT"],
  "Kia/Picanto": ["LX", "EX", "GT-Line"],
  "Kia/Sportage": ["LX", "EX", "SX", "SX Prestige", "X-Pro"],
  "Kia/Sorento": ["LX", "S", "EX", "SX", "SX Prestige", "X-Line"],
  "Kia/Seltos": ["LX", "S", "EX", "SX"],
  "Kia/Carnival": ["LX", "EX", "SX", "SX Prestige"],
  "Nissan/Sentra": ["S", "SV", "SR"],
  "Nissan/Altima": ["S", "SV", "SR", "SL"],
  "Nissan/Versa": ["S", "SV", "SR"],
  "Nissan/Kicks": ["S", "SV", "SR"],
  "Nissan/Juke": ["S", "SV", "SL", "Nismo"],
  "Nissan/X-Trail": ["Sense", "Advance", "Exclusive"],
  "Nissan/Frontier": ["S", "SV", "PRO-4X", "LE"],
  "Nissan/GT-R": ["Premium", "Track Edition", "Nismo"],
  "Nissan/Urvan": ["Cargo", "Pasajeros"],
  "Mitsubishi/Mirage": ["ES", "LE", "SE", "GT"],
  "Mitsubishi/Outlander": ["ES", "SE", "SEL"],
  "Mitsubishi/Montero Sport": ["GLS", "Limited"],
  "Mitsubishi/L200": ["GL", "GLX", "GLS", "Sportero"],
  "Suzuki/Swift": ["GL", "GLX", "Sport"],
  "Suzuki/Vitara": ["GL", "GLX", "Turbo"],
  "Suzuki/Jimny": ["GA", "GL", "GLX"],
  "Suzuki/Ertiga": ["GA", "GL", "GLX"],
  "Mazda/Mazda3": ["Base", "Select", "Preferred", "Premium", "Turbo"],
  "Mazda/CX-5": ["Select", "Preferred", "Premium", "Signature"],
  "Mazda/CX-30": ["Select", "Preferred", "Premium", "Turbo"],
  "Mazda/BT-50": ["SE", "XT", "XTR", "GT"],
  "Mazda/MX-5": ["Sport", "Club", "Grand Touring"],
  "Ford/Mustang": ["EcoBoost", "EcoBoost Premium", "GT", "GT Premium", "Mach 1", "Dark Horse"],
  "Ford/Explorer": ["XLT", "Limited", "ST", "Platinum", "King Ranch"],
  "Ford/Expedition": ["XLT", "Limited", "King Ranch", "Platinum"],
  "Ford/Escape": ["S", "SE", "SEL", "Titanium"],
  "Ford/F-150": ["XL", "XLT", "Lariat", "King Ranch", "Platinum", "Limited"],
  "Ford/F-150 Raptor": ["Raptor", "Raptor R"],
  "Ford/Ranger": ["XL", "XLT", "Lariat", "Wildtrak", "Raptor"],
  "Ford/Transit": ["Cargo", "Pasajeros", "Chasis"],
  "Chevrolet/Spark": ["LS", "LT", "Activ"],
  "Chevrolet/Camaro": ["LS", "LT", "SS", "ZL1"],
  "Chevrolet/Corvette": ["Stingray", "Z06", "E-Ray"],
  "Chevrolet/Tahoe": ["LS", "LT", "RST", "Z71", "Premier", "High Country"],
  "Chevrolet/Colorado": ["WT", "LT", "Z71", "ZR2"],
  "Chevrolet/Silverado": ["WT", "LT", "RST", "LTZ", "High Country", "ZR2"],
  "Jeep/Wrangler": ["Sport", "Sport S", "Sahara", "Rubicon", "Rubicon 392"],
  "Jeep/Grand Cherokee": ["Laredo", "Altitude", "Limited", "Overland", "Summit", "Trailhawk"],
  "Jeep/Compass": ["Sport", "Latitude", "Limited", "Trailhawk"],
  "Jeep/Gladiator": ["Sport", "Overland", "Rubicon", "Mojave"],
  "Dodge/Challenger": ["SXT", "GT", "R/T", "R/T Scat Pack", "SRT Hellcat"],
  "Dodge/Charger": ["SXT", "GT", "R/T", "Scat Pack", "SRT Hellcat"],
  "Dodge/Durango": ["SXT", "GT", "R/T", "Citadel", "SRT"],
  "Volkswagen/Jetta": ["S", "Sport", "SE", "SEL", "GLI"],
  "Volkswagen/Golf": ["Trendline", "Comfortline", "Highline", "GTI", "R"],
  "Volkswagen/Polo": ["Trendline", "Comfortline", "Highline", "GTS"],
  "Volkswagen/Tiguan": ["S", "SE", "SE R-Line", "SEL R-Line"],
  "Volkswagen/Amarok": ["Trendline", "Comfortline", "Highline", "V6 Extreme"],
  "Volkswagen/Transporter": ["Cargo", "Kombi"],
  "BMW/Serie 3": ["320i", "330i", "330e", "M340i"],
  "BMW/Serie 5": ["520i", "530i", "540i", "M550i"],
  "BMW/Serie 7": ["740i", "760i", "i7"],
  "BMW/Serie 4": ["420i", "430i", "M440i"],
  "BMW/M4": ["M4", "Competition", "CSL"],
  "BMW/X3": ["sDrive30i", "xDrive30i", "M40i"],
  "BMW/X5": ["sDrive40i", "xDrive40i", "xDrive50e", "M60i"],
  "Mercedes-Benz/Clase C": ["C 200", "C 300", "AMG C 43", "AMG C 63"],
  "Mercedes-Benz/Clase E": ["E 300", "E 350", "E 450", "AMG E 53"],
  "Mercedes-Benz/CLA": ["CLA 200", "CLA 250", "AMG CLA 35", "AMG CLA 45"],
  "Mercedes-Benz/AMG GT": ["GT", "GT S", "GT C", "GT R"],
  "Mercedes-Benz/GLC": ["GLC 200", "GLC 300", "AMG GLC 43"],
  "Mercedes-Benz/GLE": ["GLE 350", "GLE 450", "AMG GLE 53", "AMG GLE 63"],
  "Mercedes-Benz/Sprinter": ["Cargo", "Pasajeros"],
  "Audi/A4": ["Premium", "Premium Plus", "Prestige", "S4"],
  "Audi/A6": ["Premium", "Premium Plus", "Prestige", "S6"],
  "Audi/A7": ["Premium Plus", "Prestige", "S7", "RS 7"],
  "Audi/R8": ["V10", "V10 Performance"],
  "Audi/Q5": ["Premium", "Premium Plus", "Prestige", "SQ5"],
  "Audi/Q7": ["Premium", "Premium Plus", "Prestige", "SQ7"],
  "Porsche/911": ["Carrera", "Carrera S", "Carrera 4S", "Turbo", "Turbo S", "GT3"],
  "Porsche/718 Boxster": ["Base", "S", "GTS 4.0", "Spyder"],
  "Porsche/Panamera": ["Base", "4", "4S", "GTS", "Turbo E-Hybrid"],
  "Porsche/Cayenne": ["Base", "S", "GTS", "Turbo", "Turbo E-Hybrid"],
  "Porsche/Macan": ["Base", "T", "S", "GTS"],
  "Land Rover/Range Rover Sport": ["SE", "Dynamic SE", "Autobiography", "SV"],
  "Land Rover/Defender": ["90", "110", "130", "X", "V8"],
  "Land Rover/Discovery": ["S", "SE", "Dynamic SE", "HSE"],
  "Lexus/IS": ["IS 300", "IS 350", "IS 500 F Sport"],
  "Lexus/ES": ["ES 250", "ES 300h", "ES 350"],
  "Lexus/NX": ["NX 250", "NX 350", "NX 350h", "NX 450h+"],
  "Lexus/RX": ["RX 350", "RX 350h", "RX 500h"],
  "Lexus/LX": ["LX 600", "LX 600 F Sport", "LX 600 Ultra Luxury"],
  "Tesla/Model 3": ["Standard", "Long Range", "Performance"],
  "Tesla/Model S": ["Long Range", "Plaid"],
  "Tesla/Model Y": ["Standard", "Long Range", "Performance"],
  "Volvo/S60": ["Core", "Plus", "Ultimate"],
  "Volvo/XC60": ["Core", "Plus", "Ultimate", "Recharge"],
  "Volvo/XC90": ["Core", "Plus", "Ultimate", "Recharge"],
  "Fiat/500": ["Pop", "Lounge", "Abarth"],
  "Fiat/Pulse": ["Drive", "Audace", "Impetus", "Abarth"],
  "Isuzu/D-Max": ["LS", "LS-E", "X-Terrain"],
  "Isuzu/MU-X": ["LS", "LS-E", "LS-T"],
  "Subaru/Impreza": ["Base", "Premium", "Sport", "RS"],
  "Subaru/Forester": ["Base", "Premium", "Sport", "Limited", "Touring", "Wilderness"],
  "Subaru/Outback": ["Base", "Premium", "Limited", "Onyx Edition", "Wilderness", "Touring"],
  "Chery/Tiggo 4": ["Comfort", "Luxury", "Pro"],
  "Chery/Tiggo 7": ["Comfort", "Luxury", "Pro"],
  "Chery/Arrizo 5": ["Comfort", "Luxury"],
  "Changan/CS35 Plus": ["Comfort", "Luxury"],
  "Changan/CS55 Plus": ["Comfort", "Luxury", "Elite"],
  "Changan/Alsvin": ["Comfort", "Luxury"],
  "Changan/Hunter": ["Comfort", "Luxury"],
  "Geely/Coolray": ["Comfort", "Sport", "Flagship"],
  "Geely/Emgrand": ["Comfort", "Premium"],
  "BYD/Dolphin": ["Active", "Comfort", "Design"],
  "BYD/Seal": ["Premium", "Performance AWD"],
  "BYD/Song Plus": ["GL", "GS", "DM-i"],
  "BYD/Shark": ["GL", "GS"],
  "JAC/JS4": ["Comfort", "Luxury"],
  "JAC/T8": ["Comfort", "Luxury", "Pro"],
};
// Lo que algunos vendedores escriben a mano en vez de elegir del catálogo.
const LOOSE_TRIMS = ["Full", "Full extras", "Edición especial"];
const ENGINES = ["1.5L 4 cil.", "1.6L 4 cil.", "2.0L 4 cil.", "2.0L Turbo", "2.5L 4 cil.", "3.0L V6", "3.5L V6", "5.0L V8"];

async function main() {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 8) throw new Error("Define SEED_DEMO_PASSWORD (mín. 8 caracteres) en .env");
  const passwordHash = await bcrypt.hash(password, 12);

  // Limpieza (solo desarrollo)
  await db.$transaction([
    db.vehicleFeature.deleteMany(),
    db.vehiclePhoto.deleteMany(),
    db.vehicle.deleteMany(),
    db.subscription.deleteMany(),
    db.plan.deleteMany(),
    db.session.deleteMany(),
    db.user.deleteMany(),
    db.dealer.deleteMany(),
    db.model.deleteMany(),
    db.brand.deleteMany(),
    db.feature.deleteMany(),
  ]);

  // Marcas y modelos
  const modelIds = new Map<string, { id: string; bodyType: BodyType; trims: { id: string; name: string }[] }>();
  for (const b of BRANDS) {
    const brand = await db.brand.create({
      data: {
        name: b.name,
        slug: slugify(b.name),
        iconSlug: b.icon ?? null,
        color: b.color,
        models: {
          create: b.models.map(([name, bodyType]) => ({
            name,
            slug: slugify(name),
            bodyType,
            trims: { create: (MODEL_TRIMS[`${b.name}/${name}`] ?? []).map((t) => ({ name: t, slug: slugify(t) })) },
          })),
        },
      },
      include: { models: { include: { trims: true } } },
    });
    for (const m of brand.models) modelIds.set(`${b.name}/${m.name}`, { id: m.id, bodyType: m.bodyType, trims: m.trims });
  }

  // Características
  await db.feature.createMany({
    data: FEATURES.map(([name, category, icon]) => ({ name, slug: slugify(name), category, icon })),
  });
  const features = await db.feature.findMany();

  // Planes
  const [basic, pro, dealerStd, dealerPremium] = await Promise.all([
    db.plan.create({ data: { name: "Básico", description: "Ideal para vender tu carro rápido.", priceDop: 1_500, maxActiveListings: 2, featuredSlots: 0, durationDays: 30 } }),
    db.plan.create({ data: { name: "Pro", description: "Más vehículos y un destacado en la portada.", priceDop: 3_500, maxActiveListings: 5, featuredSlots: 1, durationDays: 60 } }),
    db.plan.create({ data: { name: "Dealer Estándar", description: "Inventario mediano con perfil de dealer y mapa.", priceDop: 15_000, maxActiveListings: 40, featuredSlots: 3, durationDays: 30, forDealers: true } }),
    db.plan.create({ data: { name: "Dealer Premium", description: "Inventario amplio y máxima visibilidad en la portada.", priceDop: 35_000, maxActiveListings: 150, featuredSlots: 12, durationDays: 30, forDealers: true } }),
  ]);
  void basic;

  // Usuarios
  const admin = await db.user.create({
    data: { email: "admin@demo.carstore.do", name: "Administrador", role: "ADMIN", passwordHash },
  });

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86_400_000);
  const dealers: { id: string; userId: string; lat: number; lng: number; province: string; premium: boolean; pending: boolean }[] = [];
  for (const [i, d] of DEALERS.entries()) {
    const slug = slugify(d.name);
    const dealer = await db.dealer.create({
      data: {
        slug,
        name: d.name,
        description: d.desc,
        province: d.province,
        address: d.address,
        lat: d.lat,
        lng: d.lng,
        phone: `809-55${i}-${between(1000, 9999)}`,
        whatsapp: `1829${between(1000000, 9999999)}`,
        email: `ventas@${slug}.example.com`,
        website: `https://${slug}.example.com`,
        hours: "Lun–Vie 8:30 a.m.–6:00 p.m. · Sáb 9:00 a.m.–2:00 p.m.",
        coverUrl: unsplash(COVERS[i % COVERS.length]),
        status: d.pending ? "PENDING" : "APPROVED",
        verified: d.premium,
      },
    });
    const user = await db.user.create({
      data: { email: `${slug}@demo.carstore.do`, name: `Ventas ${d.name}`, role: "DEALER", dealerId: dealer.id, passwordHash },
    });
    if (!d.pending)
      await db.subscription.create({
        data: {
          planId: d.premium ? dealerPremium.id : dealerStd.id,
          userId: user.id,
          dealerId: dealer.id,
          status: "ACTIVE",
          paymentRef: `TRF-${between(100000, 999999)}`,
          startsAt: now,
          endsAt: in30,
          approvedById: admin.id,
        },
      });
    dealers.push({ id: dealer.id, userId: user.id, lat: d.lat, lng: d.lng, province: d.province, premium: d.premium, pending: !!d.pending });
  }

  const seller = await db.user.create({
    data: { email: "particular@demo.carstore.do", name: "Juan Pérez", phone: "809-555-0101", role: "SELLER", passwordHash },
  });
  await db.subscription.create({
    data: { planId: pro.id, userId: seller.id, status: "ACTIVE", startsAt: now, endsAt: new Date(now.getTime() + 60 * 86_400_000), approvedById: admin.id, paymentRef: "TRF-102030" },
  });

  // Vehículos: cada entrada del catálogo genera 1-2 publicaciones
  const activeDealers = dealers.filter((d) => !d.pending);
  const featuredLeft = new Map(activeDealers.map((d) => [d.id, d.premium ? 4 : 1]));
  let sellerListings = 0;
  let count = 0;
  for (const entry of CATALOG) {
    const model = modelIds.get(`${entry.brand}/${entry.model}`);
    if (!model) throw new Error(`Modelo no encontrado: ${entry.brand} ${entry.model}`);
    const copies = rand() < 0.35 ? 2 : 1;
    for (let c = 0; c < copies; c++) {
      const bySeller = sellerListings < 3 && rand() < 0.08;
      const dealer = bySeller ? null : pick(activeDealers);
      const classic = entry.minYear < 1990;
      const year = classic ? entry.minYear : between(entry.minYear, 2026);
      const isNew = !classic && !bySeller && year >= 2025 && rand() < 0.7;
      const price = Math.round(between(entry.price[0], entry.price[1]) / 1000) * 1000;
      const currency = entry.currency ?? "DOP";
      const province = dealer ? dealer.province : pick(PROVINCES).name;
      const base = dealer ?? PROVINCES.find((p) => p.name === province)!;
      const jitter = dealer ? 0 : 0.03;
      const bodyType = model.bodyType;
      const isPickupOrSuv = bodyType === "PICKUP" || bodyType === "JEEPETA";
      const fuel: Fuel = entry.brand === "Tesla" ? "ELECTRIC" : isPickupOrSuv && rand() < 0.3 ? "DIESEL" : rand() < 0.08 ? "HYBRID" : rand() < 0.06 ? "GLP" : "GASOLINE";
      const transmission: Transmission = classic || rand() < 0.1 ? "MANUAL" : rand() < 0.2 ? "CVT" : "AUTOMATIC";
      const drivetrain: Drivetrain = bodyType === "PICKUP" ? "FOUR_WD" : bodyType === "JEEPETA" ? pick(["AWD", "FOUR_WD", "FWD"] as const) : bodyType === "COUPE" || bodyType === "CONVERTIBLE" ? "RWD" : "FWD";
      const chosen = features.filter(() => rand() < 0.45);
      const featured = dealer && (featuredLeft.get(dealer.id) ?? 0) > 0 && rand() < 0.4;
      if (featured && dealer) featuredLeft.set(dealer.id, featuredLeft.get(dealer.id)! - 1);
      const r = rand();
      const catalogTrim = model.trims.length && r < 0.85 ? pick(model.trims) : null;
      const trim = catalogTrim?.name ?? (r < 0.92 ? null : pick(LOOSE_TRIMS));
      const photos = [...entry.photos, ...CATALOG.filter((e) => e !== entry && e.brand === entry.brand && e.model === entry.model).flatMap((e) => e.photos).slice(0, 2), ...INTERIORS];

      await db.vehicle.create({
        data: {
          ownerId: dealer ? dealer.userId : seller.id,
          dealerId: dealer?.id ?? null,
          modelId: model.id,
          bodyType,
          year,
          trim,
          trimId: catalogTrim?.id ?? null,
          condition: isNew ? "NEW" : "USED",
          price,
          currency,
          priceDop: toDop(price, currency),
          mileageKm: isNew ? between(0, 50) : classic ? between(90_000, 240_000) : between(8, 140) * 1000,
          transmission,
          fuel,
          drivetrain,
          engine: entry.brand === "Tesla" ? "Eléctrico doble motor" : pick(ENGINES),
          extColor: entry.color,
          intColor: pick(["Negro", "Beige", "Gris", "Marrón"]),
          doors: bodyType === "COUPE" || bodyType === "CONVERTIBLE" ? 2 : bodyType === "VAN" ? 3 : 4,
          seats: bodyType === "COUPE" || bodyType === "CONVERTIBLE" ? 4 : bodyType === "VAN" || bodyType === "MINIVAN" ? 8 : 5,
          description: `${entry.brand} ${entry.model} ${year} en excelentes condiciones. ${isNew ? "Vehículo nuevo con garantía de fábrica." : "Mantenimientos al día, papeles en regla y listo para traspaso."} Aceptamos financiamiento y vehículo como parte de pago.`,
          province,
          lat: base.lat + (rand() - 0.5) * jitter,
          lng: base.lng + (rand() - 0.5) * jitter,
          status: "ACTIVE",
          featuredUntil: featured ? in30 : null,
          views: between(20, 2500),
          createdAt: new Date(now.getTime() - between(0, 60) * 86_400_000),
          photos: { create: photos.map((id, position) => ({ url: unsplash(id), position })) },
          features: { create: chosen.map((f) => ({ featureId: f.id })) },
        },
      });
      if (bySeller) sellerListings++;
      count++;
    }
  }

  console.log(`Seed listo: ${BRANDS.length} marcas, ${DEALERS.length} dealers, ${features.length} características, ${count} vehículos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
