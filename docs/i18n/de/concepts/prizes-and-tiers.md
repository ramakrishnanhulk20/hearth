# Preise und Stufen

Die Rendite kommt in jeder Periode als ein Batzen herein. Stufen sind der Weg, aus diesem
Batzen eine Mischung aus kleinen häufigen Preisen und einem seltenen großen zu machen.
Diese Seite erklärt die Geldseite: wie die Liquidität aufgeteilt wird, wie ein Preis
bemessen wird, was passiert, wenn eine Stufe mehr auszahlt als geplant, und die drei
Stellen, an denen wir bewusst von PoolTogether V5 abweichen.

Preisgrößen, Stufenliquidität und Preiszahlen waren bei PoolTogether immer öffentlich, und
der Klartextanteil aller drei ist es auch hier. Verschlüsselt bleibt, wer gewonnen hat, und
eine laufende Summe je Stufe, der Übertrag.

## Liquidität und Anteile

Jede Stufe hält einen Topf, ihre Liquidität, in einfachen Zahlen, die jeder lesen kann.
Zwei Dinge fließen hinein:

- **Ernten.** Jede Zuteilung verteilt die geprüfte Ernte nach den Anteilsgewichten auf die
  Stufen. Der ganzzahlige Rest dieser Verteilung, die paar Basiseinheiten, die nicht
  aufgehen, geht an die Hauptpreis-Stufe, statt unter den Tisch zu fallen. Eine Ernte, die
  bei der Zuteilung von Ziehung `p` verbucht wird, wird beim nächsten Abschluss angeboten,
  nicht bei der Ziehung `p` selbst.
- **Abgeglichener Übertrag.** Was eine Stufe in einer früheren Ziehung angeboten hat und
  niemand gewonnen hat, kommt beim Abgleich dieser Stufe zurück, auf Sepolia eine Ziehung
  später.

Jede Stufe hält außerdem einen zweiten Topf, den **Übertrag**, und der ist verschlüsselt.
Er ist die laufende Summe von allem, was die Stufe angeboten und niemand gewonnen hat, und
er wird bei jedem Abschluss zum Angebot der Stufe addiert, obwohl seine Höhe geheim ist.

Beim Abschluss gilt für jede Stufe:

```
prize[t]     = liquidity[t] * UTILISATION / count[t]     // plaintext only
offered[t]   = liquidity[t] + carry[t]                   // plaintext plus encrypted
liquidity[t] = 0                                         // until the tier reconciles
```

Zwei Dinge sind daraus zu lesen. Preisgrößen kommen allein aus dem Klartextanteil, und das
hält sie öffentlich. Der verschlüsselte Übertrag fügt immer nur Kapazität hinzu, eine Stufe
ist also stets mindestens so zahlungsfähig, wie ihre öffentliche Preisgröße vermuten lässt.

`UTILISATION` liegt bei 50 Prozent. Das ist die Auslastungsrate von PoolTogether und die
Verteidigung gegen Überzeichnung: Eine Stufe bietet ihre gesamte Liquidität an, bemisst
jeden Preis aber so, als hätte sie nur die Hälfte. Eine Stufe kann also doppelt so viele
Preise zahlen, wie sie erwartet, bevor sie trockenläuft.

**All das steht beim Abschluss fest, bevor der zufällige Seed dieser Ziehung existiert.**
Der Seed wird später in derselben Transaktion gezogen. Niemand kann einen Seed sehen,
ausrechnen, dass er gewonnen hat, und dann Geld zwischen Stufen verschieben, damit der
Gewinn größer wird.

## Die drei Sepolia-Stufen

Jeder Pool trägt seinen eigenen Stufensatz, denn die Chancen sind ein Bruchteil der eigenen
Periode dieses Pools. Der stündliche USDC-Pool:

| Stufe | Preise je Ziehung (`count`) | Chance | Anteile | Abgleich alle | Wie es sich anfühlt |
| --- | --- | --- | --- | --- | --- |
| Hauptpreis | 1 | 1 zu 24 | 40 | 1 Ziehung | Selten und groß |
| Mittel | 1 | 1 zu 6 | 20 | 1 Ziehung | Ein paar Mal am Tag |
| Häufig | 4 | 1 zu 1 | 40 | 1 Ziehung | Vier Preise in jeder Ziehung |

Die sechs Pools, die alle sechs Stunden ziehen, behalten dieselben Anzahlen, Anteile und
Takte und ändern nur die Chancen: Hauptpreis 1 zu 4, Mittel 1 zu 2, Häufig 1 zu 1. Eine
Sechs-Stunden-Ziehung ist sechsmal seltener, 1 zu 4 landet den Hauptpreis also etwa einmal
am Tag, im selben Rhythmus wie der stündliche Satz. Die mittlere Stufe ist der eine
Unterschied: etwa zweimal am Tag in den Sechs-Stunden-Pools gegen etwa viermal am Tag im
stündlichen. Warum sechs Stunden: [Pools und Token](pools-and-tokens.md).

Die Anteile summieren sich in beiden Sätzen auf 100, die Hauptpreis-Stufe nimmt also 40
Prozent jeder Ernte, die mittlere Stufe 20 Prozent und die häufige Stufe 40 Prozent. Jede
Stufe jedes Pools gleicht bei jeder Ziehung ab, was eine Entscheidung mit Kosten auf beiden
Seiten ist; sie hat weiter unten einen eigenen Abschnitt.

### Was diese Einstellungen ergeben

Schreiben Sie `H` für die Ernte einer Periode. Die nominell erwartete Zahl der Preise einer
Stufe je Ziehung ist `count * odds`. Setzt man das in die Bemessungsformel zurück, pendelt
sich jede Stufe auf einen stabilen Zustand ein:

| Stufe | Liquidität im Gleichgewicht | Preisgröße | Erwartete Auszahlung je Ziehung | Wie oft sie auslöst |
| --- | --- | --- | --- | --- |
| Hauptpreis | 19,2 H | 9,6 H | 0,4 H | Etwa einmal am Tag |
| Mittel | 2,4 H | 1,2 H | 0,2 H | Etwa alle sechs Stunden |
| Häufig | 0,8 H | 0,1 H | 0,4 H (vier Preise) | Jede Ziehung |

Die drei erwarteten Auszahlungen summieren sich auf genau `H`. Die ganze Rendite geht als
Preise hinaus und nichts davon sammelt sich für immer an.

Diese Tabelle gilt für den stündlichen Pool. Ein Sechs-Stunden-Pool sammelt in einer Periode
das Sechsfache ein und zieht sechsmal seltener, und seine kürzeren Chancen verteilen dieses
Einkommen auf dieselbe Zahl von Preisen: Die Hauptpreis-Stufe pendelt sich bei 3,2 H
Liquidität und einem Preis von 1,6 H ein, die mittlere bei 0,8 H und 0,4 H, und die häufige
bleibt unverändert bei 0,1 H je Preis. In echtem Geld gemessen statt in
`H` ist der Hauptpreis eines Sechs-Stunden-Pools genauso groß wie der Hauptpreis eines
stündlichen Pools, der mit derselben Rate verdient, denn eine seltenere Ziehung trägt die
sechsfache Ernte.

Das sind die nominellen Zahlen. Die Ziehung läuft gegen die Größenklasse `M` statt gegen
die genaue Summe `W`, und `M` liegt zwischen `W` und `2W`, eine Stufe zahlt also
tatsächlich zwischen der Hälfte und allen ihren nominellen Preisen je Ziehung. Siehe
[Gewinnerermittlung](winner-selection.md). Was sie nicht zahlt, wandert in den Übertrag und
wird erneut angeboten, es geht also nichts verloren; stattdessen pendeln sich die
Preisgrößen irgendwo zwischen den Zahlen oben und ihrem Doppelten ein, je nachdem, wo die
Summe des Pools innerhalb ihrer Klasse liegt. Ein Pool nahe am oberen Rand einer Klasse
zahlt nahe an der Tabelle. Ein Pool, der gerade eine Zweierpotenz überquert hat, zahlt eine
Weile weniger und größere Preise.

Ein Grund, warum die Tabelle das Live-Deployment beschreibt und kein Ideal: Jede Stufe
gleicht bei jeder Ziehung ab. Was eine Stufe angeboten und niemand gewonnen hat, wird beim
Finalisieren dieser Ziehung veröffentlicht und direkt zurück in ihre öffentliche Liquidität
verbucht, die Liquidität einer Stufe im Gleichgewicht landet also wirklich dort, wo die
Tabelle es sagt, und der Topf, den die App zeigt, ist der Topf, den die Stufe trägt. Bei
langsamerem Takt würde dasselbe Geld weiterhin angeboten und wäre weiterhin zu gewinnen,
aber es säße zwischen den Abgleichen im verschlüsselten Übertrag, und die öffentliche
Liquidität, die den Preis bemisst, wäre nur die seit dem letzten Abgleich dieser Stufe
verbuchte Ernte. Der nächste Abschnitt ist dieser Handel in voller Länge.

Um eine Zahl daran zu heften: Angenommen, die Sepolia-USDC-Quelle tröpfelt 10 USDC je
Periode. Dann liegt der Hauptpreis nahe 96 USDC und fällt etwa einmal am Tag, der mittlere
Preis nahe 12 USDC etwa alle sechs Stunden, und vier Preise von etwa 1 USDC fallen in jeder
Ziehung, wobei jede dieser Zahlen je nach Größenklasse bis auf das Doppelte steigen kann.
Die Live-Tröpfelrate dieses Pools ist
`5,555 base units a second, which is 19.998 USDC a period`, die Rate jedes Pools steht
unter [Pools und Token](pools-and-tokens.md), und die aktuellen Preisgrößen stehen in der
Karte "Der Pool gerade jetzt" auf dem Dashboard dieses Pools unter `/app/<slug>`, gelesen
von der Blockchain.

Das sind Konstruktor-Argumente, gewählt mit der Chancenformel von PoolTogether V5 und je
Pool in `packages/contracts/hearth.config.ts` niedergeschrieben. Ein Mainnet-Deployment mit
einer Tagesperiode würde wieder andere nehmen; siehe
[Deployment](../operations/deploying.md).

## Der Abgleichtakt, und was es kostet, ihn zu erhöhen

Eine Stufe abzugleichen veröffentlicht ihren Übertrag, und der Übertrag ist genau das Geld,
das diese Stufe angeboten und niemand gewonnen hat. Ziehen Sie ihn vom Angebot ab, teilen
Sie durch die Preisgröße, und Sie wissen, wie viele Preise diese Stufe gezahlt hat. Diese
Zahl ist eine echte Preisgabe: Sie ist eine Messung der verschlüsselten Guthaben der Form
"wie viele dieser Sparer hatten ein Gewicht über ihrem eigenen veröffentlichten
Schwellenwert".

`reconcileEvery[t]` ist der Regler an dieser Preisgabe, und er ist ein
Konstruktor-Argument je Stufe. Ihn zu erhöhen verbirgt die Zahl für so viele Ziehungen und
veröffentlicht dann eine Zahl für die ganze Spanne. Setzen Sie die Hauptpreis-Stufe auf 24,
und ihre Zahl wird zu einem Tageswert, und infrage kommen alle, die an irgendeinem Punkt
dieses Tages berechtigt waren, statt der rund vier Prozent des Pools, die in einer einzigen
Ziehung berechtigt sind. Bei einer Stufe mit 1 zu 24 ist dieser Unterschied nicht
kosmetisch: Eine Zahl je Ziehung benennt einen Jackpot-Gewinner aus einer kleinen Menge.

Der Preis dafür ist der Jackpot selbst. Ein Abschluss holt die gesamte öffentliche
Liquidität einer Stufe in die Ziehung und lässt die Stufe bei null zurück, und dieses Geld
kommt erst bei einem Abgleich zurück. Bei einem Takt von 24 ist die öffentliche Liquidität
der Hauptpreis-Stufe also in 23 von 24 Ziehungen nur die seit dem letzten Abgleich
verbuchte Ernte, der veröffentlichte Preis wird aus dem Anteil dieser einen Ziehung
bemessen, und der angesammelte Topf taucht offen nur bei der Abgleichziehung auf. Das Geld
liegt derweil nicht brach, denn der verschlüsselte Übertrag wird bei jedem Abschluss zum
Angebot der Stufe addiert und ist durchgehend zu gewinnen. Es ist aber unsichtbar, und ein
Jackpot, dessen Wachsen niemand sehen kann, ist eigentlich kein Jackpot.

Eine verborgene Preiszahl und ein sichtbarer, wachsender Jackpot lassen sich nicht beide
haben. **Dieses Deployment hat den sichtbaren Jackpot gewählt.** Alle drei Stufen laufen
mit `reconcileEvery = 1`, der Übertrag jeder Stufe wird also beim Finalisieren der Ziehung
veröffentlicht, aus der er stammt, auf der Blockchain gegen das vom Vault veröffentlichte
Handle geprüft und von `reconcile` zurück in die öffentliche Liquidität verbucht. Der Topf
wächst im Offenen, so wie bei PoolTogether, und wie viele Preise jede Stufe gezahlt hat,
wird eine Ziehung später öffentlich, ebenfalls so wie bei PoolTogether. In beiden Fällen
nie, wer gewonnen hat.

Damit ist die obige Zahl ein offengelegter Rest und kein abgemilderter. Die Begründung ist
unverändert und weiter gültig: Eine Zahl je Ziehung auf einer Stufe mit 1 zu 24 ist eine
Messung über die kleine Menge der in dieser Ziehung berechtigten Sparer, und sie summiert
sich gegen ein Guthaben, das sich nie bewegt. In den Sechs-Stunden-Pools ist die Messung
schwächer, deren Hauptpreis-Stufe bei 1 zu 4 liegt, jede Zahl deckt also etwa ein Viertel
des Pools ab statt ein Vierundzwanzigstel, und es gibt vier davon am Tag statt
vierundzwanzig. Es ist unter [was privat bleibt](../security/what-stays-private.md)
beschrieben und in der [Liste der Grenzen](../limitations.md) geführt. Zwei Dinge begrenzen
es weiterhin. Die Zahlen sind grob, denn nichts Feineres als eine ganze Zahl von Preisen
wird je veröffentlicht. Und die Schwellenwerte lassen sich nicht auf ein vermutetes
Guthaben richten, denn der Seed wird im Koprozessor gezogen und erst offengelegt, wenn
seine Periode vorbei ist.

Ein Deployment, dem die langsamere Messung lieber ist als der sichtbare Topf, stellt den
Regler höher und nimmt den Handel in die andere Richtung. Das ist ein Redeployment.

## Überzeichnung: wenn eine Stufe mehr zahlt als geplant

Preise sind unabhängig, eine Stufe, die vier Preise erwartet, schüttet also manchmal sechs
oder neun aus. Jeder Preis ist ein Achtel der Liquidität der häufigen Stufe, sie kann also
acht davon zahlen. Darüber hinaus ist die Stufe leer.

Hearth behandelt das mit einem verschlüsselten Zähler je Stufe und Ziehung. Jede Auszahlung
wird auf den kleineren Wert von dem, was der Sparer gewonnen hat, und dem, was der Stufe
geblieben ist, begrenzt, und der Zähler sinkt um den begrenzten Betrag. Keine Transaktion
weist zurück, und niemandes Rechnung läuft über.

### Was ein später Gewinner erlebt

Die Auswertung läuft die Sparerliste ab einem Startpunkt ab, der aus dem Seed dieser
Ziehung abgeleitet ist. Läuft die Stufe mitten im Durchlauf leer:

- Der gerade ausgewertete Sparer bekommt, was übrig ist, was weniger sein kann als die
  Preise, die seine Schwellenwerte ihm zusprechen.
- Sparer weiter hinten im Durchlauf bekommen aus dieser Stufe in dieser Ziehung nichts.
  Andere Stufen sind nicht betroffen: Jede Stufe hat ihren eigenen Zähler.

Niemand kann sich einen besseren Platz in dieser Schlange kaufen. Die Reihenfolge des
Durchlaufs ist durch den Seed festgelegt, der Aufrufer von `evaluate` wählt, wie viele
Sparer voranzuschreiten sind, und nie welche, und der Startpunkt wandert bei jeder Ziehung,
keine Adresse ist also systematisch die letzte.

Für den betroffenen Sparer ist das sichtbar, nicht stumm. Sein gespeichertes Gewicht und
seine gespeicherte Gutschrift für diese Ziehung sind beide von ihm entschlüsselbar, er kann
also seine Schwellenwerte aus dem öffentlichen Seed nachrechnen und sehen, dass seine
Gutschrift zu klein ist.

### Wie oft das passiert

Bei der häufigen Stufe mit vielen kleinen Sparern liegt die Zahl der ausgeschütteten Preise
nahe an einer Poisson-Verteilung mit Mittelwert 4, und die Stufe kann 8 zahlen. Die Chance,
einen neunten zu brauchen, liegt bei etwa 2 Prozent je Ziehung. Weil die Ziehung gegen die
Größenklasse statt gegen die genaue Summe läuft, liegt die tatsächlich erwartete Zahl
zwischen 2 und 4, die 2 Prozent sind also die Obergrenze und nicht der Normalfall. Bei den
zwei Stufen mit `count = 1` liegt die erwartete Zahl der Preise deutlich unter eins,
während die Kapazität immer noch zwei ist, dort ist die Begrenzung also um Größenordnungen
seltener.

Diese Näherung setzt einen Pool aus vielen kleinen Sparern voraus. In einem Pool mit drei
sehr unterschiedlich großen Sparern ist die Streuung anders, und im kleinen Demo-Pool auf
Sepolia lässt sich leicht eine Ziehung konstruieren, die begrenzt. Das liegt an der Größe
der Demo, es ist kein Fehler.

## Drei bewusste Unterschiede zu PoolTogether V5

Alle drei stehen hier statt versteckt, denn ein Prüfer, der V5 kennt, sucht danach.

### 1. Die Ziehung läuft gegen eine Größenklasse, nicht gegen die genaue Summe

V5 führt seinen Gewinntest gegen die genaue Gesamtmenge der Ziehung aus, was es kann, weil
diese Zahl auf einer transparenten Blockchain öffentlich ist. Die genaue Summe hier zu
veröffentlichen würde einzelne Einzahlungsbeträge verraten, Hearth veröffentlicht deshalb
nur die Zweierpotenz-Größenklasse darüber.

Die Folge ist die oben beschriebene: Eine Stufe zahlt je Ziehung zwischen der Hälfte und
allen ihren nominellen Preisen, und die Preisgrößen pendeln sich entsprechend höher ein. Es
geht kein Geld verloren und die Chancen keines Sparers verzerren sich gegenüber denen eines
anderen, denn jeder Sparer einer Stufe wird mit demselben `W / M` skaliert. Das ist Grenze
12.

### 2. Keine Reservestufe

V5 nimmt von jedem Beitrag einen Anteil in eine Reserve. Die Reserve finanziert den Anreiz,
die Ziehung zuzuteilen, und federt eine überzeichnete Stufe durch Auffüllen ab.

Hearth hat keine Reserve. Die Auslastungsrate von 50 Prozent ist das einzige Polster, was
die Alternative ist, die V5 in seiner eigenen Dokumentation für Deployments nennt, die
`tierLiquidityUtilizationRate` zu diesem Zweck nutzen. Die Folge ist die oben beschriebene
Begrenzung: In der seltenen überzeichneten Ziehung kommen die letzten Gewinner in der
Reihenfolge des Durchlaufs zu kurz, statt aufgefüllt zu werden.

Wir haben uns dafür entschieden, weil eine Reserve einen vom Eigentümer kontrollierten
Auszahlungsweg braucht, um nützlich zu sein, und jede Eigentümermacht in einem vertraulichen
Pool etwas ist, dem ein Sparer vertrauen muss. Der Kompromiss steht in der
[Liste der Grenzen](../limitations.md) als Grenze 4.

### 3. Die Hauptpreis-Chancen werden über eine Periode gemessen

V5 misst die Chancen der Hauptpreis-Stufe über das gesamte Ansparfenster der Stufe, die
Chance auf einen Topf, der ein Jahr lang gewachsen ist, spiegelt also ein Jahr Teilnahme
wider.

Hearth misst die Hauptpreis-Chancen über eine einzige Periode, wie jede andere Stufe. Das
heißt, ein großer Halter, der für eine Periode auftaucht, nimmt einen vollen anteiligen
Schuss auf einen Topf, den andere Leute 24 Perioden lang gefüllt haben. Das ist eine echte
Schieflage und steht als Grenze 5.

Die günstige Korrektur ist bekannt und für eine spätere Fassung notiert: die
Guthaben-Sekunden seit der letzten Hauptpreis-Auszahlung mitführen und die Hauptpreis-Stufe
danach gewichten statt nach dem Gewicht der einzelnen Periode. Sie blieb in Version eins
außen vor, weil sie einen zweiten Akkumulator mit eigener Überlaufanalyse hinzufügt, und
das Einfachere zu liefern, das vollständig bewiesen ist, schlug das Bessere zu liefern, das
es nicht ist.

## Was diese Seite nicht abdeckt

Sie deckt nicht ab, woher die Ernte kommt oder wie sie geprüft wird, das ist
[Renditequelle](yield-source.md). Sie deckt nicht den Test je Sparer ab, der entscheidet,
wer gewinnt, das ist [Gewinnerermittlung](winner-selection.md). Und sie erhebt keinen
Datenschutzanspruch für Preisgrößen: Die sind hier bewusst öffentlich, und was die
veröffentlichten Preiszahlen preisgeben, steht unter
[was privat bleibt](../security/what-stays-private.md).
