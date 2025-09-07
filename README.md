# Mi App de Notas Web

Una aplicación web full-stack para tomar notas, diseñada con una arquitectura moderna y una interfaz de usuario rica en funcionalidades. Este proyecto sirve como una demostración de habilidades en el desarrollo frontend y backend.

**[➡️ Ver Demo en Vivo](http'://')** *(<- ¡Reemplaza esto con tu link cuando lo despliegues!)*

---

## ✨ Características Principales

- **Gestión Completa de Notas (CRUD):** Crea, lee, actualiza y elimina notas fácilmente.
- **Autenticación Segura con Google:** Inicio de sesión a través de OAuth 2.0 y gestión de sesiones mediante JSON Web Tokens (JWT).
- **Organización Avanzada:** Agrupa notas en categorías y utiliza filtros dinámicos para encontrar lo que necesitas.
- **Panel de Administración:** Una sección separada para gestionar usuarios o configuraciones generales de la aplicación.
- **Notificaciones por Email:** El backend está equipado con un servicio para enviar correos electrónicos (ej. para bienvenida).
- **Atajos de Teclado:** Navegación y uso de la aplicación de forma más eficiente mediante atajos de teclado.
- **Diseño Responsivo:** Interfaz adaptable a diferentes tamaños de pantalla, desde escritorio hasta móvil.

---

## 🚀 Stack Tecnológico

Este proyecto está dividido en dos partes principales: un frontend moderno y un backend robusto.

### Frontend
- **Framework/Librerías:** JavaScript (ES6+) puro, sin frameworks mayores.
- **Herramientas de Build:** Vite
- **Estilos:** CSS3 puro con una estructura organizada.
- **Arquitectura:** Basada en componentes modulares y servicios para la lógica de negocio.

### Backend
- **Entorno:** Node.js
- **Framework:** Express.js *(asumido basado en la estructura)*
- **Autenticación:** OAuth 2.0 (Google) y JSON Web Tokens (JWT).
- **Servicios:** Integración con servicios de correo para notificaciones.

---

## 📂 Estructura del Proyecto

El repositorio está organizado en dos carpetas principales:

- **/frontend:** Contiene todo el código fuente de la aplicación cliente (la que ven los usuarios en su navegador).
- **/backend:** Contiene el servidor, la API REST y la lógica de negocio del lado del servidor.

```
mi-app-de-notas-web/
├── frontend/         # Código de la aplicación cliente (Vite)
├── backend/          # Código del servidor (Node.js/Express)
├── .gitignore
└── README.md
```

---

## 🛠️ Guía de Instalación y Uso Local

Para ejecutar este proyecto en tu máquina local, sigue estos pasos. Necesitarás tener [Node.js](https://nodejs.org/) (v18+) instalado.

**Importante:** Deberás usar dos terminales separadas, una para el backend y otra para el frontend.

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/mi-app-de-notas-web.git
cd mi-app-de-notas-web
```

### 2. Configurar y Ejecutar el Backend

El backend requiere variables de entorno para la configuración de la base de datos, autenticación y otros servicios.

```bash
# 1. Navega a la carpeta del backend
cd backend

# 2. Instala las dependencias
npm install

# 3. Configura tus variables de entorno
#    Crea un archivo .env y añade tus propias claves secretas.
PORT=3001
JWT_SECRET=tu_secreto_para_jwt

# Credenciales de Google OAuth 2.0
GOOGLE_CLIENT_ID=tu_client_id_de_google
GOOGLE_CLIENT_SECRET=tu_client_secret_de_google

# Credenciales del servicio de email
MAIL_HOST=smtp.example.com
MAIL_USER=user@example.com
MAIL_PASS=secret

# 4. Inicia el servidor
npm start
```
El servidor backend estará corriendo en `http://localhost:3001`.

### 3. Configurar y Ejecutar el Frontend

```bash
# (En una nueva terminal)
# 1. Navega a la carpeta del frontend
cd frontend

# 2. Instala las dependencias
npm install

# 3. Configura tus variables de entorno
#    Crea un archivo .env y añade la URL de tu API:
VITE_API_BASE_URL=http://localhost:3001

# 4. Inicia el servidor de desarrollo de Vite
npm run dev
```
La aplicación frontend estará disponible en la dirección que te indique Vite (normalmente `http://localhost:5173`).

---

## 🔮 Posibles Mejoras a Futuro

Este proyecto tiene una base sólida, pero aquí hay algunas ideas para llevarlo al siguiente nivel:

- [ ] **Implementar Pruebas:** Añadir pruebas unitarias y de integración en el backend (con Jest/Supertest) y pruebas de componentes y E2E en el frontend (con Vitest/Cypress).
- [ ] **Configurar un Pipeline de CI/CD:** Automatizar las pruebas y el despliegue usando GitHub Actions.
- [ ] **Migrar a una Base de Datos:** Reemplazar el almacenamiento actual por una base de datos más robusta como PostgreSQL o MongoDB.

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.
