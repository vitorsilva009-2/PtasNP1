import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'data.json')

// lê e devolve o array de usuários; se arquivo não existir, devolve []
export async function readEmprestimo() {
  try {
    const raw = await readFile(DB_PATH, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    if (err.code === 'ENOENT') return []   // arquivo não existe ainda
    throw err                              // outro erro: propaga
  }
}


export async function writeEmprestimo(emprestimo) {
  await writeFile(DB_PATH, JSON.stringify(emprestimo, null, 2), 'utf8')
}