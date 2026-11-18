import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import products from "./data/products.js";
import categories from "./data/categories.js";
import suppliers from "./data/suppliers.js";

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

// Crear el servidor
const server = new grpc.Server();

// Copia de los productos almacenados en memoria
let productsData = [...products];

// Definir las operaciones del servicio
const productService = {

    // Consultar todos los productos
    getProducts: (call, callback) => {
        callback(null, { products: productsData });
    },

    // Consultar un producto por su ID
    getProductById: (call, callback) => {
        const product = productsData.find(p => p.id === call.request.id);

        if (!product) {
            return callback({
                code: grpc.status.NOT_FOUND,
                details: "Producto no encontrado"
            });
        }

        callback(null, product);
    },

    // Registrar un producto
    createProduct: (call, callback) => {
        const newId = Math.max(0, ...productsData.map(p => p.id)) + 1;

        const newProduct = {
            ...call.request,
            id: newId
        };

        productsData.push(newProduct);
        callback(null, newProduct);
    },

    // Actualizar un producto
    updateProduct: (call, callback) => {
        const index = productsData.findIndex(
            p => p.id === call.request.id
        );

        if (index === -1) {
            return callback({
                code: grpc.status.NOT_FOUND,
                details: "Producto no encontrado"
            });
        }

        productsData[index] = { ...call.request };
        callback(null, productsData[index]);
    },

    // Eliminar un producto
        deleteProduct: (call, callback) => {
        const index = productsData.findIndex(p => p.id === call.request.id);

        if (index === -1) {
            return callback({
                code: grpc.status.NOT_FOUND,
                details: "Producto no encontrado"
            });
        }

        productsData.splice(index, 1);

        callback(null, {
            success: true,
            message: "Producto eliminado correctamente"
        });
    },

    getProductsByCategory: (call, callback) => {
        const filteredProducts = productsData.filter(
            p => p.categoryId === call.request.categoryId
        );

        callback(null, { products: filteredProducts });
    },

    getProductSummaries: (call, callback) => {
        const summaries = productsData.map(p => ({
            name: p.name,
            price: p.price
        }));

        callback(null, { products: summaries });
    },

        getProductDetails: (call, callback) => {
        const product = productsData.find(
            p => p.id === call.request.id
        );

        if (!product) {
            return callback({
                code: grpc.status.NOT_FOUND,
                details: "Producto no encontrado"
            });
        }

        const category = categories.find(
            c => c.id === product.categoryId
        );

        const supplier = suppliers.find(
            s => s.id === product.supplierId
        );

        callback(null, {
            product: product,
            category: category,
            supplier: supplier
        });
    }
};


// Registrar el servicio
server.addService(
    proto.products.ProductService.service,
    productService
);

// Iniciar el servidor
server.bindAsync(
    "127.0.0.1:50051",
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
        if (error) {
            console.error("Error al iniciar el servidor:", error);
            return;
        }

        console.log(`Servidor gRPC escuchando en el puerto ${port}`);
    }
);