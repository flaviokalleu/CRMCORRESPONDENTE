import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// `metadataBase` é o que transforma caminhos relativos em URLs absolutas nas
// tags og:image, og:url e canonical. Sem ele o Next avisa no build e os
// previews de WhatsApp/Facebook quebram, porque og:image PRECISA ser absoluta.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CRM IMOB — Imóveis em Valparaíso de Goiás e região",
    template: "%s | CRM IMOB",
  },
  description:
    "Casas e apartamentos à venda em Valparaíso de Goiás, Cidade Ocidental, Jardim Ingá e Luziânia. Simule o Minha Casa Minha Vida e descubra quanto você consegue financiar.",
  applicationName: "CRM IMOB",
  authors: [{ name: "CRM IMOB" }],
  formatDetection: { telephone: true, address: true, email: true },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "CRM IMOB",
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* AuthProvider no layout raiz — useAuth() funciona em TODA página,
            inclusive públicas (/login, /registro, vitrine). Sem initialUser
            aqui: cada página decide se precisa buscar o usuário (a maioria
            das públicas não precisa). */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
