// services/config.js
export const getApiEndpoint = (path = '') => {
    const BASE_URL = 'https://9dm7dqf9-3001.usw3.devtunnels.ms';
    return `${BASE_URL}${path}`;  // Sin /api
};

export default getApiEndpoint;