export const rnd = n => Math.floor(Math.random() * n);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const choice = arr => arr[rnd(arr.length)];
export const roll = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

export function mulberry32(a) { 
  return function() { 
    let t = a += 0x6D2B79F5; 
    t = Math.imul(t ^ t>>>15, t | 1);
    t ^= t + Math.imul(t ^ t>>>7, t | 61); 
    return ((t ^ t>>>14) >>> 0) / 4294967296; 
  }; 
}

export function seededRand(seed) { 
  const f = mulberry32(seed>>>0); 
  return { 
    next: f, 
    int: n => Math.floor(f() * n), 
    pick: arr => arr[Math.floor(f() * arr.length)],
    between: (min, max) => min + Math.floor(f() * (max - min + 1))
  }; 
}

export function hashStr(s) { 
  let h = 2166136261>>>0; 
  for(let i = 0; i < s.length; i++) { 
    h ^= s.charCodeAt(i); 
    h = Math.imul(h, 16777619); 
  } 
  return h>>>0; 
}

export function esc(s) { 
  return s.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c])); 
}

export function dist(x1, y1, x2, y2) { 
  return Math.abs(x1 - x2) + Math.abs(y1 - y2); 
}