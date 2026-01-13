What needs to be done because we have these Languages: Czech and English.
We want it like this:

Czech Version
- In this we use Zvirata, Osetrovatele, Ma_rad, Osetruje, Druhy. Everything else is Coming Soon not yet implemented.
- the relations should be known based on it but well if you are not sure which i am also not sure in which file the relations are, if there is no file like that then check this:
- Zvirata.id : Osetruje.zvire, Osetruje.osetrovatel : Osetrovatele.id, Osetrovatele.id : Ma_rad.osetrovatel, Ma_rad.druh : Druhy.id, Druhy.id : Zvirata.druh

Zvirata ->
id (serial), druh (integer), jmeno (varchar256), vaha (numeric (10, 0)), narozen (date), spotreba (integer) / can be NULL

Osetrovatele ->
id (serial), jmeno (integer), narozen (date)

Zere ->
id (serial), druh (integer), potrava (integer)

Potrava ->
id (serial), nazev (varchar256), kalorie (integer), bilkoviny (numeric (6, 0)), sacharidy (numeric (6, 0)), tuky (numeric (6, 0)), vaha (numeric(6, 0))

Ma_rad ->
id (serial), osetrovatel (integer), druh (integer)

Jidelnicek ->
id (serial), zvire (integer), potrava (integer), jednotek (numeric (6, 0)), cas_krmeni (timestamp) / can be NULL

Osetruje ->
id (serial), osetrovatel (integer), zvire (integer)

Druhy ->
id (serial), nazev (varchar256), vaha_min (numeric (10, 0)), vaha_max (numeric (10, 0))

English Version
- How it should be based on namings i guess.
- In this we use Animals, Caretakers, Likes, Treats, Types. Everything else is Coming Soon not yet implemented.
- the relations should be known based on it but well if you are not sure which i am also not sure in which file the relations are, if there is no file like that then check this:
- Animals.id : Treats.animal, Treats.caretaker : Caretakers.id, Caretakers.id : Likes.caretaker, Likes.type : Types.id, Types.id : Animals.type / Should be same as in Czech version just renamed.

Animals ->
id (serial), type (integer), name (varchar256), weight (numeric (10, 0)), born (date), consumption (integer) / can be NULL

Caretakers ->
id (serial), name (integer), born (date)

Eats ->
id (serial), type (integer), food (integer)

Food ->
id (serial), name (varchar256), calories (integer), proteins (numeric (6, 0)), carbohydrates (numeric (6, 0)), fats (numeric (6, 0)), weight (numeric(6, 0))

Likes ->
id (serial), caretaker (integer), type (integer)

Menu ->
id (serial), animal (integer), food (integer), units (numeric (6, 0)), feeding_time (timestamp) / can be NULL

Treats ->
id (serial), caretaker (integer), animal (integer)

Types ->
id (serial), name (varchar256), weight_min (numeric (10, 0)), weight_max (numeric (10, 0))