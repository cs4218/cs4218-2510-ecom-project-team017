// Generated with aid from ChatGPT
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

export async function connectToTestDb(dbName = "test") {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, { dbName });
  return uri;
}

export async function resetTestDb() {
  const { collections } = mongoose.connection;
  const tasks = Object.values(collections).map((collection) =>
    collection.deleteMany({}).catch(() => {})
  );
  await Promise.all(tasks);
}

export async function disconnectFromTestDb() {
  try {
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
    }
  } catch {}
  if (mongoServer) {
    try {
      await mongoServer.stop();
    } catch {}
    mongoServer = undefined;
  }
}
