import React from 'react';

const Footer = () => {
  const nomeSistema = import.meta.env.VITE_NOME_SISTEMA || 'CRM IMOB';
  return (
    <div className="text-center py-3 px-4">
      <p className="text-xs text-caixa-extra-light/50">
        &copy; {new Date().getFullYear()} {nomeSistema} — Sistema de Gestão Imobiliária
      </p>
    </div>
  );
};

export default Footer;
