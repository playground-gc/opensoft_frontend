/**
 * @file apiConfig.js
 * @description Centralized configuration for REST and WebSocket URLs.
 */

const host = window.location.hostname;

export const API_BASE_URL = `/api/v1`;
export const WS_BASE_URL = `ws://${host}:8001/ws`;

export const getAuthHeader = () => {
    try {
        const raw = localStorage.getItem('synthetic-bull/auth');
        const token = raw ? JSON.parse(raw)?.token : null;
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    } catch {
        return {};
    }
};
