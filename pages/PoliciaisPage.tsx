import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Policial, User, UserRole } from '../types';
import { POSTOS_GRADS } from '../constants';
import Modal from '../components/Modal';

declare var XLSX: any;

const Toast: React.FC<{ message: string; type?: 'success' | 'error' }> = ({ message, type = 'success' }) => {
  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div className={`fixed top-20 right-8 text-white py-3 px-5 rounded-lg shadow-xl z-50 flex items-center transition-opacity duration-300 ${bgColor} ${visible ? 'opacity-100' : 'opacity-0'}`} role="alert" aria-live="assertive">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
      <span>{message}</span>
    </div>
  );
};

const AccessControlModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  policial: Policial | null;
  mode: 'grant' | 'reset';
}> = ({ isOpen, onClose, policial, mode }) => {
  const { grantAccess, resetPassword } = useAuth();
  const [senha, setSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [role, setRole] = useState<UserRole>('SUBORDINADO');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSenha('');
      setConfirmSenha('');
      setRole('SUBORDINADO');
      setAdminPassword('');
      setError('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    setError('');
    if (senha.length < 3) { setError('A senha deve ter pelo menos 3 caracteres.'); return; }
    if (senha !== confirmSenha) { setError('As senhas não coincidem.'); return; }
    if (!policial) return;

    const result = mode === 'grant' 
      ? await grantAccess(policial, senha, role, adminPassword)
      : await resetPassword(policial.id, senha);

    if (result.ok) {
      onClose();
    } else {
      setError(result.error || 'Ocorreu um erro.');
    }
  };

  if (!policial) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'grant' ? 'Conceder Acesso' : 'Resetar Senha'}>
      <div className="space-y-4">
        <p className="text-sm">Policial: <strong>{policial.nome}</strong></p>
        {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded-md">{error}</p>}
        <div><label className="block text-sm font-medium">Nova Senha</label><input type="password" value={senha} onChange={e => setSenha(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2"/></div>
        <div><label className="block text-sm font-medium">Confirmar Senha</label><input type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2"/></div>
        {mode === 'grant' && (
            <>
                <div>
                    <label className="block text-sm font-medium">Perfil de Acesso</label>
                    <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="mt-1 w-full border border-gray-300 rounded-md p-2">
                        <option value="SUBORDINADO">Subordinado</option>
                        <option value="SARGENTO">Sargento</option>
                        <option value="ADMIN">Administrador</option>
                    </select>
                </div>
                {role === 'ADMIN' && (
                    <div>
                        <label className="block text-sm font-medium text-red-700">Sua Senha de Admin (Confirmação)</label>
                        <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="mt-1 w-full border border-red-300 rounded-md p-2" required />
                        <p className="text-xs text-pm-gray-500 mt-1">Para conceder privilégios de administrador, confirme com sua própria senha.</p>
                    </div>
                )}
            </>
        )}
        <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={onClose} className="bg-pm-gray-200 hover:bg-pm-gray-300 text-pm-gray-800 font-bold py-2 px-4 rounded-md">Cancelar</button>
            <button onClick={handleSave} className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">{mode === 'grant' ? 'Conceder Acesso' : 'Salvar Nova Senha'}</button>
        </div>
      </div>
    </Modal>
  );
};

const PoliciaisPage: React.FC = () => {
    const { policiais, users, addPolicial, updatePolicial, bulkUpsertPoliciais, grupos } = useData();
    const { currentUser, revokeAccess } = useAuth();
    
    const [isModalOpen, setModalOpen] = useState(false);
    const [currentPolicial, setCurrentPolicial] = useState<Partial<Policial> | null>(null);
    const [isAccessModalOpen, setAccessModalOpen] = useState(false);
    const [accessModalMode, setAccessModalMode] = useState<'grant' | 'reset'>('grant');
    const [policialForAccess, setPolicialForAccess] = useState<Policial | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [filters, setFilters] = useState({ termo: '', pelotao: '', ativo: 'true' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const usersMap = useMemo(() => new Map<number, User>(
        users.filter(u => u.policialId !== null).map(u => [u.policialId!, u])
    ), [users]);

    const pelotoesOrdenados = useMemo(() => [...grupos].sort((a, b) => a.nome.localeCompare(b.nome)), [grupos]);

    const filteredPoliciais = useMemo(() => {
        const termoLower = filters.termo.toLowerCase();
        return policiais
            .filter(p => {
                const matchTermo = !filters.termo || p.nome.toLowerCase().includes(termoLower) || p.re.toLowerCase().includes(termoLower);
                const matchPelotao = !filters.pelotao || p.pelotao === filters.pelotao;
                const matchAtivo = filters.ativo === '' || p.ativo === (filters.ativo === 'true');
                return matchTermo && matchPelotao && matchAtivo;
            })
            .sort((a, b) => a.nome.localeCompare(b.nome));
    }, [policiais, filters]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const openModal = (policial: Policial | null = null) => {
        setCurrentPolicial(policial ? { ...policial } : { nome: '', re: '', postoGrad: 'Sd 2ª Cl', pelotao: '', ativo: true });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentPolicial || !currentUser) return;
        try {
            if (!currentPolicial.nome || !currentPolicial.re || !currentPolicial.postoGrad || !currentPolicial.pelotao) {
                throw new Error("Todos os campos são obrigatórios.");
            }
            if (currentPolicial.id) {
                await updatePolicial(currentPolicial as Policial, currentUser);
                setToast({ message: "Policial atualizado com sucesso!", type: 'success' });
            } else {
                await addPolicial(currentPolicial as Omit<Policial, 'id'>, currentUser);
                setToast({ message: "Policial adicionado com sucesso!", type: 'success' });
            }
            setModalOpen(false);
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        }
    };
    
    const openAccessModal = (policial: Policial, mode: 'grant' | 'reset') => {
        setPolicialForAccess(policial);
        setAccessModalMode(mode);
        setAccessModalOpen(true);
    };

    const handleRevokeAccess = async (policial: Policial) => {
        if (window.confirm(`Tem certeza que deseja REVOGAR o acesso de ${policial.nome}? O policial não poderá mais logar no sistema.`)) {
            const { ok, error } = await revokeAccess(policial.id);
            if (ok) {
                setToast({ message: "Acesso revogado com sucesso.", type: 'success' });
            } else {
                setToast({ message: error || 'Falha ao revogar acesso.', type: 'error' });
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (json.length < 2) throw new Error("A planilha está vazia ou em formato incorreto.");

                const headers = (json[0] as string[]).map(h => h.toString().trim().toUpperCase());
                const requiredHeaders = ['NOME', 'RE', 'POSTO_GRAD', 'PELOTAO'];
                if (!requiredHeaders.every(h => headers.includes(h))) {
                    throw new Error(`A planilha deve conter as colunas: ${requiredHeaders.join(', ')}`);
                }

                const policiaisParaUpsert = json.slice(1).map(row => {
                    const policialData: any = {};
                    headers.forEach((header, index) => {
                        const key = header.toLowerCase();
                        policialData[key] = row[index];
                    });
                    return {
                        nome: policialData.nome?.toString().trim(),
                        re: policialData.re?.toString().trim(),
                        postoGrad: policialData.posto_grad?.toString().trim(),
                        pelotao: policialData.pelotao?.toString().trim(),
                        ativo: true,
                    };
                }).filter(p => p.nome && p.re && p.postoGrad && p.pelotao);

                if (policiaisParaUpsert.length === 0) throw new Error("Nenhum registro válido encontrado na planilha.");

                await bulkUpsertPoliciais(policiaisParaUpsert, currentUser);
                setToast({ message: `${policiaisParaUpsert.length} policiais importados/atualizados!`, type: 'success' });

            } catch (err: any) {
                setToast({ message: err.message || 'Erro ao processar a planilha.', type: 'error' });
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const triggerImport = () => fileInputRef.current?.click();

    return (
      <div className="container mx-auto">
        {toast && <Toast message={toast.message} type={toast.type} />}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h1 className="text-3xl font-bold text-pm-gray-800">Gerenciar Policiais</h1>
            <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls"/>
                <button onClick={triggerImport} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Importar via Excel</button>
                <button onClick={() => openModal()} className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">Adicionar Policial</button>
            </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" name="termo" placeholder="Buscar por Nome ou RE..." value={filters.termo} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"/>
                <select name="pelotao" value={filters.pelotao} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"><option value="">Todos os Grupos</option>{pelotoesOrdenados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}</select>
                <select name="ativo" value={filters.ativo} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"><option value="">Todos (Ativos e Inativos)</option><option value="true">Apenas Ativos</option><option value="false">Apenas Inativos</option></select>
            </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="w-full text-sm text-left text-pm-gray-600">
                <thead className="text-xs uppercase bg-pm-gray-50"><tr><th className="px-6 py-3">Nome / RE</th><th className="px-6 py-3">Posto/Grad</th><th className="px-6 py-3">Grupo</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Acesso ao Sistema</th><th className="px-6 py-3 text-right">Ações</th></tr></thead>
                <tbody>{filteredPoliciais.map(p => {
                    const user = usersMap.get(p.id);
                    return (
                        <tr key={p.id} className="bg-white border-b hover:bg-pm-gray-50">
                            <td className="px-6 py-4 font-medium">{p.nome}<br/><span className="text-xs text-pm-gray-500">{p.re}</span></td>
                            <td className="px-6 py-4">{p.postoGrad}</td>
                            <td className="px-6 py-4">{p.pelotao}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${p.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span></td>
                            <td className="px-6 py-4">{user && user.acessoLiberado ? (<span className="text-green-700 font-semibold">{user.role}</span>) : (<span className="text-red-700">Não</span>)}</td>
                            <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                <button onClick={() => openModal(p)} className="font-medium text-pm-blue hover:underline">Editar</button>
                                {user && user.acessoLiberado ? (<><button onClick={() => openAccessModal(p, 'reset')} className="font-medium text-yellow-600 hover:underline">Resetar Senha</button><button onClick={() => handleRevokeAccess(p)} className="font-medium text-red-600 hover:underline">Revogar Acesso</button></>) : (<button onClick={() => openAccessModal(p, 'grant')} className="font-medium text-green-600 hover:underline">Conceder Acesso</button>)}
                            </td>
                        </tr>
                    );
                })}</tbody>
            </table>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={currentPolicial?.id ? 'Editar Policial' : 'Adicionar Policial'}>
            {currentPolicial && <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
                <div><label className="block text-sm">Nome Completo</label><input type="text" value={currentPolicial.nome || ''} onChange={e => setCurrentPolicial(p => ({...p, nome: e.target.value.toUpperCase()}))} className="mt-1 w-full border rounded-md p-2" required /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm">RE</label><input type="text" value={currentPolicial.re || ''} onChange={e => setCurrentPolicial(p => ({...p, re: e.target.value}))} className="mt-1 w-full border rounded-md p-2" required /></div>
                    <div><label className="block text-sm">Posto/Grad</label><select value={currentPolicial.postoGrad || ''} onChange={e => setCurrentPolicial(p => ({...p, postoGrad: e.target.value}))} className="mt-1 w-full border rounded-md p-2" required>{POSTOS_GRADS.map(pg => <option key={pg} value={pg}>{pg}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm">Grupo/Pelotão</label><select value={currentPolicial.pelotao || ''} onChange={e => setCurrentPolicial(p => ({...p, pelotao: e.target.value}))} className="mt-1 w-full border rounded-md p-2" required><option value="" disabled>Selecione...</option>{pelotoesOrdenados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}</select></div>
                    <div><label className="block text-sm">Status</label><select value={currentPolicial.ativo ? 'true' : 'false'} onChange={e => setCurrentPolicial(p => ({...p, ativo: e.target.value === 'true'}))} className="mt-1 w-full border rounded-md p-2" required><option value="true">Ativo</option><option value="false">Inativo</option></select></div>
                </div>
                <div className="flex justify-end pt-4"><button type="submit" className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">Salvar</button></div>
            </form>}
        </Modal>

        <AccessControlModal isOpen={isAccessModalOpen} onClose={() => setAccessModalOpen(false)} policial={policialForAccess} mode={accessModalMode}/>

      </div>
    );
};

export default PoliciaisPage;