import React from "react";
import { FaExclamationTriangle } from "react-icons/fa"; // Ícone de alerta

const AlertVencimento = ({ clientes, onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-96 transition-transform transform hover:scale-105">
        <div className="flex items-center mb-4">
          <FaExclamationTriangle className="text-yellow-400 text-3xl mr-2 animate-bounce" />
          <h2 className="text-xl font-bold text-white">Atenção!</h2>
        </div>
        <p className="text-gray-300">Existem pagamentos a vencer em 3 dias:</p>
        <ul className="list-disc pl-5 mt-2 text-gray-200">
          {clientes.map(cliente => (
            <li key={cliente.id} className="mt-1">
              {cliente.nome} - Vencimento: {cliente.dia_vencimento}
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-4 bg-blue-600 text-white rounded-lg py-2 px-4 hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

export default AlertVencimento;
