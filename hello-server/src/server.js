import express from 'express'   // importa a framework
import { readEmprestimo, writeEmprestimo } from './db.js'

const app = express()           // cria a aplicação
const PORT = 3000               // porta onde vamos escutar

function logger(req, res, next) {
  const inicio = Date.now()

  // 'finish' dispara quando a resposta já foi enviada ao cliente
  res.on('finish', () => {
    const ms = Date.now() - inicio
    console.log(`${req.method} ${req.url} — ${ms}ms`)
  })

  next() // o fluxo segue IMEDIATAMENTE, sem esperar o log
}



function errorHandler(err, req, res, next) {
  console.error(err.stack) // o rastro completo vai para o terminal (log do dev)

  const status = err.status || 500
  res.status(status).json({ erro: err.message || 'Erro interno' })
}



// Rota GET na raiz "/" responde com texto
app.get('/emprestimo', async (req, res) => {
  const emprestimo = await readEmprestimo()
  res.json(emprestimo.filter(e => !e.devolvidoEm))
})

app.get('/emprestimo/:id', async (req, res)=>{
   const emprestimo = await readEmprestimo()
  const emp = emprestimo.find(e => e.id === Number(req.params.id))
  if (!emp) return res.status(404).json({ erro: 'Emprestimo não encontrado' })
  res.json(emp)
})

app.post('/emprestimo', async (req, res) => {
  const { nomeAluno, livro } = req.body || {}

  // Validação  básica
  if (!nomeAluno || typeof nomeAluno !== 'string') {
    return res.status(400).json({ erro: 'Nome do aluno é obrigatório e deve ser uma string' })
  }
  if (!livro || typeof livro !== 'string') {
    return res.status(400).json({ erro: 'O nome do livro é obrigatório e deve ser uma string' })
  }

 
  const emprestimo = await readEmprestimo() 
  
  const novoId = emprestimo.length ? Math.max(...emprestimo.map(u => Number(u.id) || 0)) + 1 : 1

  const novo = { 
    id: novoId, 
    nomeAluno, 
    livro, 
    devolvidoEm: null 
  }
  emprestimo.push(novo)
  await writeEmprestimo(emprestimo)
  // 201 Created + recurso no body
  res.status(201).json(novo)
})

// src/server.js
app.put('/emprestimo/:id', async (req, res) => {
  // 1. params vem SEMPRE como string → converter para number
  const id = Number(req.params.id)
  
  // 2. PUT exige TODOS os campos obrigatórios no body
  const { nomeAluno, livro, devolvidoEm } = req.body || {}

  if (!nomeAluno || !livro) {
    return res.status(400).json({ 
      erro: 'nome e email são obrigatórios para PUT (substituição completa)' 
    })
  }

  // 3. Busca o índice (não o objeto) para poder substituir no array
  const emprestimos = await readEmprestimo()
  const idx = emprestimos.findIndex(u => u.id === id)
  if (idx === -1) return res.status(404).json({ erro: 'Usuário não encontrado' })

  // 4. SUBSTITUI o objeto inteiro — mantém id da URL, descarta o do body
  emprestimos[idx] = { id, nomeAluno, livro, devolvidoEm }
  
  // 5. Persiste e responde com recurso atualizado
  await writeEmprestimo(emprestimos)
  res.json(emprestimos[idx])  // 200 OK
})


// src/server.js
app.patch('/emprestimo/:id', async (req, res) => {
  const id = Number(req.params.id)
  const emprestimos = await readEmprestimo()
  const emp = emprestimos.find(u => u.id === id)
  if (!emp) return res.status(404).json({ erro: 'Usuário não encontrado' })

  // PERIGO: Object.assign MUTA o objeto alvo in-place
  // Se req.body vier { id: 999, email: "x@x.com" } → emp.id vira 999!
  // Object.assign(emp, req.body || {})
  
  // CORRETO: filtrar campos sensíveis ANTES do merge
  const { id: _, createdAt: __, updatedAt: ___, ...dadosPermitidos } = req.body || {}
  Object.assign(emp, dadosPermitidos)
  
  // Opcional: updatedAt automático
  emp.updatedAt = new Date().toISOString()
  
  await writeEmprestimo(emprestimos)
  res.json(emp)  // 200 OK com recurso mesclado
})


app.delete('/emprestimo/:id', async (req, res) => {
  const id = Number(req.params.id)
  const emprestimos = await readEmprestimo()
  const emp = emprestimos.find(u => u.id === id)
  if (!emp) return res.status(404).json({ erro: 'Usuário não encontrado' })
  if (emp.devolvidoEm) return res.status(409).json({ erro: 'Já removido' })

  emp.devolvidoEm = new Date().toISOString()  // marca remoção
  await writeEmprestimo(emprestimos)
  res.status(204).end()
})

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})

app.use(logger)
