import axios from 'axios';
import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api/empleado-departamento');

export const getDepartamentosEmpleado = async (idEmpleado) => {
    const response = await axios.get(`${API_URL}/empleado/${idEmpleado}`);
    return response.data;
};

export const asignarDepartamento = async (idEmpleado, idDepartamento) => {
    const response = await axios.post(API_URL, {
        id_empleado: idEmpleado,
        id_departamento: idDepartamento
    });
    return response.data;
};

export const eliminarAsignacionDepartamento = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
};
