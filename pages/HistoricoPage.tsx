import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useFilteredHistorico } from '../hooks/useDataFilters';

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);

// Helper to format values for display in the table
const formatValue = (value: any) => {
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (value === null || value === undefined) return 'N/A';
  // Check for ISO date string format (YYYY-MM-DD)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    // Attempt to parse and format only if it's a valid date part
    const date = new Date(value + 'T00:00:00');
    if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR');
    }
  }
  return String(value);
};

// Helper to format field names from camelCase to Title Case
const formatFieldName = (name: string) => {
  return name
    .replace(/([A-Z])/g, ' $1') // insert space before capital letters
    .replace(/^./, (str) => str.toUpperCase()); // capitalize first letter
};

const ChangesTable: React.FC<{ antesDepois: Record<string, any> | null }> = ({ antesDepois }) => {
    if (!antesDepois || typeof antesDepois.antes !== 'object' || typeof antesDepois.depois !== 'object') {
        const hasData = antesDepois && (antesDepois.depois || antesDepois.antes);
        if (hasData) {
          // Fallback for creation/deletion records
          return (
            <div className="pt-2">
              <p className="font-semibold mb-1 text-pm-gray-800">Dados do Registro:</p>
              <pre className="p-2 bg-white rounded-md overflow-x-auto text-xs border border-pm-gray-200">
                  {JSON.stringify(antesDepois.depois || antesDepois.antes, null, 2)}
              </pre>
            </div>
          );
        }
        return null;
    }

    const { antes, depois } = antesDepois;
    const allKeys = Array.from(new Set([...Object.keys(antes || {}), ...Object.keys(depois || {})]));
    
    const changes = allKeys
        .map(key => ({
            key,
            antes: antes ? antes[key] : undefined,
            depois: depois ? depois[key] : undefined,
        }))
        .filter(change => JSON.stringify(change.antes) !== JSON.stringify(change.depois));

    if (changes.length === 0) {
        return null;
    }
    
    return (
        <div className="pt-2">
            <p className="font-semibold mb-2 text-pm-gray-800">Dados da Alteração:</p>
            <div className="overflow-x-auto border border-pm-gray-200 rounded-md">
                <table className="min-w-full bg-white text-sm">
                    <thead className="bg-pm-gray-100">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-pm-gray-600 uppercase tracking-wider">Campo Alterado</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-pm-gray-600 uppercase tracking-wider">Valor Anterior</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-pm-gray-600 uppercase tracking-wider">Novo Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-pm-gray-200">
                        {changes.map(({ key, antes, depois }) => (
                            <tr key={key}>
                                <td className="px-4 py-2 whitespace-nowrap font-medium text-pm-gray-800">{formatFieldName(key)}</td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                    <span className="bg-red-100 text-red-800 p-1 rounded text-xs font-mono">{formatValue(antes)}</span>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                    <span className="bg-green-100 text-green-800 p-1 rounded text-xs font-mono">{formatValue(depois)}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const HistoricoPage: React.FC = () => {
  const { users } = useData();
  const [filters, setFilters] = useState({ userId: "", dataInicio: "", dataFim: "" });
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const filteredHistorico = useFilteredHistorico(filters);
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const totalPages = Math.ceil(filteredHistorico.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedHistorico = filteredHistorico.slice(startIndex, endIndex);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const toggleDetails = (id: number) => {
    setExpandedIds(prevIds => {
      const newIds = new Set(prevIds);
      if (newIds.has(id)) {
        newIds.delete(id);
      } else {
        newIds.add(id);
      }
      return newIds;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setExpandedIds(new Set()); // Collapse details when changing page
    }
  };

  const PaginationControls = () => (
    <div className="flex justify-center items-center space-x-4 p-4 border-t">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 text-sm font-medium text-pm-gray-700 bg-white border border-pm-gray-300 rounded-md hover:bg-pm-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Anterior
      </button>
      <span className="text-sm text-pm-gray-700">
        Página {currentPage} de {totalPages || 1}
      </span>
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages || totalPages === 0}
        className="px-4 py-2 text-sm font-medium text-pm-gray-700 bg-white border border-pm-gray-300 rounded-md hover:bg-pm-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Próxima
      </button>
    </div>
  );

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-pm-gray-800 mb-6">Histórico de Alterações</h1>
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select name="userId" value={filters.userId} onChange={handleFilterChange} className="w-full px-3 py-2 border border-pm-gray-300 rounded-md">
            <option value="">Todos os Usuários</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <input type="date" name="dataInicio" value={filters.dataInicio} onChange={handleFilterChange} className="w-full px-3 py-2 border border-pm-gray-300 rounded-md" />
          <input type="date" name="dataFim" value={filters.dataFim} onChange={handleFilterChange} className="w-full px-3 py-2 border border-pm-gray-300 rounded-md" />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md">
        <ul role="list" className="divide-y divide-gray-200">
          {paginatedHistorico.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            return (
              <li key={item.id} className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-pm-blue truncate capitalize">{item.evento.replace(/_/g, ' ').toLowerCase()}</p>
                      <p className="hidden sm:block text-xs text-pm-gray-500">{new Date(item.timestamp).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="mt-2 sm:flex sm:items-center">
                      <p className="flex items-center text-sm text-pm-gray-500"><strong>Executor: </strong><span className="ml-1">{item.actorNome}</span></p>
                      {item.nome && <p className="mt-1 flex items-center text-sm text-pm-gray-500 sm:mt-0 sm:ml-4"><strong>Policial: </strong><span className="ml-1">{item.nome} (RE: {item.re})</span></p>}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button onClick={() => toggleDetails(item.id)} className="flex items-center text-sm font-medium text-pm-blue hover:text-pm-blue-dark">
                      <span>{isExpanded ? 'Ocultar' : 'Ver'} Detalhes</span>
                      <ChevronDownIcon className={`ml-1 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-4 p-4 bg-pm-gray-50 rounded-md border border-pm-gray-200">
                    <div className="text-sm text-pm-gray-800 space-y-2">
                        {item.dataOriginal && <p><strong>Data Original:</strong> {new Date(item.dataOriginal + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                        {item.dataNova && <p><strong>Data Nova:</strong> {new Date(item.dataNova + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                        {item.motivo && <p><strong>Motivo/Parecer:</strong> {item.motivo}</p>}
                        <ChangesTable antesDepois={item.antesDepois} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {filteredHistorico.length === 0 && <p className="text-center p-4 text-pm-gray-500">Nenhum registro de histórico encontrado.</p>}
        {totalPages > 1 && <PaginationControls />}
      </div>
    </div>
  );
};

export default HistoricoPage;