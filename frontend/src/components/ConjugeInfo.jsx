import React from "react";
import { FaUser, FaEnvelope, FaPhone, FaIdCard, FaCalendarAlt, FaBriefcase, FaDollarSign, FaHeart } from "react-icons/fa";
import { MdWork } from "react-icons/md";

// InfoCard deve ser importado do mesmo diretório ou ajustar o caminho conforme necessário
import InfoCard from "./InfoCard";


const hasConjugeInfo = (cliente) => {
  return !!(
    cliente?.conjuge_nome ||
    cliente?.conjuge_email ||
    cliente?.conjuge_telefone ||
    cliente?.conjuge_cpf ||
    cliente?.conjuge_profissao ||
    cliente?.conjuge_data_nascimento ||
    cliente?.conjuge_valor_renda ||
    cliente?.conjuge_renda_tipo ||
    cliente?.conjuge_data_admissao
  );
};

const ConjugeInfo = ({ cliente }) => {
  if (!hasConjugeInfo(cliente)) {
    return (
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center text-gray-300">
        <FaHeart className="w-10 h-10 mx-auto mb-4 text-pink-400 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma informação de cônjuge cadastrada</h3>
        <p>Os dados do cônjuge aparecerão aqui quando forem preenchidos.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <FaHeart className="w-5 h-5 text-pink-400" />
          Informações do Cônjuge
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard
            icon={FaUser}
            label="Nome Completo"
            value={cliente?.conjuge_nome}
            iconColor="text-pink-400"
          />
          <InfoCard
            icon={FaEnvelope}
            label="Email"
            value={cliente?.conjuge_email}
            iconColor="text-blue-400"
          />
          <InfoCard
            icon={FaPhone}
            label="Telefone"
            value={cliente?.conjuge_telefone}
            iconColor="text-green-400"
          />
          <InfoCard
            icon={FaIdCard}
            label="CPF"
            value={cliente?.conjuge_cpf}
            iconColor="text-yellow-400"
          />
          <InfoCard
            icon={FaCalendarAlt}
            label="Data de Nascimento"
            value={cliente?.conjuge_data_nascimento 
              ? (() => {
                  const d = cliente.conjuge_data_nascimento.split('-');
                  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : cliente.conjuge_data_nascimento;
                })()
              : null}
            iconColor="text-purple-400"
          />
          <InfoCard
            icon={FaBriefcase}
            label="Profissão"
            value={cliente?.conjuge_profissao}
            iconColor="text-caixa-orange"
          />
          <InfoCard
            icon={FaDollarSign}
            label="Valor da Renda"
            value={cliente?.conjuge_valor_renda ? `R$ ${cliente.conjuge_valor_renda}` : null}
            iconColor="text-green-400"
          />
          <InfoCard
            icon={MdWork}
            label="Tipo de Renda"
            value={cliente?.conjuge_renda_tipo}
            iconColor="text-teal-400"
          />
          {(cliente?.conjuge_renda_tipo === "formal" || cliente?.conjuge_renda_tipo === "mista") && (
            <InfoCard
            icon={FaCalendarAlt}
            label="Data de Admissão"
            value={cliente?.conjuge_data_admissao && !isNaN(new Date(cliente.conjuge_data_admissao).getTime())
              ? (() => {
                  const d = cliente.conjuge_data_admissao.split('-');
                  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : cliente.conjuge_data_admissao;
                })()
              : null}
            iconColor="text-cyan-400"
          />
          )}
        </div>
      </div>
    </div>
  );
};

export default ConjugeInfo;
