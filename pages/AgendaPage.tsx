import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { AgendaEvento, TipoEvento, Policial, FeriasStatus } from '../types';
import Modal from '../components/Modal';
import { TIPO_EVENTO_LABELS, TIPO_EVENTO_COLORS } from '../constants';
import { useSortedAgendaEventos } from '../hooks/useDataFilters';

const Toast: React.FC<{ message: string; type?: 'success' | 'error' }> = ({ message, type = 'success' }) => {
  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  return (
    <div className={`fixed top-20 right-8 text-white py-3 px-5 rounded-lg shadow-xl z-50 flex items-center ${bgColor}`} role="alert" aria-live="assertive">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
      <span>{message}</span>
    </div>
  );
};

const EVENTO_ICONS: Record<TipoEvento, React.ReactNode> = {
    [TipoEvento.CURSO]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-indigo-600"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v2H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 4.5z"></path></svg>,
    [TipoEvento.EAP]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-purple-600"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
    [TipoEvento.OPERACAO]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-red-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
    [TipoEvento.LICENCA_PREMIO]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-teal-600"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 17 17 23 15.79 13.88"></polyline></svg>,
    [TipoEvento.OUTRO]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-gray-600"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>,
};


const AgendaPage: React.FC = () => {
    const { agendaEventos, policiais, addAgendaEvento, updateAgendaEvento, deleteAgendaEvento, ferias } = useData();
    const { currentUser } = useAuth();

    const [isModalOpen, setModalOpen] = useState(false);
    const [currentEvento, setCurrentEvento] = useState<Partial<AgendaEvento> | null>(null);
    const [selectedPoliciais, setSelectedPoliciais] = useState<Set<number>>(new Set());
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [policialSearch, setPolicialSearch] = useState('');
    const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsEvento, setDetailsEvento] = useState<AgendaEvento | null>(null);

    const policiaisMap = useMemo(() => new Map<number, Policial>(policiais.map(p => [p.id, p])), [policiais]);
    const sortedEventos = useSortedAgendaEventos();

    const eapParticipants = useMemo(() => new Set<number>(agendaEventos.filter(e => e.tipo === TipoEvento.EAP).flatMap(e => e.policiaisIds)), [agendaEventos]);
    const courseParticipants = useMemo(() => new Set<number>(agendaEventos.filter(e => e.tipo === TipoEvento.CURSO).flatMap(e => e.policiaisIds)), [agendaEventos]);

    const filteredPoliciaisParaSelecao = useMemo(() => {
        let policeList = policiais.filter(p => p.ativo);
        if (policialSearch.trim()) {
            const searchLower = policialSearch.toLowerCase();
            policeList = policeList.filter(p => p.re.toLowerCase().includes(searchLower) || p.nome.toLowerCase().includes(searchLower) || p.pelotao.toLowerCase().includes(searchLower));
        }
        if (isModalOpen && currentEvento && (currentEvento.tipo === TipoEvento.EAP || currentEvento.tipo === TipoEvento.CURSO)) {
            const participants = currentEvento.tipo === TipoEvento.EAP ? eapParticipants : courseParticipants;
            const currentlySelected = new Set(currentEvento.policiaisIds || []);
            policeList = policeList.filter(p => !participants.has(p.id) || currentlySelected.has(p.id));
        }
        return policeList.sort((a,b) => a.nome.localeCompare(b.nome));
    }, [policiais, policialSearch, isModalOpen, currentEvento, eapParticipants, courseParticipants]);

    useEffect(() => {
        if (toast) { const timer = setTimeout(() => setToast(null), 4000); return () => clearTimeout(timer); }
    }, [toast]);

    const handleShowDetails = (evento: AgendaEvento) => { setDetailsEvento(evento); setDetailsModalOpen(true); };

    const openModal = (evento: Partial<AgendaEvento> | null = null) => {
        if (evento) {
            setCurrentEvento({ ...evento });
            setSelectedPoliciais(new Set(evento.policiaisIds || []));
        } else {
            setCurrentEvento({ tipo: TipoEvento.OPERACAO, titulo: '', data: new Date().toISOString().split('T')[0], horaInicio: '08:00', horaFim: '17:00', local: '', observacoes: '' });
            setSelectedPoliciais(new Set());
        }
        setPolicialSearch('');
        setModalOpen(true);
    };

    const handlePoliceSelection = (policialId: number) => {
        setSelectedPoliciais(prev => { const newSet = new Set(prev); newSet.has(policialId) ? newSet.delete(policialId) : newSet.add(policialId); return newSet; });
    };
    
    const handleDelete = async (evento: AgendaEvento) => {
        if (!currentUser || !window.confirm(`Excluir evento "${evento.titulo}"?`)) return;
        await deleteAgendaEvento(evento.id, currentUser);
        setToast({ message: 'Evento excluído!', type: 'success'});
    };

    const handleSave = async () => {
        if (!currentEvento || !currentUser) return;
        try {
            if (!currentEvento.titulo?.trim()) throw new Error('Título é obrigatório.');
            if (!currentEvento.local?.trim()) throw new Error('Local é obrigatório.');
            if (selectedPoliciais.size === 0) throw new Error('Selecione ao menos um policial.');

            const eventoData = { ...currentEvento, policiaisIds: Array.from(selectedPoliciais) };
            const eventoDate = new Date(eventoData.data + 'T12:00:00');

            for (const policialId of selectedPoliciais) {
                const policial = policiaisMap.get(policialId);
                if (!policial) continue;

                const feriasConflitante = ferias.find(f => f.policialId === policialId && f.status === FeriasStatus.AGENDADA && eventoDate >= new Date(f.dataInicio + 'T12:00') && eventoDate <= new Date(f.dataFim + 'T12:00'));
                if (feriasConflitante) throw new Error(`Conflito: ${policial.postoGrad} ${policial.nome} está de férias.`);

                const outrosEventosNoDia = agendaEventos.filter(e => e.data === eventoData.data && e.id !== eventoData.id && e.policiaisIds.includes(policialId));
                if (outrosEventosNoDia.length > 0) throw new Error(`Conflito: ${policial.postoGrad} ${policial.nome} já está em outro evento no dia.`);
            }

            if (eventoData.id) {
                // Fix: Cast `eventoData.id` to String to ensure the correct type is passed to the function.
                await updateAgendaEvento(String(eventoData.id), eventoData, currentUser);
                setToast({ message: 'Evento atualizado!', type: 'success' });
            } else {
                await addAgendaEvento(eventoData as Omit<AgendaEvento, 'id' | 'criadoEm' | 'criadoPorId' | 'atualizadoEm'>, currentUser);
                setToast({ message: 'Evento criado!', type: 'success' });
            }
            setModalOpen(false);
        } catch (err: any) {
            setToast({ message: err.message, type: 'error' });
        }
    };

    return (
        <div className="container mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} />}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6"><h1 className="text-3xl font-bold text-pm-gray-800">Agenda</h1><button onClick={() => openModal()} className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Adicionar Evento</button></div>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto"><table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-pm-gray-50"><tr><th className="px-6 py-3">Evento</th><th className="px-6 py-3">Data/Hora</th><th className="px-6 py-3">Efetivo</th><th className="px-6 py-3 text-right">Ações</th></tr></thead>
                <tbody>{sortedEventos.map(evento => (<tr key={evento.id} className="bg-white border-b hover:bg-pm-gray-50 cursor-pointer" onClick={() => handleShowDetails(evento)}>
                    <td className="px-6 py-4 align-top"><div className="flex items-start space-x-3"><div>{EVENTO_ICONS[evento.tipo]}</div><div><p className="font-semibold text-base">{evento.titulo}</p><div className="flex items-center gap-2 mt-1"><span className={`px-2 py-1 text-xs rounded-full ${TIPO_EVENTO_COLORS[evento.tipo]}`}>{TIPO_EVENTO_LABELS[evento.tipo]}</span><span className="text-xs text-pm-gray-500">Local: {evento.local}</span></div>{evento.observacoes && (<div className="mt-2 text-xs bg-pm-gray-50 p-2 rounded border"><p className="font-semibold">Obs:</p><p className="whitespace-pre-wrap">{evento.observacoes}</p></div>)}</div></div></td>
                    <td className="px-6 py-4 align-top">{new Date(evento.data + 'T12:00').toLocaleDateString()}<br/><span className="text-xs">{evento.horaInicio} - {evento.horaFim}</span></td>
                    <td className="px-6 py-4 align-top"><ul className="space-y-1">{evento.policiaisIds.map(id => { const p = policiaisMap.get(id); return p ? (<li key={id} className="text-xs whitespace-nowrap"><span className="font-semibold">{p.postoGrad} {p.nome}</span> ({p.re})</li>) : null;})}</ul></td>
                    <td className="px-6 py-4 text-right space-x-2 align-top" onClick={(e) => e.stopPropagation()}><button onClick={() => openModal(evento)} className="font-medium text-pm-blue hover:underline">Editar</button><button onClick={() => handleDelete(evento)} className="font-medium text-red-600 hover:underline">Excluir</button></td>
                </tr>))}</tbody>
            </table>{sortedEventos.length === 0 && <p className="text-center p-4">Nenhum evento agendado.</p>}</div>
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={currentEvento?.id ? 'Editar Evento' : 'Adicionar Evento'}>
                {currentEvento && (<form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                    <div className="space-y-4">
                        <div><label className="block text-sm">Tipo</label><select name="tipo" value={currentEvento.tipo} onChange={(e) => setCurrentEvento({...currentEvento, tipo: e.target.value as TipoEvento })} className="mt-1 w-full border rounded-md p-2" required>{Object.entries(TIPO_EVENTO_LABELS).map(([k, l]) => (<option key={k} value={k}>{l}</option>))}</select></div>
                        <div><label className="block text-sm">Título</label><input type="text" value={currentEvento.titulo || ''} onChange={(e) => setCurrentEvento({...currentEvento, titulo: e.target.value })} className="mt-1 w-full border rounded-md p-2" required /></div>
                    </div>
                    <div><label className="block text-sm mb-1">Data/Hora</label><div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-pm-gray-50">
                        <div><label className="text-xs">Data</label><input type="date" value={currentEvento.data || ''} onChange={(e) => setCurrentEvento({...currentEvento, data: e.target.value })} className="mt-1 w-full border rounded-md p-2" required /></div>
                        <div><label className="text-xs">Início</label><input type="time" value={currentEvento.horaInicio || ''} onChange={(e) => setCurrentEvento({...currentEvento, horaInicio: e.target.value })} className="mt-1 w-full border rounded-md p-2" required /></div>
                        <div><label className="text-xs">Fim</label><input type="time" value={currentEvento.horaFim || ''} onChange={(e) => setCurrentEvento({...currentEvento, horaFim: e.target.value })} className="mt-1 w-full border rounded-md p-2" required /></div>
                    </div></div>
                    <div><label className="block text-sm">Local</label><input type="text" value={currentEvento.local || ''} onChange={(e) => setCurrentEvento({...currentEvento, local: e.target.value })} className="mt-1 w-full border rounded-md p-2" required /></div>
                    <div><label className="block text-sm">Efetivo</label><div className="mt-1 p-3 border rounded-md space-y-3 bg-pm-gray-50">
                        <input type="text" placeholder="Buscar..." value={policialSearch} onChange={(e) => setPolicialSearch(e.target.value)} className="w-full border rounded-md p-2"/>
                        {(currentEvento.tipo === TipoEvento.EAP || currentEvento.tipo === TipoEvento.CURSO) && (<div className="text-xs text-blue-700 bg-blue-100 p-2 rounded-md border">Apenas policiais que ainda não participaram são listados.</div>)}
                        <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1 bg-white">{filteredPoliciaisParaSelecao.length > 0 ? (filteredPoliciaisParaSelecao.map(p => (<label key={p.id} className="flex items-center space-x-3 p-2 rounded hover:bg-pm-gray-100 cursor-pointer"><input type="checkbox" checked={selectedPoliciais.has(p.id)} onChange={() => handlePoliceSelection(p.id)} className="h-5 w-5"/><span className="text-base">{p.postoGrad} {p.nome} ({p.re})</span></label>))) : <p className="text-center text-sm p-4">Nenhum policial.</p>}</div>
                        {selectedPoliciais.size > 0 && (<div><h4 className="text-xs font-semibold uppercase mt-2">Selecionados ({selectedPoliciais.size})</h4><div className="flex flex-wrap gap-2 p-2 mt-1 rounded-md bg-white border">{Array.from(selectedPoliciais).map(id => { const p = policiaisMap.get(id); return p ? (<span key={id} className="bg-pm-blue text-white text-sm font-medium px-3 py-1 rounded-full flex items-center shadow">{p.nome}<button type="button" onClick={() => handlePoliceSelection(id)} className="ml-2 font-bold opacity-75 hover:opacity-100">&times;</button></span>) : null; })}</div></div>)}
                    </div></div>
                    <div><label className="block text-sm">Observações</label><textarea value={currentEvento.observacoes || ''} onChange={(e) => setCurrentEvento({...currentEvento, observacoes: e.target.value })} rows={3} className="mt-1 w-full border rounded-md p-2" /></div>
                    <div className="flex justify-end pt-4 space-x-2"><button type="button" onClick={() => setModalOpen(false)} className="bg-pm-gray-200 hover:bg-pm-gray-300 font-bold py-2 px-4 rounded-md">Cancelar</button><button type="submit" className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">Salvar</button></div>
                </form>)}
            </Modal>
            <Modal isOpen={isDetailsModalOpen} onClose={() => setDetailsModalOpen(false)} title="Detalhes do Evento">
                {detailsEvento && (<div className="space-y-4 text-sm">
                    <div><span className={`px-2 py-1 text-xs rounded-full float-right ${TIPO_EVENTO_COLORS[detailsEvento.tipo]}`}>{TIPO_EVENTO_LABELS[detailsEvento.tipo]}</span><h2 className="text-xl font-bold">{detailsEvento.titulo}</h2><p className="text-pm-gray-500">{detailsEvento.local}</p></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-pm-gray-50 rounded-md border"><div><p className="font-semibold">Data:</p><p>{new Date(detailsEvento.data + 'T12:00').toLocaleDateString()}</p></div><div><p className="font-semibold">Horário:</p><p>{detailsEvento.horaInicio} às {detailsEvento.horaFim}</p></div></div>
                    {detailsEvento.observacoes && (<div><p className="font-semibold">Observações:</p><p className="p-3 bg-pm-gray-50 rounded-md mt-1 whitespace-pre-wrap border">{detailsEvento.observacoes}</p></div>)}
                    <div><h3 className="font-semibold mb-2">Efetivo ({detailsEvento.policiaisIds.length})</h3><ul className="space-y-2 max-h-60 overflow-y-auto p-2 bg-pm-gray-50 rounded-md border">{detailsEvento.policiaisIds.map(id => {const p = policiaisMap.get(id); return p ? (<li key={id} className="flex justify-between items-center bg-white p-2 rounded-md shadow-sm"><span>{p.postoGrad} {p.nome}</span><span className="font-mono text-xs bg-pm-gray-200 px-2 py-0.5 rounded-full">{p.re}</span></li>) : null;})}</ul></div>
                    <div className="flex justify-end pt-4"><button type="button" onClick={() => setDetailsModalOpen(false)} className="bg-pm-gray-200 hover:bg-pm-gray-300 font-bold py-2 px-4 rounded-md">Fechar</button></div>
                </div>)}
            </Modal>
        </div>
    );
};

export default AgendaPage;
