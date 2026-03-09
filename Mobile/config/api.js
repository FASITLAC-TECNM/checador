

export const getApiEndpoint = (path = '') => {
  const BASE_URL = 'https://9dm7dqf9-3002.usw3.devtunnels.ms';

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
};

export default getApiEndpoint;