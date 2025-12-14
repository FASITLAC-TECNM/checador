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

// Obtener todos los horarios con información de empleados para vista de calendario
export const obtenerHorariosConEmpleados = async () => {
    try {
        const response = await axios.get(`${API_URL}/vista/calendario`);
        return response.data;
    } catch (error) {
        console.error('Error obteniendo horarios con empleados:', error);
        throw error;
    }
};

// Obtener horario de un empleado específico
export const obtenerHorarioPorEmpleado = async (empleadoId) => {
    try {
        const response = await axios.get(`${API_URL}/empleado/${empleadoId}`);
        return response.data;
    } catch (error) {
        console.error('Error obteniendo horario del empleado:', error);
        throw error;
    }
};

export default {
    obtenerHorarios,
    obtenerHorarioPorId,
    crearHorario,
    actualizarHorario,
    eliminarHorario,
    obtenerEmpleadosPorHorario,
    asignarHorarioAEmpleado,
    obtenerHorariosConEmpleados,
    obtenerHorarioPorEmpleado
};
