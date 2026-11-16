"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "@/components/icons";
import { PageHeader } from "@/components/ui/page";
import { FormField, FormAlert, focarPrimeiroErro } from "@/components/ui/form-field";
import { MoneyInput } from "@/components/ui/money-input";
import { FormActions } from "@/components/ui/form-actions";
import { Dropzone } from "@/components/ui/dropzone";
import { parseMoney, soDigitos } from "@/lib/masks";

// Client Component: cadastro de imóvel para aluguel. Envia multipart/form-data
// via proxy `/api/backend/alugueis` (nunca chamada direta ao Go). O backend
// aceita valor_aluguel em pt-BR ("1.500,00" — parseCurrencyValue).
const VAZIO = { nome_imovel: "", descricao: "", valor_aluguel: "", quartos: "", banheiro: "", dia_vencimento: "" };
const ORDEM = ["nome_imovel", "descricao", "valor_aluguel", "dia_vencimento"];

export default function AddAluguelPage() {
  const router = useRouter();
  const [formData, setFormData] = useState(VAZIO);
  const [fotoCapa, setFotoCapa] = useState([]);
  const [fotosAdicionais, setFotosAdicionais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [erros, setErros] = useState({});

  const set = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErros((p) => (p[name] ? { ...p, [name]: undefined } : p));
  };
  const onText = (e) => set(e.target.name, e.target.value);
  const onNumero = (max) => (e) => set(e.target.name, soDigitos(e.target.value).slice(0, max));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const novos = {};
    if (!formData.nome_imovel.trim()) novos.nome_imovel = "Escreva um nome ou o endereço do imóvel.";
    if (!formData.descricao.trim()) novos.descricao = "Conte um pouco sobre o imóvel.";
    if (parseMoney(formData.valor_aluguel) <= 0) novos.valor_aluguel = "Informe o valor do aluguel.";
    const dia = Number(formData.dia_vencimento);
    if (formData.dia_vencimento && (dia < 1 || dia > 31)) novos.dia_vencimento = "Use um dia entre 1 e 31.";
    if (Object.keys(novos).length) {
      setErros(novos);
      focarPrimeiroErro(novos, ORDEM);
      return;
    }

    const fd = new FormData();
    fd.append("nome_imovel", formData.nome_imovel);
    fd.append("descricao", formData.descricao);
    fd.append("valor_aluguel", formData.valor_aluguel);
    fd.append("quartos", formData.quartos);
    fd.append("banheiro", formData.banheiro);
    fd.append("dia_vencimento", formData.dia_vencimento);
    if (fotoCapa[0]) fd.append("foto_capa", fotoCapa[0]);
    fotosAdicionais.forEach((file) => fd.append("fotos_adicionais", file));

    setLoading(true);
    try {
      const res = await fetch("/api/backend/alugueis", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Não foi possível cadastrar o imóvel. Tente de novo.");
      toast.success("Imóvel para aluguel cadastrado.", {
        action: { label: "Cadastrar outro", onClick: () => router.push("/alugueis/adicionar") },
        duration: 8000,
      });
      router.push("/alugueis");
      router.refresh();
    } catch (err) {
      setError(err.message);
      (document.getElementById("conteudo") || window).scrollTo({ top: 0, behavior: "smooth" }); // a página rola dentro do <main> do layout
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Cadastrar imóvel para aluguel" subtitle="Nome, descrição e valor são obrigatórios. Fotos podem ficar para depois." />

      <form onSubmit={handleSubmit} noValidate className="crm-form crm-card mx-auto max-w-3xl space-y-5">
        {error && <FormAlert titulo="Não deu para salvar">{error}</FormAlert>}

        <FormField id="nome_imovel" label="Nome ou endereço" required error={erros.nome_imovel}>
          <input name="nome_imovel" value={formData.nome_imovel} onChange={onText} placeholder="Ex.: Apartamento Rua das Flores, 123" />
        </FormField>

        <FormField id="descricao" label="Descrição" required error={erros.descricao}>
          <textarea name="descricao" value={formData.descricao} onChange={onText} rows={4}
            placeholder="Onde fica, como é, o que tem de bom…" />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="valor_aluguel" label="Valor do aluguel por mês" required error={erros.valor_aluguel}>
            <MoneyInput value={formData.valor_aluguel} onChange={(v) => set("valor_aluguel", v)} placeholder="1.500,00" />
          </FormField>
          <FormField id="dia_vencimento" label="Dia do vencimento (1 a 31)" optional error={erros.dia_vencimento}
            hint="Dia do mês em que o inquilino paga.">
            <input name="dia_vencimento" inputMode="numeric" value={formData.dia_vencimento} onChange={onNumero(2)} placeholder="Ex.: 10" />
          </FormField>
          <FormField id="quartos" label="Quartos" optional>
            <input name="quartos" inputMode="numeric" value={formData.quartos} onChange={onNumero(2)} placeholder="Ex.: 3" />
          </FormField>
          <FormField id="banheiro" label="Banheiros" optional>
            <input name="banheiro" inputMode="numeric" value={formData.banheiro} onChange={onNumero(2)} placeholder="Ex.: 2" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="crm-field">
            <p className="crm-field-label">Foto de capa</p>
            <Dropzone id="foto_capa" imagem accept="image/*" files={fotoCapa} onChange={setFotoCapa} texto="Toque para escolher a foto principal" />
          </div>
          <div className="crm-field">
            <p className="crm-field-label">Mais fotos</p>
            <Dropzone id="fotos_adicionais" imagem multiple accept="image/*" files={fotosAdicionais} onChange={setFotosAdicionais} texto="Toque para escolher várias fotos" />
          </div>
        </div>

        <FormActions loading={loading} icon={Save} submitLabel="Cadastrar imóvel" loadingLabel="Cadastrando…" cancelHref="/alugueis" />
      </form>
    </div>
  );
}
