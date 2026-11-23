# 🐉 Projeto Dragão

App (PWA, mobile-first, offline) de acompanhamento de treino de hipertrofia natural com foco em V-taper e cintura fina.
Implementa a especificação em [`docs/especificacao.md`](docs/especificacao.md).

## Rodar

```bash
npm install
npm run dev        # desenvolvimento em http://localhost:5173
npm test           # testes da lógica (progressão, deload, volume, nutrição)
npm run build      # gera dist/ (site estático)
npm run preview    # serve o build
```

Para usar no celular: publique a pasta `dist/` em qualquer hospedagem estática (há um workflow de GitHub Pages em
`.github/workflows/pages.yml`, que roda ao dar push na `main`; ative em *Settings → Pages → Source: GitHub Actions*).
Abra no navegador do celular e use **Adicionar à tela inicial**. Depois disso funciona offline.

## O que tem

| Área | Recursos |
|---|---|
| Treino | Rotação fixa SUP1 → INF1 → SUP2 → INF2 (sem pular dias), séries pré-preenchidas pela progressão dupla, último desempenho ao lado, RIR opcional, execução OK/ruim, timer de descanso automático (compostos 2:30, isolados 1:15, configurável) com som e vibração, troca por exercício substituto, notas, resumo com PRs e o que sobe de carga |
| Progressão | Topo da faixa em todas as séries + execução OK → carga sobe (+5% pernas, +2,5% superiores, incremento mínimo nos isolados), arredondada às anilhas/halteres disponíveis; senão, +1 rep na série mais fraca. Core sem carga sugere adicionar carga/variação |
| Análise | Status por exercício (progredindo / estagnado / regredindo), gatilho de deload (≥2 compostos travados, fadiga ≥8 ou sono ≤4 por 2 semanas, 10 semanas), semana de deload (metade das séries, mesmas cargas, termina sozinha em 7 dias) |
| Volume | Séries por músculo na semana × referência do programa (ajustada para 3 dias) |
| Histórico | Gráficos de carga e e1RM (Epley), tabela de sessões, apagar sessões |
| Corpo | Peso diário e média semanal, check-in semanal, cintura, avaliação mensal com medidas, fotos lado a lado, razão ombro/cintura (meta 1,6), top 5 exercícios que mais evoluíram, sugestão de decisão de volume que só é aplicada ao programa depois da sua confirmação |
| Nutrição | Mifflin-St Jeor, TDEE, metas por modo (cutting / recomposição / ganho), macros, ajuste a cada 2 semanas pela média de peso (modo cintura: a cintura pesa mais na decisão) |
| Config | Dados pessoais, 3 ou 4 dias, anilhas e halteres, descanso, músculos prioritários, editor de treinos (séries, faixas, ordem, exercícios novos), lembretes, exportar/importar JSON, exportar CSV |

## Estrutura

```
src/domain/      lógica pura e testada (tipos, programa, progressão, análise, nutrição, datas)
src/store/       estado + persistência em IndexedDB + ações (iniciar/finalizar sessão, deload…)
src/screens/     telas
src/components/  gráfico SVG, timer, componentes de UI
public/          manifest, service worker, ícones
```

## Limitações conhecidas

- **Notificações** são verificadas quando o app é aberto ou fica em segundo plano: não há servidor de push, então
  um lembrete não chega com o app totalmente fechado.
- **Sincronização em nuvem** não foi implementada (os dados ficam no aparelho). Use Exportar/Importar JSON para
  backup ou para trocar de aparelho.
