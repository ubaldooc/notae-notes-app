import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";


export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"]
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.browser
    },
    // Aquí es donde agregas o modificas tus reglas
    rules: {
      "no-unused-vars": "warn", // Ejemplo: convierte "no-unused-vars" a advertencia
      "no-console": "warn",    // Otro ejemplo: convierte "no-console" a advertencia
      "eqeqeq": "error",      // Esta sigue siendo un error

      "no-useless-escape": "warn" // Esto hará que siempre sea una advertencia
    }
  },
]);
