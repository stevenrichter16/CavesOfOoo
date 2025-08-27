// src/engine/materials.js
// Minimal registry for materials & statuses used by the engine

/** @typedef {{ id:string, tags?:string[], props?:Record<string,any> }} Entry */

const MATERIALS = new Map();
const STATUSES  = new Map();

// --- Registry API ---
export function registerMaterial(mat /** @type {Entry} */) {
  MATERIALS.set(mat.id, { id: mat.id, tags: mat.tags ?? [], props: { ...(mat.props || {}) } });
}
export function getMaterial(id) { return MATERIALS.get(id); }
export function allMaterials() { return [...MATERIALS.values()]; }

export function registerStatus(st /** @type {Entry} */) {
  STATUSES.set(st.id, { id: st.id, tags: st.tags ?? [], props: { ...(st.props || {}) } });
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

// Status: wet (IMPORTANT: carries 'conductive' tag)
registerStatus({
  id: 'wet',
  tags: ['coated', 'conductive', 'extinguisher'],
  props: { quantity: 20, extinguishingPower: 20, conductivityAmp: 1.5 }
});

// Status: burning (not used in the instant-kill test, but handy later)
registerStatus({
  id: 'burning',
  tags: ['fire', 'dot'],
  props: { intensity: 1, temperatureC: 600 }
});