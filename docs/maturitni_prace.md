# MATURITNÍ PRÁCE

## Zoo Database – Výuková aplikace pro učení SQL

---

**Studijní obor:** Informační technologie  
**Třída:** _(Doplnit)_  
**Školní rok:** 2025/2026  
**Jméno a příjmení:** _(Doplnit)_  
**Vedoucí práce:** _(Doplnit)_

---

## Abstrakt

Tato maturitní práce se zabývá vývojem vzdělávací desktopové aplikace Zoo Database, která slouží k výuce jazyka SQL prostřednictvím interaktivních úloh v tematickém prostředí zoologické zahrady. Aplikace kombinuje moderní webové technologie (React, TypeScript) s desktopovým frameworkem Tauri pro vytvoření multiplatformní aplikace. Uživatelé řeší SQL úlohy postupující od základních SELECT dotazů až po komplexní JOIN operace, subdotazy a agregační funkce. Součástí aplikace je pokročilý SQL editor s automatickým doplňováním, systém validace odpovědí, sledování postupu studenta a správa tříd pro učitele.

## Abstract

This thesis presents the development of Zoo Database, an educational desktop application designed to teach SQL through interactive exercises set in a zoo-themed database environment. The application combines modern web technologies (React, TypeScript) with the Tauri desktop framework to create a cross-platform solution. Users solve SQL tasks progressing from basic SELECT queries to complex JOIN operations, subqueries, and aggregate functions. The application features an advanced SQL editor with autocomplete, answer validation system, student progress tracking, and classroom management for teachers.

## Klíčová slova

SQL, výuka databází, React, TypeScript, Tauri, vzdělávací software, interaktivní učení

---

_Prohlašuji, že jsem tuto práci vypracoval(a) samostatně a použil(a) jsem literární prameny a informace, které cituji a uvádím v seznamu použité literatury a zdrojů informací._

_V Praze dne …………._ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; _……..……………………_  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; _jméno a příjmení_

---

## Obsah

1. [Úvod](#1-úvod)
2. [Specifikace projektu](#2-specifikace-projektu)
   - 2.1 [Cíle práce](#21-cíle-práce)
   - 2.2 [Cílová skupina](#22-cílová-skupina)
   - 2.3 [Funkční požadavky](#23-funkční-požadavky)
   - 2.4 [Nefunkční požadavky](#24-nefunkční-požadavky)
3. [Harmonogram práce](#3-harmonogram-práce)
4. [Teoretická část](#4-teoretická-část)
   - 4.1 [Jazyk SQL](#41-jazyk-sql)
   - 4.2 [Moderní webové technologie](#42-moderní-webové-technologie)
   - 4.3 [Desktopové aplikace pomocí Tauri](#43-desktopové-aplikace-pomocí-tauri)
5. [Analýza projektu](#5-analýza-projektu)
   - 5.1 [Technologický stack](#51-technologický-stack)
   - 5.2 [Architektura aplikace](#52-architektura-aplikace)
   - 5.3 [Databázové schéma ZOO](#53-databázové-schéma-zoo)
   - 5.4 [Struktura úloh](#54-struktura-úloh)
6. [Popis implementace](#6-popis-implementace)
   - 6.1 [Frontend aplikace](#61-frontend-aplikace)
   - 6.2 [SQL Editor](#62-sql-editor)
   - 6.3 [Validace odpovědí](#63-validace-odpovědí)
   - 6.4 [Správa uživatelů a tříd](#64-správa-uživatelů-a-tříd)
   - 6.5 [Lokalizace](#65-lokalizace)
7. [Závěr](#7-závěr)
8. [Seznam použitých zdrojů](#8-seznam-použitých-zdrojů)
9. [Seznam příloh](#9-seznam-příloh)

---

## 1 Úvod

Výuka jazyka SQL je nedílnou součástí vzdělávání v oblasti informačních technologií. Strukturovaný dotazovací jazyk (SQL) představuje základní nástroj pro práci s relačními databázemi a jeho znalost je vyžadována prakticky ve všech odvětvích IT průmyslu. Tradiční metody výuky SQL často narážejí na problém abstraktnosti – studenti pracují s bezejmennými tabulkami a umělými daty, což snižuje jejich motivaci a ztěžuje pochopení praktického využití.

Tato maturitní práce představuje řešení tohoto problému v podobě vzdělávací aplikace **Zoo Database**. Aplikace využívá intuitivní tematiku zoologické zahrady, kde studenti pracují se zvířaty, ošetřovateli a jejich vzájemnými vztahy. Místo abstraktních tabulek tak uživatelé hledají „nejlehčího králíka" nebo zjišťují, „kdo ošetřuje nejstaršího vlka", což přirozeně motivuje k řešení úloh.

Cílem práce je vytvořit kompletní výukovou platformu, která:

- Poskytuje strukturovaný kurz SQL od základů po pokročilé dotazy
- Nabízí interaktivní prostředí s okamžitou zpětnou vazbou
- Umožňuje učitelům vytvářet třídy a sledovat pokrok studentů
- Funguje jako desktopová aplikace na různých operačních systémech

Práce je strukturována následovně: po úvodu následuje specifikace projektu definující cíle a požadavky, harmonogram práce popisující jednotlivé fáze vývoje, teoretická část vysvětlující klíčové technologie, analýza projektu rozebírající architekturu řešení a nakonec popis implementace jednotlivých komponent.

---

## 2 Specifikace projektu

### 2.1 Cíle práce

Hlavním cílem práce je navrhnout a implementovat vzdělávací aplikaci pro výuku SQL, která:

1. **Usnadní pochopení SQL** – Aplikace provede studenta od základních SELECT dotazů přes podmínky WHERE, řazení ORDER BY, až po komplexní JOIN operace, subdotazy a agregační funkce.

2. **Poskytne okamžitou zpětnou vazbu** – Každá odpověď je automaticky validována a student okamžitě ví, zda jeho řešení je správné.

3. **Motivuje pomocí gamifikace** – Systém úloh je rozdělen do 26 kategorií (A-Z) s různými obtížnostmi, což vytváří pocit postupu a dosažení cílů.

4. **Umožní správu výuky** – Učitelé mohou vytvářet virtuální třídy, přidávat studenty a sledovat jejich pokrok.

5. **Bude multiplatformní** – Aplikace bude funkční na Windows, macOS i Linux.

### 2.2 Cílová skupina

Primární cílovou skupinou jsou studenti středních a vysokých škol s IT zaměřením, kteří se učí základy práce s databázemi. Sekundární skupinou jsou učitelé, kteří potřebují nástroj pro sledování pokroku studentů.

### 2.3 Funkční požadavky

| ID   | Požadavek                                              | Priorita |
| ---- | ------------------------------------------------------ | -------- |
| FR01 | Uživatel může spouštět SQL dotazy vůči databázi ZOO    | Vysoká   |
| FR02 | Systém automaticky validuje správnost SQL dotazů       | Vysoká   |
| FR03 | Uživatel vidí výsledky dotazu v přehledné tabulce      | Vysoká   |
| FR04 | Systém nabízí nápovědy k jednotlivým úlohám            | Střední  |
| FR05 | Uživatel může procházet úlohy podle kategorií (A-Z)    | Vysoká   |
| FR06 | Systém sleduje a ukládá pokrok uživatele               | Vysoká   |
| FR07 | Učitel může vytvářet třídy a přidávat studenty         | Střední  |
| FR08 | Učitel vidí statistiky pokroku všech studentů ve třídě | Střední  |
| FR09 | Uživatel si může zvolit jazyk rozhraní (CZ/EN)         | Střední  |
| FR10 | Uživatel si může přizpůsobit vzhled aplikace (témata)  | Nízká    |

### 2.4 Nefunkční požadavky

| ID    | Požadavek                                        | Metrika                                   |
| ----- | ------------------------------------------------ | ----------------------------------------- |
| NFR01 | Aplikace musí být responzivní                    | Odezva UI < 100ms                         |
| NFR02 | SQL dotazy musí být vyhodnoceny rychle           | Doba zpracování < 500ms                   |
| NFR03 | Aplikace musí fungovat offline                   | 100% funkcionalita bez internetu          |
| NFR04 | Aplikace musí podporovat více operačních systémů | Windows, macOS, Linux                     |
| NFR05 | Uživatelské rozhraní musí být intuitivní         | Uživatel zvládne první úlohu bez nápovědy |

---

## 3 Harmonogram práce

| Fáze                        | Časové období            | Popis činností                                                                            |
| --------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| **1. Analýza a návrh**      | Září – Říjen 2025        | Analýza požadavků, návrh architektury, výběr technologií, návrh databázového schématu ZOO |
| **2. Implementace jádra**   | Listopad – Prosinec 2025 | Vývoj SQL editoru, implementace validace dotazů, vytvoření systému úloh                   |
| **3. Uživatelské rozhraní** | Leden 2026               | Design a implementace UI komponent, témata, lokalizace                                    |
| **4. Správa uživatelů**     | Únor 2026                | Autentizace pomocí Clerk, systém tříd, sledování pokroku                                  |
| **5. Testování a ladění**   | Březen 2026              | Testování všech funkcí, oprava chyb, optimalizace výkonu                                  |
| **6. Dokumentace**          | Březen 2026              | Dokončení maturitní práce, příprava prezentace                                            |

---

## 4 Teoretická část

### 4.1 Jazyk SQL

SQL (Structured Query Language) je standardizovaný jazyk pro správu a manipulaci s relačními databázemi. Jazyk byl vyvinut v 70. letech 20. století společností IBM a od té doby se stal průmyslovým standardem. SQL se skládá z několika podjazyků:

- **DQL (Data Query Language)** – dotazování dat pomocí příkazu SELECT
- **DML (Data Manipulation Language)** – manipulace s daty (INSERT, UPDATE, DELETE)
- **DDL (Data Definition Language)** – definice struktury (CREATE, ALTER, DROP)
- **DCL (Data Control Language)** – řízení přístupu (GRANT, REVOKE)

Aplikace Zoo Database se zaměřuje primárně na DQL, protože právě dotazování dat je nejčastější činností při práci s databázemi a je základem pro pochopení relačního modelu.

### 4.2 Moderní webové technologie

Aplikace využívá moderní JavaScript/TypeScript ekosystém:

**React** je JavaScriptová knihovna pro tvorbu uživatelských rozhraní vyvinutá společností Meta (dříve Facebook). React používá komponentový přístup a virtuální DOM pro efektivní aktualizace uživatelského rozhraní.

**TypeScript** je nadstavba JavaScriptu přidávající statické typování. Typová kontrola během vývoje eliminuje mnoho běžných chyb a zlepšuje čitelnost kódu.

**TanStack Router** je moderní router pro React aplikace podporující typově bezpečné routování a automatické generování routes ze souborové struktury.

### 4.3 Desktopové aplikace pomocí Tauri

Tauri je framework pro tvorbu multiplatformních desktopových aplikací využívající webové technologie pro uživatelské rozhraní a Rust pro systémové operace. Na rozdíl od Electronu, Tauri nevyžaduje bundlování celého Chromium enginu, což vede k výrazně menším binárním souborům (typicky 3-10 MB oproti 150+ MB u Electronu).

Výhody Tauri:

- Malá velikost výsledné aplikace
- Nižší spotřeba paměti
- Bezpečnější architektura díky Rust backendu
- Podpora Windows, macOS a Linux

---

## 5 Analýza projektu

### 5.1 Technologický stack

Aplikace Zoo Database využívá následující technologie:

**Frontend:**

- React 19 – UI knihovna
- TypeScript – typově bezpečný JavaScript
- TanStack Router – file-based routing
- TanStack Query – správa serverového stavu
- Tailwind CSS 4 – utility-first CSS framework
- Radix UI – přístupné UI komponenty
- Shadcn/ui – předpřipravené komponenty

**Backend a databáze:**

- Convex – serverless databáze a backend
- PGlite – PostgreSQL běžící v prohlížeči (WebAssembly)
- Neon – cloudová PostgreSQL databáze

**Autentizace:**

- Clerk – autentizační služba s podporou OAuth

**Desktop:**

- Tauri 2 – framework pro desktopové aplikace

**Vývojové nástroje:**

- Bun – JavaScript runtime a package manager
- Vite 7 – build tool
- Vitest – testovací framework
- ESLint + Prettier – linting a formátování

### 5.2 Architektura aplikace

Aplikace sleduje moderní architekturu single-page aplikace (SPA) s následující strukturou:

```
src/
├── components/          # Znovupoužitelné UI komponenty
│   ├── ui/             # Základní komponenty (Button, Card, Dialog...)
│   ├── sql-editor.tsx  # SQL editor s autocomplete
│   └── ...
├── routes/             # Stránky aplikace (file-based routing)
│   ├── index.tsx       # Hlavní stránka s úlohami
│   ├── editor.tsx      # SQL editor pro volné dotazy
│   ├── scheme.*.tsx    # Prohlížeč databázového schématu
│   ├── classes.tsx     # Správa tříd (pro učitele)
│   └── settings.tsx    # Nastavení aplikace
├── lib/                # Pomocné funkce a utility
│   ├── db/             # Databázová vrstva
│   ├── validation/     # Validace SQL odpovědí
│   └── ...
├── data/               # Definice úloh a kategorií
├── locales/            # Překlady (CZ, EN)
├── contexts/           # React kontexty (jazyk, téma)
└── hooks/              # Custom React hooks
```

### 5.3 Databázové schéma ZOO

Databáze Zoo obsahuje následující tabulky:

**Česká verze (výchozí):**

| Tabulka        | Sloupce                                   | Popis                                 |
| -------------- | ----------------------------------------- | ------------------------------------- |
| `Druhy`        | id, nazev                                 | Druhy zvířat (např. vlk, králík)      |
| `Zvirata`      | id, druh, jmeno, vaha, narozeno, spotreba | Konkrétní zvířata v ZOO               |
| `Osetrovatele` | id, jmeno, narozen                        | Ošetřovatelé pracující v ZOO          |
| `Osetruje`     | id, osetrujici, zvire                     | Vazební tabulka: kdo koho ošetřuje    |
| `Ma_rad`       | id, osetrujici, druh                      | Vazební tabulka: kdo má rád jaký druh |

**Anglická verze:**

| Tabulka      | Sloupce                                   | Popis                  |
| ------------ | ----------------------------------------- | ---------------------- |
| `Types`      | id, title, weight_min, weight_max         | Animal types           |
| `Animals`    | id, type, name, weight, born, consumption | Individual animals     |
| `Caretakers` | id, name, born                            | Zoo caretakers         |
| `Treats`     | id, caretaker, animal                     | Who takes care of whom |
| `Likes`      | id, caretaker, type                       | Preferred animal types |

### 5.4 Struktura úloh

Úlohy jsou organizovány do 26 kategorií označených písmeny A-Z, každá se zaměřuje na specifické SQL koncepty:

| Kategorie | Název                 | Zaměření                      |
| --------- | --------------------- | ----------------------------- |
| A         | Základní Dotazy       | SELECT, \* , WHERE            |
| B         | Pokročilé Vyhledávání | WHERE s LIKE, více podmínek   |
| C         | Řazení a Limity       | ORDER BY, LIMIT, OFFSET       |
| D         | Komplexní Podmínky    | AND, OR, kombinace podmínek   |
| E         | Pokročilé Dotazy      | LIMIT/OFFSET, datové typy     |
| F         | Subdotazy             | Vnořené SELECT dotazy         |
| G-H       | Vztahy Mezi Tabulkami | JOIN operace                  |
| I         | Porovnání             | Porovnávání hodnot z tabulek  |
| J-K       | Agregační Funkce      | COUNT, SUM, AVG, MIN, MAX     |
| L         | SQL Teorie            | Teoretické koncepty           |
| M-O       | Agregace a Statistiky | GROUP BY, HAVING              |
| P-Q       | Komplexní Dotazy      | Kombinace všech konceptů      |
| R-S       | Negace a Podmínky     | NOT EXISTS, LEFT JOIN         |
| T-V       | Pokročilá Analýza     | Window funkce, komplexní JOIN |
| W-Z       | Časová Analýza        | Práce s daty a časem          |

Každá úloha obsahuje:

- **Název** – krátký popis úlohy
- **Popis** – zadání úlohy v kontextu ZOO
- **Nápověda** – volitelná nápověda k řešení
- **Obtížnost** – Easy, Medium, Hard
- **Validace** – pravidla pro ověření správnosti

---

## 6 Popis implementace

### 6.1 Frontend aplikace

Uživatelské rozhraní je postaveno na komponentové architektuře React. Hlavní layout aplikace obsahuje:

- **Sidebar** – navigace mezi kategoriemi, přehled pokroku
- **Hlavní panel** – zobrazení aktuální úlohy
- **SQL Editor** – vstup pro psaní dotazů
- **Výsledkový panel** – zobrazení výsledků dotazu

Navigace využívá TanStack Router s file-based routingem, kde každý soubor v adresáři `routes/` automaticky vytváří odpovídající URL cestu.

### 6.2 SQL Editor

SQL Editor je klíčová komponenta aplikace implementovaná v souboru `sql-editor.tsx`. Nabízí:

- **Zvýrazňování syntaxe** – SQL klíčová slova, funkce, řetězce, čísla
- **Automatické doplňování** – návrhy tabulek, sloupců, SQL klíčových slov
- **Kontextové návrhy** – po napsání názvu tabulky nabízí její sloupce
- **Klávesové zkratky** – Ctrl+Enter pro spuštění dotazu

Editor využívá vlastní tokenizer pro parsování SQL kódu a poskytuje real-time návrhy na základě aktuální pozice kurzoru.

### 6.3 Validace odpovědí

Systém validace kontroluje správnost studentských řešení pomocí několika metod:

1. **Počet řádků** – ověření očekávaného množství výsledků
2. **Názvy sloupců** – kontrola správných sloupců ve výstupu
3. **Obsah dat** – porovnání s referenčním dotazem
4. **Vzory v datech** – ověření specifických podmínek (např. jména začínající na 'A')

Validační pravidla jsou definována pro každou úlohu v datovém souboru `categories.ts`.

### 6.4 Správa uživatelů a tříd

Aplikace podporuje tři role uživatelů:

- **Student** – řeší úlohy, sleduje svůj pokrok
- **Učitel** – vytváří třídy, přidává studenty, sleduje pokrok třídy
- **Admin** – plná správa aplikace

Autentizace je zajištěna službou Clerk, která poskytuje OAuth přihlášení (Google, GitHub) a správu uživatelských sessions.

Data o pokroku jsou ukládána v Convex databázi s následující strukturou:

- Sledování dokončených úloh
- Počet pokusů a nápověd
- Čas strávený na úlohách
- Příslušnost ke třídám

### 6.5 Lokalizace

Aplikace je plně lokalizována do češtiny a angličtiny. Lokalizační soubory obsahují:

- Texty uživatelského rozhraní (`cz.ts`, `en.ts`)
- Zadání úloh a nápovědy (`categories-cz.ts`, `categories-en.ts`)
- Názvy databázových objektů

Přepínání jazyka je dostupné v nastavení a ovlivňuje jak UI, tak databázové schéma (české nebo anglické názvy tabulek a sloupců).

---

## 7 Závěr

_(Tato sekce bude doplněna po dokončení praktické části práce.)_

---

## 8 Seznam použitých zdrojů

### Literární zdroje

1. SILBERSCHATZ Abraham, KORTH Henry F., SUDARSHAN S. _Database System Concepts_. 7th ed. McGraw-Hill, 2019. ISBN 978-0-07-802215-9.

2. BEAULIEU Alan. _Learning SQL: Generate, Manipulate, and Retrieve Data_. 3rd ed. O'Reilly Media, 2020. ISBN 978-1-492-05761-1.

### Online zdroje

1. REACT. _React Documentation_. Online. React. Dostupné z: https://react.dev/. [cit. 2025-01-20].

2. TAURI. _Tauri Documentation_. Online. Tauri. Dostupné z: https://tauri.app/. [cit. 2025-01-20].

3. CONVEX. _Convex Documentation_. Online. Convex. Dostupné z: https://docs.convex.dev/. [cit. 2025-01-20].

4. TANSTACK. _TanStack Router Documentation_. Online. TanStack. Dostupné z: https://tanstack.com/router/. [cit. 2025-01-20].

5. CLERK. _Clerk Documentation_. Online. Clerk. Dostupné z: https://clerk.com/docs. [cit. 2025-01-20].

---

## 9 Seznam příloh

1. Příloha 1 – Kompletní databázové schéma ZOO (ER diagram)
2. Příloha 2 – Seznam všech SQL úloh s očekávanými řešeními
3. Příloha 3 – Uživatelská příručka aplikace
4. Příloha 4 – Instalační příručka
5. Příloha 5 – Zdrojový kód aplikace (elektronická příloha)
