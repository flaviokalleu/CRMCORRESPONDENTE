import React from "react";
import AddAluguelForm from "../components/AddAluguelForm";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

const AddAluguelPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Navega de volta para a página de lista de aluguéis após adicionar com sucesso
    navigate("/alugueis");
  };

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold mb-4">Adicionar Novo Aluguel</h1>
      <AddAluguelForm onSuccess={handleSuccess} />
    </MainLayout>
  );
};

export default AddAluguelPage;
