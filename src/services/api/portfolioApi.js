import { API_BASE_URL, getAuthHeader } from './apiConfig';

/**
 * @file portfolioApi.js
 * @description Fetch current portfolio from server.
 */

export const fetchMe = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/me`, {
            method: 'GET',
            headers: getAuthHeader()
        });
        const data = await response.json();
        if (response.ok) {
            return { success: true, data };
        } else {
            return { success: false, error: data.detail || data.message || 'Failed to fetch account' };
        }
    } catch (err) {
        console.error('FetchMe API Error:', err);
        return { success: false, error: 'Network failure' };
    }
};

export const fetchPortfolio = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/portfolio`, {
            method: 'GET',
            headers: getAuthHeader()
        });
        const data = await response.json();
        if (response.ok) {
            // Backend returns array directly
            const holdings = Array.isArray(data) ? data : (data.holdings || []);
            return { success: true, holdings };
        } else {
            return { success: false, error: data.detail || data.message || 'Failed to fetch portfolio' };
        }
    } catch (err) {
        console.error('FetchPortfolio API Error:', err);
        return { success: false, error: 'Network failure' };
    }
};
