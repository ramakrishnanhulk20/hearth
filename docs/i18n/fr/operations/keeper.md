# Le keeper

Les tirages ne se font pas tout seuls. Quelque chose doit envoyer les transactions. Cette
page explique ce que fait ce quelque chose, ce qui arrive quand il s'arrête, et combien cela
coûte.

Un processus pilote un pool. Hearth fait tourner sept pools sur Sepolia, donc sept processus
keeper tournent, chacun signant depuis son propre compte de la même phrase de récupération et
chacun pointé sur le fichier d'adresses d'un pool. La section « Un keeper par pool » plus bas
donne le tableau.

Le cadrage important d'abord : le keeper n'a aucun privilège. Chaque fonction qu'il appelle
est appelable par n'importe qui, et les deux leviers qu'un keeper aurait pu détourner,
choisir qui est évalué et choisir l'ordre des paiements, ne sont plus des leviers du tout.
C'est une commodité qui épargne la peine aux épargnants, pas un rôle dont le pool dépend pour
sa sûreté.

## Le travail, dans l'ordre, pour le tirage `p`

1. **Clôturer.** Appeler `closeDraw(p)` une fois la période `p` terminée et avant
   `closeDeadline(p)`, qui est le milieu de la période `p+2`. Le début de la période `p+1`
   est la bonne habitude. Cela fixe la taille du lot et la liquidité offerte de chaque
   palier, déplace cette liquidité dans le tirage, tire la graine chiffrée, demande au coffre
   le compteur d'échelle chiffré et le drapeau de non-vacuité, récolte la source de rendement
   et marque les quatre handles publiquement déchiffrables.
2. **Récupérer les preuves.** Demander au relayer de Zama de déchiffrer publiquement les
   quatre handles dans l'ordre `[seed, scaleCount, nonEmpty, harvested]`. Le relayer renvoie
   les textes clairs avec une signature du service de gestion des clés.
3. **Attribuer.** Appeler `awardDraw(p, seed, scaleCount, nonEmpty, harvested, proof)`. Le
   contrat vérifie la signature sur la chaîne, comptabilise la récolte dans les paliers, et
   ouvre le tirage. Les gagnants sont décidés à cet instant.
4. **Évaluer.** Appeler `evaluate(p, count)` sur le coffre, à répétition, jusqu'à ce que le
   parcours revienne à son point de départ. Chaque appel fait avancer un curseur propre au
   tirage dans la liste des épargnants, depuis un départ dérivé de la graine. Le keeper
   choisit `count`, jamais quelles adresses ; `4` est le plus grand nombre d'épargnants
   demandant du travail chiffré qui tient dans une transaction. Les épargnants sans
   observation à la période `p` ou avant sont sautés par le contrat lui-même, à partir
   d'horodatages en clair, sans coût chiffré.
5. **Finaliser.** Une fois la fenêtre fermée à la fin de la période `p+2`, appeler
   `finalizeDraw(p)`. Cela verse le reliquat non payé de chaque palier dans le report chiffré
   de ce palier, publie le compteur de non-financement, et marque le report publiquement
   déchiffrable pour tout palier qui doit se réconcilier, en émettant `CarryPublished`.
6. **Réconcilier, par palier dû.** Pour chaque palier que `finalizeDraw` a publié, récupérer
   le texte clair du report et appeler `reconcile(tier, carry, proof)`. La cagnotte vérifie
   la preuve contre le handle publié par le coffre, inscrit le nombre vérifié dans la
   liquidité en clair du palier, le coffre le soustrait du report (qui a pu grandir depuis sa
   publication), et `TierReconciled` est émis.

Sur Sepolia, chaque palier de chaque pool est dû à chaque tirage, donc l'étape 6 tourne
jusqu'à trois fois après chaque finalisation. La cadence est un argument de constructeur par
palier et le keeper la lit sur la chaîne plutôt que de la supposer : un déploiement qui
publie le report d'un palier moins souvent ne demande donc aucun changement de keeper.
Pourquoi celui-ci publie les trois à chaque tirage est expliqué dans
[lots et paliers](../concepts/prizes-and-tiers.md).

## La règle d'ordonnancement

**Finaliser et réconcilier le tirage `p` au début de la période `p+3`, avant de clôturer le
tirage `p+2` dans cette même période.**

La raison est l'argent, pas la correction. Une clôture dimensionne les lots de chaque palier
à partir de la liquidité en clair de ce palier à cet instant, et la réconciliation est ce qui
retransforme le report d'un tirage antérieur en liquidité en clair. Réconciliez d'abord et
cet argent compte immédiatement dans la taille du lot ; réconciliez après et il attend un
tirage.

Les deux tâches deviennent disponibles au même instant. La fenêtre du tirage `p` se termine
à la fin de la période `p+2`, et le tirage `p+2` devient clôturable au début de la période
`p+3` : le keeper fait donc la finalisation et les réconciliations dues d'abord, puis la
clôture.

Rien n'est perdu si l'ordre glisse, mais le sens du glissement compte. Clôturez avant la
finalisation et le report du palier n'est pas encore en attente, donc `openDraw` l'intègre à
l'offre et cet argent peut encore être gagné ; il n'augmente simplement pas la taille du lot
publiée, que `closeDraw` fixe à partir de la seule liquidité en clair. Finalisez, puis
clôturez, puis réconciliez, et le report est en attente : `openDraw` laisse un report en
attente entièrement hors du tirage, si bien que cet argent n'est ni offert ni gagnable tant
que la réconciliation n'a pas levé le drapeau. Sur Sepolia, chaque palier est dû à chaque
finalisation, c'est donc le cas ordinaire, et c'est pourquoi le keeper relit les reports
après ses finalisations et réconcilie avant de clôturer. Rien n'est perdu dans un cas comme
dans l'autre : la première clôture après une réconciliation réintègre le tout.

## Ce qui se passe quand le keeper est arrêté

Rien n'est perdu. C'est toute la réponse, et elle tient à la façon dont une étape manquée
est traitée :

| Étape manquée | Conséquence |
| --- | --- |
| La clôture n'a jamais lieu, ou a lieu après `closeDeadline` et échoue | Le tirage reste en `None` et est sauté. Sa liquidité n'a jamais bougé, elle reste donc dans les paliers et est offerte au tirage suivant. La récolte est collectée par la clôture suivante. |
| L'attribution n'a jamais lieu dans la fenêtre | Une attribution tardive comptabilise quand même la récolte, rend quand même la liquidité offerte aux paliers, et marque le tirage `Skipped`. Aucun rendement ni aucune liquidité ne disparaît. |
| Le parcours n'atteint pas tous les épargnants | Les épargnants que le parcours a manqués ne reçoivent rien de ce tirage. Leur part de l'offre bascule dans le report du palier à la finalisation et est offerte de nouveau. C'est le seul cas où un vrai épargnant perd quelque chose qu'il aurait pu gagner, et c'est la limite 2. |
| La finalisation ou la réconciliation est tardive | Les paliers détiennent moins de liquidité en clair pendant un temps, donc la taille des lots est plus petite. Un report qu'une finalisation a publié et qu'aucune réconciliation n'a soldé reste hors de chaque clôture jusqu'à ce que la réconciliation arrive. Rien n'est perdu : la première clôture après une réconciliation réintègre le tout. |

Un keeper à l'arrêt coûte des tirages au pool, pas de l'argent. Les dépôts et les retraits
continuent de fonctionner tout du long, parce que le chemin de mise en pause ne les touche
jamais et qu'un tirage bloqué ne verrouille rien.

Notre déploiement précédent est l'exemple qui met en garde : `openDraw` était ouvert à tous
et personne ne l'appelait, si bien que le pool réel est resté 26 heures avec un tirage prêt à
être ouvert. Ouvert à tous n'est pas la même chose qu'automatisé. C'est pourquoi cette
conception a un vrai keeper et un chemin de redondance dessous.

## Comment un épargnant fait avancer un tirage lui-même

Chaque étape ci-dessus est ouverte à tous, et l'application les expose toutes sur son écran
« Lancer un tirage », à `/app/<slug>/run` pour le pool où l'épargnant se trouve, qui est la
ligne de la barre latérale marquée « N'importe qui ». Une carte en haut nomme l'étape que le
pool attend, et chacune des cinq en dessous porte son propre bouton, désactivé avec une
raison affichée quand ce n'est pas son tour :

- **Clôturer**, puis **Attribuer.** La clôture fixe la taille des lots et tire la graine
  chiffrée. L'attribution récupère les quatre preuves de déchiffrement dans le navigateur et
  renvoie les textes clairs signés. L'appel au relayer est le même que celui du keeper, et
  le SDK le fait depuis la page.
- **Avancer.** Exécute `evaluate(p, count)` pour le tirage actuellement ouvert, faisant
  avancer le parcours partagé d'un lot. Le même appel se trouve sur votre propre carte de
  tirage dans « Mes tirages » sous le nom « Faire avancer le tirage ». C'est le bouton à
  presser si le keeper est arrêté et que le parcours ne vous a pas encore atteint. Il ne vous
  permet pas de vous choisir vous-même, et c'est bien la fonctionnalité : puisque personne ne
  peut se distinguer, envoyer cette transaction ne dit rien sur le fait d'avoir gagné.
- **Finaliser** et **Réconcilier.** Exécutent les deux étapes de fermeture pour tout tirage
  dont la fenêtre est terminée.

Aucune de ces actions n'a besoin de notre permission, de nos clés ni de nos serveurs.

## Chainlink Automation, pour la seule étape de clôture

`HearthPrizePool` implémente l'interface `checkUpkeep` et `performUpkeep` de Chainlink pour
l'étape de clôture. Enregistrer un upkeep basé sur le temps donne au pool une seconde voie
indépendante pour faire clôturer les tirages à l'heure, et la clôture est l'étape qui a une
échéance : c'est donc celle qui mérite d'être assurée.

Cela couvre la clôture et rien d'autre, et la raison est simple : la clôture est la seule
étape qui n'a besoin d'aucune donnée hors chaîne. L'attribution a besoin d'une preuve de
déchiffrement récupérée auprès du relayer de Zama. L'évaluation doit être répétée jusqu'à ce
qu'un curseur boucle. La réconciliation a besoin d'un autre déchiffrement. Un réseau
d'automatisation sur la chaîne ne peut rien récupérer de tout cela, donc prétendre le
contraire serait du théâtre.

L'upkeep est facultatif. Il a besoin de LINK sur un compte d'upkeep enregistré, il est une
redondance plutôt que la voie principale, et ce serait un upkeep par pool, chacun sur le
calendrier de ce pool. Aucun n'est enregistré sur les sept pour l'instant, donc les keepers
seuls font tourner les pools de démonstration.

Nous déclarons l'interface à deux fonctions localement plutôt que d'ajouter tout le paquet de
contrats Chainlink et ses dépendances pour deux sélecteurs.

## Le budget

Les coûts par tirage, tirés du déploiement réel.

| Étape | Transactions par tirage | Gaz par transaction |
| --- | --- | --- |
| Clôture | 1 | `1,422,474` |
| Attribution | 1 | `435,578` |
| Évaluation, un lot plein de 4 | `floor(savers / 4)`, ici 1 | `3,417,699` |
| Évaluation, le dernier lot partiel | 0 ou 1, ici 1 portant un épargnant | `1,291,192` pour un épargnant, plus `708,836` par épargnant supplémentaire |
| Finalisation | 1 | `509,463` |
| Réconciliation | 3, une par palier, puisque chaque palier est dû à chaque tirage | `459,994` |

À 5 épargnants, cela fait `8,456,388` de gaz par tirage, soit environ `0.0085 ETH` à 1 gwei,
le prix de base de Sepolia au déploiement. Sur une période d'une heure, cela fait 24 tirages
par jour et `0.2030 ETH` par jour ; sur une période d'un jour, `0.0085 ETH`.

Multipliez cela par sept pools et vous avez toute la raison pour laquelle six d'entre eux
tirent toutes les six heures plutôt que toutes les heures. Toutes les heures sur les sept
ferait 168 tirages par jour, environ `1.43 ETH`, ce que les faucets publics ne peuvent pas
suivre. Un pool horaire et six pools de six heures font 48 tirages par jour, environ
`0.41 ETH`. Chaque compte keeper est financé séparément, donc un pool à court de gaz n'arrête
que ses propres tirages.

Un épargnant de plus dans un lot coûte `708,836` de gaz sur Sepolia, et un lot portant un
seul épargnant coûte `1,291,192`, puisque la partie fixe de l'appel est payée dans tous les
cas. En unités de calcul, un épargnant vaut `3,674,128` sur la table de prix du coprocesseur
simulé, qui est l'endroit où ce chiffre est lisible, parce qu'un reçu réel ne rapporte pas
les unités de calcul. La taille de lot `4` découle de cette mesure face aux limites Sepolia
publiées par Zama, à savoir 20,000,000 unités de calcul par transaction avec 5,000,000 de
profondeur séquentielle. `evaluate` accepte n'importe quel nombre, donc si Zama retarifie une
opération, le keeper peut descendre à un lot plus petit sans redéploiement.

**Le keeper évalue tout le parcours.** Rien sur la chaîne ne limite ce que coûte
l'évaluation, et le keeper ne s'arrête pas en chemin non plus ; ce qu'il applique est un
plafond de frais (`KEEPER_MAX_FEE_GWEI`), en dessous duquel il continue d'envoyer jusqu'à ce
que le curseur atteigne la fin. La conséquence honnête est énoncée dans le
[modèle de menaces](../security/threat-model.md) : un pool gonflé d'adresses sans valeur
coûte plus de gaz au keeper par tirage, et non leurs lots aux épargnants, parce que les
adresses sans observation antérieure à la période sont sautées sans le moindre travail
chiffré. Si le keeper est arrêté, n'importe qui peut appuyer sur « Avancer », et comme le
parcours démarre à un point différent à chaque tirage, personne ne reste en permanence au
fond.

## Un keeper par pool

`packages/keeper/ecosystem.config.cjs` lance les sept sous pm2, un processus chacun. On dit
à un processus quel pool il pilote par `HEARTH_ADDRESSES_FILE`, le fichier d'adresses écrit
par le déploiement de ce pool, qui lui donne aussi le symbole du jeton, les décimales et
l'indice de compte avec lequel signer. `KEEPER_NAME` est l'étiquette que porte chaque ligne
de journal.

| Processus pm2 | `HEARTH_ADDRESSES_FILE` | `KEEPER_ACCOUNT_INDEX` |
| --- | --- | --- |
| `hearth-keeper-usdc` | `hearth.json` | 1 |
| `hearth-keeper-usdt` | `hearth.usdt.json` | 10 |
| `hearth-keeper-weth` | `hearth.weth.json` | 11 |
| `hearth-keeper-bron` | `hearth.bron.json` | 12 |
| `hearth-keeper-zama` | `hearth.zama.json` | 13 |
| `hearth-keeper-tgbp` | `hearth.tgbp.json` | 14 |
| `hearth-keeper-xaut` | `hearth.xaut.json` | 15 |

Le processus `usdc` pointe sur `hearth.json` plutôt que sur `hearth.usdc.json` parce que
c'est le fichier écrit par le premier déploiement, avant que les pools n'aient des
identifiants, et parce que le keeper en service est pointé dessus depuis des jours. Les deux
fichiers portent les mêmes adresses.

Les indices sont espacés pour qu'un pool ultérieur puisse être ajouté sans tout renuméroter,
et chaque compte a besoin de son propre ETH Sepolia. L'indice 0 est le déployeur et le keeper
le refuse.

## Le faire tourner

Le keeper est le paquet `@hearth/keeper`. Il signe avec un compte de la même
`RECOVERY_PHRASE` que celle du déploiement et lit `SEPOLIA_RPC_URL` dans
`packages/contracts/.env` ; ses propres réglages vivent dans `packages/keeper/.env` :

```
HEARTH_ADDRESSES_FILE=../contracts/deployments/sepolia/hearth.weth.json
KEEPER_ACCOUNT_INDEX=11            # defaults to the index in the address file
KEEPER_NAME=weth                   # defaults to the slug in the address file
KEEPER_BATCH=4                     # savers of encrypted work per evaluate call
KEEPER_POLL_SECONDS=30
KEEPER_MAX_FEE_GWEI=20             # refuse to send above this
```

```
npm run compile -w @hearth/contracts    # the keeper reads the compiled ABI
npm run build -w @hearth/keeper
npm run plan -w @hearth/keeper          # one pass, simulates every call, sends nothing
npm run once -w @hearth/keeper          # one live pass
pm2 start packages/keeper/ecosystem.config.cjs   # all seven
pm2 logs hearth-keeper-weth                      # one pool
```

`plan` et `once` pilotent le pool sur lequel `HEARTH_ADDRESSES_FILE` pointe : vérifier un
autre pool tient donc à une variable en tête de commande. Si `HEARTH_VAULT` et `HEARTH_POOL`
traînent encore dans `packages/keeper/.env` depuis une installation à pool unique,
retirez-les : ils sont lus avant le fichier d'adresses, donc les sept processus piloteraient
un seul pool.

Un passage journalise une ligne par fait, et chaque ligne est étiquetée avec le pool que le
processus pilote, si bien que sept journaux entrelacés restent lisibles. Les montants portent
le symbole et les décimales propres à ce pool, tous deux lus dans le fichier d'adresses :

```
09:14:37 [usdc] closed draw 41 (gas 1,422,474)
09:14:39 [usdc] draw 41: asking the relayer for the seed, the scale, the empty flag and the harvest
09:14:53 [usdc] awarded draw 41: 3 tiers, prizes 12.40 / 2.10 / 0.40 cUSDC, harvest 3.60 cUSDC (gas 435,578)
09:15:07 [usdc] evaluated draw 41: 4 of 9 savers done (gas 3,417,699)
09:15:38 [usdc] nothing to do: period 43, draw 41 has 8 of 9 savers evaluated
```

Le processus WETH imprime les mêmes lignes sous `[weth]`, en `cWETH`. Ce que signifie chaque
type de ligne, ligne par ligne, est dans le README du paquet keeper,
`packages/keeper/README.md`.

Le keeper est sans état entre deux cycles : il lit l'état du tirage, le curseur d'évaluation
et la cadence de réconciliation sur la chaîne et en déduit quoi faire. Le redémarrer ne perd
rien. Faites tourner exactement une instance par pool, et jamais deux sur un même compte :
sur la chaîne, chaque étape réussit exactement une fois par tirage et par palier, et deux
appels d'évaluation ne font qu'avancer le même curseur, mais deux keepers sur un même compte
se disputent le nonce de transaction.

## Ce que cette page ne couvre pas

Elle ne couvre pas ce que les transactions du keeper font réellement à l'argent, ce qui est
[comment se déroule un tirage](../concepts/how-a-draw-works.md). Elle ne couvre pas le
déploiement, ce qui est [déploiement](deploying.md). Et elle ne promet aucune disponibilité :
nous faisons tourner un keeper, nous ne le garantissons pas, et la conception est faite pour
que ne pas le garantir soit acceptable.
</content>
