# Was privat bleibt

Bei Vertraulichkeit zählen drei Dinge: was verschlüsselt bleibt, ob die Ziehung nachweisbar
fair und nach Einzahlung gewichtet ist, und ob jedes Leck benannt ist. Diese Seite
beantwortet das erste und das dritte. Unsere Haltung ist, dass jede Naht selbst zu benennen
mehr wert ist als eine Behauptung, die niemand prüfen kann.

Alles hier ist für einen Pool geschrieben, und Hearth betreibt sieben davon, einen je
vertraulichem Token. Sie teilen sich nichts, die Anonymitätsmenge jedes Pools sind also
seine eigenen Sparer und sonst niemand, und einem Pool mit drei Sparern hilft es nicht,
dass ein anderer dreißig hat.

## Die Tabelle

| Wert | Zustand | Wer ihn lesen kann |
| --- | --- | --- |
| Ihre Einlage | Verschlüsselt | Nur Sie, per EIP-712-Signatur |
| Ihre nicht eingelösten Gewinne | Verschlüsselt | Nur Sie |
| Ihr zeitgewichtetes Gewicht, je Ziehung | Verschlüsselt | Nur Sie |
| Ihre Gutschrift, je Ziehung, und damit ob Sie gewonnen haben | Verschlüsselt | Nur Sie |
| Der Betrag, den Sie einzahlen | Von Ende zu Ende verschlüsselt | Nur Sie |
| Der Betrag, den Sie abheben | Von Ende zu Ende verschlüsselt | Nur Sie |
| **Das Gesamtgewicht des Pools für eine Periode** | **Verschlüsselt, nie veröffentlicht** | **Niemand** |
| Der Übertrag jeder Stufe zwischen den Abgleichen | Verschlüsselt | Niemand |
| Die Größenklasse, in die die Summe des Pools fiel, eine Zweierpotenz | Öffentlich nach Ende der Periode | Alle |
| Ob überhaupt jemand in der Periode ein Guthaben hielt | Öffentlich nach Ende der Periode | Alle |
| Der zufällige Seed jeder Ziehung | Öffentlich nach Ende der Periode | Alle |
| Die in jeder Ziehung geerntete Rendite | Öffentlich nach Ende der Periode | Alle |
| Preisgröße und angebotene Klartext-Liquidität jeder Stufe | Öffentlich ab dem Abschluss | Alle |
| Wie viele Preise die häufige Stufe gezahlt hat | Öffentlich eine Ziehung später | Alle |
| Wie viele Preise die mittlere Stufe gezahlt hat | Öffentlich eine Ziehung später | Alle |
| Wie viele Preise die Hauptpreis-Stufe gezahlt hat | Öffentlich eine Ziehung später | Alle |
| Die Liste der Sparer-Adressen | Öffentlich | Alle |
| Wann Sie eingezahlt, abgehoben oder ausgewertet wurden, und in welchem Batch | Öffentlich | Alle |
| Der Zähler für Nichtfinanziertes | Öffentlich beim Finalisieren | Alle |
| Sponsorbeträge und die Tröpfelrate | Öffentlich | Alle |
| Der Betrag, den Sie in den vertraulichen Token hinein oder aus ihm heraus wrappen | Öffentlich | Alle |
| Jeder Schwellenwert, den eine Adresse in einer Stufe übertreffen musste | Öffentlich berechenbar | Alle |

Diese Tabelle lässt sich auf zwei Arten lesen. Die linke Spalte der Geheimnisse ist genau
die personenbezogene Information, plus die zwei poolweiten Summen, die sich als getarnte
personenbezogene Information herausgestellt haben. Die rechte Spalte der öffentlichen
Tatsachen ist das, was ein Außenstehender braucht, um zu prüfen, dass die Ziehung ehrlich
war. Diese Aufteilung ist das Design.

## Was ein Beobachter herausfinden kann und was nicht

Ein Beobachter mit einem vollständigen Archiv-Node und unbegrenzter Geduld kann
zusammenstellen:

- Die vollständige Liste der Sparer und den genauen Block, in dem jeder gehandelt hat.
- Seed, Größenklasse, Ernte und Preisgrößen jeder Ziehung, und die Preiszahl jeder Stufe,
  eine Ziehung nach der zugehörigen Ziehung.
- Jeden Schwellenwert, den jede Adresse übertreffen musste. Er kann Ihre Leiter buchstäblich
  berechnen.
- Den gesamten Bestand des Pools an seinem vertraulichen Token als verschlüsseltes Handle,
  das er nicht lesen kann.

Er bekommt nicht:

- Irgendein einzelnes Guthaben, zu irgendeinem Zeitpunkt.
- Irgendein einzelnes Gewicht, also auch niemandes Chancen.
- Welche Adressen eine Ziehung gewonnen haben, oder wie viel jemand ausgezahlt bekam.
- Das genaue Gesamtgewicht des Pools, nur die Zweierpotenz darüber.

Die Lücke zwischen diesen beiden Listen ist das, was Hearth verkauft. Der Rest dieser Seite
ist die ehrliche Aufstellung, wo diese Lücke schmaler wird.

## Regel 1: die Größenklasse, und das Leck, das wir beseitigt haben

Bis zum 3. September 2026 veröffentlichte dieses Design bei jeder Ziehung das genaue
gesamte zeitgewichtete Guthaben `W` des Pools, mit dem Argument, dass genau diese
Veröffentlichung die Ziehung nachprüfbar mache. Eine Prüfung hat dieses Argument als zu
teuer erwiesen.

Hier ist das Leck, in den Worten des Prüfers. Für jede abgeschlossene Periode `p` gilt
`W_p = B * L + Summe über jede Aktion von D_i * (periodEnd(p) - t_i)`, wobei `B` die
gesamte in die Periode getragene Einlage ist und `D_i` die vorzeichenbehaftete Änderung
jeder Aktion. `B`, `L`, `periodEnd(p)` und jedes `t_i` sind öffentlich, denn die Ein- und
Auszahlungsereignisse tragen die Zeitstempel. Also lässt sich **bei einem Sparer, der als
Einziger in einer Periode Geld bewegt hat, dieser Betrag aus den zwei veröffentlichten
Summen und dem öffentlichen Zeitstempel seiner eigenen Transaktion wiederherstellen.** Nicht
eingegrenzt, exakt wiederhergestellt, Rest null. Es wird mit mehr Daten schlimmer, nicht
besser: Jede abgeschlossene Periode ist eine weitere Gleichung, jede Aktion eine Unbekannte,
die Kette ist bei null verankert, und die Ereignisse nennen, wer wann gehandelt hat, auch
zwei Beweger zwischen zwei ruhigen Perioden werden also exakt wiederhergestellt.

Dieses Leck ist weg, weil die Zahl, die es braucht, nicht mehr veröffentlicht wird. Der
Vault veröffentlicht jetzt die Größenklasse: die kleinste Zweierpotenz bei oder über `W`,
geschrieben `M`. Fünf verschlüsselte Vergleiche je Ziehung verfolgen, wo `W` relativ zur
Größenklasse der letzten Ziehung liegt, und nur die kleine Zahl, zu der sie sich addieren,
wird entschlüsselt. Zwischen den Überquerungen einer Zweierpotenz veröffentlichen
aufeinanderfolgende Ziehungen dieselbe Zahl, und ihre Differenz ergibt null.

Übrig bleibt eine viel kleinere Fassung derselben Sache.

- **Ein Sparer.** Die veröffentlichte Größenklasse ist das Gewicht dieses Sparers auf den
  Faktor zwei genau.
- **Zwei Sparer.** Jeder kann sein eigenes Gewicht abziehen und das des anderen eingrenzen,
  wieder auf den Faktor zwei genau.
- **Drei oder mehr.** Jede mit der Größenklasse verträgliche Aufteilung ist möglich, und
  die Menge wächst mit jedem weiteren Sparer.

Die App weist über jedem Bildschirm darauf hin, sobald der Pool weniger als drei Sparer
hat. Zamas eigene Dokumentation macht denselben Punkt zu ihrem Batcher, mit denselben
Worten: "die Summe eines Wertes ist der Wert." Eine Größenklasse ist eine schwächere
Fassung dieses Satzes, kein Ausweg daraus.

## Regel 2: Ein Guthaben, das ein Beobachter festnageln kann, hat bei der Ziehung überhaupt keine Privatsphäre

Das ist die schärfste einzelne Aussage dieser Seite, sie bekommt deshalb ihre eigene Regel.

Der Gewinntest ist eine deterministische Funktion eines Geheimnisses, Ihres Gewichts, und
ansonsten vollständig öffentlicher Daten. Schwellenwerte sind bewusst öffentlich, denn sie
sind es, was die Ziehung nachprüfbar macht. Also **berechnet jeder, der Ihr Guthaben
festnageln kann, Ihr Gewonnen oder Verloren für jede Stufe jeder Ziehung, ganz ohne
Entschlüsselung**, und auch für jede spätere Ziehung, denn Gewinne liegen in einem
getrennten Guthaben, das nie in die Chancen eingeht.

Ein Guthaben wird üblicherweise über die Wrapping-Naht aus Regel 3 festgenagelt: Einen
öffentlichen Token in seine vertrauliche Form zu wrappen ist eine öffentliche Bewegung, ein
Sparer, der wrappt und Sekunden später denselben
Betrag einzahlt, hat seine Einzahlung veröffentlicht. Von da an sind seine Ziehungsergebnisse
öffentliche Rechnung.

Selbst eine lose Schranke beißt. Ein Beobachter, der nur eine Obergrenze für Ihr Guthaben
hat, beweist eine sichere Niederlage in jeder Stufe, deren Schwellenwert über dieser
Schranke liegt.

Was die App dagegen tut: Sie hält Abschirmen und Einzahlen als getrennte Schritte des
Einzahlen-Bildschirms und sagt Ihnen auf dem Abschirmen-Schritt in einem Absatz, eine runde
Zahl zu nehmen, damit eine Abschirmung ein Eimer und keine exakte Einzahlung ist, zu einem
Zeitpunkt Ihrer Wahl abzuschirmen und einen Teil davon später einzuzahlen, sodass eine
Einzahlung aus einer Ansammlung unbekannter Zusammensetzung stammt. Was keine
Vertragsänderung kann, ist einen Schwellenwert privat machen, denn ein privater
Schwellenwert ist eine unprüfbare Ziehung.

## Regel 3: die Wrapping-Naht, in beide Richtungen

Einen öffentlichen Token in seine vertrauliche Form zu verwandeln ist eine öffentliche
ERC-20-Bewegung. Der Betrag erscheint
im `Wrap`-Ereignis des Wrappers, im `Transfer` des zugrunde liegenden Tokens und noch
einmal im Eintrag des Koprozessors über die Verschlüsselung dieses Klartexts. Es gibt keinen
vertraulichen Weg, einen öffentlichen Token umzuwandeln.

Wir haben die Korrelation an unserem eigenen früheren Deployment gemessen. Beim Durchsuchen
der Sepolia-Blöcke 11528000 bis 11618500 lagen drei von fünf Einzahlungen zwei bis vier
Blöcke nach einem öffentlichen Wrap von genau 100 USDC durch dieselbe Adresse. Jeder, der
öffentliche Logs liest, konnte diese drei Einzahlungen mit 100 USDC beziffern, ohne eine
einzige kryptografische Garantie zu brechen. Zama dokumentiert denselben Effekt für seinen
Batcher und nennt ihn Shield-Join-Korrelation.

Auch das Entwrappen veröffentlicht einen Betrag, und der erste der beiden Entwrap-Aufrufe
ist der, der es tut, ein Entwrappen, das nie abgeschlossen wird, leckt also trotzdem.
Daraus folgt eine zweite benannte Preisgabe: **Die kumulierten Gewinne werden zu einer
öffentlichen Untergrenze für jede Adresse, die vollständig hinein und wieder heraus
wrappt.** Für eine Adresse, deren einzige Gegenpartei in diesem vertraulichen Token
Hearth ist, ist die öffentliche entwrappte Summe minus der öffentlichen gewrappten Summe
genau die lebenslang abgehobenen Gewinne, abzüglich der Einlage und des vertraulichen
Guthabens, die diese Adresse noch hält. Beide sind verborgen und nicht negativ, die
Differenz ist also immer eine Untergrenze, und sie wird exakt, sobald die Adresse
leergeräumt ist.

Auf eine frische Adresse zu entwrappen hilft nicht, denn der vertrauliche Transfer an diese
Adresse ist selbst die Verbindung.

Was Hearth tut: getrennte Schritte, ein Hinweis auf dem Abschirmen-Schritt des Einzahlens,
eine Zeile auf diesem Schritt und noch einmal im Reiter "Zurück zu einfachem USDC" beim
Abheben, die Ihnen sagt, eine runde Zahl zu bewegen, und der Vorschlag, ein stehendes
vertrauliches Guthaben zurückzulassen. Der Betrag bleibt so oder so Ihre Eingabe; die App
bietet keinen festen Satz Stückelungen an. Was Hearth nicht kann: irgendetwas davon
beseitigen.

## Regel 4: die veröffentlichten Preiszahlen sind eine langsame Messung

Jeder Abgleich veröffentlicht, wie viele Preise eine Stufe gezahlt hat. Weil der
Schwellenwert jedes Sparers öffentlich ist, ist diese Zahl eine harte Nebenbedingung der
Form "wie viele dieser Sparer hatten ein Gewicht über ihrem eigenen veröffentlichten
Schwellenwert". Sie trägt nur wenige Bits, aber sie ist eine echte Messung, und sie summiert
sich.

**Ein Guthaben, das sich über viele Ziehungen nie ändert, wird durch diese Zahlen
fortlaufend eingegrenzt.** Ein Sparer, der einzahlt oder abhebt, setzt seine eigene
Unbekannte zurück und die Eingrenzung beginnt von vorn.

Zwei Dinge begrenzen die Geschwindigkeit. Die Zahlen sind grob: Nichts Feineres als eine
ganze Zahl von Preisen wird je preisgegeben. Und die Schwellenwerte sind von einem Angreifer
nicht wählbar, denn der Seed wird im Koprozessor gezogen und erst offengelegt, wenn seine
Periode abgeschlossen ist, niemand kann also eine Abfrage auf ein vermutetes Guthaben
richten.

Ein dritter Dämpfer war verfügbar, und dieses Deployment hat ihn bewusst aufgegeben.
`reconcileEvery[t]` legt fest, wie viele Ziehungen zwischen den Veröffentlichungen des
Übertrags einer Stufe liegen. Ihn zu erhöhen veröffentlicht eine Zahl je Spanne statt einer
je Ziehung, ein Jackpot wird also allen zugeschrieben, die über diese Spanne berechtigt
waren. Was das kostet, ist der Jackpot selbst: Ein Abschluss holt die gesamte öffentliche
Liquidität einer Stufe in die Ziehung, und dieses Geld kommt erst bei einem Abgleich
zurück, bei einem Takt von 24 ist die öffentliche Liquidität der Hauptpreis-Stufe in 23 von
24 Ziehungen also der Ernteanteil einer Ziehung, der veröffentlichte Preis wird daraus
bemessen, und der angesammelte Topf erscheint offen nur bei der Abgleichziehung. Das Geld
ist die ganze Zeit angeboten und zu gewinnen, im verschlüsselten Übertrag. Niemand kann es
sehen.

Also laufen alle drei Stufen mit `reconcileEvery = 1`. Der Topf wächst öffentlich, die Zahl
jeder Stufe wird eine Ziehung später öffentlich, und die obige Messung läuft mit ihrer
vollen Rate von einer Zahl je Stufe und Ziehung. Bei der Hauptpreis-Stufe heißt das, dass
eine Auszahlung auf die in dieser einen Ziehung berechtigten Sparer zeigt, rund vier Prozent
des Pools, statt auf einen Tag davon. Das ist ein offengelegter Rest, kein abgemilderter,
und es ist Grenze 14. Der Takt ist weiterhin ein Konstruktor-Argument, ein Deployment, das
die langsamere Messung will, kann sie also haben.

## Regel 5: die Token-Ebene gehört Zama, nicht uns

Der Wert jedes Pools ist einer von Zamas vertraulichen Token. Das ist Absicht, und es heißt,
dass die Befugnisse des Tokens für Geld gelten, das durch Hearth fließt, Pool für Pool:
sieben Wrapper, dieselben Befugnisse bei jedem. Beim Namen genannt:

Der Sepolia-Vertrag ist ein `ConfidentialWrapper` hinter einem upgradebaren Proxy, im
Eigentum von Zama, mit zweistufigem Eigentum und deaktiviertem Verzicht. Der verifizierte
Quelltext, gelesen am 2. September 2026, ergibt drei Tatsachen, die für die Privatsphäre
zählen:

1. **Beobachter, rückwirkend.** Der Eigentümer kann `addObserver(address)` aufrufen, was
   dieser Adresse eine pauschale Nutzerentschlüsselung über jedes Handle gewährt, auf dem
   der Token-Vertrag Rechte hält. Das umfasst jeden Einzahlungsbetrag, jede
   Abhebungsauszahlung und jeden Preisfinanzierungsbetrag je Batch, den der Pool an den
   Vault sendet. Das entscheidende Wort ist rückwirkend: Ein zu irgendeinem späteren
   Zeitpunkt ernannter Beobachter kann Beträge entschlüsseln, die bereits auf der Blockchain
   stehen, "auf `ObserverAdded` achten und aussteigen" ist also keine Verteidigung.
   Live-Zustand am 2. September 2026: `observerCount()` ist 0 und `observers()` ist leer.
2. **Sperrliste und Pause.** Der Eigentümer kann eine Adresse sperren, was sie am
   Einzahlen, Abheben oder Entwrappen hindert, denn jedes davon ist eine Token-Aktualisierung
   mit dieser Adresse auf einer Seite. Eine Pausierer-Rolle existiert; live steht sie auf
   der Nulladresse, das Pausieren ist derzeit also deaktiviert.
3. **Upgradebarkeit.** Die Implementierung kann von ihrem Eigentümer ersetzt werden, das
   Verhalten des Tokens, einschließlich seines Umgangs mit den Handles, auf denen er Rechte
   hält, kann sich also unter uns ändern.

Beachten Sie den genauen Umfang von Punkt 1. Es gibt bei Hearth keinen Preistransfer je
Sparer, also gibt es keine Auszahlung je Gewinner, die ein Beobachter lesen könnte. Was sich
auf der Token-Ebene bewegt, ist ein Finanzierungstransfer je Auswertungs-Batch, vom Pool zum
Vault, der die Gesamtgutschrift aller in diesem Batch trägt. Ein Batch mit einem einzigen
Sparer macht diese Summe zum exakten Preis dieses Sparers, und der Live-Pool mit fünf
Sparern bei einer Batch-Größe von 4 endet jeden Durchlauf mit einem Batch von einem.
`evaluate` ist erlaubnisfrei und nimmt seine Batch-Größe vom Aufrufer, es lässt sich also
kein Mindest-Batch erzwingen. [Grenze 7](../limitations.md) hält es als akzeptierten Rest
fest und nennt die vertragsseitige Korrektur.

Was ein Beobachter auf der Token-Ebene nicht bekäme, ist Hearths eigenes Kontobuch. Ihre
Einlage, Ihre Gewinne, Ihr Gewicht und Ihre Gutschrift liegen im Speicher des Vaults, und
der Token hat auf keinem davon Zugriffsrechte. Wir haben das am vorherigen Deployment
geprüft: Die Token-Adresse gibt für die Berechtigung auf den Gewinn- und Einlage-Handles
eines Einzahlers Falsch zurück, während der Einzahler und der Pool Wahr zurückgeben.

Die ehrliche Aussage lautet also: Wer Hearth nutzt, vertraut Zamas Wrapper die Beträge an,
die ihn kreuzen, genau wie jede ERC-7984-App es tut. Ihre Position vertrauen Sie ihm nicht
an.

Die Alternative wäre gewesen, einen eigenen vertraulichen Token zu schreiben, wie es
mehrere Projekte in diesem Feld getan haben. Das tauscht einen bekannten, geprüften, von
Zama betriebenen Vertrag gegen einen, den wir selbst benoten würden. Uns ist lieber, die
echte Vertrauensgrenze zu dokumentieren, als eine kleinere herzustellen.

## Regel 6: die Auswertung verrät nichts, und niemand wählt die Reihenfolge

`evaluate(drawId, count)` nimmt eine Zahl, keine Liste von Adressen. Der Vault läuft die
Sparerliste ab einem aus dem Seed dieser Ziehung abgeleiteten Startpunkt in
Listenreihenfolge ab, und der Aufrufer entscheidet nur, wie weit. Ein Sparer, der sein
eigenes Ergebnis will, treibt denselben Durchlauf voran, den auch der Keeper vorantreibt.

Das schließt zwei Dinge auf einmal.

Es schließt den Selbstauswertungs-Verräter. In einer früheren Fassung nahm die Auswertung
eine Liste von Adressen, ein Sparer konnte also sein eigenes Ergebnis aus den öffentlichen
Eingaben berechnen und dann nur dann für die Auswertung zahlen, wenn er gewonnen hatte.
Diese Transaktion zu senden wäre ein ebenso lauter Gewinner-Verräter gewesen wie eine
Einlöse-Funktion. Jetzt gibt es keine Transaktion, die nur ein Gewinner senden würde.

Es schließt den Reihenfolge-Hebel. Wenn eine Stufe überzeichnet ist und leerläuft, kommt
der, den der Durchlauf zuletzt erreicht, zu kurz. Diese Reihenfolge legt der Seed fest,
niemand kann sich also mit Gas einen besseren Platz kaufen, und der Startpunkt wandert bei
jeder Ziehung, keine Adresse ist also systematisch die letzte. Die Folge für die Fairness
ist unter [Preise und Stufen](../concepts/prizes-and-tiers.md) beschrieben und ist Grenze
11.

Jeder in einer Ziehung ausgewertete Sparer bekommt dieselben Schreibvorgänge, in derselben
Form, ob er gewonnen hat oder nicht, denn die Auszahlung läuft über eine verschlüsselte
Auswahl statt über eine Verzweigung. In welchem Batch ein Sparer gelandet ist und an welcher
Stelle darin, ist öffentlich und sagt nichts über sein Ergebnis.

## Regel 7: der verhaltensbedingte Rest

Hearth hat keine Einlöse-Transaktion, es gibt also keine gewinnerförmige Handlung, nach der
man Ausschau halten könnte. Zu erfahren, dass Sie gewonnen haben, ist eine Signatur
außerhalb der Blockchain, die nichts berührt, und der Einlöse-Button der App, der den Betrag
trägt, sendet eine gewöhnliche Abhebung, die wie jede andere Abhebung aussieht.

Der Rest ist, was Sie danach tun. Ein Sparer, der nach jeder gewonnenen Ziehung sofort
abhebt und sonst nie, gibt einem Beobachter mit der Zeit einen statistischen Hinweis. Er ist
schwach, er braucht viele Ziehungen, um sich aufzubauen, und er liegt ganz in der Hand des
Sparers. Die Gegenmaßnahme ist verhaltensbezogen, nicht kryptografisch: Heben Sie nach Ihrem
eigenen Zeitplan ab, oder lassen Sie Gewinne auflaufen.

Wir sagen das, weil die Alternative, zu behaupten, Verhalten auf der Blockchain verrate
nichts, in jedem Entwurf dieser Art falsch ist. Projekte in diesem Feld, die ihre
Einlöse-Funktion entfernt haben, kamen zum selben Schluss und haben es aufgeschrieben. Wir
auch.

## Was diese Seite nicht abdeckt

Sie deckt keine Angreifer und ihre Beweggründe ab, das ist das
[Bedrohungsmodell](threat-model.md). Sie deckt nicht ab, wie Sie eine Ziehung selbst prüfen,
das ist [Zufall und Nachprüfbarkeit](randomness-and-verification.md). Und sie erhebt keinen
Anspruch auf Privatsphäre auf Netzwerkebene: die IP-Adresse, von der aus Sie sich verbinden,
der RPC-Anbieter, den Sie nutzen, und die Relayer-Anfrage, die Sie senden, liegen außerhalb
der Blockchain und außerhalb dieser Analyse.
