


// import { filtrarNotasPorGrupo, setSearchTerm } from "./NoteCard";
// import { handleFilter } from './GroupManager';

import Muuri from 'muuri';
import { gridUnpinned } from "../main";



export const initHeader = () => {


    // CERRAR SESION Y OPCIONES DE PERFIL
    const perfilImg = document.querySelector(".perfil-img");
    const perfilOptions = document.querySelector(".perfil-options-dropdown");
    perfilImg.addEventListener("click", () => {
        perfilOptions.classList.toggle("active");
    });
    // Detectar clics fuera del perfil y opciones
    document.addEventListener("click", (event) => {
        if (!perfilImg.contains(event.target) && !perfilOptions.contains(event.target)) {
            perfilOptions.classList.remove("active");
        }
    });


};





