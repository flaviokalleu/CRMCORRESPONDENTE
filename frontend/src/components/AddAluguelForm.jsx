import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  FaSpinner,
  FaHome,
  FaFileAlt,
  FaDollarSign,
  FaBed,
  FaBath,
  FaCalendarAlt,
  FaUpload,
  FaSave,
  FaImage,
  FaImages,
  FaMapMarkerAlt,
} from "react-icons/fa";

export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api/";

const AddAluguelForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    nome_imovel: "",
    descricao: "",
    valor_aluguel: "",
    quartos: "",
    banheiro: "",
    dia_vencimento: "",
  });
  const [fotoCapa, setFotoCapa] = useState(null);
  const [fotoAdicional, setFotoAdicional] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Formatação especial para valor do aluguel
    if (name === "valor_aluguel") {
      // Remove tudo que não é número
      const numero = value.replace(/\D/g, "");

      if (!numero) {
        setFormData({ ...formData, [name]: "" });
        return;
      }

      // Converte para número e formata com vírgula decimal
      const valorNumerico = parseFloat(numero) / 100;
      const valorFormatado = valorNumerico.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      setFormData({ ...formData, [name]: valorFormatado });
    } else {
      setFormData({
        ...formData,
        [name]:
          name === "nome_imovel" || name === "descricao" ? value.toUpperCase() : value,
      });
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (name === "fotoCapa") {
      setFotoCapa(files[0]);
    } else if (name === "fotoAdicional") {
      setFotoAdicional(files);
    }
  };

  // Função para converter valor formatado para decimal
  const converterValorParaDecimal = (valorFormatado) => {
    if (!valorFormatado) return "";

    // Remove pontos e substitui vírgula por ponto
    const valorLimpo = valorFormatado
      .replace(/\./g, "") // Remove pontos (separadores de milhares)
      .replace(",", "."); // Substitui vírgula por ponto

    return parseFloat(valorLimpo) || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validações do frontend
    if (!formData.nome_imovel.trim()) {
      setError("Nome do imóvel é obrigatório");
      setLoading(false);
      return;
    }

    if (!formData.descricao.trim()) {
      setError("Descrição é obrigatória");
      setLoading(false);
      return;
    }

    if (!formData.valor_aluguel) {
      setError("Valor do aluguel é obrigatório");
      setLoading(false);
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("nome_imovel", formData.nome_imovel);
    formDataToSend.append("descricao", formData.descricao);

    // Converter valor formatado para decimal
    const valorDecimal = converterValorParaDecimal(formData.valor_aluguel);
    formDataToSend.append("valor_aluguel", valorDecimal);

    formDataToSend.append("quartos", formData.quartos);
    formDataToSend.append("banheiro", formData.banheiro);
    formDataToSend.append("dia_vencimento", formData.dia_vencimento);

    if (fotoCapa) formDataToSend.append("fotoCapa", fotoCapa);
    if (fotoAdicional) {
      Array.from(fotoAdicional).forEach((file) =>
        formDataToSend.append("fotoAdicional", file)
      );
    }

    try {
      const response = await axios.post(`${API_URL}/alugueis`, formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log('Resposta do servidor:', response.data);

      // Reset form
      setFormData({
        nome_imovel: "",
        descricao: "",
        valor_aluguel: "",
        quartos: "",
        banheiro: "",
        dia_vencimento: "",
      });
      setFotoCapa(null);
      setFotoAdicional(null);

      // Reset file inputs
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => input.value = '');

      if (onSuccess) onSuccess();
      
      // Mostrar mensagem de sucesso
      alert('Imóvel cadastrado com sucesso!');

    } catch (error) {
      console.error("Erro ao enviar o formulário:", error);
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.data?.detalhes) {
        const detalhes = error.response.data.detalhes.map(d => d.mensagem).join(', ');
        setError(`Erro de validação: ${detalhes}`);
      } else {
        setError("Erro ao cadastrar imóvel. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-caixa-primary flex flex-col">
      {/* Container principal com largura máxima expandida */}
      <div className="flex-1 w-full px-4 py-6 md:px-6 lg:px-8 xl:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center gap-3 tracking-tight">
            <FaHome className="w-6 h-6 md:w-8 md:h-8 text-caixa-orange" />
            Cadastro de Imóvel para Aluguel
          </h2>
          <p className="text-white text-base md:text-lg font-medium">
            Preencha os dados do imóvel com atenção. Todas as informações são importantes para o anúncio e locação.
          </p>
        </motion.div>

        {/* Formulário expandido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-4 md:p-6 lg:p-8 border border-caixa-primary/20 w-full"
        >
          <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
            {/* Grid de campos principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {/* Nome do Imóvel */}
              <div className="xl:col-span-2">
                <label htmlFor="nome_imovel" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaMapMarkerAlt className="w-4 h-4 text-caixa-orange" />
                  Nome/Endereço do Imóvel *
                </label>
                <input
                  id="nome_imovel"
                  type="text"
                  name="nome_imovel"
                  value={formData.nome_imovel}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  placeholder="Ex: APARTAMENTO RUA DAS FLORES, 123"
                  required
                />
              </div>

              {/* Valor do Aluguel */}
              <div>
                <label htmlFor="valor_aluguel" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaDollarSign className="w-4 h-4 text-caixa-orange" />
                  Valor do Aluguel *
                </label>
                <input
                  id="valor_aluguel"
                  type="text"
                  name="valor_aluguel"
                  value={formData.valor_aluguel}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  placeholder="Ex: 1.500,00"
                  required
                />
                <small className="text-caixa-primary/70 text-xs">
                  Digite apenas números. Ex: para R$ 1.500,00 digite "150000"
                </small>
              </div>
            </div>

            {/* Segunda linha de campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* Quartos */}
              <div>
                <label htmlFor="quartos" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaBed className="w-4 h-4 text-caixa-orange" />
                  Quartos *
                </label>
                <input
                  id="quartos"
                  type="number"
                  name="quartos"
                  value={formData.quartos}
                  onChange={handleChange}
                  min="0"
                  max="10"
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  placeholder="Ex: 3"
                  required
                />
              </div>

              {/* Banheiros */}
              <div>
                <label htmlFor="banheiro" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaBath className="w-4 h-4 text-caixa-orange" />
                  Banheiros *
                </label>
                <input
                  id="banheiro"
                  type="number"
                  name="banheiro"
                  value={formData.banheiro}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  placeholder="Ex: 2"
                  required
                />
              </div>

              {/* Dia do Vencimento */}
              <div className="md:col-span-2">
                <label htmlFor="dia_vencimento" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaCalendarAlt className="w-4 h-4 text-caixa-orange" />
                  Dia do Vencimento *
                </label>
                <input
                  id="dia_vencimento"
                  type="number"
                  name="dia_vencimento"
                  value={formData.dia_vencimento}
                  onChange={handleChange}
                  min={1}
                  max={31}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  placeholder="Ex: 10 (para dia 10 de cada mês)"
                  required
                />
                <small className="text-caixa-primary/70 text-xs">
                  Dia do mês em que o aluguel vence (1 a 31)
                </small>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="descricao" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                <FaFileAlt className="w-4 h-4 text-caixa-orange" />
                Descrição do Imóvel *
              </label>
              <textarea
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                className="w-full min-h-[120px] px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 resize-none"
                placeholder="DESCREVA O IMÓVEL: LOCALIZAÇÃO, CARACTERÍSTICAS, DIFERENCIAIS, ESTADO DE CONSERVAÇÃO..."
                required
              />
            </div>

            {/* Seção de Upload de Fotos */}
            <div className="border-t border-caixa-primary/20 pt-6">
              <h3 className="text-xl font-bold text-caixa-primary mb-6 flex items-center gap-2">
                <FaUpload className="w-5 h-5 text-caixa-orange" />
                Upload de Fotos do Imóvel
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Foto de Capa */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                    <FaImage className="w-4 h-4 text-caixa-orange" />
                    Foto de Capa Principal
                  </label>
                  <input
                    type="file"
                    name="fotoCapa"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-3 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-caixa-orange file:text-white hover:file:bg-caixa-orange/90"
                  />
                  <small className="text-caixa-primary/70 text-xs block mt-1">
                    Essa será a foto principal do anúncio
                  </small>
                </div>

                {/* Fotos Adicionais */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                    <FaImages className="w-4 h-4 text-caixa-orange" />
                    Fotos Adicionais
                  </label>
                  <input
                    type="file"
                    name="fotoAdicional"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="w-full px-3 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-caixa-orange file:text-white hover:file:bg-caixa-orange/90"
                  />
                  <small className="text-caixa-primary/70 text-xs block mt-1">
                    Selecione múltiplas fotos para mostrar mais detalhes
                  </small>
                </div>
              </div>
            </div>

            {/* Botão de Enviar */}
            <div className="pt-6 border-t border-caixa-primary/20">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className={`w-full px-8 py-4 rounded-xl bg-caixa-orange text-white font-bold text-lg flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all duration-200 ${
                  loading ? "opacity-60 cursor-not-allowed" : ""
                }`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="w-5 h-5 animate-spin" />
                    Cadastrando Imóvel...
                  </>
                ) : (
                  <>
                    <FaSave className="w-5 h-5" />
                    Cadastrar Imóvel para Aluguel
                  </>
                )}
              </motion.button>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl text-center font-semibold text-lg bg-red-100 border border-red-300 text-red-700"
              >
                {error}
              </motion.div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default AddAluguelForm;
