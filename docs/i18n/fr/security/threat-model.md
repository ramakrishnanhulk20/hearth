# Modèle de menaces

Neuf attaquants, ce que chacun veut, ce qui l'arrête, et ce qui ne l'arrête pas. La dernière
rubrique est celle qui vaut la peine d'être lue. Un modèle de menaces qui ne liste que des
défenses est du marketing.

Les contrats centraux de Hearth sont immuables une fois déployés. Il n'y a ni proxy ni chemin
de mise à jour, donc rien sur cette page ne peut être changé après coup autrement qu'en
déployant un nouveau pool.

**Chaque pool est isolé.** Les sept pools sur Sepolia sont sept déploiements séparés du même
code, un par jeton confidentiel, et ils ne partagent ni stockage, ni solde, ni registre. Un
pool ne détient que son propre jeton, ne finance que son propre coffre et n'est piloté que
par son propre compte keeper : un bogue dans le wrapper d'un jeton, un propriétaire qui met
un coffre en pause ou un keeper qui s'arrête ne peuvent donc atteindre ni les épargnants ni
l'argent des lots d'un autre pool. Ce qui suit décrit un pool, et s'applique à chacun des
sept pris séparément.

## 1. Un observateur curieux

Quelqu'un avec un nœud d'archive, un explorateur de blocs et du temps. Pas de capital, pas
d'accès privilégié.

**Veut :** savoir qui a épargné combien, qui a les meilleures chances, et qui a gagné chaque
tirage.

**Arrêté par :** chaque valeur personnelle est un chiffré. Le principal, les gains, le poids
par tirage et le crédit par tirage ne sont lisibles que par l'épargnant à qui ils
appartiennent, ce que fait respecter la liste de contrôle d'accès de Zama, qui pousse le
relayer à refuser une demande de déchiffrement venant de toute autre adresse. Il n'y a pas
de transaction de réclamation à guetter, et l'évaluation ne peut pas être dirigée vers
soi-même : aucune transaction n'existe donc que seul un gagnant enverrait. Gagnants et
perdants reçoivent des écritures identiques dans le même lot, parce que le paiement est une
sélection chiffrée plutôt qu'un branchement, si bien que la forme des transactions et les
coûts en gaz coïncident.

**Une fuite que cette conception a supprimée.** Une version antérieure publiait le solde
total exact pondéré par le temps du pool à chaque tirage. Avec ce nombre public sur deux
périodes consécutives, et l'horodatage public de la propre transaction d'un épargnant, un
épargnant qui a été le seul à bouger de l'argent sur une période voyait ce montant retrouvé
exactement, pas borné. Le coffre ne publie désormais que la tranche en puissance de deux
au-dessus du total, suivie par cinq comparaisons chiffrées par tirage, et l'équation n'a
plus rien à résoudre. L'énoncé complet est la règle 1 de
[ce qui reste privé](what-stays-private.md).

**Arrêté par rien du tout :**

- La liste des épargnants, et le bloc où chacun a déposé, retiré ou été évalué.
- La tranche dans laquelle le total du pool est tombé, qui, avec moins de trois épargnants,
  fixe le poids d'un épargnant à un facteur deux près. Voir la règle de l'ensemble
  d'anonymat dans [ce qui reste privé](what-stays-private.md).
- **Un solde que l'observateur peut identifier a un résultat public à chaque tirage.** Les
  seuils sont publics par conception, et le test du gagnant est une fonction déterministe
  d'un seul secret et par ailleurs de données publiques. Enveloppez 1,000 USDC et déposez
  1,000 USDC quelques secondes plus tard, et chacun de vos gains et de vos échecs, dans
  chaque palier, à chaque tirage à partir de là, est de l'arithmétique publique.
- **Les gains cumulés sont une borne inférieure publique** pour une adresse qui enveloppe à
  l'entrée et désenveloppe entièrement à la sortie, parce que les deux mouvements sont
  publics à la couche jeton.
- **Un solde statique est resserré lentement.** Les comptes de lots publiés sont une petite
  mesure de la distribution des soldes et ils s'accumulent contre un épargnant dont le solde
  ne change jamais. Chaque palier publie son compte un tirage plus tard, donc la mesure
  tourne une fois par palier et par tirage. La cadence qui la ralentirait est un bouton de
  constructeur que ce déploiement a réglé sur un, parce que c'est la même étape qui rend
  l'argent non gagné à la réserve publique et garde le gros lot visible. Limite 14.
- Le résidu comportemental : ne retirer qu'après les tirages gagnés, sur de nombreux tirages.

## 2. Une baleine

Quelqu'un avec beaucoup de capital qui veut des chances à bas prix.

**Veut :** capter des lots sans laisser d'argent dans le pool, ou exploiter les mécanismes.

**Arrêté par :**

- **La pondération temporelle.** Les chances viennent du solde moyen sur toute la période.
  Un dépôt fait à 6 minutes de la fin d'une période d'une heure rapporte un dixième des
  chances du même montant détenu toute la période. C'est la défense qui manquait à notre
  conception précédente, et l'attaque qu'elle permet a été exécutée : un attaquant faisant
  tourner 9,000 USDC autour de chaque tirage a gagné 19 tirages sur 20 et vidé une réserve
  de 5,000 USDC.
- **La linéarité.** Les lots attendus sont exactement proportionnels au poids, et la tranche
  contre laquelle le tirage tourne ne dépend pas de la façon dont le poids du pool est
  réparti entre les adresses. Découper un portefeuille en six ne rapporte rien, et en
  regrouper six en un seul non plus.
- **Le plafond par épargnant.** Les dépôts sont refusés quand le montant, ou le principal
  résultant, dépasse `(2^64 - 1) / L`, et le refus est chiffré, donc il ne divulgue rien.
  Borner le montant en plus du total est ce qui empêche l'addition chiffrée du contrôle de
  déborder.

**Pas arrêté :**

- Une baleine qui détient réellement un gros solde toute la période gagne souvent. C'est le
  produit, pas une attaque : son argent a produit le rendement qui a payé les lots.
- Les chances du palier gros lot sont mesurées sur une seule période, donc une baleine qui
  se présente pour une seule période prend une chance pleinement proportionnelle sur une
  réserve qui a mis 24 périodes à se constituer. C'est un écart assumé par rapport à
  PoolTogether V5 et c'est la limite 5.

## 3. Un nuisible qui inscrit de faux épargnants

Quelqu'un qui ajoute de nombreuses adresses sans valeur à la liste des épargnants.

**Veut :** bloquer les tirages, diluer les chances, ou rendre le pool cher à faire tourner.

L'inscription est ouverte par construction. Le crochet de dépôt ne peut pas voir le montant
chiffré qu'on lui a remis, donc toute adresse qui le déclenche rejoint la liste des
épargnants, même avec un zéro chiffré, et la liste n'est jamais élaguée.

**Arrêté par :**

- **Les chances sont intactes.** Un épargnant sans solde a un poids nul. Un poids nul ne
  peut battre aucun seuil, et il ne contribue en rien au total : les chances de chaque vrai
  épargnant sont donc exactement celles qu'elles seraient sans les faux. Notre conception
  précédente avait besoin d'une caution d'inscription pour cela. Celle-ci n'en a pas besoin.
- **L'évaluation ne peut pas être engorgée.** Un épargnant déjà évalué pour un tirage, une
  adresse qui n'est pas épargnante, et un épargnant dont la première observation est
  postérieure à la période sont tous sautés sans échec, et le saut est décidé à partir
  d'horodatages en clair, sans coût chiffré. Une mauvaise entrée ne peut pas faire échouer
  un lot.
- **Les lots sont plafonnés** à `4` épargnants demandant du travail chiffré par appel,
  aucune transaction unique ne peut donc être poussée au-delà de la limite de calcul de
  Zama.

**Pas arrêté :** le coût du keeper par tirage grandit avec la liste des épargnants, qui ne
fait que s'allonger. Un nuisible ne peut changer les chances de personne, mais il peut
rendre coûteuse l'évaluation de tout le monde. La réponse du keeper est un plafond de frais,
pas un budget. `KEEPER_MAX_FEE_GWEI` le fait rester à l'écart pendant tout un cycle tant que
les frais du réseau dépassent le plafond (`gasIsAffordable` dans
`packages/keeper/src/keeper.ts`), et sous le plafond il continue d'envoyer jusqu'à ce que le
curseur atteigne la fin du parcours. Les épargnants sans observation antérieure à la période
sont sautés à partir d'horodatages en clair, sans coût chiffré : gonfler la liste coûte donc
du gaz au keeper plutôt que leurs lots aux épargnants. Rien sur la chaîne ne plafonne
l'évaluation, la conséquence honnête est donc que si le gaz reste au-dessus du plafond dans
un pool lourdement pollué, le parcours peut ne pas atteindre tous les vrais épargnants dans
la fenêtre. Deux choses adoucissent cela. Le parcours démarre à un point différent à chaque
tirage, dérivé de la graine de ce tirage, donc personne n'est systématiquement dernier. Et
n'importe qui peut faire avancer le parcours davantage depuis l'application, ce qui coûte du
gaz et ne révèle rien sur qui demande. Voir
[la page du keeper](../operations/keeper.md).

## 4. Un keeper paresseux ou hostile

L'adresse qui pousse habituellement les tirages. La nôtre, ou celle de quelqu'un d'autre.

**Veut :** sauter un tirage qu'il n'a pas gagné, choisir l'ordre dans lequel les épargnants
sont payés, ou simplement arrêter de travailler.

**Arrêté par :**

- **Chaque étape est ouverte à tous.** Clôturer, attribuer, évaluer, finaliser et
  réconcilier peuvent être appelés par n'importe qui, y compris par tout épargnant depuis
  l'application. Un keeper qui refuse d'attribuer un tirage ne peut pas le faire
  disparaître ; quelqu'un d'autre l'attribue.
- **Le keeper ne peut pas choisir qui est évalué.** `evaluate(drawId, count)` prend un
  nombre, pas une liste. L'ordre du parcours est fixé par la graine du tirage, donc le
  keeper ne peut pas se placer lui-même ou placer un ami en tête dans un palier sursouscrit,
  et il ne peut pas laisser un épargnant précis de côté.
- **Une clôture tardive est refusée, pas tolérée.** La clôture doit arriver avant
  `closeDeadline(p)`, le milieu de la seconde période de la fenêtre. Une clôture au dernier
  bloc de la fenêtre n'aurait laissé aucune place à l'aller-retour de déchiffrement et aurait
  bloqué le tirage définitivement. Désormais, cette transaction échoue tout simplement. Un
  tirage dont la clôture n'est jamais arrivée reste non clôturé pour toujours : sa liquidité
  n'a jamais été déplacée, il n'y a donc rien à rendre et rien à finaliser.
- **Un tirage sauté ne coûte rien.** Une liquidité jamais offerte reste dans son palier et
  est offerte de nouveau. Une attribution tardive comptabilise quand même la récolte, rend
  quand même la liquidité offerte aux paliers, et marque le tirage `Skipped`. Cette période
  ne paie aucun lot, et aucun argent n'est perdu ni bloqué.
- **Le keeper ne peut pas changer une issue.** La désignation des gagnants est fixée à
  l'instant où la graine et la tranche sont vérifiées. L'évaluation écrit un résultat qui
  existe déjà.

**Testé par accident, le 3 septembre 2026.** Le démon pm2 est mort avec le processus de
terminal qui l'avait lancé, à 03:45 UTC, et personne ne s'en est aperçu avant 04:52 : le
keeper est donc resté arrêté 67 minutes. Au redémarrage, il a finalisé le tirage 4
immédiatement et clôturé le tirage 6 à 04:53. La période 6 s'était terminée à 04:00, cette
clôture avait donc 53 minutes de retard face à une échéance de 05:30, le milieu de la
deuxième période suivante. Aucun tirage n'a été perdu, aucune liquidité n'a été bloquée, et
personne n'a eu à intervenir au-delà du redémarrage du processus. C'est l'affirmation « un
keeper à l'arrêt coûte des tirages, jamais de l'argent » de [la FAQ](../faq.md) et des
points ci-dessus, éprouvée pour de vrai plutôt qu'argumentée.

**Pas arrêté :**

- Une fois la graine et la tranche publiques, celui qui s'apprête à appeler `awardDraw` peut
  d'abord calculer son propre résultat et décider si cela vaut la peine. L'attribution est
  ouverte à tous et l'application la propose à n'importe qui, c'est donc une gêne plutôt
  qu'une censure, mais c'est réel et c'est dit.
- Si absolument personne n'agit dans la fenêtre de deux périodes, ce tirage ne paie rien.

## 5. Le propriétaire du pool

Nous. L'adresse qui a déployé les contrats.

**Veut :** énuméré ici pour qu'un épargnant n'ait pas à deviner.

**Pouvoirs, en entier :**

| Pouvoir | Limite |
| --- | --- |
| Mettre en pause | Arrête les dépôts et la clôture des tirages. N'arrête jamais les retraits, l'évaluation, l'attribution, la finalisation ni la réconciliation. |
| Régler la source de rendement | Émet `YieldSourceSet`. Ne peut affecter aucun solde existant. |
| Sauver des jetons étrangers | Ne peut toucher ni au principal ni aux gains d'un épargnant. |
| Transférer la propriété | En deux temps. La renonciation est désactivée, donc la propriété ne peut pas être jetée dans le vide. |

**Ne peut pas :** lire le principal, les gains, le poids ou le crédit d'un épargnant, parce
que les contrats n'accordent jamais l'accès au propriétaire. Ne peut pas changer l'issue d'un
tirage. Ne peut déplacer l'argent de personne. Ne peut pas mettre les contrats à jour,
puisqu'il n'existe aucun chemin de mise à jour.

**Pas arrêté :** un propriétaire hostile peut mettre les dépôts en pause indéfiniment, et
peut pointer le pool vers une source de rendement qui ne paie rien. Cela affame le côté lots
du produit. Cela n'arrête plus l'horloge : une source qui échoue est attrapée, la récolte de
ce tirage est comptabilisée à zéro, `HarvestFailed` est émis et la clôture réussit quand
même. Aucun de ces pouvoirs ne prend une seule unité du principal de qui que ce soit, et les
retraits continuent de fonctionner tout du long.

## 6. Le sponsor

Celui qui finance la source de rendement de Sepolia.

**Veut :** dans le cas honnête, offrir l'argent des lots de la démonstration. Dans le cas
adverse, cadencer ou retenir les lots.

**Arrêté par :** le sponsor n'a aucune influence sur qui gagne. Il finance un solde ; la
graine, les poids et les seuils n'ont rien à voir avec lui. Les montants sponsorisés, le
débit et chaque récolte sont publics : n'importe qui peut donc voir exactement combien
d'argent de lots existe et à quelle vitesse il arrive. Une dotation est un don : elle ne
peut pas être reprise une fois faite, et seul le propriétaire de la source peut changer le
débit.

**Pas arrêté :** un sponsor qui cesse de sponsoriser met fin aux lots une fois le solde
écoulé. Les lots sont du rendement, et pas de rendement veut dire pas de lots. Le principal
n'est jamais touché, ce qui est tout l'intérêt d'une conception sans perte.

## 7. L'opérateur du jeton

Zama, en tant que propriétaire des wrappers de jetons confidentiels. L'actif de chaque pool
est leur contrat, pas le nôtre, et chaque pool s'appuie sur un wrapper différent.

**Veut :** énuméré, pas allégué.

**Pouvoirs, lus dans le source Sepolia vérifié le 2 septembre 2026 :**

- `addObserver(address)` accorde à une adresse un déchiffrement universel sur tout handle
  sur lequel le jeton détient des droits, **rétroactivement**. Un observateur nommé à
  n'importe quelle date future peut déchiffrer des montants déjà présents sur la chaîne,
  donc surveiller la nomination et sortir n'est pas une défense. La portée couvre chaque
  montant de dépôt, chaque paiement de retrait, le solde du pool dans le jeton, et l'unique
  transfert de financement de lots par lot d'évaluation. Il n'y a pas de paiement par
  gagnant à lire, parce que Hearth n'a pas de transfert de lot par épargnant. Un lot qui ne
  contient qu'un seul épargnant fait bien du total de ce lot le lot exact de cet épargnant,
  et le pool réel à cinq épargnants avec une taille de lot de 4 produit un tel lot à chaque
  tirage. `evaluate` prend sa taille de lot chez l'appelant et est ouvert à tous : aucun lot
  minimal ne peut donc être imposé ; la [limite 7](../limitations.md) l'enregistre comme un
  résidu accepté et nomme le correctif côté contrat. État réel ce jour-là :
  `observerCount()` valait 0 et `observers()` était vide.
- Une liste de refus. Une adresse bloquée ne peut ni déposer, ni retirer, ni désenvelopper,
  parce que chacune de ces opérations est un transfert de jeton avec cette adresse d'un
  côté.
- Un rôle de mise en pause, fixé en réel à l'adresse zéro, donc la mise en pause est
  actuellement désactivée.
- L'implémentation est modifiable par son propriétaire derrière un proxy.

**Arrêté par :** rien que nous contrôlions. C'est une hypothèse de confiance, pas une
défense.

**Ce que cela n'atteint pas :** le registre propre à Hearth. Le principal, les gains, les
poids et les crédits vivent dans le coffre, et le jeton ne détient aucun droit d'accès sur
eux, même sous une mise à jour hostile du jeton. Nous l'avons vérifié sur le déploiement
précédent : l'adresse du jeton renvoie faux pour l'autorisation sur les handles de principal
et de gains d'un déposant, tandis que le déposant et la cagnotte renvoient vrai.

## 8. Le quorum KMS de Zama

Les parties qui détiennent la clé de déchiffrement du réseau.

**Veut :** énuméré parce que c'est l'hypothèse la plus profonde de toute application FHEVM.

**Ce qu'ils pourraient faire :** le contrat vérifie qu'un texte clair porte une signature
valide du quorum. Il ne peut pas vérifier que ce texte clair est le vrai texte clair du
handle. Un quorum malhonnête pourrait donc signer une valeur de graine de son choix, et le
contrat l'accepterait, ce qui lui permettrait de choisir les gagnants.

**Arrêté par :** rien dans Hearth. Toute application sur ce protocole en hérite, et la
documentation de Zama énonce la frontière sans détour : le protocole est réputé de confiance
pour calculer correctement sur les chiffrés et ne déchiffrer que ce qui est marqué
publiquement déchiffrable.

**Bon à savoir :** le quorum ne peut toujours pas lire ce qui n'est pas marqué publiquement
déchiffrable, et chez Hearth cela se limite à la graine, au compteur d'échelle, au drapeau
de non-vacuité, à la récolte, au report de chaque palier quand il est dû, et au compteur de
non-financement. Aucune valeur propre à un épargnant ne figure jamais dans cet ensemble, et
le poids total exact du pool non plus.

## 9. Le relayer

Le service qui achemine les demandes de déchiffrement entre les navigateurs et le protocole.

**Veut :** énuméré.

**Peut :** refuser ou retarder le service, ce qui retarde un tirage. Il voit aussi quelle
adresse a demandé à déchiffrer quel handle, il apprend donc que vous avez vérifié vos
propres nombres, mais pas ce qu'ils disent.

**Ne peut pas :** déchiffrer quoi que ce soit lui-même, puisqu'il ne détient pas la clé. Ne
peut pas forger une signature du KMS, ce à quoi sert la vérification sur la chaîne. Ne peut
pas s'accorder l'accès à un handle, puisque c'est le travail de la liste de contrôle d'accès
et qu'elle vit sur la chaîne.

**Arrêté par :** la fenêtre de deux périodes absorbe un relayer lent, et l'échéance de
clôture garantit qu'au moins une demi-période reste devant quand l'aller-retour commence.
Au-delà, le tirage est sauté, la récolte est quand même comptabilisée et la liquidité est
toujours là. Une panne du relayer coûte un tirage, jamais de l'argent.

## Ce que l'ancienne conception avait de faux, et comment celle-ci le referme

Avant cette reconstruction, Hearth était un contrat unique appelé `LanternPool` qui pondérait
les épargnants par leur solde à l'instant du tirage et balayait les déposants par morceaux.
Nous l'avons audité contre nous-mêmes le 2 septembre 2026 et nous avons exécuté les attaques
plutôt que de raisonner dessus. Six des huit constats ci-dessous ont été reproduits dans du
code qui tourne.

| # | Ce qui n'allait pas | Preuve | Comment cette conception le referme |
| --- | --- | --- | --- |
| 1 | **Dépôt éclair.** Pas de pondération temporelle, donc un dépôt fait un bloc avant le tirage comptait en entier. | Exécuté sur la simulation : 20 cycles, l'attaquant a gagné 19 tirages sur 20 et vidé une réserve de 5,000 USDC. Le cycle entier tenait aussi dans une transaction, 2,189,992 de gaz. | Les chances viennent de la moyenne pondérée par le temps sur toute la période. Un dépôt de dernière minute gagne sa fraction de la période et rien de plus. |
| 2 | **La transaction de réclamation trahissait le gagnant.** Les réclamations d'un gagnant et d'un perdant étaient identiques, mais seul un gagnant avait une raison d'en envoyer une. | Exécuté : la réclamation d'un gagnant et celle d'un perdant coûtaient 391,944 de gaz chacune sur la simulation, avec des journaux identiques. Sur Sepolia, une réclamation est arrivée 48 secondes après un règlement. | Il n'y a pas de fonction de réclamation. Les lots atterrissent dans un solde de gains chiffré pendant l'évaluation, `withdraw` est la seule sortie, et l'évaluation ne peut pas être dirigée vers soi-même. |
| 3 | **Un bit public à chaque tirage.** Le handle de gains d'un ticket de la maison était republié comme publiquement déchiffrable à chaque tirage, laissant fuir si la maison avait gagné, ce qui, avec un seul vrai épargnant, nommait le gagnant. | Exécuté sur la simulation sur 16 tirages, et confirmé sur Sepolia sur trois tirages réglés. | Il n'y a pas de ticket de la maison. Les seules valeurs publiquement déchiffrables sont la graine, le compteur d'échelle, le drapeau de non-vacuité, la récolte, les reports des paliers et le compteur de non-financement. Aucune n'est propre à un épargnant. |
| 4 | **Pas vérifiable publiquement.** Le total du pool n'était jamais publié, donc un observateur extérieur ne pouvait pas vérifier le tirage du tout. | Lu dans le source déployé et confirmé en réel. | La graine et la tranche sont publiées avec une preuve KMS vérifiée sur la chaîne, et chaque seuil est recalculable par n'importe qui à partir de ces deux nombres. |
| 5 | **Rendement comptabilisé sur déclaration.** Les recharges de réserve étaient comptabilisées à partir du montant passé, alors que le wrapper émet `amount / rate()`. Latent sur Sepolia uniquement parce que le taux valait justement 1. | Exécuté contre un jeton de test à 18 décimales, où le taux vaut mille milliards. | La cagnotte ne comptabilise que le montant vérifié par le KMS que la source a réellement transféré. |
| 6 | **Inscription gratuite exploitable.** Un portefeuille qui n'avait jamais détenu le jeton pouvait s'inscrire, et un opérateur pouvait inscrire d'autres portefeuilles avec un unique zéro chiffré réutilisé. | Exécuté. | L'inscription reste ouverte, par construction. Les faux épargnants portent un poids nul, ne changent les chances de personne et sont sautés en clair. Le seul coût est du gaz pour le keeper, et ce que le keeper borne est le prix du gaz qu'il accepte de payer, pas le travail qu'il fera. |
| 7 | **Le point de fuite de l'enveloppement, non atténué.** L'application enveloppait et déposait dans un seul flux. | Mesuré en réel : trois dépôts sur cinq se trouvaient deux à quatre blocs après un enveloppement public de 100 USDC. | L'enveloppement et le dépôt sont des étapes distinctes et l'application explique pourquoi. Le point de fuite est réduit, pas supprimé, et c'est la limite 10. |
| 8 | **Pas de keeper.** Les tirages étaient ouverts à tous mais personne ne les lançait : le pool réel est resté 26 heures avec un tirage ouvrable. | Lu en direct sur la chaîne. | Un script keeper exécute chaque étape et tout épargnant peut faire avancer un tirage depuis l'application. La cagnotte implémente l'interface d'automatisation de Chainlink pour l'étape de clôture comme redondance supplémentaire, même si aucun upkeep n'est encore enregistré. |

Deux autres changements de conception sont sortis de la revue du 3 septembre et ne figurent
pas dans ce tableau, parce que l'ancienne conception n'était pas allée assez loin pour les
avoir : publier l'agrégat exact a été remplacé par la tranche (attaquant 1 ci-dessus), et la
taille des lots est passée de l'attribution à la clôture pour qu'aucun lot ne puisse être
redimensionné après l'existence de sa graine.

## Ce qui est vérifié, et comment

Chaque affirmation ci-dessus a un test. Les sorties exécutées atterrissent sous
`docs/security/attacks` et les chiffres sont collés dans le README.

| Affirmation | Le contrôle |
| --- | --- |
| Un inconnu ne peut pas lire les valeurs d'un épargnant | Demander au relayer de déchiffrer le principal, les gains, le poids et le crédit d'une autre adresse. Attendre un refus sur les quatre. |
| Le total exact du pool n'est pas obtenable | Demander au relayer le handle du poids agrégé. Attendre un refus. Puis différencier les tranches publiées de tirages consécutifs dans un pool où un seul épargnant a bougé, et montrer que la réponse est une bande à un facteur deux, pas un nombre. |
| Un dépôt éclair ne rapporte presque rien | Déposer près de la fin d'une période, évaluer, et comparer le poids stocké à celui d'un détenteur sur toute la période. |
| De faux épargnants ne peuvent pas bloquer un tirage | Inscrire de nombreuses adresses vides, puis faire tourner un tirage complet. |
| Personne ne peut choisir qui est évalué | Appeler `evaluate` depuis l'adresse d'un épargnant et montrer que le parcours avance depuis le curseur dérivé de la graine, pas depuis cet épargnant. |
| Une clôture tardive est refusée | Appeler `closeDraw` après `closeDeadline` et attendre un échec ; puis confirmer que le tirage est sautable et que sa liquidité est intacte. |
| Une attribution manquée ne perd rien | Laisser passer la fenêtre, attribuer tardivement, et vérifier que la récolte est comptabilisée, que la liquidité offerte est revenue dans les paliers et que le tirage indique `Skipped`. |
| Une source de rendement qui échoue n'arrête pas l'horloge | Attacher une source qui échoue, clôturer un tirage, et attendre un succès accompagné de `HarvestFailed`. |
| Un palier sursouscrit plafonne au lieu de surpayer | Forcer plus de gagnants que le palier ne peut en financer et vérifier que le payé ne dépasse jamais l'offert. |
| Une preuve ne peut pas être rejouée | Resoumettre une preuve d'attribution contre un autre tirage. Attendre un échec. |
| Personne ne retire plus qu'il ne possède | Test de propriété : pour chaque compte, les retraits ne dépassent jamais le principal plus les gains. |
| L'argent est conservé | Test de propriété : le solde en jetons du coffre égale le principal total plus les gains non réclamés totaux, et le solde en jetons de la cagnotte égale la liquidité en clair plus chaque report chiffré plus la liquidité offerte et pas encore finalisée plus les récoltes reçues à la clôture et pas encore comptabilisées par une attribution. Ce dernier terme est la récolte entre la clôture qui la reçoit et l'attribution qui la répartit entre les paliers, moment où elle n'appartient à aucun palier et à aucun tirage. |

## Ce que ce modèle de menaces ne couvre pas

- Tout ce qui est hors de la chaîne : votre appareil, la gestion des clés de votre
  portefeuille, le point de terminaison RPC que vous utilisez, et les métadonnées au niveau
  du réseau.
- Les attaques économiques contre le lieu de rendement lui-même. Sur le réseau principal, le
  risque du coffre est hérité en entier du coffre ERC-4626 derrière le batcher de Zama.
- La vérification formelle. Hearth est auto-audité avec des attaques exécutées et des tests
  de propriété. Il n'a pas été audité par un tiers, et cette page est le substitut honnête,
  pas un remplacement.
</content>
