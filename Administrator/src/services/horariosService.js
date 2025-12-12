import axios from 'axios';

const API_URL = 'http://localhost:3001/api/horarios';

// Obtener todos los horarios
export const obtenerHorarios = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

// Obtener horario por ID
export const obtenerHorarioPorId = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

// Crear un nuevo horario
export const crearHorario = async (horarioData) => {
    const response = await axios.post(API_URL, horarioData);
    return response.data;
};

// Actualizar un horario existente
export const actualizarHorario = async (id, horarioData) => {
    const response = await axios.put(`${API_URL}/${id}`, horarioData);
    return response.data;
};

// Eliminar un horario
export const eliminarHorario = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
};

// Obtener empleados asignados a un horario
export const obtenerEmpleadosPorHorario = async (id) => {
    const response = await axios.get(`${API_URL}/${id}/empleados`);
    return response.data;
};

// Asignar horario a un empleado
export const asignarHorarioAEmpleado = async (idHorario, idEmpleado) => {
    const response = await axios.post(`${API_URL}/${idHorario}/empleado/${idEmpleado}`);
    return response.data;
};

export default {
    obtenerHorarios,
    obtenerHorarioPorId,
    crearHorario,
    actualizarHorario,
    eliminarHorario,
    obtenerEmpleadosPorHorario,
    asignarHorarioAEmpleado
};
