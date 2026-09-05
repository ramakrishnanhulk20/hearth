# Zufall und Nachprüfbarkeit

Eine Ziehung ist nur etwas wert, wenn ein Fremder sie prüfen kann. Diese Seite zeigt, wie.

## Woher der Seed kommt

Ein Aufruf, innerhalb der Transaktion, die eine Ziehung abschließt:

```solidity
euint64 seed = FHE.randEuint64();
```

Das läuft im Koprozessor von Zama. Die Zahl wird von einem kryptografisch sicheren Generator
unter dem FHE-Schlüssel des Netzwerks erzeugt, und was beim Vertrag ankommt, ist ein
Chiffrat-Handle, keine Zahl. Niemand hat den Wert in diesem Moment gesehen: nicht der
Aufrufer, nicht wir, nicht der Miner.

Zwei Eigenschaften von Zamas Generator zählen hier, und beide stehen in Zamas eigener
Dokumentation:

- **Er muss innerhalb einer Transaktion laufen.** Einen Zufallswert zu erzeugen verändert
  den Zustand des Generators auf der Blockchain, es geht also nicht über `eth_call`, den
  reinen Lesezugriff, der einen Aufruf simuliert. Niemand kann eine Ziehung außerhalb der
  Blockchain vorab ansehen, um zu prüfen, ob er gewinnen würde.
- **Er ist kryptografisch sicher und bleibt verschlüsselt**, bis ihn etwas ausdrücklich
  entschlüsselbar macht.

## Warum ihn niemand neu würfeln oder den Gewinn nachträglich vergrößern kann

Vier Dinge, zusammen.

1. **Der Abschluss gelingt einmal.** Der Zustandsautomat der Ziehung erlaubt
   `closeDraw(p)` genau einmal je Ziehung. Es gibt keinen zweiten Versuch, sich eine bessere
   Zahl zu kaufen.
2. **Der Wert ist unbekannt, wenn er gezogen wird.** Da der Seed bei seiner Entstehung ein
   Chiffrat ist, erfährt derjenige, der die Abschlusstransaktion sendet, nichts dadurch,
   dass er sie gesendet hat. Es lohnt sich nicht, um die Rolle des Aufrufers zu wetteifern.
3. **Der Veröffentlichungsschritt ist eine Einbahnstraße.** Nach dem Abschluss wird der
   Seed als öffentlich entschlüsselbar markiert. Dieses Kennzeichen ist auf Zamas
   Zugriffsliste dauerhaft und unwiderruflich, die Zahl, die die Welt sieht, ist also die
   Zahl, auf die sich der Vertrag festgelegt hat, und keine nachträglich gewählte.
4. **Die Preise stehen fest, bevor der Seed existiert.** Die Preisgröße jeder Stufe und die
   Liquidität, die sie anbietet, werden am Anfang derselben Abschlusstransaktion berechnet,
   vor dem Aufruf von `randEuint64`. In einem früheren Entwurf wurden sie später gesetzt,
   bei der Zuteilung, was ein Zeitfenster ließ, in dem jemand den Seed lesen, ausrechnen
   konnte, dass er gewonnen hatte, und dann Liquidität zwischen Stufen verschieben konnte,
   damit dieser Gewinn mehr wert war. Dieses Fenster gibt es nicht mehr.

Vergleichen Sie das mit den Alternativen. Eine Ziehung, die von einem Block-Hash gespeist
wird, lässt sich von einem Validator neu würfeln, dem das Ergebnis nicht gefällt. Eine
Ziehung, die von einer Zahl außerhalb der Blockchain gespeist wird, lässt sich schlicht
aussuchen. Beides ist hier unmöglich, und genau deshalb wird der Zufall auf der Blockchain
unter Verschlüsselung erzeugt und nie von einem Generator außerhalb.

## Was öffentlich wird, und wann

| Wert | Wann veröffentlicht | Warum er öffentlich sein muss |
| --- | --- | --- |
| Der Seed `R` | Beim Abschluss, lesbar nachdem der Relayer ihn entschlüsselt hat | Ohne ihn kann niemand einen Schwellenwert nachrechnen |
| Die Skalenzahl, aus der die Größenklasse `M` folgt | Beim Abschluss | Schwellenwerte sind relativ zur Größe des Pools |
| Ob die Periode nicht leer war | Beim Abschluss | Unterscheidet eine leere Ziehung von einer echten |
| Die Ernte der Ziehung | Beim Abschluss | Es ist das Geld, das spätere Preise finanziert |
| Preisgröße und angebotene Klartext-Liquidität jeder Stufe | Beim Abschluss | Nötig, um zu prüfen, was ein Gewinn zahlt |
| Der Übertrag jeder Stufe | Beim Finalisieren jeder Ziehung, da jede Stufe bei jeder Ziehung abgleicht | Nötig, um zu prüfen, wie viele Preise die Stufe gezahlt hat |
| Der Zähler für Nichtfinanziertes | Beim Finalisieren | Beweist, dass der Pool jede vom Vault geschriebene Gutschrift finanziert hat |

Zwei Dinge stehen bewusst **nicht** auf dieser Liste. Das genaue gesamte zeitgewichtete
Guthaben des Pools wird nie veröffentlicht, denn das erlaubte es einem Beobachter, den
Einzahlungsbetrag eines einzelnen Bewegers exakt wiederherzustellen; veröffentlicht wird
stattdessen die Größenklasse darüber. Und kein Wert je Sparer wird je als öffentlich
entschlüsselbar markiert.

Alles auf der Liste kommt an, nachdem die Periode, über die es entscheidet, bereits vorbei
ist. `R` zu veröffentlichen kann niemandem helfen, ein Gewicht zu ändern, denn die Gewichte
für Periode `p` sind in dem Moment eingefroren, in dem Periode `p` endet, und das ist, bevor
die Ziehung überhaupt abgeschlossen werden kann.

Jede dieser Zahlen erreicht den Vertrag mit einer Signatur von Zamas
Schlüsselverwaltungsdienst, geprüft auf der Blockchain durch `FHE.checkSignatures`. Der
Beweis ist in fester Reihenfolge an die Handles gebunden: `[seed, scaleCount, nonEmpty, harvested]`
bei der Zuteilung, und ein Übertrags-Handle je Abgleich. Nichts lässt sich zwischen
Positionen vertauschen oder gegen eine andere Ziehung wiedereinspielen. Der Zustandsautomat
der Ziehung ist der Wiedereinspielschutz: Jeder Schritt gelingt einmal je Ziehung, und der
Abgleich einmal je Stufe.

## Die Größenklasse, und wie der Vault sie verfolgt

Das gesamte zeitgewichtete Guthaben des Pools für eine Periode, `W`, bleibt verschlüsselt.
Die Zahl, gegen die die Ziehung läuft, ist `M = 2^m`, die kleinste Zweierpotenz bei oder
über `W`.

Der Vault verfolgt `m` von Ziehung zu Ziehung, statt es jedes Mal neu zu berechnen. Bei
jedem Abschluss vergleicht er `W` unter Verschlüsselung mit den fünf Zweierpotenzen rund um
das `m` der letzten Ziehung, addiert die fünf Ergebnisse zu einer kleinen verschlüsselten
Zahl und markiert diese Zahl als öffentlich entschlüsselbar. Der Pool liest die geprüfte
Zahl und ermittelt das neue `m`, das sich je Ziehung um höchstens drei Stufen bewegen kann.
Ein separater verschlüsselter Vergleich gegen 1 liefert das Nichtleer-Kennzeichen.

Der öffentliche Eintrag je Ziehung ist also eine kleine ganze Zahl, und sie ändert sich nur,
wenn der Pool eine Zweierpotenz überquert. `scaleBits()` auf dem Pool liest das aktuelle
`m`; das Deployment setzt es mit `initialScaleBits` an, der erwarteten Bitlänge der Summe
der ersten Periode, und der Verfolger korrigiert jeden Fehler um bis zu drei Bit je Ziehung.

## Wie jeder einen Schwellenwert nachrechnet

Alles unten nutzt nur öffentliche Daten. Keine Wallet, keine Signatur, keine Erlaubnis.

Für Ziehung `p`, Sparer-Adresse `u`, Stufe `t` mit `count[t]` Preisen und Chancen
`oddsNum[t] / oddsDen[t]`:

```
prn         = keccak256(abi.encode(R, p, u, t))
r           = prn mod M                                        // 0 <= r < M
threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))
```

für jedes `k` von `0` bis `count[t] - 1`. Dieser Sparer hat Preis `k` genau dann gewonnen,
wenn sein zeitgewichtetes Gewicht für Periode `p` strikt größer war als `threshold_k`.

Sie müssen das nicht nachimplementieren. Der Vault stellt
`thresholdOf(drawId, saver, tier, k)` als reinen View über dieselbe Rechnung bereit, die die
Auswertung nutzt, sodass das Prüfpanel der App, die Testsuite und jeder mit einem
Block-Explorer dieselbe Implementierung lesen. Es außerhalb der Blockchain
nachzuimplementieren sind vier Zeilen Großzahlarithmetik, falls Sie den Vertrag lieber gegen
Ihren eigenen Code prüfen.

Ein durchgerechnetes Beispiel mit kleinen Zahlen steht unter
[Gewinnerermittlung](../concepts/winner-selection.md). Ein ausgefülltes Beispiel aus einer
echten Sepolia-Ziehung folgt hier, aus dem `usdc`-Pool, dessen Preispool
`0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` ist. Jeder Pool veröffentlicht dieselben Felder
für seine eigenen Ziehungen:

| Feld | Wert |
| --- | --- |
| Ziehung | `2, the period from 23:00 to 00:00 UTC on 2 September 2026` |
| Seed `R` | `5625525180683981523` |
| Größenklasse `M` | `2^43, which is 8,796,093,022,208 balance-seconds` |
| Ernte | `19.531380 USDC` |
| Preisgrößen der Stufen | `3.559644 / 1.779822 / 0.889911 USDC, grand / mid / frequent` |
| Gezahlte Preise je Stufe | `0 / 0 / 5, against a funded capacity of 2 / 2 / 8` |

Von der Blockchain gelesen: Der Seed und die Größenklasse stammen aus dem
`DrawAwarded`-Ereignis des Pools, die Preisgrößen und die angebotene Liquidität aus
`drawParams(2)`, und die gezahlten Preise aus den drei `TierReconciled`-Ereignissen dieser
Ziehung, denn was eine Stufe angeboten und nicht gezahlt hat, ist genau der Übertrag, den
sie veröffentlicht hat. Die Hauptpreis-Stufe und die mittlere Stufe zahlten in dieser
Ziehung nichts und gaben ihr ganzes Angebot zurück, was eine Stufe mit 1 zu 24 und eine mit
1 zu 6 die meiste Zeit tun.

Das Prüfpanel der App führt diese Rechnung im Browser für jede Adresse aus, die Sie
eintippen, unter `/verify?pool=<slug>` für den gewünschten Pool. Es hat keinen
privilegierten Zugang; es sind dieselben öffentlichen Eingaben und dieselbe Formel.

## Warum der Rest unverzerrt ist

Eine große Zufallszahl mit einem schlichten Rest in einen Bereich zu bringen ist
üblicherweise verzerrt. Ist `2^256` kein exaktes Vielfaches des Bereichs, kommen die
niedrigen Reste etwas häufiger vor, und diese Verzerrung trifft die Sparer ungleich.
PoolTogether V5 löst das mit Verwerfungsstichproben, und ein früherer Entwurf von Hearth tat
es auch.

Hearth braucht das nicht mehr. `M` ist von Bauart her eine Zweierpotenz, und `2^256` ist ein
exaktes Vielfaches jeder Zweierpotenz bis `2^256`. `prn mod M` sind also schlicht die
niedrigen `m` Bits eines 256-Bit-Hashes, und jeder Wert von `0` bis `M - 1` stammt aus genau
gleich vielen Eingaben. **Die Verzerrung ist null, nicht klein**, ohne Schleife, ohne
Verwerfung und ohne etwas, das ein Prüfer sorgfältig nachbilden müsste.

Das ist ein Nebeneffekt davon, die Größenklasse statt der genauen Summe zu veröffentlichen,
und es ist erwähnenswert, weil es ein Stück Code entfernt, das sonst jeder, der die Ziehung
prüft, exakt nachbauen müsste.

## Adressen abzugrasen funktioniert nicht

Ist `R` erst öffentlich, könnte jemand Adressen erzeugen, bis er eine mit niedrigem
Schwellenwert findet. Es wäre nutzlos. Schwellenwerte werden gegen ein Gewicht für Periode
`p` verglichen, und eine brandneue Adresse hat keine Beobachtungen bei oder vor Periode `p`,
ihr Gewicht ist also null. Null übertrifft keinen Schwellenwert. Um in Periode `p` Gewicht
zu haben, mussten Sie während Periode `p` ein Guthaben halten, und die war vorbei, bevor `R`
existierte.

Für eine künftige Ziehung abzugrasen scheitert am anderen Grund: Deren Seed ist noch nicht
erzeugt und er ist unvorhersagbar.

## Was die Nachprüfung beweist, und was nicht

Dabei genau zu sein, ist der Sinn dieser Seite.

**Sie beweist:**

- Der Seed wurde auf der Blockchain erzeugt, innerhalb einer Transaktion, unter dem
  Netzwerkschlüssel, und genau einmal veröffentlicht.
- Die Preisgrößen und die angebotene Liquidität standen fest, bevor dieser Seed existierte.
- Die auf jeden Sparer angewandte Regel ist öffentlich, einheitlich und von jedem
  nachrechenbar.
- Die Preisgrößen folgen aus der Stufenliquidität und den Stufenparametern durch öffentliche
  Rechnung.
- Die Zahl der von jeder Stufe gezahlten Preise passt zu dem, was die Stufe angeboten hat,
  minus dem, was in ihrem Übertrag zurückkam.
- Der Pool hat jede vom Vault geschriebene Gutschrift finanziert, denn der Zähler für
  Nichtfinanziertes wird veröffentlicht und ist null.

**Sie beweist nicht:**

- Dass der Generator des Koprozessors gleichverteilt ist. Das ist Zamas Maschine, und ihr
  wird vertraut, sie wird hier nicht nachgeprüft.
- Dass der Schlüsselverwaltungsdienst den wahren Klartext des Seed-Handles signiert hat. Der
  Vertrag prüft die Signatur, nicht die Bedeutung. Ein unehrliches Quorum könnte einen Wert
  seiner Wahl signieren. Jede Anwendung auf diesem Protokoll teilt diese Annahme; es ist
  Angreifer 8 im [Bedrohungsmodell](threat-model.md).
- Dass die veröffentlichte Größenklasse wirklich die Größenklasse der Summe aller
  Sparergewichte ist. Ein Außenstehender kann verschlüsselte Gewichte nicht addieren und
  sieht die Summe jetzt auch nicht mehr. Was er stattdessen hat, ist, dass derselbe
  öffentliche, unveränderliche Code die Vergleiche und das Gewicht jedes Sparers aus
  denselben Beobachtungen berechnet hat, und dass die Erhaltungsinvarianten gelten: gezahlt
  gleich gutgeschrieben, und niemand hebt mehr ab als Einlage plus Gewinne.
- Irgendetwas darüber, wer gewonnen hat. Das ist der ganze Sinn, und deshalb würde mehr zu
  veröffentlichen die Nachprüfung stärker und das Produkt schlechter machen. Die genaue
  Summe zu veröffentlichen ist das konkrete Beispiel: Es machte die Größe des Pools prüfbar,
  und es machte die Einzahlung eines einzelnen Bewegers bis auf die Basiseinheit
  wiederherstellbar.

## Was ein Sparer prüfen kann und sonst niemand

Ein Sparer kommt einen Schritt weiter als ein Außenstehender, denn er kann sein eigenes
Gewicht und seine eigene Gutschrift für eine Ziehung entschlüsseln.

1. Decken Sie Ihr Gewicht für Ziehung `p` auf.
2. Rechnen Sie Ihre eigenen Schwellenwerte aus dem öffentlichen `R` und `M` nach, oder lesen
   Sie sie aus `thresholdOf`.
3. Zählen Sie, wie viele Sie übertroffen haben, und multiplizieren Sie mit der Preisgröße
   der Stufe.
4. Decken Sie Ihre Gutschrift für Ziehung `p` auf und prüfen Sie, ob sie passt.

Passt sie nicht, ist entweder eine Stufe leergelaufen, bevor der Durchlauf Sie erreichte,
was die dokumentierte Begrenzung ist, oder etwas stimmt nicht, und Sie haben die Zahlen, um
es zu belegen. Die App macht alle vier Schritte für Sie und zeigt die Rechnung.
