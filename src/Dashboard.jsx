import { useState, useEffect, useCallback } from "react";

const CATEGORIES = ["Boulot", "Side Job", "Pyrénées", "Travaux Maison", "Finances"];
const STATUSES = ["À commencer", "En cours", "Bloqué", "Terminé"];
const PRIORITIES = ["Basse", "Moyenne", "Haute"];
const PRIORITY_DOTS = { "Basse": "#A0AEC0", "Moyenne": "#ECC94B", "Haute": "#E53E3E" };
const CATEGORY_COLORS = {
  "Boulot": { accent: "#4A5568" },
  "Side Job": { accent: "#C05621" },
  "Pyrénées": { accent: "#276749" },
  "Travaux Maison": { accent: "#97266D" },
  "Finances": { accent: "#975A16" },
};
const STATUS_COLORS = {
  "À commencer": { bg: "#E2E8F0", text: "#4A5568" },
  "En cours": { bg: "#BEE3F8", text: "#2B6CB0" },
  "Bloqué": { bg: "#FED7D7", text: "#C53030" },
  "Terminé": { bg: "#C6F6D5", text: "#276749" },
};
const DEFAULT_PROJECTS = [
  { id: 1, name: "Rédaction Business Plan", status: "En cours", categories: ["Side Job"], priority: "Haute", deadline: "2026-04-15", budgetEstime: null, budgetReel: null },
  { id: 2, name: "Maquette landing page", status: "À commencer", categories: ["Side Job"], priority: "Moyenne", deadline: "2026-04-30", budgetEstime: null, budgetReel: null },
  { id: 3, name: "Étude de marché cible", status: "À commencer", categories: ["Side Job"], priority: "Haute", deadline: "2026-05-10", budgetEstime: null, budgetReel: null },
  { id: 4, name: "Achat sac de randonnée", status: "En cours", categories: ["Pyrénées"], priority: "Haute", deadline: "2026-05-01", budgetEstime: 180, budgetReel: null },
  { id: 5, name: "Réservation refuge Gavarnie", status: "À commencer", categories: ["Pyrénées"], priority: "Moyenne", deadline: "2026-06-01", budgetEstime: 45, budgetReel: null },
  { id: 6, name: "Planifier itinéraire J1→J3", status: "À commencer", categories: ["Pyrénées"], priority: "Haute", deadline: "2026-05-15", budgetEstime: null, budgetReel: null },
  { id: 7, name: "Peinture salon", status: "En cours", categories: ["Travaux Maison"], priority: "Moyenne", deadline: "2026-04-20", budgetEstime: 350, budgetReel: 280 },
  { id: 8, name: "Changement robinet cuisine", status: "Bloqué", categories: ["Travaux Maison"], priority: "Basse", deadline: "2026-05-30", budgetEstime: 120, budgetReel: null },
  { id: 9, name: "Isolation combles", status: "À commencer", categories: ["Travaux Maison"], priority: "Haute", deadline: "2026-07-01", budgetEstime: 4500, budgetReel: null },
  { id: 10, name: "Bilan épargne mensuel", status: "En cours", categories: ["Finances"], priority: "Haute", deadline: "2026-03-31", budgetEstime: null, budgetReel: null },
  { id: 11, name: "Analyse rentabilité LMNP", status: "En cours", categories: ["Finances"], priority: "Haute", deadline: "2026-04-15", budgetEstime: null, budgetReel: null },
  { id: 12, name: "Rééquilibrage PEA", status: "À commencer", categories: ["Finances"], priority: "Moyenne", deadline: "2026-04-30", budgetEstime: null, budgetReel: null },
  { id: 13, name: "Livrable audit Q1", status: "En cours", categories: ["Boulot"], priority: "Haute", deadline: "2026-03-28", budgetEstime: null, budgetReel: null },
  { id: 14, name: "Présentation résultats équipe", status: "À commencer", categories: ["Boulot"], priority: "Moyenne", deadline: "2026-04-05", budgetEstime: null, budgetReel: null },
  { id: 15, name: "Formation Power BI", status: "À commencer", categories: ["Boulot"], priority: "Basse", deadline: "2026-05-15", budgetEstime: null, budgetReel: null },
];
const DEFAULT_CAPTURES = [
  { id: 1, text: "Regarder les prix AirDNA pour zone Pyrénées", done: false },
  { id: 2, text: "Comparer assurances PNO pour LMNP", done: false },
  { id: 3, text: "Idée article blog : retour d'XP pixel art RPG", done: false },
];
const STORAGE_KEY = "dashboard-data";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function StatusBadge({ status, onClick }) {
  const c = STATUS_COLORS[status];
  return (
    <span onClick={onClick} style={{ background: c.bg, color: c.text, padding: "2px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", cursor: onClick ? "pointer" : "default", userSelect: "none", transition: "transform 0.1s" }}
      onMouseEnter={e => onClick && (e.target.style.transform = "scale(1.05)")}
      onMouseLeave={e => onClick && (e.target.style.transform = "scale(1)")}>
      {status}
    </span>
  );
}
function PriorityDot({ priority }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#718096" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: PRIORITY_DOTS[priority], display: "inline-block" }} />
      {priority}
    </span>
  );
}
function DeadlineText({ deadline }) {
  if (!deadline) return <span style={{ color: "#CBD5E0", fontSize: 12 }}>—</span>;
  const d = new Date(deadline);
  const diff = Math.ceil((d - new Date()) / 86400000);
  let color = "#718096";
  if (diff < 0) color = "#E53E3E";
  else if (diff <= 7) color = "#DD6B20";
  return <span style={{ fontSize: 12, color, fontWeight: diff <= 7 ? 600 : 400 }}>{d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>;
}
function SectionHeader({ icon, title, count, color, onAdd }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, marginTop: 36 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: color || "#1A202C", letterSpacing: "-0.3px" }}>{title}</h2>
      {count !== undefined && <span style={{ background: "#EDF2F7", color: "#4A5568", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{count}</span>}
      {onAdd && (
        <button onClick={onAdd} style={{ marginLeft: "auto", background: "none", border: "1px dashed #CBD5E0", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#718096", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#4A5568"; e.currentTarget.style.color = "#4A5568"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#CBD5E0"; e.currentTarget.style.color = "#718096"; }}>
          + Ajouter
        </button>
      )}
    </div>
  );
}
function ProjectModal({ project, onSave, onClose, onDelete }) {
  const isEdit = !!project?.id;
  const [form, setForm] = useState({
    name: "", status: "À commencer", categories: [], priority: "Moyenne", deadline: "", budgetEstime: "", budgetReel: "", comment: "",
    ...(project || {}),
    budgetEstime: project?.budgetEstime ?? "",
    budgetReel: project?.budgetReel ?? "",
    comment: project?.comment ?? "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleCat = (cat) => set("categories", form.categories.includes(cat) ? form.categories.filter(c => c !== cat) : [...form.categories, cat]);
  const handleSave = () => {
    if (!form.name.trim() || form.categories.length === 0) return;
    onSave({
      ...form,
      name: form.name.trim(),
      comment: form.comment.trim(),
      budgetEstime: form.budgetEstime === "" ? null : Number(form.budgetEstime),
      budgetReel: form.budgetReel === "" ? null : Number(form.budgetReel),
    });
  };
  const S = {
    input: { width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff" },
    label: { display: "block", fontSize: 11, fontWeight: 700, color: "#A0AEC0", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1A202C" }}>{isEdit ? "Modifier le projet" : "Nouveau projet"}</h3>
          <span onClick={onClose} style={{ cursor: "pointer", fontSize: 20, color: "#CBD5E0", lineHeight: 1 }}>×</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={S.label}>Nom du projet *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ex: Rédaction Business Plan" style={S.input} autoFocus />
          </div>
          <div>
            <label style={S.label}>Catégorie(s) *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => toggleCat(cat)}
                  style={{ padding: "4px 12px", borderRadius: 20, border: form.categories.includes(cat) ? "2px solid " + CATEGORY_COLORS[cat].accent : "1px solid #E2E8F0",
                    background: form.categories.includes(cat) ? STATUS_COLORS["En cours"].bg : "#fff",
                    color: form.categories.includes(cat) ? CATEGORY_COLORS[cat].accent : "#718096", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={S.label}>Statut</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} style={{ ...S.input, cursor: "pointer" }}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Priorité</label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)} style={{ ...S.input, cursor: "pointer" }}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={S.label}>Échéance</label>
            <input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} style={S.input} />
          </div>
          {form.categories.includes("Travaux Maison") && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={S.label}>Budget estimé (€)</label>
                <input type="number" value={form.budgetEstime} onChange={e => set("budgetEstime", e.target.value)} placeholder="0" style={S.input} />
              </div>
              <div>
                <label style={S.label}>Budget réel (€)</label>
                <input type="number" value={form.budgetReel} onChange={e => set("budgetReel", e.target.value)} placeholder="0" style={S.input} />
              </div>
            </div>
          )}
          <div>
            <label style={S.label}>Commentaire</label>
            <textarea value={form.comment} onChange={e => set("comment", e.target.value)} placeholder="Notes, liens, remarques…"
              rows={3} style={{ ...S.input, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "1px solid #EDF2F7" }}>
          <div>
            {isEdit && (
              <button onClick={() => { if (confirm("Supprimer ce projet ?")) onDelete(project.id); }}
                style={{ padding: "8px 14px", background: "none", border: "1px solid #FED7D7", borderRadius: 8, fontSize: 12, color: "#C53030", cursor: "pointer", fontWeight: 600 }}>
                Supprimer
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ padding: "8px 18px", background: "#EDF2F7", border: "none", borderRadius: 8, fontSize: 13, color: "#4A5568", cursor: "pointer", fontWeight: 600 }}>Annuler</button>
            <button onClick={handleSave}
              style={{ padding: "8px 18px", background: form.name.trim() && form.categories.length ? "#1A202C" : "#CBD5E0", border: "none", borderRadius: 8, fontSize: 13, color: "#fff", cursor: form.name.trim() && form.categories.length ? "pointer" : "not-allowed", fontWeight: 600 }}>
              {isEdit ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function KanbanBoard({ projects, onCycleStatus, onEdit }) {
  const cols = STATUSES.filter(s => s !== "Terminé");
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: 12 }}>
      {cols.map(status => {
        const items = projects.filter(p => p.status === status);
        const c = STATUS_COLORS[status];
        return (
          <div key={status} style={{ background: "#F7FAFC", borderRadius: 10, padding: 10, minHeight: 120 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid " + c.bg }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.text }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: c.text, textTransform: "uppercase", letterSpacing: "0.5px" }}>{status}</span>
              <span style={{ fontSize: 11, color: "#A0AEC0", marginLeft: "auto" }}>{items.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(p => (
                <div key={p.id} onClick={() => onEdit(p)} style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderLeft: `3px solid ${PRIORITY_DOTS[p.priority]}`, cursor: "pointer", transition: "box-shadow 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,0.1)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#2D3748", marginBottom: 6 }}>{p.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <PriorityDot priority={p.priority} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <DeadlineText deadline={p.deadline} />
                      {p.comment && <span style={{ fontSize: 12, color: "#A0AEC0" }} title={p.comment}>💬</span>}
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && <div style={{ fontSize: 12, color: "#CBD5E0", textAlign: "center", padding: 20 }}>Aucun projet</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
function TravauxTable({ projects, onCycleStatus, onEdit }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
            {["Projet", "Statut", "Priorité", "Budget estimé", "Budget réel", "Écart", "Échéance"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#A0AEC0", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map(p => {
            const ecart = p.budgetEstime && p.budgetReel ? p.budgetReel - p.budgetEstime : null;
            return (
              <tr key={p.id} onClick={() => onEdit(p)} style={{ borderBottom: "1px solid #EDF2F7", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F7FAFC"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "10px", fontWeight: 600, color: "#2D3748" }}>{p.name}</td>
                <td style={{ padding: "10px" }}><StatusBadge status={p.status} onClick={e => { e.stopPropagation(); onCycleStatus(p.id); }} /></td>
                <td style={{ padding: "10px" }}><PriorityDot priority={p.priority} /></td>
                <td style={{ padding: "10px", color: "#4A5568" }}>{p.budgetEstime ? `${p.budgetEstime.toLocaleString("fr-FR")} €` : "—"}</td>
                <td style={{ padding: "10px", color: "#4A5568" }}>{p.budgetReel ? `${p.budgetReel.toLocaleString("fr-FR")} €` : "—"}</td>
                <td style={{ padding: "10px", fontWeight: 600, color: ecart === null ? "#CBD5E0" : ecart <= 0 ? "#276749" : "#C53030" }}>
                  {ecart === null ? "—" : `${ecart > 0 ? "+" : ""}${ecart.toLocaleString("fr-FR")} €`}
                </td>
                <td style={{ padding: "10px" }}><DeadlineText deadline={p.deadline} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function SimpleList({ projects, showBudget, onCycleStatus, onEdit }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {projects.map(p => (
        <div key={p.id} onClick={() => onEdit(p)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "#F7FAFC", borderRadius: 8, cursor: "pointer", transition: "background 0.1s" }}
          onMouseEnter={e => e.currentTarget.style.background = "#EDF2F7"} onMouseLeave={e => e.currentTarget.style.background = "#F7FAFC"}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_DOTS[p.priority], flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#2D3748" }}>{p.name}</span>
          <StatusBadge status={p.status} onClick={e => { e.stopPropagation(); onCycleStatus(p.id); }} />
          {showBudget && p.budgetEstime && (
            <span style={{ fontSize: 12, color: "#718096", background: "#EDF2F7", padding: "2px 8px", borderRadius: 4 }}>{p.budgetEstime.toLocaleString("fr-FR")} €</span>
          )}
          {p.comment && <span style={{ fontSize: 12, color: "#A0AEC0" }} title={p.comment}>💬</span>}
          <DeadlineText deadline={p.deadline} />
        </div>
      ))}
      {projects.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#CBD5E0", fontSize: 13 }}>Aucun projet dans cette catégorie</div>}
    </div>
  );
}
function CaptureRapide({ captures, setCaptures }) {
  const [input, setInput] = useState("");
  const add = () => { if (!input.trim()) return; setCaptures(prev => [...prev, { id: Date.now(), text: input.trim(), done: false }]); setInput(""); };
  const toggle = (id) => setCaptures(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  const remove = (id) => setCaptures(prev => prev.filter(c => c.id !== id));
  return (
    <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 16, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>📥</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>Capture Rapide</span>
        <span style={{ fontSize: 11, color: "#B45309", background: "#FEF3C7", padding: "1px 8px", borderRadius: 8 }}>depuis Google Keep</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Nouvelle idée à trier…" style={{ flex: 1, padding: "8px 12px", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none" }} />
        <button onClick={add} style={{ padding: "8px 16px", background: "#F59E0B", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {captures.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: c.done ? "#FEF9E7" : "transparent" }}>
            <span onClick={() => toggle(c.id)} style={{ cursor: "pointer", width: 16, height: 16, borderRadius: 4, border: c.done ? "none" : "2px solid #D69E2E", background: c.done ? "#48BB78" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", flexShrink: 0 }}>
              {c.done && "✓"}
            </span>
            <span style={{ flex: 1, fontSize: 13, color: c.done ? "#A0AEC0" : "#4A5568", textDecoration: c.done ? "line-through" : "none" }}>{c.text}</span>
            <span onClick={() => remove(c.id)} style={{ cursor: "pointer", fontSize: 14, color: "#CBD5E0", padding: "0 4px" }}>×</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function OverviewBar({ projects }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
      {STATUSES.map(s => {
        const count = projects.filter(p => p.status === s).length;
        return (
          <div key={s} style={{ flex: 1, background: STATUS_COLORS[s].bg, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: STATUS_COLORS[s].text }}>{count}</div>
            <div style={{ fontSize: 11, color: STATUS_COLORS[s].text, fontWeight: 600 }}>{s}</div>
          </div>
        );
      })}
      <div style={{ flex: 1, background: "#EDF2F7", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#2D3748" }}>{projects.length}</div>
        <div style={{ fontSize: 11, color: "#718096", fontWeight: 600 }}>Total</div>
      </div>
    </div>
  );
}
export default function Dashboard() {
  const [projects, setProjects] = useState(() => {
    const saved = loadData();
    return saved?.projects ?? DEFAULT_PROJECTS;
  });
  const [captures, setCaptures] = useState(() => {
    const saved = loadData();
    return saved?.captures ?? DEFAULT_CAPTURES;
  });
  const [activeTab, setActiveTab] = useState("all");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    saveData({ projects, captures });
  }, [projects, captures]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);
  const cycleStatus = useCallback((id) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p;
      const idx = STATUSES.indexOf(p.status);
      return { ...p, status: STATUSES[(idx + 1) % STATUSES.length] };
    }));
  }, []);
  const handleSave = useCallback((formData) => {
    if (modal.mode === "create") {
      setProjects(prev => [...prev, { ...formData, id: Date.now() }]);
      showToast("Projet créé ✓");
    } else {
      setProjects(prev => prev.map(p => p.id === modal.project.id ? { ...formData, id: p.id } : p));
      showToast("Projet modifié ✓");
    }
    setModal(null);
  }, [modal, showToast]);
  const handleDelete = useCallback((id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setModal(null);
    showToast("Projet supprimé");
  }, [showToast]);
  const openCreate = (defaultCat) => setModal({ mode: "create", defaultCat });
  const openEdit = (project) => setModal({ mode: "edit", project });
  const filterByCat = (cat) => projects.filter(p => p.categories.includes(cat));
  const resetData = () => {
    if (confirm("Réinitialiser toutes les données ?")) {
      setProjects(DEFAULT_PROJECTS);
      setCaptures(DEFAULT_CAPTURES);
      showToast("Données réinitialisées");
    }
  };
  const tabs = [
    { key: "all", label: "Vue globale", icon: "📊" },
    { key: "Boulot", label: "Boulot", icon: "💼" },
    { key: "Side Job", label: "Side Job", icon: "🚀" },
    { key: "Pyrénées", label: "Pyrénées", icon: "🏔️" },
    { key: "Travaux Maison", label: "Travaux", icon: "🏠" },
    { key: "Finances", label: "Finances", icon: "💰" },
  ];
  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FA", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #CBD5E0; border-radius: 3px; }
        input:focus, select:focus { border-color: #F59E0B !important; box-shadow: 0 0 0 2px rgba(245,158,11,0.15); }
        @keyframes toastIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1A202C", color: "#fff", padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 2000, animation: "toastIn 0.2s ease", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}
      {modal && (
        <ProjectModal
          project={modal.mode === "edit" ? modal.project : modal.defaultCat ? { categories: [modal.defaultCat] } : null}
          onSave={handleSave} onClose={() => setModal(null)} onDelete={handleDelete}
        />
      )}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 26 }}>⚡</span>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1A202C", letterSpacing: "-0.5px" }}>Tableau de Bord</h1>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#A0AEC0", paddingLeft: 36 }}>Gestion de projet — vue unifiée · {projects.length} projets</p>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={resetData} style={{ padding: "6px 12px", background: "none", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 11, color: "#A0AEC0", cursor: "pointer" }}>Reset</button>
            <button onClick={() => openCreate()} style={{ padding: "6px 16px", background: "#1A202C", border: "none", borderRadius: 8, fontSize: 12, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              + Nouveau
            </button>
          </div>
        </div>
        <CaptureRapide captures={captures} setCaptures={setCaptures} />
        <OverviewBar projects={projects} />
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #E2E8F0", marginBottom: 20, marginTop: 20, overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding: "8px 14px", fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? "#1A202C" : "#A0AEC0",
                background: "none", border: "none", borderBottom: activeTab === t.key ? "2px solid #1A202C" : "2px solid transparent",
                cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s ease" }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        {activeTab === "all" && (
          <div>
            <SectionHeader icon="💼" title="Boulot" count={filterByCat("Boulot").length} color={CATEGORY_COLORS["Boulot"].accent} onAdd={() => openCreate("Boulot")} />
            <KanbanBoard projects={filterByCat("Boulot")} onCycleStatus={cycleStatus} onEdit={openEdit} />
            <SectionHeader icon="🚀" title="Focus Side Job" count={filterByCat("Side Job").length} color={CATEGORY_COLORS["Side Job"].accent} onAdd={() => openCreate("Side Job")} />
            <KanbanBoard projects={filterByCat("Side Job")} onCycleStatus={cycleStatus} onEdit={openEdit} />
            <SectionHeader icon="🏔️" title="Projet Pyrénées" count={filterByCat("Pyrénées").length} color={CATEGORY_COLORS["Pyrénées"].accent} onAdd={() => openCreate("Pyrénées")} />
            <SimpleList projects={filterByCat("Pyrénées")} showBudget onCycleStatus={cycleStatus} onEdit={openEdit} />
            <SectionHeader icon="🏠" title="Travaux Maison" count={filterByCat("Travaux Maison").length} color={CATEGORY_COLORS["Travaux Maison"].accent} onAdd={() => openCreate("Travaux Maison")} />
            <TravauxTable projects={filterByCat("Travaux Maison")} onCycleStatus={cycleStatus} onEdit={openEdit} />
            <SectionHeader icon="💰" title="Finances" count={filterByCat("Finances").length} color={CATEGORY_COLORS["Finances"].accent} onAdd={() => openCreate("Finances")} />
            <SimpleList projects={filterByCat("Finances")} onCycleStatus={cycleStatus} onEdit={openEdit} />
          </div>
        )}
        {activeTab === "Boulot" && (
          <div>
            <SectionHeader icon="💼" title="Boulot" count={filterByCat("Boulot").length} color={CATEGORY_COLORS["Boulot"].accent} onAdd={() => openCreate("Boulot")} />
            <p style={{ fontSize: 13, color: "#718096", margin: "0 0 16px 0" }}>Livrables majeurs — séparation pro / perso</p>
            <KanbanBoard projects={filterByCat("Boulot")} onCycleStatus={cycleStatus} onEdit={openEdit} />
          </div>
        )}
        {activeTab === "Side Job" && (
          <div>
            <SectionHeader icon="🚀" title="Focus Side Job" count={filterByCat("Side Job").length} color={CATEGORY_COLORS["Side Job"].accent} onAdd={() => openCreate("Side Job")} />
            <p style={{ fontSize: 13, color: "#718096", margin: "0 0 16px 0" }}>Vue Kanban — suivi des étapes de création</p>
            <KanbanBoard projects={filterByCat("Side Job")} onCycleStatus={cycleStatus} onEdit={openEdit} />
          </div>
        )}
        {activeTab === "Pyrénées" && (
          <div>
            <SectionHeader icon="🏔️" title="Projet Pyrénées" count={filterByCat("Pyrénées").length} color={CATEGORY_COLORS["Pyrénées"].accent} onAdd={() => openCreate("Pyrénées")} />
            <p style={{ fontSize: 13, color: "#718096", margin: "0 0 16px 0" }}>Logistique · Itinéraire · Matériel</p>
            <SimpleList projects={filterByCat("Pyrénées")} showBudget onCycleStatus={cycleStatus} onEdit={openEdit} />
          </div>
        )}
        {activeTab === "Travaux Maison" && (
          <div>
            <SectionHeader icon="🏠" title="Travaux Maison" count={filterByCat("Travaux Maison").length} color={CATEGORY_COLORS["Travaux Maison"].accent} onAdd={() => openCreate("Travaux Maison")} />
            <p style={{ fontSize: 13, color: "#718096", margin: "0 0 16px 0" }}>Suivi budgétaire par chantier</p>
            <TravauxTable projects={filterByCat("Travaux Maison")} onCycleStatus={cycleStatus} onEdit={openEdit} />
          </div>
        )}
        {activeTab === "Finances" && (
          <div>
            <SectionHeader icon="💰" title="Finances" count={filterByCat("Finances").length} color={CATEGORY_COLORS["Finances"].accent} onAdd={() => openCreate("Finances")} />
            <p style={{ fontSize: 13, color: "#718096", margin: "0 0 16px 0" }}>Investissements · Épargne · Budget mensuel</p>
            <SimpleList projects={filterByCat("Finances")} onCycleStatus={cycleStatus} onEdit={openEdit} />
          </div>
        )}
        <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #E2E8F0", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "#CBD5E0" }}>Données sauvegardées automatiquement entre sessions</span>
        </div>
      </div>
    </div>
  );
}
