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
      <AddAluguelForm onSuccess={handleSuccess} />
    </MainLayout>
  );
};

export default AddAluguelPage;
