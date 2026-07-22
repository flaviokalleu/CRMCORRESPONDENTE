import React, { useEffect, useState } from 'react';
import DashboardFinanceiro from '../../components/financeiro/DashboardFinanceiro';
import api from '../../services/api';
import MainLayout from '../../layouts/MainLayout';

const DashboardPage = () => {
  const [resumo, setResumo] = useState({});

  useEffect(() => {
    const fetchResumo = async () => {
      const { data } = await api.get('/fluxocaixa/dashboard');
      setResumo(data);
    };
    fetchResumo();
  }, []);

  return (
    <MainLayout>
      {/* DashboardFinanceiro já ocupa tela cheia, não precisa de container extra */}
      <DashboardFinanceiro resumo={resumo} />
    </MainLayout>
  );
};

export default DashboardPage;
