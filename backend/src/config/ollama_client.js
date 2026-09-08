import dotenv from "dotenv";
import { ChatOllama } from "@langchain/ollama";

dotenv.config();

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://0.0.0.0:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b"; // à remplacer par le modèle de ton choix

const llm = new ChatOllama({
  baseUrl: OLLAMA_BASE_URL,
  model: OLLAMA_MODEL,
  temperature: 0,
});

export { llm };
