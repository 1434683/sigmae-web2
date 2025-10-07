import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Ferias, FeriasStatus, Policial, StatusFolga } from '../types';
import Modal from '../components/Modal';
import { FERIAS_STATUS_COLORS, FERIAS_STATUS_LABELS } from '../constants';
import { useFilteredFerias } from '../hooks/useDataFilters';

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

const FeriasPage: React.FC = () => {
    const { ferias, policiais, addFerias, updateFerias, folgas, grupos } = useData();
    const { currentUser, role } = useAuth();

    const [filters, setFilters] = useState({ ano: new Date().getFullYear().toString(), pelotao: '', status: '' });
    const [isModalOpen, setModalOpen] = useState(false);
    const [currentFerias, setCurrentFerias] = useState<Partial<Ferias>>({});
    const [originalFerias, setOriginalFerias] = useState<Partial<Ferias> | null>(null);
    const [availableDurations, setAvailableDurations] = useState<(15|30)[]>([]);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().substring(0, 7));
    const [policialSearch, setPolicialSearch] = useState('');
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const [isRequestModalOpen, setRequestModalOpen] = useState(false);
    const [requestReason, setRequestReason] = useState('');
    const [feriasToRequest, setFeriasToRequest] = useState<Ferias | null>(null);

    const policiaisMap = useMemo(() => new Map(policiais.map(p => [p.id, p])), [policiais]);
    const filteredFerias = useFilteredFerias(filters);
    const pelotoesOrdenados = useMemo(() => [...grupos].sort((a, b) => a.nome.localeCompare(b.nome)), [grupos]);

    useEffect(() => {
        if (!isModalOpen || !currentFerias.policialId || !currentFerias.anoReferencia || currentFerias.id) return;
        // Fix: Explicitly type the `total` accumulator as a number to resolve type inference issues with the `+` operator.
        const diasJaGozados = ferias.filter(f => f.policialId === currentFerias.policialId && f.anoReferencia === currentFerias.anoReferencia && f.status === FeriasStatus.AGENDADA).reduce((total: number, f) => total + (f.duracaoDias || 0), 0);
        const options: (15|30)[] = [];
        if (diasJaGozados === 0) options.push(15, 30);
        else if (diasJaGozados === 15) options.push(15);
        setAvailableDurations(options);
        if ((options.length > 0 ? options[0] : undefined) !== currentFerias.duracaoDias) setCurrentFerias(prev => ({ ...prev, duracaoDias: options.length > 0 ? options[0] : undefined }));
    }, [isModalOpen, currentFerias.policialId, currentFerias.anoReferencia, ferias, currentFerias.id]);
    
    useEffect(() => {
        if (currentFerias?.dataInicio && currentFerias.duracaoDias) {
            const startDate = new Date(currentFerias.dataInicio + 'T12:00:00');
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + currentFerias.duracaoDias - 1);
            const endDateString = endDate.toISOString().split('T')[0];
            if (endDateString !== currentFerias.dataFim) setCurrentFerias(prev => ({...prev, dataFim: endDateString }));
        } else if (currentFerias?.dataFim) setCurrentFerias(prev => ({...prev, dataFim: '' }));
    }, [currentFerias?.dataInicio, currentFerias?.duracaoDias]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) setDropdownOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchContainerRef]);

    useEffect(() => {
        if (toast) { const timer = setTimeout(() => setToast(null), 4000); return () => clearTimeout(timer); }
    }, [toast]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const filteredPoliciaisParaSelecao = useMemo(() => {
        if (!policialSearch.trim()) return policiais.filter(p => p.ativo).sort((a,b) => a.nome.localeCompare(b.nome));
        const searchLower = policialSearch.toLowerCase();
        return policiais.filter(p => p.ativo && (p.re.toLowerCase().includes(searchLower) || p.nome.toLowerCase().includes(searchLower)));
    }, [policiais, policialSearch]);

    const openModal = (feria: Partial<Ferias> | null = null) => {
        if (feria) {
            setCurrentFerias({ ...feria });
            setOriginalFerias({ ...feria });
            const policial = policiaisMap.get(feria.policialId || '0');
            if (policial) setPolicialSearch(`${policial.postoGrad} ${policial.nome} (${policial.re})`);
        } else {
            setCurrentFerias({ policialId: undefined, anoReferencia: new Date().getFullYear(), dataInicio: '', dataFim: '', duracaoDias: undefined, status: FeriasStatus.AGENDADA, observacao: '' });
            setOriginalFerias(null);
            setAvailableDurations([]);
            setPolicialSearch('');
        }
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentFerias || !currentUser) return;
        try {
            if (!currentFerias.policialId || !currentFerias.dataInicio || !currentFerias.dataFim || !currentFerias.duracaoDias) throw new Error("Policial, data de início e duração são obrigatórios.");
            if (new Date(currentFerias.dataInicio) >= new Date(currentFerias.dataFim)) throw new Error("A data de fim deve ser posterior à data de início.");
            
            const startDate = new Date(currentFerias.dataInicio + 'T12:00:00');
            const endDate = new Date(currentFerias.dataFim + 'T12:00:00');
            const conflictingFolga = folgas.find(f => {
                if (f.policialld !== currentFerias.policialId || f.status !== StatusFolga.ATIVA) return false;
                const folgaDate = new Date(f.data + 'T12:00:00');
                return folgaDate >= startDate && folgaDate <= endDate;
            });
            if (conflictingFolga) throw new Error(`Conflito: O policial já possui uma folga ativa em ${new Date(conflictingFolga.data + 'T12:00:00').toLocaleDateString('pt-BR')}.`);

            if (currentFerias.id) {
                await updateFerias(currentFerias.id, currentFerias, currentUser);
                setToast({ message: "Férias atualizadas com sucesso!", type: 'success' });
            } else {
                await addFerias(currentFerias as Omit<Ferias, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, currentUser);
                setToast({ message: "Férias agendadas com sucesso!", type: 'success' });
            }
            setModalOpen(false);
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        }
    };

    const handleCancel = async (feria: Ferias) => {
        if (!currentUser || !window.confirm(`Tem certeza que deseja cancelar as férias de ${feria.nome}?`)) return;
        await updateFerias(feria.id, { status: FeriasStatus.CANCELADA }, currentUser);
        setToast({ message: "Férias canceladas.", type: 'success' });
    }
    
    const openRequestModal = (feria: Ferias) => {
        setFeriasToRequest(feria);
        setRequestReason('');
        setRequestModalOpen(true);
    };

    const handleConfirmRequest = async () => {
        if (!feriasToRequest || !currentUser || !requestReason.trim()) { setToast({ message: 'O motivo é obrigatório.', type: 'error' }); return; }
        const newObs = `[SOLICITAÇÃO - ${new Date().toLocaleString('pt-BR')} por ${currentUser.nome}]: ${requestReason}\n---\n${feriasToRequest.observacao || ''}`;
        await updateFerias(feriasToRequest.id, { status: FeriasStatus.SOLICITANDO_ALTERACAO, observacao: newObs }, currentUser);
        setToast({ message: "Solicitação enviada!", type: 'success' });
        setRequestModalOpen(false);
    };

    const handleClearDates = () => {
        if (originalFerias) {
            setCurrentFerias(prev => ({ ...prev, dataInicio: originalFerias.dataInicio, dataFim: originalFerias.dataFim, duracaoDias: originalFerias.duracaoDias }));
            setToast({ message: 'Datas restauradas.', type: 'success' });
        }
    };

    const handleExportReport = () => {
        const reportData = ferias.map(f => ({ ...f, ...policiaisMap.get(f.policialId) })).filter(f => {
            const start = new Date(f.dataInicio + 'T12:00:00'), end = new Date(f.dataFim + 'T12:00:00');
            const reportStart = new Date(reportMonth + '-01T12:00:00'), reportEnd = new Date(reportStart.getFullYear(), reportStart.getMonth() + 1, 0, 12, 0, 0);
            return start <= reportEnd && end >= reportStart && (!filters.pelotao || f.pelotao === filters.pelotao);
        });
        if(reportData.length === 0){ setToast({ message: "Nenhum dado para o mês selecionado.", type: 'error' }); return; }
        const title = `Relatório de Férias - ${new Date(reportMonth + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })} - Pelotão: ${filters.pelotao || 'Todos'}`;
        const headers = ["Policial", "RE", "Pelotão", "Posto/Grad", "Início", "Fim", "Duração", "Ano Ref."];
        const rows = reportData.map(f => [f.nome, f.re, f.pelotao, f.postoGrad, new Date(f.dataInicio + 'T12:00').toLocaleDateString('pt-BR'), new Date(f.dataFim + 'T12:00').toLocaleDateString('pt-BR'), f.duracaoDias, f.anoReferencia]);
        const ws = XLSX.utils.aoa_to_sheet([[title], [], headers, ...rows]);
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
        XLSX.writeFile(XLSX.utils.book_new(), `relatorio_ferias.xlsx`, { bookSST: true });
    };

    const anosDisponiveis = useMemo(() => Array.from(new Set(ferias.map(f => f.anoReferencia))).sort((a,b) => b-a), [ferias]);

    return (
        <div className="container mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} />}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-pm-gray-800">Controle de Férias</h1>
                {role === 'ADMIN' && (<button onClick={() => openModal()} className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Agendar Férias</button>)}
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md mb-6"><div className={`grid grid-cols-1 ${role === 'ADMIN' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                <select name="ano" value={filters.ano} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"><option value="">Todos Anos</option>{anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}</select>
                {role === 'ADMIN' && <select name="pelotao" value={filters.pelotao} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"><option value="">Todos os Grupos</option>{pelotoesOrdenados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}</select>}
                <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"><option value="">Todos Status</option>{Object.entries(FERIAS_STATUS_LABELS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}</select>
            </div></div>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto"><table className="w-full text-sm text-left text-pm-gray-600">
                <thead className="text-xs uppercase bg-pm-gray-50"><tr><th className="px-6 py-3">Policial</th><th className="px-6 py-3">Período</th><th className="px-6 py-3">Ano Ref.</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Ações</th></tr></thead>
                <tbody>{filteredFerias.map(f => (<tr key={f.id} className="bg-white border-b hover:bg-pm-gray-50">
                    <td className="px-6 py-4 font-medium">{f.nome}<br/><span className="text-xs text-pm-gray-500">RE: {f.re} - {f.pelotao}</span></td>
                    <td className="px-6 py-4">{new Date(f.dataInicio+'T12:00').toLocaleDateString()} a {new Date(f.dataFim+'T12:00').toLocaleDateString()}<br/><span className="text-xs text-pm-gray-500">({f.duracaoDias} dias)</span></td>
                    <td className="px-6 py-4">{f.anoReferencia}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${FERIAS_STATUS_COLORS[f.status]}`}>{FERIAS_STATUS_LABELS[f.status]}</span></td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        {role === 'ADMIN' && f.status === FeriasStatus.AGENDADA && (<><button onClick={() => openModal(f)} className="font-medium text-pm-blue hover:underline">Editar</button><button onClick={() => handleCancel(f as Ferias)} className="font-medium text-red-600 hover:underline">Cancelar</button></>)}
                        {role === 'ADMIN' && f.status === FeriasStatus.SOLICITANDO_ALTERACAO && (<button onClick={() => openModal(f)} className="font-medium text-pm-blue hover:underline animate-pulse">Revisar</button>)}
                        {(currentUser?.policialId === f.policialId || (role === 'SARGENTO' && currentUser?.pelotao === f.pelotao)) && f.status === FeriasStatus.AGENDADA && (<button onClick={() => openRequestModal(f as Ferias)} className="font-medium text-yellow-600 hover:underline">Solicitar Alteração</button>)}
                    </td>
                </tr>))}</tbody>
            </table>{filteredFerias.length === 0 && <p className="text-center p-4">Nenhum registro encontrado.</p>}</div>
            {role === 'ADMIN' && (<div className="mt-8"><h2 className="text-xl font-semibold mb-4">Relatório Mensal</h2><div className="bg-white p-6 rounded-lg shadow-md"><div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div><label htmlFor="reportMonth" className="block text-sm">Mês</label><input type="month" id="reportMonth" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="mt-1 w-full border rounded-md p-2"/></div>
                <div className="md:col-span-2"><button onClick={handleExportReport} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md w-full md:w-auto">Gerar Relatório</button></div>
            </div></div></div>)}
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={currentFerias?.id ? 'Editar Férias' : 'Agendar Férias'}>
                {currentFerias && <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
                    <div className="relative" ref={searchContainerRef}>
                        <label className="block text-sm">Policial</label>
                        <input
                            type="text"
                            placeholder="Buscar por nome ou RE..."
                            value={policialSearch}
                            onChange={e => {
                                setPolicialSearch(e.target.value);
                                setCurrentFerias(p => ({ ...p, policialId: undefined }));
                                setDropdownOpen(true);
                            }}
                            onFocus={() => { if (!currentFerias.id) setDropdownOpen(true); }}
                            className="mt-1 w-full border rounded-md p-2"
                            disabled={!!currentFerias.id}
                            autoComplete="off"
                        />
                        {isDropdownOpen && !currentFerias.id && (
                            <ul className="absolute z-10 w-full bg-white border mt-1 max-h-60 overflow-y-auto shadow-lg">
                                {filteredPoliciaisParaSelecao.length > 0 ? (
                                    filteredPoliciaisParaSelecao.map(p => (
                                        <li
                                            key={p.id}
                                            className="px-3 py-2 cursor-pointer hover:bg-pm-blue-light hover:text-white"
                                            onClick={() => {
                                                setCurrentFerias(prev => ({...prev, policialId: p.id }));
                                                setPolicialSearch(`${p.postoGrad} ${p.nome} (${p.re})`);
                                                setDropdownOpen(false);
                                            }}
                                        >
                                            {p.postoGrad} {p.nome}
                                        </li>
                                    ))
                                ) : (
                                    <li className="px-3 py-2 italic">Nenhum policial encontrado.</li>
                                )}
                            </ul>
                        )}
                    </div>
                    <div><label className="block text-sm">Ano Ref.</label><input type="number" value={currentFerias.anoReferencia} onChange={e => setCurrentFerias({...currentFerias, anoReferencia: Number(e.target.value) })} className="mt-1 w-full border rounded-md p-2" required/></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm">Início</label><input type="date" value={currentFerias.dataInicio || ''} onChange={e => setCurrentFerias({...currentFerias, dataInicio: e.target.value })} className={`mt-1 w-full border rounded-md p-2 ${currentFerias.id ? 'bg-yellow-50' : ''}`} required /></div>
                        <div><label className="block text-sm">Duração</label><select value={currentFerias.duracaoDias || ''} onChange={e => setCurrentFerias({...currentFerias, duracaoDias: Number(e.target.value) as (15 | 30) })} className={`mt-1 w-full border rounded-md p-2 ${currentFerias.id ? 'bg-yellow-50' : ''}`} required disabled={!!currentFerias.id || (availableDurations.length === 0 && !currentFerias.id)}><option value="" disabled>{availableDurations.length === 0 && !currentFerias.id ? 'Sem saldo' : 'Selecione...'}</option>{currentFerias.id ? <option value={currentFerias.duracaoDias}>{currentFerias.duracaoDias} dias</option> : availableDurations.map(d => <option key={d} value={d}>{d} dias</option>)}</select></div>
                    </div>
                    <div><label className="block text-sm">Fim (Calculada)</label><input type="date" value={currentFerias.dataFim || ''} readOnly className={`mt-1 w-full border rounded-md p-2 bg-pm-gray-100 cursor-not-allowed ${currentFerias.id ? 'bg-yellow-50' : ''}`}/></div>
                    {currentFerias.id && (<div><label className="block text-sm">Status</label><select value={currentFerias.status || ''} onChange={e => setCurrentFerias({ ...currentFerias, status: e.target.value as FeriasStatus })} className="mt-1 w-full border rounded-md p-2">{Object.entries(FERIAS_STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>)}
                    <div><label className="block text-sm">Observação</label><textarea value={currentFerias.observacao || ''} onChange={e => setCurrentFerias({...currentFerias, observacao: e.target.value})} rows={3} className="mt-1 w-full border rounded-md p-2" /></div>
                    <div className="flex items-center justify-end pt-4 space-x-2">{currentFerias.id && (<button type="button" onClick={handleClearDates} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md mr-auto">Restaurar Datas</button>)}<button type="button" onClick={() => setModalOpen(false)} className="bg-pm-gray-200 hover:bg-pm-gray-300 font-bold py-2 px-4 rounded-md">Cancelar</button><button type="submit" className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">Salvar</button></div>
                </form>}
            </Modal>
             <Modal isOpen={isRequestModalOpen} onClose={() => setRequestModalOpen(false)} title="Solicitar Alteração de Férias">
                {feriasToRequest && (<form onSubmit={e => { e.preventDefault(); handleConfirmRequest(); }} className="space-y-4">
                    <p>Solicitando alteração para as férias de <strong>{feriasToRequest.nome}</strong> (início em {new Date(feriasToRequest.dataInicio + 'T12:00:00').toLocaleDateString()}).</p>
                    <div><label className="block text-sm">Motivo / Sugestão</label><textarea value={requestReason} onChange={e => setRequestReason(e.target.value)} rows={4} className="mt-1 w-full border rounded-md p-2" required placeholder="Ex: Adiar o início para a segunda quinzena..."/></div>
                    <div className="flex justify-end pt-4 space-x-2"><button type="button" onClick={() => setRequestModalOpen(false)} className="bg-pm-gray-200 hover:bg-pm-gray-300 font-bold py-2 px-4 rounded-md">Cancelar</button><button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md">Enviar Solicitação</button></div>
                </form>)}
            </Modal>
        </div>
    );
};

export default FeriasPage;
