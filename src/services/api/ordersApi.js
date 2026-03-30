import { API_BASE_URL, getAuthHeader } from './apiConfig';

/**
 * @file ordersApi.js
 * @description REST API calls for ordering: place new, delete, and find.
 */

export const placeOrder = async ({ symbol, type, side, price, quantity }) => {
    try {
        const payload = { symbol, type, side, quantity };
        if (price) payload.price = parseFloat(price);
        
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok) {
            return { success: true, orderId: data.order_id };
        } else {
            return { success: false, error: data.message || 'Failed to place order' };
        }
    } catch (err) {
        console.error('PlaceOrder API Error:', err);
        return { success: false, error: 'Network failure' };
    }
};

export const cancelOrder = async (orderId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'DELETE',
            headers: getAuthHeader()
        });
        const data = await response.json();
        if (response.ok) {
            return { success: true };
        } else {
            return { success: false, error: data.message || 'Failed to cancel order' };
        }
    } catch (err) {
        console.error('CancelOrder API Error:', err);
        return { success: false, error: 'Network failure' };
    }
};

export const fetchOrders = async (params = {}) => {
    try {
        const url = new URL(`${API_BASE_URL}/orders`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: getAuthHeader()
        });
        const data = await response.json();
        if (response.ok) {
            return { success: true, orders: data };
        } else {
            return { success: false, error: 'Failed to fetch orders' };
        }
    } catch (err) {
        console.error('FetchOrders API Error:', err);
        return { success: false, error: 'Network failure' };
    }
};
