import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import products from "./data/products.js";
import categories from "./data/categories.js";
import suppliers from "./data/suppliers.js";
import jwt from "jsonwebtoken";

// Ubicación del archivo de definición
const PROTO_PATH = "./proto/products.proto";

const JWT_SECRET = "clave_secreta_gRPC_2026";

const USER = {
    username: "admin",
    password: "12345"
};

// Verificar el token JWT
function verifyToken(call, callback) {
    try {
        const authorization = call.metadata.get("authorization");

        if (!authorization || authorization.length === 0) {
            callback({
                code: grpc.status.UNAUTHENTICATED,
                details: "Se requiere un token de autenticación"
            });
            return false;
        }

        const token = authorization[0].toString();

        jwt.verify(token, JWT_SECRET);

        return true;

    } catch (error) {
        callback({
            code: grpc.status.UNAUTHENTICATED,
            details: "Token inválido o expirado"
        });

        return false;
    }
}

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

    if (!verifyToken(call, callback)) {
        return;
    }

    callback(null, { products: productsData });
},

    // Consultar un producto por su ID
    getProductById: (call, callback) => {

    if (!verifyToken(call, callback)) {
        return;
    }

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

    if (!verifyToken(call, callback)) {
        return;
    }

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

        if (!verifyToken(call, callback)) {
        return;
    }
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
            if (!verifyToken(call, callback)) {
        return;
    }

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

        if (!verifyToken(call, callback)) {
        return;
    }
        const filteredProducts = productsData.filter(
            p => p.categoryId === call.request.categoryId
        );

        callback(null, { products: filteredProducts });
    },

    getProductSummaries: (call, callback) => {

        if (!verifyToken(call, callback)) {
        return;
    }
        const summaries = productsData.map(p => ({
            name: p.name,
            price: p.price
        }));

        callback(null, { products: summaries });
    },

        getProductDetails: (call, callback) => {

            if (!verifyToken(call, callback)) {
        return;
    }
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
    },


    
    getProductsPaginated: (call, callback) => {

        if (!verifyToken(call, callback)) {
        return;
    }
        const page = Math.max(1, call.request.page || 1);
        const pageSize = Math.max(1, call.request.pageSize || 5);

        const sortBy = ["name", "price"].includes(call.request.sortBy)
            ? call.request.sortBy
            : "name";

        const sortOrder = call.request.sortOrder === "desc" ? -1 : 1;

        const sortedProducts = [...productsData].sort((a, b) => {
            if (a[sortBy] < b[sortBy]) return -1 * sortOrder;
            if (a[sortBy] > b[sortBy]) return 1 * sortOrder;
            return 0;
        });

        const startIndex = (page - 1) * pageSize;

        const paginatedProducts = sortedProducts.slice(
            startIndex,
            startIndex + pageSize
        );

        callback(null, {
            products: paginatedProducts,
            total: productsData.length
        });
    },

    login: (call, callback) => {
        const { username, password } = call.request;

        if (
            username !== USER.username ||
            password !== USER.password
        ) {
            return callback({
                code: grpc.status.UNAUTHENTICATED,
                details: "Usuario o contraseña incorrectos"
            });
        }

        const token = jwt.sign(
            { username: username },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        callback(null, {
            token: token,
            message: "Autenticación exitosa"
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