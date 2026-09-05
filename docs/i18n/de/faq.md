# FAQ

## 1. In welchem Token kann ich sparen?

In sieben: USDC, USDT, WETH, BRON, ZAMA, tGBP und XAUt, alle davon Zamas eigene vertrauliche
Token auf Sepolia. Jeder ist ein eigener Pool mit eigenen Verträgen, eigenen Sparern und
eigenem Preisgeld, und der Pool, in dem Sie sind, steht ganz vorn in der URL nach `/app`. Die
Auswahl zeigt außerdem Zamas offiziellen Confidential tGBP, ausgegraut: Sein öffentlicher
Token kann nur vom Herausgeber geprägt werden, niemand kann ihn also wrappen und darauf kann
kein Pool existieren. Alles andere auf dieser Seite gilt für jeden Pool für sich.
Einzelheiten unter [Pools und Token](concepts/pools-and-tokens.md).

## 2. Wo ist der Einlöse-Button?

Unter "Meine Ziehungen" in der App, auf der Karte dieser Ziehung, unter "Ihr Ergebnis",
sobald Sie es mit dem Auge geöffnet haben. Er erscheint nur, wenn diese Ziehung Ihnen etwas
gutgeschrieben hat und der Vault dieser Wallet noch Geld schuldet: dasselbe Auge öffnet die
Gutschrift dieser Ziehung und den laufenden Stand der nicht eingelösten Gewinne des Vaults
zusammen, und der Button bietet den kleineren der beiden an. Diese zweite Zahl ist es, die ihn
ehrlich macht. Die Gutschrift einer Ziehung ändert sich nie mehr, sobald sie geschrieben ist,
ein Button, der allein an der Gutschrift hängt, würde nach einem Neuladen also denselben Preis
noch einmal anbieten, und die Blockchain würde ihn aus Ihrer eigenen Einlage zahlen.
Unter der Haube ist er bewusst keine eigene Transaktion: Preise werden
Ihrem verschlüsselten Gewinnguthaben bei der Auswertung gutgeschrieben, und der
Einlöse-Button, der den Betrag trägt, sendet eine gewöhnliche Abhebung dafür, die auf der
Blockchain wie jede andere Abhebung aussieht. In den meisten Preisprotokollen haben nur
Gewinner einen Grund, eine Einlöse-Transaktion zu senden, sodass die Transaktionsliste sie
stillschweigend benennt; hier gibt es keine solche Transaktion, auf die man achten könnte.
Dasselbe Geld kommt auch aus dem Reiter "Aus dem Vault" beim Abheben, denn eine Einlösung ist
eine Abhebung unter anderem Namen.

## 3. Kann ich meine Einlage verlieren?

Nein. Preise werden aus der Rendite gezahlt, nie aus jemandes Einzahlung, und `withdraw` ist
immer offen, auch während eine Ziehung läuft. Verlieren können Sie nur einen Preis, den Sie
gewonnen hätten: Erreicht der Auswertungsdurchlauf Sie nicht innerhalb des
Zwei-Perioden-Fensters, zahlt Ihnen diese Ziehung nichts und das Geld geht an die Stufe
zurück. Siehe Grenze 2.

## 4. Können Sie mein Guthaben oder meine Gewinne sehen?

Nein. Ihre Einlage, Ihre Gewinne, Ihr Gewicht für jede Ziehung und Ihre Gutschrift für jede
Ziehung sind verschlüsselte Werte, auf die nur Ihre Adresse Zugriff bekommt, und Zamas
Zugriffsliste setzt das auf der Blockchain durch, nicht als Richtlinie, die wir versprechen.
Wir sehen dasselbe wie ein Fremder: dass Sie eingezahlt haben, wann, und nichts über den
Betrag.

## 5. Wie werden meine Chancen berechnet?

Über Ihr Durchschnittsguthaben in der ganzen Periode, nicht über Ihr Guthaben, wenn die
Ziehung stattfindet. Eine Periode dauert im USDC-Pool eine Stunde und in den anderen sechs
Stunden.
Halten Sie 100 USDC über eine volle einstündige Periode, ist Ihr Gewicht 360.000
Guthaben-Sekunden; Ihre erwarteten Preise in einer Stufe sind dieses Gewicht geteilt durch
die veröffentlichte Größenklasse, multipliziert mit den Chancen und der Preiszahl der Stufe.
Ihr Geld auf mehrere Wallets aufzuteilen ändert nichts, denn die Erwartung ist exakt
proportional zum Gewicht.

## 6. Ich habe fünf Minuten vor der Ziehung eingezahlt und nichts gewonnen. Warum?

Weil fünf Minuten einer einstündigen Periode ein Zwölftel der Chancen sind, die Sie beim
Halten über die ganze Periode gehabt hätten, und ein Zweiundsiebzigstel bei einer
sechsstündigen. Das ist es, was jemanden davon abhält, kurz vor jeder Ziehung ein großes
Guthaben aufblitzen zu lassen, zu gewinnen und abzuheben; wir haben diesen Angriff gegen
unser eigenes früheres Design ausgeführt und er nahm 19 von 20 Ziehungen. Zahlen Sie ein und
lassen Sie es liegen, dann bekommen Sie ab der nächsten vollen Periode Ihren vollen Anteil.

## 7. Verdienen meine Gewinne auch Chancen?

Von allein nicht. Gewinne liegen in einem getrennten verschlüsselten Guthaben, das nicht in
Ihr Gewicht eingeht, Zinseszins läuft also nicht automatisch: Heben Sie sie ab und zahlen Sie
sie wieder ein, um sie arbeiten zu lassen. Diese Trennung ist es, die eine Abhebung eines
Preises identisch zu einer Abhebung von Ersparnissen aussehen lässt.

## 8. Wer stößt die Ziehungen an, und was passiert, wenn das aufhört?

Wir betreiben einen Keeper-Prozess je Pool, jeden auf seinem eigenen Konto, ein Keeper, der
stehen bleibt, kostet also einen Pool seine Ziehungen und lässt die anderen sechs laufen. Der
Pool implementiert außerdem Chainlinks Automatisierungsschnittstelle, ein zeitbasiertes
Upkeep könnte also den Abschlussschritt abdecken, auch wenn auf keinem Pool eines registriert
ist. So oder so ist jeder Schritt einer Ziehung von jedem aufrufbar, auch von Ihnen aus der
App.
Der Abschluss hat eine eigene Frist, eine halbe Periode vor dem Ende des Fensters, damit ein
Abschluss nie zu spät für die folgende Zuteilung landen kann. Läuft gar nichts, wird diese
Ziehung übersprungen: Ihre Liquidität bleibt für die nächste Ziehung in den Stufen, die
Rendite wird verbucht, sobald eine späte Zuteilung landet, und Ein- und Auszahlungen
funktionieren weiter. Ein stehen gebliebener Keeper kostet Ziehungen, nie Geld.

## 9. Könnten Sie die Zufallszahl oder die Größe des Preises manipulieren?

Weder noch. Der Seed wird im Koprozessor von Zama als Chiffrat erzeugt, niemand sieht ihn
also im Moment der Ziehung, und das Abschließen einer Ziehung gelingt genau einmal, es gibt
also keinen zweiten Wurf. Die Preisgrößen werden früher in derselben Transaktion festgelegt,
bevor der Seed existiert, niemand kann also einen Seed lesen, ausrechnen, dass er gewonnen
hat, und den Gewinn dann vergrößern. Nach Ende der Periode wird der Seed mit einer Signatur
von Zamas Schlüsselverwaltungsdienst veröffentlicht, die der Vertrag auf der Blockchain
prüft, und daraus kann jeder den genauen Schwellenwert nachrechnen, den eine beliebige
Adresse übertreffen musste.

## 10. Warum veröffentlicht der Pool nur eine grobe Größe statt seiner genauen Summe?

Weil die genaue Summe einzelne Einzahlungen preisgibt. Zwei aufeinanderfolgende Summen plus
der öffentliche Zeitstempel Ihrer eigenen Einzahlung erlauben es jedem, Ihren genauen Betrag
zu berechnen, wenn Sie in dieser Periode als Einziger Geld bewegt haben. Keine Schätzung, die
Zahl. Der Vault veröffentlicht deshalb nur die kleinste Zweierpotenz über der Summe, gegen
die die Ziehung stattdessen läuft. Der Preis dafür ist, dass eine Stufe je Ziehung zwischen
der Hälfte und allen ihren nominellen Preisen zahlt, wobei der Rest übertragen und erneut
angeboten wird, sodass sich die Preise etwas größer einpendeln. Niemandes Chancen verzerren
sich gegenüber denen eines anderen.

## 11. Woher kommt das Preisgeld?

Auf Sepolia aus einem vom Sponsor finanzierten Guthaben, das mit fester Rate tröpfelt, eines
je Pool, denn kein Ort auf Sepolia zahlt Rendite auf Zamas Mock-Token. Auf dem Mainnet
klinkt sich dieselbe Schnittstelle in Zamas Confidential Vault ein, der vertrauliches USDC
über einen Batcher in einen echten ERC-4626-Rendite-Vault legt. So oder so verbucht der Pool
nur den Betrag, von dem eine KMS-geprüfte Entschlüsselung sagt, dass er tatsächlich ankam,
nie eine Zahl, die die Quelle über sich selbst meldet.

## 12. Was kann jemand, der die Blockchain beobachtet, über mich erfahren?

Dass Sie Sparer sind, in welchem Block Sie eingezahlt oder abgehoben haben, und in welchem
Auswertungs-Batch Sie waren. Nicht Ihr Guthaben, nicht Ihre Chancen, nicht ob Sie gewonnen
haben. Vier Nähte sind wissenswert. Die veröffentlichte Größenklasse kommt personenbezogener
Information nahe, wenn es weniger als drei Sparer gibt. Kann jemand Ihr Guthaben festnageln,
üblicherweise indem er ein öffentliches Wrappen beobachtet, dem eine Einzahlung derselben
Größe folgt, ist Ihr Ergebnis von da an in jeder Ziehung öffentliche Rechnung, denn
Schwellenwerte sind bewusst öffentlich. Vollständig hinein und wieder heraus zu wrappen
veröffentlicht eine Untergrenze für alles, was Sie gewonnen haben. Und jede Stufe
veröffentlicht eine Ziehung später, wie viele Preise sie gezahlt hat, was eine grobe Messung
der verschlüsselten Guthaben ist und ein unbewegtes Guthaben langsam eingrenzt. Wir
veröffentlichen diese Zahl bei jeder Ziehung, weil es derselbe Schritt ist, der ungewonnenes
Geld in den öffentlichen Topf zurückgibt, was den Jackpot dort wachsen lässt, wo Sie ihm
zusehen können. Alle vier stehen unter
[was privat bleibt](security/what-stays-private.md).
