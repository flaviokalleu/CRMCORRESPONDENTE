// src/pages/ClienteAluguelPage.jsx
import React from "react";
import MainLayout from "../layouts/MainLayout"; // Certifique-se de que o caminho está correto
import ClienteAluguel from "../components/Aluguel"; // Certifique-se de que o caminho está correto

const ClienteAluguelPage = () => {
  return (
    <MainLayout>
      <ClienteAluguel />
    </MainLayout>
  );
};

export default ClienteAluguelPage;
