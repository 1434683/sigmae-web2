
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Policial, User, UserRole } from '../types';
// Fix: Removed PELOTOES from import as it's not exported from constants.ts. It will be replaced with 'grupos' from the DataContext.
import { POSTOS_GRADS } from '../constants';
import Modal from '../components/Modal';
import { useFilteredPoliciais } from '../hooks/useDataFilters';

declare var XLSX: any;

const Toast: React.FC<{ message: string; type?: 'success' | 'error' }> = ({ message, type = 'success' }) => {
  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  return (
    <div className={`fixed top-20 right-8 text-white py-3 px-5 rounded-lg shadow-xl z-50 flex items-center ${bgColor}`} role="alert" aria-live="assertive">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
      <span>{message}</span>
    </div>
  );
};

const AccessControlModal: React.FC<{
  isOpen: boolean;
  onClose: (refetch?: boolean) => void;
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
      onClose(true); // Signal refetch
    } else {
      setError(result.error || 'Ocorreu um erro.');
    }
  };

  if (!policial) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => onClose()} title={mode === 'grant' ? 'Conceder Acesso' : 'Resetar Senha'}>
      <div className="space-y-4">
        <p className="text-sm">Policial: <strong>{policial.nome}</strong></p>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div><label className="block text-sm font-medium">Nova Senha</label><input type="password" value={senha} onChange={e => setSenha(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2"/></div>
        <div><label className="block text-sm font-medium">Confirmar Senha</label><input type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2"/></div>
        {mode === 'grant' && (
            <>
                <div>
                    <label className="block text-sm font-medium">Perfil</label>
                    <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="mt-1 w-full border border-gray-300 rounded-md p-2">
                        <option value="SUBORDINADO">Subordinado</option>
                        <option value="SARGENTO">Sargento</option>
                        <option value="ADMIN">Administrador</option>
                    </select>
                </div>
                {role === 'ADMIN' && (
                    <div>
                        <label className="block text-sm font-medium text-red-700">Sua Senha de Admin (Confirmação)</label>
                        <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2" required />
                        <p className="text-xs text-pm-gray-500 mt-1">Para conceder privilégios de administrador, confirme com sua própria senha.</p>
                    </div>
                )}
            </>
        )}
        <div className="flex justify-end pt-4"><button onClick={handleSave} className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">Salvar</button></div>
      </div>
    </Modal>
  );
};

type ParsedPolicial = Omit<Policial, 'id'>;

const PoliciaisPage: React.FC = () => {
  // Fix: Added 'grupos' to the destructuring from useData to be used for pelotao selection.
  const { users, addPolicial, updatePolicial, deletePolicial, bulkUpsertPoliciais, grupos } = useData();
  const { role, revokeAccess, currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);
  const [currentPolicial, setCurrentPolicial] = useState<Partial<Policial> | null>(null);

  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedPolicial[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [accessModal, setAccessModal] = useState<{isOpen: boolean, policial: Policial | null, mode: 'grant' | 'reset'}>({isOpen: false, policial: null, mode: 'grant'});

  const pelotoesOrdenados = useMemo(() => [...grupos].sort((a, b) => a.nome.localeCompare(b.nome)), [grupos]);
  const filteredPoliciais = useFilteredPoliciais(searchTerm);

  useEffect(() => {
    if (toast) {
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [toast]);

  const usersByPolicialId = useMemo(() => {
    const map = new Map<number, User>();
    users.forEach(u => {
      if(u.policialId) map.set(u.policialId, u);
    });
    return map;
  }, [users]);

  const openModal = (policial: Partial<Policial> | null = null) => {
    setCurrentPolicial(policial ? {...policial} : { nome: "", re: "", postoGrad: "", pelotao: "", ativo: true });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentPolicial?.nome || !currentPolicial?.re || !currentPolicial?.postoGrad || !currentPolicial?.pelotao) {
      setToast({ message: "Todos os campos são obrigatórios!", type: 'error' });
      return;
    }
    if (!currentUser) return;

    try {
        if (currentPolicial.id) {
            await updatePolicial(currentPolicial as Policial, currentUser);
        } else {
            await addPolicial(currentPolicial as Omit<Policial, 'id'>, currentUser);
        }
        setToast({ message: "Policial salvo com sucesso!", type: 'success' });
        setModalOpen(false);
    } catch (error: any) {
        setToast({ message: error.message || 'Erro ao salvar policial', type: 'error' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (currentPolicial) {
      setCurrentPolicial({ ...currentPolicial, [name]: type === 'checkbox' ? checked : value });
    }
  };
  
  const handleExportXLSX = () => {
    if (filteredPoliciais.length === 0) {
      setToast({ message: "Nenhum policial para exportar na visão atual.", type: 'error' });
      return;
    }
    const data = filteredPoliciais.map(p => ({ ID: p.id, Nome: p.nome, RE: p.re, 'Posto/Grad': p.postoGrad, Pelotão: p.pelotao, Status: p.ativo ? 'ATIVO' : 'INATIVO' }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Policiais");
    XLSX.writeFile(wb, "policiais.xlsx");
    setToast({ message: "Exportação Excel iniciada!", type: 'success' });
  };
  
  const handleExportCSV = () => {
    if (filteredPoliciais.length === 0) {
      setToast({ message: "Nenhum policial para exportar na visão atual.", type: 'error' });
      return;
    }

    const headers = ['ID', 'Nome', 'RE', 'Posto/Grad', 'Pelotão', 'Status'];
    
    const escapeCsvField = (field: any): string => {
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    const csvRows = [
        headers.join(','),
        ...filteredPoliciais.map(p => [
            escapeCsvField(p.id),
            escapeCsvField(p.nome),
            escapeCsvField(p.re),
            escapeCsvField(p.postoGrad),
            escapeCsvField(p.pelotao),
            escapeCsvField(p.ativo ? 'ATIVO' : 'INATIVO')
        ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'policiais.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    setToast({ message: "Exportação CSV iniciada!", type: 'success' });
  };

  const handleRevokeAccess = async (policial: Policial) => {
    if (window.confirm(`Tem certeza que deseja revogar o acesso de ${policial.nome}?`)) {
      const { ok, error } = await revokeAccess(policial.id);
      if (ok) setToast({ message: 'Acesso revogado!', type: 'success' });
      else setToast({ message: error || 'Falha ao revogar acesso.', type: 'error' });
    }
  }

  const handleDelete = async (policial: Policial) => {
    if (!currentUser) return;
    if (window.confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o policial ${policial.nome} (RE: ${policial.re})? Esta ação não pode ser desfeita.`)) {
        await deletePolicial(policial.id, currentUser);
        setToast({ message: "Policial excluído com sucesso!", type: 'success' });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsedData([]);
    setImportError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: ["NOME", "RE", "POSTO_GRAD", "PELOTAO"], defval: "", range: 1 });
      
      const mappedData: ParsedPolicial[] = json.map((row: any, index: number) => {
        if (!row.NOME || !row.RE || !row.POSTO_GRAD || !row.PELOTAO) throw new Error(`Dados ausentes na linha ${index + 2}.`);
        return { nome: String(row.NOME).trim(), re: String(row.RE).trim(), postoGrad: String(row.POSTO_GRAD).trim(), pelotao: String(row.PELOTAO).trim(), ativo: true };
      });
      setParsedData(mappedData);
    } catch (err: any) {
      setImportError(err.message || "Falha ao ler o arquivo.");
    }
  };

  const handleConfirmImport = async () => {
      if (!currentUser || parsedData.length === 0) return;
      await bulkUpsertPoliciais(parsedData, currentUser);
      setToast({ message: `${parsedData.length} policiais importados/atualizados!`, type: 'success' });
      setImportModalOpen(false);
  };

  const buttonColor = {
      ADMIN: 'bg-pm-blue hover:bg-pm-blue-dark',
      SARGENTO: 'bg-pm-red-700 hover:bg-pm-red-800',
      SUBORDINADO: 'bg-pm-gray-800 hover:bg-pm-gray-900'
  }[role || 'ADMIN'];

  return (
    <div className="container mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-pm-gray-800">Gerenciar Policiais</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => openModal()} className={`${buttonColor} text-white font-bold py-2 px-4 rounded-md`}>Adicionar</button>
          <button onClick={() => setImportModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md">Importar</button>
          <button onClick={handleExportXLSX} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Exportar Excel</button>
          <button onClick={handleExportCSV} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md">Exportar CSV</button>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md mb-6"><input type="text" placeholder="Buscar por Nome ou RE..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-pm-gray-300 rounded-md" /></div>
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full text-sm text-left text-pm-gray-600">
          <thead className="text-xs text-pm-gray-700 uppercase bg-pm-gray-50"><tr><th scope="col" className="px-6 py-3">Nome</th><th scope="col" className="px-6 py-3">RE</th><th scope="col" className="px-6 py-3">Status</th><th scope="col" className="px-6 py-3">Acesso</th><th scope="col" className="px-6 py-3 text-right">Ações</th></tr></thead>
          <tbody>
            {filteredPoliciais.map(p => {
              const user = usersByPolicialId.get(p.id);
              return (
              <tr key={p.id} className="bg-white border-b hover:bg-pm-gray-50">
                <td className="px-6 py-4 font-medium text-pm-gray-900">{p.nome}<br/><span className="text-xs text-pm-gray-500">{p.postoGrad} - {p.pelotao}</span></td>
                <td className="px-6 py-4">{p.re}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${p.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.ativo ? 'ATIVO' : 'INATIVO'}</span></td>
                <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${user ? (user.acessoLiberado ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800') : 'bg-yellow-100 text-yellow-800'}`}>{user ? (user.acessoLiberado ? 'Liberado' : 'Revogado') : 'Não Concedido'}</span></td>
                <td className="px-6 py-4 text-right space-x-2 whitespace-rap">
                  {!user || !user.acessoLiberado ? <button onClick={() => setAccessModal({isOpen: true, policial: p, mode: 'grant'})} className="font-medium text-green-600 hover:underline">Conceder</button> : null}
                  {user ? <button onClick={() => setAccessModal({isOpen: true, policial: p, mode: 'reset'})} className="font-medium text-blue-600 hover:underline">Resetar Senha</button> : null}
                  {user && user.acessoLiberado ? <button onClick={() => handleRevokeAccess(p)} className="font-medium text-orange-600 hover:underline">Revogar</button> : null}
                  <button onClick={() => openModal(p)} className="font-medium text-pm-blue hover:underline">Editar</button>
                  <button onClick={() => handleDelete(p)} className="font-medium text-red-600 hover:underline">Excluir</button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={currentPolicial?.id ? 'Editar Policial' : 'Adicionar Policial'}>
        {currentPolicial && <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          <div><label className="block text-sm font-medium">Nome</label><input type="text" name="nome" value={currentPolicial.nome || ''} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md p-2" required/></div>
          <div><label className="block text-sm font-medium">RE</label><input type="text" name="re" value={currentPolicial.re || ''} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md p-2" required/></div>
          <div><label className="block text-sm font-medium">Posto/Grad.</label><select name="postoGrad" value={currentPolicial.postoGrad || ''} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md p-2" required><option value="">Selecione...</option>{POSTOS_GRADS.map(pg => <option key={pg} value={pg}>{pg}</option>)}</select></div>
          {/* Fix: Replaced static PELOTOES array with dynamic 'pelotoesOrdenados' from the 'grupos' state for the dropdown. */}
          <div><label className="block text-sm font-medium">Pelotão</label><select name="pelotao" value={currentPolicial.pelotao || ''} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md p-2" required><option value="">Selecione...</option>{pelotoesOrdenados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}</select></div>
          <div className="flex items-center"><input type="checkbox" id="ativo" name="ativo" checked={currentPolicial.ativo} onChange={handleChange} className="h-4 w-4"/><label htmlFor="ativo" className="ml-2 block text-sm">Ativo</label></div>
          <div className="flex justify-end pt-4"><button type="submit" className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">Salvar</button></div>
        </form>}
      </Modal>
      {accessModal.isOpen && <AccessControlModal isOpen={accessModal.isOpen} onClose={() => setAccessModal({isOpen: false, policial: null, mode: 'grant'})} policial={accessModal.policial} mode={accessModal.mode} />}
      <Modal isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)} title="Importar Efetivo">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-pm-gray-600 mb-2">Selecione um arquivo .xlsx. Colunas: <strong>NOME, RE, POSTO_GRAD, PELOTAO</strong>.</p>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="block w-full text-sm text-pm-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-pm-blue-light file:text-white hover:file:bg-pm-blue" />
          </div>
          {importError && <p className="text-red-500 text-sm p-2 bg-red-50 rounded-md">{importError}</p>}
          {parsedData.length > 0 && (
            <>
              <h3 className="text-md font-semibold">Pré-visualização ({parsedData.length} registros)</h3>
              <div className="max-h-60 overflow-y-auto border rounded-lg"><table className="w-full text-xs">
                  <thead className="bg-pm-gray-50 sticky top-0"><tr><th className="p-2">Nome</th><th className="p-2">RE</th><th className="p-2">Posto/Grad</th><th className="p-2">Pelotão</th></tr></thead>
                  <tbody>{parsedData.map((p, i) => (<tr key={i} className="border-b"><td className="p-2">{p.nome}</td><td className="p-2">{p.re}</td><td className="p-2">{p.postoGrad}</td><td className="p-2">{p.pelotao}</td></tr>))}</tbody>
              </table></div>
              <div className="flex justify-end pt-4 space-x-2">
                 <button type="button" onClick={() => setImportModalOpen(false)} className="bg-pm-gray-200 hover:bg-pm-gray-300 text-pm-gray-800 font-bold py-2 px-4 rounded-md">Cancelar</button>
                <button onClick={handleConfirmImport} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Confirmar Importação</button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PoliciaisPage;