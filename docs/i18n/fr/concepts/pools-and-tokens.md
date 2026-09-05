# Pools et jetons

Hearth n'est pas un pool. C'en est sept, un par jeton confidentiel du répertoire d'adresses
Sepolia de Zama, et chacun a son propre `HearthVault`, son propre `HearthPrizePool` et sa
propre `SponsoredYieldSource`, avec ses propres épargnants, son propre argent de lots et son
propre keeper.

Les contrats sont le même code, déployé sept fois avec des arguments de constructeur
différents. Rien n'est partagé sur la chaîne : pas de registre, pas de routeur, pas de solde
commun. Un épargnant du pool WETH ne peut ni voir, ni toucher, ni être touché par le pool
USDC, et un coffre en pause ou un keeper bloqué sur un jeton laisse les six autres tourner.

## Les sept pools

| Jeton | Identifiant | Tirage toutes les | Coffre | Cagnotte | Source de rendement |
| --- | --- | --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 heure | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` |
| Confidential USDT (Mock) | `usdt` | 6 heures | `0xe54F44dE64F8A7abc0647eaae547dD59ce0EFfac` | `0x6a83Beb2Dc3f258107Cad5e17BC57657fAd4fbd1` | `0x5bb1Cd5380Cb9f2B15569030fF0dB7a445cF54cA` |
| Confidential WETH (Mock) | `weth` | 6 heures | `0x3D1A182782B68fE270A66294C9adaC7F005c4f14` | `0x1a11e7C689F244fA8Dd5f4abA8F2F3131090cc1C` | `0x40DF298f15c6136294eC651aD7b0c1C6F221DE8F` |
| Confidential BRON (Mock) | `bron` | 6 heures | `0x18086DC8271f8A73c5Ea985fd519527Dbb991279` | `0x2Ed982979CD184494B947a1E38E597494a38ACe4` | `0x0cD1155D752bD81b3a437a6f0B3965CAA2A1C8e9` |
| Confidential ZAMA (Mock) | `zama` | 6 heures | `0xEEC26386F273c6678cA538AcA18e1d9384eA9F09` | `0x873B285404199D46325a294Aa0EC7a79C30A7fF7` | `0xdD352D70311E834ab75307f53d5C276060081d23` |
| Confidential tGBP (Mock) | `tgbp` | 6 heures | `0xCe95dAa01f5354aA8887A5952E403D26d452c323` | `0xC531D54ee2c695e0eBfe8b8258e9Fd80fd507095` | `0xDEa2BD6351072F735B6ea83c357bF157d83c01af` |
| Confidential XAUt (Mock) | `xaut` | 6 heures | `0x77f701101d66FbD522A3bFdC2c00DB09a4F57daE` | `0x9a2888aca42c707A3BC0D561FdF6ff8Abfda5201` | `0x03fDdAA7C4323C53CE511CC49D4c33B26B492af7` |

Tous les contrats ci-dessus sont vérifiés sur Etherscan. La paire de jetons que chaque pool
détient est celle de Zama, pas la nôtre, et elle est listée dans
[essayer sur Sepolia](../getting-started/try-it-on-sepolia.md).

Le pool USDC a été déployé le premier, le 2 septembre 2026 dans le bloc `11622398`, et il
fait des tirages toutes les heures depuis : c'est pour cela qu'il a une histoire derrière
lui et que c'est le pool sur lequel a été enregistrée la transcription de la commande de
preuve du README. Les six autres ont été déployés le 5 septembre 2026, dans les blocs
`11641314` à `11641523`.

## Pourquoi six heures, et pas une heure pour les sept

Le gaz. Un tirage sur un pool de cinq épargnants coûte `8,456,388` de gaz, mesuré sur des
reçus Sepolia réels : une clôture, une attribution, deux lots d'évaluation, une finalisation
et une réconciliation par palier. À 1 gwei cela fait `0.0085 ETH`. Sept pools tirant toutes
les heures feraient 168 tirages par jour, environ `1.43 ETH`, ce qu'on ne peut pas financer
avec des faucets publics sur toute une période d'évaluation. Un pool de dix épargnants coûte
`12,582,923` de gaz par tirage et la facture grimpe avec.

Les six pools déployés plus tard tirent donc toutes les six heures. Cela fait quatre tirages
par jour chacun, si bien que les sept pools réunis coûtent environ `0.41 ETH` par jour au
lieu de `1.43`, et quatre tirages par jour reste assez fréquent pour qu'un visiteur en voie
un tomber pendant une seule visite. Le pool USDC garde son horloge horaire et les tirages
d'histoire qui l'accompagnent.

Les chances sont calées sur la période propre à chaque pool plutôt que reprises telles
quelles, si bien que la sensation du produit est la même sur les deux horloges :

| Palier | Pool horaire (`usdc`) | Pools de six heures |
| --- | --- | --- |
| Gros lot | nombre 1, chances 1 sur 24, parts 40 | nombre 1, chances 1 sur 4, parts 40 |
| Intermédiaire | nombre 1, chances 1 sur 6, parts 20 | nombre 1, chances 1 sur 2, parts 20 |
| Fréquent | nombre 4, chances 1 sur 1, parts 40 | nombre 4, chances 1 sur 1, parts 40 |

Le gros lot tombe donc environ une fois par jour dans chaque pool. Le palier intermédiaire
est le seul endroit où les deux horloges diffèrent : environ quatre fois par jour sur le
pool horaire et environ deux fois par jour sur ceux de six heures, parce que diviser les
chances par deux ne compense pas tout à fait le fait d'avoir six fois moins de tirages.
Chaque palier de chaque pool se réconcilie à chaque tirage, pour la raison exposée dans
[lots et paliers](prizes-and-tiers.md).

## Les décimales, et ce que veut dire un montant

Tous les wrappers confidentiels du répertoire d'adresses Sepolia de Zama affichent six
décimales, quel que soit le nombre affiché par le jeton public en dessous, parce que le
wrapper se plafonne à six et reporte la différence sur son `rate()`. Le Confidential WETH
est le cas le plus net : son sous-jacent en a 18, donc le `rate()` du wrapper vaut mille
milliards, et une unité de base du wrapper vaut mille milliards d'unités de base du jeton
public.

Tous les montants de `packages/contracts/hearth.config.ts` sont en unités de base du
wrapper, et le déploiement comme les tâches multiplient par le taux qu'ils lisent sur la
chaîne avant de toucher au jeton public. Ce n'est pas un détail. Notre propre audit a trouvé
un bogue où un pool comptabilisait le montant passé par l'appelant plutôt que le montant que
le wrapper avait émis, ce qui, sur un jeton à 18 décimales, gonflait l'argent des lots d'un
facteur mille milliards. Voir [source de rendement](yield-source.md).

## Ce dont chaque pool est doté au départ

`hearth:seed --token <slug>` sponsorise la source de rendement et met cinq épargnants de
démonstration, tirés des comptes d'indice 2 à 6, pour qu'un premier visiteur arrive sur un
pool peuplé. Les mises diffèrent selon le jeton parce qu'un pool doit ressembler à l'actif
qu'il détient : 1,200 d'un stablecoin en dollars et 0.6 d'ether sont des épargnants de même
taille.

| Pool | Cinq mises de démonstration | Dotation | Argent des lots libéré |
| --- | --- | --- | --- |
| `usdc` | 1,200 / 600 / 300 / 150 / 75 | 10,000 USDC | 20 USDC par heure, soit 19.998 par tirage |
| `usdt` | 1,200 / 600 / 300 / 150 / 75 | 10,000 USDT | 20 USDT par heure, soit 119.98 par tirage |
| `weth` | 0.6 / 0.3 / 0.15 / 0.075 / 0.04 | 5 WETH | 0.01 WETH par heure, arrondi à 0.0432 par tirage |
| `bron` | 2,000 / 1,000 / 500 / 250 / 125 | 15,000 BRON | 30 BRON par heure, soit 179.99 par tirage |
| `zama` | 2,000 / 1,000 / 500 / 250 / 125 | 15,000 ZAMA | 30 ZAMA par heure, soit 179.99 par tirage |
| `tgbp` | 1,000 / 500 / 250 / 125 / 60 | 8,000 tGBP | 16 tGBP par heure, soit 95.99 par tirage |
| `xaut` | 0.4 / 0.2 / 0.1 / 0.05 / 0.025 | 3 XAUt | 0.006 XAUt par heure, arrondi à 0.0216 par tirage |

Le débit d'une source s'exprime en unités de base entières par seconde, donc les deux plus
petits débits sont arrondis vers le bas : 0.01 WETH par heure fait 2.77 unités de base par
seconde et en libère 2, et 0.006 XAUt par heure fait 1.67 et en libère 1. Chaque dotation
est dimensionnée pour tenir plus de quatre-vingts tirages, soit vingt jours ou plus, pour
que personne n'ait à recharger un pool pendant une période d'évaluation.

## Le jeton que Hearth refuse

Zama publie aussi sur Sepolia un **Confidential tGBP** non simulé, à l'adresse
`0x167DC962808B32CFFFc7e14B5018c0bE06A3A208`, au-dessus du jeton public
`0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3`. Le `mint` de son sous-jacent est réservé à
l'émetteur : personne d'autre que lui ne peut obtenir le jeton public, personne ne peut
l'envelopper dans le jeton confidentiel, et aucun pool ne peut être ouvert dessus.

Hearth le liste quand même dans le sélecteur de pools, grisé, avec la raison écrite sous son
nom. Le fichier de déploiement énonce cette raison une seule fois, en anglais, sous la forme
`mint restricted to the issuer`, et l'application l'affiche dans la langue que vous lisez. Le
choisir ouvre une page qui nomme le jeton, renvoie vers les deux contrats sur Etherscan, dit
de qui vient la restriction, et ne propose aucune action de portefeuille, parce qu'un bouton
de dépôt qui échoue est pire que pas de bouton du tout.

Laisser le jeton hors de la liste aurait été plus simple et aurait donné l'impression que
Hearth n'y était simplement pas encore arrivé. Un épargnant qui cherche le tGBP trouve deux
entrées : le pool simulé qui fonctionne, et le jeton officiel qui ne fonctionne pas, avec la
raison.

## Ce que montre la rangée de pools

La page d'accueil se termine par une rangée de tous les pools, chaque case portant le gros lot
de ce pool à l'instant présent, lu sur le serveur en un seul multicall et livré dans la page,
si bien que la rangée est déjà remplie quand le récit cesse de défiler. Le sélecteur dans la
console affiche les mêmes montants selon les mêmes règles.

Deux de ces règles existent parce qu'un nombre peut induire en erreur :

- Un pool dont la lecture n'est pas revenue affiche `non lu`, jamais `0.00`. Un nœud qui n'a
  pas répondu et une cagnotte vide se ressemblent dès qu'un zéro est écrit.
- Un pool qui n'a pas encore clôturé son premier tirage affiche **Premier tirage HH:MM UTC** à
  la place d'un montant, sur la rangée comme sous son nom dans le sélecteur. L'argent des lots
  n'atteint les paliers qu'une fois le premier tirage attribué : avant cette clôture, la
  réponse honnête est une heure et non `0.00`. Ce qu'une case montre se décide sur
  `lastClosedDraw` qui vaut encore zéro, et l'heure elle-même est `firstPeriodAt` plus
  `periodLength`, la fin de la première période et le premier moment où le tirage 1 peut
  clôturer. L'horloge est en vingt-quatre heures et en UTC dans toutes les langues.

## D'où l'application tire les adresses

L'application ne porte jamais une adresse saisie à la main. Chaque pool ouvert de
`packages/web/src/lib/chain/pools.json` est généré depuis un fichier écrit par le script de
déploiement, par :

```
node scripts/sync-pools.mjs        # from packages/web
```

Ce script lit `packages/contracts/deployments/sepolia/hearth.<slug>.json`, refuse tout
fichier auquel il manque une adresse, refuse deux pools réclamant le même identifiant, et
ajoute la seule entrée restreinte qui n'a pas de déploiement. Lancez-le après chaque
déploiement. Les variables d'environnement qui portaient autrefois les trois adresses d'un
pool unique ont disparu.

Le pool qu'un épargnant regarde est le premier segment après `/app` :

| Route | Ce qu'elle montre |
| --- | --- |
| `/app` | Redirige vers le dernier pool utilisé, ou `usdc` à la première visite |
| `/app/<slug>` | Le tableau de bord de ce pool |
| `/app/<slug>/deposit` | Minter, blinder et déposer pour ce jeton |
| `/app/<slug>/withdraw` | Retirer et déblinder pour ce jeton |
| `/app/<slug>/draws` | Les tirages de ce pool, et le résultat propre à l'épargnant dans chacun |
| `/app/<slug>/run` | Les cinq étapes de tirage ouvertes à tous pour ce pool |
| `/verify?pool=<slug>` | La graine, la tranche et les seuils publics de ce pool |

Un code de langue se place devant chacune d'elles pour toutes les langues sauf l'anglais :
le tableau de bord d'un lecteur japonais est donc `/ja/app/weth`.

## Un keeper par pool

Sept pools veut dire sept processus keeper, chacun signant depuis son propre indice de
compte de la même phrase de récupération, parce que deux processus sur un même compte se
disputent le même nonce. Le tableau et le fichier pm2 sont dans
[le keeper](../operations/keeper.md).
