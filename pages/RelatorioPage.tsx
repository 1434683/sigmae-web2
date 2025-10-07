import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Folga, StatusFolga, Aprovacao } from '../types';

// Declara a variável global XLSX para o TypeScript
declare var XLSX: any;

const FileTextIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;

const RelatorioPage: React.FC = () => {
  const { folgas, users, grupos } = useData();
  const { currentUser, role } = useAuth();
  
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    dataInicio: firstDayOfMonth,
    dataFim: lastDayOfMonth,
    pelotao: role === 'SARGENTO' ? currentUser?.pelotao || '' : '',
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const pelotoesOrdenados = useMemo(() => [...grupos].sort((a, b) => a.nome.localeCompare(b.nome)), [grupos]);

  const filteredFolgas = useMemo(() => {
    return folgas.filter(folga => {
      const folgaDate = new Date(folga.data + 'T00:00:00');
      const matchDate = (!filters.dataInicio || folgaDate >= new Date(filters.dataInicio + 'T00:00:00')) &&
                        (!filters.dataFim || folgaDate <= new Date(filters.dataFim + 'T00:00:00'));
      const matchPelotao = !filters.pelotao || folga.pelotao === filters.pelotao;
      // Sargento só pode ver seu pelotão
      const matchRole = role !== 'SARGENTO' || folga.pelotao === currentUser?.pelotao;
      return matchDate && matchPelotao && matchRole;
    }).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [folgas, filters, role, currentUser]);
  
  const getSituacaoFinal = (folga: Folga) => {
    switch (folga.status) {
      case StatusFolga.TROCADA:
        return { text: `Trocada para ${folga.trocadaPara ? new Date(folga.trocadaPara + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D'}`, color: 'bg-yellow-100 text-yellow-800' };
      case StatusFolga.EXCLUIDA:
        return { text: 'Excluída', color: 'bg-red-100 text-red-800' };
      case StatusFolga.CANCELADA:
         return { text: 'Cancelada/Reprovada', color: 'bg-gray-200 text-gray-800' };
      case StatusFolga.ATIVA:
        if(folga.aprovacao === Aprovacao.VALIDADA_ADMIN) {
            return { text: 'Usufruída', color: 'bg-green-100 text-green-800' };
        }
        break; // fallthrough to check aprovacao status
    }

    switch(folga.aprovacao){
        case Aprovacao.NEGADA_SARGENTO:
            return { text: 'Negada pelo Sargento', color: 'bg-orange-100 text-orange-800' };
        case Aprovacao.REPROVADA_ADMIN:
            return { text: 'Reprovada pelo Admin', color: 'bg-red-100 text-red-800' };
        default:
            return { text: 'Pendente', color: 'bg-blue-100 text-blue-800' };
    }
  };
  
  const getActorNome = (actorId?: number) => {
    if (!actorId) return 'N/A';
    const user = users.find(u => u.id === actorId);
    return user ? user.nome : 'Desconhecido';
  }

  const handleExport = () => {
    if (filteredFolgas.length === 0) return;

    const startDate = filters.dataInicio ? new Date(filters.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
    const endDate = filters.dataFim ? new Date(filters.dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
    const title = `Relatório de Folgas - De ${startDate} a ${endDate} - Pelotão: ${filters.pelotao || 'Todos'}`;
    const headers = ["Policial", "RE", "Pelotão", "Data da Folga", "Data da Solicitação", "Situação Final", "Motivo Solicitação", "Parecer Sargento", "Parecer Admin"];
    
    const rows = filteredFolgas.map(f => {
      const situacao = getSituacaoFinal(f);
      return [
        f.nome,
        f.re,
        f.pelotao,
        new Date(f.data + 'T00:00:00').toLocaleDateString('pt-BR'),
        new Date(f.criadoEm).toLocaleString('pt-BR'),
        situacao.text,
        f.motivo || '',
        f.sargentoParecer || '',
        f.adminParecer || '',
      ];
    });

    const finalData = [
      [title],
      [], // Linha em branco para espaçamento
      headers,
      ...rows
    ];
    
    // Cria a planilha a partir do array de dados
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    // Ajusta a largura das colunas
    const colWidths = headers.map((_, i) => ({
      wch: Math.max(...finalData.map(row => row[i] ? String(row[i]).length : 0)) + 2
    }));
    ws['!cols'] = colWidths;

    // Mescla as células do título
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
    
    // Aplica estilo ao título (centralizado, negrito, tamanho 14)
    if (ws['A1']) {
      ws['A1'].s = {
        font: { sz: 14, bold: true },
        alignment: { horizontal: "center" }
      };
    }

    // Aplica estilo de negrito aos cabeçalhos
    headers.forEach((_, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 2, c: colIndex });
      if (ws[cellAddress]) {
        ws[cellAddress].s = { font: { bold: true } };
      }
    });

    // Cria o workbook e faz o download
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório de Folgas");
    const fileName = `relatorio_folgas_${filters.dataInicio}_a_${filters.dataFim}_${filters.pelotao || 'todos'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };
  
  const stats = useMemo(() => {
    const usufruidas = filteredFolgas.filter(f => f.status === StatusFolga.ATIVA && f.aprovacao === Aprovacao.VALIDADA_ADMIN).length;
    const trocadas = filteredFolgas.filter(f => f.status === StatusFolga.TROCADA).length;
    const excluidas = filteredFolgas.filter(f => f.status === StatusFolga.EXCLUIDA).length;
    return { total: filteredFolgas.length, usufruidas, trocadas, excluidas };
  }, [filteredFolgas]);

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-pm-gray-800">Relatório de Folgas</h1>
        <button onClick={handleExport} disabled={filteredFolgas.length === 0} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center disabled:bg-green-300 disabled:cursor-not-allowed">
            <FileTextIcon className="mr-2 h-5 w-5"/> Exportar Excel
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="dataInicio" className="block text-sm font-medium text-pm-gray-700">De:</label>
            <input id="dataInicio" name="dataInicio" type="date" value={filters.dataInicio} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-pm-gray-300 focus:outline-none focus:ring-pm-blue focus:border-pm-blue sm:text-sm rounded-md" />
          </div>
          <div>
            <label htmlFor="dataFim" className="block text-sm font-medium text-pm-gray-700">Até:</label>
            <input id="dataFim" name="dataFim" type="date" value={filters.dataFim} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-pm-gray-300 focus:outline-none focus:ring-pm-blue focus:border-pm-blue sm:text-sm rounded-md" />
          </div>
          <div>
            <label htmlFor="pelotao" className="block text-sm font-medium text-pm-gray-700">Grupo/Pelotão</label>
            <select id="pelotao" name="pelotao" value={filters.pelotao} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-pm-gray-300 focus:outline-none focus:ring-pm-blue focus:border-pm-blue sm:text-sm rounded-md" disabled={role === 'SARGENTO'}>
              <option value="">Todos os Grupos</option>
              {pelotoesOrdenados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
            </select>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-pm-gray-500">Total de Solicitações</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-pm-gray-500">Folgas Usufruídas</p><p className="text-2xl font-bold text-green-600">{stats.usufruidas}</p></div>
        <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-pm-gray-500">Folgas Trocadas</p><p className="text-2xl font-bold text-yellow-600">{stats.trocadas}</p></div>
        <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-pm-gray-500">Folgas Excluídas</p><p className="text-2xl font-bold text-red-600">{stats.excluidas}</p></div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full text-sm text-left text-pm-gray-600">
          <thead className="text-xs text-pm-gray-700 uppercase bg-pm-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Policial</th>
              <th scope="col" className="px-6 py-3">Data Folga</th>
              <th scope="col" className="px-6 py-3">Data Solicitação</th>
              <th scope="col" className="px-6 py-3">Situação Final</th>
              <th scope="col" className="px-6 py-3">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {filteredFolgas.map(folga => {
              const situacao = getSituacaoFinal(folga);
              return (
                <tr key={folga.folgald} className="bg-white border-b hover:bg-pm-gray-50">
                  <td className="px-6 py-4 font-medium text-pm-gray-900">{folga.nome}<br/><span className="text-xs text-pm-gray-500">RE: {folga.re} | {folga.pelotao}</span></td>
                  <td className="px-6 py-4">{new Date(folga.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">{new Date(folga.criadoEm).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${situacao.color}`}>{situacao.text}</span></td>
                  <td className="px-6 py-4 text-xs">
                    {folga.motivo && <div><strong>Motivo:</strong> {folga.motivo}</div>}
                    {folga.sargentoParecer && <div><strong>Sgt ({getActorNome(folga.sargentold)}):</strong> {folga.sargentoParecer}</div>}
                    {folga.adminParecer && <div><strong>Adm ({getActorNome(folga.adminld)}):</strong> {folga.adminParecer}</div>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredFolgas.length === 0 && <p className="text-center p-4 text-pm-gray-500">Nenhum registro encontrado para os filtros selecionados.</p>}
      </div>
    </div>
  );
};

export default RelatorioPage;