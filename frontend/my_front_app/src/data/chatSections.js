export const DEFAULT_CHAT_QUICK_ACTIONS = [
  {
    label: "Encours de crédit",
    question: "Quel est le montant total des encours de crédit ?",
  },
  {
    label: "Remboursements",
    question: "Quel est le montant des remboursements cette semaine ?",
  },
  {
    label: "Performance agences",
    question: "Quelle est la meilleure agence en performance ce mois ?",
  },
];

export const ROLE_CHAT_QUICK_ACTIONS = {
  directeur_agence: [
    {
      label: "Encours de crédit agence",
      question:
        "Quel est le montant total des encours de crédit de mon agence ?",
    },
    {
      label: "Remboursements agence",
      question:
        "Quel est le montant des remboursements de mon agence cette semaine ?",
    },
    {
      label: "Performance de mon agence",
      question: "Quelle est la performance de mon agence ce mois ?",
    },
  ],
  directeur_financier: [
    {
      label: "Encours de crédit",
      question: "Quel est le montant total des encours de crédit ?",
    },
    {
      label: "Remboursements",
      question: "Quel est le montant des remboursements cette semaine ?",
    },
    {
      label: "Flux de trésorerie",
      question: "Quelle est l'évolution du flux de trésorerie cette semaine ?",
    },
  ],
  direction_generale: [
    {
      label: "Encours de crédit",
      question: "Quel est le montant total des encours de crédit ?",
    },
    {
      label: "Remboursements",
      question: "Quel est le montant des remboursements cette semaine ?",
    },
    {
      label: "Situation globale",
      question: "Quelle est la situation globale de la microfinance ce mois ?",
    },
  ],
  conformité: [
    {
      label: "Encours à risque",
      question: "Quel est le montant total des encours à risque ?",
    },
    {
      label: "Incidents de remboursement",
      question:
        "Combien d'incidents de remboursement ont été signalés cette semaine ?",
    },
    {
      label: "Rapport conformité",
      question: "Quel est l'état de conformité des portefeuilles de crédit ?",
    },
  ],
};

export const getChatQuickActions = (role) =>
  ROLE_CHAT_QUICK_ACTIONS[role] || DEFAULT_CHAT_QUICK_ACTIONS;
