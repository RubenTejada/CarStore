import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canEditVehicle } from "@/lib/listing-rules";
import { saveVehicle } from "@/app/actions/vehicles";
import { getVehicleFormData } from "@/lib/vehicle-form-data";
import { PROVINCE_NAMES } from "@/lib/provinces";
import { vehicleTitle } from "@/lib/urls";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { PageTitle } from "@/components/panel/shell";

export default async function EditVehicle({ params }: PageProps<"/panel/vehiculos/[id]">) {
  const user = await requireUser("DEALER", "SELLER");
  const v = await db.vehicle.findUnique({
    where: { id: (await params).id },
    include: { model: { include: { brand: true } }, photos: { orderBy: { position: "asc" } }, features: { include: { feature: true } } },
  });
  if (!v || !canEditVehicle(user, v)) notFound();
  const { brands, features, featuredHint, aiDescription } = await getVehicleFormData(user);
  return (
    <div className="max-w-5xl">
      <PageTitle title={`Editar ${vehicleTitle(v)} ${v.year}`} />
      <VehicleForm
        action={saveVehicle.bind(null, v.id)}
        brands={brands}
        features={features}
        provinces={PROVINCE_NAMES}
        featuredHint={featuredHint}
        aiDescription={aiDescription}
        values={{
          modelId: v.modelId,
          brandId: v.model.brandId,
          bodyType: v.bodyType,
          year: v.year,
          trimId: v.trimId ?? "",
          trim: v.trim ?? "",
          condition: v.condition,
          price: v.price,
          currency: v.currency,
          mileageKm: v.mileageKm,
          transmission: v.transmission,
          fuel: v.fuel,
          drivetrain: v.drivetrain,
          engine: v.engine ?? "",
          extColor: v.extColor ?? "",
          intColor: v.intColor ?? "",
          doors: v.doors ?? "",
          seats: v.seats ?? "",
          description: v.description ?? "",
          plate: v.plate ?? "",
          vin: v.vin ?? "",
          province: v.province,
          lat: v.lat,
          lng: v.lng,
          photos: v.photos.map((p) => p.url),
          spinFrames: v.spinFrames,
          interiorPano: v.interiorPano,
          features: v.features.map((f) => f.feature.slug),
          featured: !!v.featuredUntil && v.featuredUntil > new Date(),
        }}
      />
    </div>
  );
}
