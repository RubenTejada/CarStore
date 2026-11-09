import { z } from "zod";
import { LEGAL_VERSION } from "./legal";

// El servidor exige una acción afirmativa y la versión mostrada por el formulario.
export const legalFields = {
  legalVersion: z.literal(LEGAL_VERSION, { error: "Las condiciones cambiaron. Recarga la página y revísalas antes de continuar." }),
  accepted: z.literal("on", { error: "Debes marcar la casilla de aceptación para continuar." }),
};

export const legalRequestSchema = z.object({
  kind: z.enum(["PRIVACY", "CONTENT", "PAYMENT", "OTHER"]),
  name: z.string().trim().min(2, "Escribe tu nombre").max(100),
  email: z.string().trim().toLowerCase().email("Correo inválido").max(150),
  reference: z.string().trim().max(500),
  message: z.string().trim().min(20, "Describe tu solicitud con al menos 20 caracteres").max(4000),
  ...legalFields,
});
