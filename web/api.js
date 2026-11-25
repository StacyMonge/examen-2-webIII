
import express from "express";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PROTO_PATH = path.join(__dirname, "../proto/products.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDefinition);

const clients = {
    memory: new proto.products.ProductService(
        "127.0.0.1:50051",
        grpc.credentials.createInsecure()
    ),

    mongodb: new proto.products.ProductService(
        "127.0.0.1:50052",
        grpc.credentials.createInsecure()
    )
};

// Seleccionar implementación
let implementation = "memory";

app.post("/api/implementation", (req, res) => {
    const { type } = req.body;

    if (!["memory", "mongodb"].includes(type)) {
        return res.status(400).json({
            message: "Implementación no válida"
        });
    }

    implementation = type;

    res.json({
        message: `Implementación seleccionada: ${type}`
    });
});

// Crear metadata para autenticación
function getMetadata(token) {
    const metadata = new grpc.Metadata();
    metadata.add("authorization", token);
    return metadata;
}

// Ejecutar operaciones gRPC
function grpcCall(method, data = {}, token = null) {
    return new Promise((resolve, reject) => {
        const metadata = token ? getMetadata(token) : new grpc.Metadata();

        clients[implementation][method](data, metadata, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

// Inicio de sesión
app.post("/api/login", async (req, res) => {
    try {
        const response = await grpcCall("login", req.body);
        res.json(response);
    } catch (error) {
        res.status(401).json({ message: error.details });
    }
});

// Consultar productos
app.get("/api/products", async (req, res) => {
    try {
        const response = await grpcCall(
            "getProducts",
            {},
            req.headers.authorization
        );

        res.json(response);
    } catch (error) {
        res.status(400).json({ message: error.details });
    }
});


// Crear un producto
app.post("/api/products", async (req, res) => {
    try {
        const product = {
            id: 0,
            name: req.body.name,
            price: Number(req.body.price),
            categoryId: Number(req.body.categoryId),
            supplierId: Number(req.body.supplierId)
        };

        const response = await grpcCall(
            "createProduct",
            product,
            req.headers.authorization
        );

        res.json(response);
    } catch (error) {
        res.status(400).json({ message: error.details });
    }
});

// Actualizar un producto
app.put("/api/products/:id", async (req, res) => {
    try {
        const product = {
            id: Number(req.params.id),
            name: req.body.name,
            price: Number(req.body.price),
            categoryId: Number(req.body.categoryId),
            supplierId: Number(req.body.supplierId)
        };

        const response = await grpcCall(
            "updateProduct",
            product,
            req.headers.authorization
        );

        res.json(response);
    } catch (error) {
        res.status(400).json({ message: error.details });
    }
});

// Eliminar un producto
app.delete("/api/products/:id", async (req, res) => {
    try {
        const response = await grpcCall(
            "deleteProduct",
            { id: Number(req.params.id) },
            req.headers.authorization
        );

        res.json(response);
    } catch (error) {
        res.status(400).json({ message: error.details });
    }
});

// Filtrar productos por categoría
app.get("/api/products/category/:id", async (req, res) => {
    try {
        const response = await grpcCall(
            "getProductsByCategory",
            { categoryId: Number(req.params.id) },
            req.headers.authorization
        );

        res.json(response);
    } catch (error) {
        res.status(400).json({ message: error.details });
    }
});

// Consultar resúmenes
app.get("/api/products/summaries", async (req, res) => {
    try {
        const response = await grpcCall(
            "getProductSummaries",
            {},
            req.headers.authorization
        );

        res.json(response);
    } catch (error) {
        res.status(400).json({ message: error.details });
    }
});

// Consultar detalles de un producto
app.get("/api/products/details/:id", async (req, res) => {
    try {
        const response = await grpcCall(
            "getProductDetails",
            { id: Number(req.params.id) },
            req.headers.authorization
        );

        res.json(response);
    } catch (error) {
        res.status(400).json({ message: error.details });
    }
});

// Consultar productos paginados
app.get("/api/products/paginated", async (req, res) => {
    try {
        const response = await grpcCall(
            "getProductsPaginated",
            {
                page: Number(req.query.page || 1),
                pageSize: Number(req.query.pageSize || 5),
                sortBy: req.query.sortBy || "name",
                sortOrder: req.query.sortOrder || "asc"
            },
            req.headers.authorization
        );

        res.json(response);
    } catch (error) {
        res.status(400).json({ message: error.details });
    }
});


app.listen(PORT, () => {
    console.log(`Aplicación web disponible en http://localhost:${PORT}`);
});
