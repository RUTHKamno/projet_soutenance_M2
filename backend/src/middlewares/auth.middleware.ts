import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_CEPI_2026_KEY";

// Extension de l'interface Request d'Express pour y ajouter nos données d'authentification
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    contextInfo: {
      agence_utilisateur: string | null;
    };
  };
}

export const checkAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Accès refusé. Token manquant ou mal formaté." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    // Décodage et vérification du token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    console.log("clé décodé", decoded);
    
    // On injecte l'utilisateur décodé dans la requête
    // 🔥 Sécurité absolue : On écrase les paramètres 'role' et 'contextInfo' envoyés dans le body 
    // par ceux issus du jeton crypté infalsifiable.
    // req.body.role = decoded.role;
    req.user = decoded;
    console.log("req.user");
    // req.body.contextInfo = decoded?.contextInfo || "";

    next(); // On passe au contrôleur de l'agent ou du PDF
  } catch (err) {
    console.log("erreur de décodage de clés", err);
    res.status(403).json({ error: "Session expirée ou Token invalide." });
  }
};