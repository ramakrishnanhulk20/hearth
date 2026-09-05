# Hearth Dokumentation

Hearth ist vertrauliches Gewinnsparen ohne Verlustrisiko auf dem Zama Protocol. Sie zahlen
einen vertraulichen Token ein, Ihr Guthaben bleibt auf der Blockchain verschlüsselt, die
Rendite des Pools wird in einer regelmäßigen Ziehung als Preise ausgeschüttet, und Ihre
Einlage können Sie jederzeit abheben. Niemand kann lesen, was Sie gespart oder was Sie
gewonnen haben. Wir auch nicht.

Auf Sepolia laufen sieben Pools, einer je vertraulichem Token, den Zama dort
veröffentlicht, jeder mit eigenen Verträgen und eigenem Keeper. Die meisten Seiten unten
rechnen ihre Beispiele mit USDC, weil dieser Pool die längste Historie hat; beschrieben
werden aber immer alle sieben.

Diese Seiten sind die vollständige schriftliche Aufzeichnung darüber, wie Hearth
funktioniert und was es nicht verbirgt. `ARCHITECTURE.md` im Wurzelverzeichnis des
Repositorys ist die Implementierungsspezifikation; dieser Ordner erklärt dasselbe Design
für die Menschen, die es benutzen, und für die, die es prüfen.

## Seiten

| Seite | Worum es geht |
| --- | --- |
| [Was Hearth ist](getting-started/what-is-hearth.md) | Das Produkt auf einer Seite: die vier Schritte eines Sparers und was jeder davon genau verbirgt. |
| [Auf Sepolia ausprobieren](getting-started/try-it-on-sepolia.md) | Einen der sieben Token wählen, sein Faucet, abschirmen, einzahlen, eine Ziehung, aufdecken, einlösen, abheben, Abschirmung aufheben. |
| [Pools und Token](concepts/pools-and-tokens.md) | Die sieben Pools und ihre Adressen, warum sechs davon alle sechs Stunden ziehen, die Startguthaben je Token, der Token, den Hearth ablehnt, und die Routen je Pool. |
| [Wie eine Ziehung abläuft](concepts/how-a-draw-works.md) | Perioden, das Zwei-Perioden-Fenster und die Frist für den Abschluss, die fünf Schritte einer Ziehung, und was der Vault statt der Gesamtsumme des Pools veröffentlicht. |
| [Zeitgewichtetes Guthaben](concepts/time-weighted-balance.md) | Warum die Gewinnchancen auf Ihrem Durchschnittsguthaben der Periode beruhen, was eine späte Einzahlung wert ist, und warum drei gespeicherte Beobachtungen genügen. |
| [Gewinnerermittlung](concepts/winner-selection.md) | Der Gewinntest, die Regel von PoolTogether je Preis, die verschachtelten Schwellenwerte gegen die veröffentlichte Größenklasse, und ein durchgerechnetes Beispiel mit drei Sparern. |
| [Preise und Stufen](concepts/prizes-and-tiers.md) | Wie aus Rendite Preisliquidität wird, der verschlüsselte Übertrag und der Abgleichtakt, die drei Sepolia-Stufen, Überzeichnung, und wo wir von PoolTogether V5 abweichen. |
| [Renditequelle](concepts/yield-source.md) | Die gesponserte Quelle auf Sepolia, warum die Ernte geprüft und nicht gemeldet wird, und wie sich Zamas Confidential Vault auf dem Mainnet einklinkt. |
| [Warum Zama](concepts/why-zama.md) | Der Löschtest: Nimmt man die vollständig homomorphe Verschlüsselung heraus, bleibt kein Produkt übrig. Jeder Zama-Baustein, den wir nutzen, beim Namen genannt. |
| [Was privat bleibt](security/what-stays-private.md) | Sieben Regeln: die Größenklasse und das Leck, das sie ersetzt hat, was ein festnagelbares Guthaben kostet, die Wrapping-Naht in beide Richtungen, was die Preiszahlen messen, die Token-Ebene, warum die Auswertung nichts verrät, und der verhaltensbedingte Rest. |
| [Bedrohungsmodell](security/threat-model.md) | Neun Angreifer, was jeder von ihnen will, was sie aufhält und was nicht. Dazu die ausgeführten Fehlschläge unseres früheren Designs. |
| [Zufall und Nachprüfbarkeit](security/randomness-and-verification.md) | Woher der Seed kommt, warum ihn niemand neu würfeln oder den Gewinn nachträglich vergrößern kann, und wie jeder einen Schwellenwert im Nachhinein nachrechnet. |
| [Statische Analyse](security/static-analysis.md) | Die Läufe von slither und solhint, der eine Grund hinter jeder der fünf Befundfamilien, und das Abhängigkeits-Audit mit den zwei axios-Befunden, die es weiterhin meldet. |
| [Der Keeper](operations/keeper.md) | Die Aufgabe des Keepers Schritt für Schritt, die Reihenfolgeregel, ein Prozess je Pool, wo die sieben Live-Keeper gehostet sind, was bei einem Ausfall passiert, und das Gasbudget. |
| [Deployment](operations/deploying.md) | Ein Pool je Token ausrollen, Konstruktor-Signaturen und Parameter, Verifikation, und die zwei Sepolia-Parametersätze gegen einen für das Mainnet. |
| [Grenzen](limitations.md) | Jede dokumentierte Einschränkung in einer nummerierten Liste von vierzehn. |
| [FAQ](faq.md) | Zwölf kurze Antworten, beginnend mit der Frage, in welchem der sieben Token Sie sparen können, und samt der Frage, wo der Einlöse-Button geblieben ist. |
