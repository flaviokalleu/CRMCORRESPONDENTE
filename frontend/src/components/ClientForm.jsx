import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from "axios";
import InputMask from "react-input-mask";
import { motion } from 'framer-motion';
import {
  FaSpinner,
  FaFileAlt,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaIdCard,
  FaBriefcase,
  FaCalendarAlt,
  FaUpload,
  FaWallet,
  FaSave,
  FaClock
} from "react-icons/fa";
import { useAuth } from "../hooks/useAuth"; // ajuste o caminho conforme seu projeto

const API_URL = process.env.REACT_APP_API_URL;
const ESTADOS_API_URL = process.env.REACT_APP_ESTADOS_API_URL || `${process.env.REACT_APP_API_URL}/estados`;
const MUNICIPIOS_API_URL = process.env.REACT_APP_MUNICIPIOS_API_URL || `${process.env.REACT_APP_API_URL}/municipios`;

const ClientForm = ({ onSuccess }) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [valorRenda, setValorRenda] = useState("");
  const [estadoCivil, setEstadoCivil] = useState("solteiro");
  const [naturalidade, setNaturalidade] = useState("");
  const [profissao, setProfissao] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  // ✅ NOVO CAMPO: DATA DE CRIAÇÃO
  const [dataCriacao, setDataCriacao] = useState(new Date().toISOString().split('T')[0]);
  const [rendaTipo, setRendaTipo] = useState("");
  const [possui_carteira_mais_tres_anos, setPossuiCarteiraMaisTresAnos] = useState("nao");
  const [numeroPis, setNumeroPis] = useState("");
  const [possuiDependente, setPossuiDependente] = useState("nao");
  const [qtdDependentes, setQtdDependentes] = useState("");
  const [nomeDependentes, setNomeDependentes] = useState("");
  const [documentosPessoais, setDocumentosPessoais] = useState([]);
  const [extratoBancario, setExtratoBancario] = useState([]);
  const [documentosDependente, setDocumentosDependente] = useState([]);
  const [documentosConjuge, setDocumentosConjuge] = useState([]);

  // Cônjuge
  const [cadastrarConjuge, setCadastrarConjuge] = useState(false);
  const [conjugeNome, setConjugeNome] = useState("");
  const [conjugeEmail, setConjugeEmail] = useState("");
  const [conjugeTelefone, setConjugeTelefone] = useState("");
  const [conjugeCpf, setConjugeCpf] = useState("");
  const [conjugeProfissao, setConjugeProfissao] = useState("");
  const [conjugeDataNascimento, setConjugeDataNascimento] = useState("");
  const [conjugeValorRenda, setConjugeValorRenda] = useState("");
  const [conjugeRendaTipo, setConjugeRendaTipo] = useState("");
  const [conjugeDataAdmissao, setConjugeDataAdmissao] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [estados, setEstados] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [estado, setEstado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const { user } = useAuth(); // Precisa ter o contexto do usuário logado
  const [usuarios, setUsuarios] = useState([]);
  const [userId, setUserId] = useState(""); // Novo estado
  const [vincularUsuario, setVincularUsuario] = useState(false); // Novo estado

  useEffect(() => {
    const fetchEstados = async () => {
      try {
        const { data } = await axios.get(ESTADOS_API_URL);
        setEstados(data);
      } catch (error) {
        console.error("Erro ao buscar estados:", error);
      }
    };
    fetchEstados();
  }, []);

  useEffect(() => {
    if (estado) {
      const fetchMunicipios = async () => {
        try {
          const estadoSelecionado = estados.find((est) => est.sigla === estado);
          if (estadoSelecionado) {
            const estadoId = estadoSelecionado.id;
            const { data } = await axios.get(
              `${MUNICIPIOS_API_URL}/${estadoId}`
            );
            setMunicipios(data);
          } else {
            console.error("Estado não encontrado");
          }
        } catch (error) {
          console.error("Erro ao buscar municípios:", error);
        }
      };

      fetchMunicipios();
    } else {
      setMunicipios([]);
    }
  }, [estado, estados]);

  // ✅ FUNÇÃO CORRIGIDA PARA FORMATAÇÃO DA RENDA
  const formatarValorRenda = (value) => {
    if (!value) return '';
    
    // Remove tudo que não é número
    const numero = value.toString().replace(/\D/g, '');
    
    if (!numero) return '';
    
    // Converte para formato de centavos
    const valorEmCentavos = parseInt(numero, 10);
    
    // Converte para formato decimal
    const valorDecimal = valorEmCentavos / 100;
    
    // Formata para o padrão brasileiro
    return valorDecimal.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // ✅ FUNÇÃO PARA ENVIAR DATA EXATAMENTE COMO DIGITADA (YYYY-MM-DD)
  const formatDateForSend = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.slice(0, 10);
  };

  // ✅ FUNÇÃO PARA CONVERTER VALOR FORMATADO PARA ENVIO
  const converterRendaParaEnvio = (valorFormatado) => {
    if (!valorFormatado) return '';
    // Remove tudo que não é número
    const numero = valorFormatado.toString().replace(/\D/g, '');
    if (!numero) return '';
    // Converte para formato de centavos
    const valorEmCentavos = parseInt(numero, 10);
    // Converte para formato decimal
    const valorDecimal = valorEmCentavos / 100;
    // Formata para o padrão brasileiro
    return valorDecimal.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Token de autenticação não encontrado.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("nome", nome.toUpperCase());
    formData.append("email", email.toUpperCase());
    formData.append("telefone", telefone);
    formData.append("cpf", cpf);
    
    // ✅ CORRIGIR O ENVIO DO VALOR DA RENDA - ENVIAR COMO STRING FORMATADA
    const rendaFormatada = converterRendaParaEnvio(valorRenda);
    formData.append("valor_renda", rendaFormatada);
    
    formData.append("estado_civil", estadoCivil.toUpperCase());
    formData.append("naturalidade", naturalidade.toUpperCase());
    formData.append("profissao", profissao.toUpperCase());
    // formatDateForSend já está definida no escopo do componente, não precisa redeclarar aqui

    formData.append("data_nascimento", formatDateForSend(dataNascimento));
    // ✅ ENVIAR DATA DE CRIAÇÃO PERSONALIZADA
    formData.append("data_criacao", formatDateForSend(dataCriacao));
    formData.append("renda_tipo", rendaTipo.toUpperCase());
    formData.append(
      "possui_carteira_mais_tres_anos",
      possui_carteira_mais_tres_anos === "sim" ? 1 : 0
    );
    formData.append("numero_pis", numeroPis);
    formData.append("possui_dependente", possuiDependente === "sim" ? 1 : 0);
    formData.append("qtd_dependentes", qtdDependentes);
    formData.append("nome_dependentes", nomeDependentes);
    formData.append("observacoes", observacoes);

    // Só envia data_admissao se for formal ou mista e estiver preenchida
    if ((rendaTipo === "formal" || rendaTipo === "mista") && dataAdmissao) {
      formData.append("data_admissao", formatDateForSend(dataAdmissao));
    } else {
      formData.append("data_admissao", "");
    }

    documentosPessoais.forEach((file) => {
      formData.append("documentosPessoais", file);
    });

    extratoBancario.forEach((file) => {
      formData.append("extratoBancario", file);
    });

    documentosDependente.forEach((file) => {
      formData.append("documentosDependente", file);
    });


    documentosConjuge.forEach((file) => {
      formData.append("documentosConjuge", file);
    });

    // Enviar dados do cônjuge se marcado
    if (estadoCivil === "casado" && cadastrarConjuge) {
      formData.append("conjuge_nome", conjugeNome.toUpperCase());
      formData.append("conjuge_email", conjugeEmail.toUpperCase());
      formData.append("conjuge_telefone", conjugeTelefone);
      formData.append("conjuge_cpf", conjugeCpf);
      formData.append("conjuge_profissao", conjugeProfissao.toUpperCase());
      formData.append("conjuge_data_nascimento", formatDateForSend(conjugeDataNascimento));
      formData.append("conjuge_valor_renda", converterRendaParaEnvio(conjugeValorRenda));
      formData.append("conjuge_renda_tipo", conjugeRendaTipo.toUpperCase());
      formData.append("conjuge_data_admissao", formatDateForSend(conjugeDataAdmissao));
    }

    // Adicione o userId se for admin/correspondente e selecionou
    if (
      (user?.is_administrador || user?.is_correspondente) &&
      vincularUsuario &&
      userId
    ) {
      formData.append("userId", userId);
    }

    try {
      const response = await axios.post(`${API_URL}/clientes`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log('✅ Cliente cadastrado:', response.data);
      setMessage("Cliente cadastrado com sucesso!");
      toast.success("Cliente cadastrado com sucesso!");
      // Reset form
      setNome("");
      setEmail("");
      setTelefone("");
      setCpf("");
      setValorRenda("");
      setProfissao("");
      setDataNascimento("");
      setDataCriacao(new Date().toISOString().split('T')[0]);
      setObservacoes("");
      if (onSuccess) onSuccess();
      // Limpar campos do cônjuge
      setCadastrarConjuge(false);
      setConjugeNome("");
      setConjugeEmail("");
      setConjugeTelefone("");
      setConjugeCpf("");
      setConjugeProfissao("");
      setConjugeDataNascimento("");
      setConjugeValorRenda("");
      setConjugeRendaTipo("");
      setConjugeDataAdmissao("");
    } catch (error) {
      console.error("Erro ao cadastrar cliente:", error);
      let msg = "Erro ao adicionar cliente.";
      if (error.response && error.response.data && error.response.data.message) {
        msg = error.response.data.message;
      } else if (error.message) {
        msg = error.message;
      }
      setMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Buscar lista de usuários se for admin ou correspondente
  useEffect(() => {
    if (user?.is_administrador || user?.is_correspondente) {
      axios.get(`${API_URL}/user`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` }
      })
      .then(res => {
        if (Array.isArray(res.data.users)) setUsuarios(res.data.users);
        else if (Array.isArray(res.data)) setUsuarios(res.data);
        else setUsuarios([]);
      })
      .catch(() => setUsuarios([]));
    }
  }, [user]);

  return (
    <div className="min-h-screen w-full bg-caixa-primary flex flex-col">
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      {/* Container principal com largura máxima expandida */}
      <div className="flex-1 w-full px-4 py-6 md:px-6 lg:px-8 xl:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center gap-3 tracking-tight">
            <FaFileAlt className="w-6 h-6 md:w-8 md:h-8 text-caixa-orange" />
            Cadastro de Cliente
          </h2>
          <p className="text-white text-base md:text-lg font-medium">
            Preencha os campos abaixo com atenção. Todos os dados são importantes para o cadastro e análise do cliente.
          </p>
        </motion.div>

        {/* Formulário expandido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-4 md:p-6 lg:p-8 border border-caixa-primary/20 w-full"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Grid de campos principais - mais colunas em telas grandes */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {/* Nome */}
              <div className="xl:col-span-2">
                <label htmlFor="nome" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaUser className="w-4 h-4 text-caixa-orange" />
                  Nome completo do cliente *
                </label>
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  placeholder="Ex: MARIA DA SILVA"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaEnvelope className="w-4 h-4 text-caixa-orange" />
                  E-mail para contato *
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  placeholder="Ex: MARIA@EMAIL.COM"
                  required
                />
              </div>

              {/* Telefone */}
              <div>
                <label htmlFor="telefone" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaPhone className="w-4 h-4 text-caixa-orange" />
                  Telefone celular *
                </label>
                <InputMask
                  id="telefone"
                  mask="(99) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>

              {/* CPF */}
              <div>
                <label htmlFor="cpf" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaIdCard className="w-4 h-4 text-caixa-orange" />
                  CPF do cliente *
                </label>
                <InputMask
                  id="cpf"
                  mask="999.999.999-99"
                  value={cpf}

                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  placeholder="000.000.000-00"
                  required
                />
              </div>

              {/* ✅ VALOR DA RENDA CORRIGIDO */}
              <div>
                <label htmlFor="valorRenda" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaWallet className="w-4 h-4 text-caixa-orange" />
                  Valor da renda mensal *
                </label>
                <input
                  id="valorRenda"
                  type="text"
                  value={formatarValorRenda(valorRenda)}
                  onChange={(e) => {
                    // Remove formatação e mantém apenas números
                    const value = e.target.value.replace(/\D/g, "");
                    setValorRenda(value);
                  }}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  placeholder="Ex: 2.000,00"
                  required
                />
                <small className="text-caixa-primary/70 text-xs">
                  Digite apenas números. Ex: para R$ 2.000,00 digite "200000"
                </small>
              </div>
            </div>

            {/* Segunda linha de campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {/* Estado Civil */}
              <div>
                <label htmlFor="estadoCivil" className="block text-sm font-medium text-caixa-primary mb-2">
                  Estado civil *
                </label>
                <select
                  id="estadoCivil"
                  value={estadoCivil}
                  onChange={(e) => setEstadoCivil(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                >
                  <option value="solteiro">Solteiro(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="divorciado">Divorciado(a)</option>
                  <option value="viuvo">Viúvo(a)</option>
                </select>
              </div>

              {/* Estado */}
              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-caixa-primary mb-2">
                  Estado *
                </label>
                <select
                  id="estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  required
                >
                  <option value="">Selecione</option>
                  {estados.map((est) => (
                    <option key={est.id} value={est.sigla}>
                      {est.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Naturalidade */}
              <div>
                <label htmlFor="naturalidade" className="block text-sm font-medium text-caixa-primary mb-2">
                  Cidade *
                </label>
                <select
                  id="naturalidade"
                  value={naturalidade}
                  onChange={(e) => setNaturalidade(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  required
                >
                  <option value="">Selecione</option>
                  {municipios.map((municipio) => (
                    <option key={municipio.id} value={`${municipio.nome} - ${estado}`}>
                      {municipio.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Renda */}
              <div>
                <label htmlFor="rendaTipo" className="block text-sm font-medium text-caixa-primary mb-2">
                  Tipo de renda *
                </label>
                <select
                  id="rendaTipo"
                  value={rendaTipo}
                  onChange={(e) => setRendaTipo(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                >
                  <option value="">Selecione</option>
                  <option value="formal">Formal</option>
                  <option value="informal">Informal</option>
                  <option value="mista">Mista</option>
                </select>
              </div>
            </div>

            {/* Terceira linha com datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {/* Profissão */}
              <div>
                <label htmlFor="profissao" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaBriefcase className="w-4 h-4 text-caixa-orange" />
                  Profissão atual *
                </label>
                <input
                  id="profissao"
                  type="text"
                  value={profissao}
                  onChange={(e) => setProfissao(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  placeholder="Ex: GERENTE DE VENDAS"
                  required
                />
              </div>

              {/* Data de Nascimento */}
              <div>
                <label htmlFor="dataNascimento" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaCalendarAlt className="w-4 h-4 text-caixa-orange" />
                  Data de nascimento *
                </label>
                <input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  required
                />
              </div>

              {/* ✅ NOVO CAMPO: DATA DE CRIAÇÃO */}
              <div>
                <label htmlFor="dataCriacao" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                  <FaClock className="w-4 h-4 text-caixa-orange" />
                  Data de criação do cadastro *
                </label>
                <input
                  id="dataCriacao"
                  type="date"
                  value={dataCriacao}
                  onChange={(e) => setDataCriacao(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  required
                />
                <small className="text-caixa-primary/70 text-xs">
                  Data em que o cliente foi cadastrado no sistema
                </small>
              </div>

              {/* Data de Admissão */}
              {(rendaTipo === "formal" || rendaTipo === "mista") && (
                <div>
                  <label htmlFor="dataAdmissao" className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                    <FaCalendarAlt className="w-4 h-4 text-caixa-orange" />
                    Data de admissão
                  </label>
                  <input
                    id="dataAdmissao"
                    type="date"
                    value={dataAdmissao}
                    onChange={(e) => setDataAdmissao(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  />
                </div>
              )}
            </div>

            {/* Seção PIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label htmlFor="possuiCarteira" className="block text-sm font-medium text-caixa-primary mb-2">
                  Possui carteira há mais de 3 anos? *
                </label>
                <select
                  id="possuiCarteira"
                  value={possui_carteira_mais_tres_anos}
                  onChange={(e) => setPossuiCarteiraMaisTresAnos(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                >
                  <option value="">Selecione</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>

              {possui_carteira_mais_tres_anos === "sim" && (
                <div>
                  <label htmlFor="numeroPis" className="block text-sm font-medium text-caixa-primary mb-2">
                    Número do PIS
                  </label>
                  <input
                    id="numeroPis"
                    type="text"
                    value={numeroPis}
                    onChange={(e) => setNumeroPis(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                    placeholder="Ex: 123.45678.90-1"
                  />
                </div>
              )}
            </div>

            {/* Seção Dependentes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div>
                <label htmlFor="possuiDependente" className="block text-sm font-medium text-caixa-primary mb-2">
                  Possui dependente(s)? *
                </label>
                <select
                  id="possuiDependente"
                  value={possuiDependente}
                  onChange={(e) => setPossuiDependente(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                >
                  <option value="">Selecione</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>
              
            </div>

            {/* Campo para selecionar usuário responsável */}
            {(user?.is_administrador || user?.is_correspondente) && (
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="vincularUsuario"
                    checked={vincularUsuario}
                    onChange={e => setVincularUsuario(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="vincularUsuario" className="text-sm font-medium text-caixa-primary">
                    Vincular cliente a outro usuário
                  </label>
                </div>
                <select
                  id="userId"
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                  disabled={!vincularUsuario}
                  required={vincularUsuario}
                >
                  <option value="">Selecione o usuário</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Seção de Cadastro de Cônjuge */}
            {estadoCivil === "casado" && (
              <div className="border-t border-caixa-primary/20 pt-6 mb-6">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="cadastrarConjuge"
                    checked={cadastrarConjuge}
                    onChange={e => setCadastrarConjuge(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="cadastrarConjuge" className="text-sm font-medium text-caixa-primary">
                    Cadastrar cônjuge junto ao cliente
                  </label>
                </div>
                {cadastrarConjuge && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                        <FaUser className="w-4 h-4 text-caixa-orange" />
                        Nome completo do cônjuge
                      </label>
                      <input
                        type="text"
                        value={conjugeNome}
                        onChange={e => setConjugeNome(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                        placeholder="Ex: JOÃO DA SILVA"
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                        <FaEnvelope className="w-4 h-4 text-caixa-orange" />
                        E-mail do cônjuge
                      </label>
                      <input
                        type="email"
                        value={conjugeEmail}
                        onChange={e => setConjugeEmail(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                        placeholder="Ex: JOAO@EMAIL.COM"
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                        <FaPhone className="w-4 h-4 text-caixa-orange" />
                        Telefone do cônjuge
                      </label>
                      <InputMask
                        mask="(99) 99999-9999"
                        value={conjugeTelefone}
                        onChange={e => setConjugeTelefone(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                        placeholder="(00) 00000-0000"
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                        <FaIdCard className="w-4 h-4 text-caixa-orange" />
                        CPF do cônjuge
                      </label>
                      <InputMask
                        mask="999.999.999-99"
                        value={conjugeCpf}
                        onChange={e => setConjugeCpf(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                        placeholder="000.000.000-00"
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                        <FaBriefcase className="w-4 h-4 text-caixa-orange" />
                        Profissão do cônjuge
                      </label>
                      <input
                        type="text"
                        value={conjugeProfissao}
                        onChange={e => setConjugeProfissao(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                        placeholder="Ex: ENGENHEIRO"
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                        <FaCalendarAlt className="w-4 h-4 text-caixa-orange" />
                        Data de nascimento do cônjuge
                      </label>
                      <input
                        type="date"
                        value={conjugeDataNascimento}
                        onChange={e => setConjugeDataNascimento(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                        <FaWallet className="w-4 h-4 text-caixa-orange" />
                        Valor da renda do cônjuge
                      </label>
                      <input
                        type="text"
                        value={formatarValorRenda(conjugeValorRenda)}
                        onChange={e => setConjugeValorRenda(e.target.value.replace(/\D/g, ""))}
                        className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                        placeholder="Ex: 2.000,00"
                        required
                      />
                      <small className="text-caixa-primary/70 text-xs">
                        Digite apenas números. Ex: para R$ 2.000,00 digite "200000"
                      </small>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-caixa-primary mb-2">
                        Tipo de renda do cônjuge
                      </label>
                      <select
                        value={conjugeRendaTipo}
                        onChange={e => setConjugeRendaTipo(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                        required
                      >
                        <option value="">Selecione</option>
                        <option value="formal">Formal</option>
                        <option value="informal">Informal</option>
                        <option value="mista">Mista</option>
                      </select>
                    </div>
                    {(conjugeRendaTipo === "formal" || conjugeRendaTipo === "mista") && (
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                          <FaCalendarAlt className="w-4 h-4 text-caixa-orange" />
                          Data de admissão do cônjuge
                        </label>
                        <input
                          type="date"
                          value={conjugeDataAdmissao}
                          onChange={e => setConjugeDataAdmissao(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Seção de Upload de Documentos */}
            <div className="border-t border-caixa-primary/20 pt-6">
              <h3 className="text-xl font-bold text-caixa-primary mb-6 flex items-center gap-2">
                <FaUpload className="w-5 h-5 text-caixa-orange" />
                Upload de Documentos
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                {/* Documentos Pessoais */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                    <FaFileAlt className="w-4 h-4 text-caixa-orange" />
                    Documentos pessoais
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setDocumentosPessoais(Array.from(e.target.files))}
                    className="w-full px-3 py-2 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-caixa-orange file:text-white hover:file:bg-caixa-orange/90"
                  />
                </div>

                {/* Extrato Bancário */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                    <FaFileAlt className="w-4 h-4 text-caixa-orange" />
                    Extrato bancário / Contra Cheque
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setExtratoBancario(Array.from(e.target.files))}
                    className="w-full px-3 py-2 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-caixa-orange file:text-white hover:file:bg-caixa-orange/90"
                  />
                </div>

                {/* Documentos do Dependente */}
                {possuiDependente === "sim" && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                      <FaFileAlt className="w-4 h-4 text-caixa-orange" />
                      Docs dependentes
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setDocumentosDependente(Array.from(e.target.files))}
                      className="w-full px-3 py-2 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-caixa-orange file:text-white hover:file:bg-caixa-orange/90"
                    />
                  </div>
                )}

                {/* Documentos do Cônjuge */}
                {estadoCivil === "casado" && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
                      <FaFileAlt className="w-4 h-4 text-caixa-orange" />
                      Docs cônjuge
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setDocumentosConjuge(Array.from(e.target.files))}
                      className="w-full px-3 py-2 border-2 border-caixa-primary/30 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-caixa-orange file:text-white hover:file:bg-caixa-orange/90"
                    />
                  </div>
                )}
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
                    Enviando...
                  </>
                ) : (
                  <>
                    <FaSave className="w-5 h-5" />
                    Cadastrar Cliente
                  </>
                )}
              </motion.button>
            </div>

            {/* Mensagem de status */}
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl text-center font-semibold text-lg ${
                  message.includes("sucesso")
                    ? "bg-green-100 border border-green-300 text-green-700"
                    : "bg-red-100 border border-red-300 text-red-700"
                }`}
              >
                {message}
              </motion.div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default ClientForm;
