// ── Utilitaire d'extraction robuste ─────────────────────────────────────────
export function extractAgentOutput(result: any) {
  console.log("\n=======================================================");
  console.log("🔍 [extractAgentOutput] DEBUT DE L'EXTRACTION");
  console.log("=======================================================");
  console.log("📦 Structure du paramètre 'result' reçu :", {
    hasData: !!result?.data,
    hasMessages: !!result?.messages,
    hasDataMessages: !!result?.data?.messages,
    keys: Object.keys(result || {}),
  });

  // Gérer si result contient l'enveloppe .data ou pas (selon la provenance)
  const messages = result?.data?.messages ?? result?.messages ?? [];
  console.log(
    `💬 Nombre total de messages trouvés dans l'historique : ${messages.length}`,
  );

  const toolResults: Record<string, string[]> = {};
  let lastAISummary: string | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg) {
      console.log(`⚠️  [Index ${i}] Message null ou undefined, ignoré.`);
      continue;
    }

    // Détection robuste du type d'instance :
    const msgType =
      msg.type ??
      (typeof msg._getType === "function" ? msg._getType() : "") ??
      msg.constructor?.name ??
      "";

    const isToolMessage = msgType === "tool" || msgType === "ToolMessage";
    const isAIMessage = msgType === "ai" || msgType === "AIMessage";

    console.log(
      `\n--- 🔹 [Message ${i}/${messages.length - 1}] Type détecté: "${msgType}" ---`,
    );

    // --- Traitement des ToolMessages ---
    if (isToolMessage) {
      const name = msg.name;
      const content = msg.content;
      console.log(`🛠️  C'est un ToolMessage pour l'outil: "${name}"`);

      if (name && content !== undefined && content !== null) {
        if (!toolResults[name]) toolResults[name] = [];

        const stringContent =
          typeof content === "string" ? content : JSON.stringify(content);
        toolResults[name].push(stringContent);

        console.log(
          `   📌 Contenu de l'outil stocké (${toolResults[name].length}e occurrence pour cet outil).`,
        );
        console.log(
          `   📄 Extrait du contenu (50 prem. caractères) : "${stringContent.substring(0, 50)}..."`,
        );
      } else {
        console.log(
          `   ❌ Propriété 'name' manquante ou 'content' vide sur ce ToolMessage.`,
          { name, hasContent: !!content },
        );
      }
    }

    // --- Traitement des AIMessages (Synthèse Finale) ---
    if (isAIMessage) {
      const toolCalls = msg.tool_calls ?? [];
      const content = msg.content;
      console.log(
        `🤖 C'est un AIMessage. Nombre d'appels d'outil associés : ${toolCalls.length}`,
      );

      if (toolCalls && toolCalls.length > 0) {
        console.log(
          `   ⏩ Cet AIMessage appelle des outils (${toolCalls.map((tc: any) => tc.name).join(", ")}). Ce n'est pas le résumé final.`,
        );
      }

      // S'il n'y a aucun appel d'outil, c'est l'AIMessage de conclusion textuelle
      if (!toolCalls || toolCalls.length === 0) {
        console.log(
          `   🎯 AIMessage sans outil. Analyse pour le résumé final...`,
        );

        if (typeof content === "string" && content.trim().length > 0) {
          lastAISummary = content;
          console.log(
            `   ✅ Résumé textuel extrait (String) : "${lastAISummary.substring(0, 60)}..."`,
          );
        } else if (Array.isArray(content)) {
          console.log(
            `   📋 Le contenu de l'AIMessage est un tableau (Array de blocs). Recherche du bloc textuel...`,
          );

          const textBlock = content.find(
            (block: any) => block.type === "text" || typeof block === "string",
          );

          if (textBlock) {
            const textValue =
              typeof textBlock === "string" ? textBlock : textBlock.text;

            if (textValue && textValue.trim().length > 0) {
              lastAISummary = textValue;
              console.log(
                `   ✅ Résumé textuel extrait depuis le bloc Array : "${lastAISummary?.substring(0, 60)}..."`,
              );
            } else {
              console.log(
                `   ❌ Le bloc textuel trouvé dans le tableau était vide.`,
              );
            }
          } else {
            console.log(
              `   ❌ Aucun bloc de type 'text' ou string trouvé dans le tableau.`,
            );
          }
        } else {
          console.log(
            `   ❌ Format de 'content' non géré ou vide pour le résumé final.`,
            typeof content,
          );
        }
      }
    }
  }

  console.log("\n-------------------------------------------------------");
  console.log("🎯 ANALYSE FINALE DES REQUÊTES EXTRAITES");
  console.log("-------------------------------------------------------");

  // ── Extraction sécurisée de la configuration ECharts (tool_generate_chart) ──
  const chartRaw = toolResults["tool_generate_chart"]?.at(-1);
  let chartConfig = null;

  console.log(
    `📊 Recherche de 'tool_generate_chart' :`,
    chartRaw ? "Trouvé ! ✅" : "Non trouvé... ❌",
  );

  if (chartRaw) {
    console.log(
      `   ⚙️ Nettoyage et extraction Regex sur la config graphique brute (Taille: ${chartRaw.length} chars)...`,
    );

    // Capture de tout ce qui réside à l'intérieur des balises de sécurité XML
    const chartRegex = /<tool_generate_chart>([\s\S]*?)<\/tool_generate_chart>/;
    const match = chartRaw.match(chartRegex);
    let cleanChartContent = match ? match[1].trim() : chartRaw.trim();

    try {
      chartConfig = JSON.parse(cleanChartContent);
      console.log("   ✅ Parsing JSON réussi ! L'objet chartConfig est prêt.");
    } catch (parseError: any) {
      console.error(
        "   💥 ÉCHEC DU PARSING JSON initial du graphique. Erreur :",
        parseError.message,
      );

      // Plan B : Le modèle a imbriqué un bloc Markdown ```json ... ``` dans le XML
      if (cleanChartContent.includes("```")) {
        console.log(
          "   ⚠️ Détection de blocs Markdown (```). Tentative de nettoyage secondaire...",
        );
        try {
          const markdownClean = cleanChartContent
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          chartConfig = JSON.parse(markdownClean);
          console.log(
            "   ✅ Sauvetage réussi ! JSON extrait du bloc Markdown.",
          );
        } catch (markdownError: any) {
          console.error(
            "   💥 Échec du plan de secours Markdown :",
            markdownError.message,
          );
          chartConfig = null;
        }
      } else {
        console.log(
          "   📄 Contenu nettoyé en échec de parsing :\n",
          cleanChartContent,
        );
        chartConfig = null;
      }
    }
  }

  // ── Extraction sécurisée du rapport (tool_write_report) ──
  const reportRaw = toolResults["tool_write_report"]?.at(-1);
  let report = null;

  console.log(
    `📝 Recherche de 'tool_write_report' :`,
    reportRaw ? "Trouvé ! ✅" : "Non trouvé... ❌",
  );

  if (reportRaw) {
    console.log(
      `   ⚙️ Nettoyage et extraction Regex sur le contenu du rapport...`,
    );
    const reportRegex = /<tool_write_report>([\s\S]*?)<\/tool_write_report>/;
    const reportMatch = reportRaw.match(reportRegex);
    report = reportMatch ? reportMatch[1].trim() : reportRaw.trim();
  }

  const finalOutput = {
    summary: lastAISummary,
    chartConfig,
    report,
    reformulatedQuestion:
      result?.data?.reformulatedQuestion ??
      result?.reformulatedQuestion ??
      null,
    userQuestion: result?.data?.userQuestion ?? result?.userQuestion ?? null,
  };

  console.log("\n=======================================================");
  console.log(
    "🚀 [extractAgentOutput] FIN DE L'EXTRACTION. RÉSULTAT RENVOYÉ :",
  );
  console.log(
    JSON.stringify(
      {
        summaryLength: finalOutput.summary ? finalOutput.summary.length : 0,
        hasChartConfig: finalOutput.chartConfig !== null,
        hasReport: finalOutput.report !== null,
        reformulatedQuestion: finalOutput.reformulatedQuestion,
      },
      null,
      2,
    ),
  );
  console.log("=======================================================\n");

  return finalOutput;
}
