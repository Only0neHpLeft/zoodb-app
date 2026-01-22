export const categoriesEn = {
  A: {
    title: "Basic Queries",
    description: "Explore basic SQL queries for working with the animal database",
    tasks: {
      a1: {
        title: "Discover All Animals",
        description: "Display a complete list of all animal species in our ZOO.",
        hint: "Use SELECT to list all records from the table.",
      },
      a2: {
        title: "Lightweight Animals",
        description: "Find all animals lighter than 50 kg. Light Weight!",
        hint: "Use WHERE with a condition for weight.",
      },
      a3: {
        title: "Animals Starting with 'A'",
        description: "Discover all animals whose names start with the letter 'A'.",
        hint: "Use LIKE to search for a pattern in text.",
      },
      a4: {
        title: "Alphabetical List",
        description: "List all animals sorted by name from A to Z.",
        hint: "Use ORDER BY to sort results.",
      },
    },
  },
  B: {
    title: "Advanced Searching",
    description: "Learn to search for specific data in the database",
    tasks: {
      b1: {
        title: "Slugs in the ZOO",
        description: "List the names of all slugs in our ZOO.",
        hint: "Use WHERE to filter by animal type.",
      },
      b2: {
        title: "Julie and Their Species",
        description: "Find all animal species that have a Julie among them.",
        hint: "Use WHERE with LIKE to search for the name Julie.",
      },
      b3: {
        title: "Sisi the Bat",
        description: "Find the birth date of the bat named 'Sisi'.",
        hint: "Combine WHERE conditions for species and name.",
      },
    },
  },
  C: {
    title: "Sorting and Limits",
    description: "Learn to work with sorting and limiting results",
    tasks: {
      c1: {
        title: "Lightest Five",
        description: "Find the five lightest animals in the ZOO.",
        hint: "Use ORDER BY and LIMIT to restrict the number of results.",
      },
      c2: {
        title: "Heaviest Rabbit",
        description: "Find the heaviest rabbit in the ZOO.",
        hint: "Combine WHERE, ORDER BY and LIMIT.",
      },
      c3: {
        title: "Oldest Wolf",
        description: "Find the oldest wolf in the ZOO.",
        hint: "Use WHERE for species and ORDER BY for birth date.",
      },
    },
  },
  D: {
    title: "Complex Conditions",
    description: "Master more complex conditions in queries",
    tasks: {
      d1: {
        title: "Heavy Wolves",
        description: "Find the names of all wolves that weigh 50 kg or more.",
        hint: "Combine conditions for species and weight.",
      },
      d2: {
        title: "Heaviest Light Spider",
        description: "Find the name of the heaviest spider that weighs less than 50 kg.",
        hint: "Use WHERE with multiple conditions and ORDER BY.",
      },
      d3: {
        title: "A or B",
        description: "Find the names of all animals starting with 'A' or 'B'.",
        hint: "Use LIKE with OR to combine conditions.",
      },
    },
  },
  E: {
    title: "Advanced Queries",
    description: "Solve complex queries with multiple conditions",
    tasks: {
      e1: {
        title: "Third Oldest Julie",
        description: "Find the species of the third oldest Julie in the ZOO.",
        hint: "Use ORDER BY with LIMIT and OFFSET.",
      },
      e2: {
        title: "Heaviest from January 2003",
        description: "Find the species of the heaviest animal born in January 2003.",
        hint: "Use WHERE for date and ORDER BY for weight.",
      },
      e3: {
        title: "Medium Weight C/a",
        description: "Find the names of medium-weight animals (50-100 kg) starting with 'C' or ending with 'a'.",
        hint: "Combine conditions for weight and name patterns.",
      },
    },
  },
  F: {
    title: "Subqueries",
    description: "Master advanced queries with subqueries",
    tasks: {
      f1: {
        title: "Same Weight",
        description: "Find all animal species that weigh the same as the heaviest animal in the ZOO.",
        hint: "Use a subquery to find the maximum weight.",
      },
    },
  },
  G: {
    title: "Table Relationships",
    description: "Learn to connect data from multiple tables",
    tasks: {
      g1: {
        title: "Spider's Keeper",
        description: "Find out who takes care of the heaviest spider in the ZOO.",
        hint: "Use JOIN and a subquery to find the heaviest spider.",
      },
      g2: {
        title: "Heavy Animals 1950",
        description: "Find the names of all heavy animals (over 50 kg) that are cared for by people born in 1950.",
        hint: "Combine JOIN with multiple conditions.",
      },
      g3: {
        title: "Earwig Lovers",
        description: "List the names of all keepers who like earwigs.",
        hint: "Use JOIN with the prefers table.",
      },
    },
  },
  H: {
    title: "Complex Joins",
    description: "Master more complex table joins",
    tasks: {
      h1: {
        title: "Luke's Heaviest",
        description: "Find the heaviest animal that keeper Luke JANSA likes.",
        hint: "Use JOIN with prefers and ORDER BY.",
      },
      h2: {
        title: "Emil's Light Ones",
        description: "List the species of all light animals (under 50 kg) that are cared for by people named Emil.",
        hint: "Combine JOIN with LIKE for the name.",
      },
      h3: {
        title: "Oldest Keeper",
        description: "Find the species of the heaviest animal that is cared for by the oldest keeper.",
        hint: "Use a subquery for the oldest keeper.",
      },
    },
  },
  I: {
    title: "Comparisons",
    description: "Compare values from different tables",
    tasks: {
      i1: {
        title: "Heavier Than Age",
        description: "Find all keeper-animal pairs where the animal weighs more than the keeper's age in years.",
        hint: "Use DATEDIFF to calculate age.",
      },
    },
  },
  J: {
    title: "Aggregate Functions",
    description: "Work with SQL aggregate functions",
    tasks: {
      j1: {
        title: "Youngest Keeper",
        description: "Find the name of the youngest keeper in the ZOO.",
        hint: "Use ORDER BY with birth date.",
      },
      j2: {
        title: "Water Strider Weight",
        description: "Calculate the total weight of all water striders in the ZOO.",
        hint: "Use SUM with WHERE for species.",
      },
      j3: {
        title: "Aaron's Animals",
        description: "Count how many animals Aaron Kropacek likes.",
        hint: "Use COUNT with JOIN.",
      },
    },
  },
  K: {
    title: "Complex Relationships",
    description: "Solve complex relationships between tables",
    tasks: {
      k1: {
        title: "Favorite Charges",
        description: "Find keepers who like at least one animal that they care for.",
        hint: "Use JOIN between Osetruje and Ma_Rad.",
      },
      k2: {
        title: "Snail Love",
        description: "Find keepers who lovingly feed snails (they care for them and like their species).",
        hint: "Combine Osetruje and Ma_Rad with the same species.",
      },
      k3: {
        title: "Falco's Friends",
        description: "Find animals that are lovingly fed by the same keeper as the sparrow Falco.",
        hint: "Use a subquery to find Falco's keeper.",
      },
    },
  },
  L: {
    title: "SQL Theory",
    description: "Understand theoretical SQL concepts",
    tasks: {
      l1: {
        title: "Multiple Aggregations",
        description: "Can we have multiple aggregated columns in a single query at the same time?",
        hint: "Think about how SQL processes aggregate functions.",
      },
      l2: {
        title: "Aggregation and Relationships",
        description: "What problem occurs when counting the weight of animals cared for with love?",
        hint: "Consider duplicates when joining tables.",
      },
    },
  },
  M: {
    title: "Aggregation and Statistics",
    description: "Work with aggregate functions and statistics",
    tasks: {
      m1: {
        title: "Average Sparrow Weight",
        description: "What is the average weight of a sparrow?",
        hint: "Use AVG and WHERE to filter by species",
      },
      m2: {
        title: "Busiest Keeper",
        description: "Who is the busiest keeper? (cares for the most animals)",
        hint: "Use COUNT and GROUP BY on the Osetruje table",
      },
      m3: {
        title: "Species Count per Keeper",
        description: "How many different species do individual keepers care for?",
        hint: "Join Osetruje and Zvirata tables, use COUNT DISTINCT",
      },
    },
  },
  N: {
    title: "Advanced Filters",
    description: "Learn to work with advanced filters",
    tasks: {
      n1: {
        title: "Heavy Species",
        description: "Which species have only heavy animals (animals weighing over 50)?",
        hint: "Use GROUP BY and HAVING with MIN",
      },
      n2: {
        title: "Heaviest Species on Average",
        description: "Which species has the highest average weight?",
        hint: "GROUP BY with ORDER BY and LIMIT",
      },
      n3: {
        title: "Animals with Love",
        description: "How many animals do individual keepers care for with love?",
        hint: "Join Osetruje and Ma_Rad tables",
      },
    },
  },
  O: {
    title: "Specific Aggregations",
    description: "Work with specific aggregate functions",
    tasks: {
      o1: {
        title: "Weight of Favorite Budgies",
        description: "How much do all favorite budgies weigh together?",
        hint: "Join Zvirata and Ma_Rad tables, filter by species",
      },
      o2: {
        title: "Average Weight of 20-Year-Olds",
        description: "Average weight of 20-year-old animals",
        hint: "Use WHERE with a function to calculate age",
      },
    },
  },
  P: {
    title: "Complex Queries",
    description: "Solve complex queries with multiple conditions",
    tasks: {
      p1: {
        title: "Unloved Species",
        description: "How many species does nobody like?",
        hint: "Use LEFT JOIN with Ma_Rad and WHERE IS NULL",
      },
      p2: {
        title: "Multiple Animals of Same Species",
        description: "Which keepers care for multiple animals of the same species?",
        hint: "Join Osetruje and Zvirata tables, use GROUP BY and HAVING",
      },
      p3: {
        title: "Same Weight",
        description: "Which keepers care for multiple animals with the same weight?",
        hint: "Similar to previous, but group by weight",
      },
      p4: {
        title: "Daily Trips",
        description: "Calculate the total number of 'daily trips' assuming that each keeper feeds each of their charges once a day, and if they also like them, then twice a day?",
        hint: "Use CASE WHEN in SUM",
      },
    },
  },
  Q: {
    title: "Aggregate Calculations",
    description: "Work with aggregate calculations",
    tasks: {
      q1: {
        title: "Heavy Species on Average",
        description: "Which species have an average weight over 50?",
        hint: "GROUP BY with a condition in HAVING",
      },
      q2: {
        title: "Budgie Specialist",
        description: "Who is the keeper of the most budgies?",
        hint: "JOIN, WHERE, GROUP BY and ORDER BY",
      },
      q3: {
        title: "Double Feeding",
        description: "Calculate the total number of 'daily trips' assuming that each keeper feeds each of their charges twice a day",
        hint: "Simple COUNT multiplied by two",
      },
    },
  },
  R: {
    title: "Negation and Conditions",
    description: "Work with negation and conditions",
    tasks: {
      r1: {
        title: "Don't Like Sparrows",
        description: "Which keepers don't like sparrows?",
        hint: "Use NOT EXISTS or LEFT JOIN",
      },
      r2: {
        title: "Most Hateful",
        description: "Which keeper is the most hateful? (Doesn't like the most species)?",
        hint: "Compare the count of all species with the count of liked species",
      },
      r3: {
        title: "Heavy Animals with Few Keepers",
        description: "How many heavy animals (weight over 50) are fed by fewer than two keepers?",
        hint: "JOIN with GROUP BY and HAVING",
      },
    },
  },
  S: {
    title: "Complex Relationships",
    description: "Work with complex relationships",
    tasks: {
      s1: {
        title: "Unloved Animals",
        description: "Animals that are fed by a person who doesn't like them",
        hint: "Use Osetruje and NOT EXISTS with Ma_Rad",
      },
      s2: {
        title: "Loved without Care",
        description: "Uncared for, yet loved animals",
        hint: "Use JOIN with Ma_Rad and LEFT JOIN with Osetruje",
      },
      s3: {
        title: "Abandoned Animals",
        description: "Uncared for and unloved animals at the same time",
        hint: "Double LEFT JOIN with Osetruje and Ma_Rad, where both are NULL",
      },
    },
  },
  T: {
    title: "Loved Animals",
    description: "Work with relationships between keepers and animals",
    tasks: {
      t1: {
        title: "Only Loved",
        description: "List of animals that are cared for ONLY by people who love them?",
        hint: "Think about how to exclude animals that are cared for by someone who doesn't like them. Connect the Zvirata, Osetruje and Ma_Rad tables.",
      },
    },
  },
  U: {
    title: "Extreme Values",
    description: "Search for extreme values in data",
    tasks: {
      u1: {
        title: "Lightest Animals",
        description: "Names of the lightest animals (All animals that weigh the same as the lightest one)",
        hint: "First find the minimum weight in the Zvirata table, then use it to find all animals with that weight.",
      },
      u2: {
        title: "Oldest's Animals",
        description: "Which animals (name and species) are cared for by the oldest keeper?",
        hint: "You'll need to connect the Zvirata and Osetruje tables. To find the oldest keeper, look at the birth date.",
      },
      u3: {
        title: "Lightest with Multiple Keepers",
        description: "Name of the lightest animal with more than one keeper",
        hint: "Combine GROUP BY, HAVING and ORDER BY",
      },
    },
  },
  V: {
    title: "Complex Analysis",
    description: "Solve complex analytical tasks",
    tasks: {
      v1: {
        title: "Heaviest Animals of Keepers",
        description: "For each keeper, list the name of the heaviest animal they care for",
        hint: "Connect Osetrovatele through Osetruje to Zvirata. Think about how to find the heaviest animal for each keeper.",
      },
      v2: {
        title: "Sellable Animals",
        description: "Name and species of 'sellable' animals (= oldest animal of each species, if by selling that animal I wouldn't lose the last representative of that species)",
        hint: "Use window functions and COUNT across Species",
      },
      v3: {
        title: "Common Interests with Luke",
        description: "List keepers with whom Luke JANSA has something to talk about (= they both like at least one common species)",
        hint: "Join Ma_Rad through Species and filter for Luke",
      },
    },
  },
  W: {
    title: "Statistical Analysis",
    description: "Solve statistical calculations",
    tasks: {
      w1: {
        title: "Most Average Weight",
        description: "List the name of the animal with the most average weight (the animal whose weight differs the least from the average weight of all animals)",
        hint: "First calculate the average weight of all animals. Then look for the animal whose weight is closest to this value.",
      },
    },
  },
  X: {
    title: "Time Analysis",
    description: "Analyze time data",
    tasks: {
      x1: {
        title: "Same Birth Date",
        description: "Keepers who care for two (or more) animals with the same birth date",
        hint: "Connect Osetruje with Zvirata and group by keeper and animal birth dates.",
      },
      x2: {
        title: "Most Fertile Day",
        description: "Most fertile day (the day when the most animals were born - only the date is needed!)",
        hint: "From the birth date in the Zvirata table, you can get the day of the week. Then just count the frequency of individual days.",
      },
      x3: {
        title: "Oldest Unloved",
        description: "Oldest unloved animal (ONLY THE NAME is needed!)",
        hint: "LEFT JOIN with Ma_Rad and WHERE IS NULL",
      },
    },
  },
  Y: {
    title: "Negated Relationships",
    description: "Work with negated relationships between entities",
    tasks: {
      y1: {
        title: "Uncared for Old Animals",
        description: "For each keeper, list the oldest animal that the keeper does NOT care for",
        hint: "Use Osetrovatele and Zvirata tables. Think about how to find animals that a given keeper doesn't care for.",
      },
      y2: {
        title: "Loved but Uncared for",
        description: "For each keeper, list the number of animals that the keeper doesn't care for, but likes",
        hint: "Join Ma_Rad and use NOT EXISTS with Osetruje",
      },
      y3: {
        title: "Only Animal Dates",
        description: "Dates on which only animals were born (meaning some animal, but no keeper)",
        hint: "Use NOT EXISTS with Osetrovatele",
      },
    },
  },
  Z: {
    title: "Advanced Time Analysis",
    description: "Analyze advanced time patterns",
    tasks: {
      z1: {
        title: "Most Fertile Day of Week",
        description: "List the most fertile day of the week (i.e., day of the week: Monday, Tuesday..., when the most animals were born)",
        hint: "From the birth date in the Zvirata table, you can get the day of the week. Then just count the frequency of individual days.",
      },
    },
  },
} as const;
