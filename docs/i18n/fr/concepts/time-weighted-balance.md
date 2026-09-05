# Solde pondéré par le temps

Vos chances dans un tirage ne reposent pas sur ce que vous détenez au moment du tirage.
Elles reposent sur votre solde moyen sur toute la période. Cette page explique pourquoi, ce
que cela coûte à un déposant tardif, et pourquoi le coffre n'a besoin de se souvenir que de
trois moments par épargnant.

## Pourquoi la moyenne, et pas le solde final

Prenons d'abord la conception simple : pondérer chacun par son solde à l'instant du tirage.
C'est facile à construire, et c'est cassé.

Un attaquant dépose un gros montant, attend le tirage, gagne, et retire. Son argent est
resté dans le pool le temps d'un bloc. Il n'a produit de rendement pour personne, il n'a
porté aucun risque, et il a pris le lot que les épargnants patients ont financé. Puis il
recommence au tirage suivant.

Nous avons exécuté cette attaque contre notre propre conception antérieure le 2 septembre
2026. Dans un pool où un épargnant honnête détenait 100 USDC, un attaquant faisant tourner
9,000 USDC à l'entrée et à la sortie autour de chaque tirage a gagné 19 tirages sur 20 et
vidé une réserve de lots de 5,000 USDC. Le capital de l'attaquant n'a jamais été à risque,
puisqu'un pool sans perte le rend par définition. Le cycle entier tenait même dans une seule
transaction : dépôt, ouverture du tirage, balayage, retrait, 2,189,992 de gaz.

Le correctif est celui qu'utilise PoolTogether. Leur propre documentation le formule ainsi :
la capacité à regarder en arrière dans le temps compte « pour que les utilisateurs puissent
déposer et retirer librement dans une cagnotte tout en voyant leur apport de liquidité
mesuré parfaitement ». Mesurez l'apport, pas l'instantané.

## Ce que vaut un dépôt tardif

Une période fait 3,600 secondes dans le pool USDC et 21,600 dans les six autres. Le poids
est le solde multiplié par les secondes pendant lesquelles il a été détenu : il se mesure
donc en solde-secondes du jeton propre à ce pool. L'exemple ci-dessous porte sur le pool
USDC horaire.

| Épargnant | Ce qu'il a fait | Poids pour la période |
| --- | --- | --- |
| Ada | A détenu 100 USDC pendant les 3,600 secondes | 100 x 3600 = 360,000 |
| Ben | A déposé 1,000 USDC à 360 secondes de la fin | 1,000 x 360 = 360,000 |
| Cy | A détenu 1,000 USDC toute la période | 1,000 x 3600 = 3,600,000 |

Ben a mis dix fois l'argent d'Ada et s'est acheté exactement les mêmes chances, parce qu'il
n'était là qu'un dixième du temps. Cy, qui a fait ce pour quoi le produit existe, a dix fois
les chances de l'un ou de l'autre.

Le cas miroir marche aussi. Retirez à l'instant où un tirage se clôture et vous gardez le
poids déjà acquis pour la période terminée, tout en n'emportant presque rien dans la
suivante. On ne peut pas louer des chances.

Rien de tout cela n'empêche quelqu'un qui détient réellement un gros solde pendant une
période entière de gagner souvent. Ce n'est pas une attaque. C'est le produit qui
fonctionne : son argent était dans le pool, à produire le rendement qui paie les lots de
tout le monde, pendant tout ce temps.

## Comment le coffre se souvient

Le coffre stocke trois instantanés par épargnant, appelés observations. Chacun contient
trois choses : un cumul de solde-secondes, le solde juste après ce changement, et
l'horodatage. Les trois emplacements s'appellent `current`, `previous` et `older`.

Le cumul est remis à zéro au début de chaque période. C'est cette remise à zéro qui garde le
nombre petit : à l'intérieur d'une période, il ne peut jamais dépasser le solde multiplié
par la longueur de la période.

Quand votre solde change, l'une de ces trois choses se produit :

- **Votre tout premier changement.** L'emplacement `current` est créé avec un cumul à zéro
  et votre nouveau solde.
- **Un changement dans la même période que `current`.** Le coffre ajoute les solde-secondes
  acquises depuis le dernier changement, puis écrase `current` sur place. Aucun nouvel
  emplacement n'est utilisé.
- **Un changement dans une période postérieure à celle de `current`.** Les trois
  emplacements glissent : `older` prend l'ancien `previous`, `previous` prend l'ancien
  `current`, et un nouveau `current` est écrit, portant les solde-secondes acquises depuis
  le début de cette période jusqu'à maintenant.

La lecture de votre poids pour la période `p` utilise l'observation la plus récente située à
cette période ou avant :

- Si elle se trouve à l'intérieur de la période `p`, votre poids est le cumul qu'elle porte,
  plus votre solde multiplié par les secondes séparant cet instant de la fin de la période.
- Si elle est antérieure à la période `p`, vous n'avez pas touché à votre solde pendant la
  période : votre poids est donc simplement ce solde multiplié par la longueur entière de la
  période.
- Si vous n'avez aucune observation à la période `p` ou avant, vous n'étiez pas encore
  épargnant, et votre poids est nul. Ce cas est tranché à partir d'horodatages publics, sans
  la moindre arithmétique chiffrée.

Chaque étape chiffrée ici est une multiplication par un nombre public et une addition. C'est
ce qui garde l'évaluation assez bon marché pour être traitée par lots.

Un détail qui compte pour l'argument de comptage ci-dessous. Chaque sortie écrit une
observation, qu'elle ait déplacé du principal ou non, parce que le coffre ne peut pas voir
duquel de vos deux soldes le retrait est sorti. C'est sans dommage : un emplacement ne
glisse que lorsqu'une nouvelle période a commencé, donc un retrait portant uniquement sur
les gains ne consomme aucun emplacement au-delà de celui que votre période allait utiliser
de toute façon.

## Pourquoi trois observations suffisent

C'est la question qu'un relecteur devrait poser, et la réponse est un argument de comptage.

Un nouvel emplacement n'est poussé que lorsqu'un changement de solde tombe dans une période
postérieure à celle où se trouve `current`. Au plus une poussée par période, quel que soit
le nombre de dépôts ou de retraits que vous y faites.

Le tirage `p` ne peut être clôturé, attribué et évalué que pendant les périodes `p+1` et
`p+2`. Donc au moment où quiconque lit votre poids pour la période `p`, au plus deux
périodes postérieures à `p` ont commencé, et donc au plus deux nouvelles observations ont
été poussées par-dessus celle qui était la plus récente à la période `p` ou avant. Trois
emplacements suffisent à tenir cela : celui dont nous avons besoin, plus les deux au plus
qui sont arrivés après lui.

C'est pourquoi la fenêtre fait deux périodes et pas davantage. Élargissez la fenêtre et il
vous faut un quatrième emplacement ; gardez-la à une période et une seule réponse tardive du
relayer peut faire perdre un tirage, ce qu'une période courte rendait douloureusement
probable. La clôture a sa propre échéance, une demi-période avant la fin de la fenêtre, si
bien que ces trois emplacements couvrent toujours l'aller-retour qui suit une clôture.

Le coffre garde les trois mêmes observations pour le solde total du pool : le poids agrégé
d'une période est donc calculé par la règle identique et reste valable sur la même fenêtre.
Cet agrégat n'est jamais publié. Ce que le coffre publie, c'est la tranche en puissance de
deux au-dessus de lui, et il obtient cette tranche en comparant sous chiffrement ce même
nombre cumulé à cinq puissances de deux fixes. Voir
[ce qui reste privé](../security/what-stays-private.md).

## Les deux limites de taille

Les valeurs chiffrées ici sont des entiers non signés sur 64 bits, donc l'arithmétique doit
rester dans cet intervalle. Faire déborder un nombre chiffré est pire que faire déborder un
nombre ordinaire, parce que rien n'échoue et que personne ne voit que cela s'est produit.

**Par épargnant.** Le coffre refuse tout dépôt dont le montant, ou dont le principal
résultant, dépasserait `maxPrincipal = (2^64 - 1) / L`. Sur une période d'une heure, cela
fait environ 5 milliards de jetons, sur une période de six heures environ 854 millions, et
sur une période d'un jour environ 213 millions. Puisque votre cumul ne peut pas dépasser
votre solde multiplié par la longueur de la période, et que votre solde ne peut pas dépasser
ce plafond, votre cumul ne peut pas dépasser 64 bits. Le refus est renvoyé sous forme de
faux chiffré et le jeton vous rembourse dans la même transaction, si bien qu'atteindre le
plafond ne divulgue pas votre solde.

Le contrôle borne le montant entrant en plus du résultat, et cette seconde borne n'est pas
décorative. L'addition chiffrée repasse à zéro à 64 bits sans échouer, donc un dépôt de
`2^64` moins votre principal produirait une somme nulle, et un contrôle qui ne regarderait
que la somme le laisserait passer. Avec le montant et le principal existant tous deux
maintenus sous le plafond, la somme ne peut pas atteindre `2^64` à aucune longueur de
période autorisée par le constructeur : le débordement est donc inatteignable plutôt que
simplement improbable.

**Pour le total du pool.** L'accumulateur du total est sur 128 bits plutôt que 64, donc
l'agrégat ne peut pas déborder pour aucune offre que le wrapper est capable d'émettre.

Une version antérieure de cette conception affirmait qu'un accumulateur sur 64 bits ne
pouvait pas déborder. C'était faux, une revue de conception l'a attrapé, et le plafond
assorti du total sur 128 bits est le correctif.

## Ce que cette page ne couvre pas

Elle ne couvre pas ce qui se passe une fois votre poids connu. C'est le
[test du gagnant](winner-selection.md). Elle ne prétend pas non plus que la pondération
temporelle est une fonctionnalité de confidentialité : votre poids est chiffré, mais la
tranche dans laquelle tombe le total du pool est publiée à chaque tirage, et avec très peu
d'épargnants cette tranche fixe un poids à un facteur deux près. Voir
[ce qui reste privé](../security/what-stays-private.md).
