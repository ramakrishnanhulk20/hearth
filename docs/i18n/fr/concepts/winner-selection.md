# Désignation des gagnants

C'est le cœur du produit : décider qui a gagné, sur des nombres que personne ne peut lire,
d'une manière qu'un inconnu peut quand même vérifier.

**La phrase qui compte : la désignation des gagnants est fixée au tirage, et l'évaluation ne
fait que l'écrire.** À l'instant où la cagnotte vérifie la graine aléatoire et la tranche
dans laquelle le total du pool est tombé, le résultat de chaque épargnant dans chaque palier
est déjà déterminé. Les seuils sont des nombres publics que n'importe qui peut recalculer,
et le poids chiffré auquel ils sont comparés ne peut plus changer. L'évaluation est de la
tenue de registre. Elle ne peut être ni orientée, ni devancée, ni sautée d'une manière qui
change qui a gagné.

## Ce qui est fixé quand un tirage est attribué

| Symbole | Ce que c'est | Public ? |
| --- | --- | --- |
| `R` | La graine aléatoire de ce tirage | Oui, après la fin de la période |
| `M` | La tranche dans laquelle est tombé le poids total du pool, une puissance de deux | Oui, après la fin de la période |
| `prize[t]` | Ce que rapporte un lot du palier `t` | Oui, fixé à la clôture |
| `offered[t]` | La liquidité que le palier `t` a engagée pour ce tirage | Oui, fixée à la clôture |
| `count[t]` | Combien de lots le palier `t` offre par tirage | Oui, fixé au déploiement |
| `odds[t]` | À quelle fréquence le palier `t` se déclenche, sous forme de fraction | Oui, fixées au déploiement |
| `W` | Le solde total pondéré par le temps du pool pour la période | **Non. Jamais publié** |
| `twab` | Le solde pondéré par le temps d'un épargnant pour la période | Non, chiffré, lisible par cet épargnant |

Les deux dernières lignes sont les secrets. `twab` est propre à chaque personne. `W` est la
somme de tous les `twab`, et il est retenu parce que le publier exactement donne à un
observateur un moyen de retrouver par soustraction le montant du dépôt d'un épargnant isolé.
Ce contre quoi le tirage tourne à la place, c'est `M` : la plus petite puissance de deux
supérieure ou égale à `W`. `M` se situe donc quelque part entre `W` et `2W`, et la seule
chose qu'un observateur apprend d'un tirage au suivant est si le pool a franchi une
puissance de deux.

## La règle de PoolTogether, et la nôtre

PoolTogether V5 donne à chaque épargnant `count[t]` chances indépendantes dans le palier
`t`. Chaque chance est gagnée avec la probabilité `min(1, twab * odds[t] / W)`. Le nombre
attendu de lots d'un épargnant dans un palier est donc sa part du pool, multipliée par les
chances du palier, multipliée par le nombre de lots.

Faire cela littéralement sur des nombres chiffrés supposerait de tirer un nouveau nombre
aléatoire par épargnant et par lot, et cela exigerait le `W` exact. Hearth reproduit la même
forme avec un seul nombre aléatoire uniforme par épargnant et par palier, une échelle de
seuils imbriqués, et `M` à la place de `W`.

Écrivons `z = twab * odds[t] * count[t] / M`. C'est le nombre attendu de lots que cet
épargnant remporte dans ce palier. Hearth lui paie `floor(z)` ou `ceil(z)` lots, plafonné à
`count[t]`, et la moyenne sur de nombreux tirages vaut exactement `z`.

Comme le dénominateur est `M` plutôt que `W`, l'espérance de chaque épargnant est mise à
l'échelle par `W / M`, un nombre compris entre un demi et un. Additionnez les épargnants et
un palier paie entre la moitié et la totalité de ses `count * odds` lots nominaux par
tirage. Rien n'est perdu là-dedans. Ce qu'un palier ne paie pas reste dans son report
chiffré et est offert de nouveau à la clôture suivante, si bien qu'avec le temps tout le
rendement sort quand même ; la taille des lots se stabilise simplement plus haut. Voir
[lots et paliers](prizes-and-tiers.md).

## Le test, étape par étape

Pour un épargnant `u` dans le palier `t` du tirage `p` :

1. Dériver son nombre aléatoire pour ce palier. `prn = keccak256(R, p, u, t)`. Comme
   l'adresse de l'épargnant et l'indice du palier entrent dans le hachage, chaque épargnant
   obtient son propre nombre et chaque palier en obtient un différent, tous issus de l'unique
   graine `R`.
2. Le réduire à la tranche. `r = prn mod M`, un entier de `0` à `M - 1`. `M` est une
   puissance de deux, donc c'est un simple reste d'un hachage de 256 bits par une puissance
   de deux, ce qui est exactement uniforme et n'a aucun biais à corriger. C'est de
   l'arithmétique publique sur des valeurs publiques.
3. Construire l'échelle. Pour chaque lot `k` de `0` à `count[t] - 1` :
   `threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))`.
   Ce sont des nombres publics. N'importe qui peut les calculer pour n'importe quelle
   adresse, et le contrat expose la même arithmétique sous forme de vue,
   `thresholdOf(drawId, saver, tier, k)`, si bien que le panneau de vérification de
   l'application, les tests et tout vérificateur extérieur utilisent une seule
   implémentation.
4. Comparer. Le lot `k` est gagné quand le poids chiffré de l'épargnant est strictement
   supérieur à `threshold_k`. C'est la seule étape qui touche à un secret, et c'est une
   comparaison chiffrée dont le résultat est un vrai ou un faux chiffré que personne ne peut
   lire.
5. Payer. Chaque lot gagné ajoute `prize[t]` au paiement chiffré de l'épargnant pour ce
   palier, par une sélection chiffrée plutôt que par un `if`, si bien que la transaction est
   identique qu'il n'ait rien gagné ou tout gagné.
6. Plafonner. Le paiement du palier à cet épargnant est le plus petit des deux entre ce
   qu'il a gagné et ce qu'il reste au palier. Cette soustraction met à jour la liquidité
   chiffrée restante du palier.
7. Créditer. Le montant plafonné est ajouté aux gains chiffrés de l'épargnant.

Les seuils montent avec `k`, donc un épargnant gagne les lots `0` à `j-1` pour un certain
`j` puis s'arrête. La condition pour le lot `k` est exactement
`twab * odds * count > r + k * M`.

### L'unique branchement en clair

Si un seuil est plus grand que `2^64 - 1`, aucun poids sur 64 bits ne peut le battre : la
réponse est donc faux et la comparaison est purement et simplement sautée. Cela arrive pour
un palier à faibles chances quand `M` est très grand. Comme les seuils ne font que monter
avec `k`, la boucle du palier s'arrête au premier seuil de ce genre plutôt que de vérifier
les suivants. Le branchement porte sur un nombre public. Rien dans Hearth ne branche jamais
sur un secret.

## Exemple chiffré : trois épargnants, un palier

Un tout petit pool, pour que les nombres restent lisibles. Un palier : le palier fréquent,
`count = 4`, `odds = 1` (c'est-à-dire `oddsNum = 1`, `oddsDen = 1`). Les poids sont en
solde-secondes du jeton que ce pool détient ; l'exemple les lit comme des USDC.

| Épargnant | Poids | Part de `W` | `z = weight * 4 / M` |
| --- | --- | --- | --- |
| Ada | 600 | 60 % | 2.34 |
| Ben | 300 | 30 % | 1.17 |
| Cy | 100 | 10 % | 0.39 |
| **Total `W`** | **1,000** | 100 % | **3.91** |

`W` vaut 1,000, donc la tranche est `M = 1,024`, la plus petite puissance de deux supérieure
ou égale. Personne hors du pool ne voit le 1,000. Ils voient le 1,024.

Regardez la colonne du total. Le paiement nominal du palier est de `count * odds = 4` lots
par tirage. Ce qu'il s'attend réellement à payer, c'est `4 * W / M = 4 * 1000 / 1024 = 3.91`.
C'est la mise à l'échelle par `W / M`, et ici cela fait une décote de 2.3 pour cent parce
que 1,000 se situe près du haut de sa tranche. Un pool de 520 se situerait près du bas de la
même tranche et le palier s'attendrait plutôt à environ 2.03 lots.

Le tirage a maintenant lieu. Le `r` de chaque épargnant vient du hachage de la graine avec
sa propre adresse, c'est donc un nombre différent pour chacun, et il tombe entre 0 et 1,023.

**Ada, `r = 271`.** Les seuils sont `floor((271 + k * 1024) / 4)` :

| k | Seuil | Le poids 600 d'Ada le bat-il ? |
| --- | --- | --- |
| 0 | 67 | Oui |
| 1 | 323 | Oui |
| 2 | 579 | Oui |
| 3 | 835 | Non |

Ada gagne 3 lots. Son espérance était de 2.34, donc 3 est le haut du `floor` ou du `ceil`.

**Ben, `r = 812`.** Seuils `floor((812 + k * 1024) / 4)` :

| k | Seuil | Le poids 300 de Ben le bat-il ? |
| --- | --- | --- |
| 0 | 203 | Oui |
| 1 | 459 | Non |

Ben gagne 1 lot, contre une espérance de 1.17.

**Cy, `r = 155`.** Seuils `floor((155 + k * 1024) / 4)` :

| k | Seuil | Le poids 100 de Cy le bat-il ? |
| --- | --- | --- |
| 0 | 38 | Oui |
| 1 | 294 | Non |

Cy gagne 1 lot. Son espérance était de 0.39, c'est donc son jour de chance. Sur de nombreux
tirages, il gagne un lot environ 39 pour cent du temps et rien le reste du temps.

Cinq lots ont été distribués là où 3.91 étaient attendus. C'est très bien : chaque lot vaut
un huitième de la liquidité du palier, donc le palier peut en payer huit avant d'être à sec.
Voir [la sursouscription](prizes-and-tiers.md).

Remarquez maintenant ce qu'un observateur voit au bout de tout cela. Il peut calculer
lui-même les trois tableaux, parce que `R`, `M`, les seuils et les adresses sont publics. Ce
qu'il ne peut pas faire, c'est remplir la colonne de droite, parce que les poids sont
chiffrés, et il ne peut pas non plus retrouver le 1,000, parce que seul le 1,024 a été
publié. Après la réconciliation du palier, un tirage plus tard, il apprend combien de lots
celui-ci a payés. Il n'apprend jamais à qui.

## Pourquoi découper son portefeuille ne rapporte rien

C'est la propriété qu'une version mal construite perd.

Les lots attendus d'un épargnant dans un palier valent `z = twab * odds * count / M`, ce qui
est linéaire en son poids, et `M` ne dépend pas de la façon dont le poids du pool est réparti
entre les adresses. Découpez un poids de 600 en deux portefeuilles de 300 et chacun obtient
`z = 1.17`, soit 2.34 au total. Exactement pareil. Découpez en six portefeuilles de 100 et
chacun obtient 0.39, soit 2.34 au total. Exactement pareil de nouveau. Il n'y a pas de seuil
à exploiter et pas d'arrondi à farmer, seulement plus de gaz à payer.

Une version antérieure de cette conception repliait le nombre de lots dans une seule zone
gagnante plus large, de sorte que chaque épargnant pouvait gagner au plus un lot par palier.
Cela plafonnait les gros détenteurs sous leur part équitable et récompensait ceux qui se
découpaient. Une revue de conception l'a attrapé et l'échelle imbriquée l'a remplacée.

## Ce que cela coûte

Par épargnant et par tirage, le travail chiffré est : une multiplication et une addition
pour calculer le poids, puis, pour chaque palier, une comparaison et une sélection par lot,
plus un plafonnement. Avec les trois paliers de Sepolia, cela fait 6 comparaisons, 6
sélections et une douzaine d'additions, soustractions et minimums.

Zama publie le budget par transaction sur Sepolia comme 20,000,000 unités de calcul au total
avec 5,000,000 de profondeur séquentielle, et facture une addition sur 64 bits 162,000, une
comparaison environ 118,000, une sélection 55,000 et une multiplication par un nombre public
365,000. Ces chiffres placent un épargnant dans les quelques millions d'unités de calcul,
raison pour laquelle l'évaluation est traitée par lots de `4` épargnants par transaction. La
mesure relevée est de
`3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)` par épargnant et le gaz mesuré est de
`708,836 (the marginal cost of one more saver in a batch; a batch of one costs 1,291,192)`.

## Ce que cette page ne couvre pas

Elle ne couvre pas d'où vient `R` ni comment le vérifier, ce qui est dans
[aléa et vérification](../security/randomness-and-verification.md). Elle ne couvre pas la
façon dont `prize[t]` est dimensionné ni ce qui se passe quand un palier tombe à sec en
cours de tirage, ce qui est dans [lots et paliers](prizes-and-tiers.md). Et elle ne prétend
rien cacher de qui a participé : la liste des épargnants, les lots d'évaluation et le nombre
de lots par palier sont tous publics. Voir
[ce qui reste privé](../security/what-stays-private.md).
</content>
