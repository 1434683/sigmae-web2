import React, { createContext, useContext, useMemo, useState, useCallback, ReactNode, useEffect } from 'react';
import { User, UserRole, Policial } from '../types';
import { api } from './api';

type AuthContextType = {
  isAuthenticated: boolean;
  currentUser: User | null;
  role: UserRole | null;
  loginByRE: (reSemDigito: string, senha:string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  grantAccess: (policial: Policial, senha: string, role: UserRole, adminPassword?: string) => Promise<{ ok: boolean; error?: string }>;
  resetPassword: (policialId: number, novaSenha: string) => Promise<{ ok: boolean; error?: string }>;
  revokeAccess: (policialId: number) => Promise<{ ok: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
        const item = window.localStorage.getItem('currentUser');
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error("Falha ao carregar usuário do localStorage", error);
        return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
        window.localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
        window.localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const role = currentUser?.role ?? null;
  const isAuthenticated = !!currentUser;

  const loginByRE = useCallback(async (reSemDigito: string, senha: string): Promise<{ ok: boolean; error?: string }> => {
    const reNorm = (reSemDigito || '').replace(/\D/g, '');
    if (reNorm.length < 3) return { ok: false, error: 'RE inválido' };
    if (!senha || senha.trim().length < 3) return { ok: false, error: 'Senha inválida' };
    
    try {
        const user = await api.login(reNorm, senha);
        // Fix: Explicitly cast the 'user' object to the 'User' type to resolve the 'unknown' type error.
        setCurrentUser(user as User);
        return { ok: true };
    } catch (error: any) {
        return { ok: false, error: error.message };
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const grantAccess = useCallback(async (policial: Policial, senha: string, role: UserRole = 'SUBORDINADO', adminPassword?: string): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'ADMIN') return { ok: false, error: 'Apenas ADMIN pode conceder acesso' };
    
    try {
        await api.grantAccess(policial, senha, role, adminPassword, currentUser);
        return { ok: true };
    } catch (error: any) {
        return { ok: false, error: error.message };
    }
  }, [currentUser]);

  const resetPassword = useCallback(async (policialId: number, novaSenha: string): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'ADMIN') return { ok: false, error: 'Apenas ADMIN pode resetar senha' };
    
    try {
        await api.resetPassword(policialId, novaSenha);
        return { ok: true };
    } catch (error: any) {
        return { ok: false, error: error.message };
    }
  }, [currentUser]);

  const revokeAccess = useCallback(async (policialId: number): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'ADMIN') return { ok: false, error: 'Apenas ADMIN pode revogar acesso' };

    try {
        await api.revokeAccess(policialId);
        return { ok: true };
    } catch (error: any) {
        return { ok: false, error: error.message };
    }
  }, [currentUser]);

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated,
    currentUser,
    role,
    loginByRE,
    logout,
    grantAccess,
    resetPassword,
    revokeAccess
  }), [isAuthenticated, currentUser, role, loginByRE, logout, grantAccess, resetPassword, revokeAccess]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
