# Warum das Zama braucht

Der Test für jedes Projekt, das behauptet, eine bestimmte Technologie zu brauchen: Löschen
Sie diese Technologie und sehen Sie nach, ob das Produkt überlebt. Funktioniert es weiter,
war die Technologie Dekoration.

## Löschen Sie die Verschlüsselung und es bleibt kein Produkt

Vollständig homomorphe Verschlüsselung, meist zu FHE abgekürzt, heißt Rechnen direkt auf
verschlüsselten Zahlen, mit verschlüsseltem Ergebnis, ohne die Eingaben je zu
entschlüsseln. Das Zama Protocol bringt das nach Ethereum: Ein Solidity-Vertrag kann Werte
addieren, vergleichen und zwischen ihnen wählen, die er nicht lesen kann.

Nehmen Sie es aus Hearth heraus, und das bleibt übrig.

| Baustein von Hearth | Ohne FHE |
| --- | --- |
| Ihr Guthaben | Eine öffentliche Zahl. Jeder kann Ihre Ersparnisse und Ihre Chancen beziffern. |
| Der Gewinntest | Ein öffentlicher Vergleich. Das Ergebnis ist für jeden sichtbar, sobald er läuft. |
| Wer eine Ziehung gewonnen hat | Öffentlich, denn die Gutschrift, die in jemandes Guthaben landet, ist eine sichtbare Zahl. |
| Der zufällige Seed | Entweder eine öffentliche Zahl, die jemand kommen sieht, oder eine Zahl außerhalb der Blockchain, die jemand aussuchen kann. |
| Preisgutschriften | Öffentliche Transfers an namentlich bekannte Gewinner. |

Was Sie bekommen, ist PoolTogether. PoolTogether gibt es bereits, es funktioniert, und es
läuft seit Jahren. Es gibt keinen Grund, es nachzubauen.

Das Produkt, das Hearth tatsächlich verkauft, ist das, was PoolTogether nicht anbieten
kann: Gewinnsparen, bei dem Ihr Guthaben, Ihre Chancen und Ihre Gewinne allein Ihnen
gehören, während die Ziehung für Fremde nachprüfbar bleibt. Diese zwei Eigenschaften stehen
auf einer transparenten Blockchain im Widerspruch. Verschlüsseltes Rechnen ist das Einzige,
was ihn auflöst, und das Zama Protocol ist heute der einzige Ort auf Ethereum, an dem es
das gibt.

Es gibt keine Teilfassung. Jede der fünf Zeilen oben ist ein Kernversprechen. Nehmen Sie
die Verschlüsselung aus einer davon heraus, und das Produkt scheitert an dieser Zeile.

## Die genauen Bausteine, die wir nutzen

Nicht "gebaut auf Zama". Hier ist die Liste, mit dem, was jeder für uns tut.

### Verschlüsselte Ganzzahlen

`euint64` für Geld und Gewichte, `euint128` für den Gesamtakkumulator des Pools, `ebool`
für das Ergebnis eines Vergleichs. Die Einlage, die Gewinne, das Gewicht und die Gutschrift
jedes Sparers sind eines davon, und ebenso der Übertrag jeder Stufe. Die Rechenoperationen,
die wir darauf ausführen, sind `FHE.add`, `FHE.sub`, `FHE.mul` mit einer öffentlichen Zahl,
`FHE.min`, `FHE.gt`, `FHE.le`, `FHE.and` und `FHE.select`.

Der Vergleich leistet hier mehr als nur den Gewinntest. Fünf verschlüsselte Vergleiche je
Ziehung stellen das Gesamtgewicht des Pools den Zweierpotenzen rund um seine letzte bekannte
Größenklasse gegenüber, und das Einzige, was die verschlüsselte Welt verlässt, ist die
kleine Zahl, wie viele der fünf es übertroffen hat. So bekommt die Ziehung eine öffentliche
Skala, an der sie laufen kann, ohne dass die Summe selbst je zu einer Zahl wird.

`FHE.select` verdient eine Anmerkung, denn es ist das, was den ganzen Entwurf möglich
macht. Es ist eine Wenn-Anweisung mit verschlüsselter Bedingung: Sie gibt einen von zwei
verschlüsselten Werten zurück, und die Blockchain kann nicht sagen, welchen. So erzeugen
ein Gewinner und ein Verlierer identische Transaktionen. Nirgends in Hearth verzweigt etwas
an einem Geheimnis.

`FHE.fromExternal` nimmt einen verschlüsselten Wert, den ein Nutzer in seinem Browser
gebaut hat, samt Beweis, und macht daraus einen Wert, den der Vertrag verwenden kann. So
kommt ein Einzahlungsbetrag von Ende zu Ende verschlüsselt an.

### ERC-7984, der Standard für vertrauliche Token

Der Wert jedes Pools ist einer von Zamas vertraulichen Token, ein ERC-7984-Wrapper um einen
gewöhnlichen ERC-20: cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP oder cXAUt. Guthaben darin
sind verschlüsselte Werte statt öffentlicher Zahlen.

Einzahlungen kommen über `confidentialTransferAndCall` herein, das einen verschlüsselten
Betrag überträgt und in derselben Transaktion den Hook des Empfängers aufruft. Dem Hook des
Vaults wird der Betrag übergeben, den der Token wirklich bewegt hat, und so schreibt der
Vault die Wirklichkeit gut und nicht eine Bitte. Auszahlungen gehen andersherum über
`confidentialTransfer`.

Den Standardtoken zu nutzen statt einen eigenen zu schreiben, zählt. Mehrere Projekte in
diesem Feld haben sich einen Token "im Stil von ERC-7984" selbst gebastelt. Jeder unserer
Token ist einer, den Zama ausgerollt hat, das vertrauliche Guthaben eines Sparers ist also
auch außerhalb von Hearth nutzbar, und das Verhalten des Tokens ist nichts, was wir zu
unseren Gunsten festlegen dürfen. Es heißt auch, dass Hearth an dem Tag, an dem Zama einen
neuen vertraulichen Token veröffentlicht, einen Pool darauf eröffnen kann, so kamen sechs
der sieben dazu, und dass es auf einem Token, dessen Minting der Herausgeber für sich
behält, gar keinen eröffnen kann.

### Verschlüsselter Zufall

`FHE.randEuint64()` erzeugt eine Zufallszahl im Koprozessor von Zama, unter dem
FHE-Schlüssel des Netzwerks, aus einem Ausgangswert, der öffentlich, aber ohne diesen
Schlüssel nutzlos ist. Die Zahl kommt als Chiffrat heraus. Niemand sieht sie im Moment
ihrer Entstehung, wir eingeschlossen und wer auch immer die Transaktion sendet.

Sie muss innerhalb einer Transaktion erzeugt werden, denn sie verändert den Zustand des
Generators auf der Blockchain. Das schließt den Trick aus, eine Ziehung außerhalb der
Blockchain mit `eth_call` vorab zu simulieren, um zu sehen, ob man gewinnen würde, und
deshalb ist das Abschließen einer Ziehung eine echte Transaktion, die genau einmal gelingt.
Niemand kann einen Seed neu würfeln, der ihm nicht gefällt.

### Die Zugriffsliste

Zamas Zugriffsliste auf der Blockchain entscheidet, wer welches Chiffrat entschlüsseln
darf. Sie ist Durchsetzung, keine Richtlinie: Der Relayer lehnt eine Anfrage für ein
Handle ab, auf dem der Aufrufer nicht berechtigt ist.

Hearth nutzt vier Aufrufe darauf. `FHE.allowThis` hält einen Wert für den Vertrag in
späteren Transaktionen nutzbar. `FHE.allow` gewährt einem Sparer dauerhaften Lesezugriff
auf seine eigene Einlage, seine Gewinne, sein Gewicht je Ziehung und seine Gutschrift je
Ziehung. `FHE.allowTransient` gewährt Zugriff für die Dauer einer Transaktion, und so
übergibt der Vault dem Pool eine einmalige Erlaubnis über die Summe eines
Auswertungs-Batches, ohne ihm je stehenden Zugriff zu geben. `FHE.makePubliclyDecryptable`
öffnet einen Wert für alle, und wir nutzen es auf genau sechs Arten von Werten: dem Seed,
der Skalenzahl, aus der die Größenklasse folgt, dem Nichtleer-Kennzeichen, der Ernte, dem
Übertrag einer Stufe, wenn diese Stufe zum Abgleich fällig ist, und dem Zähler für
Nichtfinanziertes. Das genaue Gesamtgewicht des Pools steht bewusst nicht auf dieser Liste.

Dieser letzte Aufruf ist eine Einbahnstraße und dauerhaft. Er ist das folgenschwerste, was
ein Vertrag auf diesem Protokoll tun kann, deshalb ist jede Verwendung davon in Hearth
unter [was privat bleibt](../security/what-stays-private.md) aufgeführt.

### EIP-712-Nutzerentschlüsselung

So liest ein Sparer seine eigenen Zahlen. Er signiert eine typisierte, strukturierte
Nachricht, ein Signaturstandard, der dem Unterzeichner genau zeigt, was er freigibt, und
Zamas Relayer gibt den Klartext der Werte zurück, auf die dieser Sparer berechtigt ist.

Es ist eine Anfrage außerhalb der Blockchain. Keine Transaktion, kein Gas, keine Spur.
Deshalb kann Hearth ganz ohne Einlöse-Funktion auskommen: Zu erfahren, dass man gewonnen
hat, kostet nichts und hinterlässt nichts. Die andere Hälfte dieses Versprechens ist, dass
sich die Auswertung ebenfalls nicht auf einen selbst richten lässt, es gibt also keinerlei
Transaktion, die nur ein Gewinner senden würde.

Sowohl das Guthaben als auch die Gewinne sind von ihrem Eigentümer entschlüsselbar. Hearth
gewährt außerdem das Gewicht je Ziehung und die Gutschrift je Ziehung, sodass ein Sparer
die Rechnung der Ziehung gegen seine eigenen Eingaben prüfen kann, statt gebeten zu werden,
ihr zu vertrauen.

### KMS-signierte öffentliche Entschlüsselung

Die andere Richtung. Ein Vertrag markiert einen Wert als öffentlich entschlüsselbar, jemand
fragt den Relayer nach dem Klartext, und der Relayer gibt ihn mit einer Signatur des
Schlüsselverwaltungsdienstes zurück, also der Gruppe, die den Entschlüsselungsschlüssel des
Netzwerks hält. Der Vertrag prüft diese Signatur dann auf der Blockchain mit
`FHE.checkSignatures`, bevor er auf der Zahl handelt.

Das ist es, was aus "wir sagen, der Seed war 12345" eine Zahl macht, die der Vertrag selbst
ohne Beweis nicht annimmt. Hearth nutzt es einmal je Ziehung für den Seed, die Skalenzahl,
das Nichtleer-Kennzeichen und die Ernte zusammen bei der Zuteilung, und erneut für den
Übertrag einer Stufe, wann immer diese Stufe zum Abgleich fällig ist, auf Sepolia also jede
Stufe bei jeder Ziehung. Jeder Beweis ist in fester Reihenfolge an seine Handles gebunden,
nichts lässt sich also vertauschen oder in eine andere Ziehung oder eine andere Stufe
wiedereinspielen.

## Wem ein Sparer tatsächlich vertraut

Das zu benennen ist der Sinn dieser Seite.

- **Dem Zama Protocol**, dass es auf Chiffraten korrekt rechnet und nur das entschlüsselt,
  was als entschlüsselbar markiert ist. Jede Entschlüsselung, auf der die Verträge handeln,
  trägt einen auf der Blockchain geprüften Beweis. Das ist dieselbe Vertrauensgrenze, die
  Zama für den eigenen Confidential Vault dokumentiert.
- **Den vertraulichen Token-Wrappern**, die Zamas Verträge sind und nicht unsere, und die
  von ihrem Eigentümer upgradebar sind. Siehe den Abschnitt zur Token-Ebene unter
  [was privat bleibt](../security/what-stays-private.md).
- **Hearths eigenen Verträgen**, die nach dem Ausrollen unveränderlich sind, ohne Proxy und
  ohne Upgrade-Pfad. Die verbleibenden Befugnisse des Eigentümers sind eng und im
  [Bedrohungsmodell](../security/threat-model.md) aufgeführt: eine Pause, die Einzahlungen
  und das Abschließen von Ziehungen stoppt, aber nie Abhebungen oder die Auswertung, ein
  Setzer für die Renditequelle, ein Rettungsweg für fremde Token, der Sparerguthaben nicht
  berühren kann, und eine zweistufige Eigentumsübertragung mit deaktiviertem Verzicht.

Nichts auf dieser Liste ist eine Person, der Sie glauben sollen.
