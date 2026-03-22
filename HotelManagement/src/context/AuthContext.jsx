import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
           const { data } = await api.get('/auth/profile');
           setUser(data);
        }
      } catch (error) {
        console.error('Failed to load user session', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    
    checkUserLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setUser({
         _id: data._id,
         name: data.name,
         email: data.email,
         role: data.role
      });
      return true;
    } catch (error) {
       console.error('Login error', error.response?.data?.message || error.message);
       throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
