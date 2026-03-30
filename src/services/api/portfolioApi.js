import { API_BASE_URL, getAuthHeader } from './apiConfig';

/**
 * @file portfolioApi.js
 * @description Fetch current portfolio from server.
 */

export const fetchPortfolio = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/portfolio`, {
            method: 'GET',
            headers: getAuthHeader()
        });
        const data = await response.json();
        if (response.ok) {
            return { success: true, holdings: data };
        } else {
            return { success: false, error: data.message || 'Failed to fetch portfolio' };
        }
    } catch (err) {
        console.error('FetchPortfolio API Error:', err);
        return { success: false, error: 'Network failure' };
    }
};
