/**
 * @file apiConfig.js
 * @description Centralized configuration for REST and WebSocket URLs.
 */

const host = window.location.hostname; // Dynamically resolve host for local network access

export const API_BASE_URL = `http://${host}:8000/api/v1`;
export const WS_BASE_URL = `ws://${host}:8001/ws`;

export const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};
