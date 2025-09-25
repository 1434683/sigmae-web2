import React, { useMemo, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
);
const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);
const CalendarDaysIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path></svg>
);
const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);
const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
);
const FileTextIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);
const HelpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
);
const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);
const AwardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 17 17 23 15.79 13.88"></polyline></svg>
);

const PlaneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
    </svg>
);

const ClipboardListIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <path d="M12 11h4"></path>
    <path d="M12 16h4"></path>
    <path d="M8 11h.01"></path>
    <path d="M8 16h.01"></path>
  </svg>
);

const UserChecklistIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <polyline points="16 11 18 13 22 9"></polyline>
    </svg>
);

const BriefcaseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
);

const BarChartIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const TagIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
);

const FileSignatureIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M10 18.5v-4.5a1.5 1.5 0 0 1 3 0v4.5"></path><path d="M8 16h1.5a1.5 1.5 0 0 1 0 3H8l2 3"></path></svg>
);

const SigmaELogo: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 80 88" className="h-8 w-auto">
            <g>
                <path d="M40 0 L80 16 V56 C80 78 40 88 40 88 C40 88 0 78 0 56 V16 Z" fill="#19398A"/>
                <path d="M40 4 L76 18.4 V54.8 C76 74.8 40 84 40 84 C40 84 4 74.8 4 54.8 V18.4 Z" strokeWidth="3" stroke="white" fill="none"/>
                <text x="32" y="62" fontFamily="Verdana, sans-serif" fontSize="42" fontWeight="bold" fill="white" textAnchor="middle">Σ</text>
                <text x="55" y="48" fontFamily="Verdana, sans-serif" fontSize="22" fontWeight="bold" fill="white">E</text>
            </g>
        </svg>
    </div>
);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout, role, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const topLevelNavItems = [
    { to: '/dashboard', label: 'Página Inicial', icon: HomeIcon, roles: ['ADMIN', 'SARGENTO', 'SUBORDINADO'] },
    { to: '/calendario', label: 'Calendário Geral', icon: CalendarIcon, roles: ['ADMIN', 'SARGENTO', 'SUBORDINADO'] },
  ];

  const p1NavItems = [
    { to: '/folgas', label: 'Gerenciar Folgas', icon: CalendarDaysIcon, roles: ['ADMIN', 'SARGENTO', 'SUBORDINADO'] },
    { to: '/ferias', label: 'Controle de Férias', icon: PlaneIcon, roles: ['ADMIN', 'SARGENTO', 'SUBORDINADO'] },
    { to: '/protocolo', label: 'Protocolo de Docs', icon: FileSignatureIcon, roles: ['ADMIN', 'SARGENTO', 'SUBORDINADO'] },
    { to: '/policiais', label: 'Gerenciar Policiais', icon: UsersIcon, roles: ['ADMIN'] },
    { to: '/grupos', label: 'Gerenciar Grupos', icon: TagIcon, roles: ['ADMIN'] },
    { to: '/creditos', label: 'Créditos de Folga', icon: AwardIcon, roles: ['ADMIN'] },
    { to: '/historico', label: 'Histórico', icon: HistoryIcon, roles: ['ADMIN', 'SARGENTO'] },
    { to: '/relatorio', label: 'Relatório de Folgas', icon: FileTextIcon, roles: ['ADMIN', 'SARGENTO'] },
  ];

  const p3NavItems = [
    { to: '/relatorio-eap', label: 'Relatório EAP/Cursos', icon: UserChecklistIcon, roles: ['ADMIN', 'SARGENTO'] },
  ];

  const bottomNavItems = [
    { to: '/agenda', label: 'Agenda', icon: ClipboardListIcon, roles: ['ADMIN'] },
    { to: '/ajuda', label: 'Ajuda', icon: HelpIcon, roles: ['ADMIN', 'SARGENTO', 'SUBORDINADO'] },
  ];
  
  const accessibleTopLevelItems = topLevelNavItems.filter(item => role && item.roles.includes(role));
  const accessibleP1Items = p1NavItems.filter(item => role && item.roles.includes(role));
  const accessibleP3Items = p3NavItems.filter(item => role && item.roles.includes(role));
  const accessibleBottomItems = bottomNavItems.filter(item => role && item.roles.includes(role));
  
  const isP1Active = useMemo(() => p1NavItems.some(item => location.pathname.startsWith(item.to)), [location.pathname]);
  const [isP1Open, setIsP1Open] = useState(isP1Active);
  
  const isP3Active = useMemo(() => p3NavItems.some(item => location.pathname.startsWith(item.to)), [location.pathname]);
  const [isP3Open, setIsP3Open] = useState(isP3Active);

  const theme = useMemo(() => {
    switch (role) {
      case 'ADMIN':
        return {
          aside: 'bg-pm-blue-dark',
          headerText: 'text-white',
          headerBorder: 'border-pm-blue-light',
          userText: 'text-white',
          pelotaoText: 'text-pm-gray-300',
          navLinkInactive: 'text-pm-gray-100 hover:bg-pm-blue hover:text-white',
          navLinkActive: 'bg-white text-pm-blue-dark font-semibold',
          logoutButton: 'text-pm-gray-200 hover:bg-pm-blue hover:text-white',
        };
      case 'SARGENTO':
        return {
          aside: 'bg-pm-red-800',
          headerText: 'text-white',
          headerBorder: 'border-pm-red-600',
          userText: 'text-white',
          pelotaoText: 'text-pm-gray-300',
          navLinkInactive: 'text-red-100 hover:bg-pm-red-700 hover:text-white',
          navLinkActive: 'bg-white text-pm-red-800 font-semibold',
          logoutButton: 'text-pm-gray-200 hover:bg-pm-red-700 hover:text-white',
        };
      case 'SUBORDINADO':
      default:
        return {
          aside: 'bg-pm-gray-900',
          headerText: 'text-white',
          headerBorder: 'border-b border-pm-gray-700',
          userText: 'text-white',
          pelotaoText: 'text-pm-gray-400',
          navLinkInactive: 'text-pm-gray-200 hover:bg-pm-gray-700 hover:text-white',
          navLinkActive: 'bg-white text-pm-gray-900 font-semibold',
          logoutButton: 'text-pm-gray-300 hover:bg-pm-gray-700 hover:text-white',
        };
    }
  }, [role]);


  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive
        ? theme.navLinkActive
        : theme.navLinkInactive
    }`;
    
  const subNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm ${
      isActive
        ? theme.navLinkActive
        : theme.navLinkInactive
    }`;


  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 ${theme.aside} shadow-lg flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className={`p-6 border-b ${theme.headerBorder} relative`}>
        <button onClick={onClose} className={`absolute top-4 right-4 p-1 rounded-full ${theme.userText} md:hidden`} aria-label="Fechar menu">
            <XIcon className="h-6 w-6" />
        </button>
        <div className="flex items-center justify-center gap-2 mb-4">
            <SigmaELogo />
            <h1 className={`text-2xl font-bold ${theme.headerText}`}>SIGMA-E</h1>
        </div>
        {currentUser && (
            <div className="text-center overflow-hidden">
                <p className={`text-sm font-semibold ${theme.userText} truncate`}>
                  {currentUser.postoGrad && `${currentUser.postoGrad} `}{currentUser.nome}
                </p>
                {currentUser.pelotao && (
                  <p className={`text-xs ${theme.pelotaoText}`}>{currentUser.pelotao}</p>
                )}
            </div>
        )}
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {accessibleTopLevelItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navLinkClasses} onClick={onClose}>
                <Icon className="h-6 w-6" />
                <span className="ml-3">{label}</span>
            </NavLink>
        ))}

        {accessibleP1Items.length > 0 && (
            <div>
                <button
                    onClick={() => setIsP1Open(!isP1Open)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-200 ${isP1Active ? theme.navLinkActive : theme.navLinkInactive}`}
                    aria-expanded={isP1Open}
                >
                    <div className="flex items-center">
                        <BriefcaseIcon className="h-6 w-6" />
                        <span className="ml-3 font-medium">P-1</span>
                    </div>
                    <ChevronDownIcon className={`h-5 w-5 transform transition-transform duration-200 ${isP1Open ? 'rotate-180' : ''}`} />
                </button>
                {isP1Open && (
                    <div className="pl-4 mt-2 space-y-1">
                        {accessibleP1Items.map(({ to, label, icon: Icon }) => (
                            <NavLink key={to} to={to} className={subNavLinkClasses} onClick={onClose}>
                                <Icon className="h-5 w-5" />
                                <span className="ml-3">{label}</span>
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>
        )}
        
        {accessibleP3Items.length > 0 && (
            <div>
                <button
                    onClick={() => setIsP3Open(!isP3Open)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-200 ${isP3Active ? theme.navLinkActive : theme.navLinkInactive}`}
                    aria-expanded={isP3Open}
                >
                    <div className="flex items-center">
                        <BarChartIcon className="h-6 w-6" />
                        <span className="ml-3 font-medium">P-3</span>
                    </div>
                    <ChevronDownIcon className={`h-5 w-5 transform transition-transform duration-200 ${isP3Open ? 'rotate-180' : ''}`} />
                </button>
                {isP3Open && (
                    <div className="pl-4 mt-2 space-y-1">
                        {accessibleP3Items.map(({ to, label, icon: Icon }) => (
                            <NavLink key={to} to={to} className={subNavLinkClasses} onClick={onClose}>
                                <Icon className="h-5 w-5" />
                                <span className="ml-3">{label}</span>
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>
        )}

        {accessibleBottomItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navLinkClasses} onClick={onClose}>
                <Icon className="h-6 w-6" />
                <span className="ml-3">{label}</span>
            </NavLink>
        ))}
      </nav>
      <div className={`p-4 border-t ${theme.headerBorder}`}>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center px-4 py-3 rounded-lg ${theme.logoutButton} transition-colors duration-200`}
        >
          <LogoutIcon className="h-6 w-6" />
          <span className="ml-3 font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;