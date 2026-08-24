import { ImageResponse } from "next/og";

// Imagem de preview do link (WhatsApp, Facebook, Instagram).
//
// Sem isto, compartilhar o site no WhatsApp mostrava só um retângulo cinza —
// e é POR WHATSAPP que o link circula neste mercado. Um SVG não resolve:
// as redes exigem PNG/JPG, então geramos um PNG de verdade aqui.
//
// O Next lê este arquivo pela convenção de nome e injeta og:image,
// og:image:width e og:image:height sozinho.

export const alt = "CRM IMOB — Imóveis em Valparaíso de Goiás e região";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #003b71 0%, #005ca9 100%)",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#c2410c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            C
          </div>
          <span style={{ color: "#fff", fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
            CRM IMOB
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#fff", fontSize: 62, fontWeight: 800, lineHeight: 1.1 }}>
            Sua casa própria começa aqui
          </span>
          <span style={{ color: "#f7941e", fontSize: 40, fontWeight: 700, marginTop: 10 }}>
            Simule o Minha Casa Minha Vida
          </span>
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 27, marginTop: 22 }}>
            Valparaíso de Goiás · Cidade Ocidental · Jardim Ingá · Luziânia
          </span>
        </div>

        <div style={{ display: "flex", height: 10, width: "100%", borderRadius: 5 }}>
          <div style={{ flex: 1, background: "#c2410c", borderRadius: "5px 0 0 5px" }} />
          <div style={{ flex: 1, background: "#f7941e" }} />
          <div style={{ flex: 2, background: "rgba(255,255,255,0.25)", borderRadius: "0 5px 5px 0" }} />
        </div>
      </div>
    ),
    size,
  );
}
