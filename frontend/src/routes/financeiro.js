import ReceitaPage from '../pages/financeiro/ReceitaPage';
import DespesaPage from '../pages/financeiro/DespesaPage';
import DashboardPage from '../pages/financeiro/DashboardPage';

const financeiroRoutes = [
  {
    path: '/financeiro/receitas',
    element: <ReceitaPage />,
  },
  {
    path: '/financeiro/despesas',
    element: <DespesaPage />,
  },
  {
    path: '/financeiro/dashboard',
    element: <DashboardPage />,
  },
];

export default financeiroRoutes;
