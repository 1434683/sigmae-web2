

import React from 'react';

const HelpItem: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  return (
    <div className="mb-4 border-b border-pm-gray-200 last:border-b-0">
      <button
        className="w-full text-left py-4 flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <h2 className="text-xl font-semibold text-pm-gray-800">{title}</h2>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      {isOpen && (
        <div className="pb-4 text-pm-gray-600 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};

const AjudaPage: React.FC = () => {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-pm-gray-800 mb-6">SIGMA-E - Manual do Sistema</h1>
      <div className="bg-white p-8 rounded-lg shadow-md">
        
        <HelpItem title="Visão Geral" defaultOpen>
          <p>Bem-vindo ao SIGMA-E, o Sistema Integrado de Gestão, Monitoramento e Administração do Efetivo. Este manual foi criado para guiar você por todas as funcionalidades do sistema, garantindo que todos possam utilizá-lo de forma eficiente e correta.</p>
        </HelpItem>

        <HelpItem title="Perfis de Acesso">
          <p>O sistema possui três níveis de acesso com diferentes permissões:</p>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li><strong>ADMIN (Administrador):</strong> Possui acesso total. Pode gerenciar policiais, usuários, créditos de folga, validar/reprovar todas as solicitações, agendar férias, criar eventos na agenda e gerar relatórios completos.</li>
            <li><strong>SARGENTO (Sargento de Pelotão):</strong> Gerencia as folgas do seu pelotão. Pode aprovar ou negar solicitações dos seus subordinados, que são então encaminhadas para o Admin. Também pode gerar relatórios do seu pelotão.</li>
            <li><strong>SUBORDINADO (Policial):</strong> Acesso focado em suas próprias informações. Pode solicitar (acionar) folgas, visualizar o status de suas solicitações, seu saldo de folgas e o calendário geral.</li>
          </ul>
        </HelpItem>

        <HelpItem title="Gerenciamento de Folgas (Passo a Passo)">
          <h3 className="text-lg font-semibold text-pm-gray-700 mb-2">1. Como Acionar uma Nova Folga</h3>
          <p>Na página <strong>"Gerenciar Folgas"</strong>, clique no botão <strong>"Acionar Folga"</strong>.</p>
          <ul className="list-decimal list-inside space-y-2 pl-4">
            <li>Se for Admin ou Sargento, selecione o policial para quem a folga será lançada. Se for Subordinado, seu nome já estará selecionado.</li>
            <li>Escolha a data desejada para a folga. O sistema não permite selecionar datas passadas.</li>
            <li>Seu saldo de folgas para o ano corrente é exibido no canto superior direito como referência.</li>
          </ul>

          <h3 className="text-lg font-semibold text-pm-gray-700 mt-4 mb-2">2. Preenchendo o Motivo (Importante!)</h3>
          <p>É obrigatório selecionar um tipo de motivo para a folga. Cada tipo requer informações específicas:</p>
           <ul className="list-disc list-inside space-y-2 pl-4 mt-2">
            <li><strong>Folga Cmt Geral:</strong> Utilizada para folgas concedidas diretamente pelo Comandante Geral. Não requer detalhes adicionais.</li>
            <li><strong>Folga Cmt Cia:</strong> Para folgas concedidas pelo Comando de Cia. É obrigatório descrever o motivo da concessão no campo de texto que aparecerá.</li>
            <li><strong>Folga Compensação:</strong> Usada para compensar um serviço extra. Você deve preencher a <strong>data</strong>, <strong>hora de início</strong> e <strong>hora de fim</strong> do serviço que está sendo compensado. O número do BOPM é opcional, mas recomendado.</li>
            <li><strong>Folga Outros:</strong> Para situações não cobertas pelas opções acima. É obrigatório fornecer uma justificativa detalhada.</li>
          </ul>

          <h3 className="text-lg font-semibold text-pm-gray-700 mt-4 mb-2">3. O Fluxo de Aprovação</h3>
          <p>Toda folga solicitada passa por um fluxo até ser validada e se tornar ativa:</p>
          <ul className="list-decimal list-inside space-y-2 pl-4">
            <li><strong>Subordinado solicita:</strong> A folga é criada com o status <strong>"Pendente Sgt."</strong> e uma notificação é enviada ao Sargento do pelotão.</li>
            <li><strong>Sargento analisa:</strong> O Sargento pode <strong>Aprovar</strong> ou <strong>Negar</strong> a solicitação. Se aprovada, o status muda para <strong>"Aprovada Sgt."</strong> e uma notificação é enviada aos Admins. Se negada, o processo termina.</li>
            <li><strong>Admin valida:</strong> O Admin analisa a folga aprovada pelo Sargento. Se ele <strong>Validar</strong>, o status muda para <strong>"Validada Adm."</strong>, a folga se torna <strong>ATIVA</strong> e consome 1 crédito do saldo do policial. Se ele <strong>Reprovar</strong>, o processo termina.</li>
          </ul>

          <h3 className="text-lg font-semibold text-pm-gray-700 mt-4 mb-2">4. Trocando ou Excluindo uma Folga</h3>
          <p>Apenas folgas com status <strong>"ATIVA"</strong> podem ser trocadas ou excluídas.</p>
           <ul className="list-disc list-inside space-y-2 pl-4 mt-2">
            <li><strong>Trocar:</strong> Altera a data de uma folga já validada. A data original é liberada.</li>
            <li><strong>Excluir:</strong> Remove a folga do calendário. É necessário informar um motivo para a exclusão.</li>
            <li><strong>Restaurar (Apenas Admin):</strong> O Admin tem a permissão de restaurar uma folga que foi trocada ou excluída, tornando-a ativa novamente.</li>
          </ul>
        </HelpItem>
        
        <HelpItem title="Controle de Férias (Admin)">
            <p>Nesta página, o Administrador pode agendar os períodos de férias para todo o efetivo.</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li>O sistema controla automaticamente o saldo de dias (15 ou 30) por ano de referência para cada policial.</li>
                <li>Ao agendar, o sistema verifica se há conflitos com folgas já ativas para o mesmo policial no período solicitado, evitando agendamentos sobrepostos.</li>
            </ul>
        </HelpItem>

        <HelpItem title="Calendário e Agenda">
            <p><strong>Calendário Geral:</strong> Oferece uma visão mensal de todos os eventos: folgas ativas, férias agendadas e eventos da agenda (cursos, operações, etc.). É uma ferramenta visual para planejamento e consulta rápida.</p>
            <p><strong>Agenda (Admin):</strong> Permite ao Admin criar eventos específicos, como Cursos, EAP, Operações, e escalar o efetivo necessário. Ao escalar um policial para um evento, ele recebe uma notificação. O sistema também impede que um policial seja escalado para um EAP ou Curso que já tenha participado, garantindo o rodízio do efetivo.</p>
        </HelpItem>

        <HelpItem title="Funções de Administrador (Admin)">
            <p>O perfil de Admin possui acesso a áreas estratégicas do sistema:</p>
             <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Gerenciar Policiais:</strong> Permite cadastrar, editar, inativar e excluir policiais do efetivo. Também é aqui que o Admin concede, reseta ou revoga o acesso de um usuário ao sistema. A importação em massa via planilha Excel também é feita nesta tela.</li>
                <li><strong>Créditos de Folga:</strong> O Admin gerencia o saldo de folgas de todos os policiais, podendo adicionar ou remover créditos com justificativa (ex: concessão anual). A página também mostra um balanço completo do saldo de todo o efetivo.</li>
             </ul>
        </HelpItem>

        <HelpItem title="Relatórios (Sargento e Admin)">
            <p>O sistema oferece ferramentas poderosas para extração de dados:</p>
             <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Relatório de Folgas:</strong> Permite gerar uma planilha Excel (.xlsx) com todas as solicitações de folga dentro de um período, com filtros por pelotão. O arquivo inclui detalhes completos, como datas, status e pareceres.</li>
                <li><strong>Relatório EAP/Cursos:</strong> Uma ferramenta crucial para o planejamento de cursos. Permite filtrar por tipo (EAP ou Curso) e pelotão, e exibe duas listas claras: quem já participou e quem está pendente. Esses dados também podem ser exportados para Excel.</li>
             </ul>
        </HelpItem>

        <HelpItem title="Notificações">
          <p>O ícone de sino no canto superior do menu lateral exibe notificações em tempo real sobre eventos importantes relacionados a você. Por exemplo:</p>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li><strong>Sargentos</strong> são notificados quando um subordinado solicita uma folga.</li>
            <li><strong>Admins</strong> são notificados quando um sargento aprova uma folga.</li>
            <li><strong>Subordinados</strong> são notificados sobre mudanças no status de suas folgas (aprovada, negada, etc.).</li>
            <li><strong>Qualquer policial</strong> é notificado ao ser escalado para um evento na Agenda.</li>
          </ul>
        </HelpItem>

      </div>
    </div>
  );
};

export default AjudaPage;