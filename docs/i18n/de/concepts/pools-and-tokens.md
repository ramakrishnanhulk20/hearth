# Pools und Token

Hearth ist nicht ein Pool. Es sind sieben, einer je vertraulichem Token aus Zamas
Sepolia-Adressbuch, und jeder ist ein eigener `HearthVault`, ein eigener
`HearthPrizePool` und eine eigene `SponsoredYieldSource`, mit eigenen Sparern, eigenem
Preisgeld und eigenem Keeper.

Die Verträge sind derselbe Code, siebenmal mit unterschiedlichen Konstruktor-Argumenten
ausgerollt. Auf der Blockchain wird nichts geteilt: kein Register, kein Router, kein
gemeinsames Guthaben. Ein Sparer im WETH-Pool kann den USDC-Pool weder sehen noch berühren
noch von ihm berührt werden, und ein pausierter Vault oder ein stehen gebliebener Keeper
bei einem Token lässt die anderen sechs weiterlaufen.

## Die sieben Pools

| Token | Kürzel | Ziehung alle | Vault | Preispool | Renditequelle |
| --- | --- | --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 Stunde | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` |
| Confidential USDT (Mock) | `usdt` | 6 Stunden | `0xe54F44dE64F8A7abc0647eaae547dD59ce0EFfac` | `0x6a83Beb2Dc3f258107Cad5e17BC57657fAd4fbd1` | `0x5bb1Cd5380Cb9f2B15569030fF0dB7a445cF54cA` |
| Confidential WETH (Mock) | `weth` | 6 Stunden | `0x3D1A182782B68fE270A66294C9adaC7F005c4f14` | `0x1a11e7C689F244fA8Dd5f4abA8F2F3131090cc1C` | `0x40DF298f15c6136294eC651aD7b0c1C6F221DE8F` |
| Confidential BRON (Mock) | `bron` | 6 Stunden | `0x18086DC8271f8A73c5Ea985fd519527Dbb991279` | `0x2Ed982979CD184494B947a1E38E597494a38ACe4` | `0x0cD1155D752bD81b3a437a6f0B3965CAA2A1C8e9` |
| Confidential ZAMA (Mock) | `zama` | 6 Stunden | `0xEEC26386F273c6678cA538AcA18e1d9384eA9F09` | `0x873B285404199D46325a294Aa0EC7a79C30A7fF7` | `0xdD352D70311E834ab75307f53d5C276060081d23` |
| Confidential tGBP (Mock) | `tgbp` | 6 Stunden | `0xCe95dAa01f5354aA8887A5952E403D26d452c323` | `0xC531D54ee2c695e0eBfe8b8258e9Fd80fd507095` | `0xDEa2BD6351072F735B6ea83c357bF157d83c01af` |
| Confidential XAUt (Mock) | `xaut` | 6 Stunden | `0x77f701101d66FbD522A3bFdC2c00DB09a4F57daE` | `0x9a2888aca42c707A3BC0D561FdF6ff8Abfda5201` | `0x03fDdAA7C4323C53CE511CC49D4c33B26B492af7` |

Jeder Vertrag oben ist auf Etherscan verifiziert. Das Tokenpaar, das jeder Pool hält, ist
Zamas, nicht unseres, und steht unter [auf Sepolia ausprobieren](../getting-started/try-it-on-sepolia.md).

Der USDC-Pool wurde zuerst ausgerollt, am 2. September 2026 in Block `11622398`, und zieht
seither stündlich. Deshalb ist er der Pool mit Historie und der Pool, gegen den das
Beweis-Protokoll im README aufgezeichnet wurde. Die anderen sechs wurden am 5. September
2026 ausgerollt, in den Blöcken `11641314` bis `11641523`.

## Warum sechs Stunden und nicht eine Stunde für alle sieben

Gas. Eine Ziehung in einem Pool mit fünf Sparern kostet `8,456,388` Gas, gemessen an
echten Sepolia-Belegen: ein Abschluss, eine Zuteilung, zwei Auswertungs-Batches, ein
Finalisieren und ein Abgleich je Stufe. Bei 1 Gwei sind das `0.0085 ETH`. Sieben Pools mit
stündlicher Ziehung wären 168 Ziehungen am Tag, etwa `1.43 ETH`, was sich über ein
Bewertungsfenster hinweg nicht aus öffentlichen Faucets finanzieren lässt. Ein Pool mit
zehn Sparern kostet `12,582,923` Gas je Ziehung, und die Rechnung wächst mit.

Die sechs später ausgerollten Pools ziehen deshalb alle sechs Stunden. Das sind vier
Ziehungen am Tag je Pool, alle sieben Pools zusammen kosten also etwa `0.41 ETH` am Tag
statt `1.43`, und vier Ziehungen am Tag sind immer noch oft genug, dass ein Besucher
innerhalb eines Besuchs eine erlebt. Der USDC-Pool behält seine stündliche Uhr und die
Ziehungshistorie, die damit einherging.

Die Chancen werden gegen die jeweils eigene Periode eines Pools gesetzt statt übernommen,
sodass sich das Produkt auf beiden Uhren gleich anfühlt:

| Stufe | Stündlicher Pool (`usdc`) | Sechs-Stunden-Pools |
| --- | --- | --- |
| Hauptpreis | Anzahl 1, Chance 1 zu 24, Anteile 40 | Anzahl 1, Chance 1 zu 4, Anteile 40 |
| Mittel | Anzahl 1, Chance 1 zu 6, Anteile 20 | Anzahl 1, Chance 1 zu 2, Anteile 20 |
| Häufig | Anzahl 4, Chance 1 zu 1, Anteile 40 | Anzahl 4, Chance 1 zu 1, Anteile 40 |

Der Hauptpreis fällt damit in jedem Pool etwa einmal am Tag. Die mittlere Stufe ist die
einzige Stelle, an der sich die beiden Uhren unterscheiden: etwa viermal am Tag im
stündlichen Pool und etwa zweimal am Tag in den Sechs-Stunden-Pools, weil das Halbieren der
Chance die auf ein Sechstel gesunkene Zahl der Ziehungen nicht ganz ausgleicht. Jede Stufe
jedes Pools gleicht bei jeder Ziehung ab, aus dem Grund unter
[Preise und Stufen](prizes-and-tiers.md).

## Nachkommastellen, und was ein Betrag bedeutet

Jeder vertrauliche Wrapper in Zamas Sepolia-Adressbuch meldet sechs Nachkommastellen,
gleich was der öffentliche Token darunter meldet, weil der Wrapper sich selbst bei sechs
deckelt und die Differenz seiner `rate()` anlastet. Vertrauliches WETH ist der klarste
Fall: Sein Basiswert hält 18 Nachkommastellen, die `rate()` des Wrappers ist also eine
Billion, und eine Basiseinheit des Wrappers sind eine Billion Basiseinheiten des
öffentlichen Tokens.

Jeder Betrag in `packages/contracts/hearth.config.ts` steht in Basiseinheiten des
Wrappers, und das Deployment und die Tasks multiplizieren mit der Rate, die sie auf der
Blockchain lesen, bevor sie den öffentlichen Token anfassen. Das ist keine Kleinigkeit.
Unsere eigene Prüfung fand einen Fehler, bei dem ein Pool den Betrag verbuchte, den ein
Aufrufer übergab, statt des Betrags, den der Wrapper geprägt hatte, was bei einem Token mit
18 Nachkommastellen das Preisgeld um den Faktor eine Billion aufblähte. Siehe
[Renditequelle](yield-source.md).

## Womit jeder Pool bestückt ist

`hearth:seed --token <slug>` sponsert die Renditequelle und setzt fünf Demo-Sparer hinein,
aus den Konto-Indizes 2 bis 6, sodass ein Erstbesucher auf einem belebten Pool landet. Die
Einsätze unterscheiden sich je Token, weil ein Pool aussehen muss wie der Wert, den er
hält: 1.200 eines Dollar-Stablecoins und 0,6 Ether sind derselbe Sparer der Größe nach.

| Pool | Fünf Demo-Einsätze | Sponsoring | Freigegebenes Preisgeld |
| --- | --- | --- | --- |
| `usdc` | 1.200 / 600 / 300 / 150 / 75 | 10.000 USDC | 20 USDC je Stunde, also 19,998 je Ziehung |
| `usdt` | 1.200 / 600 / 300 / 150 / 75 | 10.000 USDT | 20 USDT je Stunde, also 119,98 je Ziehung |
| `weth` | 0,6 / 0,3 / 0,15 / 0,075 / 0,04 | 5 WETH | 0,01 WETH je Stunde, abgerundet 0,0432 je Ziehung |
| `bron` | 2.000 / 1.000 / 500 / 250 / 125 | 15.000 BRON | 30 BRON je Stunde, also 179,99 je Ziehung |
| `zama` | 2.000 / 1.000 / 500 / 250 / 125 | 15.000 ZAMA | 30 ZAMA je Stunde, also 179,99 je Ziehung |
| `tgbp` | 1.000 / 500 / 250 / 125 / 60 | 8.000 tGBP | 16 tGBP je Stunde, also 95,99 je Ziehung |
| `xaut` | 0,4 / 0,2 / 0,1 / 0,05 / 0,025 | 3 XAUt | 0,006 XAUt je Stunde, abgerundet 0,0216 je Ziehung |

Die Rate einer Quelle sind ganze Basiseinheiten je Sekunde, die beiden kleinsten Raten
werden also abgerundet: 0,01 WETH je Stunde sind 2,77 Basiseinheiten je Sekunde und geben 2
frei, und 0,006 XAUt je Stunde sind 1,67 und geben 1 frei. Jedes Sponsoring ist so bemessen,
dass es mehr als achtzig Ziehungen trägt, also zwanzig Tage oder mehr, damit niemand
während eines Bewertungsfensters nachlegen muss.

## Der Token, den Hearth ablehnt

Zama veröffentlicht auf Sepolia auch einen echten **Confidential tGBP**, unter
`0x167DC962808B32CFFFc7e14B5018c0bE06A3A208` über dem öffentlichen Token
`0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3`. Sein zugrunde liegendes Minting ist auf den
Herausgeber beschränkt, niemand außer dem Herausgeber kann den öffentlichen Token also
bekommen, niemand kann in den vertraulichen wrappen, und darauf lässt sich überhaupt kein
Pool eröffnen.

Hearth führt ihn trotzdem in der Poolauswahl auf, ausgegraut, mit dem Grund daneben:
`mint restricted to the issuer`. Wer ihn wählt, öffnet eine Seite, die den Token benennt,
beide Verträge auf Etherscan verlinkt, sagt, wessen Beschränkung das ist, und keine
Wallet-Aktion anbietet, denn ein Einzahlen-Button, der zurückweist, ist schlimmer als kein
Button.

Den Token wegzulassen wäre einfacher gewesen und hätte so ausgesehen, als wäre Hearth
schlicht noch nicht dazu gekommen. Wer nach tGBP sucht, findet zwei Einträge: den
Mock-Pool, der funktioniert, und den offiziellen Token, der es nicht tut, mit dem Grund.

## Woher die App die Adressen bekommt

Die App trägt keine von Hand eingetippte Adresse. Jeder offene Pool in
`packages/web/src/lib/chain/pools.json` wird aus einer Datei erzeugt, die das
Deployment-Skript geschrieben hat, und zwar mit:

```
node scripts/sync-pools.mjs        # from packages/web
```

Dieses Skript liest `packages/contracts/deployments/sepolia/hearth.<slug>.json`, weist jede
Datei ohne Adresse zurück, weist zwei Pools mit demselben Kürzel zurück und hängt den einen
beschränkten Eintrag an, der kein Deployment hat. Führen Sie es nach jedem Deployment aus.
Die Umgebungsvariablen, die früher die drei Adressen eines einzelnen Pools hielten, gibt es
nicht mehr.

Der Pool, den ein Sparer gerade ansieht, ist das erste Segment nach `/app`:

| Route | Was sie zeigt |
| --- | --- |
| `/app` | Leitet zum zuletzt benutzten Pool weiter, beim ersten Besuch zu `usdc` |
| `/app/<slug>` | Das Dashboard dieses Pools |
| `/app/<slug>/deposit` | Minten, abschirmen und einzahlen für diesen Token |
| `/app/<slug>/withdraw` | Abheben und Abschirmung aufheben für diesen Token |
| `/app/<slug>/draws` | Die Ziehungen dieses Pools, und das eigene Ergebnis des Sparers in jeder |
| `/app/<slug>/run` | Die fünf erlaubnisfreien Ziehungsschritte für diesen Pool |
| `/verify?pool=<slug>` | Der öffentliche Seed, die Größenklasse und die Schwellenwerte dieses Pools |

Vor allen steht bei jeder Sprache außer Englisch ein Sprachcode, das Dashboard eines
japanischen Lesers ist also `/ja/app/weth`.

## Ein Keeper je Pool

Sieben Pools heißt sieben Keeper-Prozesse, jeder signiert aus seinem eigenen Konto-Index
derselben Seed-Phrase, denn zwei Prozesse auf einem Konto streiten sich um dieselbe Nonce.
Die Tabelle und die pm2-Datei stehen unter [der Keeper](../operations/keeper.md).
