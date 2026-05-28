// Conteúdo de ajuda contextual para cada módulo.
// Edite aqui para ajustar textos sem mexer na lógica do componente.

export type TelaAjuda =
  | 'home'
  | 'dashboard'
  | 'estoque'
  | 'outros-custos'
  | 'relatorios'
  | 'fichas'
  | 'cadastros'
  | 'configuracoes'
  | 'ruptura'
  | 'compras-inteligente'
  | 'cardapio-inteligente'
  | 'videos'

export interface AjudaConteudo {
  oQueE: string
  comoUsar: string
  dica?: string
}

export const AJUDA_MODULOS: Record<TelaAjuda, AjudaConteudo> = {
  home: {
    oQueE:    'Sua tela inicial — um panorama rápido de onde você está no ciclo da semana e atalhos para o dia a dia.',
    comoUsar: 'Use os cartões de acesso rápido para pular direto pro que precisa fazer agora.',
  },

  dashboard: {
    oQueE:    'O raio-x financeiro da sua semana. Mostra seu CMV% — quanto dos seus insumos viraram custo — comparado à sua meta.',
    comoUsar: 'Acompanhe o número grande de CMV%. Verde é saudável, vermelho passou da meta. Role para ver a evolução das últimas semanas.',
    dica:     'Acima de 35% geralmente significa que você está perdendo margem. Investigue compras ou desperdício.',
  },

  estoque: {
    oQueE:    'Onde você faz a contagem do que tem no estoque — no início e no fim da semana.',
    comoUsar: 'Lance a contagem Inicial na segunda e a Final no domingo. A diferença, somada às compras, é o que alimenta seu CMV.',
    dica:     'Conte sempre no mesmo horário e dia. Consistência é o que deixa o número confiável.',
  },

  'outros-custos': {
    oQueE:    'Onde entram os custos que não são insumos — gás, embalagens, limpeza — e onde você vê o resultado final da semana.',
    comoUsar: 'Registre o faturamento e as despesas da semana. O sistema cruza tudo e mostra seu resultado real.',
  },

  relatorios: {
    oQueE:    'O histórico completo do seu restaurante, pronto para exportar em Excel ou PDF.',
    comoUsar: 'Escolha o tipo de relatório (resumo, auditoria, comparação ou preços) e exporte para guardar ou mandar pro contador.',
  },

  fichas: {
    oQueE:    'A receita de custo de cada prato. Quanto de cada insumo entra e quanto o prato custa de verdade pra produzir.',
    comoUsar: 'Monte a ficha com os ingredientes e quantidades. O sistema calcula o custo real considerando o rendimento (perda de osso, casca etc).',
    dica:     'É a base de tudo. Ficha errada = preço errado e CMV mascarado.',
  },

  ruptura: {
    oQueE:    'Avisa quantos dias de estoque restam para cada insumo, antes de acabar no meio do serviço.',
    comoUsar: 'Olhe os alertas: vermelho acaba em poucos dias, amarelo precisa de atenção. A previsão usa seu consumo das últimas semanas.',
    dica:     'O alerta de "risco de perda" mostra insumos que vão vencer antes de você conseguir usar — compre menos desses.',
  },

  'compras-inteligente': {
    oQueE:    'Uma lista de compras automática, calculada pelo seu consumo real — sem sobrar nem faltar.',
    comoUsar: 'Defina quantos dias de cobertura você quer e o sistema sugere a quantidade de cada item, com custo estimado.',
    dica:     'Itens perecíveis têm a sugestão limitada pela validade — ele não manda comprar o que vai estragar.',
  },

  'cardapio-inteligente': {
    oQueE:    'Mostra quais pratos te dão lucro e quais te sangram, cruzando margem real com volume de vendas (Matriz BCG).',
    comoUsar: 'Cada prato cai num quadrante — ⭐ Estrela, 🐎 Cavalo, ❓ Interrogação, 🍍 Abacaxi. Foque em vender mais Estrelas e repensar os Abacaxis.',
    dica:     'O "preço sugerido" usa a fórmula de Markup Divisor — o preço que bate sua margem-alvo já considerando impostos e taxas.',
  },

  cadastros: {
    oQueE:    'A lista de todos os ingredientes e produtos que você compra, com unidade, grupo e rendimento.',
    comoUsar: 'Cadastre cada insumo uma vez. Ele fica disponível pra usar nas fichas, contagens e compras.',
    dica:     'Preencha o rendimento certo (ex: frango com osso ~85%). É o que torna o custo do prato real.',
  },

  configuracoes: {
    oQueE:    'Onde você ajusta sua empresa: meta de CMV, equipe, identidade visual, PIN de segurança e categorias.',
    comoUsar: 'Configure uma vez no começo. Convide sua equipe pela aba de cargos e defina o que cada um pode ver ou editar.',
  },

  videos: {
    oQueE:    'Vídeos curtos ensinando a usar cada parte do Margem+ e boas práticas de controle de CMV.',
    comoUsar: 'Assista no seu ritmo. Ideal pra treinar funcionários novos sem você ter que explicar tudo.',
  },
}
