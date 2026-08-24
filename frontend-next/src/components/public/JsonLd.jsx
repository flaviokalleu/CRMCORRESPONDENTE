// Injeta um bloco JSON-LD no HTML.
//
// Fica em <script type="application/ld+json">, que o navegador não executa —
// é dado para o rastreador, não código. Por isso `dangerouslySetInnerHTML` é
// o caminho normal aqui; o conteúdo vem do nosso próprio código, nunca de
// entrada do usuário.
//
// JSON.stringify escapa aspas, mas NÃO escapa "</script>" — se algum campo
// vindo do banco (descrição de imóvel, por exemplo) contivesse essa
// sequência, fecharia a tag e o resto viraria HTML. Daí o replace.
export function JsonLd({ data }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
