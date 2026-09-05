# Pourquoi il faut Zama

Le test à appliquer à tout projet qui prétend avoir besoin d'une technologie donnée :
supprimez cette technologie et voyez si le produit survit. S'il fonctionne encore, la
technologie était décorative.

## Supprimez le chiffrement et il n'y a plus de produit

Le chiffrement totalement homomorphe, en abrégé FHE, désigne des calculs effectués
directement sur des nombres chiffrés, produisant une réponse chiffrée, sans jamais
déchiffrer les entrées. Le protocole de Zama apporte cela à Ethereum : un contrat Solidity
peut additionner, comparer et choisir entre des valeurs qu'il ne peut pas lire.

Retirez-le de Hearth et voici ce qu'il reste.

| Brique de Hearth | Sans le FHE |
| --- | --- |
| Votre solde | Un nombre public. N'importe qui peut chiffrer votre épargne et vos chances. |
| Le test du gagnant | Une comparaison publique. Le résultat est visible de tous dès qu'elle s'exécute. |
| Qui a gagné un tirage | Public, parce que le crédit qui atterrit dans le solde de quelqu'un est un nombre visible. |
| La graine aléatoire | Soit un nombre public que quelqu'un voit venir, soit un nombre hors chaîne que quelqu'un peut choisir. |
| Les crédits de lots | Des transferts publics vers des gagnants identifiés. |

Ce que vous obtenez, c'est PoolTogether. PoolTogether existe déjà, fonctionne, et tourne
depuis des années. Il n'y a aucune raison de le reconstruire.

Le produit que Hearth vend réellement est celui que PoolTogether ne peut pas offrir : une
épargne à lots où votre solde, vos chances et vos gains n'appartiennent qu'à vous, tandis
que le tirage reste vérifiable par des inconnus. Ces deux propriétés sont en tension sur une
chaîne transparente. Le calcul chiffré est la seule chose qui les réconcilie, et le protocole
de Zama est le seul endroit sur Ethereum qui le fait aujourd'hui.

Il n'existe pas de version partielle. Chacune des cinq lignes ci-dessus est une promesse
centrale. Retirez le chiffrement de n'importe laquelle et le produit échoue à cette ligne.

## Les briques exactes que nous utilisons

Pas « bâti sur Zama ». Voici la liste, avec ce que chaque brique fait pour nous.

### Les entiers chiffrés

`euint64` pour l'argent et les poids, `euint128` pour l'accumulateur total du pool, `ebool`
pour l'issue d'une comparaison. Le principal, les gains, le poids et le crédit de chaque
épargnant sont l'un de ceux-là, et le report de chaque palier aussi. L'arithmétique que nous
effectuons dessus est `FHE.add`, `FHE.sub`, `FHE.mul` par un nombre public, `FHE.min`,
`FHE.gt`, `FHE.le`, `FHE.and` et `FHE.select`.

La comparaison fait ici plus de travail que le seul test du gagnant. Cinq comparaisons
chiffrées par tirage situent le poids total du pool par rapport aux puissances de deux
autour de sa dernière tranche connue, et la seule chose qui sort du monde chiffré est le
petit compte de celles qu'il a battues. C'est ainsi que le tirage obtient une échelle
publique contre laquelle tourner sans que le total lui-même ne devienne jamais un nombre.

`FHE.select` mérite une note, parce que c'est ce qui rend toute la conception possible.
C'est un `if` dont la condition est chiffrée : il renvoie l'une de deux valeurs chiffrées et
la chaîne ne peut pas dire laquelle. C'est ainsi qu'un gagnant et un perdant produisent des
transactions identiques. Rien ne branche sur un secret nulle part dans Hearth.

`FHE.fromExternal` prend une valeur chiffrée qu'un utilisateur a construite dans son
navigateur, avec sa preuve, et en fait une valeur que le contrat peut utiliser. C'est ainsi
qu'un montant de dépôt arrive chiffré de bout en bout.

### L'ERC-7984, le standard de jeton confidentiel

L'actif de chaque pool est l'un des jetons confidentiels de Zama, un wrapper ERC-7984 autour
d'un ERC-20 ordinaire : cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP ou cXAUt. Les soldes qu'ils
portent sont des valeurs chiffrées plutôt que des nombres publics.

Les dépôts arrivent par `confidentialTransferAndCall`, qui transfère un montant chiffré et
appelle le crochet du destinataire dans la même transaction. Le crochet du coffre reçoit le
montant que le jeton a réellement déplacé, ce qui fait que le coffre crédite la réalité
plutôt qu'une demande. Les paiements repartent dans l'autre sens par
`confidentialTransfer`.

Utiliser le jeton standard, plutôt que d'écrire le nôtre, compte. Plusieurs projets de ce
domaine ont bricolé un jeton « de style ERC-7984 ». Chacun des nôtres est un jeton déployé
par Zama, si bien que le solde confidentiel d'un épargnant est utilisable en dehors de
Hearth et que le comportement du jeton n'est pas quelque chose que nous pouvons définir en
notre faveur. Cela veut aussi dire que Hearth peut ouvrir un pool sur un nouveau jeton
confidentiel le jour où Zama le publie, ce qui est la manière dont six des sept ont été
ajoutés, et qu'il peut n'en ouvrir aucun sur un jeton dont l'émetteur garde le `mint` pour
lui.

### L'aléa chiffré

`FHE.randEuint64()` génère un nombre aléatoire dans le coprocesseur de Zama, sous la clé FHE
du réseau, à partir d'une graine publique mais inutilisable sans cette clé. Le nombre en
ressort chiffré. Personne, nous compris et y compris celui qui envoie la transaction, ne le
voit au moment où il est créé.

Il doit être généré à l'intérieur d'une transaction, parce qu'il modifie l'état du
générateur sur la chaîne. Cela exclut l'astuce consistant à prévisualiser un tirage hors
chaîne avec `eth_call` pour voir si on gagnerait, et c'est pourquoi clôturer un tirage est
une vraie transaction qui réussit exactement une fois. Personne ne peut retirer une graine
qui ne lui plaît pas.

### La liste de contrôle d'accès

La liste de contrôle d'accès de Zama, sur la chaîne, décide qui peut déchiffrer quel
chiffré. C'est une application de la règle, pas une politique : le relayer refuse une demande
portant sur un handle auquel l'appelant n'a pas droit.

Hearth y fait quatre appels. `FHE.allowThis` garde une valeur utilisable par le contrat dans
des transactions ultérieures. `FHE.allow` accorde à un épargnant un accès permanent en
lecture à son propre principal, à ses gains, à son poids par tirage et à son crédit par
tirage. `FHE.allowTransient` accorde l'accès le temps d'une seule transaction, ce qui est la
manière dont le coffre remet à la cagnotte une autorisation unique sur le total d'un lot
d'évaluation sans jamais lui donner d'accès permanent. `FHE.makePubliclyDecryptable` ouvre
une valeur à tout le monde, et nous l'utilisons sur exactement six types de valeurs : la
graine, le compteur d'échelle qui donne la tranche, le drapeau de non-vacuité, la récolte,
le report d'un palier quand ce palier doit se réconcilier, et le compteur de non-financement.
Le poids total exact du pool ne figure délibérément pas sur cette liste.

Ce dernier appel est à sens unique et permanent. C'est la chose la plus lourde de
conséquences qu'un contrat puisse faire sur ce protocole, donc chaque usage que Hearth en
fait est listé dans [ce qui reste privé](../security/what-stays-private.md).

### Le déchiffrement utilisateur EIP-712

C'est ainsi qu'un épargnant lit ses propres nombres. Il signe un message structuré typé, un
standard de signature qui montre au signataire exactement ce qu'il approuve, et le relayer
de Zama renvoie le texte clair des valeurs auxquelles cet épargnant a droit.

C'est une demande hors chaîne. Pas de transaction, pas de gaz, pas de trace. C'est pourquoi
Hearth peut n'avoir aucune fonction de réclamation : apprendre qu'on a gagné ne coûte rien
et ne laisse rien derrière. L'autre moitié de cette promesse est que l'évaluation ne peut
pas non plus être dirigée vers soi-même : il n'existe donc aucune transaction, d'aucune
sorte, que seul un gagnant enverrait.

Le solde comme les gains sont déchiffrables par leur propriétaire. Hearth accorde aussi le
poids par tirage et le crédit par tirage, pour qu'un épargnant puisse vérifier l'arithmétique
du tirage contre ses propres entrées plutôt qu'on lui demande d'y croire.

### Le déchiffrement public signé par le KMS

L'autre sens. Un contrat marque une valeur publiquement déchiffrable, n'importe qui demande
le texte clair au relayer, et le relayer le renvoie avec une signature du service de gestion
des clés, le groupe qui détient la clé de déchiffrement du réseau. Le contrat vérifie ensuite
cette signature sur la chaîne avec `FHE.checkSignatures` avant d'agir sur le nombre.

C'est ce qui transforme « nous affirmons que la graine était 12345 » en un nombre que le
contrat lui-même refuse d'accepter sans preuve. Hearth s'en sert une fois par tirage pour la
graine, le compteur d'échelle, le drapeau de non-vacuité et la récolte pris ensemble au
moment de l'attribution, et de nouveau pour le report d'un palier chaque fois que ce palier
doit se réconcilier, ce qui sur Sepolia veut dire chaque palier à chaque tirage. Chaque
preuve est liée à ses handles dans un ordre fixe, si bien que rien ne peut être mélangé ni
rejoué dans un autre tirage ou un autre palier.

## Ce à quoi un épargnant fait réellement confiance

Le nommer est tout l'objet de cette page.

- **Le protocole Zama**, pour calculer correctement sur les chiffrés et ne déchiffrer que ce
  qui est marqué déchiffrable. Chaque déchiffrement sur lequel les contrats agissent porte
  une preuve vérifiée sur la chaîne. C'est la même frontière de confiance que celle que Zama
  documente pour son propre Confidential Vault.
- **Les wrappers de jetons confidentiels**, qui sont les contrats de Zama et non les nôtres,
  et qui sont modifiables par leur propriétaire. Voir la section sur la couche jeton de
  [ce qui reste privé](../security/what-stays-private.md).
- **Les contrats propres à Hearth**, qui sont immuables une fois déployés, sans proxy ni
  chemin de mise à jour. Les pouvoirs restants du propriétaire sont étroits et listés dans
  le [modèle de menaces](../security/threat-model.md) : une pause qui arrête les dépôts et la
  clôture des tirages mais jamais les retraits ni l'évaluation, un réglage de la source de
  rendement, un chemin de sauvetage pour des jetons étrangers qui ne peut pas toucher aux
  soldes des épargnants, et un transfert de propriété en deux temps avec la renonciation
  désactivée.

Rien sur cette liste n'est une personne à qui nous vous demandons de croire.
