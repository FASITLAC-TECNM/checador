import axios from 'axios';

const API_URL = 'http://localhost:3001/api/configuracion';

export const getConfiguracion = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const updateConfiguracion = async (configuracion) => {
    const response = await axios.put(API_URL, configuracion);
    return response.data;
};

export const toggleMantenimiento = async () => {
    const response = await axios.patch(`${API_URL}/mantenimiento`);
    return response.data;
};
