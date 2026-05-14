import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

// ─── Palette English Cottage ────────────────────────────────────────────────
const C = {
  cream:      "#FAF7F2",
  parchment:  "#FEF9F0",
  sage:       "#7A9E7E",
  sageDark:   "#5C8A60",
  sageLight:  "#EBF3EB",
  brown:      "#6B4F2A",
  brownLight: "#C9A87C",
  terra:      "#C4714A",
  terraLight: "#F5E6DF",
  oak:        "#3D2B1F",
  border:     "#E8DDD0",
  muted:      "#A89080",
};
const FONT_SERIF = "'Playfair Display', Georgia, serif";
const FONT_SANS  = "'DM Sans', 'Segoe UI', system-ui, sans-serif";

const UNITS = ["g", "kg", "ml", "L", "cl", "pièce(s)", "c. à soupe", "c. à café", "pincée", "tranche(s)", "gousse(s)", "feuille(s)", "botte(s)"];

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MOIS  = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

// ─── Firebase ────────────────────────────────────────────────────────────────
const RECETTES_REF = () => doc(db, "recettes", "main");

// ─── Utilitaires dates ───────────────────────────────────────────────────────
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
function toISO(date) { return date.toISOString().slice(0, 10); }
function weekDates(offset) {
  const m = getMonday(new Date());
  m.setDate(m.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(m);
    d.setDate(d.getDate() + i);
    return toISO(d);
  });
}
function biWeekDates(offset) {
  return [...weekDates(offset), ...weekDates(offset + 1)];
}
function formatDateRange(dates) {
  const first = new Date(dates[0]);
  const last  = new Date(dates[dates.length - 1]);
  return `${first.getDate()} ${MOIS[first.getMonth()]} – ${last.getDate()} ${MOIS[last.getMonth()]} ${last.getFullYear()}`;
}
function formatDayHeader(isoDate) {
  const d = new Date(isoDate);
  return { jour: JOURS[d.getDay() === 0 ? 6 : d.getDay() - 1], num: d.getDate(), mois: MOIS[d.getMonth()] };
}

// ─── Génération liste de courses ─────────────────────────────────────────────
function generateShoppingList(recipes, mealPlan, dates) {
  const ids = [...new Set(dates.flatMap(d => {
    const s = mealPlan[d] || {};
    return [s.midi, s.soir].filter(Boolean);
  }))];
  const agg = {};
  ids.forEach(rid => {
    const recipe = recipes.find(r => r.id === rid);
    if (!recipe) return;
    recipe.ingredients.forEach(ing => {
      const key = ing.name.toLowerCase().trim() + "__" + ing.unit;
      if (agg[key]) {
        agg[key].quantity += Number(ing.quantity) || 0;
        if (!agg[key].recipeIds.includes(rid)) agg[key].recipeIds.push(rid);
      } else {
        agg[key] = {
          id: Date.now() + Math.random(),
          name: ing.name,
          quantity: Number(ing.quantity) || 0,
          unit: ing.unit,
          checked: false,
          recipeIds: [rid],
        };
      }
    });
  });
  return Object.values(agg);
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: C.oak, color: C.cream, padding: "10px 24px",
      borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 3000,
      animation: "toastIn 0.2s ease", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      fontFamily: FONT_SANS,
    }}>
      {msg}
    </div>
  );
}

// ─── RecipeSubNav ─────────────────────────────────────────────────────────────
function RecipeSubNav({ view, setView }) {
  const tabs = [
    { key: "bibliotheque", label: "Bibliothèque", icon: "📖" },
    { key: "planificateur", label: "Planificateur", icon: "🗓️" },
    { key: "courses", label: "Liste de courses", icon: "🛒" },
  ];
  return (
    <div style={{
      display: "flex", gap: 6, background: C.parchment,
      border: `1px solid ${C.border}`, borderRadius: 14,
      padding: 6, marginBottom: 24, width: "fit-content",
    }}>
      {tabs.map(t => {
        const active = view === t.key;
        return (
          <button key={t.key} onClick={() => setView(t.key)} style={{
            padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
            fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
            background: active ? C.sage : "transparent",
            color: active ? "#fff" : C.muted,
            transition: "all 0.15s ease",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── TagChip ─────────────────────────────────────────────────────────────────
function TagChip({ tag, active, onClick, removable, onRemove }) {
  return (
    <span onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20,
      background: active ? C.sage : C.sageLight,
      color: active ? "#fff" : C.sageDark,
      fontSize: 12, fontWeight: 600, cursor: onClick ? "pointer" : "default",
      border: `1px solid ${active ? C.sage : C.border}`,
      transition: "all 0.12s ease", fontFamily: FONT_SANS,
      userSelect: "none",
    }}>
      {tag}
      {removable && (
        <span onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ cursor: "pointer", opacity: 0.7, fontSize: 11 }}>×</span>
      )}
    </span>
  );
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────
function RecipeCard({ recipe, onEdit, onPlan }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.parchment,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "20px",
        boxShadow: hovered ? "0 8px 24px rgba(107,79,42,0.12)" : "0 2px 8px rgba(107,79,42,0.06)",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "none",
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      <div>
        <h3 style={{
          margin: 0, fontFamily: FONT_SERIF, fontSize: 17,
          color: C.brown, fontWeight: 700, lineHeight: 1.3,
        }}>
          {recipe.name}
        </h3>
        {recipe.description && (
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.muted, fontFamily: FONT_SANS, lineHeight: 1.5 }}>
            {recipe.description.length > 80 ? recipe.description.slice(0, 80) + "…" : recipe.description}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {recipe.servings && (
          <span style={{ fontSize: 12, color: C.muted, fontFamily: FONT_SANS, display: "flex", alignItems: "center", gap: 4 }}>
            👥 {recipe.servings} pers.
          </span>
        )}
        {recipe.prepTime && (
          <span style={{ fontSize: 12, color: C.muted, fontFamily: FONT_SANS, display: "flex", alignItems: "center", gap: 4 }}>
            🔪 {recipe.prepTime} min
          </span>
        )}
        {recipe.cookTime && (
          <span style={{ fontSize: 12, color: C.muted, fontFamily: FONT_SANS, display: "flex", alignItems: "center", gap: 4 }}>
            🍳 {recipe.cookTime} min
          </span>
        )}
      </div>

      {recipe.tags && recipe.tags.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {recipe.tags.map(t => <TagChip key={t} tag={t} />)}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <button onClick={() => onEdit(recipe)} style={{
          flex: 1, padding: "7px 0", border: `1px solid ${C.border}`,
          borderRadius: 8, background: "white", color: C.brown,
          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_SANS,
          transition: "all 0.1s",
        }}>
          ✏️ Modifier
        </button>
        <button onClick={() => onPlan(recipe)} style={{
          flex: 1, padding: "7px 0", border: "none",
          borderRadius: 8, background: C.sage, color: "white",
          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_SANS,
          transition: "all 0.1s",
        }}>
          📅 Planifier
        </button>
      </div>
    </div>
  );
}

// ─── IngredientRow ────────────────────────────────────────────────────────────
function IngredientRow({ ing, onChange, onRemove }) {
  const inputStyle = {
    border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px",
    fontFamily: FONT_SANS, fontSize: 13, background: "white", color: C.oak,
    outline: "none",
  };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        placeholder="Ingrédient"
        value={ing.name}
        onChange={e => onChange({ ...ing, name: e.target.value })}
        style={{ ...inputStyle, flex: 3 }}
      />
      <input
        placeholder="Qté"
        type="number"
        min="0"
        value={ing.quantity}
        onChange={e => onChange({ ...ing, quantity: e.target.value })}
        style={{ ...inputStyle, flex: 1 }}
      />
      <select
        value={ing.unit}
        onChange={e => onChange({ ...ing, unit: e.target.value })}
        style={{ ...inputStyle, flex: 2, cursor: "pointer" }}
      >
        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      <button onClick={onRemove} style={{
        background: C.terraLight, border: "none", borderRadius: 8,
        width: 30, height: 30, cursor: "pointer", color: C.terra,
        fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0,
      }}>×</button>
    </div>
  );
}

// ─── RecipeModal ──────────────────────────────────────────────────────────────
function RecipeModal({ recipe, onSave, onClose, onDelete }) {
  const isEdit = !!recipe?.id;
  const [form, setForm] = useState({
    name: "", description: "", servings: 4, prepTime: "", cookTime: "",
    ingredients: [{ name: "", quantity: "", unit: "g" }],
    tags: [], notes: "",
    ...recipe,
  });
  const [tagInput, setTagInput] = useState("");

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addIngredient = () =>
    setField("ingredients", [...form.ingredients, { name: "", quantity: "", unit: "g" }]);

  const updateIngredient = (i, val) =>
    setField("ingredients", form.ingredients.map((x, idx) => idx === i ? val : x));

  const removeIngredient = (i) =>
    setField("ingredients", form.ingredients.filter((_, idx) => idx !== i));

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !form.tags.includes(trimmed)) {
      setField("tags", [...form.tags, trimmed]);
    }
    setTagInput("");
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const validIngs = form.ingredients.filter(i => i.name.trim());
    onSave({ ...form, ingredients: validIngs, id: form.id || Date.now() });
  };

  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 600, color: C.brown,
    marginBottom: 5, fontFamily: FONT_SANS, textTransform: "uppercase", letterSpacing: "0.05em",
  };
  const inputStyle = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "9px 13px", fontFamily: FONT_SANS, fontSize: 14,
    background: "white", color: C.oak, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(61,43,31,0.45)",
      zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.cream, borderRadius: 20, padding: "32px",
        maxWidth: 580, width: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(61,43,31,0.25)",
        border: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: FONT_SERIF, color: C.brown, fontSize: 22 }}>
            {isEdit ? "Modifier la recette" : "✿ Nouvelle recette"}
          </h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted,
          }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={labelStyle}>Nom de la recette *</label>
            <input style={inputStyle} value={form.name} placeholder="Ex: Ratatouille provençale"
              onChange={e => setField("name", e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
              value={form.description} placeholder="Un plat ensoleillé…"
              onChange={e => setField("description", e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Personnes</label>
              <input style={inputStyle} type="number" min="1" value={form.servings}
                onChange={e => setField("servings", Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Prép. (min)</label>
              <input style={inputStyle} type="number" min="0" value={form.prepTime}
                placeholder="20" onChange={e => setField("prepTime", Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Cuisson (min)</label>
              <input style={inputStyle} type="number" min="0" value={form.cookTime}
                placeholder="45" onChange={e => setField("cookTime", Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Ingrédients</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {form.ingredients.map((ing, i) => (
                <IngredientRow key={i} ing={ing}
                  onChange={v => updateIngredient(i, v)}
                  onRemove={() => removeIngredient(i)} />
              ))}
              <button onClick={addIngredient} style={{
                border: `1px dashed ${C.brownLight}`, borderRadius: 8,
                background: "transparent", color: C.brown, cursor: "pointer",
                padding: "7px", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
              }}>
                + Ajouter un ingrédient
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Balises</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {form.tags.map(t => (
                <TagChip key={t} tag={t} removable
                  onRemove={() => setField("tags", form.tags.filter(x => x !== t))} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={tagInput}
                placeholder="végétarien, rapide, été…"
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag()} />
              <button onClick={addTag} style={{
                padding: "9px 16px", background: C.sageLight, border: `1px solid ${C.sage}`,
                borderRadius: 10, color: C.sageDark, cursor: "pointer",
                fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
              }}>Ajouter</button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
              value={form.notes} placeholder="Astuces, variantes…"
              onChange={e => setField("notes", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          {isEdit && (
            <button onClick={() => onDelete(recipe.id)} style={{
              padding: "10px 18px", border: `1px solid ${C.terra}`,
              borderRadius: 10, background: C.terraLight, color: C.terra,
              cursor: "pointer", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
            }}>Supprimer</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            padding: "10px 18px", border: `1px solid ${C.border}`,
            borderRadius: 10, background: "white", color: C.brown,
            cursor: "pointer", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
          }}>Annuler</button>
          <button onClick={handleSave} style={{
            padding: "10px 24px", border: "none",
            borderRadius: 10, background: C.sage, color: "white",
            cursor: "pointer", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700,
          }}>
            {isEdit ? "Enregistrer" : "Créer la recette"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BibliothequeView ─────────────────────────────────────────────────────────
function BibliothequeView({ recipes, onSave, onDelete, onPlanRecipe, showToast }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [modal, setModal] = useState(null); // null | { mode, recipe? }

  const allTags = [...new Set(recipes.flatMap(r => r.tags || []))].sort();

  const toggleTag = (tag) =>
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const filtered = recipes.filter(r => {
    const matchesSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = activeTags.length === 0 || activeTags.every(t => (r.tags || []).includes(t));
    return matchesSearch && matchesTags;
  });

  const handleSave = (recipe) => {
    onSave(recipe);
    setModal(null);
    showToast(recipe.id && recipes.find(r => r.id === recipe.id) ? "Recette modifiée ✓" : "Recette créée ✓");
  };
  const handleDelete = (id) => {
    onDelete(id);
    setModal(null);
    showToast("Recette supprimée");
  };

  return (
    <div>
      {modal && (
        <RecipeModal
          recipe={modal.recipe}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}

      {/* Barre de recherche + bouton créer */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            fontSize: 14, color: C.muted,
          }}>🔍</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher une recette…"
            style={{
              width: "100%", padding: "10px 12px 10px 36px",
              border: `1px solid ${C.border}`, borderRadius: 12,
              fontFamily: FONT_SANS, fontSize: 14, color: C.oak,
              background: "white", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <button onClick={() => setModal({ mode: "create" })} style={{
          padding: "10px 20px", background: C.terra, border: "none",
          borderRadius: 12, color: "white", fontFamily: FONT_SANS,
          fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(196,113,74,0.3)",
        }}>
          ✿ Nouvelle recette
        </button>
      </div>

      {/* Filtres par balises */}
      {allTags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {allTags.map(t => (
            <TagChip key={t} tag={t} active={activeTags.includes(t)} onClick={() => toggleTag(t)} />
          ))}
          {activeTags.length > 0 && (
            <button onClick={() => setActiveTags([])} style={{
              padding: "3px 10px", borderRadius: 20, border: "none",
              background: C.terraLight, color: C.terra, fontSize: 12,
              fontWeight: 600, cursor: "pointer", fontFamily: FONT_SANS,
            }}>Effacer filtres</button>
          )}
        </div>
      )}

      {/* Grille de recettes */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          color: C.muted, fontFamily: FONT_SANS,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✿</div>
          <p style={{ fontFamily: FONT_SERIF, fontSize: 18, color: C.brown, margin: "0 0 8px" }}>
            {recipes.length === 0 ? "Votre bibliothèque est vide" : "Aucune recette trouvée"}
          </p>
          <p style={{ fontSize: 14, margin: "0 0 20px" }}>
            {recipes.length === 0
              ? "Commencez par créer votre première recette"
              : "Essayez d'autres termes ou balises"}
          </p>
          {recipes.length === 0 && (
            <button onClick={() => setModal({ mode: "create" })} style={{
              padding: "10px 24px", background: C.sage, border: "none",
              borderRadius: 12, color: "white", fontFamily: FONT_SANS,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>Créer ma première recette</button>
          )}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}>
          {filtered.map(r => (
            <RecipeCard
              key={r.id} recipe={r}
              onEdit={recipe => setModal({ mode: "edit", recipe })}
              onPlan={onPlanRecipe}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RecipePicker popover ────────────────────────────────────────────────────
function RecipePicker({ recipes, onSelect, onClose }) {
  const [q, setQ] = useState("");
  const filtered = recipes.filter(r => r.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1500 }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: C.cream, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: 16, width: 300,
        boxShadow: "0 16px 48px rgba(61,43,31,0.2)",
        maxHeight: "60vh", display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontFamily: FONT_SERIF, fontSize: 15, color: C.brown, fontWeight: 700 }}>
            Choisir une recette
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18 }}>×</button>
        </div>
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Rechercher…"
          style={{
            border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px",
            fontFamily: FONT_SANS, fontSize: 13, outline: "none", marginBottom: 10,
          }}
        />
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 && (
            <p style={{ color: C.muted, fontSize: 13, fontFamily: FONT_SANS, textAlign: "center", padding: "16px 0" }}>
              Aucune recette trouvée
            </p>
          )}
          {filtered.map(r => (
            <div key={r.id} onClick={() => { onSelect(r.id); onClose(); }}
              style={{
                padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                fontFamily: FONT_SANS, fontSize: 13, color: C.oak,
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.sageLight}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              {r.tags?.length > 0 && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{r.tags.join(", ")}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MealSlot ─────────────────────────────────────────────────────────────────
function MealSlot({ label, icon, recipeId, recipes, onAdd, onClear }) {
  const recipe = recipes.find(r => r.id === recipeId);
  return (
    <div style={{
      minHeight: 56, border: `1px dashed ${recipeId ? C.sage : C.border}`,
      borderRadius: 10, padding: "8px 10px",
      background: recipeId ? C.sageLight : "transparent",
      transition: "all 0.15s ease",
    }}>
      <div style={{ fontSize: 11, color: C.muted, fontFamily: FONT_SANS, fontWeight: 600, marginBottom: 4 }}>
        {icon} {label}
      </div>
      {recipeId ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          <span style={{ fontSize: 12, fontFamily: FONT_SANS, color: C.brown, fontWeight: 600, lineHeight: 1.3 }}>
            {recipe ? recipe.name : <em style={{ color: C.muted }}>Recette supprimée</em>}
          </span>
          <button onClick={onClear} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.muted, fontSize: 14, padding: 2, lineHeight: 1, flexShrink: 0,
          }}>×</button>
        </div>
      ) : (
        <button onClick={onAdd} style={{
          background: "none", border: "none", cursor: "pointer",
          color: C.muted, fontSize: 12, fontFamily: FONT_SANS, padding: 0,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          + Ajouter
        </button>
      )}
    </div>
  );
}

// ─── DayColumn ────────────────────────────────────────────────────────────────
function DayColumn({ isoDate, mealPlan, recipes, onSlotChange, isWeekend }) {
  const { jour, num, mois } = formatDayHeader(isoDate);
  const dayPlan = mealPlan[isoDate] || {};

  return (
    <div style={{
      background: isWeekend ? C.parchment : "white",
      border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 10px",
      minWidth: 0,
    }}>
      <div style={{ marginBottom: 10, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontFamily: FONT_SANS, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {jour.slice(0, 3)}.
        </div>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 20, color: C.brown, fontWeight: 700, lineHeight: 1 }}>
          {num}
        </div>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: FONT_SANS }}>
          {mois}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <MealSlot
          label="Midi" icon="☀️"
          recipeId={dayPlan.midi || null}
          recipes={recipes}
          onAdd={() => onSlotChange(isoDate, "midi", "open")}
          onClear={() => onSlotChange(isoDate, "midi", null)}
        />
        <MealSlot
          label="Soir" icon="❧"
          recipeId={dayPlan.soir || null}
          recipes={recipes}
          onAdd={() => onSlotChange(isoDate, "soir", "open")}
          onClear={() => onSlotChange(isoDate, "soir", null)}
        />
      </div>
    </div>
  );
}

// ─── PlanificateurView ────────────────────────────────────────────────────────
function PlanificateurView({ recipes, mealPlan, setMealPlan, weekOffset, setWeekOffset, showToast }) {
  const [twoWeeks, setTwoWeeks] = useState(false);
  const [pickerSlot, setPickerSlot] = useState(null); // { date, slot }

  const dates = twoWeeks ? biWeekDates(weekOffset) : weekDates(weekOffset);

  const handleSlotChange = (date, slot, value) => {
    if (value === "open") {
      setPickerSlot({ date, slot });
      return;
    }
    setMealPlan(prev => ({
      ...prev,
      [date]: { ...(prev[date] || {}), [slot]: value },
    }));
  };

  const handlePickerSelect = (recipeId) => {
    if (!pickerSlot) return;
    const { date, slot } = pickerSlot;
    setMealPlan(prev => ({
      ...prev,
      [date]: { ...(prev[date] || {}), [slot]: recipeId },
    }));
    showToast("Recette planifiée ✓");
  };

  const clearWeek = () => {
    const keys = dates;
    setMealPlan(prev => {
      const next = { ...prev };
      keys.forEach(d => delete next[d]);
      return next;
    });
    showToast("Semaine effacée");
  };

  const week1 = dates.slice(0, 7);
  const week2 = twoWeeks ? dates.slice(7, 14) : [];

  return (
    <div>
      {pickerSlot && (
        <RecipePicker
          recipes={recipes}
          onSelect={handlePickerSelect}
          onClose={() => setPickerSlot(null)}
        />
      )}

      {/* Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={{
          padding: "8px 14px", border: `1px solid ${C.border}`, borderRadius: 10,
          background: "white", cursor: "pointer", fontFamily: FONT_SANS, fontSize: 13, color: C.brown,
        }}>← Précédente</button>

        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 16, color: C.brown, fontWeight: 700 }}>
            {formatDateRange(dates)}
          </div>
        </div>

        <button onClick={() => setWeekOffset(w => w + 1)} style={{
          padding: "8px 14px", border: `1px solid ${C.border}`, borderRadius: 10,
          background: "white", cursor: "pointer", fontFamily: FONT_SANS, fontSize: 13, color: C.brown,
        }}>Suivante →</button>

        <button onClick={() => setWeekOffset(0)} style={{
          padding: "8px 14px", border: `1px solid ${C.sage}`, borderRadius: 10,
          background: C.sageLight, cursor: "pointer", fontFamily: FONT_SANS, fontSize: 12, color: C.sageDark, fontWeight: 600,
        }}>Aujourd'hui</button>

        <button onClick={() => setTwoWeeks(t => !t)} style={{
          padding: "8px 14px", border: `1px solid ${C.border}`, borderRadius: 10,
          background: twoWeeks ? C.brown : "white", color: twoWeeks ? "white" : C.brown,
          cursor: "pointer", fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
        }}>
          {twoWeeks ? "1 semaine" : "2 semaines"}
        </button>

        <button onClick={clearWeek} style={{
          padding: "8px 14px", border: `1px solid ${C.terra}`, borderRadius: 10,
          background: C.terraLight, cursor: "pointer", fontFamily: FONT_SANS, fontSize: 12, color: C.terra, fontWeight: 600,
        }}>Effacer</button>
      </div>

      {/* Grille semaine 1 */}
      {recipes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted, fontFamily: FONT_SANS }}>
          <p style={{ fontFamily: FONT_SERIF, fontSize: 16, color: C.brown }}>
            Créez d'abord des recettes dans la bibliothèque
          </p>
        </div>
      ) : (
        <>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            gap: 8, marginBottom: twoWeeks ? 20 : 0,
          }}>
            {week1.map((d, i) => (
              <DayColumn key={d} isoDate={d} mealPlan={mealPlan}
                recipes={recipes} onSlotChange={handleSlotChange}
                isWeekend={i >= 5} />
            ))}
          </div>
          {twoWeeks && week2.length > 0 && (
            <>
              <div style={{
                fontFamily: FONT_SERIF, fontSize: 14, color: C.muted,
                textAlign: "center", margin: "12px 0 12px", fontStyle: "italic",
              }}>
                ❧ Deuxième semaine
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                {week2.map((d, i) => (
                  <DayColumn key={d} isoDate={d} mealPlan={mealPlan}
                    recipes={recipes} onSlotChange={handleSlotChange}
                    isWeekend={i >= 5} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── ListeCoursesView ─────────────────────────────────────────────────────────
function ListeCoursesView({ recipes, mealPlan, shoppingList, setShoppingList, weekOffset, showToast }) {
  const [localOffset, setLocalOffset] = useState(weekOffset);
  const [twoWeeks, setTwoWeeks] = useState(false);

  const handleGenerate = () => {
    const dates = twoWeeks ? biWeekDates(localOffset) : weekDates(localOffset);
    const list = generateShoppingList(recipes, mealPlan, dates);
    if (list.length === 0) {
      showToast("Aucun repas planifié pour cette période");
      return;
    }
    setShoppingList(list);
    showToast(`${list.length} article(s) générés ✓`);
  };

  const toggleItem = (id) =>
    setShoppingList(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));

  const clearChecked = () => {
    setShoppingList(prev => prev.filter(i => !i.checked));
    showToast("Articles cochés supprimés");
  };

  // Grouper par première recette source
  const groups = {};
  shoppingList.forEach(item => {
    const firstId = item.recipeIds?.[0];
    const recipe = recipes.find(r => r.id === firstId);
    const groupKey = recipe ? recipe.name : "Autres";
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
  });

  const checkedCount = shoppingList.filter(i => i.checked).length;

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Panneau de génération */}
      <div style={{
        background: C.parchment, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "20px 24px", marginBottom: 24,
      }}>
        <h3 style={{ margin: "0 0 16px", fontFamily: FONT_SERIF, color: C.brown, fontSize: 17 }}>
          🛒 Générer la liste
        </h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setLocalOffset(o => o - 1)} style={{
            padding: "7px 12px", border: `1px solid ${C.border}`, borderRadius: 8,
            background: "white", cursor: "pointer", fontFamily: FONT_SANS, fontSize: 13, color: C.brown,
          }}>←</button>

          <span style={{ fontFamily: FONT_SERIF, fontSize: 14, color: C.brown, flex: 1, textAlign: "center", minWidth: 160 }}>
            {formatDateRange(twoWeeks ? biWeekDates(localOffset) : weekDates(localOffset))}
          </span>

          <button onClick={() => setLocalOffset(o => o + 1)} style={{
            padding: "7px 12px", border: `1px solid ${C.border}`, borderRadius: 8,
            background: "white", cursor: "pointer", fontFamily: FONT_SANS, fontSize: 13, color: C.brown,
          }}>→</button>

          <button onClick={() => setTwoWeeks(t => !t)} style={{
            padding: "7px 12px", border: `1px solid ${C.border}`, borderRadius: 8,
            background: twoWeeks ? C.brown : "white", color: twoWeeks ? "white" : C.brown,
            cursor: "pointer", fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
          }}>
            {twoWeeks ? "1 sem." : "2 sem."}
          </button>

          <button onClick={handleGenerate} style={{
            padding: "9px 20px", background: C.terra, border: "none",
            borderRadius: 10, color: "white", fontFamily: FONT_SANS,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(196,113,74,0.3)",
          }}>Générer</button>
        </div>
      </div>

      {/* Liste générée */}
      {shoppingList.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted, fontFamily: FONT_SANS }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
          <p style={{ fontFamily: FONT_SERIF, fontSize: 16, color: C.brown, margin: "0 0 8px" }}>
            Votre liste est vide
          </p>
          <p style={{ fontSize: 13 }}>Planifiez des repas puis générez la liste ci-dessus</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontFamily: FONT_SANS, fontSize: 13, color: C.muted }}>
              {shoppingList.length} article(s) · {checkedCount} coché(s)
            </span>
            {checkedCount > 0 && (
              <button onClick={clearChecked} style={{
                padding: "6px 14px", border: `1px solid ${C.terra}`, borderRadius: 8,
                background: C.terraLight, color: C.terra, cursor: "pointer",
                fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
              }}>Effacer cochés ({checkedCount})</button>
            )}
          </div>

          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName} style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: FONT_SERIF, fontSize: 14, color: C.brown, fontWeight: 700,
                marginBottom: 8, paddingBottom: 6,
                borderBottom: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                ✿ {groupName}
                <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: C.muted, fontWeight: 400 }}>
                  ({items.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {items.map(item => (
                  <label key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                    padding: "8px 12px", borderRadius: 8,
                    background: item.checked ? C.sageLight : "white",
                    border: `1px solid ${item.checked ? C.sage : C.border}`,
                    transition: "all 0.15s",
                    opacity: item.checked ? 0.7 : 1,
                  }}>
                    <input type="checkbox" checked={item.checked}
                      onChange={() => toggleItem(item.id)}
                      style={{ width: 16, height: 16, accentColor: C.sage, cursor: "pointer" }} />
                    <span style={{
                      fontFamily: FONT_SANS, fontSize: 14, color: C.oak,
                      textDecoration: item.checked ? "line-through" : "none",
                      flex: 1,
                    }}>
                      {item.name}
                    </span>
                    <span style={{
                      fontFamily: FONT_SANS, fontSize: 13, color: C.muted, fontWeight: 600,
                    }}>
                      {item.quantity > 0 ? item.quantity : ""} {item.unit}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── RecipeApp (root) ─────────────────────────────────────────────────────────
export default function RecipeApp() {
  const [recipes, setRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState({});
  const [shoppingList, setShoppingList] = useState([]);
  const [synced, setSynced] = useState(false);
  const remoteUpdate = useRef(false);

  const [view, setView] = useState("bibliotheque");
  const [weekOffset, setWeekOffset] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Firebase sync
  useEffect(() => {
    const unsub = onSnapshot(RECETTES_REF(), (snap) => {
      if (snap.exists()) {
        remoteUpdate.current = true;
        const d = snap.data();
        if (d.recipes !== undefined)      setRecipes(d.recipes);
        if (d.mealPlan !== undefined)     setMealPlan(d.mealPlan);
        if (d.shoppingList !== undefined) setShoppingList(d.shoppingList);
      }
      setSynced(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!synced) return;
    if (remoteUpdate.current) { remoteUpdate.current = false; return; }
    setDoc(RECETTES_REF(), { recipes, mealPlan, shoppingList });
  }, [recipes, mealPlan, shoppingList, synced]);

  // CRUD recettes
  const handleSaveRecipe = (recipe) => {
    setRecipes(prev => {
      const existing = prev.findIndex(r => r.id === recipe.id);
      if (existing >= 0) return prev.map(r => r.id === recipe.id ? recipe : r);
      return [...prev, recipe];
    });
  };
  const handleDeleteRecipe = (id) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
  };

  const handlePlanRecipe = () => {
    setView("planificateur");
    showToast("Choisissez un créneau dans le planificateur");
  };

  return (
    <div style={{
      background: C.cream, minHeight: "100%",
      fontFamily: FONT_SANS, padding: "4px 0 40px",
    }}>
      <style>{`
        @keyframes toastIn { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        input:focus, select:focus, textarea:focus {
          border-color: ${C.sage} !important;
          box-shadow: 0 0 0 2px rgba(122,158,126,0.15) !important;
          outline: none !important;
        }
      `}</style>

      <Toast msg={toast} />

      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          margin: "0 0 4px",
          fontFamily: FONT_SERIF, fontSize: 26, color: C.brown, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>✿</span>
          Ma Cuisine
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: C.muted, fontFamily: FONT_SANS }}>
          {recipes.length} recette{recipes.length !== 1 ? "s" : ""} dans la bibliothèque
          {!synced && " · ⏳ Connexion…"}
          {synced && " · ☁️ Synchronisé"}
        </p>
      </div>

      <RecipeSubNav view={view} setView={setView} />

      {view === "bibliotheque" && (
        <BibliothequeView
          recipes={recipes}
          onSave={handleSaveRecipe}
          onDelete={handleDeleteRecipe}
          onPlanRecipe={handlePlanRecipe}
          showToast={showToast}
        />
      )}

      {view === "planificateur" && (
        <PlanificateurView
          recipes={recipes}
          mealPlan={mealPlan}
          setMealPlan={setMealPlan}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          showToast={showToast}
        />
      )}

      {view === "courses" && (
        <ListeCoursesView
          recipes={recipes}
          mealPlan={mealPlan}
          shoppingList={shoppingList}
          setShoppingList={setShoppingList}
          weekOffset={weekOffset}
          showToast={showToast}
        />
      )}
    </div>
  );
}
