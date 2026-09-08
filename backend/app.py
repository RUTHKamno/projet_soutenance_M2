from dotenv import load_dotenv
load_dotenv()

import os
import time  # ⏱️ Ajout de l'import pour mesurer le temps
import httpx # ⏱️ Ajout de l'import pour configurer le Timeout d'Ollama
import json  # 📦 Import pour lire vos fichiers DWH et RBAC

# All imports at the top
from vanna import Agent
from vanna.core.registry import ToolRegistry
from vanna.core.user import UserResolver, User, RequestContext
from vanna.tools import RunSqlTool, VisualizeDataTool
from vanna.tools.agent_memory import SaveQuestionToolArgsTool, SearchSavedCorrectToolUsesTool, SaveTextMemoryTool
from vanna.servers.fastapi import VannaFastAPIServer
from vanna.integrations.ollama import OllamaLlmService
from vanna.integrations.postgres import PostgresRunner
from vanna.integrations.chromadb import ChromaAgentMemory
from vanna.core.tool import ToolContext

# Configuration de la chaîne de connexion PostgreSQL via les variables d'environnement
db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "5432")
db_name = os.getenv("DB_NAME", "votre_base_de_donnees") 
db_user = os.getenv("DB_USER", "votre_utilisateur")
db_pass = os.getenv("DB_PASSWORD", "votre_mot_de_passe")

connection_string = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

# Configure your agent memory
agent_memory = ChromaAgentMemory(
    collection_name="vanna_memory",
    persist_directory="./chroma_db"
)

# Test de connexion au démarrage 
try:
    runner_test = PostgresRunner(connection_string=connection_string)
    
    valid_context = ToolContext(
        user=User(id="system", email="system@local", group_memberships=["admin"]),
        conversation_id="init-session",
        request_id="init-req",
        agent_memory=agent_memory
    )
    
    runner_test.run_sql("SELECT 1;", context=valid_context)
    print(f"[Pool] ✅ Connexion OK → host: {db_host}, db: {db_name}")
except Exception as err:
    print(f"[Pool] ❌ Connexion échouée → host: {db_host}, user: {db_user}")
    print(f"[Pool] ❌ Détail : {str(err)}")


# 🔧 MODIFICATION ICI : timeout=None évite que httpx ne coupe la connexion si Qwen prend du temps à réfléchir
ollama_client = httpx.Client(timeout=httpx.Timeout(None, connect=10.0))

# =========================================================================
# 🛠️ CORRECTIF : Service Ollama Personnalisé Sans Bug de Sérialisation
# =========================================================================
import ollama

class FixedOllamaLlmService(OllamaLlmService):
    def __init__(self, model: str, host: str = "http://localhost:11434"):
        # On initialise la classe mère normalement
        super().__init__(model=model, host=host)
        # On force la réinitialisation d'un client Ollama propre avec timeout désactivé
        # afin d'éviter les déconnexions et les bugs d'objets HTTPX non sérialisables
        self.ollama_client = ollama.Client(
            host=host, 
            timeout=httpx.Timeout(None, connect=15.0)
        )

    def generate_sql(self, question: str, context: ToolContext = None) -> str:
        # Cette méthode intercepte la génération pour s'assurer qu'aucun objet 
        # complexe caché n'est envoyé dans les kwargs de la requête JSON
        try:
            return super().generate_sql(question, context=context)
        except TypeError as e:
            if "Client is not JSON serializable" in str(e):
                # Si le bug de dictionnaire survient, on force un appel direct et épuré
                prompt = self.get_sql_prompt(question, context=context)
                response = self.ollama_client.generate(model=self.model, prompt=prompt)
                return response.get('response', '')
            raise e

# Utilisation du service corrigé
llm = FixedOllamaLlmService(
    model="qwen2.5:3b",
    host="http://localhost:11434"
)
# =========================================================================
# Configure your database
db_tool = RunSqlTool(
    sql_runner=PostgresRunner(
        connection_string=connection_string
    )
)

# Configure user authentication
class SimpleUserResolver(UserResolver):
    async def resolve_user(self, request_context: RequestContext) -> User:
        user_email = request_context.get_cookie('vanna_email') or 'guest@example.com'
        group = 'admin' if user_email == 'admin@example.com' else 'user'
        return User(id=user_email, email=user_email, group_memberships=[group])

user_resolver = SimpleUserResolver()

# Create your agent
tools = ToolRegistry()
tools.register_local_tool(db_tool, access_groups=['admin', 'user'])
tools.register_local_tool(SaveQuestionToolArgsTool(), access_groups=['admin'])
tools.register_local_tool(SearchSavedCorrectToolUsesTool(), access_groups=['admin', 'user'])
tools.register_local_tool(SaveTextMemoryTool(), access_groups=['admin', 'user'])
tools.register_local_tool(VisualizeDataTool(), access_groups=['admin', 'user'])


# ⏱️ CONFIGURATION DU CHRONOMÈTRE : Suivi du temps de réponse de l'Agent
class PerformanceTrackingAgent(Agent):
    def ask(self, question: str, context: RequestContext = None):
        start_time = time.time()
        print(f"\n🤖 [Agent] Traitement de la question : '{question}'...")
        
        result = super().ask(question, context=context)
        
        end_time = time.time()
        execution_time = end_time - start_time
        print(f"⏱️ [Performance] Temps de réponse de l'Agent : {execution_time:.2f} secondes\n")
        
        return result

# On instancie notre agent personnalisé
agent = PerformanceTrackingAgent(
    llm_service=llm,
    tool_registry=tools,
    user_resolver=user_resolver,
    agent_memory=agent_memory
)


# =========================================================================
# 📥 AJOUT DE VOTRE FONCTION ET DE L'APPEL JUSTE ICI
# =========================================================================
def entrainer_contexte_dwh(chemin_metadata="metadonnees.json", chemin_rbac="rbac.json"):
    print("\n🧠 [Entraînement] Vérification et indexation granulaire...")
    
    system_context = ToolContext(
        user=User(id="system", email="system@local", group_memberships=["admin"]),
        conversation_id="initial-training",
        request_id="training-req",
        agent_memory=agent_memory
    )
    
    # Étape 1 : Indexation intelligente des métadonnées
    if os.path.exists(chemin_metadata):
        try:
            with open(chemin_metadata, 'r', encoding='utf-8') as f:
                metadata_content = json.load(f)
            
            if isinstance(metadata_content, dict) and "tables" in metadata_content:
                items = metadata_content["tables"]
            elif isinstance(metadata_content, list):
                items = metadata_content
            else:
                items = [{k: v} for k, v in metadata_content.items()]

            print(f"📦 Découpage du fichier métadonnées en {len(items)} segments...")
            for i, item in enumerate(items):
                texte_chunk = f"DWH METADATA (Segment {i+1}) :\n{json.dumps(item, indent=2, ensure_ascii=False)}"
                agent_memory.save_text_memory(content=texte_chunk, context=system_context)
            
            print("✅ [Entraînement] Structure du DWH segmentée et apprise.")
        except Exception as e:
            print(f"❌ [Entraînement] Erreur Métadonnées : {str(e)}")

    # Étape 2 : Indexation intelligente des règles RBAC
    if os.path.exists(chemin_rbac):
        try:
            with open(chemin_rbac, 'r', encoding='utf-8') as f:
                rbac_content = json.load(f)
            
            if isinstance(rbac_content, list):
                rbac_items = rbac_content
            elif isinstance(rbac_content, dict) and "roles" in rbac_content:
                rbac_items = rbac_content["roles"]
            else:
                rbac_items = [{k: v} for k, v in rbac_content.items()]
                
            for j, rbac_item in enumerate(rbac_items):
                texte_rbac_chunk = f"RBAC SECURITY RULE (Segment {j+1}) :\n{json.dumps(rbac_item, indent=2, ensure_ascii=False)}"
                agent_memory.save_text_memory(content=texte_rbac_chunk, context=system_context)
                
            print("✅ [Entraînement] Règles RBAC segmentées et apprises.")
        except Exception as e:
            print(f"❌ [Entraînement] Erreur RBAC : {str(e)}")

# Lancement de l'apprentissage
entrainer_contexte_dwh("metadonnees.json", "rbac.json")
# =========================================================================


# Run the server
server = VannaFastAPIServer(agent)
if __name__ == "__main__":
    server.run()  # Access at http://localhost:8000