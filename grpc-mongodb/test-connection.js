
import { connectDB, closeDB } from "./config/database.js";

async function testConnection() {
    try {
        const db = await connectDB();

        console.log("Base de datos seleccionada:", db.databaseName);

    } catch (error) {
        console.error("No fue posible conectar con MongoDB:", error);

    } finally {
        await closeDB();
    }
}

testConnection();
