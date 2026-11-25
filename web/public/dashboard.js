
const token = sessionStorage.getItem("token");


if (!token) {
    window.location.href = "/";
}

const table = document.getElementById("productsTable");
const message = document.getElementById("statusMessage");
const form = document.getElementById("productForm");

let products = [];
let editingId = null;
let currentPage = 1;
let pageSize = 3;
let totalProducts = 0;
let totalPages = 1;

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": token,
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Ocurrió un error");
    }

    return data;
}

function showMessage(text, color = "green") {
    message.textContent = text;
    message.style.color = color;
}

function renderProducts(list) {
    table.innerHTML = "";

    document.getElementById("totalProducts").textContent = list.length;

    if (list.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="6">No se encontraron productos.</td>
            </tr>
        `;
        return;
    }

    list.forEach(product => {
        const row = document.createElement("tr");

        const values = [
            product.id,
            product.name,
            Number(product.price).toFixed(2),
            product.categoryId,
            product.supplierId
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actions = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Editar";
        editButton.className = "small-button";
        editButton.addEventListener("click", () => editProduct(product));

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Eliminar";
        deleteButton.className = "small-button delete-button";
        deleteButton.addEventListener("click", () => deleteProduct(product.id));

        const detailsButton = document.createElement("button");
detailsButton.textContent = "Detalles";
detailsButton.className = "small-button";

detailsButton.addEventListener("click", () => {
    showProductDetails(product.id);
});

actions.append(editButton, deleteButton, detailsButton);
        row.appendChild(actions);

        table.appendChild(row);
    });
}

async function loadProducts() {
    try {
        const data = await apiRequest("/api/products");
        products = data.products || [];
        renderProducts(products);
        showMessage("Productos cargados correctamente.");
    } catch (error) {
        showMessage(error.message, "red");
    }
}

function editProduct(product) {
    editingId = product.id;

    document.getElementById("formTitle").textContent = "Editar producto";
    document.getElementById("productName").value = product.name;
    document.getElementById("productPrice").value = product.price;
    document.getElementById("categoryId").value = product.categoryId;
    document.getElementById("supplierId").value = product.supplierId;

    document.getElementById("saveButton").textContent = "Actualizar producto";

    document.getElementById("formPanel").scrollIntoView({
        behavior: "smooth"
    });
}

async function deleteProduct(id) {
    if (!confirm("¿Deseás eliminar este producto?")) {
        return;
    }

    try {
        await apiRequest(`/api/products/${id}`, {
            method: "DELETE"
        });

        showMessage("Producto eliminado correctamente.");
        await loadProducts();
    } catch (error) {
        showMessage(error.message, "red");
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const product = {
        name: document.getElementById("productName").value,
        price: Number(document.getElementById("productPrice").value),
        categoryId: Number(document.getElementById("categoryId").value),
        supplierId: Number(document.getElementById("supplierId").value)
    };

    try {
        if (editingId !== null) {
            await apiRequest(`/api/products/${editingId}`, {
                method: "PUT",
                body: JSON.stringify(product)
            });

            showMessage("Producto actualizado correctamente.");
        } else {
            await apiRequest("/api/products", {
                method: "POST",
                body: JSON.stringify(product)
            });

            showMessage("Producto creado correctamente.");
        }

        resetForm();
        await loadProducts();

    } catch (error) {
        showMessage(error.message, "red");
    }
});

function resetForm() {
    editingId = null;
    form.reset();

    document.getElementById("formTitle").textContent = "Nuevo producto";
    document.getElementById("saveButton").textContent = "Guardar producto";
}

document.getElementById("newProductButton").addEventListener("click", () => {
    resetForm();
    document.getElementById("formPanel").scrollIntoView({
        behavior: "smooth"
    });
});

document.getElementById("cancelButton").addEventListener("click", resetForm);

document.getElementById("searchInput").addEventListener("input", () => {
    const search = document.getElementById("searchInput").value.toLowerCase();

    const filtered = products.filter(product =>
        product.name.toLowerCase().includes(search)
    );

    renderProducts(filtered);
});

document.getElementById("filterButton").addEventListener("click", async () => {
    const categoryId = document.getElementById("categoryFilter").value;

    if (!categoryId) {
        showMessage("Ingresá un ID de categoría.", "red");
        return;
    }

    try {
        const data = await apiRequest(`/api/products/category/${categoryId}`);
        renderProducts(data.products || []);
        showMessage("Filtro aplicado.");
    } catch (error) {
        showMessage(error.message, "red");
    }
});

document.getElementById("showAllButton").addEventListener("click", async () => {
    document.getElementById("searchInput").value = "";
    document.getElementById("categoryFilter").value = "";
    await loadProducts();
});

document.getElementById("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("token");
    window.location.href = "/";
});

async function loadPaginatedProducts() {
    try {
        const sortBy = document.getElementById("sortBy").value;
        const sortOrder = document.getElementById("sortOrder").value;

        const data = await apiRequest(
            `/api/products/paginated?page=${currentPage}&pageSize=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`
        );

        products = data.products || [];
        totalProducts = Number(data.total || 0);
        totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));

        renderProducts(products);

        document.getElementById("totalProducts").textContent = totalProducts;
        document.getElementById("pageInfo").textContent =
            `Página ${currentPage} de ${totalPages}`;

        document.getElementById("previousPage").disabled =
            currentPage <= 1;

        document.getElementById("nextPage").disabled =
            currentPage >= totalPages;

        showMessage("Productos cargados correctamente.");

    } catch (error) {
        showMessage(error.message, "red");
    }
}

async function showProductDetails(id) {
    try {
        const data = await apiRequest(`/api/products/details/${id}`);

        const product = data.product;

        document.getElementById("detailsPanel").hidden = false;

        document.getElementById("detailsContent").textContent =
            `Producto: ${product.name} | ` +
            `Precio: ${product.price} | ` +
            `Categoría: ${data.category?.name || "No disponible"} | ` +
            `Proveedor: ${data.supplier?.name || "No disponible"}`;

    } catch (error) {
        showMessage(error.message, "red");
    }
}

async function loadSummaries() {
    try {
        const data = await apiRequest("/api/products/summaries");

        const content = document.getElementById("summariesContent");
        content.innerHTML = "";

        (data.products || []).forEach(product => {
            const item = document.createElement("p");
            item.textContent = `${product.name} - $${Number(product.price).toFixed(2)}`;
            content.appendChild(item);
        });

        document.getElementById("summariesPanel").hidden = false;

    } catch (error) {
        showMessage(error.message, "red");
    }
}

document.getElementById("summariesButton").addEventListener(
    "click",
    loadSummaries
);

document.getElementById("sortButton").addEventListener("click", () => {
    currentPage = 1;
    loadPaginatedProducts();
});

document.getElementById("previousPage").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        loadPaginatedProducts();
    }
});

document.getElementById("nextPage").addEventListener("click", () => {
    if (currentPage < totalPages) {
        currentPage++;
        loadPaginatedProducts();
    }
});

loadPaginatedProducts();