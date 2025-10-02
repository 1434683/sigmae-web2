import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
);

// Mapeamento de rotas para nomes amigáveis para os breadcrumbs
const breadcrumbNameMap: { [key: string]: string } = {
  '/dashboard': 'Página Inicial',
  '/folgas': 'Gerenciar Folgas',
  '/ferias': 'Controle de Férias',
  '/calendario': 'Calendário Geral',
  '/protocolo': 'Protocolo de Documentos',
  '/agenda': 'Agenda',
  '/policiais': 'Gerenciar Policiais',
  '/grupos': 'Gerenciar Grupos',
  '/creditos': 'Créditos de Folga',
  '/historico': 'Histórico',
  '/relatorio': 'Relatório de Folgas',
  '/relatorio-eap': 'Relatório EAP/Cursos',
  '/ajuda': 'Ajuda',
};

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Não exibe breadcrumbs na página inicial
  if (location.pathname === '/dashboard' || location.pathname === '/') {
    return null;
  }

  return (
    <nav aria-label="breadcrumb" className="mb-6">
      <ol className="flex items-center space-x-2 text-sm text-pm-gray-500">
        <li>
          <Link to="/dashboard" className="flex items-center hover:text-pm-blue transition-colors">
            <HomeIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
            Página Inicial
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const name = breadcrumbNameMap[to];
          const isLast = index === pathnames.length - 1;

          if (!name) {
            return null; // Não renderiza breadcrumb para rotas não mapeadas
          }

          return (
            <li key={to} className="flex items-center">
              <span className="mx-2 text-pm-gray-400">/</span>
              {isLast ? (
                <span className="font-semibold text-pm-gray-700">{name}</span>
              ) : (
                <Link to={to} className="hover:text-pm-blue transition-colors">{name}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
