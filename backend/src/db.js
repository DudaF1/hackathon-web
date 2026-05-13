const { MongoClient } = require('mongodb');

let client;
let db;

async function connectDb() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'rh_cosmetics';

  if (!uri) {
    throw new Error('MONGODB_URI não configurada. Copie .env.example para .env e preencha sua string do MongoDB.');
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  await db.collection('usuarios').createIndex({ usuario: 1 }, { unique: true });
  await db.collection('portalState').createIndex({ key: 1 }, { unique: true });

  return db;
}

async function closeDb() {
  if (client) await client.close();
  client = null;
  db = null;
}

module.exports = { connectDb, closeDb };
