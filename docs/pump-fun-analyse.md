# Pump.fun — ce qui fait pumper un token, ce qui le tue

Analyse des déterminants de réussite et d'échec des tokens pump.fun, et grille
de filtrage pour écarter honeypots, rugs et lancements truqués.

Ce document alimente le scanner de l'onglet **Pump.fun** du tableau de bord
(`src/pumpScoring.js` implémente les seuils décrits ici).

---

## 1. Méthode et périmètre

L'environnement d'exécution de cette session bloque toutes les APIs on-chain
(DexScreener, GeckoTerminal, pump.fun, Solscan, Birdeye, Helius, Bitquery,
RugCheck, RPC Solana — refus 403 de la politique d'egress). Un échantillonnage
direct de 300 tokens était donc impossible **depuis ici**.

L'analyse repose à la place sur les travaux publiés qui portent sur des
échantillons de 41 000 à 18,7 millions de lancements, soit plusieurs ordres de
grandeur au-dessus d'un échantillon de 300 — et sans le biais de sélection
qu'aurait produit un tirage manuel depuis une liste de tokens « tendance »,
qui ne montre par construction que les survivants.

La partie manquante — les données live — est couverte par le scanner : il
tourne dans le navigateur, où les APIs sont accessibles, et applique les
seuils ci-dessous à n'importe quel lot de tokens.

---

## 2. Contre quoi tu joues

| Mesure | Valeur | Source |
|---|---|---|
| Tokens dont le dernier trade tombe le jour du lancement | **68,67 %** (12,8 M) | CoinGecko, 18,67 M de tokens, janv. 2024 → juin 2026 |
| Morts à J0 ou J1 | **80,37 %** (15,0 M) | idem |
| Survivants > 2-3 jours | 770 249 | idem |
| Survivants 8-14 jours | 460 697 | idem |
| Encore actifs après 90 jours | **4,55 %** (850 180) | idem |
| Taux de graduation (sept.-oct. 2025) | **0,63 %** — 4 338 / 655 770 | Marino, Naviglio, Tarantelli & Lillo (arXiv 2602.14860) |
| Taux de graduation (mai-juin 2026) | **0,198 %** | Kamat (arXiv 2607.02823), 832 941 lancements |
| Part de la FDV cumulée captée par 12 tokens | **> 55 %** | ~0,00009 % des lancements |

Deux lectures en découlent.

**La distribution est un power law extrême.** Le résultat médian n'est pas
« petite perte », c'est zéro. Toute stratégie qui suppose un rendement moyen
positif sur un tirage aléatoire est fausse par construction.

**Le taux de graduation a été divisé par 3,18 en huit mois.** Ce n'est pas du
bruit : c'est un changement de régime. Les seuils calibrés sur les données 2024
ou 2025 sont périmés, ce qui justifie de raisonner en filtres éliminatoires
plutôt qu'en modèles de prédiction de hausse.

---

## 3. Ce qui fait pumper — facteurs classés par force de preuve

### 3.1 La présence sociale annoncée (effet le plus fort mesuré)

| Signal | Taux de graduation |
|---|---|
| Telegram annoncé dans les métadonnées | **1,485 %** |
| Pas de Telegram | **0,166 %** |
| Lift | **× 8,94** |

C'est le prédicteur le plus puissant identifié à grande échelle (832 941
lancements, analyse de survie Kaplan-Meier + Cox). X/Twitter et site web jouent
dans le même sens, plus faiblement.

**Nuance indispensable :** ×8,94 sur une base de 0,166 % donne 1,485 %. Le
meilleur signal connu laisse donc **98,5 % d'échec**. Il sert à écarter du bruit,
pas à sélectionner un gagnant.

**Nuance causale :** annoncer un Telegram ne fait pas monter un token. C'est un
proxy d'effort et d'organisation — quelqu'un qui a prévu un canal a prévu autre
chose. Un Telegram vide créé 30 secondes avant le lancement porte le signal
sans porter la cause. Le scanner crédite le lien ; à toi d'ouvrir le canal et
de regarder s'il y a des humains dedans.

### 3.2 La capitalisation initiale au-dessus du défaut

Deuxième prédicteur le plus fort de la même étude. Un déployeur qui met du
capital au lancement se distingue mécaniquement de celui qui spamme 200 tokens
par jour à coût nul.

### 3.3 La qualité du flux, pas son volume

L'analyse par Random Forest sur le jeu de données Solana Skill Sprint conclut
que **l'efficacité du capital et la pression nette à l'achat pèsent davantage
que le nombre de transactions**.

Concrètement : un token avec quelques trades de taille réelle a plus de chances
de graduer qu'un token avec des centaines de micro-trades. Des centaines de
transactions à 3 $ ne sont pas de la demande, c'est de l'occupation de chart.

Traduction en métriques :
- taille moyenne de trade = volume 24 h / nombre de transactions 24 h ;
- part des achats dans les trades sur fenêtre courte (1 h) ;
- volume / market cap : au-delà de 1 sur une micro-cap, c'est de la rotation, pas de l'accumulation.

### 3.4 Le SOL verrouillé dans la courbe

Chez Marino et al., la probabilité de graduation est conditionnée avant tout au
montant de SOL déjà bloqué dans la courbe. C'est la variable d'état principale :
le reste module cette probabilité de base.

### 3.5 Narratif, timing, KOL

Moins quantifié, mais convergent dans les sources praticiennes : concept
lisible en 1-2 mots, adossé à un moment culturel en cours, relayé par des
comptes à audience. Les endorsements KOL déplacent le prix quand ils
s'accompagnent de métriques réelles — sans quoi le mouvement retrace.

### 3.6 Avoir survécu à J0/J1

80,37 % de la mortalité est concentrée sur les deux premiers jours. L'âge est
en soi un filtre : un token de 10 jours a déjà passé l'éliminatoire qui tue
quatre tokens sur cinq.

---

## 4. Ce qui les tue

### 4.1 Le déployeur en série

L'économie dominante de la plateforme. Des clusters de wallets lancent,
manipulent et rugent à la chaîne :

- un déployeur identifié créait et rugait un token toutes les **2 min 30** ;
- les plus prolifiques ont extrait **plus de 30 M$** ;
- un wallet central relie **12+ wallets déployeurs**, métadonnées, appels de
  fonctions et intervalles de transaction quasi identiques ;
- les fonds circulent entre wallets **dans les 12 h** suivant la liquidation.

**Détection :** l'adresse du créateur sur Solscan. Plusieurs lancements
antérieurs tous à zéro = signal fort, et c'est le contrôle le plus rentable de
toute la liste parce qu'il se fait en trente secondes.

### 4.2 Les bundles et la concentration masquée

Sur 41 000 lancements et 200 M de transactions analysées (MELT), **36,5 % du
supply en moyenne est détenu par des comptes coordonnés** — des wallets
distincts pilotés par la même entité, précisément pour que la concentration
n'apparaisse pas dans une liste de holders.

Seuils :

| Métrique | Seuil d'exclusion |
|---|---|
| Deployer + 3 wallets snipers | > 35 % du supply |
| Top 3 holders | > 20 % (contrôle insider) |
| Top 10 holders | > 25 % |
| Détention dev + wallets liés | > 20 % |
| Top 5 holders | > 90 % (cas extrême) |

**Important :** un bundle au lancement n'est pas en soi un rug. C'est aussi une
protection anti-snipers utilisée par des équipes légitimes. Ce qui discrimine,
c'est **le comportement après** : des wallets bundle qui tiennent pendant que
la communauté se construit vont dans un sens ; des ventes multiples du même
wallet dans les minutes suivant le lancement vont dans l'autre.

Signature de sniping insider : plusieurs achats **dans le même bloc** ou à
quelques millisecondes d'écart. Sur Focai, 15 wallets insiders ont transformé
14 600 $ en plus de 20 M$ — un facteur 136 000.

### 4.3 La liquidité de migration

Un token qui gradue arrive souvent sur PumpSwap avec **10 000 à 15 000 $** de
liquidité pour une capitalisation de 80 k$ et plus. La profondeur ne suit pas
la valorisation, et la sortie devient impossible sans détruire le prix.

Seuils praticables : **30 000 $** de liquidité minimum sur courbe,
**50 000 $** après migration. En dessous, la sortie coûte 10 à 20 % de
slippage — sur une position gagnante, ça mange le gain ; sur une perdante, ça
double la perte.

### 4.4 Le volume fabriqué

**98 % des tokens pump.fun montrent des signes de manipulation.** Les patterns
de wash trading — achat et vente dans une même transaction, allers-retours
entre les mêmes wallets — gonflent le volume pour déclencher les scanners et
les bots de tendance. Un volume élevé sans croissance du nombre de holders est
un signal d'alerte, pas de traction.

### 4.5 La fenêtre temporelle du rug

La majorité des rugs tombent dans les **5 à 15 premières minutes**. Motif
typique : progression rapide de la courbe, puis inversion brutale, avec
plusieurs grosses ventes du même wallet.

### 4.6 Le dev qui sort

Un statut dev « fully exited » ou « transferred out » sur un token de quelques
heures est un signal terminal. Celui qui connaît le mieux le projet vient de le
quitter.

---

## 5. Honeypots : ce qui existe vraiment sur pump.fun

Le honeypot au sens EVM — tu achètes, tu ne peux pas vendre — est **plus rare
sur pump.fun que sur les launchpads EVM**, parce que la plateforme neutralise
deux vecteurs par défaut :

- **mint authority** mise à `null` à la création ;
- **LP tokens burn** à la graduation, ce qui rend le retrait de liquidité
  impossible.

Cela ne rend pas le blocage impossible, pour quatre raisons :

1. **Freeze authority non révoquée.** L'émetteur gèle le compte et les tokens
   ne bougent plus. C'est le mécanisme exact du cas BONKKILLER, où les
   acheteurs se sont retrouvés incapables de transférer quoi que ce soit.
2. **Extensions Token-2022.** `transferHook` et `pausable` permettent de
   bloquer les transferts — donc les ventes — au niveau du programme, sans
   toucher aux autorités classiques.
3. **Tokens hors flow standard.** Un token créé hors du parcours normal, ou
   migré manuellement, n'hérite pas des garanties par défaut. Certains tokens
   migrés conservent des autorités actives.
4. **LP non burn.** Si la LP n'est ni brûlée ni verrouillée, le rug reste
   possible à tout instant.

### Le vrai risque est économique, pas technique

Sur pump.fun, tu perds bien plus souvent par **rug économique** — un supply
concentré qui se déverse sur toi — que par blocage technique. C'est pour ça
que la grille ci-dessous pèse la distribution du supply autant que les
autorisations.

### Filtres éliminatoires

| Contrôle | Rejet si |
|---|---|
| Mint authority | active |
| Freeze authority | active |
| Extensions Token-2022 (`transferHook`, `pausable`) | présentes |
| LP | ni brûlée ni verrouillée |
| Supply bundlé / snipé | > 35 % |
| Top 10 holders | > 25 % |
| Top 3 holders | > 20 % |
| Détention dev | > 20 % |
| Dev | déjà sorti |
| Historique déployeur | lancements précédents à zéro |

**Règle de lecture du scanner :** une donnée de sécurité **absente** n'est
jamais traitée comme rassurante. Si RugCheck ne répond pas, le token ressort en
`NON VÉRIFIÉ`, pas en `OK`. C'est le point où la plupart des outils grand
public trompent leur utilisateur : une coche verte qui signifie en réalité
« pas testé ».

---

## 6. Grille opérationnelle

Dans cet ordre — les contrôles les moins chers en premier, pour éliminer vite.

**Éliminatoire (30 secondes, avant tout le reste)**
1. Mint et freeze authority révoquées ? Sinon, stop.
2. Extensions Token-2022 bloquantes ? Si oui, stop.
3. Historique du créateur sur Solscan : lancements antérieurs tous à zéro ? Stop.
4. Top 10 > 25 %, top 3 > 20 %, ou bundle > 35 % ? Stop.
5. Âge < 15 min ? Attendre — c'est la fenêtre des rugs.

**Profondeur (ta capacité à sortir)**

6. Liquidité ≥ 30 k$ sur courbe, ≥ 50 k$ après migration.
7. Liquidité / market cap ≥ 6 %.

**Qualité de la demande**

8. Taille moyenne de trade ≥ 15 $ (sinon volume de bots).
9. Part des achats ≥ 55 % sur 1 h.
10. Volume / market cap ≤ 1 (au-delà : rotation).
11. Croissance du nombre de holders cohérente avec le volume.

**Signaux positifs (une fois tout le reste passé)**

12. Telegram annoncé — et ouvert, pour vérifier qu'il est vivant.
13. X/Twitter et site.
14. Capitalisation initiale au-dessus du défaut.
15. Narratif lisible, adossé à un moment culturel réel.

Les étapes 1 à 11 sont du rejet. Seules 12 à 15 sont de la sélection. C'est la
bonne proportion : sur ce marché, l'essentiel du travail consiste à ne pas
entrer.

---

## 7. Pièges de lecture des statistiques ambiantes

**« 73,3 % des traders pump.fun ont fini avril 2026 en profit. »** Moyenne au
niveau des wallets sur la cohorte ayant tradé ce mois-là. Elle **exclut les
wallets qui ont cessé de trader après s'être fait effacer**, et n'est pas
pondérée par la taille des positions. Survivorship bias au sens strict.

**Les taux de graduation ne sont pas comparables entre eux.** Celui de Kamat
(0,198 %) provient d'un collecteur dont la couverture réelle était limitée à
environ **six minutes après chaque lancement** — l'auteur le documente en
corrigendum. C'est un taux « régime rapide » et une **borne basse** du vrai
taux à 24 h, pas une mesure équivalente à celle de Marino et al.

**Le lift Telegram est corrélationnel.** Voir §3.1.

**Les listes de tendance ne montrent que des survivants.** Échantillonner
« 300 tokens » depuis une page trending produit un taux de réussite apparent
qui n'a aucun rapport avec le taux réel. C'est exactement le biais que la
méthode retenue ici évite.

---

## 8. Ce que le scanner fait et ne fait pas

**Fait :** applique les filtres éliminatoires, calcule le score sur 100
(sécurité 20, social 25, liquidité 20, flux 20, survie 15), trie, et affiche
explicitement la liste des contrôles qu'il n'a **pas** pu effectuer.

**Ne fait pas :** la détection de bundles. Elle demande de reconstruire les
graphes de financement entre wallets — les données MELT montrent que c'est
là que se cache 36,5 % du supply en moyenne. RugCheck ne l'expose pas ; le
champ reste à `null` et sort en « non vérifié ». C'est le contrôle manuel
le plus important restant, via un outil de détection de bundles dédié.

**Ne fait pas non plus :** prédire une hausse. Un score élevé signifie « moins
mauvais que le reste du lot sur des critères mesurables », ce qui n'est pas la
même chose. Les taux de base du §2 restent la référence : appliquer des filtres
sur des modèles entraînés réduit la perte d'environ **56 %** dans l'étude MELT
— une réduction de perte, pas une espérance de gain.

Ceci est une analyse de données, pas un conseil d'investissement. L'espérance
de gain d'un tirage aléatoire sur ce marché est négative ; les filtres la
rendent moins négative.

---

## 9. Sources

**Travaux académiques**
- Marino G., Naviglio M., Tarantelli F., Lillo F. — *Predicting the success of new crypto-tokens: the Pump.fun case*, arXiv [2602.14860](https://arxiv.org/abs/2602.14860) — 655 770 tokens, 4 338 graduations
- Kamat A. U. — *Pump.fun Graduation Regime Windows: Survival Analysis of 832,941 Token Launches and the Social-Presence Effect*, arXiv [2607.02823](https://arxiv.org/abs/2607.02823) — jeu de données sous CC-BY-4.0, DOI 10.5281/zenodo.20633486
- *MELT / MemeTrans: A Behavioral Trace Dataset for High-Risk Memecoin Launch Detection*, arXiv [2602.13480](https://arxiv.org/abs/2602.13480) — 41 k lancements, 200 M transactions, 122 features
- *The Memecoin Phenomenon: An In-Depth Study of Solana's Blockchain Trends*, arXiv [2512.11850](https://arxiv.org/pdf/2512.11850)

**Études de marché**
- CoinGecko — [The Average Lifespan of Pump.fun Memecoins Is Less Than a Day](https://www.coingecko.com/research/publications/average-lifespan-of-pumpfun-tokens)
- Crypto Briefing — [Only 5% of Pump.fun tokens survive past 90 days](https://cryptobriefing.com/pump-fun-token-survival-rate-study/)
- crypto.news — [Pump.fun's token factory has a 69% launch-day death rate](https://crypto.news/pump-funs-token-factory-has-a-69-launch-day-death-rate-coingecko/)

**Sécurité et détection**
- Helius — [How to Find Solana Mint, Freeze, and Update Authority](https://www.helius.dev/docs/orb/explore-authorities)
- RugCheck — [rugcheck.xyz](https://rugcheck.xyz/)
- DeFade — [The pump.fun Safety Checklist](https://defade.org/blog/pump-fun-token-safety-checklist)
- Flintr — [Anatomy of a rug pull: identify scams on Pump.fun](https://www.flintr.io/articles/anatomy-of-a-rug-pull-identify-scams-on-pumpfun)
- Medium — [Serial Rug Deployers on Pump.fun](https://medium.com/@abubakarabdulfattah120/serial-rug-deployers-on-pump-fun-a-deep-dive-into-solanas-meme-coin-laundromat-a57ddda190cc)
- Solidus Labs — [Solana Rug Pulls & Pump-and-Dumps](https://www.soliduslabs.com/reports/solana-rug-pulls-pump-dumps-crypto-compliance)

**Plateforme**
- Pump.fun — [documentation bonding curve](https://pump.fun/docs/bonding-curve)
- CoinMarketCap — [Pump.fun Overhauls Creator Fees Amid Launch Spike](https://coinmarketcap.com/academy/article/pumpfun-overhauls-creator-fees-amid-launch-spike) — refonte des frais créateurs, janvier 2026
- DexScreener — API publique, 300 req/min sur les endpoints tokens et paires
