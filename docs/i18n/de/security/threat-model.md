# Bedrohungsmodell

Neun Angreifer, was jeder von ihnen will, was sie aufhält und was nicht. Die letzte Spalte
ist die, die sich zu lesen lohnt. Ein Bedrohungsmodell, das nur Verteidigungen aufzählt, ist
Werbung.

Hearths Kernverträge sind nach dem Ausrollen unveränderlich. Es gibt keinen Proxy und keinen
Upgrade-Pfad, nichts auf dieser Seite lässt sich also nachträglich ändern, außer indem ein
neuer Pool ausgerollt wird.

**Jeder Pool ist isoliert.** Die sieben Pools auf Sepolia sind sieben getrennte Deployments
desselben Codes, eines je vertraulichem Token, und sie teilen keinen Speicher, kein Guthaben
und kein Register. Ein Pool hält nur seinen eigenen Token, finanziert nur seinen eigenen
Vault und wird von seinem eigenen Keeper-Konto angetrieben, ein Fehler im Wrapper eines
Tokens, ein Eigentümer, der einen Vault pausiert, oder ein stehen gebliebener Keeper kann
also weder die Sparer eines anderen Pools noch dessen Preisgeld erreichen. Was folgt,
beschreibt einen Pool und gilt für jeden der sieben für sich.

## 1. Ein neugieriger Beobachter

Jemand mit einem Archiv-Node, einem Block-Explorer und Zeit. Kein Kapital, kein
privilegierter Zugang.

**Will:** wissen, wer wie viel gespart hat, wessen Chancen am besten stehen und wer jede
Ziehung gewonnen hat.

**Aufgehalten durch:** Jeder personenbezogene Wert ist ein Chiffrat. Einlage, Gewinne,
Gewicht je Ziehung und Gutschrift je Ziehung sind nur von dem Sparer lesbar, dem sie
gehören, durchgesetzt von Zamas Zugriffsliste, die den Relayer dazu bringt, eine
Entschlüsselungsanfrage von jeder anderen Adresse abzulehnen. Es gibt keine
Einlöse-Transaktion, nach der man Ausschau halten könnte, und die Auswertung lässt sich
nicht auf einen selbst richten, es existiert also keine Transaktion, die nur ein Gewinner
senden würde. Gewinner und Verlierer bekommen im selben Batch identische Schreibvorgänge,
denn die Auszahlung ist eine verschlüsselte Auswahl statt einer Verzweigung, Form und
Gaskosten der Transaktionen stimmen also überein.

**Ein Leck, das dieser Entwurf beseitigt hat.** Ein früherer Entwurf veröffentlichte bei
jeder Ziehung das genaue gesamte zeitgewichtete Guthaben des Pools. Mit dieser Zahl
öffentlich für zwei aufeinanderfolgende Perioden und dem öffentlichen Zeitstempel der
eigenen Transaktion eines Sparers ließ sich bei einem Sparer, der als Einziger in einer
Periode Geld bewegte, dieser Betrag exakt wiederherstellen, nicht bloß eingrenzen. Der Vault
veröffentlicht jetzt nur die Zweierpotenz-Größenklasse über der Summe, verfolgt mit fünf
verschlüsselten Vergleichen je Ziehung, und der Gleichung bleibt nichts mehr zu lösen. Die
vollständige Darstellung ist Regel 1 unter
[was privat bleibt](what-stays-private.md).

**Von nichts aufgehalten:**

- Die Sparerliste, und der Block, in dem jeder Sparer eingezahlt, abgehoben oder ausgewertet
  wurde.
- Die Größenklasse, in die die Summe des Pools fiel, die bei weniger als drei Sparern das
  Gewicht eines Sparers auf den Faktor zwei genau festnagelt. Siehe die Regel zur
  Anonymitätsmenge unter [was privat bleibt](what-stays-private.md).
- **Ein Guthaben, das der Beobachter festnageln kann, hat in jeder Ziehung ein öffentliches
  Ergebnis.** Schwellenwerte sind bewusst öffentlich, und der Gewinntest ist eine
  deterministische Funktion eines Geheimnisses und ansonsten öffentlicher Daten. Wrappen Sie
  1.000 USDC und zahlen Sie Sekunden später 1.000 USDC ein, und jeder Ihrer Gewinne und
  Verluste, in jeder Stufe, in jeder Ziehung von da an, ist öffentliche Rechnung.
- **Kumulierte Gewinne sind eine öffentliche Untergrenze** für eine Adresse, die vollständig
  hinein und wieder heraus wrappt, denn beide Bewegungen sind auf der Token-Ebene öffentlich.
- **Ein unbewegtes Guthaben wird langsam eingegrenzt.** Die veröffentlichten Preiszahlen sind
  eine kleine Messung der Guthabenverteilung, und sie summieren sich gegen einen Sparer,
  dessen Guthaben sich nie ändert. Jede Stufe veröffentlicht ihre Zahl eine Ziehung später,
  die Messung läuft also einmal je Stufe und Ziehung. Der Takt, der sie verlangsamen würde,
  ist ein Konstruktor-Regler, den dieses Deployment auf eins gesetzt hat, denn derselbe
  Schritt ist es, der ungewonnenes Geld in den öffentlichen Topf zurückgibt und den Jackpot
  sichtbar hält. Grenze 14.
- Der verhaltensbedingte Rest: nur nach gewonnenen Ziehungen abzuheben, über viele Ziehungen
  hinweg.

## 2. Ein Wal

Jemand mit viel Kapital, der Chancen billig haben will.

**Will:** Preise abgreifen, ohne Geld im Pool zu lassen, oder die Mechanik abgrasen.

**Aufgehalten durch:**

- **Zeitgewichtung.** Chancen kommen aus dem Durchschnittsguthaben über die ganze Periode.
  Eine Einzahlung mit 6 Minuten Rest in einer einstündigen Periode verdient ein Zehntel der
  Chancen desselben Betrags, der die ganze Periode gehalten wurde. Das ist die Verteidigung,
  die unserem früheren Design fehlte, und der Angriff, den sie erlaubt, wurde ausgeführt: Ein
  Angreifer, der 9.000 USDC um jede Ziehung herum kreisen ließ, gewann 19 von 20 Ziehungen
  und leerte eine Reserve von 5.000 USDC.
- **Linearität.** Erwartete Preise sind exakt proportional zum Gewicht, und die Größenklasse,
  gegen die die Ziehung läuft, hängt nicht davon ab, wie sich das Gewicht des Pools auf
  Adressen verteilt. Eine Wallet in sechs aufzuteilen bringt nichts, und sechs zu einer
  zusammenzulegen bringt nichts.
- **Die Obergrenze je Sparer.** Einzahlungen werden abgelehnt, wenn der Betrag oder die
  resultierende Einlage über `(2^64 - 1) / L` liegt, und die Ablehnung ist verschlüsselt, sie
  gibt also nichts preis. Den Betrag ebenso zu begrenzen wie die Summe ist es, was den Umlauf
  der verschlüsselten Addition in der Prüfung verhindert.

**Nicht aufgehalten:**

- Ein Wal, der tatsächlich ein großes Guthaben über die ganze Periode hält, gewinnt oft. Das
  ist das Produkt, kein Angriff: Sein Geld hat die Rendite erwirtschaftet, die die Preise
  gezahlt hat.
- Die Chancen der Hauptpreis-Stufe werden über eine Periode gemessen, ein Wal, der für eine
  einzige Periode dazukommt, nimmt also einen vollen anteiligen Schuss auf einen Topf, der 24
  Perioden brauchte. Das ist eine erklärte Abweichung von PoolTogether V5 und ist Grenze 5.

## 3. Ein Störer, der Scheinsparer anmeldet

Jemand, der viele wertlose Adressen zur Sparerliste hinzufügt.

**Will:** Ziehungen aufhalten, Chancen verwässern oder den Pool teuer im Betrieb machen.

Die Anmeldung ist von Bauart her offen. Der Einzahlungs-Hook kann den verschlüsselten Betrag
nicht sehen, der ihm übergeben wurde, jede Adresse, die ihn auslöst, kommt also auf die
Sparerliste, auch mit einer verschlüsselten Null, und die Liste wird nie ausgemistet.

**Aufgehalten durch:**

- **Die Chancen bleiben unberührt.** Ein Sparer ohne Guthaben hat Gewicht null. Gewicht null
  kann keinen Schwellenwert übertreffen, und es trägt nichts zur Summe bei, die Chancen jedes
  echten Sparers sind also genau die, die sie ohne die Scheinsparer wären. Unser früheres
  Design brauchte dafür eine Anmeldekaution. Dieses nicht.
- **Die Auswertung lässt sich nicht verstopfen.** Ein für eine Ziehung bereits ausgewerteter
  Sparer, eine Adresse, die kein Sparer ist, und ein Sparer, dessen erste Beobachtung nach
  der Periode liegt, werden alle übersprungen, ohne zurückzuweisen, und das Überspringen wird
  aus Klartext-Zeitstempeln ohne verschlüsselten Aufwand entschieden. Ein schlechter Eintrag
  kann keinen Batch scheitern lassen.
- **Batches sind gedeckelt** bei `4` Sparern, die verschlüsselte Arbeit brauchen, je Aufruf,
  keine einzelne Transaktion kann also über Zamas Rechengrenze geschoben werden.

**Nicht aufgehalten:** Die Kosten des Keepers je Ziehung wachsen mit der Sparerliste, die nur
wächst. Ein Störer kann niemandes Chancen ändern, aber er kann es teuer machen, alle
auszuwerten. Die Antwort des Keepers ist eine Gebührenobergrenze, kein Budget.
`KEEPER_MAX_FEE_GWEI` lässt ihn einen ganzen Takt aussetzen, solange die Netzwerkgebühr über
der Obergrenze liegt (`gasIsAffordable` in `packages/keeper/src/keeper.ts`), und unterhalb
der Obergrenze sendet er weiter, bis der Cursor das Ende des Durchlaufs erreicht. Sparer ohne
Beobachtung vor der Periode werden aus Klartext-Zeitstempeln ohne verschlüsselten Aufwand
übersprungen, die Liste aufzublähen kostet also den Keeper Gas und nicht die Sparer ihre
Preise. Auf der Blockchain deckelt nichts die Auswertung, die ehrliche Folge ist also: Bleibt
das Gas in einem stark gestörten Pool über der Obergrenze, erreicht der Durchlauf innerhalb
des Fensters womöglich nicht jeden echten Sparer.
Zwei Dinge mildern das. Der Durchlauf startet bei jeder Ziehung an einem anderen Punkt,
abgeleitet aus dem Seed dieser Ziehung, niemand ist also systematisch der Letzte. Und jeder
kann den Durchlauf aus der App weiter voranbringen, was Gas kostet und nichts darüber
verrät, wer fragt. Siehe [die Keeper-Seite](../operations/keeper.md).

## 4. Ein träger oder feindseliger Keeper

Die Adresse, die Ziehungen normalerweise vorantreibt. Unsere oder die von jemand anderem.

**Will:** eine Ziehung überspringen, die sie nicht gewonnen hat, die Reihenfolge wählen, in
der Sparer bezahlt werden, oder schlicht aufhören zu arbeiten.

**Aufgehalten durch:**

- **Jeder Schritt ist erlaubnisfrei.** Abschließen, Zuteilen, Auswerten, Finalisieren und
  Abgleichen kann jeder aufrufen, auch jeder Sparer aus der App. Ein Keeper, der sich weigert,
  eine Ziehung zuzuteilen, kann sie nicht verschwinden lassen; jemand anderes teilt sie zu.
- **Der Keeper kann nicht wählen, wer ausgewertet wird.** `evaluate(drawId, count)` nimmt
  eine Anzahl, keine Liste. Die Reihenfolge des Durchlaufs legt der Seed der Ziehung fest, der
  Keeper kann sich oder einen Freund in einer überzeichneten Stufe also nicht nach vorn
  setzen und keinen bestimmten Sparer auslassen.
- **Ein später Abschluss wird abgelehnt, nicht geduldet.** Der Abschluss muss vor
  `closeDeadline(p)` landen, der Mitte der zweiten Periode des Fensters. Ein Abschluss im
  letzten Block des Fensters hätte dem Entschlüsselungs-Rundlauf keinen Platz gelassen und
  die Ziehung dauerhaft stranden lassen. Jetzt weist diese Transaktion einfach zurück. Eine
  Ziehung, deren Abschluss nie landete, bleibt für immer unabgeschlossen: Ihre Liquidität
  wurde nie hineinbewegt, es gibt also nichts zurückzugeben und nichts zu finalisieren.
- **Eine übersprungene Ziehung kostet nichts.** Liquidität, die nie angeboten wurde, bleibt
  in ihrer Stufe und wird erneut angeboten. Eine späte Zuteilung verbucht die Ernte trotzdem,
  gibt die angebotene Liquidität trotzdem an die Stufen zurück und markiert die Ziehung als
  `Skipped`. Diese Periode zahlt keinen Preis, und es geht kein Geld verloren oder strandet.
- **Der Keeper kann kein Ergebnis ändern.** Die Gewinnerermittlung steht in dem Moment fest,
  in dem der Seed und die Größenklasse geprüft sind. Die Auswertung schreibt ein bestehendes
  Ergebnis auf.

**Versehentlich getestet, 3. September 2026.** Der pm2-Daemon starb mit dem Terminalprozess,
der ihn gestartet hatte, um 03:45 UTC, und niemand bemerkte es bis 04:52, der Keeper war also
67 Minuten aus. Nach dem Neustart finalisierte er sofort Ziehung 4 und schloss Ziehung 6 um
04:53 ab. Periode 6 war um 04:00 zu Ende gewesen, dieser Abschluss kam also 53 Minuten spät
gegen eine Frist von 05:30, der Mitte der zweiten folgenden Periode. Keine Ziehung ging
verloren, keine Liquidität strandete, und niemand musste über den Neustart des Prozesses
hinaus eingreifen. Das ist die Aussage "ein stehen gebliebener Keeper kostet Ziehungen, nie
Geld" aus [dem FAQ](../faq.md) und aus den Punkten oben, real durchgespielt statt
argumentiert.

**Nicht aufgehalten:**

- Sobald Seed und Größenklasse öffentlich sind, kann derjenige, der gleich `awardDraw`
  aufruft, zuerst sein eigenes Ergebnis berechnen und entscheiden, ob es sich lohnt. Zuteilen
  ist erlaubnisfrei und die App bietet es jedem an, das ist also ein Ärgernis und keine
  Zensur, aber es ist echt und es wird gesagt.
- Handelt überhaupt niemand innerhalb des Zwei-Perioden-Fensters, zahlt diese Ziehung nichts.

## 5. Der Pool-Eigentümer

Wir. Die Adresse, die die Verträge ausgerollt hat.

**Will:** hier aufgezählt, damit ein Sparer nicht raten muss.

**Befugnisse, vollständig:**

| Befugnis | Grenze |
| --- | --- |
| Pausieren | Stoppt Einzahlungen und das Abschließen von Ziehungen. Stoppt nie Abhebungen, Auswertung, Zuteilung, Finalisieren oder Abgleichen. |
| Renditequelle setzen | Wirft `YieldSourceSet`. Kann kein bestehendes Guthaben beeinflussen. |
| Fremde Token retten | Kann Einlage oder Gewinne von Sparern nicht berühren. |
| Eigentum übertragen | Zweistufig. Verzicht ist deaktiviert, das Eigentum kann also nicht ins Leere fallen. |

**Kann nicht:** Einlage, Gewinne, Gewicht oder Gutschrift eines Sparers lesen, denn die
Verträge gewähren dem Eigentümer darauf nie Zugriff. Kann das Ergebnis einer Ziehung nicht
ändern. Kann niemandes Geld bewegen. Kann die Verträge nicht upgraden, denn es gibt keinen
Upgrade-Pfad.

**Nicht aufgehalten:** Ein feindseliger Eigentümer kann Einzahlungen unbegrenzt pausieren und
kann den Pool auf eine Renditequelle richten, die nichts zahlt. Das hungert die Preisseite
des Produkts aus. Die Uhr hält es nicht mehr an: Eine Quelle, die zurückweist, wird
abgefangen, die Ernte dieser Ziehung wird als null verbucht, `HarvestFailed` wird geworfen
und der Abschluss gelingt trotzdem. Keine der beiden Befugnisse nimmt eine einzige Einheit
von irgendjemandes Einlage, und Abhebungen funktionieren durchgehend weiter.

## 6. Der Sponsor

Wer auch immer die Sepolia-Renditequelle finanziert.

**Will:** im ehrlichen Fall der Demo Preisgeld geben. Im feindseligen Fall Preise timen oder
zurückhalten.

**Aufgehalten durch:** Der Sponsor hat keinen Einfluss darauf, wer gewinnt. Er finanziert ein
Guthaben; der Seed, die Gewichte und die Schwellenwerte haben mit ihm nichts zu tun.
Sponsorbeträge, die Tröpfelrate und jede Ernte sind öffentlich, jeder kann also genau sehen,
wie viel Preisgeld es gibt und wie schnell es ankommt. Ein Sponsoring ist eine Spende: Es
lässt sich nach der Zusage nicht zurückholen, und nur der Eigentümer der Quelle kann die
Tröpfelrate ändern.

**Nicht aufgehalten:** Ein Sponsor, der aufhört zu sponsern, beendet die Preise, sobald das
Guthaben ausgetröpfelt ist. Preise sind Rendite, und keine Rendite heißt keine Preise. Die
Einlage bleibt durchgehend unberührt, was der ganze Sinn eines verlustfreien Entwurfs ist.

## 7. Der Token-Betreiber

Zama, als Eigentümer der vertraulichen Token-Wrapper. Der Wert jedes Pools ist ihr Vertrag,
nicht unserer, und jeder Pool sitzt hinter einem anderen davon.

**Will:** aufgezählt, nicht unterstellt.

**Befugnisse, gelesen aus dem verifizierten Sepolia-Quelltext am 2. September 2026:**

- `addObserver(address)` gewährt einer Adresse pauschale Entschlüsselung über jedes Handle,
  auf dem der Token Rechte hält, und zwar **rückwirkend**. Ein zu irgendeinem künftigen
  Datum ernannter Beobachter kann bereits auf der Blockchain stehende Beträge entschlüsseln,
  die Ernennung zu überwachen und auszusteigen ist also keine Verteidigung. Der Umfang ist
  jeder Einzahlungsbetrag, jede Abhebungsauszahlung, das eigene Token-Guthaben des Pools und
  der eine Preisfinanzierungstransfer je Auswertungs-Batch. Es gibt keine Auszahlung je
  Gewinner zu lesen, denn Hearth hat keinen Preistransfer je Sparer. Ein Batch, der einen
  einzigen Sparer enthält, macht die Summe dieses Batches allerdings zum exakten Preis dieses
  Sparers, und der Live-Pool mit fünf Sparern bei einer Batch-Größe von 4 erzeugt einen
  solchen Batch in jeder Ziehung. `evaluate` nimmt seine Batch-Größe vom Aufrufer und ist
  erlaubnisfrei, es lässt sich also kein Mindest-Batch erzwingen;
  [Grenze 7](../limitations.md) hält es als akzeptierten Rest fest und nennt die
  vertragsseitige Korrektur. Live-Zustand an jenem Tag: `observerCount()` war 0 und
  `observers()` war leer.
- Eine Sperrliste. Eine gesperrte Adresse kann nicht einzahlen, abheben oder entwrappen, denn
  jedes davon ist ein Token-Transfer mit dieser Adresse auf einer Seite.
- Eine Pausierer-Rolle, live auf der Nulladresse, das Pausieren ist derzeit also deaktiviert.
- Die Implementierung ist von ihrem Eigentümer hinter einem Proxy upgradebar.

**Aufgehalten durch:** nichts, das wir kontrollieren. Das ist eine Vertrauensannahme, keine
Verteidigung.

**Was es nicht erreicht:** Hearths eigenes Kontobuch. Einlage, Gewinne, Gewichte und
Gutschriften liegen im Vault, und der Token hält darauf keine Zugriffsrechte, auch nicht
unter einem feindseligen Token-Upgrade. Wir haben das am vorherigen Deployment geprüft: Die
Token-Adresse gibt für die Berechtigung auf den Einlage- und Gewinn-Handles eines Einzahlers
Falsch zurück, während der Einzahler und der Pool Wahr zurückgeben.

## 8. Zamas KMS-Quorum

Die Parteien, die den Entschlüsselungsschlüssel des Netzwerks halten.

**Will:** aufgezählt, weil das die tiefste Annahme in jeder FHEVM-Anwendung ist.

**Was sie tun könnten:** Der Vertrag prüft, dass ein Klartext eine gültige Signatur des
Quorums trägt. Er kann nicht prüfen, dass der Klartext der wahre Klartext des Handles ist.
Ein unehrliches Quorum könnte deshalb einen Seed-Wert seiner Wahl signieren, und der Vertrag
würde ihn annehmen, was es ihm erlaubte, Gewinner auszuwählen.

**Aufgehalten durch:** nichts in Hearth. Jede Anwendung auf diesem Protokoll erbt das, und
Zamas eigene Dokumentation nennt die Grenze deutlich: Dem Protokoll wird vertraut, dass es auf
Chiffraten korrekt rechnet und nur das entschlüsselt, was als öffentlich entschlüsselbar
markiert ist.

**Wissenswert:** Das Quorum kann weiterhin nichts lesen, was nicht als öffentlich
entschlüsselbar markiert ist, und in Hearth sind das nur der Seed, die Skalenzahl, das
Nichtleer-Kennzeichen, die Ernte, der Übertrag jeder Stufe, wenn sie fällig ist, und der
Zähler für Nichtfinanziertes. Kein Wert eines einzelnen Sparers ist je in dieser Menge, und
das genaue Gesamtgewicht des Pools auch nicht.

## 9. Der Relayer

Der Dienst, der Entschlüsselungsanfragen zwischen Browsern und dem Protokoll vermittelt.

**Will:** aufgezählt.

**Kann:** den Dienst verweigern oder verzögern, was eine Ziehung verzögert. Er sieht außerdem,
welche Adresse welches Handle entschlüsseln wollte, er erfährt also, dass Sie Ihre eigenen
Zahlen geprüft haben, aber nicht, was sie sagen.

**Kann nicht:** selbst etwas entschlüsseln, denn er hält den Schlüssel nicht. Kann keine
KMS-Signatur fälschen, wofür die Prüfung auf der Blockchain da ist. Kann sich selbst keinen
Zugriff auf ein Handle gewähren, denn das ist Aufgabe der Zugriffsliste und die lebt auf der
Blockchain.

**Aufgehalten durch:** Das Zwei-Perioden-Fenster fängt einen langsamen Relayer ab, und die
Abschlussfrist garantiert, dass beim Start des Rundlaufs noch mindestens eine halbe Periode
vor ihm liegt. Darüber hinaus wird die Ziehung übersprungen, die Ernte wird trotzdem verbucht
und die Liquidität ist weiterhin da. Ein Relayer-Ausfall kostet eine Ziehung, nie Geld.

## Was das alte Design falsch machte, und wie dieses es schließt

Vor diesem Neubau war Hearth ein einzelner Vertrag namens `LanternPool`, der Sparer nach
ihrem Guthaben im Augenblick der Ziehung gewichtete und Einzahler in Blöcken durchging. Wir
haben ihn am 2. September 2026 gegen uns selbst geprüft und die Angriffe ausgeführt, statt
über sie nachzudenken. Sechs der acht Befunde unten wurden in laufendem Code nachgestellt.

| # | Was schiefging | Beleg | Wie dieser Entwurf es schließt |
| --- | --- | --- | --- |
| 1 | **Blitz-Einzahlung.** Keine Zeitgewichtung, eine Einzahlung einen Block vor der Ziehung zählte also voll. | Auf dem Mock ausgeführt: 20 Zyklen, der Angreifer gewann 19 von 20 und leerte eine Reserve von 5.000 USDC. Der ganze Zyklus passte auch in eine Transaktion, 2.189.992 Gas. | Die Chancen kommen aus dem zeitgewichteten Durchschnitt über die ganze Periode. Eine Einzahlung in letzter Minute verdient ihren Bruchteil der Periode und nicht mehr. |
| 2 | **Die Einlöse-Transaktion war ein Gewinner-Verräter.** Einlösungen von Gewinnern und Verlierern waren identisch, aber nur ein Gewinner hatte einen Grund, eine zu senden. | Ausgeführt: Einlösung von Gewinner und Verlierer kosteten auf dem Mock je 391.944 Gas bei identischen Logs. Auf Sepolia landete eine Einlösung 48 Sekunden nach einer Abrechnung. | Es gibt keine Einlöse-Funktion. Preise landen bei der Auswertung in einem verschlüsselten Gewinnguthaben, `withdraw` ist der einzige Ausgang, und die Auswertung lässt sich nicht auf einen selbst richten. |
| 3 | **Ein öffentliches Bit je Ziehung.** Das Gewinn-Handle eines Hausloses wurde in jeder Ziehung erneut als öffentlich entschlüsselbar veröffentlicht, was verriet, ob das Haus gewonnen hatte, was bei einem einzigen echten Sparer den Gewinner benannte. | Auf dem Mock über 16 Ziehungen ausgeführt und auf Sepolia über drei abgerechnete Ziehungen bestätigt. | Es gibt kein Haus-Los. Die einzigen öffentlich entschlüsselbaren Werte sind der Seed, die Skalenzahl, das Nichtleer-Kennzeichen, die Ernte, die Überträge der Stufen und der Zähler für Nichtfinanziertes. Keiner davon ist personenbezogen. |
| 4 | **Nicht öffentlich nachprüfbar.** Die Summe des Pools wurde nie veröffentlicht, ein Außenstehender konnte die Ziehung also überhaupt nicht prüfen. | Aus dem ausgerollten Quelltext gelesen und live bestätigt. | Der Seed und die Größenklasse werden mit einem auf der Blockchain geprüften KMS-Beweis veröffentlicht, und jeder Schwellenwert ist aus diesen zwei Zahlen von jedem nachrechenbar. |
| 5 | **Rendite aus einer Meldung verbucht.** Reserve-Aufstockungen wurden aus dem übergebenen Betrag verbucht, während der Wrapper `amount / rate()` prägt. Auf Sepolia nur deshalb latent, weil die Rate zufällig 1 war. | Gegen einen Testtoken mit 18 Nachkommastellen ausgeführt, wo die Rate eine Billion ist. | Der Pool verbucht nur den KMS-geprüften Betrag, den die Quelle tatsächlich transferiert hat. |
| 6 | **Kostenloses Anmelde-Stören.** Eine Wallet, die den Token nie gehalten hatte, konnte sich selbst anmelden, und ein Betreiber konnte andere Wallets mit einer wiederverwendeten verschlüsselten Null anmelden. | Ausgeführt. | Die Anmeldung ist von Bauart her weiterhin offen. Scheinsparer tragen Gewicht null, ändern niemandes Chancen und werden im Klartext übersprungen. Die einzigen Kosten sind Keeper-Gas, und was der Keeper begrenzt, ist der Gaspreis, den er zahlt, nicht die Arbeit, die er tut. |
| 7 | **Die Wrapping-Naht, ungemildert.** Die App wrappte und zahlte in einem Ablauf ein. | Live gemessen: drei von fünf Einzahlungen lagen zwei bis vier Blöcke nach einem öffentlichen Wrap von 100 USDC. | Wrappen und Einzahlen sind getrennte Schritte und die App erklärt warum. Die Naht ist verkleinert, nicht beseitigt, und ist Grenze 10. |
| 8 | **Kein Keeper.** Ziehungen waren erlaubnisfrei, aber niemand führte sie aus: Der Live-Pool saß 26 Stunden mit einer öffnungsbereiten Ziehung da. | Live von der Blockchain gelesen. | Ein Keeper-Skript führt jeden Schritt aus und jeder Sparer kann eine Ziehung aus der App voranbringen. Der Pool implementiert Chainlinks Automatisierungsschnittstelle für den Abschlussschritt als weitere Redundanz, auch wenn noch kein Upkeep registriert ist. |

Zwei weitere Designänderungen kamen aus der Prüfung vom 3. September und stehen nicht in
dieser Tabelle, weil das alte Design nicht weit genug kam, um sie zu haben: Die
Veröffentlichung der genauen Gesamtsumme wurde durch die Größenklasse ersetzt (Angreifer 1
oben), und die Preisgrößen wanderten von der Zuteilung zum Abschluss, damit kein Preis
nachträglich zu seinem Seed vergrößert werden kann.

## Was geprüft wird, und wie

Zu jeder Aussage oben gibt es einen Test. Die ausgeführten Ausgaben landen unter
`docs/security/attacks`, und die Zahlen stehen im README.

| Aussage | Die Prüfung |
| --- | --- |
| Ein Fremder kann die Werte eines Sparers nicht lesen | Den Relayer bitten, Einlage, Gewinne, Gewicht und Gutschrift einer anderen Adresse zu entschlüsseln. Ablehnung bei allen vieren erwartet. |
| Die genaue Summe des Pools ist nicht zu bekommen | Den Relayer nach dem Handle des Gesamtgewichts fragen. Ablehnung erwartet. Dann die veröffentlichten Größenklassen aufeinanderfolgender Ziehungen in einem Pool differenzieren, in dem ein Sparer Geld bewegt hat, und zeigen, dass die Antwort ein Faktor-zwei-Band ist und keine Zahl. |
| Eine Blitz-Einzahlung verdient fast nichts | Nahe am Ende einer Periode einzahlen, auswerten und das gespeicherte Gewicht mit dem eines Halters über die volle Periode vergleichen. |
| Scheinsparer können keine Ziehung aufhalten | Viele leere Adressen anmelden, dann eine volle Ziehung durchführen. |
| Niemand kann wählen, wer ausgewertet wird | `evaluate` von der eigenen Adresse eines Sparers aufrufen und zeigen, dass der Durchlauf vom seed-abgeleiteten Cursor voranschreitet und nicht von diesem Sparer. |
| Ein später Abschluss wird abgelehnt | `closeDraw` nach `closeDeadline` aufrufen und eine Zurückweisung erwarten; dann bestätigen, dass die Ziehung überspringbar und ihre Liquidität unberührt ist. |
| Eine verpasste Zuteilung verliert nichts | Das Fenster verstreichen lassen, spät zuteilen und prüfen, dass die Ernte verbucht ist, die angebotene Liquidität zurück in den Stufen ist und die Ziehung `Skipped` liest. |
| Eine zurückweisende Renditequelle hält die Uhr nicht an | Eine zurückweisende Quelle anschließen, eine Ziehung abschließen und Erfolg plus `HarvestFailed` erwarten. |
| Eine überzeichnete Stufe begrenzt, statt zu viel zu zahlen | Mehr Gewinner erzwingen, als die Stufe finanzieren kann, und prüfen, dass gezahlt nie über angeboten liegt. |
| Ein Beweis lässt sich nicht wiedereinspielen | Einen Zuteilungsbeweis gegen eine andere Ziehung erneut einreichen. Zurückweisung erwartet. |
| Niemand hebt mehr ab, als ihm gehört | Eigenschaftstest: Für jedes Konto überschreiten Abhebungen nie Einlage plus Gewinne. |
| Geld bleibt erhalten | Eigenschaftstest: Das Token-Guthaben des Vaults entspricht der gesamten Einlage plus allen nicht eingelösten Gewinnen, und das Token-Guthaben des Pools entspricht der Klartext-Liquidität plus jedem verschlüsselten Übertrag plus der angebotenen und noch nicht finalisierten Liquidität plus den beim Abschluss erhaltenen und noch nicht durch eine Zuteilung verbuchten Ernten. Dieser letzte Posten ist die Ernte zwischen dem Abschluss, der sie erhält, und der Zuteilung, die sie auf die Stufen verteilt, wenn sie zu keiner Stufe und keiner Ziehung gehört. |

## Was dieses Bedrohungsmodell nicht abdeckt

- Alles außerhalb der Blockchain: Ihr Gerät, den Umgang Ihrer Wallet mit Schlüsseln, den
  RPC-Endpunkt, den Sie nutzen, und Metadaten auf Netzwerkebene.
- Wirtschaftliche Angriffe auf den Renditeort selbst. Auf dem Mainnet wird das Vault-Risiko
  vollständig vom ERC-4626-Vault hinter Zamas Batcher geerbt.
- Formale Verifikation. Hearth ist mit ausgeführten Angriffen und Eigenschaftstests
  selbstgeprüft. Es wurde nicht von einem Dritten auditiert, und diese Seite ist der ehrliche
  Ersatz, kein Gegenstück.
