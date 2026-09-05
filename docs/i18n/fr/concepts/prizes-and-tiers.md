# Lots et paliers

Le rendement arrive d'un bloc à chaque période. Les paliers sont la façon dont ce bloc
devient un mélange de petits lots fréquents et d'un gros lot rare. Cette page explique le
côté argent : comment la liquidité est répartie, comment un lot est dimensionné, ce qui se
passe quand un palier paie plus que prévu, et les trois endroits où nous nous écartons
délibérément de PoolTogether V5.

La taille des lots, la liquidité des paliers et le nombre de lots ont toujours été publics
chez PoolTogether, et la part en clair des trois est publique ici. Ce qui reste chiffré,
c'est qui a gagné, et un cumul par palier appelé le report.

## Liquidité et parts

Chaque palier détient une réserve appelée sa liquidité, en nombres clairs lisibles par tous.
Deux choses l'alimentent :

- **Les récoltes.** Chaque attribution répartit la récolte vérifiée entre les paliers selon
  leurs parts. Le reste entier de cette division, les quelques unités de base qui ne tombent
  pas juste, va au palier gros lot plutôt que d'être perdu. Une récolte comptabilisée à
  l'attribution du tirage `p` est offerte à la clôture suivante, pas au tirage `p` lui-même.
- **Le report réconcilié.** Tout ce qu'un palier a offert lors d'un tirage antérieur et que
  personne n'a gagné revient quand ce palier se réconcilie, ce qui sur Sepolia se fait un
  tirage plus tard.

Chaque palier détient aussi une seconde réserve, le **report**, et celle-là est chiffrée.
C'est le cumul de tout ce que le palier a offert et que personne n'a gagné, et il est ajouté
à l'offre du palier à chaque clôture même si son montant est secret.

À la clôture, pour chaque palier :

```
prize[t]     = liquidity[t] * UTILISATION / count[t]     // plaintext only
offered[t]   = liquidity[t] + carry[t]                   // plaintext plus encrypted
liquidity[t] = 0                                         // until the tier reconciles
```

Deux choses à en retenir. La taille des lots vient de la seule part en clair, et c'est ce
qui la garde publique. Le report chiffré ne fait jamais qu'ajouter de la capacité : un
palier est donc toujours au moins aussi capable de payer que sa taille de lot publique le
laisse penser.

`UTILISATION` vaut 50 pour cent. C'est le taux d'utilisation de PoolTogether, et c'est la
défense contre la sursouscription : un palier offre toute sa liquidité mais dimensionne
chaque lot comme s'il n'en avait que la moitié. Un palier peut donc payer deux fois plus de
lots qu'il n'en attend avant d'être à sec.

**Tout cela est fixé à la clôture, avant que la graine aléatoire de ce tirage n'existe.** La
graine est tirée plus tard dans la même transaction. Personne ne peut voir une graine,
comprendre qu'il a gagné, puis déplacer de l'argent entre les paliers pour agrandir le gain.

## Les trois paliers de Sepolia

Chaque pool porte son propre jeu de paliers, parce que les chances sont une fraction de la
période propre à ce pool. Le pool USDC horaire :

| Palier | Lots par tirage (`count`) | Chances | Parts | Réconcilie tous les | Ce que ça donne |
| --- | --- | --- | --- | --- | --- |
| Gros lot | 1 | 1 sur 24 | 40 | 1 tirage | Rare et gros |
| Intermédiaire | 1 | 1 sur 6 | 20 | 1 tirage | Quelques fois par jour |
| Fréquent | 4 | 1 sur 1 | 40 | 1 tirage | Quatre lots à chaque tirage |

Les six pools qui tirent toutes les six heures gardent les mêmes nombres, les mêmes parts et
la même cadence et ne changent que les chances : gros lot 1 sur 4, intermédiaire 1 sur 2,
fréquent 1 sur 1. Un tirage de six heures est six fois plus rare, donc 1 sur 4 fait tomber
le gros lot environ une fois par jour, le même rythme que donne le jeu horaire. Le palier
intermédiaire est la seule différence : environ deux fois par jour sur les pools de six
heures contre environ quatre fois par jour sur celui d'une heure. Pourquoi six heures :
[pools et jetons](pools-and-tokens.md).

Le total des parts vaut 100 dans les deux jeux, donc le palier gros lot prend 40 pour cent
de chaque récolte, le palier intermédiaire 20 pour cent et le palier fréquent 40 pour cent.
Chaque palier de chaque pool se réconcilie à chaque tirage, un choix qui a un coût des deux
côtés ; il a sa propre section plus bas.

### Ce que ces réglages produisent

Notons `H` la récolte collectée sur une période. Le nombre nominal attendu de lots d'un
palier par tirage est `count * odds`. Réinjectez cela dans la formule de dimensionnement et
chaque palier se stabilise dans un régime permanent :

| Palier | Liquidité au repos | Taille du lot | Paiement attendu par tirage | Fréquence de déclenchement |
| --- | --- | --- | --- | --- |
| Gros lot | 19.2 H | 9.6 H | 0.4 H | Environ une fois par jour |
| Intermédiaire | 2.4 H | 1.2 H | 0.2 H | Environ toutes les six heures |
| Fréquent | 0.8 H | 0.1 H | 0.4 H (quatre lots) | À chaque tirage |

Les trois paiements attendus font exactement `H`. Tout le rendement sort sous forme de lots
et rien ne s'accumule indéfiniment.

Ce tableau est celui du pool horaire. Un pool de six heures collecte six fois plus sur une
période et tire six fois moins souvent, et ses chances plus courtes étalent ce revenu sur le
même nombre de lots : le palier gros lot se stabilise à 3.2 H de liquidité et un lot de
1.6 H, le palier intermédiaire à 0.8 H et 0.4 H, et le palier fréquent reste inchangé à
0.1 H par lot. Mesuré en argent réel plutôt qu'en `H`, le gros lot d'un pool de six heures
est de la même taille que le gros lot d'un pool horaire produisant au même rythme, parce
qu'un tirage plus rare porte six fois la récolte.

Ce sont les chiffres nominaux. Le tirage tourne contre la tranche `M` plutôt que contre le
total exact `W`, et `M` se situe entre `W` et `2W` : un palier paie donc en réalité entre la
moitié et la totalité de son nombre de lots nominal à chaque tirage. Voir
[la désignation des gagnants](winner-selection.md). Ce qu'il ne paie pas va dans le report
et est offert de nouveau, donc rien n'est perdu ; ce qui se passe à la place, c'est que la
taille des lots se stabilise quelque part entre les chiffres ci-dessus et leur double, selon
où le total du pool se situe à l'intérieur de sa tranche. Un pool près du haut d'une tranche
paie près du tableau. Un pool qui vient de franchir une puissance de deux paie pendant un
temps des lots moins nombreux et plus gros.

Une raison pour laquelle le tableau décrit le déploiement réel plutôt qu'un idéal : chaque
palier se réconcilie à chaque tirage. Ce qu'un palier a offert et que personne n'a gagné est
publié à la finalisation de ce tirage et réinscrit directement dans sa liquidité publique,
si bien que la liquidité au repos d'un palier se stabilise vraiment là où le tableau le dit,
et que la réserve affichée par l'application est bien la réserve que le palier porte. À une
cadence plus lente, le même argent serait toujours offert et toujours gagnable, mais il
resterait dans le report chiffré entre deux réconciliations, et la liquidité publique, qui
est ce qui dimensionne le lot, ne serait que la récolte comptabilisée depuis la dernière
réconciliation de ce palier. La section suivante détaille cet arbitrage.

Pour mettre un nombre dessus, supposons que la source USDC de Sepolia distille 10 USDC par
période. Le gros lot avoisine alors 96 USDC et tombe environ une fois par jour, le lot
intermédiaire avoisine 12 USDC toutes les six heures environ, et quatre lots d'environ
1 USDC tombent à chaque tirage, chacun de ces chiffres pouvant monter jusqu'au double selon
la tranche. Le débit réel de ce pool est de
`5,555 base units a second, which is 19.998 USDC a period`, le débit de chaque pool est
listé dans [pools et jetons](pools-and-tokens.md), et la taille réelle des lots se trouve
dans la carte « Le pool en ce moment » du tableau de bord de ce pool à `/app/<slug>`, lue
sur la chaîne.

Ce sont des arguments de constructeur, choisis avec la formule de chances de PoolTogether V5
et écrits pool par pool dans `packages/contracts/hearth.config.ts`. Un déploiement sur le
réseau principal avec une période d'un jour en utiliserait encore d'autres ; voir
[déploiement](../operations/deploying.md).

## La cadence de réconciliation, et ce que coûte de l'augmenter

Réconcilier un palier publie son report, et le report est exactement l'argent que ce palier
a offert et que personne n'a gagné. Soustrayez-le de ce qui a été offert, divisez par la
taille du lot, et vous savez combien de lots ce palier a payés. Ce nombre est une vraie
divulgation : c'est une mesure des soldes chiffrés, de la forme « combien de ces épargnants
avaient un poids supérieur à leur propre seuil publié ».

`reconcileEvery[t]` est le bouton de réglage de cette divulgation, et c'est un argument de
constructeur par palier. L'augmenter cache le compte pendant ce nombre de tirages puis
publie un seul nombre pour tout l'intervalle. Réglez le palier gros lot sur 24 et son compte
devient un chiffre quotidien, et les gens qu'il pourrait désigner sont tous ceux qui étaient
éligibles à un moment de cette journée plutôt que les quatre pour cent environ du pool
éligibles sur un seul tirage. Sur un palier à 1 sur 24, cette différence n'est pas
cosmétique : un compte par tirage désigne un gagnant du gros lot dans un petit ensemble.

Le prix à payer pour l'augmenter, c'est le gros lot lui-même. Une clôture déplace toute la
liquidité publique d'un palier dans le tirage et laisse le palier à zéro, et cet argent ne
revient qu'à une réconciliation. Avec une cadence de 24, sur 23 tirages sur 24 la liquidité
publique du palier gros lot n'est donc que la récolte comptabilisée depuis la dernière
réconciliation, le lot publié est dimensionné sur la part d'un seul tirage, et la réserve
accumulée n'apparaît à découvert que lors du tirage de réconciliation. L'argent n'est pas
inactif pendant ce temps, puisque le report chiffré est ajouté à l'offre du palier à chaque
clôture et peut être gagné en permanence. Il est invisible, en revanche, et un gros lot que
personne ne peut regarder grandir n'est pas vraiment un gros lot.

Un compte de lots caché et un gros lot visible qui s'accumule ne peuvent pas tenir en même
temps. **Ce déploiement a choisi le gros lot visible.** Les trois paliers tournent à
`reconcileEvery = 1`, si bien que le report de chaque palier est publié à la finalisation du
tirage dont il vient, vérifié sur la chaîne contre le handle publié par le coffre, et
réinscrit dans la liquidité publique par `reconcile`. La réserve s'accumule à découvert,
comme celle de PoolTogether, et le nombre de lots payés par chaque palier devient public un
tirage plus tard, là encore comme chez PoolTogether. Jamais qui a gagné, dans un cas comme
dans l'autre.

Cela fait du compte ci-dessus un résidu divulgué plutôt qu'un résidu atténué. Le
raisonnement est inchangé et reste vrai : un compte par tirage sur un palier à 1 sur 24 est
une mesure portant sur le petit ensemble des épargnants éligibles à ce tirage, et elle
s'accumule contre un solde qui ne bouge jamais. C'est une mesure plus faible dans les pools
de six heures, dont le palier gros lot est à 1 sur 4, si bien que chaque compte couvre
environ un quart du pool plutôt qu'un vingt-quatrième, et qu'il y en a quatre par jour
plutôt que vingt-quatre. C'est écrit dans
[ce qui reste privé](../security/what-stays-private.md) et porté dans la
[liste des limites](../limitations.md). Deux choses la limitent encore. Les comptes sont
grossiers, puisque rien de plus fin qu'un nombre entier de lots n'est jamais publié. Et les
seuils ne peuvent pas être dirigés vers un solde suspecté, parce que la graine est tirée
dans le coprocesseur et révélée seulement une fois sa période terminée.

Un déploiement qui préférerait la mesure plus lente à la réserve visible règle le bouton
plus haut et prend l'arbitrage dans l'autre sens. C'est un redéploiement.

## La sursouscription : quand un palier paie plus que prévu

Les lots sont indépendants, donc un palier qui en attend quatre en distribue parfois six, ou
neuf. Chaque lot vaut un huitième de la liquidité du palier fréquent, celui-ci peut donc en
payer huit. Au-delà, le palier est vide.

Hearth gère cela avec un compteur chiffré par palier et par tirage. Chaque paiement est
plafonné au plus petit des deux entre ce que l'épargnant a gagné et ce qu'il reste au
palier, et le compteur baisse du montant plafonné. Aucune transaction n'échoue, et
l'arithmétique de personne ne déborde.

### Ce que vit un gagnant tardif

L'évaluation parcourt la liste des épargnants depuis un point de départ dérivé de la graine
de ce tirage. Si le palier se vide en cours de parcours :

- L'épargnant évalué à cet instant reçoit ce qu'il reste, ce qui peut être moins que les
  lots que ses seuils disent avoir gagnés.
- Les épargnants plus loin dans le parcours ne reçoivent rien de ce palier lors de ce
  tirage. Les autres paliers ne sont pas touchés : chaque palier a son propre compteur.

Personne ne peut acheter une meilleure place dans cette file. L'ordre du parcours est fixé
par la graine, l'appelant d'`evaluate` choisit combien d'épargnants faire avancer et jamais
lesquels, et le point de départ change à chaque tirage, si bien qu'aucune adresse n'est
systématiquement dernière.

C'est visible par l'épargnant concerné, pas silencieux. Son poids stocké et son crédit
stocké pour ce tirage sont tous deux déchiffrables par lui : il peut donc recalculer ses
seuils à partir de la graine publique et constater que son crédit est court.

### À quelle fréquence cela arrive

Pour le palier fréquent, avec de nombreux petits épargnants, le nombre de lots distribués
suit de près une loi de Poisson de moyenne 4, et le palier peut en payer 8. La probabilité
d'avoir besoin d'un neuvième est d'environ 2 pour cent par tirage. Comme le tirage tourne
contre la tranche plutôt que contre le total exact, le compte réellement attendu se situe
entre 2 et 4, donc 2 pour cent est le plafond plutôt que le cas typique. Pour les deux
paliers à `count = 1`, le nombre attendu de lots est bien inférieur à un alors que la
capacité est encore de deux : le plafonnement y est donc plus rare de plusieurs ordres de
grandeur.

Cette approximation suppose un pool de nombreux petits épargnants. Dans un pool de trois
épargnants de tailles très différentes, la dispersion est autre, et dans le petit pool de
démonstration de Sepolia il est facile de construire un tirage qui plafonne. C'est une
propriété de la taille de la démonstration, pas un bogue.

## Trois écarts délibérés par rapport à PoolTogether V5

Les trois sont énoncés ici plutôt qu'enfouis, parce qu'un relecteur qui connaît V5 va les
chercher.

### 1. Le tirage tourne contre une tranche, pas contre le total exact

V5 fait tourner son test du gagnant contre l'offre totale exacte du tirage, ce qu'il peut
faire parce que ce nombre est public sur une chaîne transparente. Publier le total exact ici
laisserait fuir les montants des dépôts individuels : Hearth ne publie donc que la tranche
en puissance de deux au-dessus.

La conséquence est celle décrite plus haut : un palier paie entre la moitié et la totalité
de son nombre de lots nominal à chaque tirage, et la taille des lots se stabilise d'autant
plus haut. Aucun argent n'est perdu et les chances d'aucun épargnant ne sont déformées par
rapport à celles d'un autre, parce que chaque épargnant d'un palier est mis à l'échelle par
le même `W / M`. C'est la limite 12.

### 2. Pas de palier de réserve

V5 prélève une part de chaque apport dans une réserve. La réserve finance l'incitation à
attribuer le tirage, et elle amortit un palier sursouscrit en le rechargeant.

Hearth n'a pas de réserve. Le taux d'utilisation de 50 pour cent est le seul amortisseur, ce
qui est l'alternative que la documentation de V5 elle-même nomme pour les déploiements qui
utilisent `tierLiquidityUtilizationRate` à cette fin. La conséquence est le plafonnement
décrit plus haut : lors du rare tirage sursouscrit, les derniers gagnants dans l'ordre du
parcours sont courts plutôt que rechargés.

Nous avons choisi cela parce qu'une réserve a besoin d'un chemin de retrait contrôlé par le
propriétaire pour être utile, et que tout pouvoir du propriétaire dans un pool confidentiel
est une chose à laquelle un épargnant doit faire confiance. L'arbitrage est écrit dans la
[liste des limites](../limitations.md) sous la limite 4.

### 3. Les chances du gros lot sont mesurées sur une seule période

V5 mesure les chances du palier gros lot sur toute la fenêtre d'accumulation du palier, si
bien que la chance de rafler une réserve qui s'est constituée pendant un an reflète un an de
participation.

Hearth mesure les chances du gros lot sur une seule période, comme tous les autres paliers.
Cela veut dire qu'un gros détenteur qui se présente pour une seule période prend une chance
pleinement proportionnelle sur une réserve que d'autres ont mis 24 périodes à remplir. C'est
une vraie asymétrie et elle est énoncée comme la limite 5.

Le correctif peu coûteux est connu et noté pour une version ultérieure : suivre les
solde-secondes accumulées depuis le dernier paiement du gros lot, et pondérer le palier gros
lot par cela plutôt que par le poids d'une seule période. Il a été laissé de côté en version
un parce qu'il ajoute un second accumulateur avec sa propre analyse de débordement, et que
livrer la chose plus simple entièrement prouvée valait mieux que livrer la chose meilleure
qui ne l'est pas.

## Ce que cette page ne couvre pas

Elle ne couvre pas d'où vient la récolte ni comment elle est vérifiée, ce qui est dans
[source de rendement](yield-source.md). Elle ne couvre pas le test par épargnant qui décide
qui gagne, ce qui est dans [la désignation des gagnants](winner-selection.md). Et elle ne
fait aucune promesse de confidentialité sur la taille des lots : celle-ci est publique ici
par conception, et ce que les comptes de lots publiés divulguent est exposé dans
[ce qui reste privé](../security/what-stays-private.md).
