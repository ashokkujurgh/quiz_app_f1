export const getToken = () => localStorage.getItem('admin_token');
export const setToken = (token: string) => localStorage.setItem('admin_token', token);
export const clearToken = () => localStorage.removeItem('admin_token');
export const isLoggedIn = () => !!getToken();
