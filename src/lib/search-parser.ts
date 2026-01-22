/**
 * Advanced Search Parser
 * Parses search queries with field-specific syntax like:
 * - id:123
 * - n:"John" (name)
 * - t:"slug" (type)
 * etc.
 */

export type SearchField = 
  | 'id' 
  | 'name' | 'jmeno' 
  | 'type' | 'druh' 
  | 'weight' | 'vaha'
  | 'born' | 'narozen'
  | 'title' | 'nazev'
  | 'caretaker' | 'osetrovatel'
  | 'animal' | 'zvire'
  | 'general'

export interface ParsedSearchTerm {
  field: SearchField
  value: string
}

// Field prefix mappings for EN
const EN_PREFIXES: Record<string, SearchField> = {
  'id': 'id',
  't': 'type',
  'n': 'name',
  'w': 'weight',
  'b': 'born',
  'c': 'caretaker',
  'a': 'animal',
  'nv': 'title', // for types page (name/nazev)
}

// Field prefix mappings for CZ
const CZ_PREFIXES: Record<string, SearchField> = {
  'id': 'id',
  'd': 'druh',
  'j': 'jmeno',
  'v': 'vaha',
  'n': 'narozen',
  'nv': 'nazev',
  'o': 'osetrovatel',
  'z': 'zvire',
}

/**
 * Parse a search query into structured terms
 * Supports formats like: 
 *   id:123
 *   n:John
 *   j:felix
 */
export function parseSearchQuery(query: string, isCzech: boolean): ParsedSearchTerm[] {
  const prefixes = isCzech ? CZ_PREFIXES : EN_PREFIXES
  const terms: ParsedSearchTerm[] = []
  
  if (!query.trim()) return terms
  
  // Check if the query contains any field prefix pattern (prefix:value)
  // Match patterns like: id:123, j:felix, d:kocka
  const fieldPattern = /([a-zA-Z]+):(\S+)/g
  let match
  let hasFieldMatches = false
  
  while ((match = fieldPattern.exec(query)) !== null) {
    const prefix = match[1].toLowerCase()
    let value = match[2]
    
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    
    // Only add if prefix is recognized AND value is not empty
    if (prefixes[prefix] && value) {
      hasFieldMatches = true
      terms.push({
        field: prefixes[prefix],
        value: value.toLowerCase()
      })
    }
  }
  
  // If no valid field-specific terms found, treat entire query as general search
  if (!hasFieldMatches) {
    terms.push({
      field: 'general',
      value: query.trim().toLowerCase()
    })
  }
  
  return terms
}

/**
 * Check if a value matches a search term (case-insensitive)
 */
export function matchesValue(value: string | number | null | undefined, searchValue: string): boolean {
  if (value === null || value === undefined) return false
  return String(value).toLowerCase().includes(searchValue)
}

/**
 * Filter function for animals page
 */
export function filterAnimals<T extends { id: number; name: string; type: number; weight: number; born: string }>(
  items: T[],
  searchQuery: string,
  isCzech: boolean,
  getTypeName: (id: number) => string
): T[] {
  const terms = parseSearchQuery(searchQuery, isCzech)
  
  return items.filter(item => {
    return terms.every(term => {
      switch (term.field) {
        case 'id':
          return matchesValue(item.id, term.value)
        case 'name':
        case 'jmeno':
          return matchesValue(item.name, term.value)
        case 'type':
        case 'druh':
          return matchesValue(getTypeName(item.type), term.value)
        case 'weight':
        case 'vaha':
          return matchesValue(item.weight, term.value)
        case 'born':
        case 'narozen':
          return matchesValue(item.born, term.value)
        case 'general':
          return matchesValue(item.name, term.value) ||
                 matchesValue(item.id, term.value) ||
                 matchesValue(getTypeName(item.type), term.value)
        default:
          return true
      }
    })
  })
}

/**
 * Filter function for caretakers page
 */
export function filterCaretakers<T extends { id: number; name: string; born: string }>(
  items: T[],
  searchQuery: string,
  isCzech: boolean
): T[] {
  const terms = parseSearchQuery(searchQuery, isCzech)
  
  return items.filter(item => {
    return terms.every(term => {
      switch (term.field) {
        case 'id':
          return matchesValue(item.id, term.value)
        case 'name':
        case 'jmeno':
        case 'caretaker':
        case 'osetrovatel':
          return matchesValue(item.name, term.value)
        case 'born':
        case 'narozen':
          return matchesValue(item.born, term.value)
        case 'general':
          return matchesValue(item.name, term.value) ||
                 matchesValue(item.id, term.value)
        default:
          return true
      }
    })
  })
}

/**
 * Filter function for types page
 */
export function filterTypes<T extends { id: number; name: string; weightMin: number; weightMax: number }>(
  items: T[],
  searchQuery: string,
  isCzech: boolean
): T[] {
  const terms = parseSearchQuery(searchQuery, isCzech)
  
  return items.filter(item => {
    return terms.every(term => {
      switch (term.field) {
        case 'id':
          return matchesValue(item.id, term.value)
        case 'name':
        case 'jmeno':
        case 'title':
        case 'nazev':
          return matchesValue(item.name, term.value)
        case 'weight':
        case 'vaha':
          return matchesValue(item.weightMin, term.value) || matchesValue(item.weightMax, term.value)
        case 'general':
          return matchesValue(item.name, term.value) ||
                 matchesValue(item.id, term.value)
        default:
          return true
      }
    })
  })
}

/**
 * Filter function for likes page
 */
export function filterLikes<T extends { id: number; caretakerId: number; typeId: number }>(
  items: T[],
  searchQuery: string,
  isCzech: boolean,
  getCaretakerName: (id: number) => string,
  getTypeName: (id: number) => string
): T[] {
  const terms = parseSearchQuery(searchQuery, isCzech)
  
  return items.filter(item => {
    return terms.every(term => {
      switch (term.field) {
        case 'id':
          return matchesValue(item.id, term.value)
        case 'caretaker':
        case 'osetrovatel':
          return matchesValue(getCaretakerName(item.caretakerId), term.value)
        case 'type':
        case 'druh':
          return matchesValue(getTypeName(item.typeId), term.value)
        case 'general':
          return matchesValue(getCaretakerName(item.caretakerId), term.value) ||
                 matchesValue(getTypeName(item.typeId), term.value) ||
                 matchesValue(item.id, term.value)
        default:
          return true
      }
    })
  })
}

/**
 * Filter function for treats page
 */
export function filterTreats<T extends { id: number; caretakerId: number; animalId: number }>(
  items: T[],
  searchQuery: string,
  isCzech: boolean,
  getCaretakerName: (id: number) => string,
  getAnimalName: (id: number) => string
): T[] {
  const terms = parseSearchQuery(searchQuery, isCzech)
  
  return items.filter(item => {
    return terms.every(term => {
      switch (term.field) {
        case 'id':
          return matchesValue(item.id, term.value)
        case 'caretaker':
        case 'osetrovatel':
          return matchesValue(getCaretakerName(item.caretakerId), term.value)
        case 'animal':
        case 'zvire':
          return matchesValue(getAnimalName(item.animalId), term.value)
        case 'general':
          return matchesValue(getCaretakerName(item.caretakerId), term.value) ||
                 matchesValue(getAnimalName(item.animalId), term.value) ||
                 matchesValue(item.id, term.value)
        default:
          return true
      }
    })
  })
}
