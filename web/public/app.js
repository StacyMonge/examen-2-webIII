
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const implementationSelect = document.getElementById("implementationSelect");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const implementation = implementationSelect.value;

    message.textContent = "Seleccionando implementación...";
    message.style.color = "#334e80";

    try {
        // Seleccionar el servidor gRPC
        const implementationResponse = await fetch("/api/implementation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ type: implementation })
        });

        const implementationData = await implementationResponse.json();

        if (!implementationResponse.ok) {
            throw new Error(implementationData.message || "No se pudo seleccionar la implementación.");
        }

        message.textContent = "Verificando datos...";

        // Iniciar sesión en el servidor seleccionado
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Error al iniciar sesión");
        }

        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("implementation", implementation);

        message.textContent = "¡Inicio de sesión exitoso!";
        message.style.color = "green";

        window.location.href = "/dashboard.html";

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "red";
    }
});
