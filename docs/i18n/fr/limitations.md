# Limites

Toutes les limites que nous connaissons, numérotées, en un seul endroit. Les autres pages
renvoient à ces numéros.

La raison d'être de cette page est simple. Une affirmation de confidentialité ne vaut que ce
que valent les points de fuite que son auteur a bien voulu nommer. Tout ce qui, en dessous,
vous surprendrait plus tard est notre faute, pas une découverte.

## 1. L'évaluation se fait par lots, et les lots sont plafonnés

Le test du gagnant tourne sur des nombres chiffrés, et Zama plafonne une transaction unique à
20,000,000 unités de calcul avec 5,000,000 de profondeur séquentielle sur Sepolia.
L'évaluation d'un épargnant en coûte
`3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)`, donc au plus `4` épargnants demandant du travail chiffré tiennent dans un
appel.

**Ce que cela veut dire :** un pool avec beaucoup d'épargnants demande beaucoup de
transactions par tirage. Le coût grandit linéairement avec le nombre d'épargnants, et il est
payé en gaz par celui qui évalue.

**Ce que cela ne veut pas dire :** il n'y a aucun plafond sur le nombre d'épargnants que le
pool accepte. Plusieurs projets de ce domaine plafonnent la participation à 32 adresses.
Hearth ne plafonne pas du tout la participation ; il plafonne combien tiennent dans une
transaction. `evaluate` accepte n'importe quel nombre, donc un lot plus petit ne demande
aucun redéploiement.

## 2. La fenêtre de deux périodes, et les lots qui expirent

Un tirage doit être clôturé, attribué et évalué pendant les deux périodes qui le suivent.
Cela fait deux heures dans le pool USDC et une demi-journée dans ceux de six heures. La
clôture a une échéance encore plus serrée : le milieu de la seconde de ces périodes, pour que
l'aller-retour de déchiffrement et l'attribution disposent toujours d'au moins une
demi-période. Une fois la fenêtre fermée, le tirage est terminé.

**Ce que cela veut dire :** un épargnant que le parcours d'évaluation n'atteint pas dans la
fenêtre perd ce tirage, même si ses seuils disent qu'il a gagné. Sa part de la liquidité du
palier bascule dans le report du palier et finance un tirage ultérieur. C'est le même
comportement qu'un lot PoolTogether V5 non réclamé qui expire, et c'est le seul cas dans tout
le système où un vrai épargnant perd quelque chose qu'il aurait pu avoir.

**Pourquoi la fenêtre existe :** elle borne jusqu'où le coffre doit se souvenir des soldes,
ce qui est ce qui rend trois observations stockées par épargnant suffisantes. Une fenêtre
d'une seule période a été essayée et s'est révélée trop fragile face à un relayer lent.

**Ce qui la réduit :** le keeper parcourt toute la liste, n'importe qui peut faire avancer le
parcours davantage depuis l'application, et le parcours démarre à un point différent à chaque
tirage, donc personne ne reste en permanence au fond de la file.

## 3. Il existe un plafond sur ce qu'un épargnant peut détenir

Les dépôts sont refusés quand le montant, ou le principal résultant, dépasse
`maxPrincipal = (2^64 - 1) / periodLength`. Sur une période d'une heure cela fait environ
5 milliards de jetons, sur la période de six heures des autres pools environ 854 millions, et
sur une période d'un jour cela ferait environ 213 millions.

**Ce que cela veut dire :** le plafond est réel, et sur une période d'un jour sur le réseau
principal c'est un nombre qu'une grande institution pourrait atteindre.

**Pourquoi il existe :** les valeurs chiffrées ici sont sur 64 bits, et les solde-secondes
accumulées d'un épargnant doivent rester dedans. Un débordement chiffré n'échoue pas et
personne ne le voit arriver, le plafond est donc appliqué à l'entrée. Le contrôle borne le
montant entrant en plus du total résultant, parce que sinon un dépôt assez grand pour faire
repasser la somme au-delà de `2^64` produirait un petit nombre qui passerait le contrôle.

**Comment se comporte le refus :** il est renvoyé sous forme de faux chiffré et le jeton
rembourse le dépôt dans la même transaction, si bien qu'atteindre le plafond ne divulgue pas
votre solde.

## 4. Pas de palier de réserve

PoolTogether V5 conserve une part de réserve qui recharge un palier sursouscrit. Hearth n'a
pas de réserve. Le taux d'utilisation de 50 pour cent est le seul amortisseur.

**Ce que cela veut dire :** quand un palier distribue plus de lots qu'il ne peut en financer,
ce qui arrive dans au plus 2 pour cent des tirages environ pour le palier fréquent, les
épargnants que le parcours atteint en dernier reçoivent moins, ou rien, plutôt que d'être
rechargés.

**Pourquoi :** une réserve a besoin d'un chemin de retrait contrôlé par le propriétaire pour
être utile, et tout pouvoir de propriétaire dans un pool confidentiel est une chose à
laquelle un épargnant doit faire confiance.

## 5. Les chances du palier gros lot sont mesurées sur une seule période

V5 mesure les chances du palier gros lot sur toute la fenêtre d'accumulation du palier.
Hearth les mesure sur une seule période, comme tous les autres paliers.

**Ce que cela veut dire :** un gros détenteur qui rejoint pour une seule période prend une
chance pleinement proportionnelle sur une réserve qui a mis 24 périodes à se constituer.
Quelqu'un qui a épargné pendant les 24 n'a aucun droit supplémentaire dessus.

**Le correctif connu, différé :** cumuler les solde-secondes depuis le dernier paiement du
gros lot et pondérer le palier gros lot par cela. Il ajoute un second accumulateur avec sa
propre analyse de débordement, c'est donc un changement de version deux plutôt qu'un ajout
non prouvé à la version un.

## 6. La confidentialité demande trois épargnants ou plus

Le solde total exact pondéré par le temps du pool n'est jamais publié. Ce qui est publié à
chaque tirage, c'est la plus petite puissance de deux au-dessus, parce que le tirage a besoin
d'une échelle publique contre laquelle tourner.

**La fuite que cela remplace :** publier le total exact permettait à n'importe qui de
retrouver exactement le montant du dépôt d'un épargnant isolé. Deux totaux consécutifs, les
horodatages publics des événements de dépôt et de retrait, et l'arithmétique se réduit à une
seule division sans reste. C'était la conception jusqu'au 3 septembre 2026 et une revue l'a
cassée.

**Ce que cela veut dire maintenant :** avec un seul épargnant, la tranche publiée donne le
poids de cet épargnant à un facteur deux près. Avec deux, chacun peut borner l'autre de la
même façon. En dessous de trois épargnants, il n'y a pas d'ensemble d'anonymat digne de ce
nom. Des tranches consécutives peuvent encore être différenciées, mais elles sont égales sauf
si le pool a franchi une puissance de deux, donc la différence donne une bande plutôt qu'un
nombre.

**Ce que fait l'application :** elle l'indique dès que le pool compte moins de trois
épargnants, plutôt que d'afficher une promesse de confidentialité qui n'est pas vraie à cette
taille.

## 7. La couche jeton est celle de Zama, et ses pouvoirs s'appliquent

L'actif de Hearth est le wrapper USDC confidentiel de Zama, pas le nôtre.

**Ce que cela veut dire :** son propriétaire peut nommer des observateurs capables de
déchiffrer chaque montant qui passe par le jeton, et de le faire **rétroactivement**, si bien
que des montants déjà présents sur la chaîne sont exposés à un observateur nommé plus tard.
Surveiller la nomination et sortir n'est pas une défense. La portée couvre les montants de
dépôt, les paiements de retrait, le solde propre au pool, et l'unique transfert de financement
de lots par lot d'évaluation. Le propriétaire peut aussi bloquer une adresse, et le contrat
est modifiable. Au 2 septembre 2026, il n'y avait aucun observateur et le rôle de mise en
pause n'était pas attribué.

**Ce que cela n'atteint pas :** le registre propre à Hearth. Le principal, les gains, les
poids par tirage et les crédits par tirage vivent dans le coffre, et le jeton n'y détient
aucun droit d'accès.

**Une conséquence produit, et chaque pool en service la subit à chaque tirage :** le
transfert de financement d'un lot porte le total crédité à tout le monde dans ce lot, donc un
lot d'un seul porte le lot exact d'un épargnant, sous l'hypothèse de l'observateur. Le dernier
lot du parcours contient un seul épargnant dès que le nombre d'épargnants n'est pas un
multiple de la taille de lot. Chacun des sept pools est doté de cinq épargnants avec une
taille de lot de 4 (`KEEPER_BATCH`, `packages/keeper/src/config.ts`), donc chaque tirage se
termine par un lot d'un seul, et l'événement `Evaluated` de cette même transaction nomme
l'épargnant auquel il appartient.

Les sept pools sont sept wrappers séparés avec les pouvoirs de sept propriétaires séparés,
donc ceci s'applique pool par pool plutôt qu'une seule fois pour tous.

Aucun lot minimal ne peut corriger cela, parce que `evaluate(uint32,uint256)`
(`packages/contracts/contracts/HearthVault.sol`) est ouvert à tous et prend la taille de lot
chez l'appelant : n'importe quel observateur peut donc forcer un lot d'un seul quoi que fasse
le keeper. Nous l'enregistrons comme un résidu accepté : cela ne mord que sous l'hypothèse de
l'observateur, et en réel `observerCount()` vaut 0. Le correctif côté contrat, différé :
cumuler les crédits par tirage et envoyer un seul transfert de financement à la finalisation,
ou remplir chaque total de lot.

**L'alternative que nous avons rejetée :** écrire notre propre jeton confidentiel. Cela
échange un contrat connu, audité et opéré par Zama contre un contrat que nous noterions
nous-mêmes.

## 8. Les tirages dépendent de quelqu'un qui envoie des transactions

Rien sur la chaîne ne se déclenche tout seul.

**Ce que cela veut dire :** si aucun keeper ne tourne et qu'aucun épargnant n'agit, un tirage
est sauté et cette période ne paie aucun lot. Une clôture qui rate son échéance est refusée
franchement plutôt que de bloquer le tirage, et une attribution qui arrive après la fenêtre
comptabilise quand même la récolte, rend la liquidité offerte et marque le tirage `Skipped`.

**Ce que cela ne veut pas dire :** de l'argent en danger. Un tirage sauté garde sa liquidité
dans les paliers, la récolte est comptabilisée par une attribution tardive, et les dépôts
comme les retraits ne sont pas affectés tout du long.

**Ce qui le réduit :** chaque étape est ouverte à tous et l'application les expose, donc tout
épargnant peut faire avancer un tirage. La cagnotte implémente aussi l'interface
d'automatisation de Chainlink pour l'étape de clôture, qui est la seule étape n'ayant besoin
d'aucune donnée hors chaîne et la seule avec une échéance, mais aucun upkeep n'est enregistré
sur aucun des sept pools : aujourd'hui, les keepers et l'application sont donc tout ce qu'il
y a. Chaque pool a son propre processus keeper sur son propre compte, donc un keeper qui
s'arrête, ou un compte à court d'ETH Sepolia, coûte ses tirages à ce pool et laisse les six
autres tourner.

## 9. Le rendement sur Sepolia est sponsorisé, pas produit

L'argent des lots de chaque pool vient de son propre solde financé par un sponsor, qui
s'écoule à un rythme fixe.

**Ce que cela veut dire :** ce n'est pas du vrai rendement. Personne ne le produit par du
prêt ni par un coffre. Quand le solde sponsorisé s'épuise, les lots s'arrêtent. Une dotation
ne peut pas être reprise une fois faite, et seul le propriétaire de la source peut changer le
rythme.

**Pourquoi :** il n'existe aucun lieu sur Sepolia qui paie du rendement sur les jetons
simulés de Zama. Aave refuse ces dépôts, Compound veut l'USDC de Circle, et le coffre Sepolia
de Zama est inerte, sans adaptateur de rendement, ce qui est la description qu'en donne Zama.

**Ce qui est réel là-dedans :** chaque unité d'argent de lots a réellement été enveloppée,
réellement transférée au pool par un transfert chiffré, et réellement vérifiée par un
déchiffrement signé par le KMS avant d'être créditée. Une source qui échoue n'arrête plus un
tirage non plus : la récolte est comptabilisée à zéro, `HarvestFailed` est émis et la clôture
réussit. La source de l'argent est une simulation. La plomberie ne l'est pas.

## 10. Le point de fuite de l'enveloppement, et ce que coûte un solde identifié

Transformer de l'USDC public en USDC confidentiel est un transfert public, donc le montant
est visible.

**Ce que cela veut dire :** un épargnant qui enveloppe et dépose immédiatement le même
montant a publié son dépôt. Nous l'avons mesuré sur notre propre déploiement antérieur :
trois dépôts réels sur cinq se trouvaient deux à quatre blocs après un enveloppement public
d'exactement 100 USDC.

**Ce que cela coûte, au-delà du montant :** les seuils sont publics, parce qu'ils sont ce qui
rend le tirage vérifiable. Un solde qu'un observateur peut identifier a donc un résultat
public à chaque tirage et dans chaque palier, calculé sans le moindre déchiffrement, et à
chaque tirage ultérieur aussi, puisque les gains n'entrent jamais dans les chances. Même une
borne supérieure large prouve une perte certaine dans tout palier dont le seuil se situe
au-dessus.

**Ce que Hearth fait :** garder l'enveloppement et le dépôt comme des étapes distinctes, vous
dire à l'étape d'enveloppement d'utiliser un chiffre rond pour que l'enveloppement soit un
bac plutôt qu'un montant exact, avertir à l'étape de dépôt, et laisser un épargnant conserver
un solde confidentiel permanent pour qu'un dépôt sorte d'une accumulation de composition
inconnue.

**Ce que Hearth ne peut pas faire :** le supprimer. Il n'existe pas de manière confidentielle
de convertir un jeton public, et il n'y a pas moyen de rendre un seuil privé sans rendre le
tirage invérifiable.

## 11. L'ordre du parcours décide qui est court dans un palier sursouscrit

Quand un palier tombe à sec en cours de tirage, l'épargnant que le parcours atteint à cet
instant reçoit le reste et les suivants ne reçoivent rien de ce palier.

**Ce que cela veut dire :** lors du rare tirage sursouscrit, quelqu'un est lésé par une
position qu'il n'a pas choisie.

**Ce que ce n'est plus :** un levier. Une version antérieure permettait à l'appelant
d'`evaluate` de fournir une liste d'adresses, ce qui mettait l'ordre à la discrétion du
keeper et permettait à un épargnant d'acheter le début de la file. Désormais, l'appelant
passe un nombre, le parcours démarre à un point dérivé de la graine du tirage, et le départ
change à chaque tirage.

**Ce qui le réduit :** l'épargnant concerné peut le voir, parce que son poids et son crédit
pour le tirage sont tous deux déchiffrables par lui : un crédit court est donc prouvable
plutôt que mystérieux.

## 12. Le tirage tourne contre une tranche, donc un palier paie entre la moitié et la totalité de ses lots

Le test du gagnant utilise `M`, la plus petite puissance de deux au-dessus du poids total du
pool, à la place du total lui-même. `M` se situe donc entre `W` et `2W`.

**Ce que cela veut dire :** le nombre de lots attendu de chaque épargnant est mis à l'échelle
par `W / M`, un nombre entre un demi et un, donc un palier paie entre la moitié et la
totalité de ses `count * odds` lots nominaux à chaque tirage. Un pool qui vient de franchir
une puissance de deux paie au bas de cet intervalle jusqu'à ce qu'il grandisse dans sa
tranche.

**Ce que cela ne veut pas dire :** de l'argent perdu ou des chances déformées. Chaque
épargnant d'un palier est mis à l'échelle par le même facteur, donc la part de personne ne
change par rapport à celle d'un autre. Ce qu'un palier ne paie pas va dans son report chiffré
et est offert de nouveau, donc la taille des lots se stabilise quelque part entre les
chiffres nominaux et leur double, et tout le rendement sort quand même.

**Pourquoi nous l'avons pris :** l'alternative était de publier le total exact, ce qui est la
limite 6.

## 13. Les gains cumulés deviennent publics si vous faites l'aller-retour par le wrapper

Envelopper à l'entrée et désenvelopper à la sortie sont deux mouvements publics à la couche
jeton, et c'est le premier des deux appels de désenveloppement qui publie le montant : un
désenveloppement que vous ne finalisez jamais l'a donc déjà laissé fuir.

**Ce que cela veut dire :** pour une adresse dont la seule contrepartie en USDC confidentiel
est Hearth, le total public désenveloppé moins le total public enveloppé est une borne
inférieure sur les gains retirés sur toute la durée de vie, et cela devient exact une fois
que cette adresse est vidée. Désenvelopper vers une adresse neuve n'aide pas, parce que le
transfert confidentiel vers cette adresse est lui-même le lien.

**Ce qui le réduit :** désenvelopper en coupures rondes sans rapport avec votre position, ou
laisser un solde confidentiel permanent derrière vous et ne jamais faire l'aller-retour
complet.

## 14. Un solde qui ne change jamais est resserré par les comptes de lots publiés

Chaque réconciliation publie combien de lots un palier a payés. Comme chaque seuil est
public, ce compte est une contrainte de la forme « combien de ces épargnants avaient un poids
supérieur à leur propre seuil publié », et les contraintes s'accumulent.

**Ce que cela veut dire :** un épargnant dont le solde ne change jamais sur de nombreux
tirages est progressivement resserré par ces comptes. Un épargnant qui dépose ou retire remet
à zéro sa propre inconnue.

**Ce qui limite le rythme :** rien de plus fin qu'un nombre entier de lots n'est jamais
divulgué, et les seuils ne sont pas choisissables par un attaquant, parce que la graine est
tirée dans le coprocesseur et révélée seulement après la clôture de sa période.

**Ce que nous avons fait à ce sujet : rien, et voici pourquoi.** Le contrat a un bouton fait
exactement pour cela. `reconcileEvery[t]` est le nombre de tirages qui passent entre deux
publications du report d'un palier, et l'augmenter sur le palier gros lot publierait un
compte par jour plutôt qu'un par heure, si bien qu'un gros lot serait attribué à toutes les
personnes éligibles sur la journée plutôt qu'à la poignée éligible sur un seul tirage. La
campagne d'équité a montré ce que cela coûte. Une clôture déplace toute la liquidité publique
d'un palier dans le tirage et elle ne revient qu'à une réconciliation, donc à une cadence de
24 la liquidité publique du palier gros lot est la part de récolte d'un seul tirage sur 23
tirages sur 24, et la taille du lot est prise là-dessus, la réserve accumulée n'apparaissant
à découvert que lors du tirage de réconciliation. L'argent est offert et gagnable tout du
long, à l'intérieur du report chiffré, mais personne ne peut regarder le gros lot grandir.

Un compte caché et un gros lot visible qui s'accumule ne peuvent pas tenir en même temps, et
ce déploiement a choisi le gros lot visible. Les trois paliers tournent à
`reconcileEvery = 1`, donc la mesure ci-dessus tourne à un compte par palier et par tirage.
Le bouton est un argument de constructeur et un déploiement qui préfère la mesure plus lente
à la réserve visible le règle plus haut.

## Pas une limite, mais bon à dire franchement

- **Six des sept pools tirent toutes les six heures, et c'est une décision de gaz.** Un
  tirage à cinq épargnants coûte `8,456,388` de gaz, donc sept pools horaires dépenseraient
  environ `1.43 ETH` par jour sur Sepolia, ce que les faucets publics ne peuvent pas suivre.
  Seul le pool USDC, déployé le premier, tire encore toutes les heures. Les chances des
  paliers de chaque pool sont calées sur sa propre période, donc le rythme des lots est le
  même sur les deux horloges.
- **Les seize langues sont de la traduction automatique.** Les textes de l'interface et les
  pages de documentation traduites ont été écrits par un modèle, pas par des locuteurs
  natifs, et n'ont pas été relus professionnellement. L'anglais est la source de vérité pour
  chaque nombre, chaque nom de contrat et chaque affirmation de ce site, et une page qui n'a
  pas été traduite se rabat sur l'anglais plutôt que sur une approximation.
- **Un gros épargnant gagne souvent.** Les chances sont proportionnelles au solde pondéré par
  le temps, donc quelqu'un qui détient beaucoup pendant longtemps gagne beaucoup. C'est la
  conception, pas un défaut.
- **La taille des lots et le nombre de lots sont publics.** Ils l'ont toujours été chez
  PoolTogether. Ce qui est confidentiel ici, c'est qui a gagné, pas combien le pool a
  rapporté.
- **Hearth n'a pas été audité par un tiers.** Il est auto-audité avec des attaques exécutées
  et des tests de propriété, et le [modèle de menaces](security/threat-model.md) est le
  substitut honnête plutôt qu'un remplacement.
