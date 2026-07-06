import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { AuthService } from "../services/authService.js";

export const AuthController = {
  // Superset

  // GET /auth/superset-token (Utilisateur connecté requis)
  async getSupersetToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // À synchroniser avec dashboardsByRole dans auth.controller.ts

      const { dashboardId } = req.query; // ← lire depuis la query
      // 1. Récupérer l'utilisateur complet depuis la base de données grâce à l'ID du token de session
      const user = await AuthService.getUserById(req.user!.userId);
      console.log(
        "[GET SUPERSET TOKEN AUTH CONTROLLER] Utilisateur récupéré pour Superset:",
        user,
      );

      if (!user) {
        res.status(404).json({ error: "Utilisateur non trouvé." });
        return;
      }

      console.log(
        "[GET SUPERSET TOKEN AUTH CONTROLLER] Dashboard ID reçu:",
        dashboardId,
      );

      // 2. Générer le Guest Token Superset avec la logique RLS intégrée
      const supersetData = await AuthService.getSupersetGuestToken({
        email: user.email,
        role: user.role,
        agence: user.agence,
        first_name: user.first_name,
        last_name: user.last_name,
        dashboardId: dashboardId as string, // ← passer le dashboardId
      });

      // 3. Renvoyer le jeton et la configuration au Frontend
      res.status(200).json(supersetData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // GET /auth/dashboards — liste des dashboards selon le rôle
  async getDashboards(req: AuthenticatedRequest, res: Response) {
    try {
      const role = req.user!.role;

      // Mapping rôle → dashboards autorisés
      const dashboardsByRole: Record<
        string,
        { id: string; label: string; description: string; ids: number }[]
      > = {
        admin: [
          // {
          //   id: "uuid-dashboard-global",
          //   label: "Vue Globale",
          //   description: "Indicateurs consolidés toutes agences",
          // },
          // {
          //   id: "uuid-dashboard-credit",
          //   label: "Portefeuille Crédit",
          //   description: "Encours, risques et remboursements",
          // },
          {
            id: "84e98a10-319d-4073-9532-e46bc1bd6db2",
            label: "Décaissements",
            description: "Flux de liquidités et bilans",
            ids: 2,
          },
          {
            id: "46b21232-cf43-4195-82be-81e77920742a",
            label: "Crédit",
            description: "Flux des Encours de crédit",
            ids: 1,
          },
        ],
        direction_generale: [
          {
            id: "84e98a10-319d-4073-9532-e46bc1bd6db2",
            label: "Décaissements",
            description: "Flux de liquidités et bilans",
            ids: 2,
          },
          {
            id: "46b21232-cf43-4195-82be-81e77920742a",
            label: "Crédit",
            description: "Flux des Encours de crédit",
            ids: 1,
          },
        ],
        directeur_financier: [
          {
            id: "84e98a10-319d-4073-9532-e46bc1bd6db2",
            label: "Décaissements",
            description: "Flux de liquidités et bilans",
            ids: 2,
          },
          {
            id: "46b21232-cf43-4195-82be-81e77920742a",
            label: "Crédit",
            description: "Flux des Encours de crédit",
            ids: 1,
          },
        ],
        directeur_agence: [
          {
            id: "84e98a10-319d-4073-9532-e46bc1bd6db2",
            label: "Performance Agences",
            description: "Comparatif inter-agences",
            ids: 2,
          },
          {
            id: "46b21232-cf43-4195-82be-81e77920742a",
            label: "Crédit",
            description: "Flux des Encours de crédit",
            ids: 1,
          },
        ],
        conformité: [
          {
            id: "46b21232-cf43-4195-82be-81e77920742a",
            label: "Crédit",
            description: "Flux des Encours de crédit",
            ids: 1,
          },
        ],
      };

      const dashboards = dashboardsByRole[role] ?? [];
      res.status(200).json({ dashboards });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // POST /auth/signin
  async signIn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email et mot de passe requis." });
        return;
      }
      const result = await AuthService.signIn(email, password);
      res.status(200).json({ message: "Connexion réussie.", ...result });
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  },

  // POST /auth/users  (ADMIN ONLY)
  async createUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      console.log("body", req?.body);
      console.log("requete utilisateur", req);
      if (req.user?.role !== "admin") {
        res
          .status(403)
          .json({ error: "Accès refusé. Réservé à l'administrateur." });
        return;
      }
      const { email, first_name, last_name, role, agence } = req.body;
      console.log("informations utilisateur", {
        email,
        first_name,
        last_name,
        role,
        agence,
      });
      if (!email || !first_name || !last_name || !role) {
        res.status(400).json({
          error: "Champs requis : email, first_name, last_name, role.",
        });
        return;
      }
      const result = await AuthService.createUser({
        email,
        first_name,
        last_name,
        role,
        agence,
      });
      res
        .status(201)
        .json({ message: "Utilisateur créé avec succès.", ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  // PUT /auth/me  (utilisateur connecté)
  async updateSelf(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user!.userId;
      const { first_name, last_name, agence, current_password, new_password } =
        req.body;
      const result = await AuthService.updateSelf(userId, {
        first_name,
        last_name,
        agence,
        current_password,
        new_password,
      });
      res.status(200).json({ message: "Profil mis à jour.", ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  // PUT /auth/users/:id  (ADMIN ONLY)
  async adminUpdateUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (req.user?.role !== "admin") {
        res
          .status(403)
          .json({ error: "Accès refusé. Réservé à l'administrateur." });
        return;
      }
      const targetId = parseInt(req.params["id"] as string, 10);
      if (isNaN(targetId)) {
        res.status(400).json({ error: "ID utilisateur invalide." });
        return;
      }
      const result = await AuthService.adminUpdateUser(targetId, req.body);
      res.status(200).json({ message: "Utilisateur mis à jour.", ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  // GET /auth/me
  async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await AuthService.getUserById(req.user!.userId);
      res.status(200).json({ user });
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  },

  // GET /auth/users  (ADMIN ONLY)
  async getAllUsers(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user?.role !== "admin") {
        res.status(403).json({ error: "Accès refusé." });
        return;
      }
      const users = await AuthService.getAllUsers();
      res.status(200).json({ users });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
