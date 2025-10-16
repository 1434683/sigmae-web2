import { supabase } from '../lib/supabase';

export type Policial = {
  id: number;        // Date.now()
  nome: string;
  re: string;
  postoGrad: string;
  pelotao: string;
  ativo: boolean;
};

const TBL = 'policiais';

export async function getPoliciais(): Promise<Policial[]> {
  const { data, error } = await supabase
    .from(TBL)
    .select('*')
    .order('nome', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as Policial[];
}

export async function addPolicial(p: Omit<Policial, 'id'>): Promise<void> {
  const row = { ...p, id: Date.now() };
  const { error } = await supabase.from(TBL).insert(row);
  if (error) throw new Error(error.message);
}

export async function updatePolicial(id: string, patch: Partial<Omit<Policial,'id'>>): Promise<void> {
  const { error } = await supabase.from(TBL).update(patch).eq('id', Number(id));
  if (error) throw new Error(error.message);
}

export async function deletePolicial(id: string): Promise<void> {
  const { error } = await supabase.from(TBL).delete().eq('id', Number(id));
  if (error) throw new Error(error.message);
}
