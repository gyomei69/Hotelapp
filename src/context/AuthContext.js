import React, { createContext, useState, useContext } from 'react';

// Create the context
const AuthContext = createContext({
  user: null,
  login: async (username, password) => {},
  logout: () => {},
});

// Mocked tokens for demonstration
const mockTokens = {
  admin: { token: 'mock-jwt-admin-token-12345', role: 'admin', name: 'Admin User' },
  user: { token: 'mock-jwt-user-token-67890', role: 'user', name: 'Regular User' },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Initialize as null (logged out)

  // Simulated login function
  const login = async (username, password) => {
    // In a real app, you would make an API call here.
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (username === 'admin' && password === 'password') {
          setUser(mockTokens.admin);
          resolve(mockTokens.admin);
        } else if (username === 'user' && password === 'password') {
          setUser(mockTokens.user);
          resolve(mockTokens.user);
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 500); // Simulate network latency
    });
  };

  const logout = () => {
    setUser(null); // Clear user state
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easier consumption
export const useAuth = () => useContext(AuthContext);
