import React, { createContext, useContext, useMemo, useState, useCallback, ReactNode, useEffect } from 'react';
import { User, UserRole, Policial } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

type AuthContextType = {
  isAuthenticated: boolean;
  currentUser: User | null;
  role: UserRole | null;
  loginByRE: (reSemDigito: string, senha:string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  grantAccess: (policial: Policial, senha: string, role: UserRole, adminPassword?: string) => Promise<{ ok: boolean; error?: string }>;
  resetPassword: (policialId: string, novaSenha: string) => Promise<{ ok: boolean; error?: string }>;
  revokeAccess: (policialId: string) => Promise<{ ok: boolean; error?: string }>;
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
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("reLogin", "==", reNorm));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { ok: false, error: "Usuário não encontrado." };
        }
        
        const userDoc = querySnapshot.docs[0];
        const user = { id: userDoc.id, ...userDoc.data() } as User;

        if (user.senha !== senha) {
            return { ok: false, error: "Senha incorreta." };
        }

        if (!user.acessoLiberado) {
            return { ok: false, error: "Acesso não liberado pelo administrador." };
        }

        setCurrentUser(user);
        return { ok: true };
    } catch (error: any) {
        console.error("Erro no login:", error);
        return { ok: false, error: "Ocorreu um erro ao tentar fazer login." };
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const grantAccess = useCallback(async (policial: Policial, senha: string, role: UserRole = 'SUBORDINADO', adminPassword?: string): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'ADMIN') return { ok: false, error: 'Apenas ADMIN pode conceder acesso' };
    if (role === 'ADMIN' && adminPassword !== currentUser.senha) return { ok: false, error: 'Senha de administrador incorreta para confirmar a operação.' };

    try {
        const reLogin = (policial.re || '').split('-')[0].replace(/\D/g, '');
        const userRef = doc(db, "users", policial.id);

        const userData: Partial<User> = {
            policialId: policial.id,
            nome: policial.nome,
            reLogin: reLogin,
            role: role,
            acessoLiberado: true,
            senha: senha,
            ativo: true,
            atualizadoEm: new Date().toISOString(),
            pelotao: policial.pelotao,
            postoGrad: policial.postoGrad,
        };

        // Use setDoc com merge: true para criar ou atualizar o documento
        await setDoc(userRef, userData, { merge: true });
        
        return { ok: true };
    } catch (error: any) {
        console.error("Erro ao conceder acesso:", error);
        return { ok: false, error: "Falha ao salvar dados no Firestore." };
    }
  }, [currentUser]);

  const resetPassword = useCallback(async (policialId: string, novaSenha: string): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'ADMIN') return { ok: false, error: 'Apenas ADMIN pode resetar senha' };
    
    try {
        const userRef = doc(db, "users", policialId);
        await updateDoc(userRef, {
            senha: novaSenha,
            acessoLiberado: true,
            atualizadoEm: new Date().toISOString()
        });
        return { ok: true };
    } catch (error: any) {
         console.error("Erro ao resetar senha:", error);
        return { ok: false, error: "Falha ao atualizar senha no Firestore." };
    }
  }, [currentUser]);

  const revokeAccess = useCallback(async (policialId: string): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'ADMIN') return { ok: false, error: 'Apenas ADMIN pode revogar acesso' };

    try {
        const userRef = doc(db, "users", policialId);
        await updateDoc(userRef, {
            acessoLiberado: false,
            atualizadoEm: new Date().toISOString()
        });
        return { ok: true };
    } catch (error: any) {
        console.error("Erro ao revogar acesso:", error);
        return { ok: false, error: "Falha ao revogar acesso no Firestore." };
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