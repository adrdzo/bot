// Modelo de dados do Projeto Dragão (seção 6 da especificação, com os campos extras que a lógica precisa)

export type TipoExercicio = 'composto' | 'isolado' | 'core';
export type TreinoId = 'SUP1' | 'INF1' | 'SUP2' | 'INF2';
export type Equipamento = 'barra' | 'halter' | 'maquina' | 'cabo' | 'peso_corporal';

/** Grupos usados no cálculo de volume semanal. */
export type Grupo =
  | 'Costas'
  | 'Deltoide lateral'
  | 'Deltoide posterior'
  | 'Quadríceps'
  | 'Posteriores'
  | 'Peito'
  | 'Bíceps'
  | 'Tríceps'
  | 'Panturrilha'
  | 'Abdômen'
  | 'Glúteo';

export interface Exercicio {
  id: string;
  nome: string;
  tipo: TipoExercicio;
  musculoPrincipal: string;
  /** Grupo que recebe as séries no cálculo de volume. */
  grupo: Grupo;
  musculosSecundarios?: string[];
  unilateral?: boolean;
  /** Composto de pernas usa +5%; composto de superiores +2,5%. */
  pernas?: boolean;
  equipamento: Equipamento;
  /** Incremento mínimo em kg (configurável). */
  incrementoKg: number;
  substitutos?: string[];
  /** Criado pelo usuário (pode ser apagado). */
  custom?: boolean;
}

export interface ItemTreino {
  exercicioId: string;
  ordem: number;
  series: number;
  repsMin: number;
  repsMax: number;
}

export interface Treino {
  id: TreinoId;
  nome: string;
  itens: ItemTreino[];
}

export interface Serie {
  numero: number;
  carga: number;
  reps: number;
  rir?: number;
  execucaoOk: boolean;
}

export interface RegistroExercicio {
  exercicioId: string;
  /** Exercício do plano que foi substituído (se houver). */
  substituiuId?: string;
  series: Serie[];
  nota?: string;
}

export interface Sessao {
  id: string;
  data: string; // ISO
  treinoId: TreinoId;
  deload: boolean;
  registros: RegistroExercicio[];
  duracaoMin?: number;
}

export interface Pesagem {
  data: string; // YYYY-MM-DD
  peso: number;
}

export interface CheckinSemanal {
  semanaISO: string; // ex. "2026-W47"
  pesoMedio: number;
  cinturaCm?: number;
  sono: number;
  fadiga: number;
  motivacao: number;
  dorArticular?: string;
  comentarios?: string;
}

export type DecisaoVolume = 'manter' | 'aumentar' | 'reduzir' | 'deload';

export interface Medidas {
  cintura: number;
  braco: number;
  peito: number;
  coxa: number;
  panturrilha: number;
  ombros: number;
}

export interface AvaliacaoMensal {
  id: string;
  data: string;
  peso: number;
  medidas: Medidas;
  fotos?: { frente?: string; lado?: string; costas?: string };
  pontosFracos: string[];
  decisao: DecisaoVolume;
  gruposDecisao?: Grupo[];
}

export type NivelAtividade = 'sedentario' | 'leve' | 'moderado' | 'alto' | 'muito_alto';
export type ModoNutricao = 'cutting' | 'recomposicao' | 'ganho';

export interface Usuario {
  nome: string;
  altura: number;
  idade: number;
  sexo: 'M' | 'F';
  modoNutricao: ModoNutricao;
  nivelAtividade: NivelAtividade;
  gorduraPct?: number;
  /** No modo cintura, a medida da cintura pesa mais que o peso no ajuste calórico. */
  priorizarCintura: boolean;
  /** Anilhas disponíveis (kg). A menor define o passo de arredondamento das cargas. */
  anilhasDisponiveis: number[];
  /** Halteres disponíveis (kg). Vazio = arredondar como anilha. */
  halteresDisponiveis: number[];
  ultimoDeload?: string;
  proximoTreino: TreinoId;
  diasPorSemana: 3 | 4;
  /** Dias de treino (0 = domingo) para o lembrete. */
  diasTreino: number[];
  descansoCompostoSeg: number;
  descansoIsoladoSeg: number;
  gruposPrioritarios: Grupo[];
  notificacoes: boolean;
  lembretePesagem: boolean;
}

export interface DeloadAtivo {
  inicio: string; // ISO
}

export interface AjusteNutricao {
  data: string;
  deltaKcal: number;
  motivo: string;
}

export interface SerieRascunho extends Serie {
  feita: boolean;
}

export interface RegistroRascunho {
  exercicioId: string;
  planoExercicioId: string;
  series: SerieRascunho[];
  nota?: string;
}

export interface SessaoRascunho {
  id: string;
  inicio: string;
  treinoId: TreinoId;
  deload: boolean;
  registros: RegistroRascunho[];
}

export interface EstadoApp {
  versao: number;
  usuario: Usuario;
  exercicios: Record<string, Exercicio>;
  treinos: Record<TreinoId, Treino>;
  sessoes: Sessao[];
  pesagens: Pesagem[];
  checkins: CheckinSemanal[];
  avaliacoes: AvaliacaoMensal[];
  ajustesNutricao: AjusteNutricao[];
  deloadAtivo?: DeloadAtivo;
  sessaoAtiva?: SessaoRascunho;
  /** Chaves de notificações já enviadas (evita repetir no mesmo dia). */
  notificacoesEnviadas: string[];
}
