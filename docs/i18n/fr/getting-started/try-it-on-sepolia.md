# Essayer sur Sepolia

Sepolia est le réseau de test public d'Ethereum. L'argent qui y circule n'a aucune valeur,
vous pouvez donc faire tourner tout le cycle gratuitement. Le pool USDC tire toutes les
heures et les six autres toutes les six heures : prenez USDC si vous voulez assister à un
tirage pour une période dans laquelle vous avez déposé. Le parcours de deux minutes en bas
de cette page n'attend pas de tirage.

L'application en ligne est à l'adresse https://hearth-ram.vercel.app. Tout ce qui suit peut
aussi se faire directement depuis un explorateur de blocs si vous préférez regarder les
appels bruts.

Deux façons d'entrer avec un portefeuille. Si le navigateur a une extension, « Connecter un
portefeuille » l'utilise. S'il n'en a aucune, « Scanner avec un téléphone » affiche un code
WalletConnect qu'un portefeuille mobile lit, ce qui est le seul chemin sur une machine où
vous ne pouvez rien installer. À un navigateur sans aucun portefeuille, on dit lequel
installer et où, plutôt que de lui tendre un bouton qui échoue à mi-parcours.

## 0. Choisir un jeton

Hearth fait tourner sept pools, un par jeton confidentiel que Zama publie sur Sepolia.
Chacun est un jeu de contrats séparé avec ses propres épargnants, son propre argent de lots
et sa propre horloge : choisir un jeton, c'est choisir un pool. Le nom du jeton en haut de
la barre latérale ouvre le sélecteur, et le pool dans lequel vous êtes est la première
partie de l'URL : `/app/usdc`, `/app/weth` et ainsi de suite.

| Jeton | Identifiant | Tirage toutes les | Jeton public avec le `mint` ouvert |
| --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 heure | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` |
| Confidential USDT (Mock) | `usdt` | 6 heures | `0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0` |
| Confidential WETH (Mock) | `weth` | 6 heures | `0xff54739b16576FA5402F211D0b938469Ab9A5f3F` |
| Confidential BRON (Mock) | `bron` | 6 heures | `0xFf021fB13cA64e5354c62c954b949a88cfDEb25E` |
| Confidential ZAMA (Mock) | `zama` | 6 heures | `0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57` |
| Confidential tGBP (Mock) | `tgbp` | 6 heures | `0x93c931278A2aad1916783F952f94276eA5111442` |
| Confidential XAUt (Mock) | `xaut` | 6 heures | `0x24377AE4AA0C45ecEe71225007f17c5D423dd940` |

Le sélecteur affiche aussi le **Confidential tGBP** officiel de Zama, grisé, parce que le
`mint` de son jeton sous-jacent appartient à l'émetteur et que personne d'autre ne peut
obtenir le jeton. La raison se trouve sous son nom, dans la langue que vous lisez, et le
choisir affiche une page qui nomme le jeton, renvoie vers les deux contrats et ne propose
aucune action de portefeuille, plutôt qu'un bouton de dépôt qui échouerait. Un pool qui n'a
pas encore clôturé son premier tirage se sert de cette même ligne sous son nom pour dire
quand ce tirage a lieu, parce qu'il y a une heure à donner plutôt qu'un lot.

L'application se lit en seize langues, choisies depuis le bouton de la barre du haut ou
celui de la barre latérale de la console. L'anglais garde les URL simples et toutes les
autres langues placent leur code devant : le même écran en japonais est donc `/ja/app/usdc`.
L'arabe inverse la mise en page. Toutes les langues, l'arabe compris, gardent les chiffres
occidentaux et une horloge de vingt-quatre heures en UTC, si bien qu'un montant à l'écran
correspond au montant sur un explorateur de blocs, et tout champ de montant accepte la
virgule comme le point pour la décimale, ne refusant qu'un montant qui porte les deux. Ces
pages de documentation sont traduites de la même façon, page pour page, et une page que
personne n'a encore traduite affiche la version anglaise avec une ligne en haut qui le dit.
Chaque traduction a été écrite par un modèle et non par une personne de langue maternelle :
l'anglais est la source de vérité pour chaque nombre et chaque nom de contrat, comme le dit
la page [limites](../limitations.md).

## Les contrats que vous allez toucher

Le parcours ci-dessous utilise le pool USDC. Chaque autre pool est le même jeu de contrats à
des adresses différentes, listées dans
[pools et jetons](../concepts/pools-and-tokens.md).

| Quoi | Adresse | Qui l'a déployé |
| --- | --- | --- |
| Mock USDC (ERC-20 public, `mint` ouvert) | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` | Zama |
| Confidential USDC (`cUSDCMock`, wrapper ERC-7984) | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | Zama |
| HearthVault | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | Hearth |
| HearthPrizePool | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | Hearth |
| SponsoredYieldSource | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` | Hearth |

Les deux adresses Zama sont celles publiées dans le répertoire d'adresses Sepolia du
Confidential Vault de Zama : le jeton de test est donc le leur, pas le nôtre. Tous les
wrappers confidentiels de cette liste utilisent 6 décimales, ce qui veut dire que tout
montant du wrapper sur la chaîne est en millionièmes : 1,000 USDC s'écrit `1000000000`. Le
jeton public en dessous peut utiliser une autre échelle, et le `rate()` du wrapper est la
conversion. Le mock USDC utilise lui aussi 6, donc les deux concordent ; le mock WETH
utilise 18, donc son taux vaut mille milliards.

## 1. Obtenir de l'ETH Sepolia

Il vous faut un peu d'ETH Sepolia pour payer le gaz. N'importe quel faucet Sepolia
convient. Les plus courants sont le faucet Web3 de Google Cloud, le faucet Sepolia
d'Alchemy et le faucet de Chainlink, et chacun verse en une seule demande de quoi faire tout
ce parcours. Un dixième d'ETH est largement plus qu'assez.

## 2. Minter le jeton de test

Chacun des sept mocks publics a un `mint(address, uint256)` public sans contrôle de
propriétaire, plafonné à un million de jetons par appel, et les adresses sont dans le
tableau ci-dessus. L'application l'expose sous la forme d'un bouton sur l'écran Dépôt du
pool dans lequel vous êtes, à la première de ses trois étapes, intitulé « Obtenir des USDC
de test » tant que votre portefeuille n'en détient aucun et « En obtenir un million de plus »
une fois que c'est le cas, avec le jeton de ce pool dans l'intitulé. À la main, pour l'USDC,
c'est :

```
USDCMock.mint(yourAddress, 1000000000)     // 1,000 USDC
```

Demandez-en plus qu'il ne vous en faut. Rien ici n'a de valeur.

## 3. Blinder : envelopper des USDC en USDC confidentiels

Le Confidential USDC est le wrapper ERC-7984 de Zama autour de ce mock USDC. L'ERC-7984 est
le standard de jeton confidentiel : les soldes vivent sur la chaîne sous forme de valeurs
chiffrées plutôt que de nombres lisibles par tous. Envelopper, ce sont deux appels :

```
USDCMock.approve(cUSDC, 1000000000)
cUSDC.wrap(yourAddress, 1000000000)
```

Dans l'application, ces deux appels sont l'étape 2 du Dépôt, « Blindez vos USDC ». Le bouton
affiche « Blinder », et « Approuver le wrapper » tant que l'autorisation donnée au wrapper
est inférieure au montant que vous avez saisi. L'approbation est demandée une seule fois,
pour une autorisation large, si bien que chaque blindage après le premier est une seule
transaction au lieu de deux. Elle atteint exactement un contrat, le wrapper confidentiel de
ce jeton, et lui permet de sortir le jeton public simulé de votre portefeuille, rien d'autre.
L'écran dit ces deux choses à côté du bouton plutôt que de les laisser à découvrir.

Vous détenez maintenant 1,000 USDC confidentiels. À partir d'ici, votre solde est un handle
chiffré et vous seul pouvez le lire.

L'enveloppement est public. Le wrapper émet un événement `Wrap` qui porte le montant en
clair, le transfert ERC-20 sous-jacent le porte une deuxième fois, et le montant apparaît
une troisième fois dans la trace de chiffrement trivial du coprocesseur. Il n'y a pas moyen
d'y échapper : convertir un jeton public en jeton confidentiel est par définition un acte
public.

## 4. Déposer dans le pool

Un seul appel, et le montant est chiffré dès le départ :

```
cUSDC.confidentialTransferAndCall(vault, encryptedAmount, inputProof, "")
```

L'application construit pour vous l'entrée chiffrée et sa preuve avec le SDK de Zama. Le
crochet de réception du coffre crédite exactement le montant que le jeton dit avoir
réellement déplacé, pas le montant que vous avez demandé : un transfert insuffisant, pour
quelque raison que ce soit, ne peut donc pas créer de principal fantôme.

Cela a une conséquence à connaître avant de saisir un montant. Demander à déposer plus que
votre solde confidentiel n'est refusé nulle part sur la chaîne : le jeton déplace ce que le
portefeuille détient, ce qui peut être rien, et la transaction réussit sans avoir rien
accompli. C'est donc l'écran qui tient cette ligne. Une fois votre solde confidentiel ouvert
avec l'œil, le champ de dépôt affiche « C'est plus que ce que vous détenez » et le bouton
reste éteint. L'écran de déblindage va plus loin, parce qu'il n'y a rien à y ouvrir : il lit
votre solde de jeton public avant l'opération puis après elle, et si les deux sont
identiques il affiche « Rien n'a bougé », désigne le montant trop grand comme la cause
habituelle, et pointe vers « Tout ».

Le coffre refuse un dépôt dont le montant, ou dont le principal résultant, vous ferait
passer au-dessus du plafond par épargnant, qui est d'environ 5 milliards de jetons sur une
période d'une heure et d'environ 854 millions sur une période de six heures. Les deux
moitiés de ce contrôle comptent : l'addition chiffrée déborde silencieusement à 64 bits,
donc borner le montant entrant en plus du total est ce qui empêche un dépôt énorme de faire
repasser la somme à un petit nombre et de passer entre les mailles. Le refus est lui-même
chiffré : le crochet renvoie un faux chiffré et le jeton vous rembourse dans la même
transaction, si bien qu'un rejet n'apprend à personne quel était votre solde.

### Pourquoi envelopper et déposer sont deux étapes, et non une seule

La plupart des applications de ce domaine regroupent « approuver, envelopper, déposer »
derrière un seul bouton. C'est plus agréable et cela laisse fuir votre dépôt.

Nous l'avons mesuré sur notre propre déploiement précédent. En lisant les journaux publics
des blocs Sepolia 11528000 à 11618500, trois des cinq dépôts se trouvaient deux à quatre
blocs après un `Wrap` public d'exactement 100 USDC par la même adresse. N'importe qui lisant
la chaîne pouvait chiffrer ces trois dépôts à 100 USDC chacun sans rien casser. La
documentation de Zama nomme le même problème et l'appelle la corrélation
enveloppement-participation : « Un utilisateur qui enveloppe 50,000 USDC et rejoint un lot
quelques minutes plus tard n'a en pratique publié que la borne supérieure de son montant de
participation. »

Hearth les garde donc séparés exprès :

- Enveloppez une fois, en chiffre rond, au moment de votre choix.
- Conservez un solde confidentiel permanent et déposez-en une partie plus tard.
- Déposez à nouveau depuis ce même solde sans envelopper une deuxième fois.

La corrélation s'affaiblit avec le temps, avec la réutilisation d'un solde permanent, et
avec le trafic des autres sur le wrapper. Le faire en un clic supprime ces trois défenses.
L'application affiche l'avertissement sur l'étape de blindage plutôt que de cacher le
compromis.

Il vaut la peine d'être direct sur ce que coûte un solde identifié, parce que cela va
au-delà du montant du dépôt. Les seuils sont publics par conception, puisque c'est ce qui
rend le tirage vérifiable. Quiconque connaît votre solde peut donc calculer si vous avez
gagné, dans chaque palier, à chaque tirage à partir de là, sans rien déchiffrer. Voilà
pourquoi ce sont deux étapes et non une.

## 5. Attendre un tirage

Une période dure une heure dans le pool USDC et six heures dans les six autres, pour la
raison de gaz exposée dans [pools et jetons](../concepts/pools-and-tokens.md). Le tirage
d'une période ne peut être clôturé qu'une fois cette période terminée, et tout ce qui le
concerne doit s'achever dans les deux périodes suivantes. La clôture elle-même a une
échéance plus serrée, le milieu de la seconde de ces périodes, pour que l'aller-retour de
déchiffrement et l'attribution aient toujours de la place. Un dépôt que vous faites
maintenant gagne donc des chances pour la période en cours, et le résultat de cette période
tombe dans les deux heures qui suivent environ.

Le tableau de bord montre la période en cours et le temps restant dans « Le pool en ce
moment », et « Mes tirages » dans la barre latérale montre l'état des derniers. Vous n'avez
rien à faire. Si vous voulez pousser vous-même, chaque étape d'un tirage est appelable par
n'importe qui, et « Lancer un tirage » dans la barre latérale les contient toutes les cinq ;
voir [la page du keeper](../operations/keeper.md).

Vos chances sur une période reposent sur votre solde moyen sur toute cette période, pas sur
votre solde à la fin. Déposer cinq minutes avant la clôture d'une période d'une heure vous
achète un douzième des chances que vous auriez eues en détenant le même montant toute la
période. C'est délibéré ; voir
[solde pondéré par le temps](../concepts/time-weighted-balance.md).

## 6. Révéler ce que vous détenez et ce que vous avez gagné

Appuyez sur l'œil à côté de « Principal » dans la carte « Ce que vous détenez » du tableau
de bord, et signez le message que votre portefeuille vous présente. Les valeurs scellées
sont affichées sous forme d'astérisques jusque-là, et l'œil est la seule chose qui les
ouvre.

Cette signature est un déchiffrement utilisateur EIP-712 : une signature typée hors chaîne
qui prouve au relayer de Zama que vous contrôlez l'adresse, en échange du texte clair des
valeurs auxquelles le contrat vous a donné accès. Ce n'est pas une transaction. Elle ne
coûte pas de gaz et n'écrit rien sur la chaîne.

Vous pouvez révéler quatre choses vous concernant :

| Valeur | Signification |
| --- | --- |
| Principal | Ce que vous avez épargné. |
| Gains | L'argent des lots qui vous a été crédité et que vous n'avez pas encore retiré. |
| Poids, par tirage | Votre solde pondéré par le temps pour cette période, le nombre auquel le test du gagnant a été comparé. |
| Crédit, par tirage | Ce que ce tirage vous a payé. Zéro si vous n'avez pas gagné. |

Les deux premières s'ouvrent ensemble depuis l'œil unique de « Ce que vous détenez », sur le
tableau de bord. Les deux dernières s'ouvrent ensemble depuis l'œil à côté de « Votre lot »,
sous « Votre résultat » sur la carte de ce tirage dans « Mes tirages ». Votre solde et le
résultat d'un tirage peuvent être ouverts en même temps, la signature du premier sert au
second, et appuyer sur un œil ouvert ne rescelle que la carte où il se trouve.

Les deux dernières sont ce qui vous permet de vérifier le tirage vous-même : prenez votre
poids, prenez la graine publique et la tranche publique, recalculez vos seuils, et
confirmez que le crédit correspond. Le coffre expose l'arithmétique des seuils sous forme de
vue, `thresholdOf`, pour que vous puissiez comparer vos propres calculs à ceux du contrat.
Voir [aléa et vérification](../security/randomness-and-verification.md).

Personne d'autre ne peut lire aucune de ces quatre valeurs. Le relayer refuse une demande de
déchiffrement venant d'une adresse à laquelle le contrat n'a rien accordé, et ce refus est
l'application de la règle, pas une politique.

## 7. Réclamer

Il n'y a pas de transaction de réclamation, seulement un bouton de réclamation.

Votre lot est déjà dans votre solde de gains dès l'instant où le parcours vous atteint.
L'étape 6 est la façon dont vous l'apprenez. Une fois le résultat de ce tirage ouvert, sa
carte dans « Mes tirages » affiche un bouton de réclamation portant le montant, par exemple
« Réclamer 1.00 USDC » ; appuyer dessus envoie un retrait ordinaire pour exactement ce
montant, et l'étape 8 ramène le reste chez vous. Sur la chaîne, une réclamation et un
retrait sont le même appel de la même forme, et c'est cela qui empêche un gagnant de se
détacher du lot.

L'œil unique de cette carte ouvre trois montants à la fois : votre poids pour le tirage, le
crédit de ce tirage, et `confidentialWinningsOf`, c'est-à-dire tout ce que le coffre doit
encore à ce portefeuille, tirages confondus. Le bouton est adossé au crédit comme à ce
montant courant, et il propose le plus petit des deux. Le crédit d'un tirage ne change plus
une fois écrit : une carte adossée au seul crédit proposerait donc le même lot une deuxième
fois après un rechargement, et la chaîne l'honorerait, sur votre propre principal. Le montant
courant baisse dès qu'une réclamation aboutit, ce qui retire le bouton et laisse la carte
dire que le lot a déjà été sorti, le montant restant conservé comme trace de ce tirage.

Il n'y a rien non plus à presser pour être crédité. L'évaluation parcourt la liste des
épargnants à partir d'un point décidé par la graine de ce tirage. Le bouton « Faire avancer
le tirage » sur la carte du tirage, et « Avancer » sur l'écran « Lancer un tirage », font
tous deux avancer ce parcours partagé plutôt que de vous en extraire. Un épargnant qui
appuie sur l'un ou l'autre n'annonce à personne qu'il a gagné.

## 8. Retirer

```
vault.withdraw(encryptedAmount, inputProof)      // or vault.withdrawAll()
```

Dans l'application, ce sont les boutons « Retirer » et « Tout retirer » de l'écran Retrait,
sous son onglet « Sortir du coffre ». « Tout » à côté du champ n'est pas un troisième appel :
il remplit le champ avec tout ce que vous détenez, une fois que vous avez ouvert votre
solde.

Les retraits paient d'abord sur les gains, ensuite sur le principal. Le montant est limité
au plus petit des deux entre ce que vous détenez et ce que le coffre détient, parce qu'un
transfert confidentiel déplace tout le montant ou rien du tout, et jamais une partie. Faire
ce calcul avant le transfert est ce qui garde le registre exact sans aucune réparation
ensuite. Un transfert confidentiel, un événement, un montant chiffré.

Le principal n'est jamais bloqué. Vous pouvez retirer au milieu d'un tirage, et le poids que
le tirage a déjà fixé pour vous ne change pas.

## 9. Déblinder : désenvelopper vers des USDC publics

Deux appels, parce que le désenveloppement est asynchrone par conception. D'abord `unwrap`,
puis `finalizeUnwrap`. L'application envoie les deux depuis le bouton « Déblinder » de
l'onglet « Retour aux USDC ordinaires » de l'écran Retrait. Si le second reste inachevé, une
carte d'avertissement se place au-dessus des deux onglets jusqu'à ce que vous appuyiez sur
« Terminer le déblindage ». La liste exacte des arguments se trouve dans le wrapper de Zama,
pas dans le nôtre.

Le premier appel brûle le montant chiffré et le marque pour déchiffrement public. Le second
libère les jetons en clair une fois que le protocole de Zama a produit le texte clair et sa
preuve. L'application lit votre solde de jeton public avant le premier appel et de nouveau
après le second, et rapporte la différence : « 250.00 USDC déblindés » est donc un fait
mesuré et non le nombre que vous avez saisi. Quand cette différence est nulle, elle affiche
« Rien n'a bougé » au lieu de déclarer une réussite : les deux transactions ont bien abouti,
et le wrapper ne libère rien plutôt que de refuser quand le montant dépassait votre solde
confidentiel. Le montant que vous désenveloppez est public, exactement comme le montant que vous
avez enveloppé, et c'est le premier appel qui le publie : un désenveloppement que vous ne
finalisez jamais a donc déjà fui.

Cela donne une deuxième chose à savoir. Si vous enveloppez à l'entrée et désenveloppez
entièrement à la sortie, la différence entre les deux totaux publics est une borne
inférieure sur tout ce que vous avez jamais gagné, et une fois que vous avez tout vidé elle
est exacte. Désenvelopper vers une adresse neuve n'aide pas, parce que le transfert
confidentiel vers cette adresse est lui-même le lien. Si cela compte pour vous,
désenveloppez en chiffres ronds sans rapport avec votre position, ou laissez un solde
confidentiel permanent derrière vous.

## Essayer en deux minutes

L'application est une console avec une barre à gauche, une tâche par écran : le parcours est
donc une descente de cette barre.

1. Ouvrez https://hearth-ram.vercel.app, suivez « Le pool » dans l'en-tête jusqu'à `/app`,
   et connectez un portefeuille sur Sepolia, avec l'extension du navigateur ou en scannant
   le code avec un portefeuille sur téléphone. Vous arrivez dans le pool USDC, à
   `/app/usdc` ; le nom du jeton en haut de la barre change de pool. Le tableau de bord
   s'ouvre sur un bloc marqué « Suivant » qui nomme la seule chose à faire.
2. « Dépôt » dans la barre latérale, qui s'ouvre sur celle de ses trois étapes où votre
   portefeuille en est. Cliquez sur « Obtenir des USDC de test », puis « Blinder », puis
   « Déposer ». Le premier blindage demande une approbation du wrapper, et aucun blindage
   après lui ne la redemande.
3. De retour sur le tableau de bord, appuyez sur l'œil à côté de « Principal » dans « Ce que
   vous détenez » et signez : votre principal et vos gains apparaissent tous les deux, dans
   le navigateur uniquement.
4. « Lancer un tirage » dans la barre latérale, la ligne marquée « N'importe qui ». Appuyez
   sur « Clôturer », puis « Attribuer », pour clôturer et attribuer vous-même la dernière
   période terminée, ou regardez le keeper le faire.
5. Appuyez sur « Avancer » sur le même écran. Ouvrez ensuite « Mes tirages » et appuyez sur
   l'œil sous « Votre résultat » sur la carte de ce tirage : votre poids et votre crédit pour
   ce tirage apparaissent, et le solde de l'étape 3 reste ouvert sur une seule signature.
6. Ouvrez `/verify?pool=usdc` : la graine et la tranche publiques y sont, « Seuils pour une
   adresse » recalcule vos seuils sous vos yeux, et la comparaison correspond. Remplacez le
   paramètre `pool` par n'importe quel autre identifiant pour vérifier cet autre pool.
7. « Retrait » dans la barre latérale, onglet « Sortir du coffre », « Tout retirer ». Le
   principal et les éventuels gains reviennent en un seul transfert.

Rien dans ce parcours n'a besoin que nous soyons en ligne. Chaque étape du tirage est
ouverte à tous.
