export enum Role {
  CLIENT = 'Client',
  FIELD_TEAM = 'FieldTeam',
  ADMIN = 'Admin',
}

export interface User {
  _id?: string;
  id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: Role | 'Client' | 'FieldTeam' | 'Admin';
  phone?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
}

