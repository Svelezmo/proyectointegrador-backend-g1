import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

async function encontrarPruebas(directorio) {
  const entradas = await readdir(directorio, { withFileTypes: true });
  const archivos = [];
  for (const entrada of entradas) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) {
      archivos.push(...(await encontrarPruebas(ruta)));
    } else if (entrada.isFile() && entrada.name.endsWith(".test.ts")) {
      archivos.push(ruta);
    }
  }
  return archivos;
}

const raiz = join(process.cwd(), "tests");
const pruebas = (await encontrarPruebas(raiz)).sort();
if (pruebas.length === 0) {
  throw new Error(`No se encontraron pruebas en ${relative(process.cwd(), raiz)}${sep}`);
}

await Promise.all(pruebas.map(prueba => import(pathToFileURL(prueba).href)));
