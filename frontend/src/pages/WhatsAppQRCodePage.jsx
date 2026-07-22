import React from "react";
import MainLayout from "../layouts/MainLayout"; // Certifique-se de que o caminho está correto
import WhatsAppQRCode from "../components/WhatsAppQRCode"; // Atualize o caminho para WhatsAppQRCode

const WhatsAppQRCodePage = () => {
  return (
    <MainLayout>
      <WhatsAppQRCode />
    </MainLayout>
  );
};

export default WhatsAppQRCodePage;
