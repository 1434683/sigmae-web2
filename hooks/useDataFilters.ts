import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Policial, Folga, Historico, Ferias, AgendaEvento, TipoEvento, StatusFolga, Aprovacao, FeriasStatus } from '../types';

// Hook for FolgasPage
export const useFilteredFolgas = (filters: { nomeRe: string; pelotao: string; aprovacao: string; status: string; }) => {
    const { folgas } = useData();
    const { currentUser, role } = useAuth();

    return useMemo(() => {
        return folgas
            .filter(f => {
                if (role === 'SUBORDINADO') return f.policialld === currentUser?.policialId;
                if (role === 'SARGENTO') {
                    // O "Sargento Mestre" de teste pode ver tudo
                    if (currentUser?.pelotao === 'TODOS') return true;
                    return f.pelotao === currentUser?.pelotao || f.sargentoResponsavelld === currentUser?.id;
                }
                return true; // ADMIN vê tudo
            })
            .filter(f => {
                const searchLower = filters.nomeRe.toLowerCase();
                const matchNomeRe = !filters.nomeRe || f.nome.toLowerCase().includes(searchLower) || f.re.toLowerCase().includes(searchLower);
                const matchPelotao = !filters.pelotao || f.pelotao === filters.pelotao;
                const matchAprovacao = !filters.aprovacao || f.aprovacao === filters.aprovacao;
                const matchStatus = !filters.status || f.status === filters.status;
                return matchNomeRe && matchPelotao && matchAprovacao && matchStatus;
            })
            .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
    }, [folgas, filters, role, currentUser]);
};

// Hook for DashboardPage
export const useDashboardData = (filters: { mes: string; pelotao: string; postoGrad: string; }) => {
    const { folgas, policiais } = useData();
    const { currentUser, role } = useAuth();

    const filteredFolgas = useMemo(() => {
        return folgas
            .filter(f => {
                // Role-based filtering first
                if (role === 'SUBORDINADO') return f.policialld === currentUser?.policialId;
                if (role === 'SARGENTO' && currentUser?.pelotao !== 'TODOS') return f.pelotao === currentUser?.pelotao;
                return true;
            })
            .filter(folga => {
                const policial = policiais.find(p => p.id === folga.policialld);
                const mesFolga = folga.data.substring(0, 7);
                const matchMes = !filters.mes || mesFolga === filters.mes;
                const matchPelotao = !filters.pelotao || folga.pelotao === filters.pelotao;
                const matchPostoGrad = !filters.postoGrad || (policial && policial.postoGrad === filters.postoGrad);
                return matchMes && matchPelotao && matchPostoGrad;
            });
    }, [folgas, policiais, filters, role, currentUser]);

    const stats = useMemo(() => {
        const oficiais = filteredFolgas.filter(f => f.aprovacao === Aprovacao.VALIDADA_ADMIN);
        const ativas = oficiais.filter(f => f.status === StatusFolga.ATIVA).length;
        const trocadas = oficiais.filter(f => f.status === StatusFolga.TROCADA).length;
        const excluidas = oficiais.filter(f => f.status === StatusFolga.EXCLUIDA).length;
        const pendenteSgt = filteredFolgas.filter(f => f.aprovacao === Aprovacao.ENVIADA_SARGENTO).length;
        const pendenteAdmin = filteredFolgas.filter(f => f.aprovacao === Aprovacao.APROVADA_SARGENTO).length;
        return { ativas, trocadas, excluidas, total: ativas + trocadas + excluidas, pendenteSgt, pendenteAdmin };
    }, [filteredFolgas]);
    
    const reasonChartData = useMemo(() => {
        const reasons = filteredFolgas
            .map(f => f.motivo)
            .filter((motivo): motivo is string => !!motivo && motivo.trim() !== '');
    
        if (reasons.length === 0) return [];
    
        const categoryCounts: Record<string, number> = {
            'Folga Cmt Geral': 0, 'Folga Cmt Cia': 0, 'Folga Compensação': 0, 'Folga Outros': 0, 'Motivos Antigos/Outros': 0,
        };
    
        reasons.forEach(reason => {
            if (reason.startsWith('Folga Cmt Geral')) categoryCounts['Folga Cmt Geral']++;
            else if (reason.startsWith('Folga Cmt Cia')) categoryCounts['Folga Cmt Cia']++;
            else if (reason.startsWith('Folga Compensação')) categoryCounts['Folga Compensação']++;
            else if (reason.startsWith('Folga Outros')) categoryCounts['Folga Outros']++;
            else categoryCounts['Motivos Antigos/Outros']++;
        });
    
        return Object.entries(categoryCounts)
            .map(([category, count]) => ({ category, count }))
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [filteredFolgas]);

    const mesesDisponiveis = useMemo(() => {
        const meses = new Set(folgas.map(f => f.data.substring(0, 7)));
        return Array.from(meses).sort().reverse();
    }, [folgas]);

    return { stats, reasonChartData, mesesDisponiveis };
};

// Hook for CalendarioPage
export const useCalendarData = () => {
    const { folgas, ferias, agendaEventos, policiais } = useData();
    const { currentUser, role } = useAuth();
    const policiaisMap = useMemo(() => new Map(policiais.map(p => [p.id, p])), [policiais]);
    const toYYYYMMDD = (date: Date): string => date.toISOString().split('T')[0];

    const folgasAtivasPorDia = useMemo(() => {
        const map = new Map<string, Folga[]>();
        folgas
            .filter(f => f.status === StatusFolga.ATIVA && f.aprovacao === Aprovacao.VALIDADA_ADMIN)
            .filter(f => {
                if (role === 'SUBORDINADO') return f.policialld === currentUser?.policialId;
                if (role === 'SARGENTO' && currentUser?.pelotao !== 'TODOS') {
                    return f.pelotao === currentUser?.pelotao;
                }
                return true; // ADMIN or Master Sargento
            })
            .forEach(folga => {
                const dateKey = folga.data;
                if (!map.has(dateKey)) map.set(dateKey, []);
                map.get(dateKey)!.push(folga);
            });
        return map;
    }, [folgas, role, currentUser]);

    const feriasPorDia = useMemo(() => {
        const map = new Map<string, Ferias[]>();
        ferias
            .filter(f => f.status === FeriasStatus.AGENDADA)
            .filter(f => {
                const policial = policiaisMap.get(f.policialId);
                if (role === 'SUBORDINADO') return f.policialId === currentUser?.policialId;
                if (role === 'SARGENTO' && currentUser?.pelotao !== 'TODOS') {
                    return policial?.pelotao === currentUser?.pelotao;
                }
                return true; // ADMIN or Master Sargento
            })
            .forEach(feria => {
                const policial = policiaisMap.get(feria.policialId);
                const enrichedFeria: Ferias = { ...feria };
                if (policial) {
                    enrichedFeria.nome = policial.nome;
                    enrichedFeria.re = policial.re;
                    enrichedFeria.pelotao = policial.pelotao;
                }

                let currentDate = new Date(feria.dataInicio + 'T12:00:00');
                const endDate = new Date(feria.dataFim + 'T12:00:00');
                
                while (currentDate <= endDate) {
                    const dateKey = toYYYYMMDD(currentDate);
                    if (!map.has(dateKey)) map.set(dateKey, []);
                    map.get(dateKey)!.push(enrichedFeria);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });
        return map;
    }, [ferias, role, currentUser, policiaisMap]);
  
    const eventosAgendaPorDia = useMemo(() => {
        const map = new Map<string, AgendaEvento[]>();
        const eventosFiltrados = agendaEventos.filter(evento => {
            if (role === 'ADMIN' || (role === 'SARGENTO' && currentUser?.pelotao === 'TODOS')) return true;
            if (role === 'SARGENTO') return evento.policiaisIds.some(id => policiaisMap.get(id)?.pelotao === currentUser?.pelotao);
            if (role === 'SUBORDINADO') return evento.policiaisIds.includes(currentUser?.policialId ?? -1);
            return false;
        });

        eventosFiltrados.forEach(evento => {
            const dateKey = evento.data;
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey)!.push(evento);
        });
        return map;
    }, [agendaEventos, role, currentUser, policiaisMap]);

    return { folgasAtivasPorDia, feriasPorDia, eventosAgendaPorDia };
};

// Hook for HistoricoPage
export const useFilteredHistorico = (filters: { userId: string; dataInicio: string; dataFim: string; }) => {
    const { historico } = useData();
    return useMemo(() => {
        return historico.filter(item => {
            const itemDate = new Date(item.timestamp).getTime();
            const matchUser = !filters.userId || item.actorId === parseInt(filters.userId);
            const matchDataInicio = !filters.dataInicio || itemDate >= new Date(filters.dataInicio).getTime();
            const matchDataFim = !filters.dataFim || itemDate <= new Date(filters.dataFim + 'T23:59:59').getTime();
            return matchUser && matchDataInicio && matchDataFim;
        });
    }, [historico, filters]);
};

// Hook for PoliciaisPage
export const useFilteredPoliciais = (searchTerm: string) => {
    const { policiais } = useData();
    return useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return policiais
            .filter(p => p.nome.toLowerCase().includes(searchLower) || p.re.toLowerCase().includes(searchLower))
            .sort((a, b) => a.nome.localeCompare(b.nome));
    }, [policiais, searchTerm]);
};

// Hook for CreditosPage
export const useLeaveBalanceData = (filters: { yearFilter: number, pelotaoFilter: string, searchFilter: string }) => {
    const { policiais, getCreditsFor, countUsedFolgasFor } = useData();
    const { yearFilter, pelotaoFilter, searchFilter } = filters;

    return useMemo(() => {
        const searchLower = searchFilter.toLowerCase();
        return policiais
            .filter(p => p.ativo)
            .map(p => {
                const creditos = getCreditsFor(p.id, yearFilter);
                const usadas = countUsedFolgasFor(p.id, yearFilter);
                const saldo = creditos - usadas;
                return { ...p, creditos, usadas, saldo };
            })
            .filter(p => {
                const matchSearch = !searchFilter || p.nome.toLowerCase().includes(searchLower) || p.re.includes(searchLower);
                const matchPelotao = !pelotaoFilter || p.pelotao === pelotaoFilter;
                return matchSearch && matchPelotao;
            })
            .sort((a, b) => a.nome.localeCompare(b.nome));
    }, [policiais, yearFilter, pelotaoFilter, searchFilter, getCreditsFor, countUsedFolgasFor]);
};

// Hook for FeriasPage
export const useFilteredFerias = (filters: { ano: string; pelotao: string; status: string; }) => {
    const { ferias, policiais } = useData();
    const { currentUser, role } = useAuth();
    const policiaisMap = useMemo(() => new Map<number, Policial>(policiais.map(p => [p.id, p])), [policiais]);

    return useMemo(() => {
        return ferias
            .map(f => {
                const policial = policiaisMap.get(f.policialId);
                // Fix: Merge policial data into the ferias object to provide up-to-date details (like name, platoon),
                // but crucially, exclude the policial's numeric `id` to prevent it from overwriting the ferias's string `id`.
                // This resolves the type conflict that caused errors in the UI components.
                if (policial) {
                    const { id: _policialId, ...policialDetails } = policial;
                    return { ...f, ...policialDetails };
                }
                return f;
            })
            .filter(f => {
                const matchUser = role === 'ADMIN' ||
                  (role === 'SARGENTO' && (currentUser?.pelotao === 'TODOS' || f.pelotao === currentUser?.pelotao)) ||
                  f.policialId === currentUser?.policialId;
                const matchAno = !filters.ano || f.anoReferencia.toString() === filters.ano;
                const matchPelotao = !filters.pelotao || f.pelotao === filters.pelotao;
                const matchStatus = !filters.status || f.status === filters.status;
                return matchUser && matchAno && matchPelotao && matchStatus;
            })
            .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
    }, [ferias, filters, role, currentUser, policiaisMap]);
};

// Hook for AgendaPage
export const useSortedAgendaEventos = () => {
    const { agendaEventos } = useData();
    return useMemo(() => [...agendaEventos].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()), [agendaEventos]);
};


// Hook for RelatorioEAPPage
export const useEAPReportData = (filters: { tipoFiltro: TipoEvento, pelotaoFiltro: string }) => {
    const { policiais, agendaEventos } = useData();
    const { tipoFiltro, pelotaoFiltro } = filters;
    const { role, currentUser } = useAuth();

    const roleFilteredPoliciais = useMemo(() => {
        if (role === 'SARGENTO' && currentUser?.pelotao !== 'TODOS') {
            return policiais.filter(p => p.pelotao === currentUser?.pelotao);
        }
        return policiais; // ADMIN and Master Sargento see all
    }, [policiais, role, currentUser]);
    
    return useMemo(() => {
        const eventosFiltrados = agendaEventos.filter(e => e.tipo === tipoFiltro);
        
        const participantesMap = new Map<number, { policial: Policial, evento: typeof eventosFiltrados[0] }>();
        eventosFiltrados.forEach(evento => {
            evento.policiaisIds.forEach(policialId => {
                const policial = roleFilteredPoliciais.find(p => p.id === policialId);
                if (policial) {
                    const existing = participantesMap.get(policialId);
                    if (!existing || new Date(evento.data) > new Date(existing.evento.data)) {
                        participantesMap.set(policialId, { policial, evento });
                    }
                }
            });
        });

        const allPoliciaisAtivos = roleFilteredPoliciais.filter(p => p.ativo);
        let pendentesList = allPoliciaisAtivos.filter(p => !participantesMap.has(p.id));
        let participantesList = Array.from(participantesMap.values()).sort((a,b) => a.policial.nome.localeCompare(b.policial.nome));

        if (pelotaoFiltro) {
            participantesList = participantesList.filter(p => p.policial.pelotao === pelotaoFiltro);
            pendentesList = allPoliciaisAtivos.filter(p => p.pelotao === pelotaoFiltro && !participantesMap.has(p.id));
        }

        return { participantes: participantesList, pendentes: pendentesList.sort((a,b) => a.nome.localeCompare(b.nome)) };
    }, [tipoFiltro, pelotaoFiltro, agendaEventos, roleFilteredPoliciais]);
};