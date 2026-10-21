import { requireUser } from "@/lib/auth";
import { saveVehicle } from "@/app/actions/vehicles";
import { getVehicleFormData } from "@/lib/vehicle-form-data";
import { PROVINCE_NAMES } from "@/lib/provinces";
import { ListingImporter } from "@/components/forms/listing-importer";
import { PageTitle } from "@/components/panel/shell";

export default async function NewVehicle() {
  const user = await requireUser("DEALER", "SELLER");
  const { brands, features, defaults, featuredHint } = await getVehicleFormData(user);
  return (
    <div className="max-w-5xl">
      <PageTitle title="Publicar vehículo" text="Completa los datos. Puedes guardarlo como borrador y publicarlo después." />
      <ListingImporter action={saveVehicle.bind(null, null)} values={defaults} brands={brands} features={features} provinces={PROVINCE_NAMES} featuredHint={featuredHint} />
    </div>
  );
}
