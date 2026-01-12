export const categoriesCz = {
  A: {
    title: "Základní Dotazy",
    description: "Prozkoumejte základní SQL dotazy pro práci s databází zvířat",
    tasks: {
      a1: {
        title: "Objevte Všechna Zvířata",
        description: "Zobrazte kompletní seznam všech zvířecích druhů v naší ZOO.",
        hint: "Použijte SELECT pro výpis všech záznamů z tabulky.",
      },
      a2: {
        title: "Lehká Zvířata",
        description: "Najděte všechna zvířata lehčí než 50 kg. Lehká Váha!",
        hint: "Použijte WHERE s podmínkou pro váhu.",
      },
      a3: {
        title: "Zvířata na 'A'",
        description: "Objevte všechna zvířata, jejichž jména začínají na písmeno 'A'.",
        hint: "Použijte LIKE pro hledání vzoru v textu.",
      },
      a4: {
        title: "Abecední Seznam",
        description: "Vypište všechna zvířata seřazená podle jména od A do Z.",
        hint: "Použijte ORDER BY pro seřazení výsledků.",
      },
    },
  },
  B: {
    title: "Pokročilé Vyhledávání",
    description: "Naučte se vyhledávat specifická data v databázi",
    tasks: {
      b1: {
        title: "Sloni v ZOO",
        description: "Vypište jména všech slonů v naší ZOO.",
        hint: "Použijte WHERE pro filtrování podle druhu zvířete.",
      },
      b2: {
        title: "Julie a Jejich Druhy",
        description: "Najděte všechny druhy zvířat, které mají mezi sebou nějakou Julii.",
        hint: "Použijte WHERE s LIKE pro hledání jména Julie.",
      },
      b3: {
        title: "Sisi Netopýr",
        description: "Zjistěte datum narození netopýra jménem 'Sisi'.",
        hint: "Kombinujte podmínky WHERE pro druh a jméno.",
      },
    },
  },
  C: {
    title: "Řazení a Limity",
    description: "Naučte se pracovat s řazením a omezením výsledků",
    tasks: {
      c1: {
        title: "Nejlehčí Pětka",
        description: "Najděte pět nejlehčích zvířat v ZOO.",
        hint: "Použijte ORDER BY a LIMIT pro omezení počtu výsledků.",
      },
      c2: {
        title: "Nejtěžší Králík",
        description: "Najděte nejtěžšího králíka v ZOO.",
        hint: "Kombinujte WHERE, ORDER BY a LIMIT.",
      },
      c3: {
        title: "Nejstarší Vlk",
        description: "Najděte nejstaršího vlka v ZOO.",
        hint: "Použijte WHERE pro druh a ORDER BY pro datum narození.",
      },
    },
  },
  D: {
    title: "Komplexní Podmínky",
    description: "Zvládněte složitější podmínky v dotazech",
    tasks: {
      d1: {
        title: "Těžcí Vlci",
        description: "Najděte jména všech vlků, kteří váží 50 kg nebo více.",
        hint: "Kombinujte podmínky pro druh a váhu.",
      },
      d2: {
        title: "Nejtěžší Lehký Pavouk",
        description: "Najděte jméno nejtěžšího pavouka, který váží méně než 50 kg.",
        hint: "Použijte WHERE s více podmínkami a ORDER BY.",
      },
      d3: {
        title: "A nebo B",
        description: "Najděte jména všech zvířat začínajících na 'A' nebo 'B'.",
        hint: "Použijte LIKE s OR pro kombinaci podmínek.",
      },
    },
  },
  E: {
    title: "Pokročilé Dotazy",
    description: "Řešte komplexní dotazy s více podmínkami",
    tasks: {
      e1: {
        title: "Třetí Nejstarší Julie",
        description: "Zjistěte druh třetí nejstarší Julie v ZOO.",
        hint: "Použijte ORDER BY s LIMIT a OFFSET.",
      },
      e2: {
        title: "Nejtěžší z Ledna 2003",
        description: "Najděte druh nejtěžšího zvířete narozeného v lednu 2003.",
        hint: "Použijte WHERE pro datum a ORDER BY pro váhu.",
      },
      e3: {
        title: "Středně Těžká C/a",
        description: "Najděte jména středně těžkých zvířat (50-100 kg) začínajících na 'C' nebo končících na 'a'.",
        hint: "Kombinujte podmínky pro váhu a vzory jmen.",
      },
    },
  },
  F: {
    title: "Subdotazy",
    description: "Zvládněte pokročilé dotazy s poddotazy",
    tasks: {
      f1: {
        title: "Stejná Váha",
        description: "Najděte všechna druhy zvířat, které váží stejně jako nejtěžší zvíře v ZOO.",
        hint: "Použijte poddotaz pro nalezení maximální váhy.",
      },
    },
  },
  G: {
    title: "Vztahy Mezi Tabulkami",
    description: "Naučte se propojovat data z více tabulek",
    tasks: {
      g1: {
        title: "Ošetřovatel Pavouka",
        description: "Zjistěte, kdo ošetřuje nejtěžšího pavouka v ZOO.",
        hint: "Použijte JOIN a poddotaz pro nalezení nejtěžšího pavouka.",
      },
      g2: {
        title: "Těžká Zvířata 1950",
        description: "Najděte jména všech těžkých zvířat (nad 50 kg), které ošetřují lidé narození v roce 1950.",
        hint: "Kombinujte JOIN s více podmínkami.",
      },
      g3: {
        title: "Milovníci Škvorů",
        description: "Vypište jména všech ošetřovatelů, kteří mají rádi škvory.",
        hint: "Použijte JOIN s tabulkou prefers.",
      },
    },
  },
  H: {
    title: "Komplexní Spojení",
    description: "Zvládněte složitější propojení tabulek",
    tasks: {
      h1: {
        title: "Lukovo Nejtěžší",
        description: "Najděte nejtěžší zvíře, které má rád ošetřovatel Luke JANSA.",
        hint: "Použijte JOIN s prefers a ORDER BY.",
      },
      h2: {
        title: "Emilova Lehká",
        description: "Vypište druhy všech lehkých zvířat (pod 50 kg), která ošetřují Emilové.",
        hint: "Kombinujte JOIN s LIKE pro jméno.",
      },
      h3: {
        title: "Nejstarší Ošetřovatel",
        description: "Najděte druh nejtěžšího zvířete, které ošetřuje nejstarší ošetřovatel.",
        hint: "Použijte poddotaz pro nejstaršího ošetřovatele.",
      },
    },
  },
  I: {
    title: "Porovnání",
    description: "Porovnejte hodnoty z různých tabulek",
    tasks: {
      i1: {
        title: "Těžší Než Věk",
        description: "Najděte všechny dvojice ošetřovatel-zvíře, kde zvíře váží více než je věk ošetřovatele v letech.",
        hint: "Použijte DATEDIFF pro výpočet věku.",
      },
    },
  },
  J: {
    title: "Agregační Funkce",
    description: "Pracujte s agregačními funkcemi v SQL",
    tasks: {
      j1: {
        title: "Nejmladší Ošetřovatel",
        description: "Zjistěte jméno nejmladšího ošetřovatele v ZOO.",
        hint: "Použijte ORDER BY s datem narození.",
      },
      j2: {
        title: "Váha Vodoměrek",
        description: "Spočítejte celkovou váhu všech vodoměrek v ZOO.",
        hint: "Použijte SUM s WHERE pro druh.",
      },
      j3: {
        title: "Aaronova Zvířata",
        description: "Spočítejte, kolik zvířat má rád Aaron Kropáček.",
        hint: "Použijte COUNT s JOIN.",
      },
    },
  },
  K: {
    title: "Složité Vztahy",
    description: "Řešte komplexní vztahy mezi tabulkami",
    tasks: {
      k1: {
        title: "Oblíbení Svěřenci",
        description: "Najděte ošetřovatele, kteří mají rádi alespoň jedno zvíře, které ošetřují.",
        hint: "Použijte JOIN mezi Osetruje a Ma_Rad.",
      },
      k2: {
        title: "Šnečí Láska",
        description: "Najděte ošetřovatele, kteří s láskou krmí šneky (ošetřují je a mají rádi jejich druh).",
        hint: "Kombinujte Osetruje a Ma_Rad se stejným druhem.",
      },
      k3: {
        title: "Falcovi Kamarádi",
        description: "Najděte zvířata, která jsou s láskou krmena stejným ošetřovatelem jako vrabec Falco.",
        hint: "Použijte poddotaz pro nalezení Falcova ošetřovatele.",
      },
    },
  },
  L: {
    title: "SQL Teorie",
    description: "Pochopte teoretické koncepty SQL",
    tasks: {
      l1: {
        title: "Více Agregací",
        description: "Můžeme v jednom dotazu mít současně více agregovaných sloupců?",
        hint: "Zamyslete se nad tím, jak SQL zpracovává agregační funkce.",
      },
      l2: {
        title: "Agregace a Vztahy",
        description: "Jaký problém nastane při počítání váhy zvířat ošetřovaných s láskou?",
        hint: "Uvažujte o duplicitách při spojování tabulek.",
      },
    },
  },
  M: {
    title: "Agregace a Statistiky",
    description: "Pracujte s agregačními funkcemi a statistikami",
    tasks: {
      m1: {
        title: "Průměrná Váha Vrabce",
        description: "Jaká je průměrná váha vrabce?",
        hint: "Použijte AVG a WHERE pro filtrování druhu",
      },
      m2: {
        title: "Nejvytíženější Chovatel",
        description: "Kdo je nejvytíženějším chovatelem? (ošetřuje nejvíce zvířat)",
        hint: "Použijte COUNT a GROUP BY nad tabulkou Osetruje",
      },
      m3: {
        title: "Počet Druhů na Chovatele",
        description: "Kolik různých druhů ošetřují jednotliví ošetřovatelé?",
        hint: "Spojte tabulky Osetruje a Zvirata, použijte COUNT DISTINCT",
      },
    },
  },
  N: {
    title: "Pokročilé Filtry",
    description: "Naučte se pracovat s pokročilými filtry",
    tasks: {
      n1: {
        title: "Těžké Druhy",
        description: "Které druhy mají pouze těžká zvířata (zvířata vážící přes 50)?",
        hint: "Použijte GROUP BY a HAVING s MIN",
      },
      n2: {
        title: "Nejtěžší Druh v Průměru",
        description: "Který druh má nejvyšší váhový průměr?",
        hint: "GROUP BY s ORDER BY a LIMIT",
      },
      n3: {
        title: "Zvířata s Láskou",
        description: "Kolik zvířat s láskou ošetřují jednotliví ošetřovatelé?",
        hint: "Spojte tabulky Osetruje a Ma_Rad",
      },
    },
  },
  O: {
    title: "Specifické Agregace",
    description: "Pracujte se specifickými agregačními funkcemi",
    tasks: {
      o1: {
        title: "Váha Oblíbených Andulek",
        description: "Kolik váží dohromady všechna oblíbená andulka?",
        hint: "Spojte tabulky Zvirata a Ma_Rad, filtrujte podle druhu",
      },
      o2: {
        title: "Průměrná Váha 20letých",
        description: "Průměrná váha 20ti letých zvířat",
        hint: "Použijte WHERE s funkcí pro výpočet věku",
      },
    },
  },
  P: {
    title: "Komplexní Dotazy",
    description: "Řešte komplexní dotazy s více podmínkami",
    tasks: {
      p1: {
        title: "Nemilované Druhy",
        description: "Kolik druhů nikdo nemá rád?",
        hint: "Použijte LEFT JOIN s Ma_Rad a WHERE IS NULL",
      },
      p2: {
        title: "Více Zvířat Stejného Druhu",
        description: "Kteří ošetřovatelé ošetřují více zvířat stejného druhu?",
        hint: "Spojte tabulky Osetruje a Zvirata, použijte GROUP BY a HAVING",
      },
      p3: {
        title: "Stejná Váha",
        description: "Kteří ošetřovatelé ošetřují více zvířat se stejnou vahou?",
        hint: "Podobné jako předchozí, ale groupujte podle váhy",
      },
      p4: {
        title: "Denní Chody",
        description: "Vypište celkový počet \"denních chodů\" za předpokladu, že každý ošetřovatel nakrmí každého ze svých svěřenců 1x denně a má-li jej navíc rád, pak 2x denně?",
        hint: "Použijte CASE WHEN v SUM",
      },
    },
  },
  Q: {
    title: "Agregační Výpočty",
    description: "Pracujte s agregačními výpočty",
    tasks: {
      q1: {
        title: "Těžké Druhy v Průměru",
        description: "Které druhy mají průměrnou váhu přes 50?",
        hint: "GROUP BY s podmínkou v HAVING",
      },
      q2: {
        title: "Andulkový Specialista",
        description: "Kdo je ošetřovatelem největšího počtu andulek?",
        hint: "JOIN, WHERE, GROUP BY a ORDER BY",
      },
      q3: {
        title: "Dvojité Krmení",
        description: "Vypište celkový počet \"denních chodů\" za předpokladu, že každý ošetřovatel nakrmí každého ze svých svěřenců 2x denně",
        hint: "Jednoduchý COUNT vynásobený dvěma",
      },
    },
  },
  R: {
    title: "Negace a Podmínky",
    description: "Pracujte s negací a podmínkami",
    tasks: {
      r1: {
        title: "Nemají Rádi Vrabce",
        description: "Kteří ošetřovatelé nemají rádi vrabce?",
        hint: "Použijte NOT EXISTS nebo LEFT JOIN",
      },
      r2: {
        title: "Nejvíce Nenávistný",
        description: "Který ošetřovatel je nejvíce nenávistný? (Nemá rád nejvíce druhů)?",
        hint: "Porovnejte počet všech druhů s počtem oblíbených druhů",
      },
      r3: {
        title: "Těžká Zvířata s Málo Ošetřovateli",
        description: "Kolik těžkých zvířat (váha přes 50) je krmeno méně než dvěma ošetřovateli?",
        hint: "JOIN s GROUP BY a HAVING",
      },
    },
  },
  S: {
    title: "Komplexní Vztahy",
    description: "Pracujte s komplexními vztahy",
    tasks: {
      s1: {
        title: "Neoblíbená Zvířata",
        description: "Zvířata, která jsou krmena osobou, která je nemá ráda",
        hint: "Použijte Osetruje a NOT EXISTS s Ma_Rad",
      },
      s2: {
        title: "Milovaná bez Péče",
        description: "Neošetřovaná, a přesto milovaná zvířata",
        hint: "Použijte JOIN s Ma_Rad a LEFT JOIN s Osetruje",
      },
      s3: {
        title: "Opuštěná Zvířata",
        description: "Neošetřovaná a současně nemilovaná zvířata",
        hint: "Dvojitý LEFT JOIN s Osetruje a Ma_Rad, kde oba jsou NULL",
      },
    },
  },
  T: {
    title: "Milovaná Zvířata",
    description: "Pracujte s vazbami mezi ošetřovateli a zvířaty",
    tasks: {
      t1: {
        title: "Pouze Milovaná",
        description: "Seznam zvířat, kterou ošetřují POUZE lidi, kteří je milují?",
        hint: "Zamyslete se nad tím, jak vyloučit zvířata, která ošetřuje někdo, kdo je nemá rád. Propojte tabulky Zvirata, Osetruje a Ma_Rad.",
      },
    },
  },
  U: {
    title: "Extrémní Hodnoty",
    description: "Hledejte extrémní hodnoty v datech",
    tasks: {
      u1: {
        title: "Nejlehčí Zvířata",
        description: "Jména nejlehčích zvířat (Všechna zvířata, která váží stejně jako nejlehčí)",
        hint: "Nejdřív najděte nejmenší váhu v tabulce Zvirata, pak ji použijte pro nalezení všech zvířat s touto váhou.",
      },
      u2: {
        title: "Zvířata Nejstaršího",
        description: "Která zvířata (jméno a druh) ošetřuje nejstarší ošetřovatel?",
        hint: "Budete potřebovat propojit tabulky Zvirata a Osetruje. Pro nalezení nejstaršího ošetřovatele se podívejte na datum narození.",
      },
      u3: {
        title: "Nejlehčí s Více Ošetřovateli",
        description: "Jméno nejlehčího zvířete s více než jedním ošetřovatelem",
        hint: "Kombinujte GROUP BY, HAVING a ORDER BY",
      },
    },
  },
  V: {
    title: "Komplexní Analýza",
    description: "Řešte složité analytické úlohy",
    tasks: {
      v1: {
        title: "Nejtěžší Zvířata Ošetřovatelů",
        description: "Ke každému ošetřovateli vypište jméno nejtěžšího zvířete, které ošetřuje",
        hint: "Propojte Osetrovatele přes Osetruje na Zvirata. Zamyslete se nad tím, jak pro každého ošetřovatele najít jeho nejtěžší zvíře.",
      },
      v2: {
        title: "Prodatelná Zvířata",
        description: "Jméno a druh \"prodatelných\" zvířat (= nejstarší zvíře každého druhu, pokud bych prodejem daného zvířete nepřišel o posledního zástupce daného druhu)",
        hint: "Použijte window funkce a COUNT přes Druhy",
      },
      v3: {
        title: "Společné Zájmy s Lukem",
        description: "Vypište ošetřovatele, s nimiž si má Luke JANSA o čem popovídat (= mají rádi společně rádi alespoň jeden druh)",
        hint: "Spojte Ma_Rad přes Druhy a filtrujte Luka",
      },
    },
  },
  W: {
    title: "Statistická Analýza",
    description: "Řešte statistické výpočty",
    tasks: {
      w1: {
        title: "Nejprůměrnější Váha",
        description: "Vypište jméno váhově nejprůměrnějšího zvířete (zvíře, jehož váha se od průměrné váhy všech zvířat liší co nejméně)",
        hint: "Nejdřív spočítejte průměrnou váhu všech zvířat. Pak hledejte zvíře, jehož váha je této hodnotě nejblíže.",
      },
    },
  },
  X: {
    title: "Časová Analýza",
    description: "Analyzujte časová data",
    tasks: {
      x1: {
        title: "Stejné Datum Narození",
        description: "Ošetřovatele, kteří ošetřují dvě (nebo více) zvířat se shodným datem narození",
        hint: "Propojte Osetruje se Zvirata a seskupte podle ošetřovatele a data narození zvířat.",
      },
      x2: {
        title: "Nejplodnější Den",
        description: "Nejplodnější den (den, kdy se narodilo nejvíce zvířat - chce se pouze datum!)",
        hint: "Z data narození v tabulce Zvirata můžete získat den v týdnu. Pak stačí spočítat četnost jednotlivých dní.",
      },
      x3: {
        title: "Nejstarší Nemilované",
        description: "Nejstarší nemilované zvíře (chce se POUZE JMÉNO!)",
        hint: "LEFT JOIN s Ma_Rad a WHERE IS NULL",
      },
    },
  },
  Y: {
    title: "Negované Vztahy",
    description: "Pracujte s negovanými vztahy mezi entitami",
    tasks: {
      y1: {
        title: "Neošetřovaná Stará Zvířata",
        description: "Pro každého ošetřovatele vypište nejstarší zvíře, které daný ošetřovatel NEošetřuje",
        hint: "Použijte tabulky Osetrovatele a Zvirata. Zamyslete se nad tím, jak najít zvířata, která daný ošetřovatel neošetřuje.",
      },
      y2: {
        title: "Milovaná ale Neošetřovaná",
        description: "Pro každého ošetřovatele vypište počet zvířat, která daný ošetřovatel neošetřuje, ale má je rád",
        hint: "Spojte Ma_Rad a použijte NOT EXISTS s Osetruje",
      },
      y3: {
        title: "Pouze Zvířecí Data",
        description: "Data, v nichž se narodila pouze zvířata (tedy nějaké zvíře, ale žádný ošetřovatel)",
        hint: "Použijte NOT EXISTS s Osetrovatele",
      },
    },
  },
  Z: {
    title: "Pokročilá Časová Analýza",
    description: "Analyzujte pokročilé časové vzory",
    tasks: {
      z1: {
        title: "Nejplodnější Den v Týdnu",
        description: "Vypište nejplodnější den v týdnu (tzn. den v týdnu: Pondělí, úterý..., kdy se narodilo nejvíce zvířat)",
        hint: "Z data narození v tabulce Zvirata můžete získat den v týdnu. Pak stačí spočítat četnost jednotlivých dní.",
      },
    },
  },
} as const;
