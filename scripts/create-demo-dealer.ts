/**
 * Dealer de demostración para presentar el módulo de redes sociales (ver docs/demo-redes-sociales.md).
 * Crea o actualiza: el dealer (marcado `demo`: su inventario no se lista en el portal ni se indexa),
 * su cuenta, un plan activo con «Redes sociales», un diseño por defecto para los anuncios y un
 * inventario de muestra (publicados y borradores para publicar en vivo). Se puede correr varias veces.
 *
 *   npm run demo:dealer            muestra lo que haría, sin escribir
 *   npm run demo:dealer -- --yes   lo aplica en la base de DATABASE_URL
 *
 * Variables: DEMO_DEALER_EMAIL (demo@tucarroonline.com), DEMO_DEALER_PASSWORD (si falta y la cuenta
 * no existe, se genera una y se muestra una sola vez), DEMO_DEALER_PHONE (WhatsApp del anuncio, opcional).
 */
import "dotenv/config";
import { appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { DEFAULT_DESIGN, PALETTES } from "@/lib/social/design";
import { DEFAULT_CAPTION } from "@/lib/social/caption";
import type { BodyType, Drivetrain, Fuel, Transmission } from "@/generated/prisma/enums";

const apply = process.argv.includes("--yes");
const EMAIL = (process.env.DEMO_DEALER_EMAIL || "demo@tucarroonline.com").toLowerCase();
const SLUG = "tucarro-demo-motors";
const NOTE = "Vehículo de demostración de TuCarroOnline: no está a la venta.";
const DAYS = 365;

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

type Sample = { brand: string; model: string; trim: string; year: number; price: number; km: number; color: string; transmission: Transmission; fuel: Fuel; drivetrain: Drivetrain; photos: string[]; publish: boolean };

// Fotos de Unsplash ya usadas en prisma/seed.ts. Los dos últimos quedan en borrador para publicarlos durante la demo.
const SAMPLES: Sample[] = [
  { brand: "Ford", model: "Mustang", trim: "GT Premium", year: 2021, price: 3_650_000, km: 28_000, color: "Gris", transmission: "AUTOMATIC", fuel: "GASOLINE", drivetrain: "RWD", photos: ["1494976388531-d1058494cdd8", "1612544448445-b8232cff3b6c"], publish: true },
  { brand: "Toyota", model: "RAV4", trim: "XLE", year: 2022, price: 2_450_000, km: 31_500, color: "Plata", transmission: "AUTOMATIC", fuel: "GASOLINE", drivetrain: "AWD", photos: ["1617469767053-d3b523a0b982"], publish: true },
  { brand: "Honda", model: "CR-V", trim: "EX-L", year: 2021, price: 2_150_000, km: 42_000, color: "Blanco", transmission: "CVT", fuel: "GASOLINE", drivetrain: "AWD", photos: ["1519641471654-76ce0107ad1b"], publish: true },
  { brand: "Toyota", model: "Tacoma", trim: "TRD Sport", year: 2020, price: 3_100_000, km: 55_000, color: "Beige", transmission: "AUTOMATIC", fuel: "GASOLINE", drivetrain: "FOUR_WD", photos: ["1559416523-140ddc3d238c"], publish: true },
  { brand: "Ford", model: "Mustang", trim: "EcoBoost", year: 2020, price: 2_750_000, km: 36_000, color: "Rojo", transmission: "AUTOMATIC", fuel: "GASOLINE", drivetrain: "RWD", photos: ["1594502184342-2e12f877aa73"], publish: false },
  { brand: "Toyota", model: "Camry", trim: "SE", year: 2022, price: 1_950_000, km: 24_000, color: "Gris", transmission: "AUTOMATIC", fuel: "GASOLINE", drivetrain: "FWD", photos: ["1621007947382-bb3c3994e3fb"], publish: false },
];

const lines: string[] = [];
const log = (line: string) => lines.push(line);

async function main() {
  const host = new URL(process.env.DATABASE_URL ?? "postgresql://?").hostname || "(sin DATABASE_URL)";
  log(`## Dealer demo (${apply ? "aplicando" : "simulación: agrega --yes para aplicar"})`);
  log("");
  log(`- Base: ${host}`);

  const plan = await db.plan.findFirst({ where: { active: true, forDealers: true, socialModule: true }, orderBy: { maxActiveListings: "desc" } });
  if (!plan) throw new Error("No hay un plan activo para dealers con «Redes sociales». Créalo en /admin/planes.");
  log(`- Plan: ${plan.name}`);

  const existingUser = await db.user.findUnique({ where: { email: EMAIL }, select: { id: true, role: true, dealerId: true } });
  if (existingUser && existingUser.role !== "DEALER") throw new Error(`${EMAIL} ya es una cuenta ${existingUser.role}; usa otro DEMO_DEALER_EMAIL.`);
  const dealer0 = await db.dealer.findUnique({ where: { slug: SLUG }, select: { id: true } });
  if (existingUser?.dealerId && dealer0 && existingUser.dealerId !== dealer0.id) throw new Error(`${EMAIL} pertenece a otro dealer.`);

  if (!apply) {
    log(`- Dealer: ${dealer0 ? "existe, se actualiza" : "se crea"} (/dealers/${SLUG})`);
    log(`- Cuenta: ${EMAIL} ${existingUser ? "existe" : "se crea"}`);
    log(`- Vehículos de muestra: ${SAMPLES.length} si el dealer no tiene ninguno`);
    return;
  }

  const phone = process.env.DEMO_DEALER_PHONE?.trim() || null;
  const dealerData = {
    name: "TuCarro Demo Motors",
    description: "Dealer de demostración de TuCarroOnline para presentar la publicación en Facebook e Instagram. Sus vehículos no están a la venta.",
    province: "Distrito Nacional",
    address: "Santo Domingo",
    lat: 18.4861,
    lng: -69.9312,
    phone,
    whatsapp: phone,
    status: "APPROVED" as const,
    demo: true,
  };
  const dealer = await db.dealer.upsert({ where: { slug: SLUG }, create: { slug: SLUG, ...dealerData }, update: dealerData });
  log(`- Dealer: ${dealer.name} (/dealers/${SLUG}), marcado como demo`);

  let generated: string | null = null;
  const password = process.env.DEMO_DEALER_PASSWORD || (existingUser ? null : (generated = randomBytes(12).toString("base64url")));
  const user = existingUser
    ? await db.user.update({ where: { id: existingUser.id }, data: { dealerId: dealer.id, active: true, ...(password && { passwordHash: await bcrypt.hash(password, 12) }) } })
    : await db.user.create({ data: { email: EMAIL, name: "Demo TuCarro", role: "DEALER", dealerId: dealer.id, passwordHash: await bcrypt.hash(password!, 12) } });
  log(`- Cuenta: ${EMAIL}${existingUser ? (password ? " (contraseña actualizada)" : " (sin cambios de contraseña)") : " (creada)"}`);

  const endsAt = new Date(Date.now() + DAYS * 86_400_000);
  const active = await db.subscription.findFirst({ where: { dealerId: dealer.id, status: "ACTIVE", planId: plan.id } });
  if (active) await db.subscription.update({ where: { id: active.id }, data: { endsAt } });
  else await db.subscription.create({ data: { planId: plan.id, userId: user.id, dealerId: dealer.id, status: "ACTIVE", paymentRef: "DEMO", startsAt: new Date(), endsAt } });
  log(`- Suscripción ${plan.name} activa hasta ${endsAt.toISOString().slice(0, 10)}`);

  const design = { ...DEFAULT_DESIGN, template: "etiqueta" as const, colors: PALETTES.find((p) => p.id === "noche")!.colors, badge: "Recién llegado" };
  await db.socialAccount.upsert({
    where: { dealerId: dealer.id },
    create: { dealerId: dealer.id, defaultDesign: design, captionTemplate: DEFAULT_CAPTION, autoPublish: true },
    update: {},
  });
  log("- Diseño por defecto de los anuncios listo (se conserva si ya existía)");

  if (await db.vehicle.count({ where: { dealerId: dealer.id } })) {
    log("- Inventario: el dealer ya tiene vehículos, no se agregan más");
    return;
  }
  let created = 0;
  for (const s of SAMPLES) {
    const model = await db.model.findFirst({ where: { name: { equals: s.model, mode: "insensitive" }, brand: { name: { equals: s.brand, mode: "insensitive" } } }, select: { id: true, bodyType: true } });
    if (!model) {
      log(`  - Se omite ${s.brand} ${s.model}: no está en el catálogo`);
      continue;
    }
    await db.vehicle.create({
      data: {
        ownerId: user.id,
        dealerId: dealer.id,
        modelId: model.id,
        bodyType: model.bodyType as BodyType,
        year: s.year,
        trim: s.trim,
        condition: "USED",
        price: s.price,
        currency: "DOP",
        priceDop: s.price,
        mileageKm: s.km,
        transmission: s.transmission,
        fuel: s.fuel,
        drivetrain: s.drivetrain,
        extColor: s.color,
        description: NOTE,
        province: dealerData.province,
        lat: dealerData.lat,
        lng: dealerData.lng,
        status: s.publish ? "ACTIVE" : "DRAFT",
        publishedAt: s.publish ? new Date() : null,
        photos: { create: s.photos.map((id, position) => ({ url: unsplash(id), position })) },
      },
    });
    created++;
  }
  log(`- Inventario: ${created} vehículos (${SAMPLES.filter((s) => s.publish).length} publicados, el resto en borrador)`);
  if (generated) console.log(`\nContraseña generada para ${EMAIL} (guárdala; no se vuelve a mostrar): ${generated}\n`);
}

main()
  .catch((error) => {
    process.exitCode = 1;
    log(`Error: ${error instanceof Error ? error.message : String(error)}`);
  })
  .finally(async () => {
    console.log(lines.join("\n"));
    await db.$disconnect();
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  });
