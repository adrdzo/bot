export type TipoExercicio = "composto" | "isolado" | "core";
export type TreinoId = "SUP1" | "INF1" | "SUP2" | "INF2";
export type Equipamento = "barra" | "halter" | "maquina" | "cabo" | "corporal";
export type CategoriaIncremento = "pernas" | "superior" | "isolado" | "core";

export type Musculo =
  | "Costas"
  | "Deltoide lateral"
  | "Deltoide posterior"
  | "Deltoide anterior"
  | "Peito"
  | "Bíceps"
  | "Tríceps"
  | "Quadríceps"
  | "Posteriores"
  | "Glúteo"
  | "Panturrilha"
  | "Abdômen"
  | "Antebraço"
  | "Trapézio"
  | "Lombar";

export type Padrao =
  | "puxadaVertical"
  | "barraFixa"
  | "supinoInclinado"
  | "supinoReto"
  | "remadaApoiada"
  | "remadaUnilateral"
  | "elevacaoLateral"
  | "crucifixoInverso"
  | "rosca"
  | "tricepsPolia"
  | "tricepsFrances"
  | "agachamento"
  | "stiff"
  | "legPress"
  | "flexoraSentada"
  | "mesaFlexora"
  | "panturrilhaPe"
  | "panturrilhaSentada"
  | "abWheel"
  | "crunchPolia"
  | "hack"
  | "bulgaro"
  | "extensora"
  | "pulldownEstendido"
  | "facePull"
  | "flexao"
  | "prancha";

export interface Exercicio {
  id: string;
  nome: string;
  tipo: TipoExercicio;
  categoria: CategoriaIncremento;
  equipamento: Equipamento;
  musculoPrincipal: Musculo;
  musculosSecundarios?: Musculo[];
  unilateral?: boolean;
  padrao: Padrao;
  substitutos?: string[];
  execucao: string[];
  dicas: string[];
  erros: string[];
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
  foco: string;
  itens: ItemTreino[];
}

export interface Serie {
  numero: number;
  carga: number;
  reps: number;
  rir?: number;
  execucaoOk: boolean;
  feita: boolean;
}

export interface RegistroExercicio {
  exercicioId: string;
  /** exercício planejado na ficha (quando foi substituído) */
  planejadoId?: string;
  repsMin: number;
  repsMax: number;
  series: Serie[];
  nota?: string;
}

export interface Sessao {
  id: string;
  data: string;
  fim?: string;
  treinoId: TreinoId;
  deload: boolean;
  registros: RegistroExercicio[];
  duracaoMin?: number;
  nota?: string;
}

export interface CheckinSemanal {
  semanaISO: string;
  data: string;
  pesoMedio?: number;
  cinturaCm?: number;
  sono: number;
  fadiga: number;
  motivacao: number;
  dorArticular?: string;
  comentarios?: string;
}

export interface Medidas {
  cintura: number;
  braco: number;
  peito: number;
  coxa: number;
  panturrilha: number;
  ombros: number;
}

export type Decisao = "manter" | "aumentar" | "reduzir" | "deload";

export interface AvaliacaoMensal {
  id: string;
  data: string;
  peso: number;
  gorduraPct?: number;
  medidas: Medidas;
  fotos?: { frente?: string; lado?: string; costas?: string };
  pontosFracos: string[];
  decisao: Decisao;
  musculosAjuste?: string[];
  nota?: string;
}

export interface Pesagem {
  data: string; // YYYY-MM-DD
  peso: number;
}

export type ModoNutricao = "cutting" | "recomposicao" | "ganho";
export type NivelAtividade = "sedentario" | "leve" | "moderado" | "alto" | "muitoAlto";

export interface AjusteNutricao {
  data: string;
  deltaKcal: number;
  motivo: string;
}

export interface Usuario {
  nome: string;
  altura: number;
  idade: number;
  sexo: "M" | "F";
  pesoInicial?: number;
  gorduraPct?: number;
  nivelAtividade: NivelAtividade;
  modoNutricao: ModoNutricao;
  modoCintura: boolean;
  ajusteKcal: number;
  ajustesNutricao: AjusteNutricao[];
  passosCarga: Record<Equipamento, number>;
  ultimoDeload?: string;
  inicioPrograma: string;
  proximoTreino: TreinoId;
  diasTreino: number[]; // 0=domingo
  metaSemanal: 3 | 4;
  descansoComposto: number;
  descansoIsolado: number;
  notificacoes: boolean;
  lembretePesagem: boolean;
  onboarded: boolean;
  tema: "auto" | "claro" | "escuro";
  barraKg: number;
  anilhasDisponiveis: number[];
}

export interface DeloadAtivo {
  inicio: string;
  sessoesRestantes: number;
}
