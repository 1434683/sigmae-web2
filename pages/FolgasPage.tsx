import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Folga, StatusFolga, Aprovacao, Comentario } from '../types';
import Modal from '../components/Modal';
import { APROVACAO_COLORS, APROVACAO_LABELS, STATUS_OPTIONS } from '../constants';
import { useFilteredFolgas } from '../hooks/useDataFilters';

const Toast: React.FC<{ message: string; type?: 'success' | 'error' | 'warning' }> = ({ message, type = 'success' }) => {
  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-500',
  }[type];

  return (
    <div className={`fixed top-20 right-8 text-white py-3 px-5 rounded-lg shadow-xl z-50 flex items-center ${bgColor}`} role="alert" aria-live="assertive">
      {/* Fix: Corrected the malformed viewBox attribute in the SVG element. */}
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
      <span>{message}</span>
    </div>
  );
};

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;


const FolgasPage: React.FC = () => {
    const { policiais, users, addFolga, updateFolga, getBalanceFor, canRequestFolga, comentarios, addComentario, grupos } = useData();
    const { currentUser, role } = useAuth();
    const [searchParams] = useSearchParams();

    const [isModalOpen, setModalOpen] = useState(false);
    const [currentFolga, setCurrentFolga] = useState<Partial<Folga> | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'trocar' | 'excluir' | 'parecer' | 'sargento'>('add');
    const [parecer, setParecer] = useState("");
    const [sargentoSelecionadold, setSargentoSelecionadold] = useState<number | undefined>();
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);
    const [policialSearch, setPolicialSearch] = useState('');
    const [highlightedFolgas, setHighlightedFolgas] = useState<Set<string>>(new Set());

    // State for bulk approval
    const [selectedFolgas, setSelectedFolgas] = useState<Set<string>>(new Set());
    const [isBulkApproveModalOpen, setBulkApproveModalOpen] = useState(false);
    const [bulkParecer, setBulkParecer] = useState('');
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    // State for detailed leave reasons
    const [motivoTipo, setMotivoTipo] = useState<string>('');
    const [motivoDetalhes, setMotivoDetalhes] = useState('');
    const [compensacaoData, setCompensacaoData] = useState('');
    const [compensacaoInicio, setCompensacaoInicio] = useState('');
    const [compensacaoFim, setCompensacaoFim] = useState('');
    const [compensacaoBOPM, setCompensacaoBOPM] = useState('');
    const [folgaSemanalTipo, setFolgaSemanalTipo] = useState<'integral' | 'meio'>('integral');
    const [meioExpedienteHorario, setMeioExpedienteHorario] = useState<'08-13' | '13-18'>('08-13');


    const [filters, setFilters] = useState({
      nomeRe: '',
      pelotao: '',
      aprovacao: searchParams.get('aprovacao') || '',
      status: searchParams.get('status') || '',
    });
    
    const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsFolga, setDetailsFolga] = useState<Folga | null>(null);
    const [newComment, setNewComment] = useState('');
    
    const currentYear = new Date().getFullYear();
    const saldoAtual = currentUser?.policialId ? getBalanceFor(currentUser.policialId, currentYear) : null;

    const filteredFolgas = useFilteredFolgas(filters);
    const pelotoesOrdenados = useMemo(() => [...grupos].sort((a, b) => a.nome.localeCompare(b.nome)), [grupos]);
    
    const triggerHighlight = (ids: string[]) => {
        setHighlightedFolgas(new Set(ids));
        const timer = setTimeout(() => {
            setHighlightedFolgas(new Set());
        }, 2000); // Animation duration is 2s
        return () => clearTimeout(timer);
    };

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({...prev, [name]: value}));
        setSelectedFolgas(new Set()); // Clear selection on filter change
    };

    const sargentos = useMemo(() => users.filter(u => u.role === 'SARGENTO' && u.ativo), [users]);

    const filteredPoliciaisParaSelecao = useMemo(() => {
        if (!policialSearch.trim()) {
            return policiais.filter(p => p.ativo).sort((a,b) => a.nome.localeCompare(b.nome));
        }
        const searchLower = policialSearch.toLowerCase();
        return policiais.filter(p => p.ativo && (
            p.re.toLowerCase().includes(searchLower) ||
            p.nome.toLowerCase().includes(searchLower) ||
            p.pelotao.toLowerCase().includes(searchLower)
        ));
    }, [policiais, policialSearch]);

    const openModal = (mode: 'add' | 'trocar' | 'excluir' | 'parecer' | 'sargento', folga: Partial<Folga> | null = null) => {
        setModalMode(mode);
        if (mode === 'add') {
             setCurrentFolga({
                policialld: role === 'SUBORDINADO' ? currentUser?.policialId ?? undefined : undefined,
                data: '',
                motivo: ''
            });
            // Reset detailed reason state
            setMotivoTipo('');
            setMotivoDetalhes('');
            setCompensacaoData('');
            setCompensacaoInicio('');
            setCompensacaoFim('');
            setCompensacaoBOPM('');
            setFolgaSemanalTipo('integral');
            setMeioExpedienteHorario('08-13');
            setPolicialSearch('');
        } else {
            setCurrentFolga(folga);
        }
        setParecer("");
        setSargentoSelecionadold(undefined);
        setModalOpen(true);
    };

    const handleShowDetails = (folga: Folga) => {
        setDetailsFolga(folga);
        setNewComment('');
        setDetailsModalOpen(true);
    };
    
    const handleSave = async () => {
        if (!currentFolga || !currentUser) return;
        try {
            if (modalMode === 'add') {
                const today = new Date();
                today.setHours(0,0,0,0);
                const folgaDate = currentFolga.data ? new Date(currentFolga.data + 'T00:00:00') : null;

                if (!currentFolga.policialld) throw new Error("Policial é obrigatório.");
                if (!currentFolga.data || !folgaDate || folgaDate < today) throw new Error("Data inválida. Selecione uma data de hoje ou futura.");
                
                if (motivoTipo === 'Folga Cmt Geral') {
                    const { ok, error, warn } = canRequestFolga({
                        policialId: currentFolga.policialld, dateISO: currentFolga.data,
                        allowOverride: role === 'ADMIN' || role === 'SARGENTO',
                    });
    
                    if (!ok) throw new Error(error || "Falha ao verificar saldo.");
                    if (warn) setToast({ message: warn, type: 'warning' });
                }

                let finalMotivo = '';
                switch (motivoTipo) {
                    case 'Folga Cmt Geral': finalMotivo = 'Folga Cmt Geral'; break;
                    case 'Folga Cmt Cia':
                        if (motivoDetalhes.trim().length < 5) throw new Error("O motivo para a Folga Cmt Cia é obrigatório (mín. 5 caracteres).");
                        finalMotivo = `Folga Cmt Cia: ${motivoDetalhes.trim()}`; break;
                    case 'Folga Compensação':
                        if (!compensacaoData || !compensacaoInicio || !compensacaoFim) throw new Error("Para Folga Compensação, a data, início e fim do serviço extra são obrigatórios.");
                        const dataFmt = new Date(compensacaoData + 'T00:00:00').toLocaleDateString('pt-BR');
                        finalMotivo = `Folga Compensação - Dia: ${dataFmt} | Início: ${compensacaoInicio} | Fim: ${compensacaoFim}${compensacaoBOPM ? ` | BOPM: ${compensacaoBOPM}` : ''}`; break;
                    case 'Folga Semanal':
                        finalMotivo = folgaSemanalTipo === 'integral' ? 'Folga Semanal (Integral)' : `Folga Semanal (Meio Expediente - ${meioExpedienteHorario === '08-13' ? '08h00 às 13h00' : '13h00 às 18h00'})`; break;
                    case 'Folga Outros':
                        if (motivoDetalhes.trim().length < 10) throw new Error("O motivo para 'Outros' é obrigatório (mín. 10 caracteres).");
                        finalMotivo = `Folga Outros: ${motivoDetalhes.trim()}`; break;
                    default: throw new Error("Selecione um tipo de motivo para a folga.");
                }

                await addFolga({ policialld: currentFolga.policialld, data: currentFolga.data, motivo: finalMotivo }, currentUser);
                
                if (role === 'SUBORDINADO') setToast({ message: "Folga enviada para aprovação do sargento.", type: 'success' });
                else if (role === 'SARGENTO') setToast({ message: "Folga aprovada e enviada para validação do admin.", type: 'success' });
                else setToast({ message: "Folga validada com sucesso.", type: 'success' });

            } else {
                let updates: Partial<Folga> = {};
                if (modalMode === 'trocar') {
                    if (!currentFolga.trocadaPara) throw new Error("A nova data é obrigatória.");
                    updates = { status: StatusFolga.TROCADA, trocadaPara: currentFolga.trocadaPara, motivo: parecer };
                } else if (modalMode === 'excluir') {
                    if (!parecer.trim()) throw new Error("O motivo da exclusão é obrigatório.");
                    updates = { status: StatusFolga.EXCLUIDA, motivo: parecer };
                } else if (modalMode === 'sargento') {
                    if (!parecer.trim()) throw new Error("O parecer é obrigatório.");
                    const action = currentFolga.actionType;
                    if (action === 'aprovar') {
                        updates = { aprovacao: Aprovacao.APROVADA_SARGENTO, sargentoParecer: parecer, sargentold: currentUser.id };
                    } else if (action === 'negar') {
                        updates = { aprovacao: Aprovacao.NEGADA_SARGENTO, sargentoParecer: parecer, sargentold: currentUser.id };
                    }
                } else if (modalMode === 'parecer') {
                    if (!parecer.trim()) throw new Error("O parecer é obrigatório.");
                    const action = currentFolga.actionType;
                    if (action === 'aprovar') {
                        updates = { aprovacao: Aprovacao.VALIDADA_ADMIN, adminParecer: parecer, adminld: currentUser.id };
                    } else if (action === 'negar') {
                        updates = { aprovacao: Aprovacao.REPROVADA_ADMIN, adminParecer: parecer, adminld: currentUser.id };
                    }
                }
    
                if (Object.keys(updates).length > 0) {
                    await updateFolga(currentFolga.folgald!, updates, currentUser);
                    setToast({ message: "Operação realizada com sucesso!", type: 'success' });
                }
            }
            setModalOpen(false);
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        }
    };
    
    const folgaComentarios = useMemo(() => {
        if (!detailsFolga) return [];
        return comentarios.filter(c => c.folgald === detailsFolga.folgald).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [comentarios, detailsFolga]);
    
    const handleAddComment = async () => {
        if (!detailsFolga || !newComment.trim() || !currentUser) return;
        try {
            await addComentario(detailsFolga.folgald, newComment, currentUser);
            setNewComment('');
            setToast({ message: 'Comentário adicionado!', type: 'success'});
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        }
    };

    const handleRestore = async (folga: Folga) => {
        if (!currentUser || !window.confirm("Restaurar esta folga para ATIVA?")) return;
        try {
            await updateFolga(folga.folgald, { status: StatusFolga.ATIVA, trocadaPara: null }, currentUser);
            setToast({ message: "Folga restaurada!", type: 'success' });
            setDetailsModalOpen(false);
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        }
    }

    return (
        <div className="container mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} />}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-pm-gray-800">Gerenciar Folgas</h1>
                <div className="flex items-center gap-2">
                    {saldoAtual !== null && <span className="text-sm font-semibold bg-white px-3 py-2 rounded-lg shadow-sm">Meu Saldo {currentYear}: {saldoAtual}</span>}
                    <button onClick={() => openModal('add')} className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">Acionar Folga</button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="text" name="nomeRe" placeholder="Buscar por Nome ou RE..." value={filters.nomeRe} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"/>
                    <select name="pelotao" value={filters.pelotao} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"><option value="">Todos os Grupos</option>{pelotoesOrdenados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}</select>
                    <select name="aprovacao" value={filters.aprovacao} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"><option value="">Toda Aprovação</option>{Object.entries(APROVACAO_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"><option value="">Todo Status</option>{STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-pm-gray-600">
                    <thead className="text-xs uppercase bg-pm-gray-50">
                        <tr>
                            <th className="px-6 py-3">Policial</th>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Status Aprovação</th>
                            <th className="px-6 py-3">Status Folga</th>
                            <th className="px-6 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFolgas.map(folga => (
                            <tr key={folga.folgald} className="bg-white border-b hover:bg-pm-gray-50">
                                <td className="px-6 py-4 font-medium">{folga.nome}<br/><span className="text-xs text-pm-gray-500">{folga.re} - {folga.pelotao}</span></td>
                                <td className="px-6 py-4">{new Date(folga.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${APROVACAO_COLORS[folga.aprovacao]}`}>{APROVACAO_LABELS[folga.aprovacao]}</span></td>
                                <td className="px-6 py-4">{folga.status}</td>
                                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                    <button onClick={() => handleShowDetails(folga)} className="font-medium text-pm-blue hover:underline">Detalhes</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredFolgas.length === 0 && <p className="text-center p-4 text-pm-gray-500">Nenhuma folga encontrada.</p>}
            </div>
            
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={
                modalMode === 'add' ? 'Acionar Nova Folga' :
                modalMode === 'trocar' ? 'Trocar Folga' :
                modalMode === 'excluir' ? 'Excluir Folga' :
                'Dar Parecer sobre Folga'
            }>
                {currentFolga && (
                    <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
                        {modalMode === 'add' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-pm-gray-700">Policial</label>
                                    {role === 'SUBORDINADO' ? (
                                        <input
                                            type="text"
                                            value={currentUser?.nome || ''}
                                            disabled
                                            className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-pm-gray-100"
                                        />
                                    ) : (
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Buscar por nome, RE ou pelotão..."
                                                value={policialSearch}
                                                onChange={e => setPolicialSearch(e.target.value)}
                                                className="mt-1 w-full border border-gray-300 rounded-md p-2 mb-1"
                                            />
                                            <select
                                                value={currentFolga.policialld || ''}
                                                onChange={e => setCurrentFolga(p => ({ ...p, policialld: Number(e.target.value) }))}
                                                className="w-full border border-gray-300 rounded-md p-2"
                                                required
                                                size={Math.min(5, filteredPoliciaisParaSelecao.length + 1)}
                                            >
                                                <option value="" disabled>Selecione um policial</option>
                                                {filteredPoliciaisParaSelecao.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.postoGrad} {p.nome} ({p.re}) - {p.pelotao}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-pm-gray-700">Data da Folga</label>
                                    <input
                                        type="date"
                                        value={currentFolga.data || ''}
                                        onChange={e => setCurrentFolga(p => ({ ...p, data: e.target.value }))}
                                        className="mt-1 w-full border border-gray-300 rounded-md p-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-pm-gray-700">Tipo do Motivo</label>
                                    <select
                                        value={motivoTipo}
                                        onChange={e => setMotivoTipo(e.target.value)}
                                        className="mt-1 w-full border border-gray-300 rounded-md p-2"
                                        required
                                    >
                                        <option value="" disabled>Selecione um tipo...</option>
                                        <option value="Folga Cmt Geral">Folga Cmt Geral</option>
                                        <option value="Folga Cmt Cia">Folga Cmt Cia</option>
                                        <option value="Folga Compensação">Folga Compensação</option>
                                        <option value="Folga Semanal">Folga Semanal</option>
                                        <option value="Folga Outros">Folga Outros</option>
                                    </select>
                                </div>

                                {motivoTipo === 'Folga Cmt Cia' && (
                                    <div>
                                        <label className="block text-sm font-medium text-pm-gray-700">Justificativa (Cmt Cia)</label>
                                        <textarea value={motivoDetalhes} onChange={e => setMotivoDetalhes(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2" rows={3} required />
                                    </div>
                                )}

                                {motivoTipo === 'Folga Compensação' && (
                                    <div className="p-3 border rounded-md bg-pm-gray-50 space-y-3">
                                        <h4 className="font-semibold text-sm">Detalhes do Serviço Compensado</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <div><label className="block text-xs">Data</label><input type="date" value={compensacaoData} onChange={e => setCompensacaoData(e.target.value)} className="mt-1 w-full border-gray-300 rounded-md p-2 text-sm" required /></div>
                                            <div><label className="block text-xs">Início</label><input type="time" value={compensacaoInicio} onChange={e => setCompensacaoInicio(e.target.value)} className="mt-1 w-full border-gray-300 rounded-md p-2 text-sm" required /></div>
                                            <div><label className="block text-xs">Fim</label><input type="time" value={compensacaoFim} onChange={e => setCompensacaoFim(e.target.value)} className="mt-1 w-full border-gray-300 rounded-md p-2 text-sm" required /></div>
                                        </div>
                                         <div><label className="block text-xs">Nº BOPM (Opcional)</label><input type="text" value={compensacaoBOPM} onChange={e => setCompensacaoBOPM(e.target.value)} className="mt-1 w-full border-gray-300 rounded-md p-2 text-sm" /></div>
                                    </div>
                                )}
                                
                                {motivoTipo === 'Folga Semanal' && (
                                    <div className="p-3 border rounded-md bg-pm-gray-50 space-y-3">
                                        <h4 className="font-semibold text-sm">Tipo de Folga Semanal</h4>
                                         <div className="flex gap-4">
                                            <label className="flex items-center"><input type="radio" name="folgaSemanalTipo" value="integral" checked={folgaSemanalTipo === 'integral'} onChange={() => setFolgaSemanalTipo('integral')} className="mr-2"/> Integral</label>
                                            <label className="flex items-center"><input type="radio" name="folgaSemanalTipo" value="meio" checked={folgaSemanalTipo === 'meio'} onChange={() => setFolgaSemanalTipo('meio')} className="mr-2"/> Meio Expediente</label>
                                        </div>
                                        {folgaSemanalTipo === 'meio' && (
                                            <div className="pl-6 border-l-2">
                                                <h5 className="text-xs font-semibold">Horário</h5>
                                                <div className="flex gap-4 mt-1">
                                                     <label className="flex items-center"><input type="radio" name="meioExpedienteHorario" value="08-13" checked={meioExpedienteHorario === '08-13'} onChange={() => setMeioExpedienteHorario('08-13')} className="mr-2"/> 08:00 às 13:00</label>
                                                     <label className="flex items-center"><input type="radio" name="meioExpedienteHorario" value="13-18" checked={meioExpedienteHorario === '13-18'} onChange={() => setMeioExpedienteHorario('13-18')} className="mr-2"/> 13:00 às 18:00</label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {motivoTipo === 'Folga Outros' && (
                                    <div>
                                        <label className="block text-sm font-medium text-pm-gray-700">Justificativa (Outros)</label>
                                        <textarea value={motivoDetalhes} onChange={e => setMotivoDetalhes(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2" rows={3} required />
                                    </div>
                                )}
                            </>
                        )}

                        {modalMode === 'trocar' && (
                             <div>
                                <label className="block text-sm font-medium text-pm-gray-700">Nova Data da Folga</label>
                                <input type="date" value={currentFolga.trocadaPara || ''} onChange={e => setCurrentFolga(p => ({...p, trocadaPara: e.target.value}))} className="mt-1 w-full border-gray-300 rounded-md p-2" required/>
                             </div>
                        )}
                        
                        {(modalMode === 'trocar' || modalMode === 'excluir' || modalMode === 'parecer' || modalMode === 'sargento') && (
                             <div>
                                <label className="block text-sm font-medium text-pm-gray-700">
                                    {modalMode === 'trocar' ? 'Motivo da Troca' : modalMode === 'excluir' ? 'Motivo da Exclusão' : 'Parecer'}
                                </label>
                                <textarea value={parecer} onChange={e => setParecer(e.target.value)} className="mt-1 w-full border-gray-300 rounded-md p-2" rows={4} required></textarea>
                             </div>
                        )}

                        <div className="flex justify-end pt-4 space-x-2">
                            <button type="button" onClick={() => setModalOpen(false)} className="bg-pm-gray-200 hover:bg-pm-gray-300 text-pm-gray-800 font-bold py-2 px-4 rounded-md">Cancelar</button>
                            <button type="submit" className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">
                                {modalMode === 'add' ? 'Acionar Folga' : 'Salvar'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
            <Modal isOpen={isDetailsModalOpen} onClose={() => setDetailsModalOpen(false)} title="Detalhes da Folga">
                 {detailsFolga && (
                    <div className="space-y-4">
                        <div>
                            <p className="font-bold text-lg">{detailsFolga.nome}</p>
                            <p className="text-sm text-pm-gray-500">RE: {detailsFolga.re} - {detailsFolga.pelotao}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-pm-gray-50 rounded-lg border">
                            <div>
                                <p className="text-xs font-semibold">DATA DA FOLGA</p>
                                <p>{new Date(detailsFolga.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                            </div>
                             <div>
                                <p className="text-xs font-semibold">STATUS APROVAÇÃO</p>
                                <p><span className={`px-2 py-1 text-xs font-medium rounded-full ${APROVACAO_COLORS[detailsFolga.aprovacao]}`}>{APROVACAO_LABELS[detailsFolga.aprovacao]}</span></p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold">STATUS FOLGA</p>
                                <p>{detailsFolga.status}</p>
                            </div>
                        </div>
                        <div>
                            <p className="font-semibold">Motivo:</p>
                            <p className="p-2 bg-pm-gray-50 rounded mt-1 whitespace-pre-wrap">{detailsFolga.motivo || 'Não especificado'}</p>
                        </div>
                        {detailsFolga.sargentoParecer && (
                            <div><p className="font-semibold">Parecer Sargento:</p><p className="p-2 bg-pm-gray-50 rounded mt-1">{detailsFolga.sargentoParecer}</p></div>
                        )}
                        {detailsFolga.adminParecer && (
                            <div><p className="font-semibold">Parecer Admin:</p><p className="p-2 bg-pm-gray-50 rounded mt-1">{detailsFolga.adminParecer}</p></div>
                        )}

                        {/* Ações */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                             {/* Ações do Sargento */}
                            {role === 'SARGENTO' && detailsFolga.aprovacao === Aprovacao.ENVIADA_SARGENTO && (
                                <>
                                    <button onClick={() => { setDetailsModalOpen(false); openModal('sargento', { ...detailsFolga, actionType: 'aprovar' }); }} className="bg-green-500 text-white px-3 py-1 rounded text-sm">Aprovar</button>
                                    <button onClick={() => { setDetailsModalOpen(false); openModal('sargento', { ...detailsFolga, actionType: 'negar' }); }} className="bg-red-500 text-white px-3 py-1 rounded text-sm">Negar</button>
                                </>
                            )}
                            {/* Ações do Admin */}
                            {role === 'ADMIN' && detailsFolga.aprovacao === Aprovacao.APROVADA_SARGENTO && (
                                <>
                                    <button onClick={() => { setDetailsModalOpen(false); openModal('parecer', { ...detailsFolga, actionType: 'aprovar' }); }} className="bg-green-500 text-white px-3 py-1 rounded text-sm">Validar</button>
                                    <button onClick={() => { setDetailsModalOpen(false); openModal('parecer', { ...detailsFolga, actionType: 'negar' }); }} className="bg-red-500 text-white px-3 py-1 rounded text-sm">Reprovar</button>
                                </>
                            )}
                            {/* Ações de Troca/Exclusão */}
                            {(role === 'ADMIN' || role === 'SARGENTO') && detailsFolga.status === StatusFolga.ATIVA && detailsFolga.aprovacao === Aprovacao.VALIDADA_ADMIN && (
                                <>
                                    <button onClick={() => { setDetailsModalOpen(false); openModal('trocar', detailsFolga); }} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm">Trocar</button>
                                    <button onClick={() => { setDetailsModalOpen(false); openModal('excluir', detailsFolga); }} className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Excluir</button>
                                </>
                            )}
                            {/* Ação de Restaurar */}
                            {role === 'ADMIN' && (detailsFolga.status === StatusFolga.TROCADA || detailsFolga.status === StatusFolga.EXCLUIDA) && (
                                <button onClick={() => handleRestore(detailsFolga)} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">Restaurar Folga</button>
                            )}
                        </div>

                        {/* Comentários */}
                        <div className="pt-4 border-t">
                            <h4 className="font-semibold mb-2">Comentários</h4>
                            <div className="space-y-3 max-h-40 overflow-y-auto pr-2 mb-2">
                                {folgaComentarios.length > 0 ? folgaComentarios.map(c => (
                                    <div key={c.id} className="bg-pm-gray-100 p-2 rounded-md text-sm">
                                        <p className="font-semibold">{c.actorPostoGrad} {c.actorNome} <span className="text-xs text-pm-gray-500 font-normal">- {new Date(c.timestamp).toLocaleString('pt-BR')}</span></p>
                                        <p>{c.mensagem}</p>
                                    </div>
                                )) : <p className="text-sm text-pm-gray-500 italic">Nenhum comentário.</p>}
                            </div>
                            <div className="flex items-start space-x-2">
                                <textarea value={newComment} onChange={e => setNewComment(e.target.value)} rows={2} className="w-full border rounded-md p-2" placeholder="Adicionar comentário..."></textarea>
                                <button onClick={handleAddComment} className="bg-pm-blue text-white px-4 py-2 rounded-md text-sm">Enviar</button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default FolgasPage;