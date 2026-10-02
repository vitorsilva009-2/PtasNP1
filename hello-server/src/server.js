import express from 'express'
import { readEmprestimo, writeEmprestimo } from './db.js'

const app = express()
const PORT = 3000

app.use(express.json())

function logger(req, res, next) {
  const inicio = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - inicio
    console.log(`${req.method} ${req.url} — ${ms}ms`)
  })
  next()
}

app.use(logger)

app.get('/emprestimos', async (req, res, next) => {
  try {
    const emprestimos = await readEmprestimo()
    res.json(emprestimos.filter(e => !e.devolvidoEm))
  } catch (err) {
    next(err)
  }
})

app.get('/emprestimos/:id', async (req, res, next) => {
  try {
    const emprestimos = await readEmprestimo()
    const emp = emprestimos.find(e => e.id === Number(req.params.id))
    if (!emp) return res.status(404).json({ erro: 'Empréstimo não encontrado' })
    res.json(emp)
  } catch (err) {
    next(err)
  }
})

app.post('/emprestimos', async (req, res, next) => {
  try {
    const { nomeAluno, livro } = req.body || {}

    if (!nomeAluno || typeof nomeAluno !== 'string') {
      return res.status(400).json({ erro: 'Nome do aluno é obrigatório e deve ser uma string' })
    }
    if (!livro || typeof livro !== 'string') {
      return res.status(400).json({ erro: 'O nome do livro é obrigatório e deve ser uma string' })
    }

    const emprestimos = await readEmprestimo()
    const novoId = emprestimos.length ? Math.max(...emprestimos.map(u => Number(u.id) || 0)) + 1 : 1

    const novo = { id: novoId, nomeAluno, livro, devolvidoEm: null }
    emprestimos.push(novo)
    await writeEmprestimo(emprestimos)

    res.status(201).json(novo)
  } catch (err) {
    next(err)
  }
})

app.put('/emprestimos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const { nomeAluno, livro, devolvidoEm } = req.body || {}

    if (!nomeAluno || !livro) {
      return res.status(400).json({ erro: 'nomeAluno e livro são obrigatórios para PUT' })
    }

    const emprestimos = await readEmprestimo()
    const idx = emprestimos.findIndex(u => u.id === id)
    if (idx === -1) return res.status(404).json({ erro: 'Empréstimo não encontrado' })

    emprestimos[idx] = { id, nomeAluno, livro, devolvidoEm: devolvidoEm || null }
    await writeEmprestimo(emprestimos)
    res.json(emprestimos[idx])
  } catch (err) {
    next(err)
  }
})

app.patch('/emprestimos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const emprestimos = await readEmprestimo()
    const emp = emprestimos.find(u => u.id === id)
    if (!emp) return res.status(404).json({ erro: 'Empréstimo não encontrado' })

    const { id: _, createdAt: __, updatedAt: ___, ...dadosPermitidos } = req.body || {}
    Object.assign(emp, dadosPermitidos)
    emp.updatedAt = new Date().toISOString()

    await writeEmprestimo(emprestimos)
    res.json(emp)
  } catch (err) {
    next(err)
  }
})

app.delete('/emprestimos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const emprestimos = await readEmprestimo()
    const emp = emprestimos.find(u => u.id === id)
    if (!emp) return res.status(404).json({ erro: 'Empréstimo não encontrado' })
    if (emp.devolvidoEm) return res.status(409).json({ erro: 'Já devolvido/removido' })

    emp.devolvidoEm = new Date().toISOString()
    await writeEmprestimo(emprestimos)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

function errorHandler(err, req, res, next) {
  console.error(err.stack)
  const status = err.status || 500
  res.status(status).json({ erro: err.message || 'Erro interno' })
}

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})