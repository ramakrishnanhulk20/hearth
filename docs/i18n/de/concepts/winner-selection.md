# Gewinnerermittlung

Das ist das Herz des Produkts: entscheiden, wer gewonnen hat, über Zahlen, die niemand
lesen kann, und zwar so, dass ein Fremder es trotzdem nachprüfen kann.

**Der Satz, auf den es ankommt: Die Gewinnerermittlung steht mit der Ziehung fest, und die
Auswertung schreibt sie nur auf.** In dem Moment, in dem der Pool den zufälligen Seed und
die Größenklasse der Gesamtsumme prüft, ist das Ergebnis jedes Sparers in jeder Stufe
bereits bestimmt. Die Schwellenwerte sind öffentliche Zahlen, die jeder nachrechnen kann,
und das verschlüsselte Gewicht, gegen das sie verglichen werden, kann sich nicht mehr
ändern. Die Auswertung ist Buchhaltung. Sie lässt sich nicht lenken, nicht überholen und
nicht so überspringen, dass sich ändert, wer gewonnen hat.

## Was mit der Zuteilung einer Ziehung feststeht

| Symbol | Was es ist | Öffentlich? |
| --- | --- | --- |
| `R` | Der zufällige Seed dieser Ziehung | Ja, nach Ende der Periode |
| `M` | Die Größenklasse, in die das Gesamtgewicht des Pools fiel, eine Zweierpotenz | Ja, nach Ende der Periode |
| `prize[t]` | Was ein Preis in Stufe `t` zahlt | Ja, beim Abschluss festgelegt |
| `offered[t]` | Die Liquidität, die Stufe `t` für diese Ziehung gestellt hat | Ja, beim Abschluss festgelegt |
| `count[t]` | Wie viele Preise Stufe `t` je Ziehung anbietet | Ja, beim Deployment festgelegt |
| `odds[t]` | Wie oft Stufe `t` auslöst, als Bruch | Ja, beim Deployment festgelegt |
| `W` | Das gesamte zeitgewichtete Guthaben des Pools für die Periode | **Nein. Wird nie veröffentlicht** |
| `twab` | Das zeitgewichtete Guthaben eines Sparers für die Periode | Nein, verschlüsselt, von diesem Sparer lesbar |

Die letzten beiden Zeilen sind die Geheimnisse. `twab` ist personenbezogen. `W` ist die
Summe aller `twab` und wird zurückgehalten, weil eine genaue Veröffentlichung einem
Beobachter einen Weg gäbe, den Einzahlungsbetrag eines einzelnen Bewegers durch Subtraktion
wiederherzustellen. Woran die Ziehung stattdessen läuft, ist `M`: die kleinste Zweierpotenz
bei oder über `W`. `M` liegt also irgendwo zwischen `W` und `2W`, und das Einzige, was ein
Beobachter von einer Ziehung zur nächsten erfährt, ist, ob der Pool eine Zweierpotenz
überquert hat.

## Die Regel von PoolTogether, und unsere

PoolTogether V5 gibt jedem Sparer `count[t]` unabhängige Chancen in Stufe `t`. Jede Chance
wird mit der Wahrscheinlichkeit `min(1, twab * odds[t] / W)` gewonnen. Die erwartete Zahl
der Preise eines Sparers in einer Stufe ist also sein Anteil am Pool, multipliziert mit den
Chancen der Stufe, multipliziert mit der Zahl der Preise.

Das wörtlich über verschlüsselte Zahlen zu tun hieße, je Sparer und je Preis eine frische
Zufallszahl zu ziehen, und es bräuchte das genaue `W`. Hearth bildet dieselbe Form mit
einer gleichverteilten Zufallszahl je Sparer und Stufe, einer Leiter verschachtelter
Schwellenwerte und `M` anstelle von `W` nach.

Schreiben Sie `z = twab * odds[t] * count[t] / M`. Das ist die erwartete Zahl der Preise,
die dieser Sparer in dieser Stufe gewinnt. Hearth zahlt ihm `floor(z)` oder `ceil(z)`
Preise, gedeckelt bei `count[t]`, und der Durchschnitt über viele Ziehungen ist genau `z`.

Weil der Nenner `M` statt `W` ist, wird die Erwartung jedes Sparers mit `W / M` skaliert,
einer Zahl zwischen einem halb und eins. Zählt man die Sparer zusammen, zahlt eine Stufe
zwischen der Hälfte und allen ihrer nominellen `count * odds` Preise je Ziehung. Dadurch
geht nichts verloren. Was eine Stufe nicht zahlt, bleibt in ihrem verschlüsselten Übertrag
und wird beim nächsten Abschluss erneut angeboten, mit der Zeit geht also weiterhin die
ganze Rendite hinaus; die Preise pendeln sich schlicht höher ein. Siehe
[Preise und Stufen](prizes-and-tiers.md).

## Der Test, Schritt für Schritt

Für einen Sparer `u` in Stufe `t` der Ziehung `p`:

1. Seine Zufallszahl für diese Stufe ableiten. `prn = keccak256(R, p, u, t)`. Weil die
   Adresse des Sparers und der Stufenindex in den Hash eingehen, bekommt jeder Sparer seine
   eigene Zahl und jede Stufe eine andere, alle aus dem einen Seed `R`.
2. Sie auf die Größenklasse reduzieren. `r = prn mod M`, eine ganze Zahl von `0` bis
   `M - 1`. `M` ist eine Zweierpotenz, das ist also ein schlichter Rest eines 256-Bit-Hashes
   durch eine Zweierpotenz, was exakt gleichverteilt ist und keine Verzerrung zu
   korrigieren lässt. Das ist öffentliche Rechnung auf öffentlichen Werten.
3. Die Leiter bauen. Für jeden Preis `k` von `0` bis `count[t] - 1`:
   `threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))`.
   Das sind öffentliche Zahlen. Jeder kann sie für jede Adresse berechnen, und der Vertrag
   stellt dieselbe Rechnung als View bereit, `thresholdOf(drawId, saver, tier, k)`, sodass
   das Prüfpanel der App, die Tests und jeder externe Prüfer eine Implementierung nutzen.
4. Vergleichen. Preis `k` ist gewonnen, wenn das verschlüsselte Gewicht des Sparers größer
   ist als `threshold_k`. Das ist der einzige Schritt, der ein Geheimnis berührt, und er ist
   ein verschlüsselter Vergleich, dessen Ergebnis ein verschlüsseltes Wahr oder Falsch ist,
   das niemand lesen kann.
5. Zahlen. Jeder gewonnene Preis addiert `prize[t]` zur verschlüsselten Auszahlung des
   Sparers für diese Stufe, über eine verschlüsselte Auswahl statt über eine
   Wenn-Anweisung, sodass die Transaktion identisch aussieht, ob er nichts oder alles
   gewonnen hat.
6. Begrenzen. Die Auszahlung der Stufe an diesen Sparer ist der kleinere Wert von dem, was
   er gewonnen hat, und dem, was der Stufe geblieben ist. Diese Subtraktion aktualisiert die
   verschlüsselte Restliquidität der Stufe.
7. Gutschreiben. Der begrenzte Betrag wird den verschlüsselten Gewinnen des Sparers
   hinzugefügt.

Die Schwellenwerte steigen mit `k`, ein Sparer gewinnt also die Preise `0` bis `j-1` für
ein `j` und hört dann auf. Die Bedingung für Preis `k` ist genau
`twab * odds * count > r + k * M`.

### Die eine Klartext-Verzweigung

Ist ein Schwellenwert größer als `2^64 - 1`, kann ihn kein 64-Bit-Gewicht übertreffen, die
Antwort ist also Falsch und der Vergleich wird ganz übersprungen. Das passiert bei einer
Stufe mit geringen Chancen, wenn `M` sehr groß ist. Da Schwellenwerte mit `k` nur steigen,
hält die Schleife der Stufe beim ersten solchen Schwellenwert an, statt den Rest zu prüfen.
Die Verzweigung hängt an einer öffentlichen Zahl. Nichts in Hearth verzweigt je an einem
Geheimnis.

## Durchgerechnetes Beispiel: drei Sparer, eine Stufe

Ein winziger Pool, damit die Zahlen lesbar bleiben. Eine Stufe: die häufige Stufe,
`count = 4`, `odds = 1` (also `oddsNum = 1`, `oddsDen = 1`). Gewichte stehen in
Guthaben-Sekunden des Tokens, den der Pool hält; das Beispiel liest sie als USDC.

| Sparer | Gewicht | Anteil an `W` | `z = Gewicht * 4 / M` |
| --- | --- | --- | --- |
| Ada | 600 | 60 % | 2,34 |
| Ben | 300 | 30 % | 1,17 |
| Cy | 100 | 10 % | 0,39 |
| **Summe `W`** | **1.000** | 100 % | **3,91** |

`W` ist 1.000, die Größenklasse ist also `M = 1.024`, die kleinste Zweierpotenz bei oder
darüber. Niemand außerhalb des Pools sieht die 1.000. Man sieht die 1.024.

Beachten Sie die Summenspalte. Die nominelle Auszahlung der Stufe ist `count * odds = 4`
Preise je Ziehung. Was sie tatsächlich zu zahlen erwartet, ist
`4 * W / M = 4 * 1000 / 1024 = 3,91`. Das ist die Skalierung mit `W / M`, hier ein Abschlag
von 2,3 Prozent, weil 1.000 nahe am oberen Rand seiner Klasse liegt. Ein Pool von 520 läge
nahe am unteren Rand derselben Klasse, und die Stufe würde etwa 2,03 Preise erwarten.

Jetzt findet die Ziehung statt. Das `r` jedes Sparers stammt daher, dass der Seed mit
seiner eigenen Adresse gehasht wird, es ist also für jeden eine andere Zahl, und sie landet
zwischen 0 und 1.023.

**Ada, `r = 271`.** Die Schwellenwerte sind `floor((271 + k * 1024) / 4)`:

| k | Schwellenwert | Adas Gewicht 600 übertrifft ihn? |
| --- | --- | --- |
| 0 | 67 | Ja |
| 1 | 323 | Ja |
| 2 | 579 | Ja |
| 3 | 835 | Nein |

Ada gewinnt 3 Preise. Ihre Erwartung war 2,34, die 3 ist also die obere Seite von `floor`
oder `ceil`.

**Ben, `r = 812`.** Schwellenwerte `floor((812 + k * 1024) / 4)`:

| k | Schwellenwert | Bens Gewicht 300 übertrifft ihn? |
| --- | --- | --- |
| 0 | 203 | Ja |
| 1 | 459 | Nein |

Ben gewinnt 1 Preis, bei einer Erwartung von 1,17.

**Cy, `r = 155`.** Schwellenwerte `floor((155 + k * 1024) / 4)`:

| k | Schwellenwert | Cys Gewicht 100 übertrifft ihn? |
| --- | --- | --- |
| 0 | 38 | Ja |
| 1 | 294 | Nein |

Cy gewinnt 1 Preis. Seine Erwartung war 0,39, das ist also sein guter Tag. Über viele
Ziehungen gewinnt er in etwa 39 Prozent der Fälle einen Preis und sonst nichts.

Fünf Preise wurden ausgeschüttet, wo 3,91 erwartet waren. Das ist in Ordnung: Jeder Preis
ist ein Achtel der Liquidität der Stufe, die Stufe kann also acht zahlen, bevor sie
trockenläuft. Siehe [Überzeichnung](prizes-and-tiers.md).

Beachten Sie nun, was ein Beobachter am Ende von alledem sieht. Er kann alle drei Tabellen
selbst berechnen, denn `R`, `M`, die Schwellenwerte und die Adressen sind öffentlich. Was
er nicht kann, ist die rechte Spalte ausfüllen, denn die Gewichte sind verschlüsselt, und
er kann auch die 1.000 nicht wiederherstellen, denn veröffentlicht wurde nur die 1.024.
Nach dem Abgleich der Stufe, eine Ziehung später, erfährt er, wie viele Preise sie gezahlt
hat. An wen, erfährt er nie.

## Warum es nichts bringt, die Wallet aufzuteilen

Das ist die Eigenschaft, die eine schlecht gebaute Fassung verliert.

Die erwarteten Preise eines Sparers in einer Stufe sind `z = twab * odds * count / M`, was
in seinem Gewicht linear ist, und `M` hängt nicht davon ab, wie sich das Gewicht des Pools
auf Adressen verteilt. Teilen Sie ein Gewicht von 600 auf zwei Wallets zu je 300 auf und
jede bekommt `z = 1,17`, zusammen 2,34. Genau dasselbe. Teilen Sie es auf sechs Wallets zu
je 100 auf und jede bekommt 0,39, zusammen 2,34. Wieder genau dasselbe. Es gibt keine
Schwelle auszunutzen und keine Rundung abzugrasen, nur mehr Gas zu zahlen.

Eine frühere Fassung dieses Designs faltete die Zahl der Preise in eine einzige breitere
Gewinnzone, sodass jeder Sparer je Stufe höchstens einen Preis gewinnen konnte. Das
deckelte große Halter unter ihrem fairen Anteil und belohnte das Aufteilen. Eine
Designprüfung fand es, und die verschachtelte Leiter hat es ersetzt.

## Was es kostet

Je Sparer und Ziehung ist die verschlüsselte Arbeit: eine Multiplikation und eine Addition
für das Gewicht, dann je Stufe ein Vergleich und eine Auswahl je Preis, plus eine
Begrenzung. Mit den drei Sepolia-Stufen sind das 6 Vergleiche, 6 Auswahlen und rund ein
Dutzend Additionen, Subtraktionen und Minima.

Zama gibt das Budget je Transaktion auf Sepolia mit insgesamt 20.000.000 Recheneinheiten
an, davon 5.000.000 in sequenzieller Tiefe, und beziffert eine 64-Bit-Addition mit 162.000,
einen Vergleich mit etwa 118.000, eine Auswahl mit 55.000 und eine Multiplikation mit einer
öffentlichen Zahl mit 365.000. Diese Zahlen bringen einen Sparer in den unteren
Millionenbereich an Recheneinheiten, weshalb die Auswertung in Batches von `4` Sparern je
Transaktion läuft. Der gemessene Wert ist
`3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)` je Sparer und das gemessene Gas ist `708,836 (the marginal cost of one more saver in a batch; a batch of one costs 1,291,192)`.

## Was diese Seite nicht abdeckt

Sie deckt nicht ab, woher `R` kommt oder wie man es prüft, das ist
[Zufall und Nachprüfbarkeit](../security/randomness-and-verification.md). Sie deckt nicht
ab, wie `prize[t]` bemessen wird oder was passiert, wenn eine Stufe mitten in der Ziehung
leerläuft, das ist [Preise und Stufen](prizes-and-tiers.md). Und sie erhebt keinen Anspruch
darauf, zu verbergen, wer teilgenommen hat: die Sparerliste, die Auswertungs-Batches und
die Preiszahlen je Stufe sind alle öffentlich. Siehe
[was privat bleibt](../security/what-stays-private.md).
