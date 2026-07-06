import React from "react";
import AboutHero from "../components/about/AboutHero";
import AboutContact from "../components/about/AboutContact";
import CommentForm from "../components/about/CommentForm";
import CommentsList from "../components/about/CommentsList";
import { useCommentaires } from "../hooks/useCommentaires";
import "../styles/About/AProposPage.css";

const AProposPage = () => {
  const { commentaires, stats, loading, error, submitting, submitCommentaire } =
    useCommentaires();

  return (
    <div className="a-propos-page">
      <AboutHero />
      <AboutContact />
      <div className="a-propos-content">
        <CommentForm onSubmit={submitCommentaire} submitting={submitting} />
        {error && <p className="a-propos-error">{error}</p>}
        <CommentsList
          commentaires={commentaires}
          stats={stats}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default AProposPage;
