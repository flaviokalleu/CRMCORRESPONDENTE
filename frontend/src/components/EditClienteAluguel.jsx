import React, { useState, useEffect } from "react";

const EditClienteAluguel = ({ isOpen, onClose, onEditCliente, cliente }) => {
  const [nome, setNome] = useState(cliente.nome);
  const [cpf, setCpf] = useState(cliente.cpf);
  const [email, setEmail] = useState(cliente.email);
  const [telefone, setTelefone] = useState(cliente.telefone);
  const [valorAluguel, setValorAluguel] = useState(cliente.valor_aluguel);
  const [percentualMulta, setPercentualMulta] = useState(cliente.percentual_multa || 0); // Novo campo para a multa

  useEffect(() => {
    setNome(cliente.nome);
    setCpf(cliente.cpf);
    setEmail(cliente.email);
    setTelefone(cliente.telefone);
    setValorAluguel(cliente.valor_aluguel);
    setPercentualMulta(cliente.percentual_multa || 0);
  }, [cliente]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedCliente = {
      ...cliente,
      nome,
      cpf,
      email,
      telefone,
      valor_aluguel: valorAluguel,
      percentual_multa: percentualMulta, // Incluindo a multa
    };
    onEditCliente(updatedCliente);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl mb-4 text-white">Editar Cliente</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300">Nome:</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-2 text-black"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">CPF:</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="w-full p-2 text-black"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 text-black"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Telefone:</label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full p-2 text-black"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Valor do Aluguel:</label>
            <input
              type="number"
              value={valorAluguel}
              onChange={(e) => setValorAluguel(e.target.value)}
              className="w-full p-2 text-black"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-300">Percentual da Multa (%):</label>
            <input
              type="number"
              value={percentualMulta}
              onChange={(e) => setPercentualMulta(e.target.value)}
              className="w-full p-2 text-black"
              required
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            Salvar
          </button>
        </form>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
          Fechar
        </button>
      </div>
    </div>
  );
};

export default EditClienteAluguel;
