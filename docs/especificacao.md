# Projeto Dragão: especificação do app de treino

> Documento-base para desenvolver um app de acompanhamento de treino de hipertrofia natural, focado em V-taper e cintura fina.
> Contém a filosofia, o programa, as regras de progressão e deload, o modelo de dados, as telas e a lógica automática.

---

## 1. Visão geral

| Item | Definição |
|---|---|
| Nome | Projeto Dragão |
| Usuário | Atleta natural, intermediário |
| Objetivo | Hipertrofia com foco em V-taper (ombros e dorsais largos), cintura fina, manter costas e pernas fortes |
| Frequência | 3 a 4 treinos por semana |
| Divisão | Superior/Inferior (4 treinos em rotação) |
| Plataforma sugerida | Mobile-first (PWA ou React Native), funciona offline |

### Filosofia (regra de ouro do app)
> "Para um atleta natural, o objetivo não é fazer o máximo que consegue recuperar hoje. É fazer o mínimo necessário para continuar evoluindo por meses e anos seguidos."

Princípios que o app deve aplicar:
1. Progressão de carga e repetições é a métrica principal.
2. Treinar a 0–2 RIR (repetições na reserva).
3. Volume suficiente, sem excesso; só aumentar quando houver dados que justifiquem.
4. A recuperação limita o progresso: sono e fadiga entram nas decisões.
5. Deload quando os dados pedirem, ou a cada 8–10 semanas no máximo.
6. Prioridade de progressão: **execução → repetições → carga → séries**.

---

## 2. Programa de treino

### 2.1 Rotação
- Sequência fixa: `SUP1 → INF1 → SUP2 → INF2 → (repete)`
- **Semana de 4 dias:** ex. seg/ter/qui/sex.
- **Semana de 3 dias:** o app **não pula** treinos e continua a sequência na semana seguinte.
- O app sempre mostra o **próximo treino da fila**, não um treino fixo por dia da semana.

### 2.2 Treinos

#### SUP1: Superior 1 (largura e ombros)
| # | Exercício | Séries | Faixa | Tipo | Músculo principal |
|---|---|---|---|---|---|
| 1 | Barra fixa / Puxada alta | 3 | 6–10 | composto | Costas (vertical) |
| 2 | Supino inclinado halteres | 3 | 6–10 | composto | Peito |
| 3 | Remada apoiada | 3 | 8–10 | composto | Costas (horizontal) |
| 4 | Elevação lateral | 4 | 12–15 | isolado | Deltoide lateral |
| 5 | Crucifixo inverso | 3 | 12–15 | isolado | Deltoide posterior |
| 6 | Rosca inclinada | 2 | 10–12 | isolado | Bíceps |
| 7 | Tríceps corda | 2 | 10–12 | isolado | Tríceps |

#### INF1: Inferior 1 (quadríceps)
| # | Exercício | Séries | Faixa | Tipo | Músculo principal |
|---|---|---|---|---|---|
| 1 | Agachamento livre | 3 | 6–8 | composto | Quadríceps |
| 2 | Stiff / Terra romeno | 3 | 8–10 | composto | Posteriores |
| 3 | Leg press | 2 | 10–12 | composto | Quadríceps |
| 4 | Flexora sentada | 3 | 10–12 | isolado | Posteriores |
| 5 | Panturrilha em pé | 3 | 8–12 | isolado | Panturrilha |
| 6 | Ab wheel | 3 | 8–15 | core (sem carga) | Abdômen |

#### SUP2: Superior 2 (costas e ombros)
| # | Exercício | Séries | Faixa | Tipo | Músculo principal |
|---|---|---|---|---|---|
| 1 | Puxada neutra | 3 | 8–12 | composto | Costas (vertical) |
| 2 | Supino reto | 3 | 6–10 | composto | Peito |
| 3 | Remada unilateral | 3 | 8–12 | composto | Costas (horizontal) |
| 4 | Pulldown braço estendido | 2 | 12–15 | isolado | Costas |
| 5 | Elevação lateral no cabo | 4 | 12–20 | isolado | Deltoide lateral |
| 6 | Face pull | 2 | 12–15 | isolado | Deltoide posterior |
| 7 | Rosca martelo | 2 | 10–12 | isolado | Bíceps |
| 8 | Tríceps francês | 2 | 10–12 | isolado | Tríceps |

#### INF2: Inferior 2 (posterior e glúteo)
| # | Exercício | Séries | Faixa | Tipo | Músculo principal |
|---|---|---|---|---|---|
| 1 | Hack squat | 3 | 8–10 | composto | Quadríceps |
| 2 | Mesa flexora | 3 | 10–12 | isolado | Posteriores |
| 3 | Búlgaro (cada perna) | 2 | 8–12 | composto | Quadríceps/Glúteo |
| 4 | Cadeira extensora | 2 | 12–15 | isolado | Quadríceps |
| 5 | Panturrilha sentada | 3 | 12–15 | isolado | Panturrilha |
| 6 | Crunch na polia | 3 | 10–15 | isolado | Abdômen |

### 2.3 Volume semanal de referência (4 dias)
| Músculo | Séries diretas/semana |
|---|---|
| Costas | 14 |
| Deltoide lateral | 8 |
| Deltoide posterior | 5 |
| Quadríceps | 12 |
| Posteriores | 9 |
| Peito | 6 (manutenção) |
| Bíceps | 4 |
| Tríceps | 4 |
| Panturrilha | 6 |
| Abdômen | 6 |

> O app deve calcular esse volume **dinamicamente** a partir dos treinos realizados na semana (com 3 dias, o volume cai ~25%).

---

## 3. Regras de treino (lógica do app)

### 3.1 Intensidade
- Padrão: **1–2 RIR**.
- Exercícios `isolado`: a última série pode ir a **0 RIR**.
- O app registra o RIR (opcional) em cada série.

### 3.2 Progressão dupla
```
SE todas as séries de trabalho atingiram o TOPO da faixa
   E a execução foi marcada como OK
ENTÃO
   próxima sessão: carga += incremento
                   meta de reps = FUNDO da faixa
SENÃO
   manter carga, buscar +1 rep em alguma série
```
**Incremento sugerido:**
| Tipo | Incremento |
|---|---|
| Composto de pernas (agachamento, hack, leg press, stiff) | +5% (mín. 2,5 kg) |
| Composto de superiores | +2,5% (mín. 1–2 kg) |
| Isolado | menor incremento disponível (0,5–2 kg) |
| Core sem carga | progredir por reps; ao passar do topo, adicionar carga ou variação mais difícil |

> Arredondar para a menor anilha/halter disponível (configurável pelo usuário).

### 3.3 Detecção de estagnação
- Um exercício está **estagnado** quando não houve aumento de carga **nem** de reps totais (soma das séries) por **2 sessões seguidas** do mesmo treino.
- Um exercício **regrediu** quando as reps totais com a mesma carga caíram ≥ 2 em relação à sessão anterior.

### 3.4 Gatilho de deload
O app sugere deload quando **qualquer** condição for verdadeira:
1. ≥ 2 exercícios **compostos** estagnados ou regredindo por 2 semanas.
2. Média semanal de **fadiga ≥ 8** ou **sono ≤ 4** por 2 semanas seguidas.
3. Passaram **10 semanas** desde o último deload.

**Semana de deload:**
- Metade das séries (arredondar para cima, mínimo 1).
- Mesma carga, 3–4 RIR.
- Depois: retomar com as cargas anteriores.

### 3.5 Decisão de volume (avaliação mensal)
| Condição | Sugestão |
|---|---|
| Cargas subindo + sono ≥ 7 + fadiga ≤ 6 | **Manter volume** |
| Músculo prioritário estagnado + sono ≥ 7 + fadiga ≤ 6 | **Aumentar volume** (+1 série/semana nesse músculo) |
| Queda de desempenho + fadiga alta / sono ruim / dor articular | **Reduzir volume** (−1 a 2 séries nos músculos afetados) |
| Critério de deload ativo | **Deload** |

> O app **sugere**, o usuário **confirma**. Nenhuma mudança automática sem confirmação.

---

## 4. Nutrição (módulo)

### 4.1 Entradas
- Peso (kg), altura, idade, sexo, nível de atividade
- % de gordura estimado (opcional)
- Modo: `cutting leve` | `recomposição` | `ganho lento`

### 4.2 Cálculos
| Item | Fórmula / regra |
|---|---|
| TMB | Mifflin-St Jeor |
| Manutenção (TDEE) | TMB × fator de atividade |
| Cutting leve | TDEE − 300 a 500 kcal; meta: −0,5 a −1% do peso/semana |
| Recomposição | TDEE ± 0–100 kcal |
| Ganho lento | TDEE + 5–10%; meta: +0,25 a 0,5% do peso/mês |
| Proteína | 1,8–2,2 g/kg (cutting: usar o topo) |
| Gordura | 0,6–1,0 g/kg |
| Carboidrato | restante das calorias |

### 4.3 Ajuste automático (a cada 2 semanas)
- Comparar a **média de peso** das últimas 2 semanas com a meta do modo.
- Abaixo da meta: sugerir +100–150 kcal. Acima da meta: sugerir −100–150 kcal.
- No modo cintura, a **medida da cintura** pesa mais que o peso na decisão.

---

## 5. Métricas e registros

### 5.1 Por série
`carga`, `reps`, `RIR (opcional)`, `execução OK (bool)`, `nota (texto)`

### 5.2 Diário / semanal
| Campo | Frequência | Escala |
|---|---|---|
| Peso corporal | diário (em jejum) | kg → app calcula média semanal |
| Cintura (altura do umbigo) | semanal (em jejum) | cm |
| Sono | semanal | 1–10 |
| Fadiga | semanal | 1–10 |
| Motivação | semanal | 1–10 |
| Dor articular | semanal | sim/não + local |
| Treinos realizados | automático | SUP1/INF1/SUP2/INF2 |

### 5.3 Mensal
Peso inicial/atual, cintura, braço, peito, coxa, panturrilha, ombros (circunferência), fotos (frente/lado/costas), top 5 exercícios que mais evoluíram (automático), pontos fracos (manual), decisão de volume.

### 5.4 Indicador-chave do V-taper
```
razão_ombro_cintura = circunferência_ombros / cintura
```
Mostrar a evolução mensal num gráfico. Meta de referência estética: ~1,6.

---

## 6. Modelo de dados

```ts
type TipoExercicio = "composto" | "isolado" | "core";
type TreinoId = "SUP1" | "INF1" | "SUP2" | "INF2";

interface Exercicio {
  id: string;
  nome: string;
  tipo: TipoExercicio;
  musculoPrincipal: string;
  musculosSecundarios?: string[];
  unilateral?: boolean;
  incrementoKg: number;        // configurável
  substitutos?: string[];      // ids de exercícios alternativos
}

interface ItemTreino {
  exercicioId: string;
  ordem: number;
  series: number;
  repsMin: number;
  repsMax: number;
}

interface Treino {
  id: TreinoId;
  nome: string;
  itens: ItemTreino[];
}

interface Serie {
  numero: number;
  carga: number;
  reps: number;
  rir?: number;
  execucaoOk: boolean;
}

interface RegistroExercicio {
  exercicioId: string;
  series: Serie[];
  nota?: string;
}

interface Sessao {
  id: string;
  data: string;                // ISO
  treinoId: TreinoId;
  deload: boolean;
  registros: RegistroExercicio[];
  duracaoMin?: number;
}

interface CheckinSemanal {
  semanaISO: string;           // ex. "2026-W47"
  pesoMedio: number;
  cinturaCm?: number;
  sono: number;
  fadiga: number;
  motivacao: number;
  dorArticular?: string;
  comentarios?: string;
}

interface AvaliacaoMensal {
  data: string;
  peso: number;
  medidas: { cintura: number; braco: number; peito: number; coxa: number; panturrilha: number; ombros: number };
  fotos?: string[];
  pontosFracos: string[];
  decisao: "manter" | "aumentar" | "reduzir" | "deload";
}

interface Usuario {
  nome: string;
  altura: number;
  idade: number;
  sexo: "M" | "F";
  modoNutricao: "cutting" | "recomposicao" | "ganho";
  anilhasDisponiveis: number[];
  ultimoDeload?: string;
  proximoTreino: TreinoId;
}
```

---

## 7. Telas

### 7.1 Início (dashboard)
- **Próximo treino** (botão grande "Começar SUP1").
- Treinos da semana: 0/4 ou 0/3.
- Peso médio da semana + tendência.
- Cintura (último registro) + tendência.
- Alertas: "Deload sugerido", "Faça o check-in semanal", "3 exercícios prontos para subir carga".

### 7.2 Sessão de treino (tela principal)
- Lista de exercícios na ordem.
- Para cada série: **carga e reps pré-preenchidas** com a meta da progressão.
- Mostrar o **último desempenho** ao lado (ex.: `Última: 40kg – 10/9/8`).
- Toque rápido para confirmar a série; campo de RIR opcional.
- **Timer de descanso** automático: compostos 2–3 min, isolados 60–90 s.
- Botão de **substituir exercício** (por um da lista `substitutos`).
- Ao finalizar: resumo com os PRs e o que sobe de carga na próxima vez.

### 7.3 Histórico por exercício
- Gráfico de carga × tempo e de **e1RM** (Epley: `carga × (1 + reps/30)`).
- Tabela de sessões.
- Status: `progredindo` | `estagnado` | `regredindo`.

### 7.4 Volume
- Séries por músculo na semana atual × referência.
- Barra colorida: abaixo / dentro / acima do planejado.

### 7.5 Check-in semanal
Formulário rápido (menos de 30 s): peso médio (automático), cintura, sono, fadiga, motivação, dor.

### 7.6 Avaliação mensal
- Medidas + fotos lado a lado (mês atual × anterior).
- Razão ombro/cintura.
- Top 5 exercícios que evoluíram (automático).
- **Sugestão de decisão** (regra 3.5) + confirmação do usuário.

### 7.7 Nutrição
- Metas diárias: kcal, proteína, carboidrato, gordura.
- Ajuste sugerido a cada 2 semanas.

### 7.8 Configurações
- Dados do usuário, anilhas/halteres disponíveis, unidades, editar treinos (séries, faixas, exercícios), exportar/importar dados (JSON/CSV).

---

## 8. Notificações
| Evento | Mensagem |
|---|---|
| Dia de treino sem sessão registrada | "Hoje é dia de SUP2 💪" |
| Domingo | "Faça seu check-in semanal" |
| A cada 4 semanas | "Hora da avaliação mensal" |
| Critério de deload atingido | "Seus dados sugerem uma semana de deload" |
| Pesagem diária (opcional) | "Pese-se em jejum" |

---

## 9. Roadmap sugerido

**MVP (v1)**
- [ ] Treinos fixos (SUP1/INF1/SUP2/INF2) + rotação
- [ ] Registro de séries com pré-preenchimento pela progressão dupla
- [ ] Último desempenho visível
- [ ] Timer de descanso
- [ ] Histórico por exercício
- [ ] Armazenamento local (offline)

**v2**
- [ ] Check-in semanal + avaliação mensal
- [ ] Detecção de estagnação e gatilho de deload
- [ ] Cálculo de volume semanal por músculo
- [ ] Gráficos (e1RM, peso, cintura, razão ombro/cintura)

**v3**
- [ ] Módulo de nutrição com ajuste automático
- [ ] Sugestão de decisão de volume
- [ ] Notificações
- [ ] Sincronização em nuvem + exportação

---

## 10. Critérios de aceite (exemplos)
- Ao abrir o app depois de concluir o INF1, o próximo treino exibido é o **SUP2**.
- Se o usuário fez `40kg – 10/10/10` na remada apoiada (faixa 8–10), a próxima sessão pré-preenche `41kg × 8` (ou o próximo valor disponível nas anilhas).
- Se o agachamento e o supino reto ficaram sem melhora por 2 semanas, o dashboard mostra o alerta de deload.
- Na semana de deload, a sessão mostra metade das séries (ex.: 3 → 2) e as mesmas cargas.
- O volume semanal de costas aparece como 14 séries depois de completar os 4 treinos.
