import React, { useState, useEffect, useMemo } from 'react';
import { StatusFolga, Aprovacao, AgendaEvento, Folga, Ferias, Policial, FeriasStatus, TipoEvento } from '../types';
import DashboardCard from '../components/DashboardCard';
import { POSTOS_GRADS, TIPO_EVENTO_LABELS } from '../constants';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useDataFilters';
import { useData } from '../contexts/DataContext';

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const SwapIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="8 21 3 21 3 16"></polyline><line x1="20" y1="4" x2="3" y2="21"></line></svg>;
const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;

// --- Ícones para os resumos ---
const BriefcaseIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>;
const ClipboardCheckIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="m9 14 2 2 4-4"></path></svg>;
const CalendarCheckIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m9 16 2 2 4-4"></path></svg>;
const PlaneIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>;
const InboxIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>;
const BookIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v2H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 4.5z"></path></svg>;
const TargetIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>;

const AwardIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 17 17 23 15.79 13.88"></polyline></svg>;


interface SummaryItemProps {
  icon: React.ReactNode;
  title: string;
  date: string;
  details?: string;
  link?: string;
  colorClass: string;
}

const SummaryItem: React.FC<SummaryItemProps> = ({ icon, title, date, details, link, colorClass }) => {
  const content = (
    <div className="flex items-start space-x-4 p-3 hover:bg-pm-gray-50 rounded-lg transition-colors duration-150">
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-pm-gray-800">{title}</p>
        <p className="text-sm text-pm-gray-600">{date}</p>
        {details && <p className="text-xs text-pm-gray-500 mt-1">{details}</p>}
      </div>
    </div>
  );
  
  return link ? <Link to={link}>{content}</Link> : <div>{content}</div>;
};

const SubordinadoDashboardSummary: React.FC = () => {
    const { currentUser } = useAuth();
    const { agendaEventos, folgas, ferias } = useData();

    const weeklySummary = useMemo(() => {
        if (!currentUser?.policialId) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const items: SummaryItemProps[] = [];

        // Próximos eventos da agenda
        agendaEventos.forEach(evento => {
            const eventoDate = new Date(evento.data + 'T12:00:00');
            if (evento.policiaisIds.includes(currentUser.policialId!) && eventoDate >= today && eventoDate <= nextWeek) {
                items.push({
                    icon: evento.tipo === 'OPERACAO' ? <BriefcaseIcon className="h-5 w-5 text-white" /> : <ClipboardCheckIcon className="h-5 w-5 text-white" />,
                    title: evento.titulo,
                    date: `${eventoDate.toLocaleDateString('pt-BR')} das ${evento.horaInicio} às ${evento.horaFim}`,
                    details: `Tipo: ${TIPO_EVENTO_LABELS[evento.tipo]}`,
                    link: '/calendario',
                    colorClass: 'bg-pm-blue'
                });
            }
        });

        // Próximas folgas e férias
        folgas.forEach(folga => {
            const folgaDate = new Date(folga.data + 'T12:00:00');
            if (folga.policialld === currentUser.policialId && folga.status === StatusFolga.ATIVA && folga.aprovacao === Aprovacao.VALIDADA_ADMIN && folgaDate >= today && folgaDate <= nextWeek) {
                items.push({
                    icon: <CalendarCheckIcon className="h-5 w-5 text-white" />,
                    title: 'Folga Programada',
                    date: folgaDate.toLocaleDateString('pt-BR'),
                    link: '/folgas',
                    colorClass: 'bg-green-500'
                });
            }
        });

        ferias.forEach(f => {
            const inicio = new Date(f.dataInicio + 'T12:00:00');
            const fim = new Date(f.dataFim + 'T12:00:00');
            if (f.policialId === currentUser.policialId && inicio <= nextWeek && fim >= today) {
                items.push({
                    icon: <PlaneIcon className="h-5 w-5 text-white" />,
                    title: 'Férias',
                    date: `${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}`,
                    link: '/ferias',
                    colorClass: 'bg-teal-500'
                });
            }
        });

        // Folgas pendentes de aprovação
        folgas.forEach(folga => {
            if (folga.policialld === currentUser.policialId && folga.aprovacao === Aprovacao.ENVIADA_SARGENTO) {
                 items.push({
                    icon: <ClockIcon className="h-5 w-5 text-white" />,
                    title: 'Folga Aguardando Aprovação',
                    date: `Solicitada para ${new Date(folga.data + 'T12:00:00').toLocaleDateString('pt-BR')}`,
                    link: `/folgas?aprovacao=${Aprovacao.ENVIADA_SARGENTO}`,
                    colorClass: 'bg-yellow-500'
                });
            }
        });

        return items.sort((a, b) => new Date(a.date.split(' ')[0].split('/').reverse().join('-')).getTime() - new Date(b.date.split(' ')[0].split('/').reverse().join('-')).getTime());
    }, [currentUser, agendaEventos, folgas, ferias]);
    
    const eapStatus = useMemo(() => {
        if (!currentUser?.policialId) return null;

        const userEAPs = agendaEventos
            .filter(e => e.tipo === TipoEvento.EAP && e.policiaisIds.includes(currentUser.policialId!))
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        
        if (userEAPs.length > 0) {
            const lastEAP = userEAPs[0];
            return {
                status: 'Concluído',
                date: new Date(lastEAP.data + 'T12:00:00').toLocaleDateString('pt-BR'),
                details: lastEAP.titulo,
            };
        } else {
            return {
                status: 'Pendente',
                date: null,
                details: 'Aguardando escalonamento para o próximo EAP.',
            };
        }
    }, [currentUser, agendaEventos]);
    
    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-bold text-pm-gray-800 mb-4">Próximos 7 Dias: Suas Atividades e Ausências</h2>
                {weeklySummary.length > 0 ? (
                    <div className="space-y-2">
                        {weeklySummary.map((item, index) => <SummaryItem key={index} {...item} />)}
                    </div>
                ) : (
                    <p className="text-pm-gray-600">Nenhuma atividade agendada para os próximos 7 dias.</p>
                )}
            </div>

            {eapStatus && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    <h2 className="text-xl font-bold text-pm-gray-800 mb-4 flex items-center gap-2">
                        <TargetIcon className="h-6 w-6 text-purple-600" />
                        Status do seu EAP (Estágio de Aperfeiçoamento Profissional)
                    </h2>
                    <div className={`flex items-center p-4 rounded-lg ${eapStatus.status === 'Concluído' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border`}>
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${eapStatus.status === 'Concluído' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                            {eapStatus.status === 'Concluído' 
                                ? <CheckIcon className="h-6 w-6 text-green-600"/>
                                : <ClockIcon className="h-6 w-6 text-yellow-600"/>
                            }
                        </div>
                        <div className="ml-4">
                            <p className={`font-bold text-lg ${eapStatus.status === 'Concluído' ? 'text-green-800' : 'text-yellow-800'}`}>
                                {eapStatus.status}
                            </p>
                            <p className="text-sm text-pm-gray-600">
                                {eapStatus.status === 'Concluído' ? `Última participação em ${eapStatus.date} (${eapStatus.details})` : eapStatus.details}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

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


const DashboardPage: React.FC = () => {
  const { role, currentUser } = useAuth();
  const { ferias, agendaEventos, getBalanceFor, grupos } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    mes: searchParams.get('mes') || '',
    pelotao: searchParams.get('pelotao') || '',
    postoGrad: searchParams.get('postoGrad') || '',
  });
  
  const { stats, reasonChartData, mesesDisponiveis } = useDashboardData(filters);
  
  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    if(filters.mes) newSearchParams.set('mes', filters.mes);
    if(filters.pelotao) newSearchParams.set('pelotao', filters.pelotao);
    if(filters.postoGrad) newSearchParams.set('postoGrad', filters.postoGrad);
    setSearchParams(newSearchParams);
  }, [filters, setSearchParams]);

  const pelotoesOrdenados = useMemo(() => [...grupos].sort((a, b) => a.nome.localeCompare(b.nome)), [grupos]);
  const currentYear = new Date().getFullYear();
  const meuSaldo = currentUser?.policialId ? getBalanceFor(currentUser.policialId, currentYear) : null;

  const adminMonthlyStats = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const currentMonthStart = new Date(year, month, 1);
    const currentMonthEnd = new Date(year, month + 1, 0);

    const policiaisEmFerias = new Set<number>();
    ferias.forEach(f => {
        if (f.status === FeriasStatus.AGENDADA) {
            const inicio = new Date(f.dataInicio + 'T12:00:00');
            const fim = new Date(f.dataFim + 'T12:00:00');
            if (inicio <= currentMonthEnd && fim >= currentMonthStart) {
                policiaisEmFerias.add(f.policialId);
            }
        }
    });

    const policiaisEmEAP = new Set<number>();
    const policiaisEmCurso = new Set<number>();
    agendaEventos.forEach(evento => {
        const eventoDate = new Date(evento.data + 'T12:00:00');
        if (eventoDate.getFullYear() === year && eventoDate.getMonth() === month) {
            if (evento.tipo === TipoEvento.EAP) {
                evento.policiaisIds.forEach(id => policiaisEmEAP.add(id));
            } else if (evento.tipo === TipoEvento.CURSO) {
                evento.policiaisIds.forEach(id => policiaisEmCurso.add(id));
            }
        }
    });

    return {
        feriasMesCorrente: policiaisEmFerias.size,
        eapMesCorrente: policiaisEmEAP.size,
        cursoMesCorrente: policiaisEmCurso.size
    };
  }, [ferias, agendaEventos]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({...prev, [name]: value}));
  };

  const totalFolgasCardTheme = {
    ADMIN: { color: 'bg-pm-blue-light bg-opacity-20', icon: 'text-pm-blue' },
    SARGENTO: { color: 'bg-red-100', icon: 'text-pm-red-dark' },
    SUBORDINADO: { color: 'bg-pm-gray-200', icon: 'text-pm-gray-800' },
  };
  const cardTheme = totalFolgasCardTheme[role || 'SUBORDINADO'];
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-pm-gray-800">Página Inicial</h1>
      <p className="text-lg text-pm-gray-600 mb-6">Bem-vindo, {currentUser?.nome}!</p>
      
      {currentUser?.policialId && meuSaldo !== null && (
        <div className="mb-8 max-w-sm">
             <DashboardCard 
                title={`MEU SALDO DE FOLGAS (${currentYear})`}
                value={meuSaldo}
                icon={<AwardIcon className={meuSaldo > 0 ? "text-green-600" : "text-red-600"}/>} 
                color={meuSaldo > 0 ? "bg-green-100" : "bg-red-100"}
                onClick={() => navigate('/folgas')} 
            />
        </div>
      )}

      {role === 'SUBORDINADO' && <SubordinadoDashboardSummary />}
      {role === 'SARGENTO' && <SargentoDashboardSummary />}

      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="mes" className="block text-sm font-medium text-pm-gray-700">Mês</label>
            <select id="mes" name="mes" value={filters.mes} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-pm-gray-300 focus:outline-none focus:ring-pm-blue focus:border-pm-blue sm:text-sm rounded-md">
              <option value="">Todos os Meses</option>
              {mesesDisponiveis.map(mes => <option key={mes} value={mes}>{new Date(mes + '-02').toLocaleString('pt-BR', {month: 'long', year: 'numeric'})}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pelotao" className="block text-sm font-medium text-pm-gray-700">Grupo/Pelotão</label>
            <select id="pelotao" name="pelotao" value={filters.pelotao} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-pm-gray-300 focus:outline-none focus:ring-pm-blue focus:border-pm-blue sm:text-sm rounded-md">
              <option value="">Todos os Grupos</option>
              {pelotoesOrdenados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="postoGrad" className="block text-sm font-medium text-pm-gray-700">Posto/Grad.</label>
            <select id="postoGrad" name="postoGrad" value={filters.postoGrad} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-pm-gray-300 focus:outline-none focus:ring-pm-blue focus:border-pm-blue sm:text-sm rounded-md">
                <option value="">Todos os Postos/Grads</option>
                {POSTOS_GRADS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {role === 'ADMIN' && (
        <>
            <h2 className="text-xl font-semibold text-pm-gray-700 mb-4">Resumo do Mês Corrente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <DashboardCard 
                    title="POLICIAIS DE FÉRIAS" 
                    value={adminMonthlyStats.feriasMesCorrente} 
                    icon={<PlaneIcon className="text-teal-600"/>} 
                    color="bg-teal-100" 
                    onClick={() => navigate('/ferias')} 
                />
                <DashboardCard 
                    title="EM EAP" 
                    value={adminMonthlyStats.eapMesCorrente} 
                    icon={<TargetIcon className="text-purple-600"/>} 
                    color="bg-purple-100" 
                    onClick={() => navigate('/agenda')} 
                />
                <DashboardCard 
                    title="EM CURSO" 
                    value={adminMonthlyStats.cursoMesCorrente} 
                    icon={<BookIcon className="text-indigo-600"/>} 
                    color="bg-indigo-100" 
                    onClick={() => navigate('/agenda')} 
                />
            </div>
        </>
      )}

      <h2 className="text-xl font-semibold text-pm-gray-700 mb-4">Resumo Oficial (Folgas Validadas)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard title="TOTAL DE FOLGAS" value={stats.total} icon={<CalendarIcon className={cardTheme.icon}/>} color={cardTheme.color} onClick={() => navigate(`/folgas?aprovacao=${Aprovacao.VALIDADA_ADMIN}`)} />
        <DashboardCard title="ATIVAS" value={stats.ativas} icon={<CheckIcon className="text-green-600"/>} color="bg-green-100" onClick={() => navigate(`/folgas?aprovacao=${Aprovacao.VALIDADA_ADMIN}&status=${StatusFolga.ATIVA}`)} />
        <DashboardCard title="TROCADAS" value={stats.trocadas} icon={<SwapIcon className="text-yellow-600"/>} color="bg-yellow-100" onClick={() => navigate(`/folgas?aprovacao=${Aprovacao.VALIDADA_ADMIN}&status=${StatusFolga.TROCADA}`)} />
        <DashboardCard title="EXCLUÍDAS" value={stats.excluidas} icon={<XCircleIcon className="text-red-600"/>} color="bg-red-100" onClick={() => navigate(`/folgas?aprovacao=${Aprovacao.VALIDADA_ADMIN}&status=${StatusFolga.EXCLUIDA}`)} />
      </div>

      <h2 className="text-xl font-semibold text-pm-gray-700 mb-4">Pendências</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard title="PENDENTES SARGENTO" value={stats.pendenteSgt} icon={<ClockIcon className="text-orange-600"/>} color="bg-orange-100" onClick={() => navigate(`/folgas?aprovacao=${Aprovacao.ENVIADA_SARGENTO}`)} />
        <DashboardCard title="PENDENTES ADMIN" value={stats.pendenteAdmin} icon={<ClockIcon className="text-cyan-600"/>} color="bg-cyan-100" onClick={() => navigate(`/folgas?aprovacao=${Aprovacao.APROVADA_SARGENTO}`)} />
      </div>

      <div className="mt-8">
          <h2 className="text-xl font-semibold text-pm-gray-700 mb-4">Análise de Motivos de Folga</h2>
          <div className="bg-white p-6 rounded-lg shadow-md">
              {reasonChartData.length > 0 ? (
                  <div>
                      <h3 className="font-semibold text-pm-gray-800 mb-4">Principais Motivos de Folga</h3>
                      <div className="space-y-3">
                          {reasonChartData.map(({ category, count }, index) => {
                              const maxCount = reasonChartData[0].count;
                              const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                              return (
                                  <div key={index} className="grid grid-cols-12 gap-4 items-center text-sm">
                                      <div className="col-span-3 text-pm-gray-600 font-medium truncate">{category}</div>
                                      <div className="col-span-9">
                                          <div className="w-full bg-pm-gray-200 rounded-full h-6 relative">
                                              <div
                                                  className="bg-pm-blue h-6 rounded-full flex items-center"
                                                  style={{ width: `${barWidth}%`, minWidth: '35px' }}
                                                  role="progressbar"
                                                  aria-valuenow={count}
                                                  aria-valuemin={0}
                                                  aria-valuemax={maxCount}
                                                  aria-label={`${category}: ${count}`}
                                              >
                                                  <span className="font-bold text-white pl-2">{count}</span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                  </div>
              ) : (
                  <div className="text-center py-8 border-2 border-dashed border-pm-gray-200 rounded-lg">
                      <p className="text-pm-gray-600">Não há motivos de folga para exibir no período selecionado.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default DashboardPage;