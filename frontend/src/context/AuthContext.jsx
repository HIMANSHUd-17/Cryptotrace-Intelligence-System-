import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // Keep it minimal in state per user instruction, no localStorage persistence needed for now
    const [token, setToken] = useState(null);

    const login = async (username, password) => {
        try {
            const response = await fetch('http://localhost:8000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            if (data.access_token) {
                setToken(data.access_token);
                return true;
            }
        } catch (error) {
            console.error("Login failed", error);
        }
        return false;
    };

    const logout = () => {
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
