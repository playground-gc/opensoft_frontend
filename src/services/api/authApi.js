import { API_BASE_URL } from './apiConfig';

/**
 * @file authApi.js
 * @description Authentication service to handle login, registration, and logout.
 * All functions return promises to handle results in UI components.
 */

export const login = async (username, password) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify({
                id: data.user_id,
                username: data.username
            }));
            return { success: true, user: data };
        } else {
            return { success: false, error: data.message || 'Login failed' };
        }
    } catch (err) {
        console.error('Login error:', err);
        return { success: false, error: 'Network error or backend unavailable' };
    }
};

export const register = async (username, email, password) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify({
                id: data.user_id,
                username: data.username
            }));
            return { success: true, user: data };
        } else {
            return { success: false, error: data.message || 'Registration failed' };
        }
    } catch (err) {
        console.error('Registration error:', err);
        return { success: false, error: 'Network error or backend unavailable' };
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

export const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};
