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

export const metadata = {
  title: {
    default: "CRM IMOB",
    template: "%s | CRM IMOB",
  },
  description: "Gestão imobiliária completa: clientes, imóveis, aluguéis e pagamentos.",
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
