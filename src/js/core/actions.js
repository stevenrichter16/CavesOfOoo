// src/core/actions.js
export function Move(dx, dy) {
  return { type: 'move', dx, dy }; // later you can add meta: {sprint:true}
}