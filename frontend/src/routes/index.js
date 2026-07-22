// Centralização das rotas do sistema
import laudosRoute from './laudos';
import financeiroRoutes from './financeiro';
// Importe outras rotas de módulos aqui

const routes = [
  laudosRoute,
  ...financeiroRoutes,
  // ...outras rotas
];

export default routes;
