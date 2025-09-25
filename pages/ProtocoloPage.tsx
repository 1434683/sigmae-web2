
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ProtocoloDocumento, TipoDoc } from '../types';
import Modal from '../components/Modal';
import { TIPOS_DOCUMENTO } from '../constants';

declare var XLSX: any;
declare var QRCode: any;

const Toast: React.FC<{ message: string; type?: 'success' | 'error' }> = ({ message, type = 'success' }) => {
  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  return (
    <div className={`fixed top-20 right-8 text-white py-3 px-5 rounded-lg shadow-xl z-50 flex items-center ${bgColor}`} role="alert" aria-live="assertive">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
      <span>{message}</span>
    </div>
  );
};

const RefreshCcwIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/></svg>;
const PrinterIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

const ProtocoloPage: React.FC = () => {
  const { protocoloDocs, addProtocoloDoc, adminResetProtocoloCounter } = useData();
  const { currentUser, role } = useAuth();
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<Omit<ProtocoloDocumento, 'id'|'numero'|'ano'|'sequencial'|'criadoEm'|'elaboradoPorId'|'elaboradoPorNome'>>({} as any);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [filters, setFilters] = useState({ termo: '', tipo: '', dataInicio: '', dataFim: '' });
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsDoc, setDetailsDoc] = useState<ProtocoloDocumento | null>(null);

  useEffect(() => {
    if (toast) { const timer = setTimeout(() => setToast(null), 4000); return () => clearTimeout(timer); }
  }, [toast]);

  useEffect(() => {
    if (isDetailsModalOpen && detailsDoc) {
        const qrcodeContainer = document.getElementById('details-qrcode');
        if (qrcodeContainer) {
            qrcodeContainer.innerHTML = '';
            const baseUrl = window.location.href.split('#')[0];
            const url = `${baseUrl}#/protocolo/view/${detailsDoc.id}`;
            new QRCode(qrcodeContainer, {
                text: url,
                width: 128,
                height: 128,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
        }
    }
  }, [isDetailsModalOpen, detailsDoc]);

  const filteredDocs = useMemo(() => {
    return protocoloDocs.filter(doc => {
        const termoLower = filters.termo.toLowerCase();
        const matchTermo = !filters.termo || doc.numero.toLowerCase().includes(termoLower) || doc.assunto.toLowerCase().includes(termoLower) || doc.destino.toLowerCase().includes(termoLower) || doc.interessadoRE.toLowerCase().includes(termoLower);
        const matchTipo = !filters.tipo || doc.tipo === filters.tipo;
        const matchDataInicio = !filters.dataInicio || doc.dataEmissao >= filters.dataInicio;
        const matchDataFim = !filters.dataFim || doc.dataEmissao <= filters.dataFim;
        return matchTermo && matchTipo && matchDataInicio && matchDataFim;
    }).sort((a, b) => b.sequencial - a.sequencial).sort((a,b) => b.ano - a.ano);
  }, [protocoloDocs, filters]);
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  const openModal = () => {
    setCurrentDoc({ dataEmissao: new Date().toISOString().split('T')[0], tipo: TipoDoc.OFICIO, destino: '', assunto: '', docReferencia: '', interessadoRE: '', observacoes: '', vinculoId: null });
    setModalOpen(true);
  };

  const handleShowDetails = (doc: ProtocoloDocumento) => {
    setDetailsDoc(doc);
    setDetailsModalOpen(true);
  };
  
  const handleSave = async () => {
    if (!currentUser) return;
    try {
        if (!currentDoc.tipo || !currentDoc.assunto.trim() || !currentDoc.destino.trim()) throw new Error("Tipo, Assunto e Destino são obrigatórios.");
        const newDoc = await addProtocoloDoc({ ...currentDoc, elaboradoPorId: currentUser.id, elaboradoPorNome: currentUser.nome }, currentUser);
        setToast({ message: `Documento protocolado com o número ${newDoc.numero}!`, type: 'success' });
        setModalOpen(false);
    } catch (error: any) {
        setToast({ message: error.message, type: 'error' });
    }
  };

  const handleResetCounter = async () => {
    if (!currentUser || !window.confirm(`Tem certeza que deseja REINICIAR a contagem de documentos para o ano de ${new Date().getFullYear()}? Esta ação não pode ser desfeita.`)) return;
    try {
        await adminResetProtocoloCounter(currentUser);
        setToast({ message: "Contador do ano reiniciado com sucesso!", type: 'success' });
    } catch (error: any) {
        setToast({ message: error.message, type: 'error' });
    }
  };
  
  const handleSelectDoc = (id: string) => setSelectedDocs(prev => { const newSet = new Set(prev); newSet.has(id) ? newSet.delete(id) : newSet.add(id); return newSet; });
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedDocs(e.target.checked ? new Set(filteredDocs.map(d => d.id)) : new Set());

  const handleGenerateGuia = () => {
    const dataToExport = filteredDocs
      .filter(d => selectedDocs.has(d.id))
      .sort((a, b) => a.ano - b.ano || a.sequencial - b.sequencial);

    if (dataToExport.length === 0) {
      setToast({ message: 'Selecione ao menos um documento para gerar a guia.', type: 'error' });
      return;
    }

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      setToast({ message: 'Não foi possível abrir uma nova janela. Verifique seu bloqueador de pop-ups.', type: 'error' });
      return;
    }

    const docsHtml = dataToExport.map(doc => `
      <tr class="border-b break-inside-avoid">
        <td class="p-2 align-top font-mono">${doc.numero}</td>
        <td class="p-2 align-top">${doc.tipo}</td>
        <td class="p-2 align-top">${doc.assunto}</td>
        <td class="p-2 align-top">
            <div class="flex justify-center items-center">
                <div id="qrcode-${doc.id}"></div>
            </div>
        </td>
      </tr>
    `).join('');

    const scriptContent = `
      document.addEventListener('DOMContentLoaded', function() {
        try {
          const data = ${JSON.stringify(dataToExport)};
          const baseUrl = '${window.location.href.split('#')[0]}';
          
          data.forEach(doc => {
              const container = document.getElementById('qrcode-' + doc.id);
              if (container) {
                  const url = \`\${baseUrl}#/protocolo/view/\${doc.id}\`;
                  new QRCode(container, {
                      text: url,
                      width: 96,
                      height: 96,
                      colorDark : "#000000",
                      colorLight : "#ffffff",
                      correctLevel : QRCode.CorrectLevel.M
                  });
              }
          });

          document.getElementById('print-button').addEventListener('click', () => {
              window.print();
          });
        } catch (e) {
          console.error('Erro ao gerar QR Codes:', e);
          document.body.innerHTML = '<h1>Erro ao gerar a guia. Por favor, tente novamente.</h1><p>' + (e instanceof Error ? e.message : String(e)) + '</p>';
        }
      });
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Guia de Recebimento de Documentos</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              @page { size: A4; margin: 2cm; }
            }
          </style>
        </head>
        <body class="bg-gray-100 font-sans">
          <div class="fixed top-4 right-4 no-print">
            <button id="print-button" class="bg-blue-600 text-white py-2 px-4 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Imprimir / Salvar PDF
            </button>
          </div>
          <div class="container mx-auto my-8 p-8 bg-white shadow-lg" id="printable-area">
            <header class="text-center mb-8 border-b pb-4">
              <h1 class="text-2xl font-bold text-gray-800">GUIA DE RECEBIMENTO DE DOCUMENTOS</h1>
              <p class="text-sm text-gray-500">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            </header>
            <main>
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr class="border-b-2 border-black">
                    <th class="p-2 text-left font-bold" style="width: 20%;">NÚMERO</th>
                    <th class="p-2 text-left font-bold" style="width: 20%;">TIPO</th>
                    <th class="p-2 text-left font-bold" style="width: 45%;">ASSUNTO</th>
                    <th class="p-2 text-center font-bold" style="width: 15%;">QR CODE</th>
                  </tr>
                </thead>
                <tbody>
                  ${docsHtml}
                </tbody>
              </table>
            </main>
            <footer class="mt-16 pt-8 text-sm">
              <div class="flex justify-between items-center break-inside-avoid">
                <div>
                  <p class="mb-12">Recebido por: _________________________________________</p>
                  <p class="border-t pt-2 w-full">Assinatura do Responsável</p>
                </div>
                <div>
                  <p>Data/Hora: ______/______/________, ______:______hs</p>
                </div>
              </div>
            </footer>
          </div>
          <script>${scriptContent}</script>
        </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };

  return (
    <div className="container mx-auto">
        {toast && <Toast message={toast.message} type={toast.type} />}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h1 className="text-3xl font-bold text-pm-gray-800">Protocolo de Documentos</h1>
            <div className='flex items-center gap-2'>
                {role === 'ADMIN' && <button onClick={handleResetCounter} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2"><RefreshCcwIcon className="h-4 w-4"/>Reiniciar Numeração Anual</button>}
                <button onClick={handleGenerateGuia} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-teal-300 flex items-center gap-2" disabled={selectedDocs.size === 0}><PrinterIcon className="h-4 w-4"/>Gerar Guia ({selectedDocs.size})</button>
                <button onClick={openModal} className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md flex items-center gap-2"><PlusIcon className="h-4 w-4"/>Novo Documento</button>
            </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md mb-6"><div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="text" name="termo" placeholder="Buscar por nº, assunto..." value={filters.termo} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"/>
            <select name="tipo" value={filters.tipo} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"><option value="">Todos os Tipos</option>{TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}</select>
            <input type="date" name="dataInicio" value={filters.dataInicio} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"/>
            <input type="date" name="dataFim" value={filters.dataFim} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-md"/>
        </div></div>

        <div className="bg-white rounded-lg shadow-md overflow-x-auto"><table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-pm-gray-50 text-pm-gray-700"><tr>
                <th className="px-6 py-3"><input type="checkbox" onChange={handleSelectAll} checked={selectedDocs.size === filteredDocs.length && filteredDocs.length > 0} /></th>
                <th className="px-6 py-3">Número</th><th className="px-6 py-3">Data</th><th className="px-6 py-3">Tipo</th><th className="px-6 py-3">Assunto</th><th className="px-6 py-3">Destino</th><th className="px-6 py-3">Elaborado por</th>
            </tr></thead>
            <tbody>{filteredDocs.map(doc => (<tr key={doc.id} className="bg-white border-b hover:bg-pm-gray-50 cursor-pointer" onClick={() => handleShowDetails(doc)}>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedDocs.has(doc.id)} onChange={() => handleSelectDoc(doc.id)} /></td>
                <td className="px-6 py-4 font-mono font-semibold text-pm-gray-900">{doc.numero}</td>
                <td className="px-6 py-4 text-pm-gray-700">{new Date(doc.dataEmissao+'T12:00').toLocaleDateString()}</td>
                <td className="px-6 py-4 text-pm-gray-700">{doc.tipo}</td>
                <td className="px-6 py-4 font-medium text-pm-gray-900">{doc.assunto}</td>
                <td className="px-6 py-4 text-pm-gray-700">{doc.destino}</td>
                <td className="px-6 py-4 text-pm-gray-700">{doc.elaboradoPorNome}</td>
            </tr>))}</tbody>
        </table>{filteredDocs.length === 0 && <p className="text-center p-4 text-pm-gray-600">Nenhum documento encontrado.</p>}</div>

        <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Novo Protocolo de Documento">
            <h3 className="text-lg font-semibold text-pm-gray-800 mb-4 border-b pb-2">Campos do Registro</h3>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div><label className="block text-sm font-semibold text-pm-gray-800 mb-1">Número</label><input type="text" value="Automático" disabled className="w-full p-2 border border-gray-300 rounded-md bg-pm-gray-100"/></div>
                    <div><label className="block text-sm font-semibold text-pm-gray-800 mb-1">Data de Emissão</label><input type="date" value={currentDoc.dataEmissao} onChange={e => setCurrentDoc(p => ({...p, dataEmissao: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md" required/></div>
                </div>
                <div><label className="block text-sm font-semibold text-pm-gray-800 mb-1">Elaborado por</label><input type="text" value={currentUser?.nome || ''} disabled className="w-full p-2 border border-gray-300 rounded-md bg-pm-gray-100"/></div>
                <div><label className="block text-sm font-semibold text-pm-gray-800 mb-1">Tipo de Documento</label><select value={currentDoc.tipo} onChange={e => setCurrentDoc(p=>({...p, tipo: e.target.value as TipoDoc}))} className="w-full p-2 border border-gray-300 rounded-md" required><option value="">Selecione...</option>{TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-sm font-semibold text-pm-gray-800 mb-1">Destino</label><input type="text" value={currentDoc.destino} onChange={e => setCurrentDoc(p=>({...p, destino: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md" required/></div>
                <div><label className="block text-sm font-semibold text-pm-gray-800 mb-1">Assunto</label><textarea value={currentDoc.assunto} onChange={e => setCurrentDoc(p=>({...p, assunto: e.target.value}))} rows={3} className="w-full p-2 border border-gray-300 rounded-md" required/></div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div><label className="block text-sm font-semibold text-pm-gray-800 mb-1">Documento de Referência</label><input type="text" value={currentDoc.docReferencia} onChange={e => setCurrentDoc(p=>({...p, docReferencia: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md"/></div>
                    <div><label className="block text-sm font-semibold text-pm-gray-800 mb-1">Vínculo (opcional)</label><input type="text" value={currentDoc.vinculoId || ''} onChange={e => setCurrentDoc(p=>({...p, vinculoId: e.target.value}))} placeholder="Nº do doc. vinculado" className="w-full p-2 border border-gray-300 rounded-md"/></div>
                </div>
                <div><label className="block text-sm font-semibold text-pm-gray-800 mb-1">Interessado / RE</label><input type="text" value={currentDoc.interessadoRE} onChange={e => setCurrentDoc(p=>({...p, interessadoRE: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md"/></div>
                <div><label className="block text-sm font-semibold text-pm-gray-800 mb-1">Observações</label><textarea value={currentDoc.observacoes} onChange={e => setCurrentDoc(p=>({...p, observacoes: e.target.value}))} rows={2} className="w-full p-2 border border-gray-300 rounded-md"/></div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={() => setModalOpen(false)} className="bg-pm-gray-200 hover:bg-pm-gray-300 font-bold py-2 px-4 rounded-md">Cancelar</button>
                    <button type="submit" className="bg-pm-blue hover:bg-pm-blue-dark text-white font-bold py-2 px-4 rounded-md">Protocolar</button>
                </div>
            </form>
        </Modal>

        <Modal isOpen={isDetailsModalOpen} onClose={() => setDetailsModalOpen(false)} title="Detalhes do Documento">
            {detailsDoc && (
                 <div className="space-y-4 text-sm">
                    <div className="p-4 bg-pm-gray-50 rounded-lg border">
                        <p className="text-xs text-pm-gray-500">Número</p>
                        <p className="font-mono text-xl font-bold text-pm-gray-800">{detailsDoc.numero}</p>
                        <p className="text-xs text-pm-gray-500 mt-2">Assunto</p>
                        <p className="font-semibold text-pm-gray-900">{detailsDoc.assunto}</p>
                    </div>
                    <dl className="divide-y divide-pm-gray-200">
                        <div className="py-2 grid grid-cols-3 gap-4"><dt className="text-pm-gray-500">Tipo</dt><dd className="col-span-2 text-pm-gray-800">{detailsDoc.tipo}</dd></div>
                        <div className="py-2 grid grid-cols-3 gap-4"><dt className="text-pm-gray-500">Data Emissão</dt><dd className="col-span-2 text-pm-gray-800">{new Date(detailsDoc.dataEmissao+'T12:00').toLocaleDateString()}</dd></div>
                        <div className="py-2 grid grid-cols-3 gap-4"><dt className="text-pm-gray-500">Destino</dt><dd className="col-span-2 text-pm-gray-800">{detailsDoc.destino}</dd></div>
                        <div className="py-2 grid grid-cols-3 gap-4"><dt className="text-pm-gray-500">Elaborado por</dt><dd className="col-span-2 text-pm-gray-800">{detailsDoc.elaboradoPorNome}</dd></div>
                        <div className="py-2 grid grid-cols-3 gap-4"><dt className="text-pm-gray-500">Doc. Referência</dt><dd className="col-span-2 text-pm-gray-800">{detailsDoc.docReferencia || '-'}</dd></div>
                        <div className="py-2 grid grid-cols-3 gap-4"><dt className="text-pm-gray-500">Interessado</dt><dd className="col-span-2 text-pm-gray-800">{detailsDoc.interessadoRE || '-'}</dd></div>
                        <div className="py-2 grid grid-cols-3 gap-4"><dt className="text-pm-gray-500">Observações</dt><dd className="col-span-2 text-pm-gray-800 whitespace-pre-wrap">{detailsDoc.observacoes || '-'}</dd></div>
                    </dl>
                    <div className="border-t pt-4">
                        <p className="text-center font-semibold text-pm-gray-600 mb-2">Link de Verificação Pública</p>
                        <div id="details-qrcode" className="flex justify-center p-2 bg-white border rounded-lg"></div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={() => setDetailsModalOpen(false)} className="bg-pm-gray-200 hover:bg-pm-gray-300 font-bold py-2 px-4 rounded-md">Fechar</button>
                    </div>
                </div>
            )}
        </Modal>
    </div>
  );
};

export default ProtocoloPage;
