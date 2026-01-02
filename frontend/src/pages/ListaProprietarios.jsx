import React from "react";
import MainLayout from "../layouts/MainLayout"; // Certifique-se de que o caminho está correto
import ListaImoveisPublico from "../components/ListaImoveisPublico"; // Atualize o caminho para ListaImoveisPublico

const PublicImoveisPage = () => {
  return (
    <MainLayout>
      <ListaImoveisPublico />
    </MainLayout>
  );
};

export default PublicImoveisPage;
