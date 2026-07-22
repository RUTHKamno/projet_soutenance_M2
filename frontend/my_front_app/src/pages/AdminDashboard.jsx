import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import * as echarts from "echarts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { adminApi } from "../api/adminApi";
import "../styles/Admin/AdminDashboard.css";

const emptyUserForm = {
  email: "",
  first_name: "",
  last_name: "",
  role: "",
  agence: "",
};

const emptyRoleForm = { name: "", label: "", description: "" };

const TOAST_DURATION_MS = 1600;

const formatPeriodLabel = (period, granularity) => {
  const d = new Date(period);
  if (granularity === "day") {
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  }
  if (granularity === "month") {
    return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
  }
  return `${d.getFullYear()}`;
};

const EXPORT_COLUMNS = [
  { header: "Nom", get: (u) => `${u.first_name} ${u.last_name}` },
  { header: "Email", get: (u) => u.email },
  { header: "Rôle", get: (u) => u.role },
  { header: "Agence", get: (u) => u.agence || "—" },
  { header: "Statut", get: (u) => (u.is_active ? "Actif" : "Désactivé") },
  { header: "En ligne", get: (u) => (u.is_online ? "Oui" : "Non") },
  { header: "Connexions", get: (u) => u.total_logins },
  {
    header: "Dernière connexion",
    get: (u) =>
      u.last_login_at
        ? new Date(u.last_login_at).toLocaleString("fr-FR")
        : "Jamais",
  },
];

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);

  const [kpis, setKpis] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [comments, setComments] = useState([]);
  const [selectedComment, setSelectedComment] = useState(null);
  const [granularity, setGranularity] = useState("day");
  const [evolutionData, setEvolutionData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Modale création/édition utilisateur
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [savingUser, setSavingUser] = useState(false);

  // Modale création/édition rôle
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [savingRole, setSavingRole] = useState(false);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // ── Toasts ───────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  // ── Chargement des données ────────────────────────────────────────────
  const loadKpis = useCallback(
    async (userId) => setKpis(await adminApi.getKpis(userId || undefined)),
    [],
  );
  const loadUsers = useCallback(
    async () => setUsers(await adminApi.getUsersWithStatus()),
    [],
  );
  const loadRoles = useCallback(
    async () => setRoles(await adminApi.getRoles()),
    [],
  );
  const loadComments = useCallback(
    async () => setComments(await adminApi.getAllComments()),
    [],
  );
  const loadEvolution = useCallback(
    async (g, userId) =>
      setEvolutionData(
        await adminApi.getConnectionsEvolution(g, userId || undefined),
      ),
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadKpis(),
          loadUsers(),
          loadRoles(),
          loadComments(),
          loadEvolution(granularity),
        ]);
      } catch (e) {
        setError(e.message || "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    })();
    // Rafraîchit le statut en ligne toutes les 30s sans recharger toute la page
    const interval = setInterval(loadUsers, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recharge KPIs + évolution quand la granularité OU le filtre utilisateur change
  useEffect(() => {
    loadKpis(selectedUserId).catch((e) => setError(e.message));
    loadEvolution(granularity, selectedUserId).catch((e) =>
      setError(e.message),
    );
  }, [granularity, selectedUserId, loadKpis, loadEvolution]);

  // ── Graphique d'évolution — LINE CHART avec drill-down ────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    if (evolutionData.length === 0) {
      chartInstance.current.clear();
      return;
    }

    const labels = evolutionData.map((d) =>
      formatPeriodLabel(d.period, granularity),
    );
    const values = evolutionData.map((d) => Number(d.active_users));

    chartInstance.current.setOption({
      grid: { left: 40, right: 20, top: 30, bottom: 30 },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#e5e0c8" } },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#f2f0e4" } },
      },
      series: [
        {
          type: "line",
          data: values,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { color: "#8a7e03", width: 3 },
          itemStyle: { color: "#8a7e03" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(138,126,3,0.25)" },
                { offset: 1, color: "rgba(138,126,3,0.02)" },
              ],
            },
          },
        },
      ],
    });

    const onResize = () => chartInstance.current?.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [evolutionData, granularity]);

  // ── Filtre utilisateur (clic sur une ligne) ────────────────────────────
  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId],
  );

  const handleSelectUserFilter = (id) => {
    setSelectedUserId((prev) => (prev === id ? null : id));
  };

  // ── Recherche ───────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const q = searchTerm.trim().toLowerCase();
    return users.filter(
      (u) =>
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.agence || "").toLowerCase().includes(q),
    );
  }, [users, searchTerm]);

  // ── Export Excel / PDF ──────────────────────────────────────────────────
  const handleExportExcel = () => {
    const rows = filteredUsers.map((u) =>
      EXPORT_COLUMNS.reduce((acc, col) => {
        acc[col.header] = col.get(u);
        return acc;
      }, {}),
    );
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Utilisateurs");
    XLSX.writeFile(workbook, `utilisateurs_ruthystore_${Date.now()}.xlsx`);
    showToast("Export Excel généré.");
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Liste des utilisateurs — RuthyStore BI", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [EXPORT_COLUMNS.map((c) => c.header)],
      body: filteredUsers.map((u) =>
        EXPORT_COLUMNS.map((c) => String(c.get(u))),
      ),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [138, 126, 3] },
    });
    doc.save(`utilisateurs_ruthystore_${Date.now()}.pdf`);
    showToast("Export PDF généré.");
  };

  // ── Actions utilisateurs ───────────────────────────────────────────────
  const openCreateUser = () => {
    setEditingUserId(null);
    setUserForm({ ...emptyUserForm, role: roles[0]?.name || "" });
    setShowUserModal(true);
  };

  const openEditUser = (u) => {
    setEditingUserId(u.id);
    setUserForm({
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
      agence: u.agence || "",
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    setError("");
    try {
      if (editingUserId) {
        await adminApi.updateUser(editingUserId, {
          first_name: userForm.first_name,
          last_name: userForm.last_name,
          role: userForm.role,
          agence: userForm.agence || null,
        });
        showToast("Utilisateur mis à jour.");
      } else {
        await adminApi.createUser({
          email: userForm.email,
          first_name: userForm.first_name,
          last_name: userForm.last_name,
          role: userForm.role,
          agence: userForm.agence || null,
        });
        showToast("Utilisateur créé.");
      }
      setShowUserModal(false);
      await loadUsers();
    } catch (e) {
      setError(e.message);
      showToast(e.message || "Erreur.", "error");
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      if (u.is_active) {
        await adminApi.deactivateUser(u.id);
        showToast("Utilisateur désactivé.");
      } else {
        await adminApi.reactivateUser(u.id);
        showToast("Utilisateur réactivé.");
      }
      await loadUsers();
    } catch (e) {
      setError(e.message);
      showToast(e.message || "Erreur.", "error");
    }
  };

  // ── Actions rôles ───────────────────────────────────────────────────────
  const openCreateRole = () => {
    setEditingRoleId(null);
    setRoleForm(emptyRoleForm);
    setShowRoleModal(true);
  };

  const openEditRole = (r) => {
    setEditingRoleId(r.id);
    setRoleForm({
      name: r.name,
      label: r.label || "",
      description: r.description || "",
    });
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    setSavingRole(true);
    setError("");
    try {
      if (editingRoleId) {
        await adminApi.updateRole(editingRoleId, {
          label: roleForm.label,
          description: roleForm.description,
        });
        showToast("Rôle mis à jour.");
      } else {
        await adminApi.createRole(roleForm);
        showToast("Rôle créé.");
      }
      setShowRoleModal(false);
      await loadRoles();
    } catch (e) {
      setError(e.message);
      showToast(e.message || "Erreur.", "error");
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (r) => {
    if (!window.confirm(`Supprimer le rôle "${r.label || r.name}" ?`)) return;
    try {
      await adminApi.deleteRole(r.id);
      showToast("Rôle supprimé.");
      await loadRoles();
    } catch (e) {
      setError(e.message);
      showToast(e.message || "Erreur.", "error");
    }
  };

  // ── Actions commentaires ─────────────────────────────────────────────────
  const handleToggleCommentStatus = async (c) => {
    const nextStatus = c.statut === "approved" ? "not_approved" : "approved";
    try {
      await adminApi.updateCommentStatus(c.id, nextStatus);
      showToast(
        nextStatus === "approved"
          ? "Commentaire réactivé."
          : "Commentaire désactivé.",
      );
      await loadComments();
      setSelectedComment((prev) =>
        prev && prev.id === c.id ? { ...prev, statut: nextStatus } : prev,
      );
    } catch (e) {
      setError(e.message);
      showToast(e.message || "Erreur.", "error");
    }
  };

  const renderStars = (note) =>
    "★".repeat(note) + "☆".repeat(Math.max(0, 5 - note));

  if (loading) {
    return <div className="admin-loading">Chargement du dashboard admin…</div>;
  }

  const scope = kpis?.scope || "global";
  const onlineCount = users.filter((u) => u.is_online).length;

  return (
    <div className="admin-dashboard">
      {/* ── Toasts ── */}
      <div className="admin-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`admin-toast admin-toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>

      <div className="admin-header">
        <h1 className="admin-title">Dashboard Administrateur</h1>
        <p className="admin-subtitle">
          Adoption, utilisation réelle et gestion des accès
        </p>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {selectedUser && (
        <div className="admin-filter-banner">
          Filtré sur{" "}
          <strong>
            {selectedUser.first_name} {selectedUser.last_name}
          </strong>
          <button type="button" onClick={() => setSelectedUserId(null)}>
            Réinitialiser
          </button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <span className="admin-kpi-label">
            {scope === "user" ? "Connexions totales" : "Connexions moy. / jour"}
          </span>
          <span className="admin-kpi-value">
            {scope === "user"
              ? (kpis?.totalLogins ?? "—")
              : (kpis?.avgLoginsPerDay?.toFixed(1) ?? "—")}
          </span>
          <span className="admin-kpi-sub">
            {scope === "user"
              ? "Utilisateur sélectionné"
              : "Utilisateurs non-techniciens · 30 derniers jours"}
          </span>
        </div>

        <div className="admin-kpi-card">
          <span className="admin-kpi-label">Sessions de chat</span>
          <span className="admin-kpi-value">
            {kpis?.totalChatSessions ?? "—"}
          </span>
          <span className="admin-kpi-sub">
            {scope === "user"
              ? "Sessions engagées par cet utilisateur"
              : "Total des sessions engagées, tous utilisateurs"}
          </span>
        </div>

        <div className="admin-kpi-card">
          <span className="admin-kpi-label">Questions IA / session</span>
          <span className="admin-kpi-value">
            {kpis?.questionsIndicatorAvailable
              ? kpis.avgQuestionsPerSession?.toFixed(1)
              : "—"}
          </span>
          <span className="admin-kpi-sub">
            {kpis?.questionsIndicatorAvailable
              ? scope === "user"
                ? `${kpis.totalMessages ?? 0} messages envoyés au total`
                : "Moyenne sur toutes les sessions"
              : "Schéma chat à confirmer"}
          </span>
        </div>

        <div className="admin-kpi-card">
          <span className="admin-kpi-label">
            {scope === "user" ? "Statut" : "En ligne maintenant"}
          </span>
          <span className="admin-kpi-value">
            {scope === "user"
              ? selectedUser?.is_online
                ? "En ligne"
                : "Hors ligne"
              : onlineCount}
          </span>
          <span className="admin-kpi-sub">
            {scope === "user"
              ? kpis?.lastLoginAt
                ? `Dernière connexion : ${new Date(kpis.lastLoginAt).toLocaleString("fr-FR")}`
                : "Jamais connecté"
              : `sur ${users.length} utilisateurs enregistrés`}
          </span>
        </div>
      </div>

      {/* ── Évolution des connexions (drill-down, lineplot) ── */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2>Évolution des connexions</h2>
          <div className="admin-granularity-toggle">
            {["day", "month", "year"].map((g) => (
              <button
                key={g}
                type="button"
                className={granularity === g ? "active" : ""}
                onClick={() => setGranularity(g)}
              >
                {g === "day" ? "Jour" : g === "month" ? "Mois" : "Année"}
              </button>
            ))}
          </div>
        </div>
        <div ref={chartRef} className="admin-chart" />
      </div>

      {/* ── Table utilisateurs ── */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2>Utilisateurs enregistrés</h2>
          <div className="admin-users-toolbar">
            <input
              type="text"
              className="admin-search-input"
              placeholder="Rechercher (nom, email, rôle, agence)…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="button"
              className="admin-export-btn"
              onClick={handleExportExcel}
            >
              Export Excel
            </button>
            <button
              type="button"
              className="admin-export-btn"
              onClick={handleExportPdf}
            >
              Export PDF
            </button>
            <button
              type="button"
              className="admin-add-btn"
              onClick={openCreateUser}
            >
              + Ajouter un utilisateur
            </button>
          </div>
        </div>
        <p className="admin-table-hint">
          Clique sur une ligne pour filtrer les indicateurs ci-dessus sur cet
          utilisateur.
        </p>
        <div className="admin-table-wrapper">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th></th>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Agence</th>
                <th>Dernière connexion</th>
                <th>Connexions</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  className={
                    selectedUserId === u.id ? "admin-row-selected" : ""
                  }
                  onClick={() => handleSelectUserFilter(u.id)}
                >
                  <td>
                    <span
                      className={`admin-status-dot ${u.is_online ? "online" : "offline"}`}
                      title={u.is_online ? "En ligne" : "Hors ligne"}
                    />
                  </td>
                  <td>
                    {u.first_name} {u.last_name}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className="admin-role-pill">{u.role}</span>
                  </td>
                  <td>{u.agence || "—"}</td>
                  <td>
                    {u.last_login_at
                      ? new Date(u.last_login_at).toLocaleString("fr-FR")
                      : "Jamais"}
                  </td>
                  <td>{u.total_logins}</td>
                  <td>
                    <span
                      className={`admin-badge ${u.is_active ? "active" : "inactive"}`}
                    >
                      {u.is_active ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td
                    className="admin-row-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button type="button" onClick={() => openEditUser(u)}>
                      Modifier
                    </button>
                    <button type="button" onClick={() => handleToggleActive(u)}>
                      {u.is_active ? "Désactiver" : "Réactiver"}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="admin-empty-row">
                    Aucun utilisateur ne correspond à cette recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Gestion des rôles ── */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2>Gestion des rôles</h2>
          <button
            type="button"
            className="admin-add-btn"
            onClick={openCreateRole}
          >
            + Nouveau rôle
          </button>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Rôle</th>
                <th>Nom technique</th>
                <th>Description</th>
                <th>Utilisateurs</th>
                <th>Type</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>{r.label || r.name}</td>
                  <td>
                    <code>{r.name}</code>
                  </td>
                  <td>{r.description || "—"}</td>
                  <td>{r.users_count}</td>
                  <td>
                    <span
                      className={`admin-badge ${r.is_system ? "inactive" : "active"}`}
                    >
                      {r.is_system ? "Système" : "Personnalisé"}
                    </span>
                  </td>
                  <td className="admin-row-actions">
                    <button type="button" onClick={() => openEditRole(r)}>
                      Modifier
                    </button>
                    <button
                      type="button"
                      disabled={r.is_system || r.users_count > 0}
                      onClick={() => handleDeleteRole(r)}
                      title={
                        r.is_system
                          ? "Rôle système, non supprimable"
                          : r.users_count > 0
                            ? "Encore utilisé par des utilisateurs"
                            : ""
                      }
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Commentaires & Notations ── */}
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2>Commentaires &amp; Notations</h2>
          <span className="admin-panel-subtitle">
            Seuls les commentaires "Approuvé" apparaissent sur la page À propos
          </span>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Auteur</th>
                <th>Email</th>
                <th>Note</th>
                <th>Commentaire</th>
                <th>Date</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr
                  key={c.id}
                  className="admin-clickable-row"
                  onClick={() => setSelectedComment(c)}
                >
                  <td>{c.nom}</td>
                  <td>{c.email || "—"}</td>
                  <td className="admin-stars" title={`${c.note} / 5`}>
                    {renderStars(c.note)}
                  </td>
                  <td className="admin-comment-cell">{c.commentaire}</td>
                  <td>{new Date(c.created_at).toLocaleString("fr-FR")}</td>
                  <td>
                    <span
                      className={`admin-badge ${c.statut === "approved" ? "active" : "inactive"}`}
                    >
                      {c.statut === "approved" ? "Approuvé" : "Désactivé"}
                    </span>
                  </td>
                  <td
                    className="admin-row-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleCommentStatus(c)}
                    >
                      {c.statut === "approved" ? "Désactiver" : "Réactiver"}
                    </button>
                  </td>
                </tr>
              ))}
              {comments.length === 0 && (
                <tr>
                  <td colSpan={7} className="admin-empty-row">
                    Aucun commentaire pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modale détail commentaire ── */}
      {selectedComment && (
        <div
          className="admin-modal-overlay"
          onClick={() => setSelectedComment(null)}
        >
          <div
            className="admin-modal admin-comment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-comment-modal-header">
              <h3>{selectedComment.nom}</h3>
              <span
                className={`admin-badge ${selectedComment.statut === "approved" ? "active" : "inactive"}`}
              >
                {selectedComment.statut === "approved"
                  ? "Approuvé"
                  : "Désactivé"}
              </span>
            </div>

            <p className="admin-comment-modal-meta">
              {selectedComment.email || "Email non renseigné"} ·{" "}
              {new Date(selectedComment.created_at).toLocaleString("fr-FR")}
            </p>

            <div
              className="admin-stars admin-comment-modal-stars"
              title={`${selectedComment.note} / 5`}
            >
              {renderStars(selectedComment.note)}
            </div>

            <p className="admin-comment-modal-body">
              {selectedComment.commentaire}
            </p>

            <div className="admin-modal-actions">
              <button type="button" onClick={() => setSelectedComment(null)}>
                Fermer
              </button>
              <button
                type="button"
                className={
                  selectedComment.statut === "approved"
                    ? "admin-comment-deactivate-btn"
                    : "admin-comment-reactivate-btn"
                }
                onClick={() => handleToggleCommentStatus(selectedComment)}
              >
                {selectedComment.statut === "approved"
                  ? "Désactiver"
                  : "Réactiver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale utilisateur ── */}
      {showUserModal && (
        <div
          className="admin-modal-overlay"
          onClick={() => setShowUserModal(false)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {editingUserId ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            </h3>
            <form onSubmit={handleSaveUser} className="admin-modal-form">
              <input
                required
                type="email"
                placeholder="Email"
                value={userForm.email}
                disabled={!!editingUserId}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
              />
              <input
                required
                placeholder="Prénom"
                value={userForm.first_name}
                onChange={(e) =>
                  setUserForm({ ...userForm, first_name: e.target.value })
                }
              />
              <input
                required
                placeholder="Nom"
                value={userForm.last_name}
                onChange={(e) =>
                  setUserForm({ ...userForm, last_name: e.target.value })
                }
              />
              <select
                required
                value={userForm.role}
                onChange={(e) =>
                  setUserForm({ ...userForm, role: e.target.value })
                }
              >
                <option value="" disabled>
                  Sélectionner un rôle
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.label || r.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Agence (optionnel)"
                value={userForm.agence}
                onChange={(e) =>
                  setUserForm({ ...userForm, agence: e.target.value })
                }
              />
              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowUserModal(false)}>
                  Annuler
                </button>
                <button type="submit" disabled={savingUser}>
                  {savingUser
                    ? "Enregistrement…"
                    : editingUserId
                      ? "Enregistrer"
                      : "Créer"}
                </button>
              </div>
              {!editingUserId && (
                <p className="admin-modal-hint">
                  Un mot de passe par défaut sera généré ; l'utilisateur devra
                  le changer à la première connexion.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── Modale rôle ── */}
      {showRoleModal && (
        <div
          className="admin-modal-overlay"
          onClick={() => setShowRoleModal(false)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingRoleId ? "Modifier le rôle" : "Nouveau rôle"}</h3>
            <form onSubmit={handleSaveRole} className="admin-modal-form">
              <input
                required
                placeholder="Nom technique (ex: analyste_credit)"
                value={roleForm.name}
                disabled={!!editingRoleId}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, name: e.target.value })
                }
              />
              <input
                placeholder="Libellé affiché (ex: Analyste Crédit)"
                value={roleForm.label}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, label: e.target.value })
                }
              />
              <textarea
                placeholder="Description (optionnel)"
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, description: e.target.value })
                }
              />
              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowRoleModal(false)}>
                  Annuler
                </button>
                <button type="submit" disabled={savingRole}>
                  {savingRole
                    ? "Enregistrement…"
                    : editingRoleId
                      ? "Enregistrer"
                      : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
