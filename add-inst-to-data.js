
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/gym_score_be';
const dbName = process.env.DB_NAME || (uri.split('/').pop() || 'gym_score_be');

async function migrate() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    // 1. Crear la institución "Martin Diaz" si no existe
    let institution = await db.collection('institutions').findOne({ name: 'Martin Diaz' });
    let institutionId;
    if (!institution) {
      const result = await db.collection('institutions').insertOne({ name: 'Martin Diaz' });
      institutionId = result.insertedId;
      console.log('Institución creada:', institutionId);
    } else {
      institutionId = institution._id;
      console.log('Institución ya existe:', institutionId);
    }

    // 2. Actualizar TODOS los datos existentes
    const collections = ['admins', 'judges', 'gymnasts', 'tournaments', 'scores'];
    for (const col of collections) {
      await db.collection(col).updateMany(
        {},
        { $set: { institution: institutionId } }
      );
      console.log(`Actualizados ${col}`);
    }
    console.log('Migración completada.');
  } catch (err) {
    console.error('Error en la migración:', err);
  } finally {
    await client.close();
  }
}

migrate();