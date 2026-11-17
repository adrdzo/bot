export const DIA_MS = 86_400_000;

export const hojeISO = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

export const parseDia = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Semana ISO-8601 no formato "2026-W47" */
export function semanaISO(input: Date | string): string {
  const d0 = typeof input === "string" ? parseDia(input) : input;
  const d = new Date(Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate()));
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((d.getTime() - inicioAno.getTime()) / DIA_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(semana).padStart(2, "0")}`;
}

/** segunda-feira da semana da data */
export function inicioSemana(d0: Date | string): Date {
  const d = typeof d0 === "string" ? parseDia(d0) : new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
  const dia = d.getDay() || 7;
  d.setDate(d.getDate() - (dia - 1));
  return d;
}

export const addDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const diasEntre = (a: string | Date, b: string | Date) => {
  const da = typeof a === "string" ? parseDia(a) : a;
  const db = typeof b === "string" ? parseDia(b) : b;
  return Math.round((db.getTime() - da.getTime()) / DIA_MS);
};

export const semanaAnterior = (iso: string) => {
  const [y, w] = iso.split("-W").map(Number);
  // quinta-feira da semana ISO
  const jan4 = new Date(y, 0, 4);
  const seg = inicioSemana(jan4);
  const alvo = addDias(seg, (w - 1) * 7 - 7);
  return semanaISO(alvo);
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const fmtData = (s: string) => {
  const d = parseDia(s);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
};
export const fmtDataLonga = (s: string) => {
  const d = parseDia(s);
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtMesAno = (s: string) => {
  const d = parseDia(s);
  return `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
};

export const fmtKg = (n: number | undefined) =>
  n === undefined || Number.isNaN(n) ? "–" : `${Number(n.toFixed(2)).toLocaleString("pt-BR")}`;

export const fmtTempo = (seg: number) => {
  const m = Math.floor(seg / 60);
  const s = Math.max(0, Math.floor(seg % 60));
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
