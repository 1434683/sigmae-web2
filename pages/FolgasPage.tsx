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
    
    // Placeholder for the rest of the component's logic and JSX
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
            
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Gerenciar Folga">
                {/* Modal content would go here */}
            </Modal>
            <Modal isOpen={isDetailsModalOpen} onClose={() => setDetailsModalOpen(false)} title="Detalhes da Folga">
                 {/* Details Modal content would go here */}
            </Modal>
        </div>
    );
};

export default FolgasPage;
