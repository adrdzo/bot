// Utilitários de data (sempre em horário local)

const DIA_MS = 86_400_000;

export function hojeISO(agora = new Date()): string {
  return dataLocal(agora);
}

/** YYYY-MM-DD no fuso local. */
export function dataLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

/** Converte "YYYY-MM-DD" ou ISO completo em Date local. */
export function paraData(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

/** Semana ISO-8601, ex. "2026-W47". */
export function semanaISO(d: Date): string {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diaSemana = (t.getDay() + 6) % 7; // seg = 0
  t.setDate(t.getDate() - diaSemana + 3); // quinta-feira da semana
  const anoISO = t.getFullYear();
  const primeiraQuinta = new Date(anoISO, 0, 4);
  const semana =
    1 + Math.round(((t.getTime() - primeiraQuinta.getTime()) / DIA_MS - 3 + ((primeiraQuinta.getDay() + 6) % 7)) / 7);
  return `${anoISO}-W${String(semana).padStart(2, '0')}`;
}

/** Segunda-feira (00:00) da semana ISO informada. */
export function inicioSemanaISO(semana: string): Date {
  const [ano, w] = semana.split('-W').map(Number);
  const jan4 = new Date(ano, 0, 4);
  const seg = new Date(jan4);
  seg.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (w - 1) * 7);
  return seg;
}

export function deslocarSemana(semana: string, n: number): string {
  const d = inicioSemanaISO(semana);
  d.setDate(d.getDate() + n * 7);
  return semanaISO(d);
}

export function diasEntre(a: Date | string, b: Date | string): number {
  const da = typeof a === 'string' ? paraData(a) : a;
  const db = typeof b === 'string' ? paraData(b) : b;
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / DIA_MS);
}

export function somarDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const fmtCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const fmtLonga = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

export const formatarCurta = (s: string | Date) => fmtCurta.format(typeof s === 'string' ? paraData(s) : s);
export const formatarLonga = (s: string | Date) => fmtLonga.format(typeof s === 'string' ? paraData(s) : s);
export const formatarDiaSemana = (d: Date) => fmtSemana.format(d);

export function rotuloSemana(semana: string): string {
  const ini = inicioSemanaISO(semana);
  return `${formatarCurta(ini)} – ${formatarCurta(somarDias(ini, 6))}`;
}
