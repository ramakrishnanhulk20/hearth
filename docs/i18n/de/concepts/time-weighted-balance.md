# Zeitgewichtetes Guthaben

Ihre Chancen in einer Ziehung beruhen nicht darauf, was Sie halten, wenn die Ziehung
stattfindet. Sie beruhen auf Ihrem Durchschnittsguthaben über die ganze Periode. Diese
Seite erklärt, warum, was das einen späten Einzahler kostet, und warum der Vault nur drei
Momente je Sparer erinnern muss.

## Warum der Durchschnitt und nicht der Schlusswert

Nehmen wir zuerst das einfache Design: Jeder wird nach seinem Guthaben in dem Augenblick
gewichtet, in dem die Ziehung stattfindet. Das ist leicht zu bauen, und es ist kaputt.

Ein Angreifer zahlt einen großen Betrag ein, wartet die Ziehung ab, gewinnt und hebt ab.
Sein Geld war einen Block lang im Pool. Er hat für niemanden Rendite erwirtschaftet, er
hat kein Risiko getragen, und er hat den Preis genommen, den die geduldigen Sparer
finanziert haben. Und bei der nächsten Ziehung macht er es wieder.

Wir haben das am 2. September 2026 gegen unser eigenes früheres Design ausgeführt. In einem
Pool, in dem ein ehrlicher Sparer 100 USDC hielt, gewann ein Angreifer, der 9.000 USDC um
jede Ziehung herum hinein- und herausschleuste, 19 von 20 Ziehungen und leerte eine
Preisreserve von 5.000 USDC. Das Kapital des Angreifers war nie in Gefahr, denn ein
verlustfreier Pool gibt es per Definition zurück. Der ganze Zyklus passte sogar in eine
einzige Transaktion: einzahlen, Ziehung öffnen, scannen, abheben, Gas 2.189.992.

Die Lösung ist die, die PoolTogether nutzt. Ihre eigene Dokumentation formuliert es so: Die
Fähigkeit, in der Zeit zurückzublicken, zählt, "damit Nutzer frei in einen Preispool ein-
und auszahlen können, während ihr Liquiditätsbeitrag perfekt gemessen wird." Messen Sie den
Beitrag, nicht die Momentaufnahme.

## Was eine späte Einzahlung wert ist

Eine Periode dauert 3.600 Sekunden im USDC-Pool und 21.600 in den anderen sechs. Das
Gewicht ist das Guthaben mal die Sekunden, die es gehalten wurde, gemessen also in
Guthaben-Sekunden des jeweiligen Tokens. Das Beispiel unten ist der stündliche USDC-Pool.

| Sparer | Was er getan hat | Gewicht für die Periode |
| --- | --- | --- |
| Ada | Hielt 100 USDC über alle 3.600 Sekunden | 100 x 3600 = 360.000 |
| Ben | Zahlte 1.000 USDC ein, 360 Sekunden vor Schluss | 1.000 x 360 = 360.000 |
| Cy | Hielt 1.000 USDC über die ganze Periode | 1.000 x 3600 = 3.600.000 |

Ben hat das Zehnfache von Adas Geld eingesetzt und genau dieselben Chancen gekauft, weil er
ein Zehntel der Zeit dabei war. Cy, der genau das getan hat, wofür das Produkt da ist, hat
zehnmal so hohe Chancen wie jeder von beiden.

Der Spiegelfall gilt auch. Heben Sie in dem Augenblick ab, in dem eine Ziehung abschließt,
behalten Sie das Gewicht, das Sie für die beendete Periode bereits verdient haben, und Sie
tragen fast nichts in die nächste hinüber. Chancen lassen sich nicht mieten.

Nichts davon hält jemanden auf, der tatsächlich ein großes Guthaben über eine volle Periode
hält und deshalb oft gewinnt. Das ist kein Angriff. Das ist das Produkt bei der Arbeit:
Sein Geld war die ganze Zeit im Pool und hat die Rendite erwirtschaftet, die alle Preise
zahlt.

## Wie sich der Vault erinnert

Der Vault speichert drei Momentaufnahmen je Sparer, Beobachtungen genannt. Jede hält drei
Dinge: eine laufende Summe von Guthaben-Sekunden, das Guthaben direkt nach dieser Änderung,
und den Zeitstempel. Die drei Plätze heißen `current`, `previous` und `older`.

Die laufende Summe wird zu Beginn jeder Periode zurückgesetzt. Dieses Zurücksetzen hält die
Zahl klein: Innerhalb einer Periode kann sie nie größer werden als das Guthaben mal die
Periodenlänge.

Wenn sich Ihr Guthaben ändert, passiert eines von drei Dingen:

- **Ihre allererste Änderung.** Der Platz `current` wird mit einer laufenden Summe von null
  und Ihrem neuen Guthaben angelegt.
- **Eine Änderung in derselben Periode wie `current`.** Der Vault addiert die
  Guthaben-Sekunden, die Sie seit der letzten Änderung verdient haben, und überschreibt
  `current` an Ort und Stelle. Kein neuer Platz wird belegt.
- **Eine Änderung in einer späteren Periode als `current`.** Die drei Plätze rücken nach:
  `older` übernimmt das alte `previous`, `previous` übernimmt das alte `current`, und ein
  frisches `current` wird geschrieben, das die Guthaben-Sekunden vom Beginn dieser Periode
  bis jetzt trägt.

Ihr Gewicht für Periode `p` zu lesen nutzt die neueste Beobachtung bei oder vor dieser
Periode:

- Liegt sie innerhalb von Periode `p`, ist Ihr Gewicht die laufende Summe, die sie trägt,
  plus Ihr Guthaben mal die Sekunden von diesem Moment bis zum Ende der Periode.
- Liegt sie vor Periode `p`, haben Sie Ihr Guthaben während der Periode gar nicht angerührt,
  Ihr Gewicht ist also schlicht dieses Guthaben mal die volle Periodenlänge.
- Haben Sie keine Beobachtung bei oder vor Periode `p`, waren Sie noch kein Sparer, und Ihr
  Gewicht ist null. Dieser Fall wird aus öffentlichen Zeitstempeln ganz ohne verschlüsselte
  Rechnung entschieden.

Jeder verschlüsselte Schritt hier ist eine Multiplikation mit einer öffentlichen Zahl und
eine Addition. Das ist es, was die Auswertung günstig genug hält, um sie zu bündeln.

Eine Einzelheit, die für das Zählargument unten zählt. Jeder Ausgang schreibt eine
Beobachtung, ob er nun Einlage bewegt hat oder nicht, denn der Vault kann nicht sehen, aus
welchem Ihrer beiden Guthaben die Abhebung kam. Das ist harmlos: Ein Platz rückt nur nach,
wenn eine neue Periode begonnen hat, eine reine Abhebung von Gewinnen verbraucht also
keinen Platz über den hinaus, den Ihre Periode ohnehin belegt hätte.

## Warum drei Beobachtungen genügen

Das ist die Frage, die ein Prüfer stellen sollte, und die Antwort ist ein Zählargument.

Ein neuer Platz wird nur belegt, wenn eine Guthabenänderung in einer späteren Periode
landet als der, in der `current` sitzt. Höchstens ein Nachrücken passiert je Periode, ganz
gleich wie oft Sie innerhalb davon ein- oder auszahlen.

Ziehung `p` kann nur während der Perioden `p+1` und `p+2` abgeschlossen, zugeteilt und
ausgewertet werden. Bis irgendjemand Ihr Gewicht für Periode `p` liest, haben also
höchstens zwei Perioden nach `p` begonnen, und damit sind höchstens zwei neue Beobachtungen
über der obendrauf gelandet, die bei oder vor Periode `p` die neueste war. Drei Plätze
halten das: die eine, die wir brauchen, plus die höchstens zwei, die danach kamen.

Deshalb ist das Fenster zwei Perioden lang und nicht länger. Verbreitern Sie das Fenster
und Sie brauchen einen vierten Platz; halten Sie es bei einer Periode und eine einzige
verzögerte Antwort des Relayers kann eine Ziehung kosten, was eine kurze Periode
schmerzhaft wahrscheinlich machte. Der Abschluss hat eine eigene Frist, eine halbe Periode
vor dem Ende des Fensters, sodass dieselben drei Plätze immer den Rundlauf abdecken, der
auf einen Abschluss folgt.

Der Vault führt dieselben drei Beobachtungen für das Gesamtguthaben des Pools, das
Gesamtgewicht einer Periode wird also nach derselben Regel berechnet und ist über dasselbe
Fenster gültig. Diese Summe wird nie veröffentlicht. Veröffentlicht wird die
Zweierpotenz-Größenklasse darüber, und der Vault ermittelt diese Klasse, indem er dieselbe
aufgelaufene Zahl unter Verschlüsselung mit fünf festen Zweierpotenzen vergleicht. Siehe
[was privat bleibt](../security/what-stays-private.md).

## Die zwei Größengrenzen

Verschlüsselte Werte sind hier vorzeichenlose 64-Bit-Zahlen, die Rechnung muss also in
diesem Bereich bleiben. Eine verschlüsselte Zahl zum Überlauf zu bringen ist schlimmer als
bei einer einfachen, denn nichts weist zurück und niemand sieht es passieren.

**Je Sparer.** Der Vault lehnt jede Einzahlung ab, deren Betrag oder deren resultierende
Einlage über `maxPrincipal = (2^64 - 1) / L` läge. Bei einer Periode von einer Stunde sind
das etwa 5 Milliarden Token, bei sechs Stunden etwa 854 Millionen und bei einer
Tagesperiode etwa 213 Millionen. Da Ihre laufende Summe
nicht größer werden kann als Ihr Guthaben mal die Periodenlänge und Ihr Guthaben diese
Obergrenze nicht überschreiten kann, kann Ihre laufende Summe 64 Bit nicht überschreiten.
Die Ablehnung kommt als verschlüsseltes Falsch zurück und der Token erstattet Ihnen den
Betrag in derselben Transaktion, an die Obergrenze zu stoßen verrät also Ihr Guthaben
nicht.

Die Prüfung begrenzt den eingehenden Betrag ebenso wie das Ergebnis, und diese zweite
Grenze ist keine Zierde. Verschlüsselte Addition läuft bei 64 Bit um, ohne zurückzuweisen,
eine Einzahlung von `2^64` minus Ihrer Einlage ergäbe also eine Summe von null, und eine
Prüfung, die nur auf die Summe schaut, hätte sie durchgewunken. Sind sowohl der Betrag als
auch die bestehende Einlage unter der Obergrenze, kann die Summe bei keiner Periodenlänge,
die der Konstruktor erlaubt, `2^64` erreichen. Der Umlauf ist also unerreichbar und nicht
bloß unwahrscheinlich.

**Für die Summe des Pools.** Der laufende Akkumulator der Summe ist 128 Bit breit statt 64,
die Summe kann also bei keiner Menge überlaufen, die der Wrapper prägen kann.

Eine frühere Fassung dieses Designs behauptete, ein 64-Bit-Akkumulator könne nicht
überlaufen. Das war falsch, eine Designprüfung hat es gefunden, und die Obergrenze plus die
128-Bit-Summe ist die Korrektur.

## Was diese Seite nicht abdeckt

Sie deckt nicht ab, was passiert, sobald Ihr Gewicht bekannt ist. Das ist der
[Gewinntest](winner-selection.md). Sie behauptet auch nicht, dass Zeitgewichtung ein
Datenschutzmerkmal wäre: Ihr Gewicht ist verschlüsselt, aber die Größenklasse, in die die
Summe des Pools fällt, wird bei jeder Ziehung veröffentlicht, und bei sehr wenigen Sparern
nagelt diese Klasse ein Gewicht auf den Faktor zwei genau fest. Siehe
[was privat bleibt](../security/what-stays-private.md).
