import { STORE_PREFIX } from './config.js';

export function chunkKey(seed, cx, cy) { 
  return `${STORE_PREFIX}:${seed}:${cx}:${cy}`; 
}

export function saveChunk(seed, cx, cy, chunk) { 
  try { 
    localStorage.setItem(chunkKey(seed, cx, cy), JSON.stringify(chunk)); 
  } catch(e) {} 
}

export function loadChunk(seed, cx, cy) { 
  const raw = localStorage.getItem(chunkKey(seed, cx, cy)); 
  return raw ? JSON.parse(raw) : null; 
}

export function clearWorld() { 
  Object.keys(localStorage)
    .filter(k => k.startsWith(STORE_PREFIX + ":"))
    .forEach(k => localStorage.removeItem(k)); 
}