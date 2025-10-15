import { supabase } from '../supabaseClient';

// Função de login consultando Supabase
export async function login(re: string, senha: string) {
  // Busca o usuário pelo RE na tabela 'usuarios'
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('re', re)
    .single();

  if (error || !data) {
    throw new Error('Usuário não encontrado');
  }
  // Verifica a senha
  if (data.senha !== senha) {
    throw new Error('Senha incorreta');
  }
  // Retorna o usuário autenticado
  return data;
}

// Função para cadastrar novo usuário
export async function cadastrarUsuario(re: string, nome: string, senha: string, email?: string) {
  const { data, error } = await supabase
    .from('usuarios')
    .insert([{ re, nome, senha, email }]);
  if (error) {
    throw new Error('Erro ao cadastrar usuário: ' + error.message);
  }
  return data;
}

// Função para resetar senha
export async function resetarSenha(re: string, novaSenha: string) {
  const { data, error } = await supabase
    .from('usuarios')
    .update({ senha: novaSenha })
    .eq('re', re);
  if (error) {
    throw new Error('Erro ao resetar senha: ' + error.message);
  }
  return data;
}

// Função para buscar dados do usuário logado
export async function buscarUsuario(re: string) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('re', re)
    .single();
  if (error || !data) {
    throw new Error('Usuário não encontrado');
  }
  return data;
}