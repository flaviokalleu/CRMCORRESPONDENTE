// WhatsApp de atendimento da vitrine pública. O número de verdade vem do
// telefone cadastrado em "Minha empresa" da imobiliária da vitrine, buscado no
// servidor por `whatsappPublico()` (lib/contato-publico-server.js) e passado
// às páginas e componentes. Este arquivo é seguro para o navegador.
//
// Reserva, só se a empresa não tiver telefone: NEXT_PUBLIC_WHATSAPP_PUBLICO
// (só dígitos, 55 + DDD) ou o provisório abaixo.
export const WHATSAPP_PUBLICO = process.env.NEXT_PUBLIC_WHATSAPP_PUBLICO || "5561999999999";

export function linkWhatsAppPublico(texto, numero = WHATSAPP_PUBLICO) {
  return `https://wa.me/${numero || WHATSAPP_PUBLICO}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
