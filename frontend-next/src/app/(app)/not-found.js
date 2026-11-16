import Link from "next/link";

// 404 dentro do app: fica no layout (com menu), então, se a empresa estiver
// com o acesso suspenso, o aviso da assinatura mostra a tela de bloqueio no
// lugar desta mensagem.
export default function NaoEncontrado() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="crm-card w-full max-w-lg p-8 text-center">
        <h1 className="text-2xl">Não encontramos esta página</h1>
        <p className="mt-2 text-base text-cx-muted">O endereço pode estar errado ou o registro foi removido.</p>
        <Link href="/dashboard" className="crm-primary-action mt-6 inline-flex h-12 items-center px-6 text-base">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
