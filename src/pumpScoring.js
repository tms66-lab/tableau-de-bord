/**
 * Moteur de scoring pump.fun.
 *
 * Les seuils et les pondérations viennent des études recensées dans
 * docs/pump-fun-analyse.md. Aucune dépendance : ce module est testable seul
 * (node --input-type=module) et réutilisable hors React.
 *
 * Principe directeur : une donnée de sécurité ABSENTE n'est jamais traitée
 * comme une donnée RASSURANTE. Un token dont on ne peut pas vérifier les
 * autorités ou la concentration ressort en "NON VÉRIFIÉ", pas en "OK".
 */

/** Taux de base observés sur l'ensemble de la plateforme (cf. docs/). */
export const TAUX_DE_BASE = {
  mortJour0: 68.67,        // % des tokens dont le dernier trade tombe le jour du lancement
  mortJour0ou1: 80.37,     // % morts à J0 ou J1
  survie90j: 4.55,         // % encore actifs après 90 jours
  graduationBasse: 0.198,  // % (fenêtre mai-juin 2026, régime "rapide")
  graduationHaute: 0.63,   // % (fenêtre sept-oct 2025)
  gradAvecTelegram: 1.485, // % de graduation quand un Telegram est annoncé
  gradSansTelegram: 0.166, // % sans
  liftTelegram: 8.94,      // multiplicateur
  supplyGroupeeMoyenne: 36.5, // % du supply detenu par des comptes coordonnes (bundles)
};

/** Seuils opérationnels. Modifiables : le scoring les relit à chaque appel. */
export const SEUILS = {
  bundleMaxPct: 35,       // deployer + 3 snipers au-dessus => le chart leur appartient
  top10MaxPct: 25,        // concentration acceptable
  top3MaxPct: 20,         // au-dessus = contrôle insider
  devMaxPct: 20,          // supply dev + wallets liés
  liqMinCurveUsd: 30000,  // avant graduation
  liqMinGradUsd: 50000,   // après migration PumpSwap
  liqMcapMin: 0.06,       // liquidité / market cap
  volMcapChurnMax: 1.0,   // au-delà, rotation (churn) et non accumulation
  tailleTradeMinUsd: 15,  // en dessous = micro-trades bots
  ageMinMinutes: 15,      // la majorité des rugs tombent dans les 5-15 premières minutes
  ageJeuneJours: 2,       // en-dessous, la mortalité de base domine tout le reste
};

const VERDICTS = {
  EVITER: "ÉVITER",
  NON_VERIFIE: "NON VÉRIFIÉ",
  RISQUE: "RISQUÉ",
  CORRECT: "CORRECT",
  SOLIDE: "SOLIDE",
};

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pct = (part, tout) => (num(part) !== null && num(tout) && tout > 0 ? (part / tout) * 100 : null);

/* ------------------------------------------------------------------ */
/* 1. Sécurité : filtres éliminatoires                                 */
/* ------------------------------------------------------------------ */

/**
 * Contrôles rédhibitoires. Retourne les motifs d'exclusion (`kills`) et les
 * contrôles qu'on n'a PAS pu faire (`inconnus`).
 */
export function analyserSecurite(securite = {}) {
  const kills = [];
  const inconnus = [];
  const ok = [];

  const check = (valeur, libelleKill, libelleOk, libelleInconnu) => {
    if (valeur === true) kills.push(libelleKill);
    else if (valeur === false) ok.push(libelleOk);
    else inconnus.push(libelleInconnu);
  };

  check(securite.mintAuthority, "Mint authority active : le créateur peut imprimer du supply à volonté",
    "Mint authority révoquée", "Mint authority non vérifiée");
  check(securite.freezeAuthority, "Freeze authority active : mécanisme honeypot classique, tes tokens peuvent être gelés",
    "Freeze authority révoquée", "Freeze authority non vérifiée");
  check(securite.transferHook, "Extension Token-2022 (transfer hook / pausable) : la vente peut être bloquée côté programme",
    "Pas d'extension Token-2022 bloquante", "Extensions Token-2022 non vérifiées");

  if (securite.lpBurned === false) kills.push("LP ni burn ni lock : la liquidité peut disparaître à tout moment");
  else if (securite.lpBurned === true) ok.push("LP burn/lock");
  else inconnus.push("Statut LP non vérifié");

  const seuil = (valeur, max, libelle) => {
    const v = num(valeur);
    if (v === null) { inconnus.push(`${libelle} non vérifié`); return; }
    if (v > max) kills.push(`${libelle} à ${v.toFixed(1)}% (seuil ${max}%)`);
    else ok.push(`${libelle} ${v.toFixed(1)}%`);
  };

  seuil(securite.bundledPct, SEUILS.bundleMaxPct, "Supply bundlé/snipé");
  seuil(securite.top10Pct, SEUILS.top10MaxPct, "Top 10 holders");
  seuil(securite.top3Pct, SEUILS.top3MaxPct, "Top 3 holders");
  seuil(securite.devHoldPct, SEUILS.devMaxPct, "Détention dev");

  if (securite.devExited === true) kills.push("Le dev a déjà tout vendu / transféré sa position");
  if (securite.deployerSerialRug === true) kills.push("Deployer récidiviste : lancements précédents tous à zéro");

  return { kills, inconnus, ok };
}

/* ------------------------------------------------------------------ */
/* 2. Facteurs positifs                                                */
/* ------------------------------------------------------------------ */

/** Présence sociale — le prédicteur de graduation le plus fort des études. */
export function analyserSocial(socials = {}) {
  const points = [];
  let score = 0;
  if (socials.telegram) { score += 14; points.push(`Telegram annoncé (×${TAUX_DE_BASE.liftTelegram} sur le taux de graduation)`); }
  if (socials.twitter) { score += 7; points.push("Compte X/Twitter annoncé"); }
  if (socials.website) { score += 4; points.push("Site web annoncé"); }
  const manquants = [];
  if (!socials.telegram) manquants.push("pas de Telegram");
  if (!socials.twitter) manquants.push("pas de X/Twitter");
  if (!socials.website) manquants.push("pas de site");
  return { score, max: 25, points, manquants };
}

/** Profondeur de marché : peut-on sortir sans se faire massacrer au slippage ? */
export function analyserLiquidite({ liquidityUsd, marketCap, graduated }) {
  const points = [];
  const alertes = [];
  let score = 0;

  const liq = num(liquidityUsd);
  const mcap = num(marketCap);
  const seuilMin = graduated ? SEUILS.liqMinGradUsd : SEUILS.liqMinCurveUsd;

  if (liq === null) {
    alertes.push("Liquidité inconnue");
  } else if (liq < seuilMin) {
    alertes.push(`Liquidité ${Math.round(liq).toLocaleString("fr-FR")} $ sous le seuil de sortie propre (${seuilMin.toLocaleString("fr-FR")} $)`);
  } else {
    score += 10;
    points.push(`Liquidité ${Math.round(liq).toLocaleString("fr-FR")} $`);
    if (liq >= seuilMin * 3) { score += 4; points.push("Profondeur confortable"); }
  }

  const ratio = liq !== null && mcap ? liq / mcap : null;
  if (ratio === null) {
    alertes.push("Ratio liquidité/mcap incalculable");
  } else if (ratio < SEUILS.liqMcapMin) {
    alertes.push(`Liquidité = ${(ratio * 100).toFixed(1)}% du market cap : la valorisation ne tient pas au sol`);
  } else {
    score += 6;
    points.push(`Liquidité/mcap ${(ratio * 100).toFixed(1)}%`);
  }

  return { score, max: 20, points, alertes, ratioLiqMcap: ratio };
}

/**
 * Qualité du flux. L'étude Random Forest conclut que l'efficacité du capital
 * et la pression nette à l'achat pèsent plus que le NOMBRE de transactions :
 * quelques gros trades valent mieux que des centaines de micro-trades de bots.
 */
export function analyserFlux({ volume = {}, txns = {}, marketCap }) {
  const points = [];
  const alertes = [];
  let score = 0;

  const vol24 = num(volume.h24);
  const mcap = num(marketCap);

  // Pression nette à l'achat sur 1h puis 24h (fenêtre courte prioritaire).
  const fenetre = txns.h1 && (txns.h1.buys + txns.h1.sells) >= 20 ? txns.h1 : txns.h24;
  if (fenetre) {
    const total = (fenetre.buys || 0) + (fenetre.sells || 0);
    const partAchats = pct(fenetre.buys, total);
    if (partAchats === null) {
      alertes.push("Flux acheteurs/vendeurs indisponible");
    } else if (partAchats >= 55) {
      score += 10;
      points.push(`Pression acheteuse ${partAchats.toFixed(0)}% des trades`);
    } else if (partAchats >= 45) {
      score += 5;
      points.push(`Flux équilibré (${partAchats.toFixed(0)}% d'achats)`);
    } else {
      alertes.push(`Distribution en cours : ${(100 - partAchats).toFixed(0)}% de ventes`);
    }
  } else {
    alertes.push("Aucune transaction exploitable");
  }

  // Efficacité du capital : taille moyenne de trade.
  const nbTx24 = txns.h24 ? (txns.h24.buys || 0) + (txns.h24.sells || 0) : null;
  const tailleMoy = vol24 !== null && nbTx24 ? vol24 / nbTx24 : null;
  if (tailleMoy === null) {
    alertes.push("Taille moyenne de trade incalculable");
  } else if (tailleMoy < SEUILS.tailleTradeMinUsd) {
    alertes.push(`Trade moyen ${tailleMoy.toFixed(1)} $ : volume de bots, pas de capital réel`);
  } else {
    score += 6;
    points.push(`Trade moyen ${tailleMoy.toFixed(0)} $`);
  }

  // Churn : sur les micro-caps, vol/mcap > 1 signale la rotation, pas l'accumulation.
  const churn = vol24 !== null && mcap ? vol24 / mcap : null;
  if (churn !== null) {
    if (churn > SEUILS.volMcapChurnMax * 3) {
      alertes.push(`Volume = ${churn.toFixed(1)}× le market cap : rotation extrême (wash trading probable)`);
    } else if (churn > SEUILS.volMcapChurnMax) {
      alertes.push(`Volume = ${churn.toFixed(1)}× le market cap : churn, pas accumulation`);
    } else if (churn > 0.05) {
      score += 4;
      points.push(`Volume/mcap ${churn.toFixed(2)} — activité soutenue`);
    } else {
      alertes.push("Volume atone par rapport à la capitalisation");
    }
  }

  return { score, max: 20, points, alertes, churn, tailleMoyTrade: tailleMoy };
}

/** Survie et momentum : 80% des tokens meurent à J0/J1, l'âge est un filtre. */
export function analyserSurvie({ pairCreatedAt, priceChange = {} }, maintenant = Date.now()) {
  const points = [];
  const alertes = [];
  let score = 0;

  const ageMs = num(pairCreatedAt) ? maintenant - pairCreatedAt : null;
  const ageMin = ageMs !== null ? ageMs / 60000 : null;
  const ageJours = ageMin !== null ? ageMin / 1440 : null;

  if (ageMin === null) {
    alertes.push("Âge inconnu");
  } else if (ageMin < SEUILS.ageMinMinutes) {
    alertes.push(`${ageMin.toFixed(0)} min d'existence : la fenêtre où tombe la majorité des rugs`);
  } else if (ageJours < SEUILS.ageJeuneJours) {
    score += 3;
    points.push(`${ageJours < 1 ? `${ageMin.toFixed(0)} min` : "1 jour"} — encore dans la zone où ${TAUX_DE_BASE.mortJour0ou1}% meurent`);
  } else if (ageJours < 90) {
    score += 7;
    points.push(`${Math.round(ageJours)} jours : a passé le filtre J0/J1`);
  } else {
    score += 10;
    points.push(`${Math.round(ageJours)} jours : dans les ${TAUX_DE_BASE.survie90j}% qui dépassent 90 jours`);
  }

  // Décroissance du momentum : h6 et h24 négatifs = descente installée.
  const h6 = num(priceChange.h6);
  const h24 = num(priceChange.h24);
  if (h6 !== null && h24 !== null) {
    if (h6 < -25 && h24 < -40) alertes.push(`Chute installée (${h24.toFixed(0)}% sur 24h)`);
    else if (h6 > 0 && h24 > 0) { score += 5; points.push(`Tendance positive (${h24.toFixed(0)}% / 24h)`); }
  }

  return { score, max: 15, points, alertes, ageJours };
}

/* ------------------------------------------------------------------ */
/* 3. Score global                                                     */
/* ------------------------------------------------------------------ */

/**
 * Score un token normalisé.
 * @returns {{score:number, verdict:string, kills:string[], alertes:string[],
 *            points:string[], inconnus:string[], detail:object}}
 */
export function scorerToken(token = {}, maintenant = Date.now()) {
  const securite = analyserSecurite(token.securite);
  const social = analyserSocial(token.socials);
  const liquidite = analyserLiquidite({
    liquidityUsd: token.liquidityUsd,
    marketCap: token.marketCap ?? token.fdv,
    graduated: token.graduated,
  });
  const flux = analyserFlux({ volume: token.volume, txns: token.txns, marketCap: token.marketCap ?? token.fdv });
  const survie = analyserSurvie({ pairCreatedAt: token.pairCreatedAt, priceChange: token.priceChange }, maintenant);

  // Sécurité : 20 points, proportionnels aux contrôles réellement passés.
  const totalControles = securite.kills.length + securite.ok.length + securite.inconnus.length;
  const scoreSecurite = totalControles > 0 ? Math.round((securite.ok.length / totalControles) * 20) : 0;

  let score = Math.max(0, Math.min(100,
    scoreSecurite + social.score + liquidite.score + flux.score + survie.score));

  // Un motif d'exclusion plafonne le score : un honeypot bien liquide et bien
  // suivi sur X reste un honeypot, et doit finir en bas de n'importe quel tri.
  if (securite.kills.length > 0) score = Math.min(score, 15);

  const alertes = [...liquidite.alertes, ...flux.alertes, ...survie.alertes];
  const points = [...social.points, ...liquidite.points, ...flux.points, ...survie.points];

  let verdict;
  if (securite.kills.length > 0) verdict = VERDICTS.EVITER;
  else if (securite.inconnus.length >= 4) verdict = VERDICTS.NON_VERIFIE;
  else if (score >= 70) verdict = VERDICTS.SOLIDE;
  else if (score >= 50) verdict = VERDICTS.CORRECT;
  else verdict = VERDICTS.RISQUE;

  return {
    score,
    verdict,
    kills: securite.kills,
    inconnus: securite.inconnus,
    alertes,
    points,
    detail: { securite: { score: scoreSecurite, max: 20, ...securite }, social, liquidite, flux, survie },
  };
}

export { VERDICTS };

/* ------------------------------------------------------------------ */
/* 4. Normalisation DexScreener                                        */
/* ------------------------------------------------------------------ */

/** Convertit une paire DexScreener en token normalisé pour scorerToken(). */
export function normaliserPaireDexScreener(paire, securite = {}) {
  const socials = { twitter: null, telegram: null, website: null };
  for (const s of paire?.info?.socials || []) {
    const type = (s.type || "").toLowerCase();
    if (type.includes("twitter") || type.includes("x")) socials.twitter = s.url;
    if (type.includes("telegram")) socials.telegram = s.url;
  }
  if (paire?.info?.websites?.length) socials.website = paire.info.websites[0].url;

  const dexId = (paire?.dexId || "").toLowerCase();
  return {
    mint: paire?.baseToken?.address,
    symbole: paire?.baseToken?.symbol,
    nom: paire?.baseToken?.name,
    dexId,
    graduated: dexId.includes("pumpswap") || dexId.includes("raydium"),
    surCourbe: dexId.includes("pumpfun") || dexId.includes("pump.fun"),
    priceUsd: paire?.priceUsd ? Number(paire.priceUsd) : null,
    liquidityUsd: paire?.liquidity?.usd ?? null,
    marketCap: paire?.marketCap ?? null,
    fdv: paire?.fdv ?? null,
    pairCreatedAt: paire?.pairCreatedAt ?? null,
    volume: paire?.volume || {},
    txns: paire?.txns || {},
    priceChange: paire?.priceChange || {},
    url: paire?.url,
    socials,
    securite,
  };
}

/** Traduit un rapport RugCheck en bloc `securite`. Tolère les champs absents. */
export function securiteDepuisRugcheck(rapport) {
  if (!rapport || typeof rapport !== "object") return {};
  const risques = (rapport.risks || []).map((r) => (r.name || "").toLowerCase());
  const aRisque = (motif) => risques.some((r) => r.includes(motif));

  const topHolders = Array.isArray(rapport.topHolders) ? rapport.topHolders : null;
  const sommePct = (n) => (topHolders ? topHolders.slice(0, n).reduce((acc, h) => acc + (h.pct || 0), 0) : null);

  return {
    mintAuthority: rapport.token?.mintAuthority ? true : rapport.token ? false : null,
    freezeAuthority: rapport.token?.freezeAuthority ? true : rapport.token ? false : null,
    transferHook: risques.length ? aRisque("transfer") || aRisque("pausable") : null,
    lpBurned: typeof rapport.totalLPProviders === "number" || rapport.markets
      ? !aRisque("lp unlocked") && !aRisque("unlocked")
      : null,
    top10Pct: sommePct(10),
    top3Pct: sommePct(3),
    devHoldPct: typeof rapport.creatorBalancePct === "number" ? rapport.creatorBalancePct : null,
    bundledPct: null, // non fourni par RugCheck : reste à vérifier manuellement
  };
}
