require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/gym_score_be';
const dbName = process.env.DB_NAME || (uri.split('/').pop() || 'gym_score_be');

async function addSuperAdmin() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    const username = 'gymscore-superadmin';
    const passwordPlain = 'L4berintos1981';
    const passwordHash = bcrypt.hashSync(passwordPlain, 10);

    const existing = await db.collection('admins').findOne({ username });
    if (existing) {
      console.log('El usuario super-admin ya existe:', username);
      return;
    }

    const result = await db.collection('admins').insertOne({
      username,
      password: passwordHash,
      role: 'super-admin'
    });
    console.log('Super-admin creado:', result.insertedId);
  } catch (err) {
    console.error('Error al crear el super-admin:', err);
  } finally {
    await client.close();
  }
}

addSuperAdmin();
