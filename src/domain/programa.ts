import type { EstadoApp, Exercicio, Treino, TreinoId, Usuario } from './types';

export const ROTACAO: TreinoId[] = ['SUP1', 'INF1', 'SUP2', 'INF2'];

export function proximoDaFila(atual: TreinoId): TreinoId {
  return ROTACAO[(ROTACAO.indexOf(atual) + 1) % ROTACAO.length];
}

type Ex = Omit<Exercicio, 'id'>;

const ex = (e: Ex) => e;

/** Catálogo: exercícios do programa + alternativas para o botão "substituir". */
export const EXERCICIOS_PADRAO: Record<string, Exercicio> = Object.fromEntries(
  Object.entries({
    // ---- SUP1
    barra_fixa: ex({ nome: 'Barra fixa / Puxada alta', tipo: 'composto', musculoPrincipal: 'Costas (vertical)', grupo: 'Costas', equipamento: 'maquina', incrementoKg: 2, musculosSecundarios: ['Bíceps'], substitutos: ['puxada_alta_aberta', 'puxada_neutra'] }),
    supino_inclinado_halteres: ex({ nome: 'Supino inclinado halteres', tipo: 'composto', musculoPrincipal: 'Peito', grupo: 'Peito', equipamento: 'halter', incrementoKg: 2, musculosSecundarios: ['Deltoide anterior', 'Tríceps'], substitutos: ['supino_inclinado_maquina', 'supino_inclinado_barra'] }),
    remada_apoiada: ex({ nome: 'Remada apoiada', tipo: 'composto', musculoPrincipal: 'Costas (horizontal)', grupo: 'Costas', equipamento: 'barra', incrementoKg: 1, musculosSecundarios: ['Deltoide posterior', 'Bíceps'], substitutos: ['remada_maquina', 'remada_unilateral'] }),
    elevacao_lateral: ex({ nome: 'Elevação lateral', tipo: 'isolado', musculoPrincipal: 'Deltoide lateral', grupo: 'Deltoide lateral', equipamento: 'halter', incrementoKg: 1, substitutos: ['elevacao_lateral_cabo', 'elevacao_lateral_maquina'] }),
    crucifixo_inverso: ex({ nome: 'Crucifixo inverso', tipo: 'isolado', musculoPrincipal: 'Deltoide posterior', grupo: 'Deltoide posterior', equipamento: 'maquina', incrementoKg: 1, substitutos: ['face_pull', 'crucifixo_inverso_halteres'] }),
    rosca_inclinada: ex({ nome: 'Rosca inclinada', tipo: 'isolado', musculoPrincipal: 'Bíceps', grupo: 'Bíceps', equipamento: 'halter', incrementoKg: 1, substitutos: ['rosca_martelo', 'rosca_direta'] }),
    triceps_corda: ex({ nome: 'Tríceps corda', tipo: 'isolado', musculoPrincipal: 'Tríceps', grupo: 'Tríceps', equipamento: 'cabo', incrementoKg: 1, substitutos: ['triceps_barra_v', 'triceps_frances'] }),
    // ---- INF1
    agachamento_livre: ex({ nome: 'Agachamento livre', tipo: 'composto', musculoPrincipal: 'Quadríceps', grupo: 'Quadríceps', pernas: true, equipamento: 'barra', incrementoKg: 2.5, musculosSecundarios: ['Glúteo', 'Adutores'], substitutos: ['agachamento_smith', 'hack_squat'] }),
    stiff: ex({ nome: 'Stiff / Terra romeno', tipo: 'composto', musculoPrincipal: 'Posteriores', grupo: 'Posteriores', pernas: true, equipamento: 'barra', incrementoKg: 2.5, musculosSecundarios: ['Glúteo', 'Eretores'], substitutos: ['stiff_halteres'] }),
    leg_press: ex({ nome: 'Leg press', tipo: 'composto', musculoPrincipal: 'Quadríceps', grupo: 'Quadríceps', pernas: true, equipamento: 'maquina', incrementoKg: 5, musculosSecundarios: ['Glúteo'], substitutos: ['hack_squat', 'agachamento_smith'] }),
    flexora_sentada: ex({ nome: 'Flexora sentada', tipo: 'isolado', musculoPrincipal: 'Posteriores', grupo: 'Posteriores', equipamento: 'maquina', incrementoKg: 2, substitutos: ['mesa_flexora'] }),
    panturrilha_em_pe: ex({ nome: 'Panturrilha em pé', tipo: 'isolado', musculoPrincipal: 'Panturrilha', grupo: 'Panturrilha', equipamento: 'maquina', incrementoKg: 2, substitutos: ['panturrilha_leg_press'] }),
    ab_wheel: ex({ nome: 'Ab wheel', tipo: 'core', musculoPrincipal: 'Abdômen', grupo: 'Abdômen', equipamento: 'peso_corporal', incrementoKg: 1, substitutos: ['crunch_polia', 'prancha_com_carga'] }),
    // ---- SUP2
    puxada_neutra: ex({ nome: 'Puxada neutra', tipo: 'composto', musculoPrincipal: 'Costas (vertical)', grupo: 'Costas', equipamento: 'maquina', incrementoKg: 2, musculosSecundarios: ['Bíceps'], substitutos: ['barra_fixa', 'puxada_alta_aberta'] }),
    supino_reto: ex({ nome: 'Supino reto', tipo: 'composto', musculoPrincipal: 'Peito', grupo: 'Peito', equipamento: 'barra', incrementoKg: 2, musculosSecundarios: ['Deltoide anterior', 'Tríceps'], substitutos: ['supino_reto_halteres', 'supino_maquina'] }),
    remada_unilateral: ex({ nome: 'Remada unilateral', tipo: 'composto', musculoPrincipal: 'Costas (horizontal)', grupo: 'Costas', unilateral: true, equipamento: 'halter', incrementoKg: 2, musculosSecundarios: ['Bíceps'], substitutos: ['remada_maquina', 'remada_apoiada'] }),
    pulldown_braco_estendido: ex({ nome: 'Pulldown braço estendido', tipo: 'isolado', musculoPrincipal: 'Costas', grupo: 'Costas', equipamento: 'cabo', incrementoKg: 1, substitutos: ['pullover_halter'] }),
    elevacao_lateral_cabo: ex({ nome: 'Elevação lateral no cabo', tipo: 'isolado', musculoPrincipal: 'Deltoide lateral', grupo: 'Deltoide lateral', unilateral: true, equipamento: 'cabo', incrementoKg: 1, substitutos: ['elevacao_lateral', 'elevacao_lateral_maquina'] }),
    face_pull: ex({ nome: 'Face pull', tipo: 'isolado', musculoPrincipal: 'Deltoide posterior', grupo: 'Deltoide posterior', equipamento: 'cabo', incrementoKg: 1, substitutos: ['crucifixo_inverso', 'crucifixo_inverso_halteres'] }),
    rosca_martelo: ex({ nome: 'Rosca martelo', tipo: 'isolado', musculoPrincipal: 'Bíceps', grupo: 'Bíceps', equipamento: 'halter', incrementoKg: 1, substitutos: ['rosca_inclinada', 'rosca_direta'] }),
    triceps_frances: ex({ nome: 'Tríceps francês', tipo: 'isolado', musculoPrincipal: 'Tríceps', grupo: 'Tríceps', equipamento: 'halter', incrementoKg: 1, substitutos: ['triceps_corda', 'triceps_barra_v'] }),
    // ---- INF2
    hack_squat: ex({ nome: 'Hack squat', tipo: 'composto', musculoPrincipal: 'Quadríceps', grupo: 'Quadríceps', pernas: true, equipamento: 'maquina', incrementoKg: 2.5, musculosSecundarios: ['Glúteo'], substitutos: ['agachamento_smith', 'leg_press'] }),
    mesa_flexora: ex({ nome: 'Mesa flexora', tipo: 'isolado', musculoPrincipal: 'Posteriores', grupo: 'Posteriores', equipamento: 'maquina', incrementoKg: 2, substitutos: ['flexora_sentada'] }),
    bulgaro: ex({ nome: 'Búlgaro (cada perna)', tipo: 'composto', musculoPrincipal: 'Quadríceps/Glúteo', grupo: 'Quadríceps', musculosSecundarios: ['Glúteo'], unilateral: true, pernas: true, equipamento: 'halter', incrementoKg: 2, substitutos: ['afundo_halteres'] }),
    cadeira_extensora: ex({ nome: 'Cadeira extensora', tipo: 'isolado', musculoPrincipal: 'Quadríceps', grupo: 'Quadríceps', equipamento: 'maquina', incrementoKg: 2, substitutos: [] }),
    panturrilha_sentada: ex({ nome: 'Panturrilha sentada', tipo: 'isolado', musculoPrincipal: 'Panturrilha', grupo: 'Panturrilha', equipamento: 'maquina', incrementoKg: 2, substitutos: ['panturrilha_em_pe'] }),
    crunch_polia: ex({ nome: 'Crunch na polia', tipo: 'isolado', musculoPrincipal: 'Abdômen', grupo: 'Abdômen', equipamento: 'cabo', incrementoKg: 2, substitutos: ['ab_wheel'] }),
    // ---- Alternativas
    puxada_alta_aberta: ex({ nome: 'Puxada alta aberta', tipo: 'composto', musculoPrincipal: 'Costas (vertical)', grupo: 'Costas', equipamento: 'maquina', incrementoKg: 2, substitutos: ['barra_fixa', 'puxada_neutra'] }),
    supino_inclinado_maquina: ex({ nome: 'Supino inclinado máquina', tipo: 'composto', musculoPrincipal: 'Peito', grupo: 'Peito', equipamento: 'maquina', incrementoKg: 2, substitutos: ['supino_inclinado_halteres'] }),
    supino_inclinado_barra: ex({ nome: 'Supino inclinado barra', tipo: 'composto', musculoPrincipal: 'Peito', grupo: 'Peito', equipamento: 'barra', incrementoKg: 2, substitutos: ['supino_inclinado_halteres'] }),
    remada_maquina: ex({ nome: 'Remada máquina', tipo: 'composto', musculoPrincipal: 'Costas (horizontal)', grupo: 'Costas', equipamento: 'maquina', incrementoKg: 2, substitutos: ['remada_apoiada', 'remada_unilateral'] }),
    elevacao_lateral_maquina: ex({ nome: 'Elevação lateral máquina', tipo: 'isolado', musculoPrincipal: 'Deltoide lateral', grupo: 'Deltoide lateral', equipamento: 'maquina', incrementoKg: 1, substitutos: ['elevacao_lateral', 'elevacao_lateral_cabo'] }),
    crucifixo_inverso_halteres: ex({ nome: 'Crucifixo inverso halteres', tipo: 'isolado', musculoPrincipal: 'Deltoide posterior', grupo: 'Deltoide posterior', equipamento: 'halter', incrementoKg: 1, substitutos: ['crucifixo_inverso', 'face_pull'] }),
    rosca_direta: ex({ nome: 'Rosca direta', tipo: 'isolado', musculoPrincipal: 'Bíceps', grupo: 'Bíceps', equipamento: 'barra', incrementoKg: 1, substitutos: ['rosca_inclinada', 'rosca_martelo'] }),
    triceps_barra_v: ex({ nome: 'Tríceps barra V', tipo: 'isolado', musculoPrincipal: 'Tríceps', grupo: 'Tríceps', equipamento: 'cabo', incrementoKg: 1, substitutos: ['triceps_corda', 'triceps_frances'] }),
    agachamento_smith: ex({ nome: 'Agachamento no Smith', tipo: 'composto', musculoPrincipal: 'Quadríceps', grupo: 'Quadríceps', pernas: true, equipamento: 'barra', incrementoKg: 2.5, substitutos: ['agachamento_livre', 'hack_squat'] }),
    stiff_halteres: ex({ nome: 'Stiff com halteres', tipo: 'composto', musculoPrincipal: 'Posteriores', grupo: 'Posteriores', pernas: true, equipamento: 'halter', incrementoKg: 2, substitutos: ['stiff'] }),
    panturrilha_leg_press: ex({ nome: 'Panturrilha no leg press', tipo: 'isolado', musculoPrincipal: 'Panturrilha', grupo: 'Panturrilha', equipamento: 'maquina', incrementoKg: 5, substitutos: ['panturrilha_em_pe', 'panturrilha_sentada'] }),
    prancha_com_carga: ex({ nome: 'Prancha com carga (s)', tipo: 'core', musculoPrincipal: 'Abdômen', grupo: 'Abdômen', equipamento: 'peso_corporal', incrementoKg: 2.5, substitutos: ['ab_wheel'] }),
    supino_reto_halteres: ex({ nome: 'Supino reto halteres', tipo: 'composto', musculoPrincipal: 'Peito', grupo: 'Peito', equipamento: 'halter', incrementoKg: 2, substitutos: ['supino_reto', 'supino_maquina'] }),
    supino_maquina: ex({ nome: 'Supino máquina', tipo: 'composto', musculoPrincipal: 'Peito', grupo: 'Peito', equipamento: 'maquina', incrementoKg: 2, substitutos: ['supino_reto'] }),
    pullover_halter: ex({ nome: 'Pullover com halter', tipo: 'isolado', musculoPrincipal: 'Costas', grupo: 'Costas', equipamento: 'halter', incrementoKg: 2, substitutos: ['pulldown_braco_estendido'] }),
    afundo_halteres: ex({ nome: 'Afundo com halteres', tipo: 'composto', musculoPrincipal: 'Quadríceps/Glúteo', grupo: 'Quadríceps', unilateral: true, pernas: true, equipamento: 'halter', incrementoKg: 2, substitutos: ['bulgaro'] }),
  } as Record<string, Ex>).map(([id, e]) => [id, { id, ...e }]),
);

const item = (exercicioId: string, ordem: number, series: number, repsMin: number, repsMax: number) => ({
  exercicioId,
  ordem,
  series,
  repsMin,
  repsMax,
});

export const TREINOS_PADRAO: Record<TreinoId, Treino> = {
  SUP1: {
    id: 'SUP1',
    nome: 'Superior 1 · largura e ombros',
    itens: [
      item('barra_fixa', 1, 3, 6, 10),
      item('supino_inclinado_halteres', 2, 3, 6, 10),
      item('remada_apoiada', 3, 3, 8, 10),
      item('elevacao_lateral', 4, 4, 12, 15),
      item('crucifixo_inverso', 5, 3, 12, 15),
      item('rosca_inclinada', 6, 2, 10, 12),
      item('triceps_corda', 7, 2, 10, 12),
    ],
  },
  INF1: {
    id: 'INF1',
    nome: 'Inferior 1 · quadríceps',
    itens: [
      item('agachamento_livre', 1, 3, 6, 8),
      item('stiff', 2, 3, 8, 10),
      item('leg_press', 3, 2, 10, 12),
      item('flexora_sentada', 4, 3, 10, 12),
      item('panturrilha_em_pe', 5, 3, 8, 12),
      item('ab_wheel', 6, 3, 8, 15),
    ],
  },
  SUP2: {
    id: 'SUP2',
    nome: 'Superior 2 · costas e ombros',
    itens: [
      item('puxada_neutra', 1, 3, 8, 12),
      item('supino_reto', 2, 3, 6, 10),
      item('remada_unilateral', 3, 3, 8, 12),
      item('pulldown_braco_estendido', 4, 2, 12, 15),
      item('elevacao_lateral_cabo', 5, 4, 12, 20),
      item('face_pull', 6, 2, 12, 15),
      item('rosca_martelo', 7, 2, 10, 12),
      item('triceps_frances', 8, 2, 10, 12),
    ],
  },
  INF2: {
    id: 'INF2',
    nome: 'Inferior 2 · posterior e glúteo',
    itens: [
      item('hack_squat', 1, 3, 8, 10),
      item('mesa_flexora', 2, 3, 10, 12),
      item('bulgaro', 3, 2, 8, 12),
      item('cadeira_extensora', 4, 2, 12, 15),
      item('panturrilha_sentada', 5, 3, 12, 15),
      item('crunch_polia', 6, 3, 10, 15),
    ],
  },
};

export const USUARIO_PADRAO: Usuario = {
  nome: '',
  altura: 178,
  idade: 30,
  sexo: 'M',
  modoNutricao: 'recomposicao',
  nivelAtividade: 'moderado',
  priorizarCintura: true,
  anilhasDisponiveis: [1, 1.25, 2.5, 5, 10, 20],
  halteresDisponiveis: [],
  proximoTreino: 'SUP1',
  diasPorSemana: 4,
  diasTreino: [1, 2, 4, 5],
  descansoCompostoSeg: 150,
  descansoIsoladoSeg: 75,
  gruposPrioritarios: ['Costas', 'Deltoide lateral', 'Deltoide posterior'],
  notificacoes: false,
  lembretePesagem: false,
};

export const VERSAO_ESTADO = 1;

export function estadoInicial(): EstadoApp {
  return {
    versao: VERSAO_ESTADO,
    usuario: structuredClone(USUARIO_PADRAO),
    exercicios: structuredClone(EXERCICIOS_PADRAO),
    treinos: structuredClone(TREINOS_PADRAO),
    sessoes: [],
    pesagens: [],
    checkins: [],
    avaliacoes: [],
    ajustesNutricao: [],
    notificacoesEnviadas: [],
  };
}
