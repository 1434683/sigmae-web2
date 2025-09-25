

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function onlyDigits(s: string) { return (s || '').replace(/\D/g, ''); }

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

const LoginPage: React.FC = () => {
  const nav = useNavigate();
  const { loginByRE } = useAuth();

  const [re, setRe] = useState('');
  const [senha, setSenha] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [reError, setReError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/\D/.test(value)) {
      setReError('O RE deve conter apenas números.');
    } else {
      setReError(null);
    }
    setRe(onlyDigits(value));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (reError) return;

    const reDigits = onlyDigits(re);
    if (reDigits.length < 3) { setErr('Informe seu RE sem o dígito'); return; }
    if (!senha || senha.trim().length < 3) { setErr('Informe uma senha válida'); return; }

    setLoading(true);
    const { ok, error } = await loginByRE(reDigits, senha);
    setLoading(false);

    if (!ok) { setErr(error || 'Falha no login'); return; }
    nav('/dashboard');
  };

  return (
    <div className="min-h-screen bg-pm-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white shadow rounded-xl p-6">
        <div className="flex flex-col items-center mb-6">
            <SigmaELogo />
            <h1 className="text-3xl font-bold text-pm-blue mt-4">SIGMA-E</h1>
            <p className="text-pm-gray-600 text-center text-base -mt-1">Sistema Integrado de Gestão, Monitoramento e Administração do Efetivo</p>
        </div>
        <p className="text-pm-gray-500 mb-6 text-center">Acesse com seu RE (sem dígito) e senha.</p>


        {err && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 text-center">{err}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-pm-gray-700 mb-1 text-left">RE (sem dígito)</label>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="username"
              className={`w-full border ${reError ? 'border-red-500 focus:ring-red-500' : 'border-pm-gray-300 focus:ring-pm-blue'} rounded-lg px-3 py-2 focus:outline-none focus:ring-2`}
              placeholder="Ex.: 123456"
              value={re}
              onChange={handleReChange}
              aria-invalid={!!reError}
              aria-describedby="re-error-message"
            />
            {reError ? (
              <p id="re-error-message" className="text-xs text-red-600 mt-1 text-left">{reError}</p>
            ) : (
              <p className="text-xs text-pm-gray-500 mt-1 text-left">Digite apenas os números antes do traço. Ex.: se seu RE é 123456-7, digite 123456.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-pm-gray-700 mb-1 text-left">Senha</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full border border-pm-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pm-blue"
              placeholder="Sua senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pm-blue hover:bg-pm-blue-dark text-white rounded-lg py-2 font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-xs text-center text-pm-gray-500">
          Acesso ao sistema é concedido pelo Administrador na área interna (Gerenciar Policiais).
        </div>
        
        <div className="mt-8 border-t pt-4 text-center text-xs text-pm-gray-400">
          Desenvolvido por Cb PM 143468-3 Samuel Henrique Alves
        </div>
      </div>
    </div>
  );
};

export default LoginPage;