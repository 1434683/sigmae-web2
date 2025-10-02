import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FolgasPage from './pages/FolgasPage';
import PoliciaisPage from './pages/PoliciaisPage';
import HistoricoPage from './pages/HistoricoPage';
import AjudaPage from './pages/AjudaPage';
import Layout from './components/Layout';
import CalendarioPage from './pages/CalendarioPage';
import RelatorioPage from './pages/RelatorioPage';
import CreditosPage from './pages/CreditosPage';
import FeriasPage from './pages/FeriasPage';
import AgendaPage from './pages/AgendaPage';
import RelatorioEAPPage from './pages/RelatorioEAPPage';
import GruposPage from './pages/GruposPage';
import ProtocoloPage from './pages/ProtocoloPage';
import ProtocoloPublicView from './pages/ProtocoloPublicView';

const LogoutAndRedirect: React.FC = () => {
    const { logout } = useAuth();
    useEffect(() => {
        logout();
    }, [logout]);
    return <Navigate to="/login" replace />;
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (!currentUser.acessoLiberado) {
    return <LogoutAndRedirect />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  if (role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const SargentoRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  if (role !== 'ADMIN' && role !== 'SARGENTO') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/protocolo/view/:docId" element={<ProtocoloPublicView />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="folgas" element={<FolgasPage />} />
        <Route path="ferias" element={<FeriasPage />} />
        <Route path="calendario" element={<CalendarioPage />} />
        <Route path="protocolo" element={<ProtocoloPage />} />
        <Route path="agenda" element={<AdminRoute><AgendaPage /></AdminRoute>} />
        <Route path="policiais" element={<AdminRoute><PoliciaisPage /></AdminRoute>} />
        <Route path="grupos" element={<AdminRoute><GruposPage /></AdminRoute>} />
        <Route path="creditos" element={<AdminRoute><CreditosPage /></AdminRoute>} />
        <Route path="historico" element={<SargentoRoute><HistoricoPage /></SargentoRoute>} />
        <Route path="relatorio" element={<SargentoRoute><RelatorioPage /></SargentoRoute>} />
        <Route path="relatorio-eap" element={<SargentoRoute><RelatorioEAPPage /></SargentoRoute>} />
        <Route path="ajuda" element={<AjudaPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
    </Routes>
  );
};

const AppContent: React.FC = () => {
  const { loading } = useData();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-pm-gray-100" aria-label="Carregando sistema SIGMA-E">
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-pm-blue"></div>
      </div>
    );
  }

  return <AppRoutes />;
}

const App: React.FC = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('Service Worker registrado com sucesso:', registration);
          }).catch(registrationError => {
            console.log('Falha ao registrar o Service Worker:', registrationError);
          });
      });
    }
  }, []);

  return (
    <AuthProvider>
      <DataProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
