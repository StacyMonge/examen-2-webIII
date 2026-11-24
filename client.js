
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

// Función para ejecutar llamadas gRPC
function callGrpc(method, data = {}, metadata = null) {
    return new Promise((resolve, reject) => {
        const callback = (error, response) => {
            if (error) reject(error);
            else resolve(response);
        };

        if (metadata) {
            client[method](data, metadata, callback);
        } else {
            client[method](data, callback);
        }
    });
}

// Ejecutar las pruebas
async function main() {
    try {

        // 1. Iniciar sesión y obtener token JWT
        console.log("\n--- LOGIN JWT ---");

        const loginResponse = await callGrpc("login", {
            username: "admin",
            password: "12345"
        });

        console.log(loginResponse);

        // Crear metadata con el token
        const metadata = new grpc.Metadata();
        metadata.add("authorization", loginResponse.token);

        // 2. Consultar todos los productos
        console.log("\n--- LISTA DE PRODUCTOS ---");
        const products = await callGrpc(
            "getProducts",
            {},
            metadata
        );
        console.log(products);

        // 3. Consultar producto por ID
        console.log("\n--- PRODUCTO POR ID ---");
        const product = await callGrpc(
            "getProductById",
            { id: 1 },
            metadata
        );
        console.log(product);

        // 4. Registrar un producto
        console.log("\n--- PRODUCTO REGISTRADO ---");
        const newProduct = await callGrpc(
            "createProduct",
            {
                id: 0,
                name: "Producto de prueba",
                price: 30,
                categoryId: 1,
                supplierId: 1
            },
            metadata
        );
        console.log(newProduct);

        // 5. Actualizar el producto creado
        console.log("\n--- PRODUCTO ACTUALIZADO ---");
        const updatedProduct = await callGrpc(
            "updateProduct",
            {
                id: newProduct.id,
                name: "Producto actualizado",
                price: 35,
                categoryId: 1,
                supplierId: 1
            },
            metadata
        );
        console.log(updatedProduct);

        // 6. Consultar productos por categoría
        console.log("\n--- PRODUCTOS POR CATEGORÍA ---");
        const categoryProducts = await callGrpc(
            "getProductsByCategory",
            { categoryId: 1 },
            metadata
        );
        console.log(categoryProducts);

        // 7. Consultar resumen de productos
        console.log("\n--- RESUMEN DE PRODUCTOS ---");
        const summaries = await callGrpc(
            "getProductSummaries",
            {},
            metadata
        );
        console.log(summaries);

        // 8. Consultar detalles de un producto
        console.log("\n--- DETALLES DEL PRODUCTO ---");
        const productDetails = await callGrpc(
            "getProductDetails",
            { id: 1 },
            metadata
        );
        console.log(productDetails);

        // 9. Consultar productos paginados y ordenados
        console.log("\n--- PRODUCTOS PAGINADOS Y ORDENADOS ---");
        const paginatedProducts = await callGrpc(
            "getProductsPaginated",
            {
                page: 1,
                pageSize: 2,
                sortBy: "price",
                sortOrder: "asc"
            },
            metadata
        );
        console.log(paginatedProducts);

        // 10. Eliminar el producto creado
        console.log("\n--- PRODUCTO ELIMINADO ---");
        const deletedProduct = await callGrpc(
            "deleteProduct",
            { id: newProduct.id },
            metadata
        );
        console.log(deletedProduct);

        // 11. Comprobar acceso sin token
        console.log("\n--- PRUEBA SIN TOKEN ---");

        try {
            await callGrpc("getProducts");
        } catch (error) {
            console.log("Acceso rechazado correctamente:");
            console.log(error.message);
        }

    } catch (error) {
        console.error("Error al ejecutar las pruebas:", error.message);

    } finally {
        client.close();
    }
}

main();
