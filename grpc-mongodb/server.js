
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { connectDB } from "./config/database.js";
import jwt from "jsonwebtoken";

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
const productService = proto.products.ProductService;

// Conectar con MongoDB
let db;
let productsCollection;

// ConfiguraciÃ³n JWT
const JWT_SECRET = "clave_secreta_grpc_mongodb";

// Iniciar sesiÃ³n y generar token JWT
function login(call, callback) {
    const { username, password } = call.request;

    // Usuario de prueba
    if (username !== "admin" || password !== "1234") {
        return callback({
            code: grpc.status.UNAUTHENTICATED,
            details: "Usuario o contraseÃ±a incorrectos"
        });
    }

    const token = jwt.sign(
        { username },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    callback(null, {
    token,
    message: "Inicio de sesión exitoso"
});
}

// Verificar el token JWT
function verifyToken(call, callback) {
    try {
        const metadata = call.metadata;
        const authorization = metadata.get("authorization");

        if (!authorization || authorization.length === 0) {
            return callback({
                code: grpc.status.UNAUTHENTICATED,
                details: "Se requiere un token de autenticaciÃ³n"
            });
        }

        const token = authorization[0].toString();

        jwt.verify(token, JWT_SECRET);

        return true;

    } catch (error) {
        callback({
            code: grpc.status.UNAUTHENTICATED,
            details: "Token invÃ¡lido o expirado"
        });

        return false;
    }
}

// Consultar todos los productos
async function getProducts(call, callback) {

    if (!verifyToken(call, callback)) {
        return;
    }

    try {
        const products = await productsCollection.find({}).toArray();

        callback(null, { products });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            details: error.message
        });
    }
}

// Consultar un producto por ID
async function getProductById(call, callback) {

    if (!verifyToken(call, callback)) {
        return;
    }

    try {
        const product = await productsCollection.findOne({
            id: call.request.id
        });

        if (!product) {
            return callback({
                code: grpc.status.NOT_FOUND,
                details: "Producto no encontrado"
            });
        }

        callback(null, {
            success: true,
            details: "Producto encontrado",
            product
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            details: error.message
        });
    }
}

// Filtrar productos por categorÃ­a
async function getProductsByCategory(call, callback) {

    if (!verifyToken(call, callback)) {
        return;
    }

    try {
        const products = await productsCollection.find({
            categoryId: call.request.categoryId
        }).toArray();

        callback(null, { products });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            details: error.message
        });
    }
}

// Crear un producto
async function createProduct(call, callback) {

    if (!verifyToken(call, callback)) {
        return;
    }

    try {

        const lastProduct = await productsCollection
            .find({})
            .sort({ id: -1 })
            .limit(1)
            .toArray();

        const newId = lastProduct.length > 0
            ? lastProduct[0].id + 1
            : 1;

        const newProduct = {
            id: newId,
            ...call.request
        };

        await productsCollection.insertOne(newProduct);

        callback(null, {
            success: true,
            details: "Producto creado correctamente",
            product: newProduct
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            details: error.message
        });
    }
}

// Actualizar un producto
async function updateProduct(call, callback) {

    if (!verifyToken(call, callback)) {
        return;
    }

    try {
        const { id, ...data } = call.request;

        const result = await productsCollection.updateOne(
            { id },
            { $set: data }
        );

        if (result.matchedCount === 0) {
            return callback({
                code: grpc.status.NOT_FOUND,
                details: "Producto no encontrado"
            });
        }

        const updatedProduct = await productsCollection.findOne({ id });

        callback(null, {
            success: true,
            details: "Producto actualizado correctamente",
            product: updatedProduct
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            details: error.message
        });
    }
}

// Eliminar un producto
async function deleteProduct(call, callback) {

    if (!verifyToken(call, callback)) {
        return;
    }

    try {
        const result = await productsCollection.deleteOne({
            id: call.request.id
        });

        if (result.deletedCount === 0) {
            return callback({
                code: grpc.status.NOT_FOUND,
                details: "Producto no encontrado"
            });
        }

        callback(null, {
            success: true,
            details: "Producto eliminado correctamente"
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            details: error.message
        });
    }
}


// Consultar solamente nombre y precio
async function getProductSummaries(call, callback) {

    if (!verifyToken(call, callback)) {
        return;
    }

    try {
        const products = await productsCollection.find(
            {},
            {
                projection: {
                    _id: 0,
                    name: 1,
                    price: 1
                }
            }
        ).toArray();

        callback(null, { products });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            details: error.message
        });
    }
}



// Consultar productos con paginaciÃ³n y ordenamiento
async function getProductDetails(call, callback) {

    if (!verifyToken(call, callback)) {
        return;
    }

    try {
        const product = await productsCollection.findOne({
            id: call.request.id
        });

        if (!product) {
            return callback({
                code: grpc.status.NOT_FOUND,
                details: "Producto no encontrado"
            });
        }

        const category = await db.collection("categories").findOne({
            id: product.categoryId
        });

        const supplier = await db.collection("suppliers").findOne({
            id: product.supplierId
        });

        callback(null, {
            product: product,
            category: category,
            supplier: supplier
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            details: error.message
        });
    }
}

// Consultar productos con paginación y ordenamiento
async function getProductsPaginated(call, callback) {

    if (!verifyToken(call, callback)) {
        return;
    }

    try {
        const page = Math.max(1, Number(call.request.page) || 1);
        const pageSize = Math.max(1, Number(call.request.pageSize) || 5);

        const sortBy = ["name", "price"].includes(call.request.sortBy)
            ? call.request.sortBy
            : "name";

        const sortOrder = call.request.sortOrder === "desc" ? -1 : 1;

        const total = await productsCollection.countDocuments();

        const products = await productsCollection
            .find({})
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .toArray();

        callback(null, {
            products,
            total
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            details: error.message
        });
    }
}

// Iniciar servidor
async function startServer() {
    try {
        db = await connectDB();

        productsCollection = db.collection("products");

        const server = new grpc.Server();

        server.addService(productService.service, {
            login,
            getProducts,
            getProductById,
            getProductsByCategory,
            createProduct,
            updateProduct,
            deleteProduct,
            getProductSummaries,
            getProductsPaginated,
            getProductDetails
        });

        server.bindAsync(
            "127.0.0.1:50052",
            grpc.ServerCredentials.createInsecure(),
            (error, port) => {
                if (error) {
                    console.error("Error al iniciar gRPC:", error);
                    return;
                }

                console.log(`Servidor gRPC escuchando en el puerto ${port}`);
            }
        );

    } catch (error) {
        console.error("No se pudo iniciar el servidor:", error);
        process.exit(1);
    }
}

startServer();


