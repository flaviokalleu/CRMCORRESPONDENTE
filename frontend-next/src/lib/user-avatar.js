// Foto de perfil do usuário.
//
// O backend guarda em `users.photo` apenas o NOME do arquivo (ex.:
// "usuario_7.jpg"), gravado por users.savePhoto em uploads/usuario/. A pasta é
// servida estaticamente pelo Go em /api/uploads/usuario, e o front chega lá
// pelo proxy do Next (/api/backend → Go), mesmo caminho que imovelImageUrl usa
// para as fotos de imóvel.

export const AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";

// Monta a URL da foto. Devolve null quando o usuário não tem foto — quem
// chama decide se cai no placeholder ou nas iniciais.
export function userPhotoUrl(photo) {
  if (!photo) return null;
  const limpo = String(photo).replace(/\\/g, "/").replace(/^\/+/, "");
  // Tolera tanto "usuario_7.jpg" quanto um caminho já qualificado vindo de
  // registros antigos ("uploads/usuario/usuario_7.jpg").
  const arquivo = limpo.includes("/") ? limpo.split("/").pop() : limpo;
  return `/api/backend/uploads/usuario/${arquivo}`;
}

// Iniciais para o fallback do avatar — mesma regra usada na lista de clientes.
export function iniciaisDe(nome) {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  return partes.length ? (partes[0][0] + (partes[1]?.[0] || "")).toUpperCase() : "?";
}
