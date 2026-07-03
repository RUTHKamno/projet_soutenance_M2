-- Migration: Ajouter les colonnes report et chart_config à la table chat_messages
-- Date: 2026-07-02

-- Vérifier si les colonnes existent avant de les ajouter
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS report TEXT,
ADD COLUMN IF NOT EXISTS chart_config JSONB;

-- Créer un index sur chart_config pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_chat_messages_chart_config ON chat_messages USING GIN (chart_config);
