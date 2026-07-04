import dotenv from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

dotenv.config();

// Récupération de la clé depuis le .env
const geminiKey = process.env.GEMINI_API_KEY;

if (!geminiKey) {
  throw new Error(
    "La variable d'environnement GEMINI_API_KEY est manquante dans le fichier .env",
  );
}

// Initialisation du modèle de chat Gemini 2.5 Pro via LangChain
const llm = new ChatGoogleGenerativeAI({
  // model: "gemini-2.5-pro",
  model: "gemini-3.1-flash-lite",
  //   model: "gemini-3.1-pro-preview",
  // CRUCIAL : On force LangChain à utiliser l'argument 'apiKey' (ou 'googleApiKey')
  // pour écraser les variables fantômes de l'environnement global Windows.
  apiKey: geminiKey,
  googleApiKey: geminiKey, // On met les deux alias par sécurité selon les versions de LangChain
  temperature: 0,
});

export { llm };
