import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getLanceDB } from "./config/lancedb.js";
import { llm } from "./config/gemini.js"; // Notre instance LangChain
import agentRoutes from "./routes/agent.routes.js"; // 🆕 AJOUT : Importation de tes nouvelles routes
import pdfRoutes from "./routes/pdf.export.routes.js"; // 🆕 AJOUT : Importation de tes routes de génération de PDF
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

console.log(
  "Clé détectée par Node :",
  process.env.GEMINI_API_KEY
    ? process.env.GEMINI_API_KEY.substring(0, 10) + "..."
    : "AUCUNE CLÉ",
);
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Authentification
app.use("/api/auth", authRoutes);
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Le serveur du RAG est opérationnel avec LangChain",
  });
});
// 🆕 AJOUT : Branchement de tes routes d'analyse IA sous le préfixe /api/agent
app.use("/api/agent", agentRoutes);
// 🆕 AJOUT : Branchement de tes routes de génération de pdf
app.use("/api/pdf", pdfRoutes);

app.listen(PORT, async () => {
  console.log(`\n🚀 Serveur backend démarré sur http://localhost:${PORT}`);
  console.log(
    "----------------------------------------------------------------",
  );

  // 1. Validation de la base vectorielle locale LanceDB
  try {
    console.log("⏳ Vérification de LanceDB...");
    await getLanceDB();
  } catch (err) {
    console.error("🚨 Échec du test d'architecture LanceDB !");
  }

  // 2. Validation de la connexion à Gemini 3.1 Pro via LangChain
  try {
    console.log("⏳ Test de connexion à Gemini 3.1 Pro (via LangChain)...");

    // Utilisation de la méthode invoke() standard de LangChain
    const response = await llm.invoke(
      'Dis simplement "Connexion LangChain + Gemini OK" si tu reçois ce message.',
    );

    console.log(`🤖 Réponse de Gemini : ${response.content.trim()}`);
    console.log(
      "----------------------------------------------------------------",
    );
    console.log(
      "✅ TOUS LES VOYANTS SONT AU VERT ! L'architecture LangChain est validée.",
    );
  } catch (err) {
    console.error(
      "🚨 Échec de la connexion à Gemini via LangChain. Vérifie ta clé GEMINI_API_KEY.",
    );
    console.error(err.message);
  }
});
