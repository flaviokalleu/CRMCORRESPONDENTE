import React from "react";
import MainLayout from "../layouts/MainLayout"; // Certifique-se de que o caminho está correto
import AcessosListComponent from "../components/AcessosList"; // Renomeando a importação para evitar conflito

const AcessosList = () => {
  return (
    <MainLayout>
      <AcessosListComponent /> {/* Usando o nome renomeado */}
    </MainLayout>
  );
};

export default AcessosList;
