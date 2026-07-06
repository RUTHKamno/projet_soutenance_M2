import { useState, useEffect, useCallback } from "react";
import { fetchCommentaires, postCommentaire } from "../api/commentaireApi";

export const useCommentaires = () => {
  const [commentaires, setCommentaires] = useState([]);
  const [stats, setStats] = useState({ moyenne: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCommentaires = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCommentaires();
      setCommentaires(data.commentaires);
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCommentaires();
  }, [loadCommentaires]);

  const submitCommentaire = async (formData) => {
    setSubmitting(true);
    setError(null);
    try {
      await postCommentaire(formData);
      await loadCommentaires();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { commentaires, stats, loading, error, submitting, submitCommentaire };
};
