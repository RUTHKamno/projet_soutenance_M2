export interface CommentaireNotation {
  id?: number;
  nom: string;
  email?: string;
  note: number;
  commentaire: string;
  statut?: "approved" | "pending" | "rejected";
  created_at?: Date;
}

export interface CreateCommentaireDTO {
  nom: string;
  email?: string;
  note: number;
  commentaire: string;
}

export interface CommentaireStats {
  moyenne: number;
  total: number;
}
