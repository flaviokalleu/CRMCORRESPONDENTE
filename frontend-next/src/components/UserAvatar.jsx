"use client";

import { useState } from "react";
import { iniciaisDe } from "@/lib/user-avatar";
import { cn } from "@/lib/utils";

// Avatar único do app: mostra a foto quando ela existe e carrega; se não,
// as iniciais do nome. O `onError` sozinho não basta: com SSR a imagem pode
// falhar (404) antes de o React hidratar, e aí o evento já passou. Por isso
// o ref confere, ao montar, se a imagem "terminou" sem nenhum pixel.
export function UserAvatar({ src, name, size = "sm", className, alt = "" }) {
  // Guarda QUAL endereço falhou: trocar a foto (nova prévia) tenta de novo.
  const [srcQueFalhou, setSrcQueFalhou] = useState(null);
  const mostrarFoto = Boolean(src) && srcQueFalhou !== src;

  const conferir = (img) => {
    if (img && img.complete && img.naturalWidth === 0) setSrcQueFalhou(src);
  };

  return (
    <span className={cn("user-avatar", size === "lg" && "user-avatar-lg", className)} aria-hidden={alt ? undefined : true}>
      {mostrarFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={conferir} src={src} alt={alt} onError={() => setSrcQueFalhou(src)} />
      ) : (
        iniciaisDe(name)
      )}
    </span>
  );
}
