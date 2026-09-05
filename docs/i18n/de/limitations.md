# Grenzen

Jede Einschränkung, die wir kennen, nummeriert, an einem Ort. Andere Seiten verweisen auf
diese Nummern.

Der Grund für diese Seite ist einfach. Eine Vertraulichkeitsaussage ist nur so viel wert wie
die Nähte, die der Autor zu benennen bereit war. Alles darunter, was Sie später überrascht,
ist unser Versäumnis und keine Entdeckung.

## 1. Die Auswertung läuft in Batches, und Batches sind gedeckelt

Der Gewinntest läuft über verschlüsselte Zahlen, und Zama deckelt eine einzelne Transaktion
auf Sepolia bei 20.000.000 Recheneinheiten mit 5.000.000 in sequenzieller Tiefe. Die
Auswertung eines Sparers kostet
`3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)` davon, es passen also höchstens `4` Sparer, die
verschlüsselte Arbeit brauchen, in einen Aufruf.

**Was das heißt:** Ein Pool mit vielen Sparern braucht viele Transaktionen je Ziehung. Die
Kosten wachsen linear mit der Zahl der Sparer, und sie werden in Gas von dem gezahlt, der
auswertet.

**Was es nicht heißt:** Es gibt keine Obergrenze dafür, wie viele Sparer der Pool trägt.
Mehrere Projekte in diesem Feld deckeln die Teilnahme bei 32 Adressen. Hearth deckelt die
Teilnahme gar nicht; es deckelt, wie viele in eine Transaktion passen. `evaluate` nimmt jede
Anzahl, ein kleinerer Batch braucht also kein Redeployment.

## 2. Das Zwei-Perioden-Fenster, und Preise, die verfallen

Eine Ziehung muss in den zwei Perioden, die auf sie folgen, abgeschlossen, zugeteilt und
ausgewertet werden. Das sind zwei Stunden im USDC-Pool und ein halber Tag in den
Sechs-Stunden-Pools. Der Abschluss hat eine noch engere Frist: die Mitte der zweiten
dieser Perioden, damit der Entschlüsselungs-Rundlauf und die Zuteilung immer mindestens eine
halbe Periode übrig haben. Nach dem Schließen des Fensters ist die Ziehung vorbei.

**Was das heißt:** Ein Sparer, den der Auswertungsdurchlauf innerhalb des Fensters nicht
erreicht, verliert diese Ziehung, auch wenn seine Schwellenwerte sagen, dass er gewonnen
hat. Sein Anteil an der Liquidität der Stufe faltet sich in den Übertrag der Stufe und
finanziert eine spätere Ziehung. Das ist dasselbe Verhalten wie bei einem verfallenden nicht
eingelösten Preis in PoolTogether V5, und es ist der einzige Fall im System, in dem ein
echter Sparer etwas verliert, das er hätte haben können.

**Warum es das Fenster gibt:** Es begrenzt, wie weit zurück der Vault Guthaben erinnern muss,
und das ist es, was drei gespeicherte Beobachtungen je Sparer ausreichen lässt. Ein Fenster
von einer Periode wurde probiert und war gegen einen langsamen Relayer zu zerbrechlich.

**Was es abmildert:** Der Keeper läuft die ganze Liste ab, jeder kann den Durchlauf aus der
App weiter voranbringen, und der Durchlauf startet bei jeder Ziehung an einem anderen Punkt,
niemand sitzt also dauerhaft am Ende der Schlange.

## 3. Es gibt eine Obergrenze dafür, wie viel ein Sparer halten kann

Einzahlungen werden abgelehnt, wenn der Betrag oder die resultierende Einlage über
`maxPrincipal = (2^64 - 1) / periodLength` liegt. Bei einer Periode von einer Stunde sind das
etwa 5 Milliarden Token, bei der Sechs-Stunden-Periode der anderen Pools etwa 854 Millionen,
und bei einer Tagesperiode wären es etwa 213 Millionen.

**Was das heißt:** Die Obergrenze ist real, und bei einer Tagesperiode auf dem Mainnet ist es
eine Zahl, die eine große Institution erreichen könnte.

**Warum es sie gibt:** Verschlüsselte Werte sind hier 64 Bit breit, und die aufgelaufenen
Guthaben-Sekunden eines Sparers müssen darin bleiben. Ein verschlüsselter Überlauf weist nicht
zurück und niemand sieht ihn passieren, die Obergrenze wird deshalb an der Tür durchgesetzt.
Die Prüfung begrenzt den eingehenden Betrag ebenso wie die resultierende Summe, denn sonst
ergäbe eine Einzahlung, die groß genug ist, um die Summe über `2^64` umlaufen zu lassen, eine
kleine Zahl, die die Prüfung besteht.

**Wie sich die Ablehnung verhält:** Sie kommt als verschlüsseltes Falsch zurück und der Token
erstattet die Einzahlung in derselben Transaktion, an die Obergrenze zu stoßen verrät also
Ihr Guthaben nicht.

## 4. Keine Reservestufe

PoolTogether V5 hält einen Reserveanteil, der eine überzeichnete Stufe auffüllt. Hearth hat
keine Reserve. Die Auslastungsrate von 50 Prozent ist das einzige Polster.

**Was das heißt:** Wenn eine Stufe mehr Preise ausschüttet, als sie finanzieren kann, was bei
der häufigen Stufe in höchstens rund 2 Prozent der Ziehungen vorkommt, bekommen die Sparer,
die der Durchlauf zuletzt erreicht, weniger oder nichts, statt aufgefüllt zu werden.

**Warum:** Eine Reserve braucht einen vom Eigentümer kontrollierten Auszahlungsweg, um
nützlich zu sein, und jede Eigentümermacht in einem vertraulichen Pool ist etwas, dem ein
Sparer vertrauen muss.

## 5. Die Chancen der Hauptpreis-Stufe werden über eine Periode gemessen

V5 misst die Chancen der Hauptpreis-Stufe über das gesamte Ansparfenster der Stufe. Hearth
misst sie über eine einzige Periode, wie jede andere Stufe.

**Was das heißt:** Ein großer Halter, der für eine Periode dazukommt, nimmt einen vollen
anteiligen Schuss auf einen Topf, der 24 Perioden brauchte. Wer über alle 24 gespart hat, hat
keinen zusätzlichen Anspruch darauf.

**Die bekannte, aufgeschobene Korrektur:** die Guthaben-Sekunden seit der letzten
Hauptpreis-Auszahlung ansammeln und die Hauptpreis-Stufe danach gewichten. Das fügt einen
zweiten Akkumulator mit eigener Überlaufanalyse hinzu, es ist also eine Änderung für Version
zwei und keine unbewiesene Ergänzung zu Version eins.

## 6. Privatsphäre braucht drei oder mehr Sparer

Das genaue gesamte zeitgewichtete Guthaben des Pools wird nie veröffentlicht. Veröffentlicht
wird bei jeder Ziehung die kleinste Zweierpotenz darüber, denn die Ziehung braucht eine
öffentliche Skala, an der sie laufen kann.

**Das Leck, das das ersetzt hat:** Die genaue Summe zu veröffentlichen erlaubte es jedem, den
Einzahlungsbetrag eines einzelnen Bewegers exakt wiederherzustellen. Zwei aufeinanderfolgende
Summen, die öffentlichen Zeitstempel der Ein- und Auszahlungsereignisse, und die Rechnung ist
eine einzige Division ohne Rest. Das war das Design bis zum 3. September 2026, und eine
Prüfung hat es gebrochen.

**Was es jetzt heißt:** Bei einem Sparer ist die veröffentlichte Größenklasse das Gewicht
dieses Sparers auf den Faktor zwei genau. Bei zweien kann jeder den anderen genauso
eingrenzen. Unter drei Sparern gibt es keine sinnvolle Anonymitätsmenge. Aufeinanderfolgende
Größenklassen lassen sich weiterhin differenzieren, sie sind aber gleich, solange der Pool
keine Zweierpotenz überquert hat, das Differenzieren ergibt also ein Band und keine Zahl.

**Was die App tut:** Sie sagt das, sobald der Pool weniger als drei Sparer hat, statt eine
Datenschutzaussage zu zeigen, die bei dieser Größe nicht stimmt.

## 7. Die Token-Ebene gehört Zama, und ihre Befugnisse gelten

Hearths Wert ist Zamas vertraulicher USDC-Wrapper, nicht unserer.

**Was das heißt:** Sein Eigentümer kann Beobachter ernennen, die jeden Betrag entschlüsseln
können, der durch den Token fließt, und zwar **rückwirkend**, bereits auf der Blockchain
stehende Beträge liegen also gegenüber einem später ernannten Beobachter offen. Die Ernennung
zu überwachen und auszusteigen ist keine Verteidigung. Der Umfang sind Einzahlungsbeträge,
Abhebungsauszahlungen, das eigene Guthaben des Pools und der eine Preisfinanzierungstransfer
je Auswertungs-Batch. Der Eigentümer kann außerdem eine Adresse sperren, und der Vertrag ist
upgradebar. Am 2. September 2026 gab es keine Beobachter und der Pausierer war nicht gesetzt.

**Was es nicht erreicht:** Hearths eigenes Kontobuch. Einlage, Gewinne, Gewichte je Ziehung
und Gutschriften je Ziehung liegen im Vault, und der Token hält darauf keine Zugriffsrechte.

**Eine Folge für das Produkt, und jeder Live-Pool trifft sie in jeder Ziehung:** Der
Finanzierungstransfer eines Batches trägt die Gesamtgutschrift aller in diesem Batch, ein
Batch von einem trägt also unter der Beobachterannahme den exakten Preis eines Sparers. Der
letzte Batch des Durchlaufs enthält einen einzigen Sparer, wann immer die Sparerzahl kein
Vielfaches der Batch-Größe ist. Jeder der sieben Pools ist mit fünf Sparern bei einer
Batch-Größe von 4 bestückt (`KEEPER_BATCH`, `packages/keeper/src/config.ts`), jede Ziehung
endet also mit einem Batch von einem, und das `Evaluated`-Ereignis in derselben Transaktion
nennt den Sparer, zu dem er gehört.

Die sieben Pools sind sieben getrennte Wrapper mit sieben getrennten Eigentümerbefugnissen,
das gilt also Pool für Pool statt einmal über alle.

Kein Mindest-Batch kann das beheben, denn `evaluate(uint32,uint256)`
(`packages/contracts/contracts/HearthVault.sol`) ist erlaubnisfrei und nimmt die Batch-Größe
vom Aufrufer, jeder Beobachter kann also einen Batch von einem erzwingen, was der Keeper auch
tut. Wir halten es als akzeptierten Rest fest: Es beißt nur unter der Beobachterannahme, und
live ist `observerCount()` 0. Die aufgeschobene vertragsseitige Korrektur: Gutschriften je
Ziehung ansammeln und einen Finanzierungstransfer beim Finalisieren senden, oder jede
Batch-Summe auffüllen.

**Die Alternative, die wir verworfen haben:** einen eigenen vertraulichen Token schreiben. Das
tauscht einen bekannten, geprüften, von Zama betriebenen Vertrag gegen einen, den wir selbst
benoten.

## 8. Ziehungen hängen davon ab, dass jemand Transaktionen sendet

Auf der Blockchain löst nichts von selbst aus.

**Was das heißt:** Läuft kein Keeper und handelt kein Sparer, wird eine Ziehung übersprungen
und diese Periode zahlt keinen Preis. Ein Abschluss, der seine Frist verpasst, wird glatt
abgelehnt, statt die Ziehung stranden zu lassen, und eine Zuteilung, die nach dem Fenster
landet, verbucht trotzdem die Ernte, gibt die angebotene Liquidität zurück und markiert die
Ziehung als `Skipped`.

**Was es nicht heißt:** Geld in Gefahr. Eine übersprungene Ziehung behält ihre Liquidität in
den Stufen, die Ernte wird von einer späten Zuteilung verbucht, und Ein- und Auszahlungen
bleiben durchgehend unberührt.

**Was es abmildert:** Jeder Schritt ist erlaubnisfrei und die App bietet sie an, jeder Sparer
kann eine Ziehung also voranbringen. Der Pool implementiert außerdem Chainlinks
Automatisierungsschnittstelle für den Abschlussschritt, den einzigen Schritt, der keine Daten
von außerhalb der Blockchain braucht, und den einzigen mit einer Frist, aber auf keinem der
sieben Pools ist ein Upkeep registriert, heute sind die Keeper und die App also das Ganze.
Jeder Pool hat seinen eigenen Keeper-Prozess auf seinem eigenen Konto, ein Keeper, der stehen
bleibt, oder ein Konto, dem das Sepolia-ETH ausgeht, kostet diesen Pool also seine Ziehungen
und lässt die anderen sechs laufen.

## 9. Die Rendite auf Sepolia ist gesponsert, nicht verdient

Das Preisgeld jedes Pools kommt aus seinem eigenen vom Sponsor finanzierten Guthaben, das mit
einer festen Rate tröpfelt.

**Was das heißt:** Es ist keine echte Rendite. Niemand verdient sie durch Verleihen oder aus
einem Vault. Ist das gesponserte Guthaben aufgebraucht, hören die Preise auf. Ein Sponsoring
lässt sich nach der Zusage nicht zurückholen, und nur der Eigentümer der Quelle kann die Rate
ändern.

**Warum:** Es gibt auf Sepolia keinen Ort, der Rendite auf Zamas Mock-Token zahlt. Aave lehnt
diese Einzahlungen ab, Compound will Circles eigenes USDC, und Zamas Sepolia-Vault ist reiner
Leerlauf ohne Rendite-Adapter, so beschreibt Zama ihn selbst.

**Was daran echt ist:** Jede Einheit Preisgeld wurde wirklich gewrappt, wirklich als
verschlüsselter Transfer an den Pool geschickt und wirklich über eine KMS-signierte
Entschlüsselung geprüft, bevor sie gutgeschrieben wurde. Eine Quelle, die zurückweist, hält
eine Ziehung auch nicht mehr auf: Die Ernte wird als null verbucht, `HarvestFailed` wird
geworfen und der Abschluss gelingt. Die Herkunft des Geldes ist ein Mock. Die Mechanik nicht.

## 10. Die Wrapping-Naht, und was ein festnagelbares Guthaben kostet

Öffentliches USDC in vertrauliches USDC zu verwandeln ist ein öffentlicher Transfer, der
Betrag ist also sichtbar.

**Was das heißt:** Ein Sparer, der wrappt und sofort denselben Betrag einzahlt, hat seine
Einzahlung veröffentlicht. Wir haben das an unserem eigenen früheren Deployment gemessen:
Drei von fünf Live-Einzahlungen lagen zwei bis vier Blöcke nach einem öffentlichen Wrap von
genau 100 USDC.

**Was es über den Betrag hinaus kostet:** Schwellenwerte sind öffentlich, denn sie sind es,
was die Ziehung nachprüfbar macht. Ein Guthaben, das ein Beobachter festnageln kann, hat also
in jeder Ziehung und jeder Stufe ein öffentliches Ergebnis, berechnet ganz ohne
Entschlüsselung, und in jeder späteren Ziehung ebenso, denn Gewinne gehen nie in die Chancen
ein. Selbst eine lose Obergrenze beweist eine sichere Niederlage in jeder Stufe, deren
Schwellenwert darüber liegt.

**Was Hearth tut:** Es hält Wrappen und Einzahlen als getrennte Schritte, sagt Ihnen beim
Wrappen, eine runde Zahl zu nehmen, damit das Wrappen ein Eimer und keine exakte Zahl ist,
warnt beim Einzahlen, und lässt einen Sparer ein stehendes vertrauliches Guthaben halten,
sodass eine Einzahlung aus einer Ansammlung unbekannter Zusammensetzung stammt.

**Was Hearth nicht kann:** es beseitigen. Es gibt keinen vertraulichen Weg, einen öffentlichen
Token umzuwandeln, und keinen Weg, einen Schwellenwert privat zu machen, ohne die Ziehung
unprüfbar zu machen.

## 11. Die Reihenfolge des Durchlaufs entscheidet, wer in einer überzeichneten Stufe zu kurz kommt

Läuft eine Stufe mitten in der Ziehung leer, bekommt der Sparer, den der Durchlauf in diesem
Moment erreicht, den Rest, und die späteren bekommen aus dieser Stufe nichts.

**Was das heißt:** In der seltenen überzeichneten Ziehung kommt jemand durch eine Position zu
kurz, die er nicht gewählt hat.

**Was es nicht mehr ist:** ein Hebel. Eine frühere Fassung ließ den Aufrufer von `evaluate`
eine Liste von Adressen übergeben, was die Reihenfolge in die Hand des Keepers legte und es
einem Sparer erlaubte, sich den Anfang der Schlange zu kaufen. Jetzt übergibt der Aufrufer
eine Anzahl, der Durchlauf startet an einem aus dem Seed der Ziehung abgeleiteten Punkt, und
der Start wandert bei jeder Ziehung.

**Was es abmildert:** Der betroffene Sparer kann es sehen, denn sein Gewicht und seine
Gutschrift für die Ziehung sind beide von ihm entschlüsselbar, eine zu kleine Gutschrift ist
also belegbar statt rätselhaft.

## 12. Die Ziehung läuft gegen eine Größenklasse, eine Stufe zahlt also zwischen der Hälfte und allen ihren Preisen

Der Gewinntest nutzt `M`, die kleinste Zweierpotenz über dem Gesamtgewicht des Pools, anstelle
der Summe selbst. `M` liegt damit zwischen `W` und `2W`.

**Was das heißt:** Die erwartete Preiszahl jedes Sparers wird mit `W / M` skaliert, einer Zahl
zwischen einem halb und eins, eine Stufe zahlt also je Ziehung zwischen der Hälfte und allen
ihren nominellen `count * odds` Preisen. Ein Pool, der gerade eine Zweierpotenz überquert hat,
zahlt am unteren Rand dieser Spanne, bis er in seine Klasse hineinwächst.

**Was es nicht heißt:** verlorenes Geld oder verzerrte Chancen. Jeder Sparer einer Stufe wird
mit demselben Faktor skaliert, niemandes Anteil ändert sich also gegenüber dem eines anderen.
Was eine Stufe nicht zahlt, geht in ihren verschlüsselten Übertrag und wird erneut angeboten,
die Preise pendeln sich also irgendwo zwischen den nominellen Zahlen und ihrem Doppelten ein,
und die ganze Rendite geht weiterhin hinaus.

**Warum wir das genommen haben:** Die Alternative war, die genaue Summe zu veröffentlichen,
das ist Grenze 6.

## 13. Kumulierte Gewinne werden öffentlich, wenn Sie durch den Wrapper hin und zurück gehen

Hinein- und Herauswrappen sind auf der Token-Ebene beide öffentliche Bewegungen, und der erste
der beiden Entwrap-Aufrufe ist der, der den Betrag veröffentlicht, ein Entwrappen, das Sie nie
abschließen, hat ihn also schon verraten.

**Was das heißt:** Für eine Adresse, deren einzige Gegenpartei in vertraulichem USDC Hearth
ist, ist die öffentliche entwrappte Summe minus der öffentlichen gewrappten Summe eine
Untergrenze für die lebenslang abgehobenen Gewinne, und sie wird exakt, sobald diese Adresse
leergeräumt ist. Auf eine frische Adresse zu entwrappen hilft nicht, denn der vertrauliche
Transfer an diese Adresse ist selbst die Verbindung.

**Was es abmildert:** In runden Stückelungen ohne Bezug zu Ihrer Position entwrappen, oder ein
stehendes vertrauliches Guthaben zurücklassen und nie vollständig hin und zurück gehen.

## 14. Ein unbewegtes Guthaben wird durch die veröffentlichten Preiszahlen eingegrenzt

Jeder Abgleich veröffentlicht, wie viele Preise eine Stufe gezahlt hat. Weil jeder
Schwellenwert öffentlich ist, ist diese Zahl eine Nebenbedingung der Form "wie viele dieser
Sparer hatten ein Gewicht über ihrem eigenen veröffentlichten Schwellenwert", und
Nebenbedingungen summieren sich.

**Was das heißt:** Ein Sparer, dessen Guthaben sich über viele Ziehungen nie ändert, wird
durch diese Zahlen fortlaufend eingegrenzt. Ein Sparer, der einzahlt oder abhebt, setzt seine
eigene Unbekannte zurück.

**Was die Geschwindigkeit begrenzt:** Nichts Feineres als eine ganze Zahl von Preisen wird je
preisgegeben, und die Schwellenwerte sind von einem Angreifer nicht wählbar, denn der Seed
wird im Koprozessor gezogen und erst offengelegt, wenn seine Periode abgeschlossen ist.

**Was wir dagegen getan haben: nichts, und hier ist der Grund.** Der Vertrag hat genau dafür
einen Regler. `reconcileEvery[t]` ist die Zahl der Ziehungen zwischen den Veröffentlichungen
des Übertrags einer Stufe, und ihn bei der Hauptpreis-Stufe zu erhöhen würde eine Zahl je Tag
statt einer je Stunde veröffentlichen, ein Jackpot würde also allen im Lauf des Tages
Berechtigten zugeschrieben statt der Handvoll, die in einer Ziehung berechtigt ist. Der
Fairness-Lauf zeigte, was das kostet. Ein Abschluss holt die gesamte öffentliche Liquidität
einer Stufe in die Ziehung und sie kommt erst bei einem Abgleich zurück, bei einem Takt von 24
ist die öffentliche Liquidität der Hauptpreis-Stufe in 23 von 24 Ziehungen also der
Ernteanteil einer Ziehung, und die Preisgröße wird daraus genommen, wobei der angesammelte
Topf offen nur bei der Abgleichziehung erscheint. Das Geld ist durchgehend angeboten und zu
gewinnen, im verschlüsselten Übertrag, aber niemand kann den Jackpot wachsen sehen.

Eine verborgene Zahl und ein sichtbarer, wachsender Jackpot lassen sich nicht beide haben, und
dieses Deployment hat den sichtbaren Jackpot gewählt. Alle drei Stufen laufen mit
`reconcileEvery = 1`, die obige Messung läuft also mit einer Zahl je Stufe und Ziehung. Der
Regler ist ein Konstruktor-Argument, und ein Deployment, dem die langsamere Messung mehr wert
ist als der sichtbare Topf, stellt ihn höher.

## Keine Grenze, aber deutlich zu sagen

- **Sechs der sieben Pools ziehen alle sechs Stunden, und das ist eine Gasentscheidung.** Eine
  Ziehung bei fünf Sparern kostet `8,456,388` Gas, sieben stündliche Pools würden auf Sepolia
  also etwa `1.43 ETH` am Tag ausgeben, womit öffentliche Faucets nicht mithalten können. Nur
  der zuerst ausgerollte USDC-Pool zieht weiterhin stündlich. Die Stufenchancen jedes Pools
  werden gegen seine eigene Periode gesetzt, der Preisrhythmus ist also auf beiden Uhren
  gleich.
- **Die sechzehn Sprachen sind maschinelle Übersetzung.** Die Texte der Oberfläche und die
  übersetzten Dokumentationsseiten wurden von einem Modell geschrieben, nicht von
  Muttersprachlern, und sind nicht professionell geprüft. Englisch ist die Quelle der Wahrheit
  für jede Zahl, jeden Vertragsnamen und jede Aussage auf dieser Seite, und eine nicht
  übersetzte Seite fällt auf Englisch zurück statt auf eine Vermutung.
- **Ein großer Sparer gewinnt oft.** Die Chancen sind proportional zum zeitgewichteten
  Guthaben, wer also viel und lange hält, gewinnt viel. Das ist das Design, kein Mangel.
- **Preisgrößen und Preiszahlen sind öffentlich.** Bei PoolTogether waren sie es immer.
  Vertraulich ist hier, wer gewonnen hat, nicht wie viel der Pool verdient hat.
- **Hearth wurde nicht von einem Dritten auditiert.** Es ist mit ausgeführten Angriffen und
  Eigenschaftstests selbstgeprüft, und das [Bedrohungsmodell](security/threat-model.md) ist der
  ehrliche Ersatz und kein Gegenstück.
