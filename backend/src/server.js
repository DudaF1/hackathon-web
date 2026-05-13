require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '3mb' }));

function sanitizeUser(user) {
  if (!user) return null;
  const { senhaHash, senha, ...safe } = user;
  return safe;
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Token ausente.' });

    const payload = jwt.verify(token, JWT_SECRET);
    const db = await connectDb();
    const user = await db.collection('usuarios').findOne({ usuario: payload.usuario, ativo: true });
    if (!user) return res.status(401).json({ message: 'Usuário inválido.' });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.tipo !== 'admin') return res.status(403).json({ message: 'Acesso permitido apenas para administradores.' });
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'RH Cosmetics API', time: new Date().toISOString() });
});

app.post('/api/auth/login', async (req, res) => {
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha) return res.status(400).json({ message: 'Informe usuário e senha.' });

  const db = await connectDb();
  const user = await db.collection('usuarios').findOne({ usuario, ativo: true });
  if (!user) return res.status(401).json({ message: 'Usuário ou senha inválidos.' });

  const senhaOk = user.senhaHash ? await bcrypt.compare(senha, user.senhaHash) : senha === user.senha;
  if (!senhaOk) return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
  if (user.tipo !== 'admin') return res.status(403).json({ message: 'Esta tela web está liberada apenas para administradores.' });

  const token = jwt.sign({ usuario: user.usuario, nome: user.nome, tipo: user.tipo }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: sanitizeUser(user) });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.get('/api/state', requireAuth, async (_req, res) => {
  const db = await connectDb();
  const state = await db.collection('portalState').findOne({ key: 'default' });
  res.json(state?.data || {});
});

app.put('/api/state', requireAuth, requireAdmin, async (req, res) => {
  const db = await connectDb();
  const data = req.body || {};
  await db.collection('portalState').updateOne(
    { key: 'default' },
    { $set: { key: 'default', data, atualizadoEm: new Date() } },
    { upsert: true }
  );
  res.json({ ok: true, atualizadoEm: new Date().toISOString() });
});

app.get('/api/usuarios', requireAuth, async (_req, res) => {
  const db = await connectDb();
  const users = await db.collection('usuarios').find({}, { projection: { senhaHash: 0, senha: 0 } }).toArray();
  res.json(users);
});

app.post('/api/usuarios', requireAuth, requireAdmin, async (req, res) => {
  const db = await connectDb();
  const body = req.body || {};
  const senhaHash = bcrypt.hashSync(body.senha || '1234', 10);
  const user = { ...body, senhaHash, ativo: true, criadoEm: new Date(), atualizadoEm: new Date() };
  delete user.senha;
  await db.collection('usuarios').insertOne(user);
  res.status(201).json({ ok: true, user: sanitizeUser(user) });
});

app.patch('/api/solicitacoes/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const db = await connectDb();
  const stateDoc = await db.collection('portalState').findOne({ key: 'default' });
  const data = stateDoc?.data || {};
  data.solicitacoes = (data.solicitacoes || []).map((s) => s.id === id ? { ...s, status } : s);
  await db.collection('portalState').updateOne({ key: 'default' }, { $set: { data, atualizadoEm: new Date() } }, { upsert: true });
  res.json({ ok: true, solicitacoes: data.solicitacoes });
});

app.listen(PORT, () => {
  console.log(`API RH Cosmetics rodando em http://localhost:${PORT}`);
});
