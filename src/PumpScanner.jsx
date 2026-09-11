import { useState, useCallback, useMemo } from "react";
import {
  scorerToken,
  normaliserPaireDexScreener,
  securiteDepuisRugcheck,
  TAUX_DE_BASE,
  SEUILS,
} from "./pumpScoring";

/**
 * Scanner pump.fun.
 *
 * Les données viennent du navigateur (DexScreener pour le marché, RugCheck
 * pour les autorisations et la concentration). Si RugCheck ne répond pas, les
 * contrôles de sécurité restent marqués "non vérifiés" — jamais "OK".
 */

const DEX = "https://api.dexscreener.com";
const RUGCHECK = "https://api.rugcheck.xyz/v1/tokens";

const VERDICT_STYLE = {
  "ÉVITER": { bg: "#FED7D7", text: "#C53030", bord: "#FC8181" },
  "NON VÉRIFIÉ": { bg: "#E2E8F0", text: "#4A5568", bord: "#CBD5E0" },
  "RISQUÉ": { bg: "#FEEBC8", text: "#C05621", bord: "#F6AD55" },
  "CORRECT": { bg: "#BEE3F8", text: "#2B6CB0", bord: "#90CDF4" },
  "SOLIDE": { bg: "#C6F6D5", text: "#276749", bord: "#9AE6B4" },
};

const fmtUsd = (v) =>
  v == null ? "—" : v >= 1e6 ? `${(v / 1e6).toFixed(1)} M$` : v >= 1e3 ? `${Math.round(v / 1e3)} k$` : `${Math.round(v)} $`;

const fmtAge = (ms) => {
  if (ms == null) return "—";
  const min = (Date.now() - ms) / 60000;
  if (min < 60) return `${Math.round(min)} min`;
  if (min < 1440) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} j`;
};

async function fetchJson(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/** Garde la paire la plus liquide par token, uniquement sur l'écosystème pump. */
function meilleuresPaires(pairs) {
  const parToken = new Map();
  for (const p of pairs || []) {
    const dex = (p.dexId || "").toLowerCase();
    if (!dex.includes("pump") && !dex.includes("raydium")) continue;
    if (p.chainId !== "solana") continue;
    const addr = p.baseToken?.address;
    if (!addr) continue;
    const actuel = parToken.get(addr);
    if (!actuel || (p.liquidity?.usd || 0) > (actuel.liquidity?.usd || 0)) parToken.set(addr, p);
  }
  return [...parToken.values()];
}

/** Enrichissement sécurité. Échec réseau => on renvoie {} (= non vérifié). */
async function chargerSecurite(mint) {
  try {
    return securiteDepuisRugcheck(await fetchJson(`${RUGCHECK}/${mint}/report`, 9000));
  } catch {
    return {};
  }
}

function Badge({ verdict }) {
  const s = VERDICT_STYLE[verdict] || VERDICT_STYLE["NON VÉRIFIÉ"];
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.bord}`, padding: "2px 9px", borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {verdict}
    </span>
  );
}

function Jauge({ score, verdict }) {
  const s = VERDICT_STYLE[verdict] || VERDICT_STYLE["NON VÉRIFIÉ"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 110 }}>
      <div style={{ flex: 1, height: 6, background: "#EDF2F7", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: s.text, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: s.text, width: 24, textAlign: "right" }}>{score}</span>
    </div>
  );
}

function ListePuces({ titre, items, couleur, icone }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#A0AEC0", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{titre}</div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((t, i) => (
          <li key={i} style={{ fontSize: 12, color: couleur, padding: "2px 0", display: "flex", gap: 6, lineHeight: 1.45 }}>
            <span style={{ flexShrink: 0 }}>{icone}</span><span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FicheToken({ item, ouvert, onToggle }) {
  const { token, analyse } = item;
  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, marginBottom: 8, background: "#fff", overflow: "hidden" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer", flexWrap: "wrap" }}>
        <div style={{ minWidth: 130, flex: "1 1 130px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1A202C" }}>
            {token.symbole || "?"}
            {token.graduated && <span style={{ marginLeft: 6, fontSize: 10, color: "#276749", fontWeight: 600 }}>gradué</span>}
          </div>
          <div style={{ fontSize: 11, color: "#A0AEC0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{token.nom}</div>
        </div>
        <Jauge score={analyse.score} verdict={analyse.verdict} />
        <Badge verdict={analyse.verdict} />
        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#718096", marginLeft: "auto", flexWrap: "wrap" }}>
          <span title="Liquidité">💧 {fmtUsd(token.liquidityUsd)}</span>
          <span title="Market cap">📊 {fmtUsd(token.marketCap ?? token.fdv)}</span>
          <span title="Volume 24h">🔄 {fmtUsd(token.volume?.h24)}</span>
          <span title="Âge">🕐 {fmtAge(token.pairCreatedAt)}</span>
        </div>
        <span style={{ fontSize: 11, color: "#CBD5E0" }}>{ouvert ? "▲" : "▼"}</span>
      </div>
      {ouvert && (
        <div style={{ borderTop: "1px solid #EDF2F7", padding: "14px", background: "#FAFBFC" }}>
          <ListePuces titre="Motifs d'exclusion" items={analyse.kills} couleur="#C53030" icone="⛔" />
          <ListePuces titre="Alertes" items={analyse.alertes} couleur="#C05621" icone="⚠️" />
          <ListePuces titre="Points favorables" items={analyse.points} couleur="#276749" icone="✓" />
          <ListePuces titre="Contrôles non effectués (à vérifier à la main)" items={analyse.inconnus} couleur="#718096" icone="?" />
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            {token.url && <a href={token.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#2B6CB0" }}>DexScreener ↗</a>}
            {token.mint && <a href={`https://rugcheck.xyz/tokens/${token.mint}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#2B6CB0" }}>RugCheck ↗</a>}
            {token.mint && <a href={`https://solscan.io/token/${token.mint}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#2B6CB0" }}>Solscan ↗</a>}
            {token.socials?.telegram && <a href={token.socials.telegram} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#2B6CB0" }}>Telegram ↗</a>}
            {token.socials?.twitter && <a href={token.socials.twitter} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#2B6CB0" }}>X ↗</a>}
          </div>
          {token.mint && <div style={{ fontSize: 10, color: "#CBD5E0", marginTop: 8, wordBreak: "break-all", fontFamily: "monospace" }}>{token.mint}</div>}
        </div>
      )}
    </div>
  );
}

function Referentiel() {
  const lignes = [
    ["Mort au jour du lancement", `${TAUX_DE_BASE.mortJour0} %`, "CoinGecko — 18,67 M de tokens (janv. 2024 → juin 2026)"],
    ["Morts à J0 ou J1", `${TAUX_DE_BASE.mortJour0ou1} %`, "Idem — 15,0 M de tokens"],
    ["Encore actifs après 90 jours", `${TAUX_DE_BASE.survie90j} %`, "Idem — 850 k tokens"],
    ["Taux de graduation", `${TAUX_DE_BASE.graduationBasse} % → ${TAUX_DE_BASE.graduationHaute} %`, "Kamat 2026 (833 k) / Marino et al. 2026 (656 k)"],
    ["Graduation avec Telegram annoncé", `${TAUX_DE_BASE.gradAvecTelegram} %`, `vs ${TAUX_DE_BASE.gradSansTelegram} % sans — lift ×${TAUX_DE_BASE.liftTelegram}`],
    ["Supply détenu par comptes coordonnés", `${TAUX_DE_BASE.supplyGroupeeMoyenne} % en moyenne`, "MELT — 41 k lancements, 200 M de transactions"],
  ];
  const seuils = [
    ["Supply bundlé / snipé", `> ${SEUILS.bundleMaxPct} %`, "Deployer + 3 snipers au-delà : le chart leur appartient"],
    ["Top 10 holders", `> ${SEUILS.top10MaxPct} %`, "Vente coordonnée possible"],
    ["Top 3 holders", `> ${SEUILS.top3MaxPct} %`, "Contrôle insider"],
    ["Détention dev", `> ${SEUILS.devMaxPct} %`, "Dump organisé probable"],
    ["Liquidité sur courbe", `< ${SEUILS.liqMinCurveUsd.toLocaleString("fr-FR")} $`, "Sortie à -10/-20 % de slippage"],
    ["Liquidité après migration", `< ${SEUILS.liqMinGradUsd.toLocaleString("fr-FR")} $`, "Idem, côté PumpSwap"],
    ["Trade moyen", `< ${SEUILS.tailleTradeMinUsd} $`, "Volume de bots, pas de capital réel"],
    ["Volume / market cap", `> ${SEUILS.volMcapChurnMax}`, "Rotation (churn), pas accumulation"],
    ["Âge", `< ${SEUILS.ageMinMinutes} min`, "Fenêtre où tombe la majorité des rugs"],
  ];
  const Table = ({ titre, rows, c1 }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1A202C", marginBottom: 8 }}>{titre}</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 480 }}>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #EDF2F7" }}>
                <td style={{ padding: "7px 10px 7px 0", color: "#4A5568" }}>{r[0]}</td>
                <td style={{ padding: "7px 10px", fontWeight: 700, color: c1, whiteSpace: "nowrap" }}>{r[1]}</td>
                <td style={{ padding: "7px 0", color: "#A0AEC0" }}>{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  return (
    <div>
      <Table titre="Taux de base — ce contre quoi tu joues" rows={lignes} c1="#C53030" />
      <Table titre="Seuils éliminatoires appliqués par le scanner" rows={seuils} c1="#C05621" />
      <p style={{ fontSize: 12, color: "#718096", lineHeight: 1.6, margin: 0 }}>
        Détail, sources et méthode : <code style={{ background: "#EDF2F7", padding: "1px 5px", borderRadius: 3 }}>docs/pump-fun-analyse.md</code>.
      </p>
    </div>
  );
}

export default function PumpScanner() {
  const [vue, setVue] = useState("scanner");
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [progression, setProgression] = useState("");
  const [ouvert, setOuvert] = useState(null);
  const [masquerEviter, setMasquerEviter] = useState(true);
  const [liqMin, setLiqMin] = useState(SEUILS.liqMinCurveUsd);
  const [adresse, setAdresse] = useState("");

  const analyser = useCallback(async (paires, avecSecurite) => {
    const tokens = meilleuresPaires(paires);
    const sortie = [];
    for (let i = 0; i < tokens.length; i++) {
      const mint = tokens[i].baseToken.address;
      if (avecSecurite) setProgression(`Contrôle sécurité ${i + 1}/${tokens.length}…`);
      const securite = avecSecurite ? await chargerSecurite(mint) : {};
      const token = normaliserPaireDexScreener(tokens[i], securite);
      sortie.push({ token, analyse: scorerToken(token) });
    }
    return sortie.sort((a, b) => b.analyse.score - a.analyse.score);
  }, []);

  const lancerScan = useCallback(async () => {
    setChargement(true); setErreur(null); setResultats([]); setOuvert(null);
    try {
      setProgression("Récupération des tokens récents…");
      const profils = await fetchJson(`${DEX}/token-profiles/latest/v1`);
      const adresses = (Array.isArray(profils) ? profils : [])
        .filter((p) => p.chainId === "solana" && p.tokenAddress)
        .map((p) => p.tokenAddress);

      if (!adresses.length) throw new Error("Aucun token Solana retourné par DexScreener");

      const paires = [];
      for (let i = 0; i < adresses.length; i += 30) {
        setProgression(`Chargement marché ${Math.min(i + 30, adresses.length)}/${adresses.length}…`);
        const lot = await fetchJson(`${DEX}/latest/dex/tokens/${adresses.slice(i, i + 30).join(",")}`);
        paires.push(...(lot?.pairs || []));
      }

      const analyses = await analyser(paires, true);
      if (!analyses.length) throw new Error("Aucun token de l'écosystème pump.fun dans le lot récupéré");
      setResultats(analyses);
    } catch (e) {
      setErreur(`${e.message}. Si l'erreur persiste : DexScreener limite à 60 requêtes/min sur les profils, réessaie dans une minute.`);
    } finally {
      setChargement(false); setProgression("");
    }
  }, [analyser]);

  const analyserAdresse = useCallback(async () => {
    const mint = adresse.trim();
    if (!mint) return;
    setChargement(true); setErreur(null); setResultats([]); setOuvert(0);
    try {
      setProgression("Marché…");
      const data = await fetchJson(`${DEX}/latest/dex/tokens/${mint}`);
      if (!data?.pairs?.length) throw new Error("Token introuvable sur DexScreener (pas encore de paire, ou adresse erronée)");
      setProgression("Contrôles de sécurité…");
      const analyses = await analyser(data.pairs, true);
      if (!analyses.length) throw new Error("Paires trouvées mais hors écosystème pump.fun / Raydium");
      setResultats(analyses);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false); setProgression("");
    }
  }, [adresse, analyser]);

  const affiches = useMemo(
    () => resultats.filter((r) =>
      (!masquerEviter || r.analyse.verdict !== "ÉVITER") &&
      (r.token.liquidityUsd ?? 0) >= liqMin),
    [resultats, masquerEviter, liqMin]
  );

  const stats = useMemo(() => {
    const c = { "ÉVITER": 0, "NON VÉRIFIÉ": 0, "RISQUÉ": 0, "CORRECT": 0, "SOLIDE": 0 };
    resultats.forEach((r) => { c[r.analyse.verdict] = (c[r.analyse.verdict] || 0) + 1; });
    return c;
  }, [resultats]);

  const S = {
    bouton: (actif) => ({ padding: "7px 14px", fontSize: 12, fontWeight: actif ? 700 : 500, color: actif ? "#fff" : "#4A5568", background: actif ? "#1A202C" : "#fff", border: "1px solid " + (actif ? "#1A202C" : "#E2E8F0"), borderRadius: 7, cursor: "pointer" }),
    input: { padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff" },
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 22 }}>🪙</span>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1A202C", letterSpacing: "-0.3px" }}>Scanner pump.fun</h2>
      </div>
      <p style={{ fontSize: 13, color: "#718096", margin: "0 0 16px 0", lineHeight: 1.6 }}>
        Filtre éliminatoire d'abord (honeypot, rug, bundle), score ensuite. Les seuils viennent des
        études listées dans l'onglet Référentiel — pas d'intuition maison.
      </p>

      <div style={{ background: "#FFFAF0", border: "1px solid #FBD38D", borderRadius: 8, padding: "10px 12px", marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: "#975A16", lineHeight: 1.6 }}>
          <strong>{TAUX_DE_BASE.mortJour0ou1} %</strong> des tokens pump.fun cessent d'être tradés à J0 ou J1 et{" "}
          <strong>{TAUX_DE_BASE.graduationBasse}–{TAUX_DE_BASE.graduationHaute} %</strong> seulement graduent.
          Un bon score signifie « moins mauvais que le reste du lot », pas « va monter ».
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {[["scanner", "Scanner le marché"], ["token", "Analyser une adresse"], ["ref", "Référentiel"]].map(([k, l]) => (
          <button key={k} onClick={() => setVue(k)} style={S.bouton(vue === k)}>{l}</button>
        ))}
      </div>

      {vue === "ref" && <Referentiel />}

      {vue === "token" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          <input
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyserAdresse()}
            placeholder="Adresse du mint Solana…"
            style={{ ...S.input, flex: "1 1 300px", fontFamily: "monospace", fontSize: 12 }}
          />
          <button onClick={analyserAdresse} disabled={chargement || !adresse.trim()} style={{ ...S.bouton(true), opacity: chargement || !adresse.trim() ? 0.5 : 1 }}>
            Analyser
          </button>
        </div>
      )}

      {vue === "scanner" && (
        <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={lancerScan} disabled={chargement} style={{ ...S.bouton(true), opacity: chargement ? 0.5 : 1 }}>
            {chargement ? "Analyse…" : "Lancer le scan"}
          </button>
          <label style={{ fontSize: 12, color: "#4A5568", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={masquerEviter} onChange={(e) => setMasquerEviter(e.target.checked)} />
            Masquer les « ÉVITER »
          </label>
          <label style={{ fontSize: 12, color: "#4A5568", display: "flex", alignItems: "center", gap: 6 }}>
            Liquidité min.
            <input type="number" value={liqMin} step={5000} min={0} onChange={(e) => setLiqMin(Number(e.target.value) || 0)} style={{ ...S.input, width: 100 }} />
            $
          </label>
        </div>
      )}

      {progression && <div style={{ fontSize: 12, color: "#718096", marginBottom: 12 }}>{progression}</div>}

      {erreur && (
        <div style={{ background: "#FED7D7", border: "1px solid #FC8181", borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 12, color: "#C53030", lineHeight: 1.6 }}>
          {erreur}
        </div>
      )}

      {resultats.length > 0 && vue !== "ref" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {Object.entries(stats).filter(([, n]) => n > 0).map(([v, n]) => (
              <span key={v} style={{ fontSize: 11, color: VERDICT_STYLE[v].text, background: VERDICT_STYLE[v].bg, padding: "3px 9px", borderRadius: 10, fontWeight: 700 }}>
                {n} {v}
              </span>
            ))}
            <span style={{ fontSize: 11, color: "#A0AEC0", marginLeft: "auto" }}>
              {affiches.length} affiché{affiches.length > 1 ? "s" : ""} sur {resultats.length}
            </span>
          </div>
          {affiches.map((item, i) => (
            <FicheToken key={item.token.mint || i} item={item} ouvert={ouvert === i} onToggle={() => setOuvert(ouvert === i ? null : i)} />
          ))}
          {affiches.length === 0 && (
            <div style={{ textAlign: "center", padding: 30, color: "#A0AEC0", fontSize: 13 }}>
              Tout le lot est filtré. C'est le résultat le plus fréquent — et généralement le bon.
            </div>
          )}
        </>
      )}

      {!chargement && resultats.length === 0 && !erreur && vue === "scanner" && (
        <div style={{ textAlign: "center", padding: 40, color: "#A0AEC0", fontSize: 13, border: "1px dashed #E2E8F0", borderRadius: 10 }}>
          Lance un scan pour récupérer les tokens pump.fun récents et les passer au filtre.
        </div>
      )}
    </div>
  );
}
