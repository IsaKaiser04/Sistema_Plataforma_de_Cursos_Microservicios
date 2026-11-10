import axios from 'axios';

// Ajusta el puerto al que esté usando tu compañero (ej. 8081)
const CURSOS_API_URL = 'http://localhost:8081/api/v1/cursos';

export const cursoService = {
  obtenerCursos: async () => {
    try {
      const response = await axios.get(CURSOS_API_URL);
      return response.data;
    } catch (error) {
      console.error("Error al obtener los cursos del otro microservicio:", error);
      return [];
    }
  }
};