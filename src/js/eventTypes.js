// Central registry of all event types in the game.
// Use these instead of raw strings to avoid typos.

export const EventType = {
  // Movement
  WillMove: 'willMove',         // { id, from:{x,y}, to:{x,y}, cancel? }
  DidMove: 'didMove',           // { id, from:{x,y}, to:{x,y} }
  DidStep: 'didStep',           // { id, x, y }
  BlockedMove: 'blockedMove',   // { id, to:{x,y}, blocker:'wall'|'entity'|'door' }

  // Turn
  WillTurn: 'willTurn',
  DidTurn: 'didTurn',

  // World
  WillChangeChunk: 'willChangeChunk',
  DidChangeChunk: 'didChangeChunk',

  // Entity
  EntitySpawned: 'entitySpawned',

  // Combat (for bump-to-attack)
  WillAttack: 'willAttack',
  DidAttack: 'didAttack',
  Hit: 'hit',
  Miss: 'miss',
  Crit: 'crit',
  TookDamage: 'tookDamage',
  EntityDied: 'entityDied',

  // Status Effects
  StatusEffectRegister: 'statusEffectRegister',
  StatusEffectPerform: 'statusEffectPerform',
  StatusEffectExpired: 'statusEffectExpired',

  // Inventory
  InventoryEquipped: 'inventoryEquipped',
  InventoryUnequipped: 'inventoryUnequipped',

  // UI / Log
  Log: 'log',
  FloatingText: 'floatingText',   // for damage/heal numbers
  PlaySound: 'playSound',          // optional for SFX
  Shake: 'shake',                  // optional for screen shake
  
  // Gear events
  GearEffectTriggered: 'gearEffectTriggered',
  Equipped: 'equipped',
  Unequipped: 'unequipped',
  
  // Shop events
  VendorInteraction: 'vendorInteraction',
  DoorOpened: 'doorOpened',
  WallCollision: 'wallCollision',
  MovementBlocked: 'movementBlocked',
  
  // Cursor events
  CursorActivated: 'cursorActivated',
  CursorDeactivated: 'cursorDeactivated',
  CursorMoved: 'cursorMoved',
  CursorAction: 'cursorAction',
  ExamineTile: 'examineTile',
  CursorTargetEnemy: 'cursorTargetEnemy',
};