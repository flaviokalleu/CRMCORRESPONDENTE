import { GuardaPapel } from "@/components/AcessoRestrito";

// Mesma regra do menu lateral (Sidebar.jsx): quem não vê o item no menu
// também não abre a tela digitando o endereço.
export default function Layout({ children }) {
  return <GuardaPapel papel="equipe">{children}</GuardaPapel>;
}
