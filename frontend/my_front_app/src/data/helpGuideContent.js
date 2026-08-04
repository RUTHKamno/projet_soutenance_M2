// À placer dans : src/data/helpGuideContent.js
// Suit le même pattern que getChatQuickActions dans chatSections.js :
// le contenu est séparé du composant qui l'affiche.

export const helpGuideSections = [
  {
    id: "poser-question",
    title: "Poser une bonne question",
    body: [
      "Nommez l'indicateur exact que vous cherchez : encours de crédit, taux de remboursement, nombre de comptes actifs...",
      "Précisez la période si elle compte : « en juin 2026 », « depuis janvier », « sur les 3 derniers mois ».",
      "Si votre rôle couvre plusieurs agences, indiquez celle qui vous intéresse. Sinon, l'assistant applique automatiquement votre périmètre.",
    ],
    examples: [
      "Quel est l'encours total de crédit actif ce mois-ci ?",
      "Montre-moi l'évolution des décaissements sur les 6 derniers mois.",
      "Compare le nombre de comptes actifs par agence.",
    ],
  },
  {
    id: "validation",
    title: "L'étape de validation",
    body: [
      "Avant d'exécuter une requête, l'assistant reformule votre question pour confirmer qu'il l'a bien comprise.",
      "Vérifiez la reformulation : si elle correspond à votre intention, approuvez-la. Sinon, corrigez-la directement dans le champ prévu.",
      "Cette étape évite les malentendus et garantit que les données renvoyées répondent réellement à votre question.",
    ],
  },
  {
    id: "reponse-incoherente",
    title: "Si une réponse semble incohérente",
    body: [
      "Reformulez votre question en étant plus précis sur l'indicateur, la période ou l'agence concernée.",
      "Utilisez le bouton « Réessayer » sur le message pour relancer le traitement.",
      "Comparez le chiffre avec un tableau de bord Superset si le doute persiste sur un montant important.",
      "Ne prenez aucune décision basée sur un chiffre qui vous semble anormal sans l'avoir fait vérifier par l'équipe data.",
    ],
  },
  {
    id: "limites",
    title: "Ce que l'assistant ne fait pas",
    body: [
      "Il répond uniquement à partir des données internes du Data Warehouse de la microfinance.",
      "Il ne formule ni prévision, ni recommandation stratégique, ni avis personnel.",
      "Il ne peut pas afficher d'informations en dehors du périmètre autorisé par votre rôle.",
    ],
  },
];
