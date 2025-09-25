import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ProtocoloDocumento } from '../types';
import { api } from '../contexts/api';

const SigmaELogo: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 80 88" className="h-20 w-auto">
            <g>
                <path d="M40 0 L80 16 V56 C80 78 40 88 40 88 C40 88 0 78 0 56 V16 Z" fill="#19398A"/>
                <path d="M40 4 L76 18.4 V54.8 C76 74.8 40 84 40 84 C40 84 4 74.8 4 54.8 V18.4 Z" strokeWidth="3" stroke="white" fill="none"/>
                <text x="32" y="62" fontFamily="Verdana, sans-serif" fontSize="42" fontWeight="bold" fill="white" textAnchor="middle">Σ</text>
                <text x="55" y="48" fontFamily="Verdana, sans-serif" fontSize="22" fontWeight="bold" fill="white">E</text>
            </g>
        </svg>
    </div>
);

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
        <dt className="text-sm font-medium text-pm-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-pm-gray-900 sm:mt-0 sm:col-span-2">{value || <span className="italic text-pm-gray-400">Não informado</span>}</dd>
    </div>
);

const ProtocoloPublicView: React.FC = () => {
    const { docId } = useParams<{ docId: string }>();
    const [doc, setDoc] = useState<ProtocoloDocumento | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (docId) {
            api.getProtocoloDocById(docId)
                .then(data => {
                    setDoc(data as ProtocoloDocumento);
                })
                .catch(err => {
                    setError(err.message || 'Erro ao buscar documento.');
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setError('ID do documento não fornecido.');
            setLoading(false);
        }
    }, [docId]);

    return (
        <div className="min-h-screen bg-pm-gray-100 p-4 sm:p-8 flex flex-col items-center">
            <header className="w-full max-w-4xl mx-auto flex flex-col items-center mb-6">
                 <SigmaELogo />
                 <h1 className="text-2xl font-bold text-pm-blue mt-2">SIGMA-E</h1>
                 <p className="text-pm-gray-600">Verificação de Documento Protocolado</p>
            </header>
            
            <main className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-6 sm:p-8">
                {loading && (
                    <div className="flex justify-center items-center py-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-pm-blue"></div>
                    </div>
                )}
                {error && (
                    <div className="text-center py-10">
                        <h2 className="text-xl font-semibold text-red-600">Erro</h2>
                        <p className="text-pm-gray-600 mt-2">{error}</p>
                    </div>
                )}
                {!loading && !error && !doc && (
                    <div className="text-center py-10">
                        <h2 className="text-xl font-semibold text-pm-gray-700">Documento não encontrado</h2>
                        <p className="text-pm-gray-600 mt-2">O documento com o ID fornecido não foi localizado em nosso sistema.</p>
                    </div>
                )}
                {doc && (
                    <div>
                        <div className="border-b border-pm-gray-200 pb-4 mb-4">
                            <h2 className="text-xl sm:text-2xl font-bold text-pm-gray-900">{doc.assunto}</h2>
                            <p className="text-sm text-pm-gray-500 mt-1">Protocolado em {new Date(doc.criadoEm).toLocaleString('pt-BR')}</p>
                        </div>
                        <dl className="divide-y divide-pm-gray-200">
                            <DetailRow label="Número do Protocolo" value={<span className="font-mono font-bold">{doc.numero}</span>} />
                            <DetailRow label="Tipo de Documento" value={doc.tipo} />
                            <DetailRow label="Data de Emissão" value={new Date(doc.dataEmissao + 'T12:00:00').toLocaleDateString('pt-BR')} />
                            <DetailRow label="Destino" value={doc.destino} />
                            <DetailRow label="Elaborado por" value={doc.elaboradoPorNome} />
                            <DetailRow label="Documento de Referência" value={doc.docReferencia} />
                            <DetailRow label="Interessado / RE" value={doc.interessadoRE} />
                            <DetailRow label="Observações" value={<p className="whitespace-pre-wrap">{doc.observacoes}</p>} />
                        </dl>
                    </div>
                )}
            </main>
             <footer className="w-full max-w-4xl mx-auto text-center mt-8 text-xs text-pm-gray-500">
                <p>Este é um documento gerado pelo sistema SIGMA-E. A validade pode ser confirmada através do QR Code.</p>
            </footer>
        </div>
    );
};

export default ProtocoloPublicView;
