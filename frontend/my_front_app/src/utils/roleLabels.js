export const ROLE_LABELS = {
  admin: "Administrateur",
  direction_generale: "Direction Générale",
  directeur_financier: "Directeur Financier",
  conformité: "Conformité",
  directeur_agence: "Directeur d'Agence",
};

export const getRoleLabel = (role) => ROLE_LABELS[role] || role;
