import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Grupo } from '../types';
import Modal from '../components/Modal';

const Toast: React.FC<{ message: string; type?: 'success' | 'error' }> = ({ message, type = 'success' }) => {
  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  return (
    <div className={`fixed top-20 right-8 text-white py-3 px-5 rounded-lg shadow-xl z-50 flex items-center ${bgColor}`} role="alert" aria-live="assertive">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
      <span>{message}</span>
    </div>
  );
};

const GruposPage: React.FC = () => {
  const { grupos, addGrupo, updateGrupo, deleteGrupo, policiais } = useData();
  const { currentUser } = useAuth();
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [currentGrupo, setCurrentGrupo] = useState<Partial<Grupo> | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const sortedGrupos = useMemo(() => {
    const counts = policiais.reduce((acc, p) => {
        acc[p.pelotao] = (acc[p.pelotao] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return [...grupos]
        .map(g => ({ ...g, count: counts[g.nome] || 0 }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [grupos, policiais]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const openModal = (grupo: Partial<Grupo> | null = null) => {
    setCurrentGrupo(grupo ? { ...grupo } : { nome: '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentGrupo?.nome || !currentUser) {
      setToast({ message: "O nome do grupo é obrigatório.", type: 'error' });
      return;
    }

    try {
      if (currentGrupo.id) {
        await updateGrupo(currentGrupo as Grupo, currentUser);
      } else {
        await addGrupo(currentGrupo.nome, currentUser);
      }
      setToast({ message: "Grupo salvo com sucesso!", type: 'success' });
      setModalOpen(false);
    } catch (error: any) {
      setToast({ message: error.message || 'Erro ao salvar grupo', type: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!currentUser || !window.confirm("Tem certeza que deseja excluir este grupo?")) return;
    try {
      await deleteGrupo(id, currentUser);
      setToast({ message: "Grupo excluído com sucesso!", type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'Erro ao excluir grupo', type: 'error' });
    }
  };

  return (
    <div className="container mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-pm-gray-800">Gerenciar Grupos</h1>
        <button onClick={() => openModal()} className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">
          Adicionar Grupo
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full text-sm text-left text-pm-gray-600">
          <thead className="text-xs text-pm-gray-700 uppercase bg-pm-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Nome do Grupo</th>
              <th scope="col" className="px-6 py-3">Policiais no Grupo</th>
              <th scope="col" className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedGrupos.map(g => (
              <tr key={g.id} className="bg-white border-b hover:bg-pm-gray-50">
                <td className="px-6 py-4 font-medium text-pm-gray-900">{g.nome}</td>
                <td className="px-6 py-4">{g.count}</td>
                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => openModal(g)} className="font-medium text-pm-blue hover:underline">Editar</button>
                  <button onClick={() => handleDelete(g.id)} className="font-medium text-red-600 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={currentGrupo?.id ? 'Editar Grupo' : 'Adicionar Grupo'}>
        {currentGrupo && (
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Nome do Grupo</label>
              <input type="text" value={currentGrupo.nome || ''} onChange={(e) => setCurrentGrupo({ ...currentGrupo, nome: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-md p-2" required />
            </div>
            <div className="flex justify-end pt-4">
              <button type="submit" className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">Salvar</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default GruposPage;