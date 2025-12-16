const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const getSolicitudesMoviles = async () => {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al obtener solicitudes móviles');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export const getSolicitudesMovilesPendientes = async () => {
    try {
        const response = await fetch(`${API_URL}/pendientes`);
        if (!response.ok) throw new Error('Error al obtener solicitudes móviles pendientes');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export const getSolicitudMovilById = async (id) => {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) throw new Error('Error al obtener solicitud móvil');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export const aceptarSolicitudMovil = async (id, idUsuarioAprobador) => {
    try {
        const response = await fetch(`${API_URL}/${id}/aceptar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id_usuario_aprobador: idUsuarioAprobador }),
        });
        if (!response.ok) throw new Error('Error al aceptar solicitud móvil');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export const rechazarSolicitudMovil = async (id, idUsuarioAprobador, motivoRechazo) => {
    try {
        const response = await fetch(`${API_URL}/${id}/rechazar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id_usuario_aprobador: idUsuarioAprobador,
                motivo_rechazo: motivoRechazo,
            }),
        });
        if (!response.ok) throw new Error('Error al rechazar solicitud móvil');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export const deleteSolicitudMovil = async (id) => {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar solicitud móvil');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export const getEstadisticasMoviles = async () => {
    try {
        const response = await fetch(`${API_URL}/stats`);
        if (!response.ok) throw new Error('Error al obtener estadísticas');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};