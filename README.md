# RuthyStore BI 🚀 
Lien de l'application frontend déployé sur Vercel App: https://projet-soutenance-m2-lcj68t4mc-ruthy-store.vercel.app/dashboard
## Plateforme de Business Intelligence & Agent IA pour la Microfinance

**RuthyStore BI** est une plateforme de Business Intelligence (BI) de bout en bout conçue pour l'institutions de microfinance X. Développée dans le cadre d'un projet de fin de cycle (Master 2 en Intelligence Artificielle et Big Data à Keyce Informatique et IA, Yaoundé), cette solution combine un **Data Warehouse robuste**, des **tableaux de bord analytiques** et un **système d'agents IA conversationnels** pour démocratiser l'accès aux indicateurs décisionnels.

---

## 🏗️ Architecture du Système

La plateforme s'articule autour de trois piliers majeurs :
1. **Data Warehouse (PostgreSQL) :** Modélisation avancée en schéma en flocon/constellation permettant le suivi granulaire des indicateurs de performance clés (KPIs).
2. **Dashboards Analytiques (Apache Superset) :** Visualisations interactives et gouvernance des données.
3. **Agent IA (LangGraph + Gemini) :** Interface en langage naturel permettant d'interroger le Data Warehouse et de générer des rapports dynamiques.

---

## 🛠️ Stack Technique

* **Backend :** Node.js, Express, TypeScript
* **Frontend :** React (Create React App), Apache ECharts
* **Data Warehouse :** PostgreSQL (Optimisé OLAP)
* **Visualisation BI :** Apache Superset 4.0.2
* **Orchestration IA :** Pipeline LangGraph, Google Gemini, Redis, LanceDB

---

## 📊 Modélisation des Données & Entreposage

Le Data Warehouse repose sur une architecture en **schéma en constellation** comprenant **9 dimensions partagées** et **4 tables de faits** principales, garantissant des temps de réponse optimaux pour les rapports analytiques :
* `fait_portefeuille_comptes` : Suivi des soldes et de la santé des comptes de dépôt.
* `fait_encours_credit` : Analyse des crédits actifs, du capital restant dû et du positionnement des risques.
* `fait_mep` : Historique et indicateurs sur les Mises En Place (MEP) de crédits.
* `fait_decaissements` : Flux de décaissements et suivi des mouvements de trésorerie.

L'alimentation est gérée via un pipeline **ETL** rigoureux assurant le nettoyage, la transformation et le chargement incrémental des données opérationnelles.

---

## 🤖 Pipeline de l'Agent IA (Multi-Agent LangGraph)

L'interaction en langage naturel repose sur un workflow décisionnel cyclique orchestré par **LangGraph (StateGraph)** :

1. **Reformulation & Compréhension :** Analyse de la requête utilisateur et alignement sémantique avec le dictionnaire de données.
2. **Génération SQL & Cache Sémantique :** 
   * Interrogation d'un système de cache hybride **Redis + LanceDB** (`sqlCache.ts`) pour réutiliser les requêtes fréquentes.
   * En cas de miss, génération dynamique de la requête SQL par l'intermédiaire du LLM.
3. **Validation (LLM-as-Judge) :** Vérification stricte de la syntaxe SQL et de la conformité de la requête vis-à-vis du schéma de la base avant exécution.
4. **Human-in-the-loop :** Intégration de points de contrôle critiques via la méthode `interrupt()/resume` de LangGraph pour validation humaine sur des requêtes sensibles.
5. **Exécution & Visualisation :** Extraction des données et génération automatique de graphiques interactifs via **Apache ECharts** et publication automatisée dans **Apache Superset**.
6. **Rédaction de Rapport :** Synthèse analytique textuelle descriptive des résultats obtenus.

---

## 🔒 Sécurité & Gouvernance

* **Contrôle d'Accès (RBAC) :** Gestion stricte des rôles utilisateurs (ex: `direction_generale`, `directeur_agence`).
* **Sécurité au Niveau des Lignes (RLS) :** Cloisonnement dynamique des données par agence directement au niveau de PostgreSQL et Superset, garantissant qu'un directeur d'agence ne consulte que le périmètre de sa propre succursale.
* **Historique & Traçabilité :** Audit complet des échanges et logs stockés dans la table `chat_messages` sur PostgreSQL.
