
import { connectDB, closeDB } from "./config/database.js";
import { products } from "./data/products.js";

async function insertProducts() {
    try {
        const db = await connectDB();

        const collection = db.collection("products");

        // Evitar insertar los mismos productos varias veces
        await collection.deleteMany({});

        // Insertar los productos de ejemplo
        const result = await collection.insertMany(products);

        console.log("Productos insertados correctamente");
        console.log("Cantidad de productos:", result.insertedCount);

    } catch (error) {
        console.error("Error al insertar productos:", error);

    } finally {
        await closeDB();
    }
}

insertProducts();
