// src/engine/materials.js
// Minimal registry for materials & statuses used by the engine

/** @typedef {{ id:string, tags?:string[], props?:Record<string,any> }} Entry */

const MATERIALS = new Map();
const STATUSES  = new Map();

// --- Registry API ---
export function registerMaterial(mat /** @type {Entry} */) {
  console.log(`[ENGINE] Registered material '${mat.id}' with tags: [${(mat.tags || []).join(', ')}]`);
  MATERIALS.set(mat.id, { id: mat.id, tags: [...(mat.tags ?? [])], props: { ...(mat.props || {}) } });
}
export function getMaterial(id) { return MATERIALS.get(id); }
export function allMaterials() { return [...MATERIALS.values()]; }

export function registerStatus(st /** @type {Entry} */) {
  console.log(`[ENGINE] Registered status '${st.id}' with tags: [${(st.tags || []).join(', ')}]`);
  STATUSES.set(st.id, { id: st.id, tags: [...(st.tags ?? [])], props: { ...(st.props || {}) } });
}
export function getStatus(id) { return STATUSES.get(id); }
export function allStatuses() { return [...STATUSES.values()]; }

export function clearAll() { MATERIALS.clear(); STATUSES.clear(); }

// --- Minimal defaults for your test ---

// Water as a material (used by adapter when on '~' tiles or mirrored from 'wet')
registerMaterial({
  id: 'water',
  tags: ['liquid', 'extinguisher', 'conductive'],
  props: { heatCapacity: 100, extinguishingPower: 25, conductivityAmp: 1.5 }
});

// Optional: metal gear contributes mild conductivity
registerMaterial({
  id: 'metal',
  tags: ['solid', 'conductive'],
  props: { conductivityAmp: 1.2 }
});

// Material: candy dust (explosive when exposed to fire)
registerMaterial({
  id: 'candy_dust',
  tags: ['powder', 'flammable', 'explosive', 'sweet'],
  props: { 
    explosionDamage: 15,
    explosionRadius: 2,
    ignitionThreshold: 1,  // Ignites immediately on contact with fire
    volatility: 'high'
  }
});

// Note: Status definitions have been moved to statusDefinitions.js
// to avoid duplicates and keep all status registrations in one place