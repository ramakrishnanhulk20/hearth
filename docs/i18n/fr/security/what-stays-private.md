# Ce qui reste privé

Trois choses comptent en matière de confidentialité : ce qui reste chiffré, le fait que le
tirage soit prouvablement équitable et pondéré par les dépôts, et le fait que chaque fuite
soit nommée. Cette page répond à la première et à la troisième. Notre position est que
nommer nous-mêmes chaque point de fuite vaut mieux qu'une affirmation invérifiable.

Tout ici est écrit pour un pool, et Hearth en fait tourner sept, un par jeton confidentiel.
Ils ne partagent rien : l'ensemble d'anonymat de chaque pool est constitué de ses propres
épargnants et de personne d'autre, et un pool à trois épargnants n'est pas aidé par un autre
pool qui en a trente.

## Le tableau

| Valeur | État | Qui peut la lire |
| --- | --- | --- |
| Votre principal | Chiffré | Vous seul, par signature EIP-712 |
| Vos gains non réclamés | Chiffré | Vous seul |
| Votre poids pondéré par le temps, par tirage | Chiffré | Vous seul |
| Votre crédit, par tirage, et donc le fait que vous ayez gagné | Chiffré | Vous seul |
| Le montant que vous déposez | Chiffré de bout en bout | Vous seul |
| Le montant que vous retirez | Chiffré de bout en bout | Vous seul |
| **Le poids total du pool sur une période** | **Chiffré, jamais publié** | **Personne** |
| Le report de chaque palier entre deux réconciliations | Chiffré | Personne |
| La tranche dans laquelle est tombé le total du pool, une puissance de deux | Public une fois la période terminée | Tout le monde |
| Le fait que quelqu'un ait détenu un solde pendant la période | Public une fois la période terminée | Tout le monde |
| La graine aléatoire de chaque tirage | Public une fois la période terminée | Tout le monde |
| Le rendement récolté à chaque tirage | Public une fois la période terminée | Tout le monde |
| La taille du lot de chaque palier et la liquidité en clair offerte | Public dès la clôture | Tout le monde |
| Combien de lots le palier fréquent a payés | Public un tirage plus tard | Tout le monde |
| Combien de lots le palier intermédiaire a payés | Public un tirage plus tard | Tout le monde |
| Combien de lots le palier gros lot a payés | Public un tirage plus tard | Tout le monde |
| La liste des adresses des épargnants | Public | Tout le monde |
| Quand vous avez déposé, retiré ou été évalué, et dans quel lot | Public | Tout le monde |
| Le compteur de non-financement | Public à la finalisation | Tout le monde |
| Les montants sponsorisés et le débit | Public | Tout le monde |
| Le montant que vous enveloppez dans le jeton confidentiel ou désenveloppez | Public | Tout le monde |
| Chaque seuil que chaque adresse devait battre, dans chaque palier | Calculable publiquement | Tout le monde |

Deux façons de lire ce tableau. La colonne de gauche des secrets, ce sont exactement les
informations personnelles, plus les deux totaux à l'échelle du pool qui se sont révélés être
des informations personnelles déguisées. La colonne de droite des faits publics, c'est ce
dont un observateur extérieur a besoin pour vérifier que le tirage était honnête. Ce partage
est la conception.

## Ce qu'un observateur peut et ne peut pas reconstituer

Un observateur disposant d'un nœud d'archive complet et d'une patience infinie peut
construire :

- La liste complète des épargnants et le bloc exact où chacun a agi.
- La graine, la tranche, la récolte et la taille des lots de chaque tirage, ainsi que le
  nombre de lots de chaque palier, un tirage après celui auquel il appartient.
- Chaque seuil que chaque adresse devait battre. Il peut littéralement calculer votre
  échelle.
- Les avoirs totaux du pool dans son jeton confidentiel, sous forme de handle chiffré,
  qu'il ne peut pas lire.

Il ne peut pas obtenir :

- Un solde individuel, à aucun moment.
- Un poids individuel, donc les chances de personne.
- Quelles adresses ont gagné un tirage, ni combien quiconque a été payé.
- Le poids total exact du pool, seulement la puissance de deux au-dessus.

L'écart entre ces deux listes est ce que Hearth vend. Le reste de cette page est le récit
honnête des endroits où cet écart se resserre.

## Règle 1 : la tranche, et la fuite que nous avons supprimée

Jusqu'au 3 septembre 2026, cette conception publiait le solde total exact pondéré par le
temps du pool, `W`, à chaque tirage, au motif que le publier était ce qui rendait le tirage
vérifiable. Une revue a prouvé que cet argument coûtait trop cher.

Voici la fuite, dans les termes du relecteur. Pour toute période close `p`,
`W_p = B * L + somme sur chaque action de D_i * (periodEnd(p) - t_i)`, où `B` est le
principal total reporté dans la période et `D_i` la variation signée apportée par chaque
action. `B`, `L`, `periodEnd(p)` et chaque `t_i` sont publics, parce que les événements de
dépôt et de retrait portent les horodatages. Donc **un épargnant qui a été le seul à bouger
de l'argent sur une période voit ce montant retrouvé à partir des deux totaux publiés et de
l'horodatage public de sa propre transaction.** Pas borné, retrouvé exactement, reste nul.
Cela empire avec plus de données, pas l'inverse : chaque période close est une équation de
plus, chaque action est une inconnue, la chaîne est ancrée à zéro, et les événements
nomment qui a agi et quand, si bien que deux personnes ayant bougé entre deux périodes
calmes sont elles aussi retrouvées exactement.

Cette fuite a disparu, parce que le nombre dont elle a besoin n'est plus publié. Ce que le
coffre publie désormais, c'est la tranche : la plus petite puissance de deux supérieure ou
égale à `W`, notée `M`. Cinq comparaisons chiffrées par tirage suivent où `W` se situe par
rapport à la tranche du tirage précédent, et seul le petit compte auquel elles s'additionnent
est déchiffré. Entre deux franchissements d'une puissance de deux, des tirages consécutifs
publient le même nombre, et les différencier donne zéro.

Ce qui reste est une version bien plus petite de la même chose.

- **Un seul épargnant.** La tranche publiée donne le poids de cet épargnant à un facteur
  deux près.
- **Deux épargnants.** Chacun peut soustraire son propre poids et borner celui de l'autre,
  là encore à un facteur deux près.
- **Trois ou plus.** Toute répartition compatible avec la tranche est possible, et
  l'ensemble grandit avec chaque épargnant supplémentaire.

L'application l'indique au-dessus de chaque écran dès que le pool compte moins de trois
épargnants. La documentation de Zama fait le même constat à propos de son batcher, dans les
mêmes termes : « la somme d'une seule valeur est cette valeur ». Une tranche est une version
plus faible de cette phrase, pas une échappatoire.

## Règle 2 : un solde qu'un observateur peut identifier n'a aucune confidentialité de tirage

C'est la formulation la plus tranchée de la page, elle a donc sa propre règle.

Le test du gagnant est une fonction déterministe d'un seul secret, votre poids, et par
ailleurs de données entièrement publiques. Les seuils sont publics par conception, parce
qu'ils sont ce qui rend le tirage vérifiable. Donc **quiconque peut identifier votre solde
calcule votre résultat, gagné ou perdu, pour chaque palier de chaque tirage, sans aucun
déchiffrement**, et pour chaque tirage ultérieur aussi, puisque les gains reposent sur un
solde distinct qui n'entre jamais dans les chances.

La façon habituelle dont un solde est identifié est le point de fuite de l'enveloppement de
la règle 3 : envelopper un jeton public dans sa forme confidentielle est un mouvement
public, donc un épargnant qui enveloppe puis dépose le même montant quelques secondes plus
tard a publié son dépôt. À partir de là, ses résultats de tirage sont de l'arithmétique
publique.

Même une borne large mord. Un observateur ne disposant que d'une borne supérieure sur votre
solde prouve une perte certaine dans tout palier dont le seuil se situe au-dessus de cette
borne.

Ce que l'application y fait : elle garde le blindage et le dépôt comme des étapes distinctes
de l'écran Dépôt, et sur l'étape de blindage elle vous dit en un paragraphe d'utiliser un
chiffre rond pour qu'un blindage soit un bac plutôt qu'un dépôt exact, de blinder au moment
de votre choix, et d'en déposer une partie plus tard, pour qu'un dépôt soit tiré d'une
accumulation de composition inconnue. Ce qu'aucun changement de contrat ne peut faire, c'est
rendre un seuil privé, parce qu'un seuil privé est un tirage invérifiable.

## Règle 3 : le point de fuite de l'enveloppement, dans les deux sens

Transformer un jeton public en sa forme confidentielle est un mouvement ERC-20 public. Le
montant apparaît dans l'événement `Wrap` du wrapper, dans le `Transfer` du jeton
sous-jacent, et une nouvelle fois dans la trace du coprocesseur qui a chiffré ce texte
clair. Il n'existe pas de manière confidentielle de convertir un jeton public.

Nous avons mesuré la corrélation sur notre propre déploiement antérieur. En balayant les
blocs Sepolia 11528000 à 11618500, trois dépôts sur cinq se trouvaient deux à quatre blocs
après un enveloppement public d'exactement 100 USDC par la même adresse. N'importe qui
lisant les journaux publics pouvait chiffrer ces trois dépôts à 100 USDC sans casser la
moindre garantie cryptographique. Zama documente le même effet pour son batcher et l'appelle
la corrélation enveloppement-participation.

Désenvelopper publie un montant lui aussi, et c'est le premier des deux appels de
désenveloppement qui le fait : un désenveloppement jamais finalisé fuit donc déjà. Cela
donne une deuxième divulgation nommée : **les gains cumulés deviennent une borne inférieure
publique pour toute adresse qui enveloppe à l'entrée et désenveloppe entièrement à la
sortie.** Pour une adresse dont Hearth est la seule contrepartie dans ce jeton confidentiel,
le total public désenveloppé moins le total public enveloppé vaut exactement les gains
retirés sur toute la durée de vie, diminués du principal et du solde confidentiel que cette
adresse détient encore. Ces deux quantités sont cachées et positives ou nulles, donc la
différence est toujours une borne inférieure, et elle devient exacte une fois que l'adresse
est vidée.

Désenvelopper vers une adresse neuve n'aide pas, parce que le transfert confidentiel vers
cette adresse est lui-même le lien.

Ce que Hearth fait : des étapes séparées, un avertissement sur l'étape de blindage du Dépôt,
une ligne sur cette étape et de nouveau sur l'onglet « Retour aux USDC ordinaires » du
Retrait vous disant de bouger un chiffre rond, et la suggestion de laisser un solde
confidentiel permanent derrière vous. Le montant reste le vôtre à saisir dans tous les cas ;
l'application ne propose pas un jeu de coupures. Ce que Hearth ne peut pas faire : en
supprimer quoi que ce soit.

## Règle 4 : les comptes de lots publiés sont une mesure lente

Chaque réconciliation publie combien de lots un palier a payés. Comme le seuil de chaque
épargnant est public, ce compte est une contrainte dure de la forme « combien de ces
épargnants avaient un poids supérieur à leur propre seuil publié ». Il ne porte que quelques
bits, mais c'est une vraie mesure, et elle s'accumule.

**Un solde qui ne change jamais sur de nombreux tirages est progressivement resserré par ces
comptes.** Un épargnant qui dépose ou retire remet à zéro sa propre inconnue et le
resserrement recommence.

Deux choses limitent le rythme. Les comptes sont grossiers : rien de plus fin qu'un nombre
entier de lots n'est jamais divulgué. Et les seuils ne sont pas choisissables par un
attaquant, parce que la graine est tirée dans le coprocesseur et révélée seulement après la
clôture de sa période : personne ne peut donc viser un solde suspecté avec une requête.

Un troisième amortisseur était disponible, et ce déploiement y a renoncé volontairement.
`reconcileEvery[t]` fixe combien de tirages passent entre deux publications du report d'un
palier. L'augmenter publie un compte par intervalle au lieu d'un par tirage, si bien qu'un
gros lot est attribué à toutes les personnes éligibles sur cet intervalle. Ce que cela coûte,
c'est le gros lot lui-même : une clôture déplace toute la liquidité publique d'un palier dans
le tirage, et cet argent ne revient qu'à une réconciliation, donc à une cadence de 24 la
liquidité publique du palier gros lot n'est que la part de récolte d'un seul tirage sur 23
tirages sur 24, le lot publié est dimensionné là-dessus, et la réserve accumulée n'apparaît
à découvert que lors du tirage de réconciliation. L'argent est offert et gagnable pendant
tout ce temps, à l'intérieur du report chiffré. Personne ne peut le voir.

Les trois paliers tournent donc à `reconcileEvery = 1`. La réserve s'accumule en public, le
compte de chaque palier devient public un tirage plus tard, et la mesure ci-dessus tourne à
son plein régime d'un compte par palier et par tirage. Sur le palier gros lot, cela veut dire
qu'un paiement désigne les épargnants éligibles à ce seul tirage, environ quatre pour cent du
pool, plutôt qu'une journée entière d'entre eux. C'est un résidu divulgué, pas un résidu
atténué, et c'est la limite 14. La cadence reste un argument de constructeur : un déploiement
qui veut la mesure plus lente peut l'avoir.

## Règle 5 : la couche jeton est celle de Zama, pas la nôtre

L'actif de chaque pool est l'un des jetons confidentiels de Zama. C'est délibéré, et cela
veut dire que les pouvoirs propres au jeton s'appliquent à l'argent qui passe par Hearth,
pool par pool : sept wrappers, les mêmes pouvoirs sur chacun. Les voici nommés :

Le contrat Sepolia est un `ConfidentialWrapper` derrière un proxy modifiable, détenu par
Zama, avec une propriété en deux temps et la renonciation désactivée. La lecture de son
source vérifié le 2 septembre 2026 donne trois faits qui comptent pour la confidentialité :

1. **Des observateurs, rétroactivement.** Le propriétaire peut appeler
   `addObserver(address)`, ce qui accorde à cette adresse un déchiffrement utilisateur
   universel sur tout handle sur lequel le contrat de jeton détient des droits. Cela couvre
   chaque montant de dépôt, chaque paiement de retrait, et chaque montant de financement de
   lots par lot d'évaluation que la cagnotte envoie au coffre. Le mot qui compte est
   rétroactif : un observateur nommé à n'importe quelle date future peut déchiffrer des
   montants déjà présents sur la chaîne, donc « surveiller `ObserverAdded` et sortir » n'est
   pas une défense. État réel au 2 septembre 2026 : `observerCount()` vaut 0 et
   `observers()` est vide.
2. **Liste de refus et pause.** Le propriétaire peut bloquer une adresse, ce qui l'empêche
   de déposer, de retirer ou de désenvelopper, parce que chacune de ces opérations est une
   mise à jour du jeton avec cette adresse d'un côté. Un rôle de mise en pause existe ; en
   réel il est fixé à l'adresse zéro, donc la mise en pause est actuellement désactivée.
3. **Modifiabilité.** L'implémentation peut être remplacée par son propriétaire, donc le
   comportement du jeton, y compris la manière dont il traite les handles sur lesquels il a
   des droits, peut changer sous nos pieds.

Notez la portée exacte du point 1. Il n'y a pas de transfert de lot par épargnant chez
Hearth, donc il n'y a pas de paiement par gagnant à lire pour un observateur. Ce qui bouge à
la couche jeton, c'est un transfert de financement par lot d'évaluation, de la cagnotte vers
le coffre, portant le total crédité à tout le monde dans ce lot. Un lot d'un seul fait de ce
total le lot exact d'un épargnant, et le pool réel à cinq épargnants avec une taille de lot
de 4 termine chaque parcours par un lot d'un seul. `evaluate` est ouvert à tous et prend sa
taille de lot chez l'appelant : aucun lot minimal ne peut donc être imposé. La
[limite 7](../limitations.md) l'enregistre comme un résidu accepté et nomme le correctif
côté contrat.

Ce qu'un observateur à la couche jeton n'obtiendrait pas, c'est le registre propre à Hearth.
Votre principal, vos gains, votre poids et votre crédit vivent dans le stockage du coffre, et
le jeton n'a aucun droit de contrôle d'accès sur aucun d'eux. Nous l'avons vérifié sur le
déploiement précédent : l'adresse du jeton renvoie faux pour l'autorisation sur les handles
de gains et de principal d'un déposant, tandis que le déposant et la cagnotte renvoient vrai.

L'énoncé honnête est donc : utilisez Hearth et vous confiez au wrapper de Zama les montants
qui le traversent, exactement comme le fait toute application ERC-7984. Vous ne lui confiez
pas votre position.

L'alternative était d'écrire notre propre jeton confidentiel, ce que plusieurs projets de ce
domaine ont fait. Cela échange un contrat connu, audité et opéré par Zama contre un contrat
que nous noterions nous-mêmes. Nous préférons documenter la vraie frontière de confiance
plutôt que d'en fabriquer une plus petite.

## Règle 6 : l'évaluation ne trahit rien, et personne ne choisit l'ordre

`evaluate(drawId, count)` prend un nombre, pas une liste d'adresses. Le coffre parcourt la
liste des épargnants depuis un point de départ dérivé de la graine de ce tirage, dans
l'ordre de la liste, et l'appelant décide seulement de combien le faire avancer. Un
épargnant qui veut son propre résultat fait avancer le même parcours que le keeper.

Cela ferme deux choses à la fois.

Cela ferme la trahison par auto-évaluation. Dans une version antérieure, l'évaluation
prenait une liste d'adresses, si bien qu'un épargnant pouvait calculer sa propre issue à
partir des entrées publiques puis payer pour être évalué seulement quand il avait gagné.
Envoyer cette transaction aurait été un signal de gagnant aussi bruyant qu'une fonction de
réclamation. Désormais, il n'existe aucune transaction que seul un gagnant enverrait.

Cela ferme le levier de l'ordre. Quand un palier est sursouscrit et tombe à sec, celui que
le parcours atteint en dernier est court. Cet ordre est fixé par la graine, donc personne ne
peut acheter une meilleure place avec du gaz, et le point de départ change à chaque tirage,
donc aucune adresse n'est systématiquement dernière. La conséquence en matière d'équité est
décrite dans [lots et paliers](../concepts/prizes-and-tiers.md) et c'est la limite 11.

Chaque épargnant évalué dans un tirage reçoit les mêmes écritures, de la même forme, qu'il
ait gagné ou non, parce que le paiement passe par une sélection chiffrée plutôt que par un
branchement. Le lot dans lequel un épargnant est tombé, et sa position dedans, sont publics
et ne disent rien de son résultat.

## Règle 7 : le résidu comportemental

Hearth n'a pas de transaction de réclamation, donc il n'y a pas d'action en forme de gagnant
à guetter. Apprendre qu'on a gagné est une signature hors chaîne qui ne touche à rien, et le
bouton de réclamation de l'application, qui porte le montant, envoie un retrait ordinaire
qui ressemble à tous les autres retraits.

Le résidu, c'est ce que vous faites ensuite. Un épargnant qui retire juste après chaque
tirage qu'il a gagné, et jamais autrement, donne à un observateur un indice statistique avec
le temps. Il est faible, il faut de nombreux tirages pour le construire, et il est
entièrement sous le contrôle de l'épargnant. L'atténuation est comportementale, pas
cryptographique : retirez selon votre propre calendrier, ou laissez les gains s'accumuler.

Nous le disons parce que l'alternative, affirmer que le comportement sur la chaîne ne révèle
rien, est fausse dans toutes les conceptions de ce genre. Les projets de ce domaine qui ont
supprimé leur fonction de réclamation sont arrivés à la même conclusion et l'ont écrit. Nous
aussi.

## Ce que cette page ne couvre pas

Elle ne couvre pas les attaquants et leurs motivations, ce qui est le
[modèle de menaces](threat-model.md). Elle ne couvre pas comment vérifier un tirage
soi-même, ce qui est dans [aléa et vérification](randomness-and-verification.md). Et elle ne
prétend rien sur la confidentialité au niveau du réseau : l'adresse IP depuis laquelle vous
vous connectez, le fournisseur RPC que vous utilisez et la requête que vous envoyez au
relayer sont hors de la chaîne et hors de cette analyse.
