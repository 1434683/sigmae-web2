import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { StatusFolga, Aprovacao, AgendaEvento, Policial } from '../../types';

// Icons
const BriefcaseIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>;
const CalendarCheckIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m9 16 2 2 4-4"></path></svg>;
const InboxIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>;

const SargentoDashboardSummary: React.FC = () => {
    const { currentUser } = useAuth();
    const { folgas, ferias, agendaEventos, policiais } = useData();
    const navigate = useNavigate();

    const platoonSummary = useMemo(() => {
        if (!currentUser?.pelotao) return { pendentes: [], proximosEventos: [], proximasAusencias: [] };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const platoonMembers = new Set(policiais.filter(p => p.pelotao === currentUser.pelotao).map(p => p.id));

        const pendentes = folgas.filter(f => f.aprovacao === Aprovacao.ENVIADA_SARGENTO && f.pelotao === currentUser.pelotao);

        const proximosEventos = agendaEventos
            .filter(e => {
                const eventoDate = new Date(e.data + 'T12:00:00');
                return eventoDate >= today && eventoDate <= nextWeek && e.policiaisIds.some(id => platoonMembers.has(id));
            })
            .flatMap(e => 
                e.policiaisIds
                 .filter(id => platoonMembers.has(id))
                 .map(id => ({ policial: policiais.find(p => p.id === id), evento: e }))
            )
            .filter(item => item.policial) as { policial: Policial, evento: AgendaEvento }[];

        const proximasAusencias: { policial: Policial, tipo: 'Folga' | 'Férias', data: string }[] = [];
        folgas.forEach(f => {
            const folgaDate = new Date(f.data + 'T12:00:00');
            if(f.status === StatusFolga.ATIVA && f.aprovacao === Aprovacao.VALIDADA_ADMIN && platoonMembers.has(f.policialld) && folgaDate >= today && folgaDate <= nextWeek) {
                proximasAusencias.push({ policial: policiais.find(p => p.id === f.policialld)!, tipo: 'Folga', data: folgaDate.toLocaleDateString('pt-BR') });
            }
        });
        ferias.forEach(f => {
            const inicio = new Date(f.dataInicio + 'T12:00:00');
            const fim = new Date(f.dataFim + 'T12:00:00');
            if (platoonMembers.has(f.policialId) && inicio <= nextWeek && fim >= today) {
                proximasAusencias.push({ policial: policiais.find(p => p.id === f.policialId)!, tipo: 'Férias', data: `${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}` });
            }
        });

        return { pendentes, proximosEventos, proximasAusencias: proximasAusencias.sort((a,b) => new Date(a.data.split(' ')[0].split('/').reverse().join('-')).getTime() - new Date(b.data.split(' ')[0].split('/').reverse().join('-')).getTime()) };

    }, [currentUser, folgas, ferias, agendaEventos, policiais]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-bold text-pm-gray-800 mb-4">Painel do Sargento ({currentUser?.pelotao})</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Coluna 1: Pendências */}
                <div>
                    <h3 className="font-semibold text-pm-gray-700 border-b pb-2 mb-3 flex items-center">
                        <InboxIcon className="h-5 w-5 mr-2 text-pm-red-dark"/> Aprovações Pendentes ({platoonSummary.pendentes.length})
                    </h3>
                    <div className="space-y-3">
                        {platoonSummary.pendentes.length > 0 ? platoonSummary.pendentes.map(f => (
                            <Link key={f.folgald} to={`/folgas?aprovacao=${Aprovacao.ENVIADA_SARGENTO}`} className="block p-2 bg-pm-red-100/50 hover:bg-pm-red-100 rounded-lg border border-pm-red-200">
                                <p className="font-semibold text-sm text-pm-red-800">{f.nome}</p>
                                <p className="text-xs text-pm-gray-600">Para {new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                            </Link>
                        )) : <p className="text-sm text-pm-gray-500">Nenhuma pendência.</p>}
                    </div>
                </div>

                {/* Coluna 2: Eventos */}
                <div>
                    <h3 className="font-semibold text-pm-gray-700 border-b pb-2 mb-3 flex items-center">
                        <BriefcaseIcon className="h-5 w-5 mr-2 text-pm-blue"/> Efetivo em Eventos (Próx. 7 dias)
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {platoonSummary.proximosEventos.length > 0 ? platoonSummary.proximosEventos.map((item, i) => (
                           <div key={i} className="p-2 border-b">
                               <p className="font-semibold text-sm">{item.policial.nome}</p>
                               <p className="text-xs text-pm-gray-600">{item.evento.titulo} em {new Date(item.evento.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                           </div>
                        )) : <p className="text-sm text-pm-gray-500">Nenhum policial em eventos.</p>}
                    </div>
                </div>
                
                {/* Coluna 3: Ausências */}
                <div>
                    <h3 className="font-semibold text-pm-gray-700 border-b pb-2 mb-3 flex items-center">
                        <CalendarCheckIcon className="h-5 w-5 mr-2 text-green-600"/> Próximas Folgas e Férias
                    </h3>
                     <div className="space-y-2 max-h-60 overflow-y-auto">
                        {platoonSummary.proximasAusencias.length > 0 ? platoonSummary.proximasAusencias.map((item, i) => (
                           <div key={i} className="p-2 border-b">
                               <p className="font-semibold text-sm">{item.policial.nome}</p>
                               <p className="text-xs text-pm-gray-600">{item.tipo} em {item.data}</p>
                           </div>
                        )) : <p className="text-sm text-pm-gray-500">Nenhuma ausência programada.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SargentoDashboardSummary;
