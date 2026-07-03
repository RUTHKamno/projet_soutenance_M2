import { Request, Response } from "express";
import { generateDashboardPDF } from "../services/pdfService.js";
import { resetTokenCache } from "../services/supersetClient.js";

export const handlePdfExport = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { dashboardId, charts, role, contextInfo, resetCache } = req.body;

  // 1. Validations des paramètres d'entrée
  if (!dashboardId) {
    res.status(400).json({ error: "dashboardId est requis." });
    return;
  }

  if (!role || !contextInfo) {
    res.status(400).json({ error: "role et contextInfo sont requis." });
    return;
  }

  try {
    // Réinitialiser le cache si demandé (utile si les tokens ont expiré)
    if (resetCache === true) {
      resetTokenCache();
      console.log(
        "[PdfController] 🔄 Cache Superset réinitialisé à la demande",
      );
    }

    console.log(
      `[PdfController] 📄 Export PDF — Génération pour le dashboard ${dashboardId}`,
    );

    // 2. Appel au service de génération de buffer
    const pdfBuffer = await generateDashboardPDF({
      dashboardId,
      charts, // Optionnel
      role,
      contextInfo,
    });

    const filename = `rapport_dashboard_${dashboardId}_${Date.now()}.pdf`;

    // 3. Configuration des en-têtes HTTP pour un téléchargement de fichier binaire
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    // 4. Envoi du flux binaire
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error("[PdfController] ❌ Échec de l'export PDF :", err.message);

    // Sécurité : On s'assure de repasser en JSON pour envoyer l'objet d'erreur proprement
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: err.message });
  }
};
