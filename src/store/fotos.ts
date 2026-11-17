import { del, get, set, keys, createStore } from "idb-keyval";

const store = typeof indexedDB !== "undefined" ? createStore("dragao-fotos", "fotos") : undefined;

/** Reduz a foto para ~1080px e salva como JPEG no IndexedDB */
export async function salvarFoto(file: File, id: string): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const max = 1080;
    const esc = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * esc);
    c.height = Math.round(img.height * esc);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.82);
    await set(id, dataUrl, store);
    return id;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const lerFoto = (id: string) => get<string>(id, store);
export const apagarFoto = (id: string) => del(id, store);

export async function todasFotos() {
  const ks = (await keys(store)) as string[];
  const out: Record<string, string> = {};
  for (const k of ks) {
    const v = await get<string>(k, store);
    if (v) out[k] = v;
  }
  return out;
}

export async function restaurarFotos(fotos: Record<string, string>) {
  for (const [k, v] of Object.entries(fotos)) await set(k, v, store);
}
