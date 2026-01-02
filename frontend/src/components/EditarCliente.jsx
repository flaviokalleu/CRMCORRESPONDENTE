import React, { useEffect, useState } from "react";
import axios from "axios";

const EditarCliente = ({ clienteId }) => {
  const [cliente, setCliente] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    valor_renda: "",
    estado_civil: "",
    naturalidade: "",
    profissao: "",
    data_admissao: "",
    data_nascimento: "",
    renda_tipo: "",
    possui_carteira_mais_tres_anos: "",
    numero_pis: "",
    possui_dependente: "",
    status: "",
  });

  const [loading, setLoading] = useState(true);
  const [documentos, setDocumentos] = useState({
    documentos_pessoais: null,
    extrato_bancario: null,
    documentos_dependente: null,
    documentos_conjuge: null,
  });

  // Função para carregar as informações do cliente
  const carregarCliente = async () => {
    try {
      const response = await axios.get(`/clientes/${clienteId}`);
      setCliente(response.data);
    } catch (error) {
      console.error("Erro ao carregar cliente:", error);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar o cliente
  const atualizarCliente = async (e) => {
    e.preventDefault();
    const formData = new FormData();

    // Adiciona os dados do cliente ao FormData
    for (const key in cliente) {
      formData.append(key, cliente[key]);
    }

    // Adiciona os arquivos ao FormData
    for (const key in documentos) {
      if (documentos[key]) {
        formData.append(key, documentos[key]);
      }
    }

    try {
      await axios.put(`/clientes/${clienteId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      alert("Cliente atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      alert("Erro ao atualizar cliente. Verifique os dados e tente novamente.");
    }
  };

  // Carregar dados do cliente ao montar o componente
  useEffect(() => {
    carregarCliente();
  }, [clienteId]);

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="max-w-md mx-auto p-4 border rounded-lg shadow bg-gray-800 text-white">
      <h2 className="text-xl font-semibold mb-4">Editar Cliente</h2>
      <form onSubmit={atualizarCliente} className="space-y-4">
        {Object.keys(cliente).map((key) => (
          <div key={key}>
            <label
              className="block text-sm font-medium text-gray-300"
              htmlFor={key}
            >
              {key.replace(/_/g, " ").toUpperCase()}
            </label>
            <input
              type="text"
              id={key}
              name={key}
              value={cliente[key]}
              onChange={(e) =>
                setCliente({ ...cliente, [key]: e.target.value })
              }
              className="mt-1 p-2 block w-full border border-gray-600 rounded-md focus:ring focus:ring-blue-300"
              placeholder={`Digite ${key.replace(/_/g, " ")}`}
            />
          </div>
        ))}
        {/* Inputs para upload de documentos */}
        {Object.keys(documentos).map((key) => (
          <div key={key}>
            <label
              className="block text-sm font-medium text-gray-300"
              htmlFor={key}
            >
              {key.replace(/_/g, " ").toUpperCase()}
            </label>
            <input
              type="file"
              id={key}
              name={key}
              accept="application/pdf,image/*"
              onChange={(e) =>
                setDocumentos({ ...documentos, [key]: e.target.files[0] })
              }
              className="mt-1 p-2 block w-full border border-gray-600 rounded-md"
            />
          </div>
        ))}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition duration-200"
        >
          Atualizar Cliente
        </button>
      </form>
    </div>
  );
};

export default EditarCliente;
