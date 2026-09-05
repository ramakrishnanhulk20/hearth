# Documentation de Hearth

Hearth est une épargne à lots confidentielle et sans perte, bâtie sur le protocole Zama.
Vous déposez un jeton confidentiel, votre solde reste chiffré sur la chaîne, le rendement
que le pool produit est distribué sous forme de lots lors d'un tirage périodique, et votre
principal est retirable à tout moment. Personne, nous compris, ne peut lire ce que vous
avez épargné ni ce que vous avez gagné.

Sept pools tournent sur Sepolia, un par jeton confidentiel que Zama y publie, chacun avec
ses propres contrats et son propre keeper. La plupart des pages ci-dessous prennent l'USDC
comme exemple chiffré, parce que c'est le pool qui a la plus longue histoire derrière lui ;
toutes décrivent bien les sept.

Ces pages sont le compte rendu écrit complet du fonctionnement du produit et de ce qu'il ne
cache pas. `ARCHITECTURE.md`, à la racine du dépôt, est la spécification d'implémentation ;
cette arborescence explique la même conception pour les gens qui s'en servent et pour ceux
qui l'auditent.

## Pages

| Page | Ce qu'elle couvre |
| --- | --- |
| [Ce qu'est Hearth](getting-started/what-is-hearth.md) | Le produit en une page : les quatre gestes d'un épargnant, et exactement ce que chacun cache. |
| [Essayer sur Sepolia](getting-started/try-it-on-sepolia.md) | Choisir l'un des sept jetons, son faucet, blinder, déposer, un tirage, révéler, réclamer, retirer, déblinder. |
| [Pools et jetons](concepts/pools-and-tokens.md) | Les sept pools et leurs adresses, pourquoi six d'entre eux tirent toutes les six heures, les mises de départ par jeton, le jeton que Hearth refuse, et les routes par pool. |
| [Comment se déroule un tirage](concepts/how-a-draw-works.md) | Les périodes, la fenêtre de deux périodes et l'échéance de clôture, les cinq étapes d'un tirage, et ce que le coffre publie à la place du total du pool. |
| [Solde pondéré par le temps](concepts/time-weighted-balance.md) | Pourquoi les chances reposent sur votre solde moyen sur la période, ce que vaut un dépôt tardif, et pourquoi trois observations enregistrées suffisent. |
| [Désignation des gagnants](concepts/winner-selection.md) | Le test du gagnant, la règle par lot de PoolTogether, les seuils imbriqués face à la tranche publiée, et un exemple chiffré avec trois épargnants. |
| [Lots et paliers](concepts/prizes-and-tiers.md) | Comment le rendement devient de la liquidité de lots, le report chiffré et la cadence de réconciliation, les trois paliers Sepolia, la sursouscription, et là où nous nous écartons de PoolTogether V5. |
| [Source de rendement](concepts/yield-source.md) | La source sponsorisée sur Sepolia, pourquoi la récolte est vérifiée plutôt que déclarée, et comment le Confidential Vault de Zama se branche sur le réseau principal. |
| [Pourquoi Zama](concepts/why-zama.md) | Le test de suppression : retirez le chiffrement totalement homomorphe et il n'y a plus de produit. Chaque brique Zama que nous utilisons, nommée. |
| [Ce qui reste privé](security/what-stays-private.md) | Sept règles : la tranche et la fuite qu'elle remplace, ce que coûte un solde identifié, le point de fuite de l'enveloppement dans les deux sens, ce que mesurent les comptes de lots, la couche jeton, pourquoi l'évaluation ne trahit rien, et le résidu comportemental. |
| [Modèle de menaces](security/threat-model.md) | Neuf attaquants, ce que chacun veut, ce qui l'arrête, et ce qui ne l'arrête pas. Plus les échecs exécutés de notre conception précédente. |
| [Aléa et vérification](security/randomness-and-verification.md) | D'où vient la graine, pourquoi personne ne peut la retirer ni redimensionner ce qu'elle fait gagner, et comment n'importe qui recalcule un seuil après coup. |
| [Analyse statique](security/static-analysis.md) | Les passages de slither et de solhint, et la raison unique derrière chacune des cinq familles de résultats. |
| [Le keeper](operations/keeper.md) | Le travail du keeper étape par étape, la règle d'ordonnancement, un processus par pool, ce qui se passe quand il est arrêté, et le budget en gaz. |
| [Déploiement](operations/deploying.md) | Déployer un pool par jeton, signatures et paramètres des constructeurs, vérification, et les deux jeux de paramètres Sepolia face à un jeu pour le réseau principal. |
| [Limites](limitations.md) | Toutes les limites documentées en une liste numérotée de quatorze. |
| [FAQ](faq.md) | Douze réponses courtes, à commencer par le jeton dans lequel vous pouvez épargner, et jusqu'à savoir où est passé le bouton de réclamation. |
</content>
</invoke>
