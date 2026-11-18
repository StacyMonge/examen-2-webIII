import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

// Ubicación del archivo de definición
const PROTO_PATH = "./proto/products.proto";

// Cargar la definición de gRPC
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDefinition);

// Conectarse al servidor
const client = new proto.products.ProductService(
    "127.0.0.1:50051",
    grpc.credentials.createInsecure()
);

// Función para ejecutar las pruebas
async function main() {
    try {
        // Consultar todos los productos
        const products = await new Promise((resolve, reject) => {
            client.getProducts({}, (error, response) => {
                if (error) reject(error);
                else resolve(response);
            });
        });

        console.log("\n--- LISTA DE PRODUCTOS ---");
        console.log(products);

        // Consultar un producto por ID
        const product = await new Promise((resolve, reject) => {
            client.getProductById({ id: 1 }, (error, response) => {
                if (error) reject(error);
                else resolve(response);
            });
        });

        console.log("\n--- PRODUCTO POR ID ---");
        console.log(product);

        // Registrar un producto
        const newProduct = await new Promise((resolve, reject) => {
            client.createProduct({
                id: 0,
                name: "Producto de prueba",
                price: 30,
                categoryId: 1,
                supplierId: 1
            }, (error, response) => {
                if (error) reject(error);
                else resolve(response);
            });
        });

        console.log("\n--- PRODUCTO REGISTRADO ---");
        console.log(newProduct);

        // Actualizar un producto
        const updatedProduct = await new Promise((resolve, reject) => {
            client.updateProduct({
                id: 1,
                name: "Chai actualizado",
                price: 20,
                categoryId: 1,
                supplierId: 1
            }, (error, response) => {
                if (error) reject(error);
                else resolve(response);
            });
        });

        console.log("\n--- PRODUCTO ACTUALIZADO ---");
        console.log(updatedProduct);

        // Eliminar un producto
        const deletedProduct = await new Promise((resolve, reject) => {
            client.deleteProduct({ id: 5 }, (error, response) => {
                if (error) reject(error);
                else resolve(response);
            });
        });

        console.log("\n--- PRODUCTO ELIMINADO ---");
        console.log(deletedProduct);

                const categoryProducts = await new Promise((resolve, reject) => {
            client.getProductsByCategory({ categoryId: 1 }, (error, response) => {
                if (error) reject(error);
                else resolve(response);
            });
        });

        console.log("\n--- PRODUCTOS POR CATEGORIA ---");
        console.log(categoryProducts);

        const summaries = await new Promise((resolve, reject) => {
            client.getProductSummaries({}, (error, response) => {
                if (error) reject(error);
                else resolve(response);
            });
        });

        console.log("\n--- RESUMEN DE PRODUCTOS ---");
        console.log(summaries);

                const productDetails = await new Promise((resolve, reject) => {
            client.getProductDetails({ id: 1 }, (error, response) => {
                if (error) reject(error);
                else resolve(response);
            });
        });

        console.log("\n--- DETALLES DEL PRODUCTO ---");
        console.log(productDetails);

    } catch (error) {
        console.error("Error al ejecutar las pruebas:", error);
    } finally {
        client.close();
    }
}

main();