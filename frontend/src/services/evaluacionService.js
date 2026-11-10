import axios from 'axios';

const API_URL = 'http://localhost:8083/api/v1/evaluaciones';

export const evaluacionService = {
  // Obtener todas las evaluaciones
  obtenerTodas: async () => {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error) {
      console.error("Error al obtener todas las evaluaciones:", error);
      throw error;
    }
  },

  // Obtener evaluaciones por curso (usando el endpoint que sí tienes en Java)
  obtenerPorCurso: async (cursoId) => {
    try {
      const response = await axios.get(`${API_URL}/curso/${cursoId}`);
      return response.data;
    } catch (error) {
      console.error("Error al obtener evaluaciones por curso:", error);
      throw error;
    }
  },

  // Crear una nueva evaluación
  crearEvaluacion: async (evaluacionData) => {
    try {
      const response = await axios.post(API_URL, evaluacionData);
      return response.data;
    } catch (error) {
      console.error("Error al crear la evaluación:", error);
      throw error;
    }
  }
};