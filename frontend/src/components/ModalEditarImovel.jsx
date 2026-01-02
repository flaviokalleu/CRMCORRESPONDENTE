import React, { useState } from "react";
import axios from "axios";

const ModalEditarImovel = ({ imovel, isOpen, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({ ...imovel });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/imoveis/${imovel.id}`,
        formData
      );
      onUpdate(formData);
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar imóvel:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-xl mx-4 sm:mx-auto overflow-y-auto max-h-full">
        <h2 className="text-2xl font-bold text-white mb-4">Editar Imóvel</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300">Nome do Imóvel</label>
            <input
              type="text"
              name="nome_imovel"
              value={formData.nome_imovel || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Descrição</label>
            <textarea
              name="descricao_imovel"
              value={formData.descricao_imovel || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Endereço</label>
            <input
              type="text"
              name="endereco"
              value={formData.endereco || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Tipo</label>
            <input
              type="text"
              name="tipo"
              value={formData.tipo || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Quartos</label>
            <input
              type="number"
              name="quartos"
              value={formData.quartos || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Banheiros</label>
            <input
              type="number"
              name="banheiro"
              value={formData.banheiro || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Tags</label>
            <input
              type="text"
              name="tags"
              value={formData.tags || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Valor de Avaliação</label>
            <input
              type="number"
              name="valor_avaliacao"
              value={formData.valor_avaliacao || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Valor de Venda</label>
            <input
              type="number"
              name="valor_venda"
              value={formData.valor_venda || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Localização</label>
            <input
              type="text"
              name="localizacao"
              value={formData.localizacao || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Exclusivo</label>
            <input
              type="checkbox"
              name="exclusivo"
              checked={formData.exclusivo || false}
              onChange={handleChange}
              className="form-checkbox h-5 w-5 text-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Tem Inquilino</label>
            <input
              type="checkbox"
              name="tem_inquilino"
              checked={formData.tem_inquilino || false}
              onChange={handleChange}
              className="form-checkbox h-5 w-5 text-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Situação do Imóvel</label>
            <input
              type="text"
              name="situacao_imovel"
              value={formData.situacao_imovel || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Observações</label>
            <textarea
              name="observacoes"
              value={formData.observacoes || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded mr-2 hover:bg-gray-700 transition duration-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition duration-300"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEditarImovel;
