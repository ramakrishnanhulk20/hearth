# Analyse statique

Chaque contrat passe par slither 0.11.6 et solhint avant un déploiement, et chaque résultat
est soit corrigé, soit expliqué ici. Les sept pools sont sept déploiements de ces trois mêmes
contrats, donc un seul passage les couvre tous. Cette page est l'explication. Le passage brut
est reproductible :

```bash
npm run lint -w @hearth/contracts
```

pour solhint, qui passe sans le moindre avertissement sur le jeu de règles ajusté de
`.solhint.json`, et pour slither une compilation simple des mêmes sources sans le plugin
Hardhat FHEVM, parce que le plugin réécrit `ZamaConfig.sol` à la compilation et que slither
ne peut alors plus faire correspondre les décalages du source au fichier sur le disque. La
compilation simple utilise les réglages de compilateur identiques (0.8.27, optimiseur à 800
passages, cancun), donc le bytecode que slither lit est le bytecode qui part en production.

## Le passage

slither a analysé 46 contrats avec 102 détecteurs et a signalé 88 résultats, dont 85 dans
les contrats propres à Hearth. Aucun n'est un bogue. Ils se répartissent en cinq familles, et
chaque famille a une seule raison.

| Famille | Nombre | Gravité attribuée par slither | Pourquoi ce n'est pas un problème |
| --- | --- | --- | --- |
| `unused-return` | 38 | Moyenne | 36 d'entre eux sont `FHE.allow`, `FHE.allowThis`, `FHE.allowTransient` et `FHE.makePubliclyDecryptable`, qui renvoient le handle qu'on leur a donné pour que les appels puissent s'enchaîner. Ignorer cette valeur de retour est l'usage documenté dans tous les exemples de Zama. Les deux autres sont ci-dessous. |
| `reentrancy-no-eth`, `reentrancy-benign`, `reentrancy-events` | 20 | Moyenne et faible | slither traite chaque opération `FHE.*` comme un appel externe, parce que chacune est un appel vers le contrat du coprocesseur. Ces appels portent des handles de chiffrés, pas le contrôle, et aucun contrat utilisateur ne s'exécute à l'intérieur. Les appels réellement externes sont ceux vers le jeton et le coffre, tous deux fixés à la construction, et chaque fonction qui déplace de la valeur est `nonReentrant` et écrit son état avant le transfert. |
| `timestamp` et `incorrect-equality` | 18 | Faible et moyenne | Les périodes sont définies par `block.timestamp` à dessein, et les égalités strictes comparent des numéros de période et des drapeaux nuls, jamais des soldes. Un validateur peut décaler un horodatage de quelques secondes face à des périodes d'une heure ou de six, ce qui déplace le poids d'un épargnant de ces quelques secondes sur 3,600 ou 21,600. |
| `uninitialized-local` | 8 | Moyenne | Des accumulateurs et des compteurs qui démarrent à la valeur zéro par défaut de Solidity, volontairement : `offered`, `assigned`, `totalShares`, `processed`, `heavy`, `marked`, `cleared`. `harvestHandle` est affecté sur tous les chemins du try/catch qui suit sa déclaration. |
| `calls-loop` | 1 | Faible | `finalizeDraw` demande à la cagnotte la cadence de réconciliation de chacun des trois paliers. La boucle est bornée à trois et la cagnotte est celle du coffre lui-même, réglée une fois par le propriétaire. |

Les deux résultats `unused-return` qui ne sont pas des appels de contrôle d'accès :

- `HearthVault._withdraw` ignore le handle que renvoie `confidentialTransfer`. Un transfert
  ERC-7984 déplace tout le montant ou rien, et le coffre a déjà limité le montant au plus
  petit des deux entre ce que l'épargnant détient et ce que le coffre détient, dans la même
  transaction : le montant transféré est donc le montant demandé par construction. Le
  registre a été mis à jour avant l'appel.
- `SponsoredYieldSource.sponsor` ignore ce que renvoie `wrap`. Le sponsor est ici la partie
  de confiance par définition, et ce que la cagnotte comptabilise à une clôture n'est jamais
  le chiffre du sponsor mais le montant vérifié par le KMS que la source a réellement
  transféré au moment de la récolte.

## Ce que slither ne peut pas voir

slither raisonne sur un flot de contrôle en clair. Il ne peut pas dire si une comparaison
chiffrée est la bonne comparaison, s'il manque une autorisation sur la liste de contrôle
d'accès, ou si une valeur est publiée alors qu'elle ne devrait pas l'être. Ces propriétés
sont couvertes par les tests unitaires, les tests d'équité et d'invariants, et les scripts
d'attaque exécutés dans [le modèle de menaces](threat-model.md).
