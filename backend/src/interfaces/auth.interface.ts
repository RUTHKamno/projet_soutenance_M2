export type UserRole = "admin" | "direction_generale" | "directeur_financier" | "conformité" | "directeur_agence";

export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  agence: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  contextInfo: {
    agence_utilisateur: string | null;
  };
}

export interface CreateUserDto {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  agence?: string | null;
}

export interface UpdateUserDto {
  first_name?: string;
  last_name?: string;
  agence?: string | null;
  current_password?: string;
  new_password?: string;
}

export interface AdminUpdateUserDto extends UpdateUserDto {
  role?: UserRole;
  is_active?: boolean;
}