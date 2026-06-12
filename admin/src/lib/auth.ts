export const getToken = () => localStorage.getItem('admin_token');
export const setToken = (token: string) => localStorage.setItem('admin_token', token);
export const clearToken = () => localStorage.removeItem('admin_token');
export const isLoggedIn = () => !!getToken();

export interface AdminProfile {
  _id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
}

export const setAdminProfile = (user: AdminProfile) =>
  localStorage.setItem('admin_profile', JSON.stringify(user));

export const getAdminProfile = (): AdminProfile | null => {
  try {
    const raw = localStorage.getItem('admin_profile');
    return raw ? (JSON.parse(raw) as AdminProfile) : null;
  } catch {
    return null;
  }
};

export const clearAdminProfile = () => localStorage.removeItem('admin_profile');
