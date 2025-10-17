import { createClient } from '@supabase/supabase-js';

// ✅ use variáveis do Vite (prefixo VITE_)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// (opção alternativa: se quiser HARDCODE temporário, use ASPAS)
// const SUPABASE_URL = 'https://lmbwwhwjgvethgforziw.supabase.co';
// const SUPABASE_ANON_KEY = 'SEU_ANON_KEY_AQUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// opcional: facilitar debug no navegador
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}
