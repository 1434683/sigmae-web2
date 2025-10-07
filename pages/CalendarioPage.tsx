import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Folga, Ferias, AgendaEvento, TipoEvento } from '../types';
import Modal from '../components/Modal';
import { TIPO_EVENTO_COLORS, TIPO_EVENTO_LABELS } from '../constants';
import { useCalendarData } from '../hooks/useDataFilters';

// Icons for each event type
const BookIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v2H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 4.5z"></path></svg>;
const TargetIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>;
const ShieldIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const AwardIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 17 17 23 15.79 13.88"></polyline></svg>;
const MoreHorizontalIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>;

// Icons for modal headers
// Fix: Explicitly type icon components as React.FC to allow props like className.
const ClipboardListIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
        <path d="M12 11h4"></path>
        <path d="M12 16h4"></path>
        <path d="M8 11h.01"></path>
        <path d="M8 16h.01"></path>
    </svg>
);
// Fix: Explicitly type icon components as React.FC to allow props like className.
const PlaneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
    </svg>
);
// Fix: Explicitly type icon components as React.FC to allow props like className.
const UserCheckIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>;


// Fix: Changed Record<TipoEvento, ...> to Record<string, ...> to resolve an issue
// where TipoEvento was being incorrectly inferred as `unknown` and causing an index type error.
const EVENTO_ICON_MAP: Record<string, { icon: React.FC<{ className?: string }>, style: string }> = {
    [TipoEvento.CURSO]: { icon: BookIcon, style: 'bg-indigo-500 text-white' },
    [TipoEvento.EAP]: { icon: TargetIcon, style: 'bg-purple-500 text-white' },
    [TipoEvento.OPERACAO]: { icon: ShieldIcon, style: 'bg-red-500 text-white' },
    [TipoEvento.LICENCA_PREMIO]: { icon: AwardIcon, style: 'bg-teal-500 text-white' },
    [TipoEvento.OUTRO]: { icon: MoreHorizontalIcon, style: 'bg-gray-500 text-white' },
};

const CalendarioPage: React.FC = () => {
  const { policiais } = useData();
  const { folgasAtivasPorDia, feriasPorDia, eventosAgendaPorDia } = useCalendarData();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  const filterableTypes = useMemo(() => ({
      ...TIPO_EVENTO_LABELS,
      'FOLGA': 'Folgas',
      'FERIAS': 'Férias',
  }), []);

  const filterableColors: Record<string, string> = useMemo(() => ({
      ...TIPO_EVENTO_COLORS,
      'FOLGA': 'bg-pm-blue text-white',
      'FERIAS': 'bg-green-500 text-white',
  }), []);
  
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>(
      Object.keys(filterableTypes).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );

  const handleFilterToggle = (filterKey: string) => {
      setActiveFilters(prev => ({ ...prev, [filterKey]: !prev[filterKey] }));
  };
  
  const policiaisMap = useMemo(() => new Map(policiais.map(p => [p.id, p])), [policiais]);

  const toYYYYMMDD = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];
    const startDayOfWeek = firstDayOfMonth.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setModalOpen(true);
  };
  
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const folgasDoDiaSelecionado = selectedDate && activeFilters['FOLGA'] ? folgasAtivasPorDia.get(toYYYYMMDD(selectedDate)) || [] : [];
  const feriasDoDiaSelecionado = selectedDate && activeFilters['FERIAS'] ? feriasPorDia.get(toYYYYMMDD(selectedDate)) || [] : [];
  const eventosDoDiaSelecionado = selectedDate ? (eventosAgendaPorDia.get(toYYYYMMDD(selectedDate)) || []).filter(e => activeFilters[e.tipo]) : [];

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-pm-gray-800 mb-6">Calendário Geral</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-pm-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <h2 className="text-xl font-semibold capitalize text-pm-gray-700 text-center">
            {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-pm-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
        
        <div className="p-4 mb-4 bg-pm-gray-50 rounded-lg border">
            <h3 className="text-sm font-semibold text-pm-gray-600 mb-3">Filtros de Exibição:</h3>
            <div className="flex flex-wrap gap-2">
                {Object.entries(filterableTypes).map(([key, label]) => {
                    const isActive = activeFilters[key];
                    const colorClass = filterableColors[key] || 'bg-gray-200 text-gray-800';
                    return (
                        <button
                            key={key}
                            onClick={() => handleFilterToggle(key)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 flex items-center gap-2 ${isActive ? `${colorClass} shadow-sm` : 'bg-pm-gray-200 text-pm-gray-600 hover:bg-pm-gray-300'}`}
                        >
                            <span className={`w-2.5 h-2.5 rounded-full border-2 ${isActive ? 'bg-white border-white/50' : 'bg-transparent border-current'}`}></span>
                            {label}
                        </button>
                    )
                })}
            </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2 text-center font-medium text-pm-gray-500 border-b pb-2 mb-2">
          {weekDays.map(day => <div key={day} className="py-2 text-xs sm:text-base" aria-hidden="true">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {daysInMonth.map((day, index) => {
            if (!day) return <div key={`empty-${index}`}></div>;

            const dateKey = toYYYYMMDD(day);
            const folgasDoDia = activeFilters['FOLGA'] ? (folgasAtivasPorDia.get(dateKey) || []) : [];
            const feriasDoDia = activeFilters['FERIAS'] ? (feriasPorDia.get(dateKey) || []) : [];
            const eventosDoDia = (eventosAgendaPorDia.get(dateKey) || []).filter(e => activeFilters[e.tipo]);
            
            const tiposDeEventosDoDia = Array.from(new Set(eventosDoDia.map(e => e.tipo)));
            const isToday = toYYYYMMDD(new Date()) === dateKey;
            const hasEvents = folgasDoDia.length > 0 || feriasDoDia.length > 0 || eventosDoDia.length > 0;

            let dayClasses = `h-24 w-full text-left p-1 md:p-2 rounded-lg relative transition-colors duration-200 flex flex-col justify-between group`;
            if (hasEvents) dayClasses += ' cursor-pointer'; else dayClasses += ' cursor-default';
            if (isToday) {
                dayClasses += ' bg-pm-blue text-white';
            } else if (feriasDoDia.length > 0) {
                dayClasses += ' bg-green-100 hover:bg-green-200';
            } else if (folgasDoDia.length > 0) {
                dayClasses += ' bg-pm-gray-50 hover:bg-pm-blue-light hover:text-white';
            } else if (eventosDoDia.length > 0) {
                dayClasses += ' bg-pm-gray-50 hover:bg-pm-gray-100';
            } else {
                dayClasses += ' bg-pm-gray-50 text-pm-gray-400';
            }

            return (
              <button
                key={dateKey}
                onClick={() => hasEvents && handleDayClick(day)}
                disabled={!hasEvents}
                className={dayClasses}
                aria-label={hasEvents ? `Ver eventos do dia ${day.getDate()}`: `Dia ${day.getDate()}, sem eventos`}
              >
                <span className={`font-medium text-sm md:text-base ${isToday ? "" : feriasDoDia.length > 0 ? 'text-green-900' : hasEvents ? 'text-pm-gray-800' : ''} ${folgasDoDia.length > 0 ? 'group-hover:text-white' : ''}`}>{day.getDate()}</span>
                <div className="flex-grow flex items-end justify-end flex-wrap-reverse gap-1">
                    {tiposDeEventosDoDia.map(tipo => {
                        const { icon: Icon, style } = EVENTO_ICON_MAP[tipo];
                        const count = eventosDoDia.filter(e => e.tipo === tipo).length;
                        // Fix: Cast `tipo` to `TipoEvento` to resolve index type error with `TIPO_EVENTO_LABELS`.
                        const title = `${count} ${TIPO_EVENTO_LABELS[tipo as TipoEvento]}${count > 1 ? 's' : ''}`;
                        return (
                            <span key={tipo} className={`w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-white ${style}`} title={title}>
                               <Icon className="h-4 w-4" />
                            </span>
                        );
                    })}
                    {feriasDoDia.length > 0 && (
                        <span className="text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 bg-green-500 text-white border-white" title={`${feriasDoDia.length} policiais de férias`}>
                           {feriasDoDia.length}
                        </span>
                    )}
                    {folgasDoDia.length > 0 && (
                      <span className={`text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 ${isToday ? 'bg-white text-pm-blue border-white' : 'bg-pm-blue text-white border-white group-hover:border-pm-blue-light'}`} title={`${folgasDoDia.length} policiais de folga`}>
                        {folgasDoDia.length}
                      </span>
                    )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={`Eventos de ${selectedDate?.toLocaleDateString('pt-BR')}`}>
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {eventosDoDiaSelecionado.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-pm-gray-800 mb-3 border-b pb-2 flex items-center gap-2">
                        <ClipboardListIcon className="h-5 w-5 text-pm-gray-500" />
                        Eventos Agendados
                    </h3>
                    <ul className="space-y-3">
                        {eventosDoDiaSelecionado.map(evento => {
                             const IconComponent = EVENTO_ICON_MAP[evento.tipo].icon;
                             // Fix: Cast `evento.tipo` to `TipoEvento` to resolve index type error with `TIPO_EVENTO_COLORS`.
                             const colors = TIPO_EVENTO_COLORS[evento.tipo as TipoEvento].split(' ');
                             const bgColor = colors.find(c => c.startsWith('bg-')) || 'bg-pm-gray-100';
                             const textColor = colors.find(c => c.startsWith('text-')) || 'text-pm-gray-800';

                            return (
                                <li key={evento.id} className="p-3 bg-pm-gray-50 rounded-md border border-pm-gray-200">
                                    <div className="flex items-start space-x-3">
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${bgColor}`}>
                                            <div className={textColor}>
                                                <IconComponent className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold text-pm-gray-900">{evento.titulo}</p>
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${TIPO_EVENTO_COLORS[evento.tipo as TipoEvento]}`}>{TIPO_EVENTO_LABELS[evento.tipo as TipoEvento]}</span>
                                            </div>
                                            <p className="text-sm text-pm-gray-600"><strong>Horário:</strong> {evento.horaInicio} às {evento.horaFim}</p>
                                            <p className="text-sm text-pm-gray-600"><strong>Local:</strong> {evento.local}</p>
                                        </div>
                                    </div>
                                    {evento.observacoes && <p className="text-xs mt-2 pt-2 border-t border-pm-gray-200 text-pm-gray-600"><strong>Obs:</strong> {evento.observacoes}</p>}
                                    
                                    {evento.policiaisIds.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-pm-gray-200">
                                            <h4 className="text-sm font-semibold text-pm-gray-800 mb-2">Efetivo Escalado:</h4>
                                            <ul className="space-y-1">
                                                {evento.policiaisIds.map(id => {
                                                    const policial = policiaisMap.get(id);
                                                    return policial ? (
                                                        <li key={id} className="flex justify-between items-center text-sm text-pm-gray-900 bg-white p-1.5 rounded border">
                                                            <span>{policial.postoGrad} {policial.nome}</span>
                                                            <span className="font-mono text-xs bg-pm-gray-200 text-pm-gray-800 px-2 py-0.5 rounded-full">{policial.re}</span>
                                                        </li>
                                                    ) : null;
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}

            {feriasDoDiaSelecionado.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-pm-gray-800 mb-3 border-b pb-2 flex items-center gap-2">
                       <PlaneIcon className="h-5 w-5 text-pm-gray-500" />
                       Férias Agendadas
                    </h3>
                    <ul className="space-y-2">
                        {feriasDoDiaSelecionado.map(feria => {
                          const policial = policiaisMap.get(feria.policialId);
                          return (
                            <li key={feria.id} className="p-3 bg-white rounded-md border border-green-200 shadow-sm">
                                <p className="font-semibold text-green-900">{policial?.postoGrad} {feria.nome}</p>
                                <p className="text-sm text-green-700">RE: {feria.re} - Pelotão: {feria.pelotao}</p>
                            </li>
                          );
                        })}
                    </ul>
                </div>
            )}

            {folgasDoDiaSelecionado.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-pm-gray-800 mb-3 border-b pb-2 flex items-center gap-2">
                        <UserCheckIcon className="h-5 w-5 text-pm-gray-500" />
                        Folgas Ativas
                    </h3>
                    <ul className="space-y-2">
                        {folgasDoDiaSelecionado.map(folga => {
                          const policial = policiaisMap.get(folga.policialld);
                          return (
                            <li key={folga.folgald} className="p-3 bg-white rounded-md border border-blue-200 shadow-sm">
                                <p className="font-semibold text-pm-gray-800">{policial?.postoGrad} {folga.nome}</p>
                                <p className="text-sm text-pm-gray-500">RE: {folga.re} - Pelotão: {folga.pelotao}</p>
                            </li>
                          );
                        })}
                    </ul>
                </div>
            )}

            {feriasDoDiaSelecionado.length === 0 && folgasDoDiaSelecionado.length === 0 && eventosDoDiaSelecionado.length === 0 && (
                <p className="text-pm-gray-600 text-center py-4">Nenhum evento para este dia.</p>
            )}
        </div>
      </Modal>
    </div>
  );
};

export default CalendarioPage;
