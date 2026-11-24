
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

// Cargar archivo proto
const PROTO_PATH = "./proto/products.proto";

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const ProductService = proto.products.ProductService;

// Crear cliente
const client = new ProductService(
    "127.0.0.1:50051",
    grpc.credentials.createInsecure()
);

// Función para convertir las llamadas gRPC en promesas
function callGrpc(method, data = {}, metadata = null) {
    return new Promise((resolve, reject) => {
        const callback = (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        };

        if (metadata) {
            client[method](data, metadata, callback);
        } else {
            client[method](data, callback);
        }
    });
}

// Ejecutar las pruebas
async function testGrpc() {
    try {
        // 1. Iniciar sesión y obtener el token
        console.log("\n--- INICIAR SESIÓN ---");

        const loginResponse = await callGrpc("login", {
            username: "admin",
            password: "1234"
        });

        console.log(loginResponse.message);

        // Crear metadata para enviar el token
        const metadata = new grpc.Metadata();
        metadata.add("authorization", loginResponse.token);

        // 2. Consultar todos los productos
        console.log("\n--- TODOS LOS PRODUCTOS ---");
        const allProducts = await callGrpc("getProducts", {}, metadata);
        console.log(allProducts.products);

        // 3. Consultar un producto por ID
        console.log("\n--- PRODUCTO POR ID ---");
        const product = await callGrpc(
            "getProductById",
            { id: 1 },
            metadata
        );
        console.log(product);

        // 4. Filtrar por categoría
        console.log("\n--- PRODUCTOS POR CATEGORÍA ---");
        const categoryProducts = await callGrpc(
            "getProductsByCategory",
            { categoryId: 1 },
            metadata
        );
        console.log(categoryProducts.products);

        // 5. Consultar campos específicos
        console.log("\n--- RESUMEN DE PRODUCTOS ---");
        const summaries = await callGrpc(
            "getProductSummaries",
            {},
            metadata
        );
        console.log(summaries.products);

        // 6. Consultar productos con categorías y proveedores
        console.log("\n--- PRODUCTOS CON DETALLES ---");
        const productsWithDetails = await callGrpc(
            "getProductsWithDetails",
            {},
            metadata
        );
        console.log(productsWithDetails.products);

        // 7. Crear un producto
        console.log("\n--- CREAR PRODUCTO ---");
        const newProduct = await callGrpc(
            "createProduct",
            {
                name: "Producto de prueba",
                price: 30,
                categoryId: 1,
                supplierId: 2,
                stock: 20
            },
            metadata
        );
        console.log(newProduct);

        // 8. Actualizar el producto creado
        console.log("\n--- ACTUALIZAR PRODUCTO ---");
        const updatedProduct = await callGrpc(
            "updateProduct",
            {
                id: newProduct.product.id,
                name: "Producto actualizado",
                price: 35,
                categoryId: 1,
                supplierId: 2,
                stock: 25
            },
            metadata
        );
        console.log(updatedProduct);

        // 9. Consultar productos paginados y ordenados
        console.log("\n--- PRODUCTOS PAGINADOS ---");
        const paginated = await callGrpc(
            "getProductsPaginated",
            {
                page: 1,
                pageSize: 3,
                sortBy: "name",
                sortOrder: "asc"
            },
            metadata
        );
        console.log(paginated);

        // 10. Eliminar el producto creado
        console.log("\n--- ELIMINAR PRODUCTO ---");
        const deletedProduct = await callGrpc(
            "deleteProduct",
            { id: newProduct.product.id },
            metadata
        );
        console.log(deletedProduct);

        // 11. Comprobar que una solicitud sin token sea rechazada
        console.log("\n--- PRUEBA SIN TOKEN ---");

        try {
            await callGrpc("getProducts");
        } catch (error) {
            console.log("Acceso rechazado correctamente:");
            console.log(error.message);
        }

    } catch (error) {
        console.error("Error en las pruebas:", error.message);

    } finally {
        client.close();
    }
}

testGrpc();
