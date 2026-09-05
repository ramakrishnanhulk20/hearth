# FAQ

## 1. Dans quel jeton puis-je épargner ?

Sept : USDC, USDT, WETH, BRON, ZAMA, tGBP et XAUt, tous des jetons confidentiels de Zama sur
Sepolia. Chacun est un pool distinct avec ses propres contrats, ses propres épargnants et
son propre argent de lots, et le pool dans lequel vous êtes est la première partie de l'URL
après `/app`. Le sélecteur affiche aussi le Confidential tGBP officiel de Zama, grisé : son
jeton public ne peut être émis que par l'émetteur, donc personne ne peut l'envelopper et
aucun pool ne peut exister dessus. Tout le reste de cette page s'applique à chaque pool pris
séparément. Les détails sont dans [pools et jetons](concepts/pools-and-tokens.md).

## 2. Où est le bouton de réclamation ?

Dans « Mes tirages » de l'application, sur la carte de ce tirage, sous « Votre résultat »,
une fois que vous l'avez ouverte avec l'œil. Il n'apparaît que si ce tirage vous a crédité
quelque chose et que le coffre doit encore de l'argent à ce portefeuille : le même œil ouvre
à la fois le crédit de ce tirage et le montant courant des gains non réclamés du coffre, et
le bouton propose le plus petit des deux. C'est ce second montant qui le rend honnête. Le
crédit d'un tirage ne change plus une fois écrit : un bouton adossé au seul crédit
proposerait donc le même lot une deuxième fois après un rechargement, et la chaîne le
paierait sur votre propre principal. Sous le capot, ce n'est délibérément pas une
transaction distincte : les lots
sont crédités sur votre solde de gains chiffré pendant l'évaluation, et le bouton de
réclamation, qui porte le montant, envoie un retrait ordinaire pour ce montant, ce qui sur la
chaîne ressemble exactement à n'importe quel autre retrait. Dans la plupart des protocoles à
lots, seuls les gagnants ont une raison d'envoyer une transaction de réclamation, si bien
que la liste des transactions les nomme discrètement ; ici, il n'existe pas de transaction de
ce genre à guetter. Le même argent sort par l'onglet « Sortir du coffre » de l'écran
Retrait, parce qu'une réclamation est un retrait sous un autre nom.

## 3. Puis-je perdre mon principal ?

Non. Les lots sont payés sur le rendement, jamais sur le dépôt de qui que ce soit, et
`withdraw` est toujours ouvert, y compris pendant qu'un tirage se déroule. La seule chose
que vous pouvez perdre, c'est un lot que vous auriez gagné : si le parcours d'évaluation ne
vous atteint pas dans la fenêtre de deux périodes, ce tirage ne vous paie rien et l'argent
retourne au palier. Voir la limite 2.

## 4. Pouvez-vous voir mon solde ou mes gains ?

Non. Votre principal, vos gains, votre poids pour chaque tirage et votre crédit pour chaque
tirage sont des valeurs chiffrées auxquelles seule votre adresse a accès, et la liste de
contrôle d'accès de Zama fait respecter cela sur la chaîne, pas comme une politique que nous
promettons. Nous voyons les mêmes choses qu'un inconnu : que vous avez déposé, quand, et
rien sur le montant.

## 5. Comment mes chances sont-elles calculées ?

Par votre solde moyen sur toute la période, pas par votre solde au moment du tirage. Une
période dure une heure dans le pool USDC et six heures dans les six autres. Détenez 100 USDC
pendant une période complète d'une heure et votre poids vaut 360,000 solde-secondes ; vos
lots attendus dans un palier valent ce poids divisé par la tranche publiée, multiplié par
les chances du palier et par son nombre de lots. Répartir votre argent entre plusieurs
portefeuilles ne change rien, parce que l'espérance est exactement proportionnelle au poids.

## 6. J'ai déposé cinq minutes avant le tirage et je n'ai rien gagné. Pourquoi ?

Parce que cinq minutes d'une période d'une heure valent un douzième des chances que vous
auriez eues en détenant toute la période, et un soixante-douzième d'une période de six
heures. C'est ce qui empêche quelqu'un d'exhiber un gros solde juste avant chaque tirage, de
gagner et de retirer ; nous avons exécuté cette attaque contre notre propre conception
antérieure et elle a raflé 19 tirages sur 20. Déposez et laissez, et vous obtenez votre part
entière dès la prochaine période complète.

## 7. Mes gains rapportent-ils des chances eux aussi ?

Pas d'eux-mêmes. Les gains reposent sur un solde chiffré distinct qui ne compte pas dans
votre poids, donc la capitalisation n'est pas automatique : retirez-les et redéposez-les
pour les mettre au travail. C'est cette séparation qui permet à un retrait de lot de
ressembler exactement à un retrait d'épargne.

## 8. Qui déclenche les tirages, et que se passe-t-il s'ils s'arrêtent ?

Nous faisons tourner un processus keeper par pool, chacun sur son propre compte : un keeper
qui s'arrête coûte ses tirages à un pool et laisse les six autres tourner. La cagnotte
implémente aussi l'interface d'automatisation de Chainlink, si bien qu'un upkeep basé sur le
temps pourrait couvrir l'étape de clôture, même si aucun n'est enregistré sur aucun pool
pour l'instant. Dans tous les cas, chaque étape d'un tirage est appelable par n'importe qui,
y compris par vous depuis l'application. La clôture a sa propre échéance, une demi-période
avant la fin de la fenêtre, pour qu'une clôture ne puisse jamais arriver trop tard pour que
l'attribution suive. Si rien ne tourne, ce tirage est sauté : sa liquidité reste dans les
paliers pour le tirage suivant, le rendement est comptabilisé dès qu'une attribution tardive
arrive, et les dépôts comme les retraits continuent de fonctionner. Un keeper à l'arrêt
coûte des tirages, jamais de l'argent.

## 9. Pourriez-vous truquer le nombre aléatoire, ou la taille du lot ?

Ni l'un ni l'autre. La graine est générée dans le coprocesseur de Zama sous forme chiffrée,
donc personne ne la voit au moment où elle est tirée, et clôturer un tirage réussit
exactement une fois, donc il n'y a pas de second tirage. La taille des lots est fixée plus
tôt dans cette même transaction, avant que la graine n'existe : personne ne peut donc lire
une graine, comprendre qu'il a gagné, puis agrandir son gain. Après la fin de la période, la
graine est publiée avec une signature du service de gestion des clés de Zama que le contrat
vérifie sur la chaîne, et à partir d'elle n'importe qui peut recalculer le seuil exact que
n'importe quelle adresse devait battre.

## 10. Pourquoi le pool ne publie-t-il qu'un ordre de grandeur plutôt que son total exact ?

Parce que le total exact livre les dépôts individuels. Deux totaux consécutifs, plus
l'horodatage public de votre propre dépôt, permettent à n'importe qui de résoudre pour
trouver votre montant exact si vous étiez le seul à avoir bougé de l'argent sur cette
période. Pas une estimation, le nombre. Le coffre ne publie donc que la plus petite
puissance de deux au-dessus du total, contre laquelle le tirage tourne à la place. Cela
coûte qu'un palier paie entre la moitié et la totalité de son nombre de lots nominal à
chaque tirage, le reste étant reporté et offert de nouveau : la taille des lots se stabilise
donc un peu plus haut. Les chances de personne ne sont déformées par rapport à celles d'un
autre.

## 11. D'où vient l'argent des lots ?

Sur Sepolia, d'un solde financé par un sponsor qui s'écoule à un débit fixe, un par pool,
parce qu'aucun lieu sur Sepolia ne paie de rendement sur les jetons simulés de Zama. Sur le
réseau principal, la même interface se branche sur le Confidential Vault de Zama, qui place
de l'USDC confidentiel dans un vrai coffre de rendement ERC-4626 via un batcher. Dans les
deux cas, la cagnotte ne comptabilise que le montant qu'un déchiffrement vérifié par le KMS
dit être réellement arrivé, jamais un nombre que la source déclare sur elle-même.

## 12. Que peut apprendre sur moi quelqu'un qui surveille la chaîne ?

Que vous êtes un épargnant, dans quel bloc vous avez déposé ou retiré, et dans quel lot
d'évaluation vous étiez. Pas votre solde, pas vos chances, pas si vous avez gagné. Quatre
points de fuite valent la peine d'être connus. La tranche publiée s'approche d'une
information personnelle quand il y a moins de trois épargnants. Si quelqu'un peut identifier
votre solde, généralement en observant un enveloppement public suivi d'un dépôt du même
montant, alors votre résultat à chaque tirage devient de l'arithmétique publique à partir de
là, parce que les seuils sont publics par conception. Envelopper à l'entrée et désenvelopper
entièrement à la sortie publie une borne inférieure sur tout ce que vous avez gagné. Et
chaque palier publie combien de lots il a payés, un tirage plus tard, ce qui est une mesure
grossière des soldes chiffrés et resserre lentement un solde qui ne bouge jamais. Nous
publions ce compte à chaque tirage parce que c'est la même étape qui rend l'argent non gagné
à la réserve publique, ce qui est ce qui permet au gros lot de s'accumuler là où vous pouvez
le regarder. Les quatre sont traités dans
[ce qui reste privé](security/what-stays-private.md).
