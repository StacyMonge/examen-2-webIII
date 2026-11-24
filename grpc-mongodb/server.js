
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

// Configuración JWT
const JWT_SECRET = "clave_secreta_grpc_mongodb";

// Iniciar sesión y generar token JWT
function login(call, callback) {
    const { username, password } = call.request;

    // Usuario de prueba
    if (username !== "admin" || password !== "1234") {
        return callback({
            code: grpc.status.UNAUTHENTICATED,
            message: "Usuario o contraseña incorrectos"
        });
    }

    const token = jwt.sign(
        { username },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    callback(null, {
        success: true,
        message: "Inicio de sesión exitoso",
        token
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
                message: "Se requiere un token de autenticación"
            });
        }

        const token = authorization[0].toString();

        jwt.verify(token, JWT_SECRET);

        return true;

    } catch (error) {
        callback({
            code: grpc.status.UNAUTHENTICATED,
            message: "Token inválido o expirado"
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
            message: error.message
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
                message: "Producto no encontrado"
            });
        }

        callback(null, {
            success: true,
            message: "Producto encontrado",
            product
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: error.message
        });
    }
}

// Filtrar productos por categoría
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
            message: error.message
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
            message: "Producto creado correctamente",
            product: newProduct
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: error.message
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
                message: "Producto no encontrado"
            });
        }

        const updatedProduct = await productsCollection.findOne({ id });

        callback(null, {
            success: true,
            message: "Producto actualizado correctamente",
            product: updatedProduct
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: error.message
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
                message: "Producto no encontrado"
            });
        }

        callback(null, {
            success: true,
            message: "Producto eliminado correctamente"
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: error.message
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
            message: error.message
        });
    }
}


async function getProductsWithDetails(call, callback) {

    if (!verifyToken(call, callback)) {
        return;
    }

    try {
        const products = await productsCollection.aggregate([
            {
                $lookup: {
                    from: "categories",
                    localField: "categoryId",
                    foreignField: "id",
                    as: "category"
                }
            },
            {
                $lookup: {
                    from: "suppliers",
                    localField: "supplierId",
                    foreignField: "id",
                    as: "supplier"
                }
            },
            {
                $unwind: "$category"
            },
            {
                $unwind: "$supplier"
            },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    name: 1,
                    price: 1,
                    stock: 1,
                    category: "$category.name",
                    supplier: "$supplier.name",
                    country: "$supplier.country"
                }
            }
        ]).toArray();

        callback(null, { products });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: error.message
        });
    }
}



// Consultar productos con paginación y ordenamiento
async function getProductsPaginated(call, callback) {

    if (!verifyToken(call, callback)) {
        return;
    }

    try {
        const { page, pageSize, sortBy, sortOrder } = call.request;

        const currentPage = Math.max(1, page || 1);
        const limit = Math.min(100, Math.max(1, pageSize || 5));

        const allowedFields = ["name", "price"];
        const field = allowedFields.includes(sortBy)
            ? sortBy
            : "name";

        const order = sortOrder === "desc" ? -1 : 1;

        const products = await productsCollection.find({})
            .sort({ [field]: order })
            .skip((currentPage - 1) * limit)
            .limit(limit)
            .toArray();

        const total = await productsCollection.countDocuments();

        callback(null, {
            products,
            total,
            page: currentPage,
            pageSize: limit
        });

    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: error.message
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
            getProductsWithDetails
        });

        server.bindAsync(
            "127.0.0.1:50051",
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
