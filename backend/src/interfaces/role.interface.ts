export interface Role {
  id: number;
  name: string;
  label: string | null;
  description: string | null;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
  users_count?: number; // présent uniquement sur getAll()
}

export interface CreateRoleDto {
  name: string;
  label?: string;
  description?: string;
}

export interface UpdateRoleDto {
  name?: string;
  label?: string;
  description?: string;
}
