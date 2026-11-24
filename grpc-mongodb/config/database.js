import { MongoClient } from "mongodb";

// Dirección de conexión a MongoDB local
const uri = "mongodb://127.0.0.1:27017";

// Crear cliente de MongoDB
const client = new MongoClient(uri);

// Nombre de nuestra base de datos
const dbName = "grpc_mongodb";

// Función para conectar con MongoDB
export async function connectDB() {
    try {
        await client.connect();

        console.log("Conexión exitosa con MongoDB");

        const db = client.db(dbName);

        return db;

    } catch (error) {
        console.error("Error al conectar con MongoDB:", error);
        throw error;
    }
}

// Función para cerrar la conexión con MongoDB
export async function closeDB() {
    await client.close();
    console.log("Conexión con MongoDB cerrada");
}
