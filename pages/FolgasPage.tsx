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

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;


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
                
                if (motivoTipo === 'Folga Cmt Geral' || motivoTipo === 'Folga Cmt Cia') {
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
                    if (!parecer) throw new Error("O motivo da exclusão é obrigatório.");
                    updates = { status: StatusFolga.EXCLUIDA, motivo: parecer };
                } else if (modalMode === 'sargento') {
                    if (!sargentoSelecionadold) throw new Error("Selecione um sargento responsável.");
                    updates = { aprovacao: Aprovacao.ENVIADA_SARGENTO, sargentoResponsavelld: sargentoSelecionadold };
                } else if (modalMode === 'parecer') {
                    if (!parecer) throw new Error("O parecer é obrigatório para esta ação.");
                    if (currentFolga.aprovacao === Aprovacao.ENVIADA_SARGENTO) {
                        const isApprove = currentFolga.actionType === 'aprovar';
                        updates = { aprovacao: isApprove ? Aprovacao.APROVADA_SARGENTO : Aprovacao.NEGADA_SARGENTO, sargentold: currentUser.id, sargentoParecer: parecer };
                    } else if (currentFolga.aprovacao === Aprovacao.APROVADA_SARGENTO) {
                        const isValidate = currentFolga.actionType === 'aprovar';
                        updates = { aprovacao: isValidate ? Aprovacao.VALIDADA_ADMIN : Aprovacao.REPROVADA_ADMIN, adminld: currentUser.id, adminParecer: parecer, status: isValidate ? StatusFolga.ATIVA : StatusFolga.CANCELADA };
                    }
                }
                await updateFolga(currentFolga.folgald!, updates, currentUser);
                triggerHighlight([currentFolga.folgald!]);
                setToast({ message: "Operação realizada com sucesso!", type: 'success' });
            }
            setModalOpen(false);
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        }
    };
    
    const handleRestore = async (folga: Folga) => {
        if (!currentUser) return;
        await updateFolga(folga.folgald, { status: StatusFolga.ATIVA, trocadaPara: null, motivo: null }, currentUser);
        triggerHighlight([folga.folgald]);
        setToast({ message: "Folga restaurada com sucesso!", type: 'success' });
    };

    const openParecerModal = (folga: Folga, actionType: 'aprovar' | 'negar') => {
        openModal('parecer', {...folga, actionType});
    }

    // --- Bulk Approval Logic ---
    const canBeBulkApproved = (folga: Folga): boolean => {
        if (role === 'SARGENTO' && folga.aprovacao === Aprovacao.ENVIADA_SARGENTO) return true;
        if (role === 'ADMIN' && folga.aprovacao === Aprovacao.APROVADA_SARGENTO) return true;
        return false;
    };

    const eligibleForSelectAll = useMemo(() => {
        return filteredFolgas.filter(canBeBulkApproved).map(f => f.folgald);
    }, [filteredFolgas, role]);

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const isIndeterminate = selectedFolgas.size > 0 && selectedFolgas.size < eligibleForSelectAll.length;
            selectAllCheckboxRef.current.indeterminate = isIndeterminate;
        }
    }, [selectedFolgas, eligibleForSelectAll]);

    const handleSelectFolga = (folgald: string) => {
        setSelectedFolgas(prev => {
            const newSet = new Set(prev);
            newSet.has(folgald) ? newSet.delete(folgald) : newSet.add(folgald);
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFolgas(e.target.checked ? new Set(eligibleForSelectAll) : new Set());
    };

    const openBulkApproveModal = () => {
        setBulkParecer('');
        setBulkApproveModalOpen(true);
    };

    const handleConfirmBulkApprove = async () => {
        if (!currentUser) return;
        if (bulkParecer.trim() === '') {
            setToast({ message: 'O parecer é obrigatório para aprovação em massa.', type: 'error' });
            return;
        }

        let updates: Partial<Folga> = {};
        if (role === 'SARGENTO') {
            updates = { aprovacao: Aprovacao.APROVADA_SARGENTO, sargentold: currentUser.id, sargentoParecer: bulkParecer };
        } else if (role === 'ADMIN') {
            updates = { aprovacao: Aprovacao.VALIDADA_ADMIN, adminld: currentUser.id, adminParecer: bulkParecer, status: StatusFolga.ATIVA };
        } else { return; }

        try {
            const idsToUpdate = [...selectedFolgas];
            await Promise.all(idsToUpdate.map(id => updateFolga(id, updates, currentUser)));
            
            triggerHighlight(idsToUpdate);
            setToast({ message: `${selectedFolgas.size} folgas aprovadas com sucesso!`, type: 'success' });
            setSelectedFolgas(new Set());
            setBulkApproveModalOpen(false);
        } catch (error: any) {
            setToast({ message: error.message || 'Ocorreu um erro ao aprovar as folgas.', type: 'error' });
        }
    };

    const renderModalContent = () => {
        const todayISO = new Date().toISOString().split('T')[0];
        const selectedPolicial = policiais.find(p => p.id === currentFolga?.policialld);
        const buttonColor = {
            ADMIN: 'bg-pm-blue hover:bg-pm-blue-dark',
            SARGENTO: 'bg-pm-red-700 hover:bg-pm-red-800',
            SUBORDINADO: 'bg-pm-gray-800 hover:bg-pm-gray-900'
        }[role || 'SUBORDINADO'];


        switch (modalMode) {
            case 'add': return (<form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
                { (role === 'ADMIN' || role === 'SARGENTO') && 
                    <div>
                        <label className="block text-sm font-medium">Policial</label>
                        <input type="text" placeholder="Buscar por nome, RE ou pelotão..." value={policialSearch} onChange={e => setPolicialSearch(e.target.value)} className="mb-2 mt-1 w-full border border-gray-300 rounded-md p-2"/>
                        <select value={currentFolga?.policialld || ""} onChange={e => setCurrentFolga({ ...currentFolga, policialld: Number(e.target.value) })} className="mt-1 w-full border border-gray-300 rounded-md p-2" required size={filteredPoliciaisParaSelecao.length > 5 ? 5 : Math.max(2, filteredPoliciaisParaSelecao.length + 1)}>
                            <option value="">Selecione o policial...</option>
                            {filteredPoliciaisParaSelecao.map(p => <option key={p.id} value={p.id}>{p.postoGrad} {p.re} {p.nome} ({p.pelotao})</option>)}
                        </select>
                        {filteredPoliciaisParaSelecao.length === 0 && <p className="text-xs text-red-500 mt-1">Nenhum policial encontrado.</p>}
                    </div>
                }
                <div><label className="block text-sm font-medium">Data da Folga</label><input type="date" min={todayISO} value={currentFolga?.data || ""} onChange={e => setCurrentFolga({ ...currentFolga, data: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-md p-2" required/></div>
                <div><label className="block text-sm font-medium">Pelotão</label><select value={role === 'SUBORDINADO' ? currentUser?.pelotao : selectedPolicial?.pelotao || ''} disabled className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-gray-100 text-pm-gray-700 cursor-not-allowed"><option value="">{role === 'SUBORDINADO' ? currentUser?.pelotao : selectedPolicial?.pelotao || 'Selecione um policial'}</option></select></div>
                
                <div>
                  <label className="block text-sm font-medium">Motivo da Folga</label>
                  <select value={motivoTipo} onChange={e => { setMotivoTipo(e.target.value); setMotivoDetalhes(''); }} className="mt-1 w-full border border-gray-300 rounded-md p-2" required>
                    <option value="">Selecione o tipo...</option>
                    <option value="Folga Cmt Geral">Folga Cmt Geral</option>
                    <option value="Folga Cmt Cia">Folga Cmt Cia</option>
                    <option value="Folga Compensação">Folga Compensação</option>
                    {selectedPolicial?.pelotao === 'ADM' && (<option value="Folga Semanal">Folga Semanal (ADM)</option>)}
                    <option value="Folga Outros">Folga Outros</option>
                  </select>
                </div>

                {motivoTipo === 'Folga Cmt Cia' && (<div><label className="block text-sm font-medium">Motivo da Folga Cmt Cia</label><textarea placeholder="Descreva o motivo..." value={motivoDetalhes} onChange={e => setMotivoDetalhes(e.target.value)} rows={3} className="mt-1 w-full border border-gray-300 rounded-md p-2" required minLength={5}/></div>)}
                {motivoTipo === 'Folga Outros' && (<div><label className="block text-sm font-medium">Motivo (Outros)</label><textarea placeholder="Descreva o motivo detalhadamente..." value={motivoDetalhes} onChange={e => setMotivoDetalhes(e.target.value)} rows={3} className="mt-1 w-full border border-gray-300 rounded-md p-2" required minLength={10}/></div>)}
                {motivoTipo === 'Folga Compensação' && (<div className="space-y-4 p-4 border border-pm-gray-200 rounded-md bg-pm-gray-50">
                    <h4 className="font-semibold text-pm-gray-700">Detalhes da Compensação</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">Data do Serviço Extra</label><input type="date" value={compensacaoData} onChange={e => setCompensacaoData(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2" required/></div>
                        <div><label className="block text-sm font-medium">BOPM (Opcional)</label><input type="text" placeholder="Nº do BOPM" value={compensacaoBOPM} onChange={e => setCompensacaoBOPM(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2"/></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">Início do Serviço</label><input type="time" value={compensacaoInicio} onChange={e => setCompensacaoInicio(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2" required/></div>
                        <div><label className="block text-sm font-medium">Término do Serviço</label><input type="time" value={compensacaoFim} onChange={e => setCompensacaoFim(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2" required/></div>
                    </div>
                </div>)}
                {motivoTipo === 'Folga Semanal' && (<div className="space-y-4 p-4 border border-pm-gray-200 rounded-md bg-pm-gray-50">
                    <h4 className="font-semibold text-pm-gray-700">Detalhes da Folga Semanal</h4>
                    <div role="radiogroup" className="flex items-center space-x-6">
                        <label className="flex items-center cursor-pointer"><input type="radio" name="folgaSemanalTipo" value="integral" checked={folgaSemanalTipo === 'integral'} onChange={() => setFolgaSemanalTipo('integral')} className="h-4 w-4 text-pm-blue focus:ring-pm-blue border-gray-300"/><span className="ml-2 text-sm">Integral</span></label>
                        <label className="flex items-center cursor-pointer"><input type="radio" name="folgaSemanalTipo" value="meio" checked={folgaSemanalTipo === 'meio'} onChange={() => setFolgaSemanalTipo('meio')} className="h-4 w-4 text-pm-blue focus:ring-pm-blue border-gray-300"/><span className="ml-2 text-sm">Meio Expediente</span></label>
                    </div>
                    {folgaSemanalTipo === 'meio' && (<div role="radiogroup" className="pt-2 flex items-center space-x-6">
                        <label className="flex items-center cursor-pointer"><input type="radio" name="meioExpedienteHorario" value="08-13" checked={meioExpedienteHorario === '08-13'} onChange={() => setMeioExpedienteHorario('08-13')} className="h-4 w-4"/><span className="ml-2 text-sm">08h00-13h00</span></label>
                        <label className="flex items-center cursor-pointer"><input type="radio" name="meioExpedienteHorario" value="13-18" checked={meioExpedienteHorario === '13-18'} onChange={() => setMeioExpedienteHorario('13-18')} className="h-4 w-4"/><span className="ml-2 text-sm">13h00-18h00</span></label>
                    </div>)}
                </div>)}

                <div className="flex justify-end pt-4 space-x-2"><button type="button" onClick={() => setModalOpen(false)} className="bg-pm-gray-200 hover:bg-pm-gray-300 text-pm-gray-800 font-bold py-2 px-4 rounded-md">Cancelar</button><button type="submit" className={`${buttonColor} text-white font-bold py-2 px-4 rounded-md`}>Enviar</button></div>
            </form>);
            case 'trocar': return (<form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4"><p>Trocando folga de <strong>{currentFolga?.nome}</strong> do dia <strong>{currentFolga && new Date(currentFolga.data+'T00:00:00').toLocaleDateString()}</strong></p><div><label className="block text-sm font-medium">Nova Data da Folga</label><input type="date" value={currentFolga?.trocadaPara || ""} onChange={e => setCurrentFolga({...currentFolga, trocadaPara: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-md p-2" required/></div><div><label className="block text-sm font-medium">Motivo/Observação (Opcional)</label><textarea value={parecer} onChange={e => setParecer(e.target.value)} rows={3} className="mt-1 w-full border border-gray-300 rounded-md p-2"/></div><div className="flex justify-end pt-4"><button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md">Confirmar Troca</button></div></form>);
            case 'excluir': return (<form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4"><p>Você tem certeza que deseja excluir a folga de <strong>{currentFolga?.nome}</strong> do dia <strong>{currentFolga && new Date(currentFolga.data+'T00:00:00').toLocaleDateString()}</strong>?</p><div><label className="block text-sm font-medium">Motivo da Exclusão</label><textarea value={parecer} onChange={e => setParecer(e.target.value)} rows={3} className="mt-1 w-full border border-gray-300 rounded-md p-2" required/></div><div className="flex justify-end pt-4"><button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">Confirmar Exclusão</button></div></form>);
            case 'sargento': return (<form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4"><p>Enviar folga de <strong>{currentFolga?.nome}</strong> para aprovação.</p><div><label className="block text-sm font-medium">Sargento Responsável</label><select value={sargentoSelecionadold || ''} onChange={e => setSargentoSelecionadold(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md p-2" required><option value="">Selecione um sargento...</option>{sargentos.map(sgt => <option key={sgt.id} value={sgt.id}>{sgt.postoGrad} {sgt.nome}</option>)}</select></div><div className="flex justify-end pt-4"><button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Enviar</button></div></form>);
            case 'parecer':
                const actionText = currentFolga?.actionType === 'aprovar' ? 'Aprovar' : 'Negar';
                const buttonColorParecer = currentFolga?.actionType === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';
                return (<form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4"><p>{`${actionText} folga de ${currentFolga?.nome}`}</p><div><label className="block text-sm font-medium">Parecer / Justificativa</label><textarea value={parecer} onChange={e => setParecer(e.target.value)} rows={3} className="mt-1 w-full border border-gray-300 rounded-md p-2" required/></div><div className="flex justify-end pt-4"><button type="submit" className={`${buttonColorParecer} text-white font-bold py-2 px-4 rounded-md`}>Confirmar</button></div></form>);
            default: return null;
        }
    };
    
    const getSargentoResponsavelNome = (sargentold?: number) => {
        if (!sargentold) return 'N/D';
        const sargento = users.find(u => u.id === sargentold);
        return sargento ? `${sargento.postoGrad} ${sargento.nome}` : 'Desconhecido';
    };

    const buttonColor = {
        ADMIN: 'bg-pm-blue hover:bg-pm-blue-dark',
        SARGENTO: 'bg-pm-red-700 hover:bg-pm-red-800',
        SUBORDINADO: 'bg-pm-gray-800 hover:bg-pm-gray-900'
    }[role || 'SUBORDINADO'];


    return (
        <div className="container mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} />}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-pm-gray-800">Gerenciar Folgas</h1>
                <div className="flex items-center gap-4">
                  {saldoAtual !== null && (
                    <div className="bg-white p-2 px-4 rounded-lg shadow-sm text-center">
                      <span className="text-xs text-pm-gray-500 font-medium block">SALDO {currentYear}</span>
                      <span className={`text-2xl font-bold ${saldoAtual > 0 ? 'text-green-600' : 'text-red-600'}`}>{saldoAtual}</span>
                    </div>
                  )}
                  {(role === 'ADMIN' || role === 'SARGENTO') && selectedFolgas.size > 0 && (<button onClick={openBulkApproveModal} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm h-full transition-all"><CheckCircleIcon className="mr-2 h-5 w-5"/>Aprovar Selecionadas ({selectedFolgas.size})</button>)}
                  <button onClick={() => openModal('add')} className={`${buttonColor} text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm h-full`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      Acionar Folga
                  </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="text" name="nomeRe" placeholder="Buscar por Nome ou RE..." value={filters.nomeRe} onChange={handleFilterChange} className="w-full px-3 py-2 border border-pm-gray-300 rounded-md"/>
                    <select name="pelotao" value={filters.pelotao} onChange={handleFilterChange} className="w-full px-3 py-2 border border-pm-gray-300 rounded-md"><option value="">Todos os Grupos</option>{pelotoesOrdenados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}</select>
                    <select name="aprovacao" value={filters.aprovacao} onChange={handleFilterChange} className="w-full px-3 py-2 border border-pm-gray-300 rounded-md"><option value="">Todos os Status de Aprovação</option>{Object.entries(APROVACAO_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full px-3 py-2 border border-pm-gray-300 rounded-md"><option value="">Todos os Status</option>{STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-pm-gray-600">
                    <thead className="text-xs text-pm-gray-700 uppercase bg-pm-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">{eligibleForSelectAll.length > 0 && (<input ref={selectAllCheckboxRef} type="checkbox" onChange={handleSelectAll} checked={eligibleForSelectAll.length > 0 && selectedFolgas.size === eligibleForSelectAll.length} className="h-4 w-4 text-pm-blue focus:ring-pm-blue border-gray-300 rounded"/>)}</th>
                            <th scope="col" className="px-6 py-3">Policial</th><th scope="col" className="px-6 py-3">Data</th><th scope="col" className="px-6 py-3">Pelotão</th><th scope="col" className="px-6 py-3">Status Aprovação</th><th scope="col" className="px-6 py-3">Sargento Responsável</th><th scope="col" className="px-6 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFolgas.map(folga => {
                            const isPending = folga.aprovacao === Aprovacao.ENVIADA_SARGENTO || folga.aprovacao === Aprovacao.APROVADA_SARGENTO;
                            return (
                                <tr key={folga.folgald} className={`bg-white border-b hover:bg-pm-gray-50 transition-colors duration-200 ${highlightedFolgas.has(folga.folgald) ? 'highlight-success' : ''} ${isPending ? 'border-l-4 border-yellow-300' : ''}`}>
                                    <td className="px-6 py-4">{canBeBulkApproved(folga) && (<input type="checkbox" checked={selectedFolgas.has(folga.folgald)} onChange={() => handleSelectFolga(folga.folgald)} onClick={(e) => e.stopPropagation()} className="h-4 w-4 text-pm-blue focus:ring-pm-blue border-gray-300 rounded"/>)}</td>
                                    <td className="px-6 py-4 font-medium text-pm-gray-900 cursor-pointer" onClick={() => handleShowDetails(folga)}>{folga.nome}<br/><span className="text-xs text-pm-gray-500">RE: {folga.re}</span></td>
                                    <td className="px-6 py-4 cursor-pointer" onClick={() => handleShowDetails(folga)}>{new Date(folga.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-4 cursor-pointer" onClick={() => handleShowDetails(folga)}>{folga.pelotao}</td>
                                    <td className="px-6 py-4 cursor-pointer" onClick={() => handleShowDetails(folga)}><span className={`px-2 py-1 text-xs font-medium rounded-full ${APROVACAO_COLORS[folga.aprovacao]}`}>{APROVACAO_LABELS[folga.aprovacao]}</span></td>
                                    <td className="px-6 py-4 cursor-pointer" onClick={() => handleShowDetails(folga)}>{getSargentoResponsavelNome(folga.sargentoResponsavelld)}</td>
                                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                        {folga.aprovacao === Aprovacao.RASCUNHO && folga.policialld === currentUser?.policialId && (<button onClick={() => openModal('sargento', folga)} className="font-medium text-blue-600 hover:underline">Enviar</button>)}
                                        {folga.aprovacao === Aprovacao.ENVIADA_SARGENTO && role === 'SARGENTO' && (<><button onClick={() => openParecerModal(folga, 'aprovar')} className="font-medium text-green-600 hover:underline">Aprovar</button><button onClick={() => openParecerModal(folga, 'negar')} className="font-medium text-red-600 hover:underline">Negar</button></>)}
                                        {folga.aprovacao === Aprovacao.APROVADA_SARGENTO && role === 'ADMIN' && (<><button onClick={() => openParecerModal(folga, 'aprovar')} className="font-medium text-green-600 hover:underline">Validar</button><button onClick={() => openParecerModal(folga, 'negar')} className="font-medium text-red-600 hover:underline">Reprovar</button></>)}
                                        {folga.aprovacao === Aprovacao.VALIDADA_ADMIN && folga.status === StatusFolga.ATIVA && (<><button onClick={() => openModal('trocar', folga)} className="font-medium text-yellow-600 hover:underline">Trocar</button><button onClick={() => openModal('excluir', folga)} className="font-medium text-red-600 hover:underline">Excluir</button></>)}
                                        {role === 'ADMIN' && (folga.status === StatusFolga.TROCADA || folga.status === StatusFolga.EXCLUIDA) && (<button onClick={(e) => { e.stopPropagation(); handleRestore(folga);}} className="font-medium text-pm-blue hover:underline">Restaurar</button>)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredFolgas.length === 0 && <p className="text-center p-4 text-pm-gray-500">Nenhuma folga encontrada.</p>}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={modalMode === 'add' ? 'Acionar Folga' : modalMode === 'trocar' ? 'Trocar Folga' : modalMode === 'excluir' ? 'Excluir Folga' : modalMode === 'sargento' ? 'Enviar para Aprovação' : 'Adicionar Parecer'}>
                {renderModalContent()}
            </Modal>
            <Modal isOpen={isBulkApproveModalOpen} onClose={() => setBulkApproveModalOpen(false)} title={`Aprovar ${selectedFolgas.size} Folgas`}>
                <div className="space-y-4">
                    <p>Você está prestes a aprovar {selectedFolgas.size} solicitações de folga. Por favor, forneça um parecer que será aplicado a todas elas.</p>
                    <div><label className="block text-sm font-medium">Parecer / Justificativa</label><textarea value={bulkParecer} onChange={(e) => setBulkParecer(e.target.value)} rows={3} className="mt-1 w-full border border-gray-300 rounded-md p-2" required /></div>
                    <div className="flex justify-end pt-4 space-x-2"><button type="button" onClick={() => setBulkApproveModalOpen(false)} className="bg-pm-gray-200 hover:bg-pm-gray-300 text-pm-gray-800 font-bold py-2 px-4 rounded-md">Cancelar</button><button type="button" onClick={handleConfirmBulkApprove} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Confirmar Aprovação</button></div>
                </div>
            </Modal>
            <Modal isOpen={isDetailsModalOpen} onClose={() => setDetailsModalOpen(false)} title="Detalhes da Folga">
                {detailsFolga && (() => {
                    const sargento = users.find(u => u.id === detailsFolga.sargentold);
                    const admin = users.find(u => u.id === detailsFolga.adminld);
                    const folgaComentarios = comentarios.filter(c => c.folgald === detailsFolga.folgald).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    const handleAddComment = async () => {
                        if (currentUser && newComment.trim()) {
                            await addComentario(detailsFolga.folgald, newComment, currentUser);
                            setNewComment('');
                        }
                    };
                    return (<div className="space-y-4 text-sm text-pm-gray-700">
                        <div><p className="text-lg font-semibold text-pm-gray-900">{detailsFolga.nome}</p><p className="text-pm-gray-500">RE: {detailsFolga.re} &bull; Pelotão: {detailsFolga.pelotao}</p></div>
                        <div className="border-t pt-4 grid grid-cols-2 gap-4">
                            <div><p className="font-medium text-pm-gray-500">Data</p><p>{new Date(detailsFolga.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p></div>
                            <div><p className="font-medium text-pm-gray-500">Status</p><p><span className={`px-2 py-1 text-xs rounded-full ${APROVACAO_COLORS[detailsFolga.aprovacao]}`}>{APROVACAO_LABELS[detailsFolga.aprovacao]}</span></p></div>
                        </div>
                        {detailsFolga.motivo && (<div className="border-t pt-4"><p className="font-medium text-pm-gray-500">Motivo</p><p className="p-3 bg-pm-gray-50 rounded-md mt-1 whitespace-pre-wrap">{detailsFolga.motivo}</p></div>)}
                        {detailsFolga.sargentoParecer && (<div className="border-t pt-4"><p className="font-medium text-pm-gray-500">Parecer Sargento ({sargento ? `${sargento.postoGrad} ${sargento.nome}` : 'N/D'})</p><p className="p-3 bg-pm-gray-50 rounded-md mt-1">{detailsFolga.sargentoParecer}</p></div>)}
                        {detailsFolga.adminParecer && (<div className="border-t pt-4"><p className="font-medium text-pm-gray-500">Parecer Admin ({admin ? `${admin.postoGrad} ${admin.nome}` : 'N/D'})</p><p className="p-3 bg-pm-gray-50 rounded-md mt-1">{detailsFolga.adminParecer}</p></div>)}
                        <div className="border-t pt-4"><h3 className="font-medium text-pm-gray-500 mb-2">Comentários</h3>
                            <div className="max-h-40 overflow-y-auto space-y-3 p-2 bg-pm-gray-50 rounded-md border">
                                {folgaComentarios.length > 0 ? folgaComentarios.map(c => (<div key={c.id} className={`flex flex-col ${c.actorId === currentUser?.id ? 'items-end' : 'items-start'}`}><div className={`max-w-xs p-2 rounded-lg ${c.actorId === currentUser?.id ? 'bg-pm-blue text-white' : 'bg-pm-gray-200'}`}><p className="text-xs font-bold">{c.actorPostoGrad} {c.actorNome}</p><p>{c.mensagem}</p></div><p className="text-xs text-pm-gray-400 mt-1 px-1">{new Date(c.timestamp).toLocaleString('pt-BR', { day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p></div>)) : <p className="text-center text-xs text-pm-gray-500 py-2">Nenhum comentário.</p>}
                            </div>
                            <div className="mt-2 flex items-start space-x-2"><textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Adicionar comentário..." rows={2} className="flex-1 border-gray-300 rounded-md p-2" /><button onClick={handleAddComment} className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold p-2 rounded-md h-full">Enviar</button></div>
                        </div>
                        <div className="flex justify-end pt-4"><button type="button" onClick={() => setDetailsModalOpen(false)} className="bg-pm-gray-200 hover:bg-pm-gray-300 text-pm-gray-800 font-bold py-2 px-4 rounded-md">Fechar</button></div>
                    </div>);
                })()}
            </Modal>
        </div>
    );
};

export default FolgasPage;