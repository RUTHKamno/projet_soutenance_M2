// export type UserRole = "admin" | "direction_generale" | "directeur_financier" | "conformité" | "directeur_agence";

// export interface User {
//   id: number;
//   email: string;
//   password_hash: string;
//   role: UserRole;
//   first_name: string;
//   last_name: string;
//   agence: string | null;
//   is_active: boolean;
//   created_at: Date;
//   updated_at: Date;
// }

// export interface JwtPayload {
//   userId: number;
//   email: string;
//   role: UserRole;
//   firstName: string;
//   lastName: string;
//   contextInfo: {
//     agence_utilisateur: string | null;
//   };
// }

// export interface CreateUserDto {
//   email: string;
//   first_name: string;
//   last_name: string;
//   role: UserRole;
//   agence?: string | null;
// }

// export interface UpdateUserDto {
//   first_name?: string;
//   last_name?: string;
//   agence?: string | null;
//   current_password?: string;
//   new_password?: string;
// }

// export interface AdminUpdateUserDto extends UpdateUserDto {
//   role?: UserRole;
//   is_active?: boolean;
// }

// Les rôles sont désormais gérés dynamiquement par l'admin via la table `roles`
// (voir role.service.ts). On garde ce type comme alias documentaire plutôt que
// comme union fermée, pour ne pas casser tout le typage existant (CreateUserDto,
// JwtPayload, comparaisons `role === "directeur_agence"`, etc.) à chaque fois
// qu'un nouveau rôle est créé depuis l'UI admin.
export type UserRole = string;

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
