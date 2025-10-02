import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { StatusFolga, Aprovacao, TipoEvento } from '../../types';
import { TIPO_EVENTO_LABELS } from '../../constants';

// Icons
const BriefcaseIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>;
const ClipboardCheckIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="m9 14 2 2 4-4"></path></svg>;
const CalendarCheckIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m9 16 2 2 4-4"></path></svg>;
const PlaneIcon: React.FC<{ className?: string }> = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>;
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const TargetIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>;

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

export default SubordinadoDashboardSummary;
