/**Nous allons créer un petit fichier utilitaire qui va charger ton fichier rbac.json, lire 
 * le rôle de l'utilisateur et générer le texte de contrainte que l'on va donner à l'Agent SQL. */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Interface pour typer proprement notre configuration RBAC
interface RoleConfig {
  tables_autorisees: string[];
  colonnes_interdites: string[];
  filtres_obligatoires: Record<string, string>;
}

/**
 * Charge les contraintes de sécurité d'un utilisateur en fonction de son rôle
 * @param role Le rôle de l'utilisateur (ex: "directeur_agence")
 * @param contextContextInfo Les variables contextuelles (ex: { agence_utilisateur: "Yaoundé" })
 */
export function getSecurityConstraints(role: string, contextInfo: any): string {
  try {
    // 1. Lire le fichier rbac.json (ajuste le chemin selon l'emplacement exact de ton rbac.json)
    const rbacPath = path.join(__dirname, '../data/rbac_config.json'); 
    const rbacRaw = fs.readFileSync(rbacPath, 'utf-8');
    const rbacData = JSON.parse(rbacRaw);

    const roleConfig: RoleConfig = rbacData.roles[role];

    if (!roleConfig) {
      return "CONTRAINTE STRICTE : Rôle inconnu. Interdiction de générer la moindre requête SQL.";
    }

    // 2. Construire le texte des règles de sécurité à imposer à l'Agent SQL
    let instructionsSecurite = `\n🔐 RÈGLES DE SÉCURITÉ ET DROITS D'ACCÈS POUR LE RÔLE [${role.toUpperCase()}] :\n`;

    // A. Tables autorisées
    instructionsSecurite += `- Tu as uniquement le droit d'interroger ces tables : ${roleConfig.tables_autorisees.join(', ')}.\n`;

    // B. Colonnes interdites
    if (roleConfig.colonnes_interdites.length > 0) {
      instructionsSecurite += `- INTERDICTION ABSOLUE d'inclure ou de faire référence aux colonnes suivantes : ${roleConfig.colonnes_interdites.join(', ')}.\n`;
    }

    // C. Filtres obligatoires (Partitionnement par agence par exemple)
    const filtres = roleConfig.filtres_obligatoires;
    if (filtres && Object.keys(filtres).length > 0) {
      instructionsSecurite += `- Clauses WHERE de restriction à inclure OBLIGATOIREMENT selon la table utilisée :\n`;
      for (const [table, clauseTemplate] of Object.entries(filtres)) {
        // On remplace dynamiquement '{agence_utilisateur}' par sa vraie valeur (ex: 'Yaoundé')
        let clauseReelle = clauseTemplate;
        if (contextInfo) {
          for (const [cle, valeur] of Object.entries(contextInfo)) {
            clauseReelle = clauseReelle.replace(`{${cle}}`, valeur as string);
          }
        }
        instructionsSecurite += `  * Si ta requête cible la table ${table}, tu DOIS ajouter dans ton WHERE la condition : ${clauseReelle}\n`;
      }
    }

    return instructionsSecurite;

  } catch (error) {
    console.error("[RBAC Service] Erreur lors de la lecture du fichier rbac.json :", error);
    return "CONTRAINTE STRICTE : Erreur de vérification des droits. Interdiction de générer du SQL.";
  }
}