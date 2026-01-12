/**
 * Database Schema Mapping for Czech/English localization
 *
 * Base tables use Czech names, English views are available.
 * This utility maps between languages for table names, column names, and display labels.
 */

export type Language = "cs" | "en"

// Table name mapping
export const tableNames = {
  types: { cs: "druhy", en: "types" },
  animals: { cs: "zvirata", en: "animals" },
  caretakers: { cs: "osetrovatele", en: "caretakers" },
  treats: { cs: "osetruje", en: "treats" },
  likes: { cs: "ma_rad", en: "likes" },
  food: { cs: "potrava", en: "food" },
  eats: { cs: "zere", en: "eats" },
  menu: { cs: "jidelnicek", en: "menu" },
} as const

export type TableKey = keyof typeof tableNames

// Column name mapping per table
export const columnNames = {
  types: {
    id: { cs: "id", en: "id" },
    user_id: { cs: "user_id", en: "user_id" },
    name: { cs: "nazev", en: "name" },
    weight_min: { cs: "vaha_min", en: "weight_min" },
    weight_max: { cs: "vaha_max", en: "weight_max" },
    created_at: { cs: "created_at", en: "created_at" },
  },
  animals: {
    id: { cs: "id", en: "id" },
    user_id: { cs: "user_id", en: "user_id" },
    type: { cs: "druh", en: "type" },
    name: { cs: "jmeno", en: "name" },
    weight: { cs: "vaha", en: "weight" },
    born: { cs: "narozen", en: "born" },
    consumption: { cs: "spotreba", en: "consumption" },
    created_at: { cs: "created_at", en: "created_at" },
  },
  caretakers: {
    id: { cs: "id", en: "id" },
    user_id: { cs: "user_id", en: "user_id" },
    name: { cs: "jmeno", en: "name" },
    born: { cs: "narozen", en: "born" },
    created_at: { cs: "created_at", en: "created_at" },
  },
  treats: {
    id: { cs: "id", en: "id" },
    user_id: { cs: "user_id", en: "user_id" },
    caretaker: { cs: "osetrovatel", en: "caretaker" },
    animal: { cs: "zvire", en: "animal" },
    created_at: { cs: "created_at", en: "created_at" },
  },
  likes: {
    id: { cs: "id", en: "id" },
    user_id: { cs: "user_id", en: "user_id" },
    caretaker: { cs: "osetrovatel", en: "caretaker" },
    type: { cs: "druh", en: "type" },
    created_at: { cs: "created_at", en: "created_at" },
  },
  food: {
    id: { cs: "id", en: "id" },
    user_id: { cs: "user_id", en: "user_id" },
    name: { cs: "nazev", en: "name" },
    calories: { cs: "kalorie", en: "calories" },
    proteins: { cs: "bilkoviny", en: "proteins" },
    carbohydrates: { cs: "sacharidy", en: "carbohydrates" },
    fats: { cs: "tuky", en: "fats" },
    weight: { cs: "vaha", en: "weight" },
    created_at: { cs: "created_at", en: "created_at" },
  },
  eats: {
    id: { cs: "id", en: "id" },
    user_id: { cs: "user_id", en: "user_id" },
    type: { cs: "druh", en: "type" },
    food: { cs: "potrava", en: "food" },
    created_at: { cs: "created_at", en: "created_at" },
  },
  menu: {
    id: { cs: "id", en: "id" },
    user_id: { cs: "user_id", en: "user_id" },
    animal: { cs: "zvire", en: "animal" },
    food: { cs: "potrava", en: "food" },
    units: { cs: "jednotek", en: "units" },
    feeding_time: { cs: "cas_krmeni", en: "feeding_time" },
    created_at: { cs: "created_at", en: "created_at" },
  },
} as const

// Display labels for UI (human-readable)
export const displayLabels = {
  types: {
    _table: { cs: "Druhy", en: "Types" },
    id: { cs: "ID", en: "ID" },
    name: { cs: "Název", en: "Name" },
    weight_min: { cs: "Min. váha", en: "Min Weight" },
    weight_max: { cs: "Max. váha", en: "Max Weight" },
  },
  animals: {
    _table: { cs: "Zvířata", en: "Animals" },
    id: { cs: "ID", en: "ID" },
    type: { cs: "Druh", en: "Type" },
    name: { cs: "Jméno", en: "Name" },
    weight: { cs: "Váha", en: "Weight" },
    born: { cs: "Narozen", en: "Born" },
    consumption: { cs: "Spotřeba", en: "Consumption" },
  },
  caretakers: {
    _table: { cs: "Ošetřovatelé", en: "Caretakers" },
    id: { cs: "ID", en: "ID" },
    name: { cs: "Jméno", en: "Name" },
    born: { cs: "Narozen", en: "Born" },
  },
  treats: {
    _table: { cs: "Ošetřuje", en: "Treats" },
    id: { cs: "ID", en: "ID" },
    caretaker: { cs: "Ošetřovatel", en: "Caretaker" },
    animal: { cs: "Zvíře", en: "Animal" },
  },
  likes: {
    _table: { cs: "Má rád", en: "Likes" },
    id: { cs: "ID", en: "ID" },
    caretaker: { cs: "Ošetřovatel", en: "Caretaker" },
    type: { cs: "Druh", en: "Type" },
  },
  food: {
    _table: { cs: "Potrava", en: "Food" },
    id: { cs: "ID", en: "ID" },
    name: { cs: "Název", en: "Name" },
    calories: { cs: "Kalorie", en: "Calories" },
    proteins: { cs: "Bílkoviny", en: "Proteins" },
    carbohydrates: { cs: "Sacharidy", en: "Carbohydrates" },
    fats: { cs: "Tuky", en: "Fats" },
    weight: { cs: "Váha", en: "Weight" },
  },
  eats: {
    _table: { cs: "Žere", en: "Eats" },
    id: { cs: "ID", en: "ID" },
    type: { cs: "Druh", en: "Type" },
    food: { cs: "Potrava", en: "Food" },
  },
  menu: {
    _table: { cs: "Jídelníček", en: "Menu" },
    id: { cs: "ID", en: "ID" },
    animal: { cs: "Zvíře", en: "Animal" },
    food: { cs: "Potrava", en: "Food" },
    units: { cs: "Jednotek", en: "Units" },
    feeding_time: { cs: "Čas krmení", en: "Feeding Time" },
  },
} as const

/**
 * Get table name for the specified language
 */
export function getTableName(table: TableKey, lang: Language): string {
  return tableNames[table][lang]
}

/**
 * Get column name for the specified table and language
 */
export function getColumnName(
  table: TableKey,
  column: string,
  lang: Language
): string {
  const tableColumns = columnNames[table] as Record<string, { cs: string; en: string }>
  return tableColumns[column]?.[lang] || column
}

/**
 * Get display label for UI
 */
export function getDisplayLabel(
  table: TableKey,
  column: string,
  lang: Language
): string {
  const tableLabels = displayLabels[table] as Record<string, { cs: string; en: string }>
  return tableLabels[column]?.[lang] || column
}

/**
 * Get table display name for UI
 */
export function getTableDisplayName(table: TableKey, lang: Language): string {
  const tableLabels = displayLabels[table] as Record<string, { cs: string; en: string }>
  return tableLabels["_table"]?.[lang] || table
}

/**
 * Get all column names for a table in the specified language
 */
export function getAllColumnNames(
  table: TableKey,
  lang: Language
): Record<string, string> {
  const tableColumns = columnNames[table] as Record<string, { cs: string; en: string }>
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(tableColumns)) {
    result[key] = value[lang]
  }

  return result
}

/**
 * Map language code from app to schema language
 */
export function getSchemaLanguage(appLanguage: string): Language {
  return appLanguage === "cs" ? "cs" : "en"
}
