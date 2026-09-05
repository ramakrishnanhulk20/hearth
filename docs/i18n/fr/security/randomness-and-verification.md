# Aléa et vérification

Un tirage ne vaut quelque chose que si un inconnu peut le vérifier. Cette page explique
comment.

## D'où vient la graine

Un seul appel, à l'intérieur de la transaction qui clôture un tirage :

```solidity
euint64 seed = FHE.randEuint64();
```

Cela s'exécute dans le coprocesseur de Zama. Le nombre est produit par un générateur
cryptographiquement sûr sous la clé FHE du réseau, et ce qui revient au contrat est un
handle chiffré, pas un nombre. Personne n'a vu la valeur à cet instant : ni l'appelant, ni
nous, ni le mineur.

Deux propriétés du générateur de Zama comptent ici, et toutes deux sont énoncées dans la
documentation de Zama :

- **Il doit s'exécuter à l'intérieur d'une transaction.** Générer une valeur aléatoire
  modifie l'état du générateur sur la chaîne, donc cela ne peut pas se faire par `eth_call`,
  la manière en lecture seule de simuler un appel. Personne ne peut prévisualiser un tirage
  hors chaîne pour voir s'il gagnerait.
- **Il est cryptographiquement sûr et reste chiffré** jusqu'à ce que quelque chose le rende
  explicitement déchiffrable.

## Pourquoi personne ne peut la retirer, ni redimensionner ce qu'elle fait gagner

Quatre choses, ensemble.

1. **La clôture réussit une fois.** L'automate d'états du tirage n'autorise `closeDraw(p)`
   qu'une seule fois par tirage. Il n'y a pas de seconde tentative pour s'acheter un
   meilleur nombre.
2. **La valeur est inconnue au moment où elle est tirée.** Puisque la graine est chiffrée
   dès sa création, celui qui envoie la transaction de clôture n'apprend rien du fait de
   l'avoir envoyée. Il n'y a aucun intérêt à se disputer le rôle d'appelant.
3. **L'étape de publication est à sens unique.** Après la clôture, la graine est marquée
   publiquement déchiffrable. Ce drapeau est permanent et irrévocable sur la liste de
   contrôle d'accès de Zama, donc le nombre que le monde voit est le nombre auquel le
   contrat s'était engagé, pas un nombre choisi après coup.
4. **Les lots sont fixés avant que la graine n'existe.** La taille du lot de chaque palier
   et la liquidité qu'il offre sont calculées en tête de cette même transaction de clôture,
   avant l'appel à `randEuint64`. Dans une version antérieure, elles étaient fixées plus
   tard, à l'attribution, ce qui laissait une fenêtre où quelqu'un pouvait lire la graine,
   comprendre qu'il avait gagné, puis déplacer de la liquidité entre les paliers pour rendre
   ce gain plus gros. Cette fenêtre a disparu.

Comparez avec les autres conceptions. Un tirage alimenté par un hachage de bloc peut être
retiré par un validateur à qui le résultat ne plaît pas. Un tirage alimenté par un nombre
hors chaîne peut être choisi purement et simplement. Ni l'un ni l'autre n'est possible ici,
et c'est toute la raison pour laquelle l'aléa est généré sur la chaîne sous chiffrement et
jamais par un générateur hors chaîne.

## Ce qui devient public, et quand

| Valeur | Publiée quand | Pourquoi elle doit être publique |
| --- | --- | --- |
| La graine `R` | À la clôture, lisible après déchiffrement par le relayer | Sans elle, personne ne peut recalculer un seuil |
| Le compteur d'échelle, dont découle la tranche `M` | À la clôture | Les seuils sont relatifs à la taille du pool |
| Le fait que la période était non vide | À la clôture | Distingue un tirage vide d'un vrai tirage |
| La récolte du tirage | À la clôture | C'est l'argent qui finance les lots ultérieurs |
| La taille du lot de chaque palier et sa liquidité offerte en clair | À la clôture | Nécessaire pour vérifier ce que rapporte un gain |
| Le report de chaque palier | À la finalisation de chaque tirage, puisque chaque palier se réconcilie à chaque tirage | Nécessaire pour vérifier combien de lots le palier a payés |
| Le compteur de non-financement | À la finalisation | Prouve que la cagnotte a financé chaque crédit écrit par le coffre |

Deux choses ne figurent délibérément **pas** sur cette liste. Le solde total exact pondéré
par le temps du pool n'est jamais publié, parce que le faire permettait à un observateur de
retrouver exactement le montant du dépôt d'un épargnant isolé ; la tranche au-dessus est
publiée à la place. Et aucune valeur propre à un épargnant n'est jamais marquée publiquement
déchiffrable.

Tout ce qui figure sur la liste arrive après la fin de la période que cela décide. Publier
`R` ne peut aider personne à changer un poids, parce que les poids de la période `p` sont
figés à l'instant où la période `p` se termine, ce qui précède le moment où le tirage peut
seulement être clôturé.

Chacun de ces nombres atteint le contrat avec une signature du service de gestion des clés
de Zama, vérifiée sur la chaîne par `FHE.checkSignatures`. La preuve est liée aux handles
dans un ordre fixe : `[seed, scaleCount, nonEmpty, harvested]` à l'attribution, et un handle
de report par réconciliation. Rien ne peut être permuté entre les emplacements ni rejoué
contre un autre tirage. L'automate d'états du tirage est la protection contre le rejeu :
chaque étape réussit une fois par tirage, et la réconciliation une fois par palier.

## La tranche, et la façon dont le coffre la suit

Le solde total pondéré par le temps du pool pour une période, `W`, reste chiffré. Le nombre
contre lequel le tirage tourne est `M = 2^m`, la plus petite puissance de deux supérieure ou
égale à `W`.

Le coffre suit `m` d'un tirage au suivant plutôt que de le recalculer à partir de zéro. À
chaque clôture, il compare `W` sous chiffrement aux cinq puissances de deux autour du `m` du
tirage précédent, additionne les cinq résultats en un seul petit compteur chiffré, et marque
ce compteur publiquement déchiffrable. La cagnotte lit le compteur vérifié et en déduit le
nouveau `m`, qui ne peut bouger que de trois crans au plus par tirage. Une comparaison
chiffrée séparée avec 1 donne le drapeau de non-vacuité.

Le registre public par tirage est donc un seul petit entier, et il ne change que lorsque le
pool franchit une puissance de deux. `scaleBits()` sur la cagnotte lit le `m` courant ; le
déploiement l'amorce avec `initialScaleBits`, la longueur en bits attendue du total de la
première période, et le suivi corrige toute erreur à raison de trois bits par tirage au
plus.

## Comment n'importe qui recalcule un seuil

Tout ce qui suit n'utilise que des données publiques. Pas de portefeuille, pas de signature,
pas d'autorisation.

Pour le tirage `p`, l'adresse d'épargnant `u`, le palier `t` avec `count[t]` lots et des
chances `oddsNum[t] / oddsDen[t]` :

```
prn         = keccak256(abi.encode(R, p, u, t))
r           = prn mod M                                        // 0 <= r < M
threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))
```

pour chaque `k` de `0` à `count[t] - 1`. Cet épargnant a gagné le lot `k` si et seulement si
son poids pondéré par le temps pour la période `p` était strictement supérieur à
`threshold_k`.

Vous n'avez pas à le réimplémenter. Le coffre expose
`thresholdOf(drawId, saver, tier, k)` comme une vue pure sur la même arithmétique que celle
qu'utilise l'évaluation, si bien que le panneau de vérification de l'application, la suite de
tests et toute personne munie d'un explorateur de blocs lisent la même implémentation. Le
réimplémenter hors chaîne représente quatre lignes d'arithmétique en grands entiers, si vous
préférez vérifier le contrat contre votre propre code.

Un exemple chiffré avec de petits nombres est dans
[la désignation des gagnants](../concepts/winner-selection.md). Un exemple rempli à partir
d'un vrai tirage Sepolia est ici, pris sur le pool `usdc`, dont la cagnotte est
`0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2`. Chaque pool publie les mêmes champs pour ses
propres tirages :

| Champ | Valeur |
| --- | --- |
| Tirage | `2, the period from 23:00 to 00:00 UTC on 2 September 2026` |
| Graine `R` | `5625525180683981523` |
| Tranche `M` | `2^43, which is 8,796,093,022,208 balance-seconds` |
| Récolte | `19.531380 USDC` |
| Taille des lots par palier | `3.559644 / 1.779822 / 0.889911 USDC, grand / mid / frequent` |
| Lots payés par palier | `0 / 0 / 5, against a funded capacity of 2 / 2 / 8` |

Lu sur la chaîne : la graine et la tranche viennent de l'événement `DrawAwarded` de la
cagnotte, la taille des lots et la liquidité offerte de `drawParams(2)`, et les lots payés
des trois événements `TierReconciled` de ce tirage, puisque ce qu'un palier a offert et n'a
pas payé est exactement le report qu'il a publié. Les paliers gros lot et intermédiaire n'ont
rien payé lors de ce tirage et ont rendu la totalité de leur offre, ce que font la plupart du
temps un palier à 1 sur 24 et un palier à 1 sur 6.

Le panneau de vérification de l'application fait cette arithmétique dans le navigateur pour
n'importe quelle adresse que vous saisissez, à `/verify?pool=<slug>` pour le pool voulu. Il
n'a aucun accès privilégié ; ce sont les mêmes entrées publiques et la même formule.

## Pourquoi le reste est sans biais

Réduire un grand nombre aléatoire dans un intervalle par un simple reste est en général
biaisé. Si `2^256` n'est pas un multiple exact de l'intervalle, les petits résidus
apparaissent un peu plus souvent, et ce biais retombe inégalement sur les épargnants.
PoolTogether V5 le résout par échantillonnage avec rejet, et une version antérieure de
Hearth aussi.

Hearth n'en a plus besoin. `M` est une puissance de deux par construction, et `2^256` est un
multiple exact de toute puissance de deux jusqu'à `2^256`. Donc `prn mod M` n'est rien
d'autre que les `m` bits de poids faible d'un hachage de 256 bits, et chaque valeur de `0` à
`M - 1` provient exactement du même nombre d'entrées. **Le biais est nul, pas faible**, sans
boucle, sans rejet et sans rien qu'un vérificateur doive reproduire soigneusement.

C'est un bénéfice secondaire du fait de publier la tranche plutôt que le total exact, et il
vaut la peine d'être signalé parce qu'il supprime un morceau de code que quiconque
vérifierait le tirage devrait sinon reproduire à l'identique.

## Le forçage d'adresses ne marche pas

Une fois `R` public, quelqu'un pourrait générer des adresses jusqu'à en trouver une avec un
seuil bas. Cela ne servirait à rien. Les seuils sont comparés à un poids pour la période
`p`, et une adresse toute neuve n'a aucune observation à la période `p` ou avant : son poids
est donc nul. Zéro ne bat aucun seuil. Pour avoir du poids dans la période `p`, il fallait
détenir un solde pendant la période `p`, qui était terminée avant que `R` n'existe.

Forcer pour un tirage futur échoue pour l'autre raison : la graine de ce tirage n'a pas
encore été générée, et elle est imprévisible.

## Ce que la vérification prouve, et ce qu'elle ne prouve pas

Être précis là-dessus est tout l'objet de la page.

**Elle prouve :**

- Que la graine a été générée sur la chaîne, à l'intérieur d'une transaction, sous la clé du
  réseau, et publiée exactement une fois.
- Que la taille des lots et la liquidité offerte ont été fixées avant l'existence de cette
  graine.
- Que la règle appliquée à chaque épargnant est publique, uniforme et recalculable par
  n'importe qui.
- Que la taille des lots découle de la liquidité du palier et des paramètres du palier par
  une arithmétique publique.
- Que le nombre de lots payés par chaque palier correspond à ce que le palier a offert moins
  ce qui est revenu dans son report.
- Que la cagnotte a financé chaque crédit écrit par le coffre, puisque le compteur de
  non-financement est publié et vaut zéro.

**Elle ne prouve pas :**

- Que le générateur du coprocesseur est uniforme. C'est le moteur de Zama, et il est de
  confiance, pas vérifié ici.
- Que le service de gestion des clés a signé le vrai texte clair du handle de la graine. Le
  contrat vérifie la signature, pas la sémantique. Un quorum malhonnête pourrait signer une
  valeur de son choix. Toute application sur ce protocole partage cette hypothèse ; c'est
  l'attaquant 8 du [modèle de menaces](threat-model.md).
- Que la tranche publiée est bien la tranche de la somme des poids de tous les épargnants.
  Un observateur extérieur ne peut pas additionner des poids chiffrés, et il ne peut
  désormais plus voir la somme non plus. Ce dont il dispose à la place, c'est que le même
  code public et immuable a calculé les comparaisons et le poids de chaque épargnant à
  partir des mêmes observations, et que les invariants de conservation tiennent : payé égale
  crédité, et personne ne retire plus que son principal plus ses gains.
- Quoi que ce soit sur qui a gagné. C'est tout le sujet, et c'est pourquoi publier davantage
  renforcerait la vérification et affaiblirait le produit. Publier le total exact en est
  l'exemple concret : cela rendait la taille du pool vérifiable, et cela rendait aussi le
  dépôt d'un épargnant isolé récupérable à l'unité de base près.

## Ce qu'un épargnant peut vérifier et que personne d'autre ne peut

Un épargnant peut aller un cran plus loin qu'un observateur extérieur, parce qu'il peut
déchiffrer son propre poids et son propre crédit pour un tirage.

1. Révélez votre poids pour le tirage `p`.
2. Recalculez vos propres seuils à partir du `R` et du `M` publics, ou lisez-les depuis
   `thresholdOf`.
3. Comptez combien vous en avez battus, multipliez par la taille du lot du palier.
4. Révélez votre crédit pour le tirage `p` et vérifiez que cela correspond.

Si cela ne correspond pas, c'est soit qu'un palier est tombé à sec avant que le parcours ne
vous atteigne, ce qui est le plafonnement documenté, soit que quelque chose ne va pas et
vous avez les nombres pour le prouver. L'application fait les quatre étapes pour vous et
montre l'arithmétique.
</content>
