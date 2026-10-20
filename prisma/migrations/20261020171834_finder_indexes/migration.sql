-- DropIndex
DROP INDEX "Vehicle_modelId_idx";

-- DropIndex
DROP INDEX "VehicleFeature_featureId_idx";

-- CreateIndex
CREATE INDEX "Vehicle_modelId_status_idx" ON "Vehicle"("modelId", "status");

-- CreateIndex
CREATE INDEX "VehicleFeature_featureId_vehicleId_idx" ON "VehicleFeature"("featureId", "vehicleId");
