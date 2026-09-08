import { ChatOllama } from "@langchain/ollama";

async function testModel() {
  console.log("⏳ Connexion au modèle Ollama local...");

  const llm = new ChatOllama({
    baseUrl: "http://localhost:11434", // Adresse par défaut d'Ollama
    model: "qwen2.5-coder:7b", // Remplace par le nom exact de ton modèle
    temperature: 0.1,
  });

  try {
    const response = await llm.invoke(
      "Dis 'Bonjour ! Le modèle est opérationnel.' en français.",
    );
    console.log("✅ Réponse du modèle :");
    console.log(response.content);
  } catch (error) {
    console.error("❌ Erreur lors du test Ollama :", error);
  }
}

testModel();
