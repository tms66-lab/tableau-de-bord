# Propositions informatiques pour un garage

Catalogue de propositions orientées informatique, digitalisation et automatisation, tiré de la réunion du 26 octobre 2026 entre ingénieurs méthodes et garagistes.
Les outils sont cités **à titre d'exemples** ; les gains et coûts sont des ordres de grandeur à vérifier chez chaque client.

## Principes à annoncer au garagiste

- **On part de son logiciel garage (DMS)**, on ne le remplace pas. Première étape : un audit d'une demi-journée.
- **Pas de double saisie** : une information est saisie une fois, au bon endroit, et tout le reste en découle.
- **Outils utilisables avec les mains sales** : tablette dans l'atelier, gros boutons, peu de texte à taper.
- **Moins de 30 minutes de formation** par outil, sinon c'est mal conçu.
- **Phase 1 de 4 semaines**, puis go / no go sur des indicateurs mesurés.

---

## 1. Diagnostic et socle

| # | Proposition | Problème résolu | Exemples d'outils | Effort |
|---|---|---|---|---|
| 1.1 | **Audit du logiciel garage** : exports possibles (clients, téléphones, OR, factures), statuts d'OR, modèles de devis, API, modules non activés | Logiciel utilisé à 20 %, payé à 100 % | Le DMS du client | ½ journée |
| 1.2 | **Audit du parc informatique** : postes, Wi-Fi atelier, imprimantes, comptes, licences | Matériel lent, Wi-Fi absent de l'atelier | — | ½ journée |
| 1.3 | **Wi-Fi couvrant l'atelier + tablette durcie** par zone | Impossible d'utiliser un outil numérique au pont | Bornes Wi-Fi pro, tablette avec coque renforcée | 1 jour |

## 2. Téléphone et relation client

| # | Proposition | Problème résolu | Exemples d'outils | Gain estimé |
|---|---|---|---|---|
| 2.1 | **Standard téléphonique virtuel** : menu « 1 = véhicule chez nous, 2 = rendez-vous », messages transcrits par SMS ou mail, créneaux de rappel fixes | Téléphone qui sonne sous la voiture, clients perdus | Ringover, Aircall, OnOff, offre VoIP de l'opérateur | La majorité des interruptions ; 30 à 50 € par mois |
| 2.2 | **SMS d'avancement automatiques** déclenchés par le changement de statut de l'OR : « attente expert », « pièce reçue », « réparation demain », « prête » | Appels « Où en est ma voiture ? » | Module SMS du DMS, ou Brevo / Twilio via Make ou Zapier | 2 à 4 h de téléphone par semaine |
| 2.3 | **Rappels de rendez-vous, relance de devis non signés, rappel d'entretien et de contrôle technique** | Rendez-vous oubliés, devis perdus, clients qui ne reviennent pas | Même chaîne que 2.2 | Devis signés et visites en plus |
| 2.4 | **Prise de rendez-vous en ligne** limitée à la capacité réelle, par type de prestation | Interruptions à l'accueil | Module du DMS, ou outil de réservation connecté à l'agenda | 1 à 3 h par semaine ; seulement si la clientèle s'y prête |
| 2.5 | **Fiche Google Business Profile à jour + demande d'avis automatique** après chaque facture | Visibilité locale faible, peu d'avis | Google Business Profile, SMS post-facture | Plus d'avis, meilleur référencement local |

## 3. Atelier et planning numériques

| # | Proposition | Problème résolu | Exemples d'outils | Gain estimé |
|---|---|---|---|---|
| 3.1 | **Planning numérique sur écran dans l'atelier** (ponts × créneaux, ligne cabine de peinture), synchronisé avec le DMS ou alimenté par la tablette | Planning dans la tête du patron, Excel abandonné | Planning du DMS, ou application no-code (AppSheet, Glide, Airtable) | 10 à 15 % de voitures bloquées en moins |
| 3.2 | **Changement de statut en un clic depuis la tablette** par le mécano ou le chef d'atelier, avec motif de blocage (pièce, expert, client) | Imprévus invisibles | Même application que 3.1 | Blocages visibles le jour même ; déclenche les SMS de 2.2 |
| 3.3 | **Réservation de la cabine de peinture** dans le planning, avec règles de priorité intégrées | Conflits carrosserie / mécanique | Même application que 3.1 | 1 à 2 passages de cabine en plus par semaine |
| 3.4 | **Suivi des voitures de courtoisie** : véhicule, client, sortie, retour prévu, kilométrage, alertes de retard | On ne sait pas quelle voiture est où | Application no-code ou module du DMS | Fin des recherches et des retards non vus |
| 3.5 | **Liste des pièces à vérifier la veille**, générée automatiquement à partir des rendez-vous du lendemain | Voiture démontée qui attend sa pièce | Export DMS + automatisation | 1 à 2 jours d'immobilisation en moins par mois et par pont |

## 4. Administratif et automatisation

| # | Proposition | Problème résolu | Exemples d'outils | Gain estimé |
|---|---|---|---|---|
| 4.1 | **Devis pré-remplis** par prestation courante, avec recherche par plaque d'immatriculation | Devis faits le soir jusqu'à 21h | Modèles du DMS, catalogue pièces connecté | 2 à 3 h par semaine |
| 4.2 | **Relances automatiques des experts d'assurance** : mail à J+3, alerte au gérant à J+7 | Véhicules bloqués en attente d'expertise | Make ou Zapier + boîte mail, ou suivi dans le DMS | Expertises plus rapides, moins d'oublis |
| 4.3 | **Relance automatique des factures impayées** | Trésorerie, relances oubliées | Module du DMS ou du logiciel comptable | Moins d'impayés |
| 4.4 | **Stock minimum suivi dans le logiciel** avec alerte de réapprovisionnement | Ruptures et commandes urgentes | Gestion de stock du DMS, ou tableau partagé | Moitié moins de commandes urgentes |
| 4.5 | **Mise en conformité facturation électronique** : depuis le 1er septembre 2026, toute entreprise doit pouvoir **recevoir** ses factures électroniques ; les PME devront les **émettre** à partir du 1er septembre 2027 (clients pros, flottes, assureurs) | Obligation légale, risque de pénalités | Plateforme agréée choisie avec le comptable, compatibilité du DMS | Conformité + fin des factures fournisseurs papier |

## 5. Pilotage par les données

| # | Proposition | Problème résolu | Exemples d'outils | Gain estimé |
|---|---|---|---|---|
| 5.1 | **Tableau de bord d'une page**, mis à jour automatiquement : devis en attente, impayés, pièces commandées non reçues, véhicules bloqués | Informations éparpillées | Looker Studio, Power BI, ou tableau Google Sheets connecté | Environ 1 h par semaine |
| 5.2 | **Pointage des heures par OR sur tablette** (début / fin) | Heures passées inconnues | Module du DMS ou application no-code | Base de calcul de la rentabilité |
| 5.3 | **Rentabilité mensuelle par activité** : carrosserie vs mécanique (CA, marge pièces, heures facturées / heures passées) | Pilotage « au feeling » | Même outil que 5.1 | Savoir quelle activité gagne ou perd de l'argent |

## 6. Savoir-faire et sécurité

| # | Proposition | Problème résolu | Exemples d'outils | Effort |
|---|---|---|---|---|
| 6.1 | **Base de connaissances vidéo** : l'apprenti filme les diagnostics d'un ancien (30 s), classés par symptôme et par marque, consultables sur la tablette | Départ en retraite d'un mécano qui a tout « dans la tête » | Google Drive ou SharePoint avec arborescence par symptôme | 40 à 60 vidéos par an, zéro temps d'ordinateur pour l'ancien |
| 6.2 | **Sauvegardes automatiques** du DMS et des documents (règle 3-2-1 : 3 copies, 2 supports, 1 hors site), testées | Perte de données = garage à l'arrêt | NAS + sauvegarde cloud | 1 jour + abonnement |
| 6.3 | **Sécurité de base** : mots de passe, double authentification sur la messagerie et le DMS, mises à jour, antivirus, sensibilisation au phishing | Rançongiciel, piratage de messagerie | Recommandations cybermalveillance.gouv.fr | ½ à 1 journée |
| 6.4 | **Conformité RGPD des fichiers clients et des SMS** : SMS de service (statut, rendez-vous) autorisés, SMS commerciaux uniquement avec consentement | Risque juridique, désinscriptions | Case de consentement dans le DMS | ½ journée |

---

## Offres groupées

| Offre | Pour qui | Contenu | Critère go / no go à 4 semaines |
|---|---|---|---|
| **Démarrage numérique** | Petit garage, budget serré | 1.1 + 2.1 + 2.2 + 6.2 | Appels décrochés sous le pont divisés par deux ; sauvegarde testée |
| **Atelier connecté** | Planning dans la tête du patron | 1.3 + 3.1 + 3.2 (+ 3.3, 3.4 si cabine et voitures de courtoisie) | Statuts mis à jour par l'équipe, pas par le patron |
| **Zéro paperasse** | Gérant qui fait l'administratif le soir | 4.1 + 4.2 + 4.3 + 4.5 | Heures de soirée en baisse ; facturation électronique opérationnelle |
| **Pilotage** | Après une phase 1 réussie | 5.1 + 5.2 + 5.3 | Première page mensuelle de rentabilité exploitée |
| **Pérennité** | Tous les garages | 6.1 + 6.2 + 6.3 + 6.4 | Sauvegarde restaurée avec succès ; double authentification activée |

Ordre de grandeur évoqué en réunion : 3 à 6 k€ pour un petit garage, 8 à 15 k€ pour un garage de 12 salariés sur 4 à 8 semaines, hors abonnements (téléphonie, SMS, sauvegarde). À ajuster selon ta grille tarifaire.
