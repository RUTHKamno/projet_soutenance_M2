export const translateChatError = (rawError = "") => {
  const msg = rawError.toLowerCase();

  if (msg.includes("recursion limit"))
    return "L'agent a rencontré une boucle de traitement trop longue. Reformulez votre question de manière plus précise.";

  if (msg.includes("rate limit") || msg.includes("429"))
    return "Le service est momentanément surchargé. Veuillez patienter quelques secondes avant de réessayer.";

  if (msg.includes("timeout") || msg.includes("timed out"))
    return "Le traitement a pris trop de temps. Essayez avec une question plus simple.";

  if (msg.includes("network") || msg.includes("fetch"))
    return "Problème de connexion réseau. Vérifiez votre connexion internet.";

  if (msg.includes("401") || msg.includes("unauthorized"))
    return "Votre session a expiré. Veuillez vous reconnecter.";

  if (msg.includes("403") || msg.includes("forbidden"))
    return "Vous n'êtes pas autorisé à accéder à ces données.";

  if (msg.includes("blocked") || msg.includes("hors-sujet"))
    return "Cette demande est hors du périmètre autorisé du Data Warehouse.";

  if (msg.includes("sql") || msg.includes("database"))
    return "Une erreur technique est survenue lors de l'analyse des données. Réessayez ou reformulez votre question.";

  return "Une erreur inattendue est survenue. Veuillez réessayer.";
};
