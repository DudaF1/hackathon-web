require('dotenv').config();
const bcrypt = require('bcryptjs');
const initialData = require('./initialData.json');
const { connectDb, closeDb } = require('./db');

async function seed() {
  const db = await connectDb();
  const usuarios = initialData.usuarios.map((usuario) => ({
    ...usuario,
    senhaHash: bcrypt.hashSync('1234', 10),
    ativo: true,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  }));

  await db.collection('usuarios').deleteMany({});
  await db.collection('usuarios').insertMany(usuarios);

  await db.collection('portalState').updateOne(
    { key: 'default' },
    {
      $set: {
        key: 'default',
        data: initialData,
        atualizadoEm: new Date(),
      },
    },
    { upsert: true }
  );

  console.log('Banco populado com usuários, funcionários, administradores e dados do portal.');
  console.log('Login admin para testar: 01@adm / 1234');
  await closeDb();
}

seed().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
