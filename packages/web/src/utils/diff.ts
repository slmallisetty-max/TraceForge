// Deep object comparison utilities for trace diffing

export interface DiffChange {
  path: string;
  from: any;
  to: any;
  type: 'changed' | 'added' | 'removed';
}

export interface JsonDiff {
  added: DiffChange[];
  removed: DiffChange[];
  changed: DiffChange[];
}

export interface TraceDiffResult {
  request: JsonDiff;
  response: JsonDiff;
  metadata: JsonDiff;
  similarity_score: number;
}

/**
 * Compare two objects and return structured diff
 */
export function deepDiff(obj1: any, obj2: any, path: string = ''): DiffChange[] {
  const changes: DiffChange[] = [];

  // Handle primitive types
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      changes.push({
        path,
        from: obj1,
        to: obj2,
        type: 'changed',
      });
    }
    return changes;
  }

  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    const maxLen = Math.max(obj1.length, obj2.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`;
      if (i >= obj1.length) {
        changes.push({ path: itemPath, from: undefined, to: obj2[i], type: 'added' });
      } else if (i >= obj2.length) {
        changes.push({ path: itemPath, from: obj1[i], to: undefined, type: 'removed' });
      } else {
        changes.push(...deepDiff(obj1[i], obj2[i], itemPath));
      }
    }
    return changes;
  }

  // Handle objects
  const keys1 = new Set(Object.keys(obj1));
  const keys2 = new Set(Object.keys(obj2));
  const allKeys = new Set([...keys1, ...keys2]);

  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;

    if (!keys1.has(key)) {
      // Added in obj2
      changes.push({ path: newPath, from: undefined, to: obj2[key], type: 'added' });
    } else if (!keys2.has(key)) {
      // Removed in obj2
      changes.push({ path: newPath, from: obj1[key], to: undefined, type: 'removed' });
    } else {
      // Exists in both - recurse
      changes.push(...deepDiff(obj1[key], obj2[key], newPath));
    }
  }

  return changes;
}

/**
 * Calculate similarity score between two objects (0-1)
 */
export function calculateSimilarity(obj1: any, obj2: any): number {
  const changes = deepDiff(obj1, obj2);
  
  if (changes.length === 0) return 1.0;

  // Count total fields in both objects
  const countFields = (obj: any): number => {
    if (typeof obj !== 'object' || obj === null) return 1;
    if (Array.isArray(obj)) return obj.reduce((sum: number, item) => sum + countFields(item), 0);
    return Object.values(obj).reduce((sum: number, value) => sum + countFields(value), 0);
  };

  const totalFields = Math.max(countFields(obj1), countFields(obj2));
  const changedFields = changes.length;

  return Math.max(0, 1 - (changedFields / totalFields));
}

/**
 * Categorize changes by type
 */
export function categorizeDiff(changes: DiffChange[]): JsonDiff {
  return {
    added: changes.filter(c => c.type === 'added'),
    removed: changes.filter(c => c.type === 'removed'),
    changed: changes.filter(c => c.type === 'changed'),
  };
}

/**
 * Format value for display (truncate long strings/objects)
 */
export function formatValue(value: any, maxLength: number = 100): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}
