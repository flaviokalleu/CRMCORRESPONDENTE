import "server-only";
import { apiGet } from "./api-server";
import { WHATSAPP_PUBLICO } from "./contato-publico";

// Número do WhatsApp da imobiliária da vitrine (GET /api/public/empresa).
export async function whatsappPublico() {
  const empresa = await apiGet("/public/empresa", { next: { revalidate: 300 } });
  return empresa?.whatsapp || WHATSAPP_PUBLICO;
}
