// src/components/AddClienteAluguel.jsx
import React, { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";

const AddClienteAluguel = ({ isOpen, onClose, onAddCliente }) => {
  const [cliente, setCliente] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    valor_aluguel: "",
    dia_vencimento: "",
    aluguel_id: "",
    data_inicio_contrato: "",
    data_fim_contrato: "",
    indice_reajuste: "IGPM",
  });
  const [asaasStatus, setAsaasStatus] = useState(null);
  const [imoveis, setImoveis] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetch(`${process.env.REACT_APP_API_URL}/alugueis-disponiveis`)
        .then(res => res.json())
        .then(data => setImoveis(Array.isArray(data) ? data : []))
        .catch(() => setImoveis([]));
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Formatação do CPF
    if (name === "cpf") {
      const formattedCpf = value
        .replace(/\D/g, "") // Remove todos os caracteres não numéricos
        .replace(/(\d{3})(\d)/, "$1.$2") // Adiciona ponto após os três primeiros dígitos
        .replace(/(\d{3})(\d)/, "$1.$2") // Adiciona ponto após os três seguintes
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2"); // Adiciona hífen antes dos últimos dois dígitos
      setCliente((prev) => ({ ...prev, cpf: formattedCpf }));
    } else if (name === "telefone") {
      // Formatação do Telefone
      const formattedTelefone = value
        .replace(/\D/g, "") // Remove todos os caracteres não numéricos
        .replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, "($1) $2 $3-$4"); // Formata como (61) 9 9608-0740
      setCliente((prev) => ({
        ...prev,
        telefone: formattedTelefone,
      }));
    } else {
      setCliente((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Remover a formatação do telefone antes de enviar para o servidor
      const telefoneSemFormato = cliente.telefone.replace(/\D/g, "");

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/clientealuguel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...cliente,
            telefone: telefoneSemFormato, // Enviar telefone sem formatação
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Erro ao adicionar cliente");
      }
      const data = await response.json();

      // Mostrar status do Asaas antes de fechar
      if (data.asaas_subscription_id) {
        setAsaasStatus('active');
      } else {
        setAsaasStatus('pending');
      }

      onAddCliente(data);

      // Aguarda 2 segundos para o usuario ver o status e fecha
      setTimeout(() => {
        setAsaasStatus(null);
        onClose();
      }, 2500);
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-black p-8 rounded-2xl shadow-2xl border border-blue-900/40 w-full max-w-md">
        <h2 className="text-2xl font-extrabold mb-6 text-white text-center tracking-tight">
          Adicionar Cliente de Aluguel
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-white font-semibold mb-1">Nome</label>
            <input
              type="text"
              name="nome"
              placeholder="Nome"
              value={cliente.nome}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border border-blue-800/40 bg-blue-900/60 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-700 transition"
            />
          </div>
          <div>
            <label className="block text-white font-semibold mb-1">CPF</label>
            <input
              type="text"
              name="cpf"
              placeholder="CPF"
              value={cliente.cpf}
              onChange={handleChange}
              required
              maxLength={14}
              className="w-full p-3 rounded-lg border border-blue-800/40 bg-blue-900/60 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-700 transition"
            />
          </div>
          <div>
            <label className="block text-white font-semibold mb-1">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={cliente.email}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border border-blue-800/40 bg-blue-900/60 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-700 transition"
            />
          </div>
          <div>
            <label className="block text-white font-semibold mb-1">Telefone</label>
            <input
              type="text"
              name="telefone"
              placeholder="Telefone"
              value={cliente.telefone}
              onChange={handleChange}
              required
              maxLength={16}
              className="w-full p-3 rounded-lg border border-blue-800/40 bg-blue-900/60 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-700 transition"
            />
          </div>
          <div>
            <label className="block text-white font-semibold mb-1">
              Valor do Aluguel
            </label>
            <input
              type="number"
              name="valor_aluguel"
              placeholder="Valor do Aluguel"
              value={cliente.valor_aluguel}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border border-blue-800/40 bg-blue-900/60 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-700 transition"
            />
          </div>
          <div>
            <label className="block text-white font-semibold mb-1">
              Dia do Vencimento
            </label>
            <input
              type="number"
              name="dia_vencimento"
              placeholder="Dia do Vencimento"
              value={cliente.dia_vencimento}
              onChange={handleChange}
              required
              min={1}
              max={31}
              className="w-full p-3 rounded-lg border border-blue-800/40 bg-blue-900/60 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-700 transition"
            />
          </div>

          {/* Selecao de Imovel */}
          <div>
            <label className="block text-white font-semibold mb-1">Imovel (opcional)</label>
            <select name="aluguel_id" value={cliente.aluguel_id} onChange={handleChange}
              className="w-full p-3 rounded-lg border border-blue-800/40 bg-blue-900/60 text-white focus:outline-none focus:ring-2 focus:ring-blue-700 transition">
              <option value="">Selecione um imovel...</option>
              {imoveis.map(im => (
                <option key={im.id} value={im.id} className="bg-blue-900 text-white">
                  {im.nome_imovel} - R$ {Number(im.valor_aluguel).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Datas do Contrato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white font-semibold mb-1">Inicio Contrato</label>
              <input type="date" name="data_inicio_contrato" value={cliente.data_inicio_contrato} onChange={handleChange}
                className="w-full p-3 rounded-lg border border-blue-800/40 bg-blue-900/60 text-white focus:outline-none focus:ring-2 focus:ring-blue-700 transition" />
            </div>
            <div>
              <label className="block text-white font-semibold mb-1">Fim Contrato</label>
              <input type="date" name="data_fim_contrato" value={cliente.data_fim_contrato} onChange={handleChange}
                className="w-full p-3 rounded-lg border border-blue-800/40 bg-blue-900/60 text-white focus:outline-none focus:ring-2 focus:ring-blue-700 transition" />
            </div>
          </div>

          {/* Indice de Reajuste */}
          <div>
            <label className="block text-white font-semibold mb-1">Indice de Reajuste</label>
            <select name="indice_reajuste" value={cliente.indice_reajuste} onChange={handleChange}
              className="w-full p-3 rounded-lg border border-blue-800/40 bg-blue-900/60 text-white focus:outline-none focus:ring-2 focus:ring-blue-700 transition">
              <option value="IGPM" className="bg-blue-900">IGPM</option>
              <option value="IPCA" className="bg-blue-900">IPCA</option>
              <option value="INPC" className="bg-blue-900">INPC</option>
            </select>
          </div>

          {/* Status Asaas pos-criacao */}
          {asaasStatus === 'active' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/40 border border-green-700/50">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium text-sm">Cobranca automatica ativada no Asaas!</span>
            </div>
          )}
          {asaasStatus === 'pending' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-900/40 border border-yellow-700/50">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-medium text-sm">Asaas pendente — sincronize depois na lista de clientes.</span>
            </div>
          )}

          <div className="flex justify-between gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={asaasStatus !== null}
              className="w-1/2 py-3 rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white font-bold transition disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClienteAluguel;
