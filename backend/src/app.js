import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getLanceDB } from "./config/lancedb.js";
// import { llm } from "./config/gemini.js"; // Notre instance LangChain
import { llm } from "./config/ollama_client.js"; // Notre instance LangChain
import agentRoutes from "./routes/agent.routes.js"; // 🆕 AJOUT : Importation de tes nouvelles routes
import pdfRoutes from "./routes/pdf.export.routes.js"; // 🆕 AJOUT : Importation de tes routes de génération de PDF
import authRoutes from "./routes/auth.routes.js";
import commentaireRoutes from "./routes/commentaire.routes.js"; // Importation des routes commentaires
import adminRoutes from "./routes/admin.routes.js"; // Importation des routes admin
import roleRoutes from "./routes/role.routes.js"; // Importation des routes de gestion des rôles
import supersetRoutes from "./routes/superset.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "*", // ou mieux : ton domaine Vercel exact, ex: "https://ruthystore.vercel.app"
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "ngrok-skip-browser-warning",
    ],
  }),
);
app.use(express.json());

// Authentification
app.use("/api/auth", authRoutes);
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Le serveur du RAG est opérationnel avec LangChain",
  });
});
// AJOUT : Branchement de tes routes d'analyse IA sous le préfixe /api/agent
app.use("/api/agent", agentRoutes);
// AJOUT : Branchement de tes routes de génération de pdf
app.use("/api/pdf", pdfRoutes);
// Branchement des routes commentaires
app.use("/api/commentaires", commentaireRoutes);
// routes pour l'admin et la gestion des roles utilisateurs
app.use("/api/admin", adminRoutes);
app.use("/api/roles", roleRoutes);
// superset routes
app.use("api/dashboard/superset", supersetRoutes);

app.listen(PORT, async () => {
  console.log(`\nServeur backend démarré sur http://localhost:${PORT}`);
  console.log(
    "---------------------------------------------------------------",
  );
  // 1. Validation de la base vectorielle locale LanceDB
  try {
    console.log("Vérification de LanceDB...");
    await getLanceDB();
  } catch (err) {
    console.error("Échec du test d'architecture LanceDB !");
  }

  // 2. Validation de la connexion à qwen2.5:7b via LangChain
  try {
    // console.log("Test de connexion à qwen2.5:7b (via LangChain)...");
    console.log("Test de connexion à qwen2.5:7b (via LangChain)...");
    // Utilisation de la méthode invoke() standard de LangChain
    const response = await llm.invoke(
      'Dis simplement "Connexion Langchain - qwen2.5:7b OK" si tu reçois ce message.',
    );

    console.log(`Réponse de Ollama : ${response.content}`);

    console.log(
      "TOUS LES VOYANTS SONT AU VERT ! L'architecture LangChain est validée.",
    );
  } catch (err) {
    console.error("Échec de la connexion à qwen2.5:7b via LangChain.");
    console.error(err.message);
  }
});
