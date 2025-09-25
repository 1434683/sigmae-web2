import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Policial } from '../types';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useLeaveBalanceData } from '../hooks/useDataFilters';

const Toast: React.FC<{ message: string; type?: 'success' | 'error' }> = ({ message, type = 'success' }) => {
  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  return (
    <div className={`fixed top-20 right-8 text-white py-3 px-5 rounded-lg shadow-xl z-50 flex items-center ${bgColor}`} role="alert" aria-live="assertive">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
      <span>{message}</span>
    </div>
  );
};

const CreditosPage: React.FC = () => {
  const { leaveLedger, policiais, adminAddLeaveCredits, grupos } = useData();
  const { currentUser } = useAuth();

  const [isModalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'remove'>('add');
  const [newCredit, setNewCredit] = useState({
    policialId: '',
    year: new Date().getFullYear(),
    delta: 1,
    reason: ''
  });
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [policialSearch, setPolicialSearch] = useState('');

  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [pelotaoFilter, setPelotaoFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  
  const balanceData = useLeaveBalanceData({ yearFilter, pelotaoFilter, searchFilter });
  const pelotoesOrdenados = useMemo(() => [...grupos].sort((a, b) => a.nome.localeCompare(b.nome)), [grupos]);

  useEffect(() => {
    if (toast) {
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [toast]);

  const policiaisMap = useMemo(() => new Map<number, Policial>(policiais.map(p => [p.id, p])), [policiais]);
  const sortedLedger = useMemo(() => [...leaveLedger].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [leaveLedger]);
  const availableYears = useMemo(() => Array.from(new Set([...leaveLedger.map(l => l.year), currentYear])).sort((a, b) => b - a), [leaveLedger, currentYear]);

  const filteredPoliciaisParaSelecao = useMemo(() => {
    if (!policialSearch.trim()) return policiais.filter(p => p.ativo).sort((a,b) => a.nome.localeCompare(b.nome));
    const searchLower = policialSearch.toLowerCase();
    return policiais.filter(p => p.ativo && (p.re.toLowerCase().includes(searchLower) || p.nome.toLowerCase().includes(searchLower) || p.pelotao.toLowerCase().includes(searchLower)));
  }, [policiais, policialSearch]);
  
  const handleOpenModal = (mode: 'add' | 'remove') => {
    setModalMode(mode);
    setNewCredit({ policialId: '', year: new Date().getFullYear(), delta: mode === 'add' ? 1 : -1, reason: '' });
    setPolicialSearch('');
    setModalOpen(true);
  };

  const handleSaveCredit = async () => {
    if (!currentUser) return;
    const { policialId, year, delta, reason } = newCredit;
    if (!policialId) { setToast({ message: "Selecione um policial.", type: 'error' }); return; }
    if (!Number.isFinite(delta) || delta === 0) { setToast({ message: "Valor inválido.", type: 'error' }); return; }
    if (modalMode === 'add' && delta < 1) { setToast({ message: "Valor deve ser positivo.", type: 'error' }); return; }
    if (modalMode === 'remove' && delta > -1) { setToast({ message: "Valor deve ser negativo.", type: 'error' }); return; }

    try {
        await adminAddLeaveCredits({ policialId: Number(policialId), year, delta, reason }, currentUser);
        setToast({ message: "Operação realizada com sucesso!", type: 'success' });
        setModalOpen(false);
    } catch (error: any) {
        setToast({ message: error.message || 'Falha ao realizar a operação.', type: 'error' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCredit(prev => ({ ...prev, [name]: name === 'year' || name === 'delta' ? Number(value) : value }));
  };

  return (
    <div className="container mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-pm-gray-800">Auditoria de Créditos de Folga</h1>
        <div className="flex items-center gap-2">
            <button onClick={() => handleOpenModal('add')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Adicionar</button>
            <button onClick={() => handleOpenModal('remove')} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-md flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>Remover</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full text-sm text-left text-pm-gray-600">
          <thead className="text-xs text-pm-gray-700 uppercase bg-pm-gray-50"><tr><th scope="col" className="px-6 py-3">Data</th><th scope="col" className="px-6 py-3">Policial</th><th scope="col" className="px-6 py-3">Ano Ref.</th><th scope="col" className="px-6 py-3">Δ</th><th scope="col" className="px-6 py-3">Motivo</th><th scope="col" className="px-6 py-3">Lançado Por</th></tr></thead>
          <tbody>
            {sortedLedger.map(entry => {
              const policial = policiaisMap.get(entry.policialId);
              return (<tr key={entry.id} className="bg-white border-b hover:bg-pm-gray-50">
                  <td className="px-6 py-4">{new Date(entry.createdAt).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 font-medium">{policial ? `${policial.postoGrad} ${policial.nome}` : `ID: ${entry.policialId}`}<br/><span className="text-xs text-pm-gray-500">RE: {policial?.re || 'N/A'}</span></td>
                  <td className="px-6 py-4">{entry.year}</td>
                  <td className={`px-6 py-4 font-bold ${entry.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</td>
                  <td className="px-6 py-4">{entry.reason || '-'}</td>
                  <td className="px-6 py-4">{entry.createdByNome}</td>
              </tr>);
            })}
          </tbody>
        </table>
        {sortedLedger.length === 0 && <p className="text-center p-4 text-pm-gray-500">Nenhum lançamento encontrado.</p>}
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold text-pm-gray-800 mb-4">Saldo de Folgas do Efetivo</h2>
        <div className="bg-white p-4 rounded-lg shadow-md mb-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" placeholder="Buscar por Nome ou RE..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="w-full px-3 py-2 border rounded-md"/>
                <select value={pelotaoFilter} onChange={e => setPelotaoFilter(e.target.value)} className="w-full px-3 py-2 border rounded-md"><option value="">Todos os Grupos</option>{pelotoesOrdenados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}</select>
                <select value={yearFilter} onChange={e => setYearFilter(Number(e.target.value))} className="w-full px-3 py-2 border rounded-md">{availableYears.map(y => <option key={y} value={y}>Ano de {y}</option>)}</select>
        </div></div>
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="w-full text-sm text-left text-pm-gray-600"><thead className="text-xs uppercase bg-pm-gray-50"><tr><th className="px-6 py-3">Policial</th><th className="px-6 py-3">Grupo</th><th className="px-6 py-3 text-center">Créditos</th><th className="px-6 py-3 text-center">Usadas</th><th className="px-6 py-3 text-center">Saldo</th></tr></thead>
              <tbody>{balanceData.map(p => (<tr key={p.id} className="bg-white border-b hover:bg-pm-gray-50">
                        <td className="px-6 py-4 font-medium">{p.postoGrad} {p.nome}<br/><span className="text-xs text-pm-gray-500">RE: {p.re}</span></td>
                        <td className="px-6 py-4">{p.pelotao}</td>
                        <td className="px-6 py-4 text-center font-medium text-blue-600">{p.creditos}</td>
                        <td className="px-6 py-4 text-center font-medium text-orange-600">{p.usadas}</td>
                        <td className={`px-6 py-4 text-center font-bold text-lg ${p.saldo > 0 ? 'text-green-600' : 'text-red-600'}`}>{p.saldo}</td>
              </tr>))}</tbody>
            </table>
            {balanceData.length === 0 && <p className="text-center p-4 text-pm-gray-500">Nenhum policial encontrado.</p>}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={modalMode === 'add' ? 'Adicionar Créditos' : 'Remover/Ajustar Créditos'}>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium">Policial</label>
                <input type="text" placeholder="Buscar..." value={policialSearch} onChange={e => setPolicialSearch(e.target.value)} className="mb-2 mt-1 w-full border rounded-md p-2"/>
                <select name="policialId" value={newCredit.policialId} onChange={handleChange} className="mt-1 w-full border rounded-md p-2" required size={filteredPoliciaisParaSelecao.length > 5 ? 5 : Math.max(2, filteredPoliciaisParaSelecao.length + 1)}>
                    <option value="">Selecione...</option>
                    {filteredPoliciaisParaSelecao.map(p => <option key={p.id} value={p.id}>{p.postoGrad} {p.re} {p.nome} ({p.pelotao})</option>)}
                </select>
                {filteredPoliciaisParaSelecao.length === 0 && <p className="text-xs text-red-500 mt-1">Nenhum policial encontrado.</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm">Ano Ref.</label><input type="number" name="year" value={newCredit.year} onChange={handleChange} className="mt-1 w-full border rounded-md p-2" required /></div>
                <div><label className="block text-sm">{modalMode === 'add' ? 'Créditos a Adicionar' : 'Créditos a Remover'}</label>
                    <input type="number" name="delta" value={newCredit.delta} onChange={handleChange} className="mt-1 w-full border rounded-md p-2" required step="1" min={modalMode === 'add' ? 1 : undefined} max={modalMode === 'remove' ? -1 : undefined}/>
                     <p className="text-xs text-pm-gray-500 mt-1">{modalMode === 'add' ? 'Use um nº positivo.' : 'Use um nº negativo.'}</p>
                </div>
            </div>
            <div><label className="block text-sm">Motivo</label><textarea name="reason" value={newCredit.reason} onChange={handleChange} rows={3} className="mt-1 w-full border rounded-md p-2" placeholder="Ex: Concessão anual"></textarea></div>
            <div className="flex justify-end pt-4 space-x-2"><button type="button" onClick={() => setModalOpen(false)} className="bg-pm-gray-200 hover:bg-pm-gray-300 font-bold py-2 px-4 rounded-md">Cancelar</button><button type="button" onClick={handleSaveCredit} className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">Salvar</button></div>
        </div>
      </Modal>
    </div>
  );
};

export default CreditosPage;