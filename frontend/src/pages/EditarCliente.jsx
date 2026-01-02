import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import EditarCliente from "../components/EditarCliente";

const EditarClientePage = () => {
  const { id } = useParams(); // Obtém o ID do cliente da URL
  const navigate = useNavigate(); // Hook para navegação

  // Função para lidar com o salvamento dos dados
  const handleSave = () => {
    // Aqui você pode adicionar a lógica que deseja executar após salvar o cliente
    alert("Cliente salvo com sucesso!");
    navigate("/clientes"); // Redireciona para a lista de clientes ou outra página
  };

  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Editar Cliente</h1>
        <EditarCliente clienteId={id} onSave={handleSave} />
      </div>
    </MainLayout>
  );
};

export default EditarClientePage;
