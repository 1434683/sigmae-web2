import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Policial, TipoEvento } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useEAPReportData } from '../hooks/useDataFilters';

declare var XLSX: any;

const UserChecklistIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <polyline points="16 11 18 13 22 9"></polyline>
    </svg>
);

const RelatorioEAPPage: React.FC = () => {
    const { currentUser, role } = useAuth();
    const { grupos } = useData();

    const [tipoFiltro, setTipoFiltro] = useState<TipoEvento>(TipoEvento.EAP);
    const [pelotaoFiltro, setPelotaoFiltro] = useState(role === 'SARGENTO' ? currentUser?.pelotao || '' : '');

    const { participantes, pendentes } = useEAPReportData({ tipoFiltro, pelotaoFiltro });
    const pelotoesOrdenados = useMemo(() => [...grupos].sort((a, b) => a.nome.localeCompare(b.nome)), [grupos]);
    
    const handleExport = () => {
        const title = `Relatório de ${tipoFiltro} - ${pelotaoFiltro || 'Todos os Pelotões'}`;

        // Estilos
        const border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        const titleStyle = { font: { sz: 16, bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1D4ED8" } }, alignment: { horizontal: "center", vertical: "center" } };
        const sectionHeaderStyle = { font: { sz: 12, bold: true }, fill: { fgColor: { rgb: "E5E7EB" } }, alignment: { horizontal: "center" } };
        const tableHeaderStyle = { font: { bold: true }, fill: { fgColor: { rgb: "F3F4F6" } }, border };
        const cellStyle = { border };

        // Preparação dos dados
        const participantesHeaders = ["Policial", "RE", "Posto/Grad", "Pelotão", "Data Participação", "Título do Evento"];
        const participantesRows = participantes.map(p => [
            p.policial.nome, p.policial.re, p.policial.postoGrad, p.policial.pelotao,
            new Date(p.evento.data + 'T12:00:00').toLocaleDateString('pt-BR'),
            p.evento.titulo
        ]);
        
        const pendentesHeaders = ["Policial", "RE", "Posto/Grad", "Pelotão"];
        const pendentesRows = pendentes.map(p => [p.nome, p.re, p.postoGrad, p.pelotao]);

        // Montagem da planilha
        const wsData = [
            [title], [],
            ["Participantes"], participantesHeaders, ...participantesRows,
            [],
            ["Pendentes"], pendentesHeaders, ...pendentesRows
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Função auxiliar para aplicar estilos
        const applyStyleToCell = (R: number, C: number, style: object) => {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) ws[cellAddress] = {v: ''}; // Create cell if it doesn't exist
            ws[cellAddress].s = style;
        };

        // Aplicação de estilos e merges
        ws['!rows'] = [{ hpt: 25 }]; // Altura da linha do título
        ws['!merges'] = [];
        
        // Título Principal
        applyStyleToCell(0, 0, titleStyle);
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: participantesHeaders.length - 1 } });
        
        // Seção Participantes
        const partSectionRow = 2;
        applyStyleToCell(partSectionRow, 0, sectionHeaderStyle);
        ws['!merges'].push({ s: { r: partSectionRow, c: 0 }, e: { r: partSectionRow, c: participantesHeaders.length - 1 } });
        
        const partHeaderRow = partSectionRow + 1;
        for (let C = 0; C < participantesHeaders.length; C++) applyStyleToCell(partHeaderRow, C, tableHeaderStyle);
        for (let R = 0; R < participantesRows.length; R++) {
            for (let C = 0; C < participantesHeaders.length; C++) applyStyleToCell(partHeaderRow + 1 + R, C, cellStyle);
        }

        // Seção Pendentes
        const pendSectionRow = partHeaderRow + 1 + participantesRows.length + 1;
        applyStyleToCell(pendSectionRow, 0, sectionHeaderStyle);
        ws['!merges'].push({ s: { r: pendSectionRow, c: 0 }, e: { r: pendSectionRow, c: pendentesHeaders.length - 1 } });
        
        const pendHeaderRow = pendSectionRow + 1;
        for (let C = 0; C < pendentesHeaders.length; C++) applyStyleToCell(pendHeaderRow, C, tableHeaderStyle);
        for (let R = 0; R < pendentesRows.length; R++) {
            for (let C = 0; C < pendentesHeaders.length; C++) applyStyleToCell(pendHeaderRow + 1 + R, C, cellStyle);
        }

        // Ajuste de largura das colunas
        const colWidths = participantesHeaders.map((_, colIndex) => {
            let maxWidth = 0;
            wsData.forEach(row => {
                if (row[colIndex]) {
                    const len = String(row[colIndex]).length;
                    if (len > maxWidth) maxWidth = len;
                }
            });
            return { wch: maxWidth + 2 };
        });
        ws['!cols'] = colWidths;

        // Geração do arquivo
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Relatorio_${tipoFiltro}`);
        XLSX.writeFile(wb, `Relatorio_${tipoFiltro}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <h1 className="text-3xl font-bold text-pm-gray-800">Relatório de EAP e Cursos</h1>
                <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center">
                    Exportar Excel
                </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Tipo de Evento</label>
                        <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value as TipoEvento)} className="mt-1 w-full border border-gray-300 rounded-md p-2">
                            <option value={TipoEvento.EAP}>EAP</option>
                            <option value={TipoEvento.CURSO}>Curso</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Grupo/Pelotão</label>
                        <select value={pelotaoFiltro} onChange={e => setPelotaoFiltro(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2" disabled={role==='SARGENTO'}>
                            <option value="">Todos os Grupos</option>
                            {pelotoesOrdenados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-semibold text-pm-gray-800 mb-4 flex items-center">
                        <UserChecklistIcon className="h-6 w-6 mr-2 text-green-600"/>
                        Policiais que Participaram ({participantes.length})
                    </h2>
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="overflow-x-auto max-h-[60vh]">
                            <table className="w-full text-sm text-left text-pm-gray-600">
                                <thead className="text-xs text-pm-gray-700 uppercase bg-pm-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3">Policial</th>
                                        <th className="px-6 py-3">Data</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {participantes.map(({ policial, evento }) => (
                                        <tr key={policial.id}>
                                            <td className="px-6 py-4 font-medium">{policial.postoGrad} {policial.nome}<br/><span className="text-xs text-pm-gray-500">{policial.re} - {policial.pelotao}</span></td>
                                            <td className="px-6 py-4">{new Date(evento.data + 'T12:00:00').toLocaleDateString()}<br/><span className="text-xs text-pm-gray-500 truncate" title={evento.titulo}>{evento.titulo}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {participantes.length === 0 && <p className="text-center p-4">Nenhum participante encontrado.</p>}
                        </div>
                    </div>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-pm-gray-800 mb-4 flex items-center">
                        <UserChecklistIcon className="h-6 w-6 mr-2 text-orange-500"/>
                        Policiais Pendentes ({pendentes.length})
                    </h2>
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="overflow-x-auto max-h-[60vh]">
                            <table className="w-full text-sm text-left text-pm-gray-600">
                                <thead className="text-xs text-pm-gray-700 uppercase bg-pm-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3">Policial</th>
                                        <th className="px-6 py-3">Pelotão</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {pendentes.map(policial => (
                                        <tr key={policial.id}>
                                            <td className="px-6 py-4 font-medium">{policial.postoGrad} {policial.nome}<br/><span className="text-xs text-pm-gray-500">{policial.re}</span></td>
                                            <td className="px-6 py-4">{policial.pelotao}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {pendentes.length === 0 && <p className="text-center p-4">Nenhum policial pendente.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RelatorioEAPPage;