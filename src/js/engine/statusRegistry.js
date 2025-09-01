// Status registry - re-exports from materials.js for compatibility
import { registerStatus as register, getStatus as get, allStatuses } from './materials.js';

export const registerStatus = register;
export const getStatus = get;

export function getStatusRegistry() {
  const statuses = allStatuses();
  const registry = {};
  for (const status of statuses) {
    registry[status.id] = status;
  }
  return registry;
}

export function getAllStatuses() {
  return allStatuses().map(s => s.id);
}

export function getStatusTags(id) {
  const status = get(id);
  return status?.tags || [];
}

export function getStatusProps(id) {
  const status = get(id);
  return status?.props || {};
}