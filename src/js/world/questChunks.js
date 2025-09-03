// Quest-specific chunk generation and spawning
// Handles spawning quest enemies and items when player enters specific chunks

import { CANDY_KINGDOM_QUESTS } from '../quests/candyKingdomQuests.js';

// Check and spawn quest content when entering a chunk
export function spawnQuestContent(state, chunkX, chunkY) {
  const chunkKey = `${chunkX},${chunkY}`;
  
  // Check for quest-specific spawns
  if (state.questSpawns && state.questSpawns[chunkKey]) {
    const spawns = state.questSpawns[chunkKey];
    
    // Add monsters
    if (Array.isArray(spawns)) {
      state.chunk.monsters = state.chunk.monsters || [];
      state.chunk.monsters.push(...spawns);
    } else {
      if (spawns.monsters) {
        state.chunk.monsters = state.chunk.monsters || [];
        state.chunk.monsters.push(...spawns.monsters);
      }
      
      if (spawns.items) {
        state.chunk.items = state.chunk.items || [];
        state.chunk.items.push(...spawns.items);
      }
      
      if (spawns.destructibles) {
        state.chunk.destructibles = state.chunk.destructibles || [];
        state.chunk.destructibles.push(...spawns.destructibles);
      }
      
      if (spawns.locations) {
        state.chunk.locations = state.chunk.locations || [];
        state.chunk.locations.push(...spawns.locations);
      }
      
      if (spawns.harvestables) {
        state.chunk.harvestables = state.chunk.harvestables || [];
        state.chunk.harvestables.push(...spawns.harvestables);
      }
    }
    
    // Clear the spawns so they don't spawn again
    delete state.questSpawns[chunkKey];
  }
  
  // Handle specific location spawns
  handleLocationSpawns(state, chunkX, chunkY);
}

// Handle specific location-based spawns
function handleLocationSpawns(state, chunkX, chunkY) {
  // Pup Gang near Convenience Store (0, 1)
  if (chunkX === 0 && chunkY === 1) {
    if (state.questSpawns?.pupGang) {
      state.chunk.monsters = state.chunk.monsters || [];
      state.chunk.monsters.push(...state.questSpawns.pupGang);
      delete state.questSpawns.pupGang;
    }
  }
  
  // Licorice Woods bandits (-1, 1)
  if (chunkX === -1 && chunkY === 1) {
    if (state.licoriceWoodsSpawns) {
      state.chunk.monsters = state.chunk.monsters || [];
      state.chunk.monsters.push(...state.licoriceWoodsSpawns.monsters);
      
      state.chunk.destructibles = state.chunk.destructibles || [];
      state.chunk.destructibles.push(...state.licoriceWoodsSpawns.destructibles);
      
      state.chunk.locations = state.chunk.locations || [];
      state.chunk.locations.push(...state.licoriceWoodsSpawns.locations);
      
      delete state.licoriceWoodsSpawns;
    }
  }
  
  // Cotton Candy Forest (0, -1)
  if (chunkX === 0 && chunkY === -1) {
    if (state.forestSpawns) {
      if (state.forestSpawns.monsters) {
        state.chunk.monsters = state.chunk.monsters || [];
        state.chunk.monsters.push(...state.forestSpawns.monsters);
      }
      
      if (state.forestSpawns.harvestables) {
        state.chunk.harvestables = state.chunk.harvestables || [];
        state.chunk.harvestables.push(...state.forestSpawns.harvestables);
      }
      
      if (state.forestSpawns.locations) {
        state.chunk.locations = state.chunk.locations || [];
        state.chunk.locations.push(...state.forestSpawns.locations);
      }
      
      delete state.forestSpawns;
    }
  }
  
  // Cemetery (1, 0)
  if (chunkX === 1 && chunkY === 0) {
    const cemeteryKey = `${chunkX},${chunkY}`;
    if (state.questSpawns && state.questSpawns[cemeteryKey]) {
      const spawns = state.questSpawns[cemeteryKey];
      
      if (spawns.monsters) {
        state.chunk.monsters = state.chunk.monsters || [];
        state.chunk.monsters.push(...spawns.monsters);
      }
      
      if (spawns.destructibles) {
        state.chunk.destructibles = state.chunk.destructibles || [];
        state.chunk.destructibles.push(...spawns.destructibles);
      }
      
      delete state.questSpawns[cemeteryKey];
    }
  }
  
  // Caves (-1, 0)
  if (chunkX === -1 && chunkY === 0) {
    if (state.caveSpawns) {
      if (state.caveSpawns.harvestables) {
        state.chunk.harvestables = state.chunk.harvestables || [];
        state.chunk.harvestables.push(...state.caveSpawns.harvestables);
      }
      
      delete state.caveSpawns;
    }
  }
  
  // Summer Estate (2, 0)
  if (chunkX === 2 && chunkY === 0) {
    if (state.estateSpawns) {
      if (state.estateSpawns.monsters) {
        state.chunk.monsters = state.chunk.monsters || [];
        state.chunk.monsters.push(...state.estateSpawns.monsters);
      }
      
      if (state.estateSpawns.locations) {
        state.chunk.locations = state.chunk.locations || [];
        state.chunk.locations.push(...state.estateSpawns.locations);
      }
      
      delete state.estateSpawns;
    }
  }
  
  // Sewers (special handling)
  if (state.inSewers) {
    if (state.sewerSpawns) {
      if (state.sewerSpawns.monsters) {
        state.chunk.monsters = state.chunk.monsters || [];
        state.chunk.monsters.push(...state.sewerSpawns.monsters);
      }
      
      if (state.sewerSpawns.containers) {
        state.chunk.containers = state.chunk.containers || [];
        state.chunk.containers.push(...state.sewerSpawns.containers);
      }
      
      delete state.sewerSpawns;
    }
  }
}

// Handle dungeon-specific spawns
export function spawnDungeonContent(state, dungeonLevel) {
  if (!state.dungeonSpawns) return;
  
  const levelSpawns = state.dungeonSpawns[dungeonLevel];
  if (!levelSpawns) return;
  
  // Add monsters
  if (levelSpawns.monsters) {
    state.chunk.monsters = state.chunk.monsters || [];
    state.chunk.monsters.push(...levelSpawns.monsters);
  }
  
  // Add items
  if (levelSpawns.items) {
    state.chunk.items = state.chunk.items || [];
    state.chunk.items.push(...levelSpawns.items);
  }
  
  // Add destructibles
  if (levelSpawns.destructibles) {
    state.chunk.destructibles = state.chunk.destructibles || [];
    state.chunk.destructibles.push(...levelSpawns.destructibles);
  }
  
  // Clear the spawns for this level
  delete state.dungeonSpawns[dungeonLevel];
}

// Handle special quest locations (orphanage, castle, etc.)
export function handleSpecialLocations(state, location) {
  switch(location) {
    case 'candy_orphanage':
      // Spawn orphanage investigation items
      if (state.orphanageSpawns) {
        state.chunk.items = state.chunk.items || [];
        state.chunk.items.push(...state.orphanageSpawns.items);
        
        state.npcs = state.npcs || [];
        state.npcs.push(...state.orphanageSpawns.npcs);
        
        delete state.orphanageSpawns;
      }
      break;
      
    case 'castle_area':
      // Spawn dark magic components
      if (state.castleSpawns) {
        state.chunk.items = state.chunk.items || [];
        state.chunk.items.push(...state.castleSpawns.items);
        
        state.chunk.locations = state.chunk.locations || [];
        state.chunk.locations.push(...state.castleSpawns.locations);
        
        delete state.castleSpawns;
      }
      break;
      
    case 'town_square':
      // Spawn rumor investigation NPCs
      if (state.rumorSpawns) {
        state.npcs = state.npcs || [];
        state.npcs.push(...state.rumorSpawns.npcs);
        
        state.chunk.items = state.chunk.items || [];
        state.chunk.items.push(...state.rumorSpawns.items);
        
        delete state.rumorSpawns;
      }
      break;
  }
}

// Check if quest objectives are met when defeating enemies
export function onEnemyDefeated(state, enemy) {
  // Import quest functions
  import('../quests/candyKingdomQuests.js').then(module => {
    module.checkQuestObjective(state, 'defeat_enemies', enemy.id);
    
    if (enemy.isBoss) {
      module.checkQuestObjective(state, 'defeat_boss', enemy.id);
    }
  });
  
  // Drop quest items
  if (enemy.loot) {
    for (const lootItem of enemy.loot) {
      if (Math.random() < (lootItem.chance || 0.5)) {
        dropQuestItem(state, lootItem, enemy.x, enemy.y);
      }
    }
  }
}

// Drop quest items
function dropQuestItem(state, lootItem, x, y) {
  const item = {
    type: 'item',
    item: {
      id: lootItem.item,
      name: lootItem.item.replace(/_/g, ' '),
      amount: lootItem.amount || 1
    },
    x,
    y
  };
  
  state.chunk.items = state.chunk.items || [];
  state.chunk.items.push(item);
  
  if (state.log) {
    state.log(`${item.item.name} dropped!`, 'item');
  }
}

// Check quest objectives when collecting items
export function onItemCollected(state, item) {
  import('../quests/candyKingdomQuests.js').then(module => {
    module.checkQuestObjective(state, 'collect', item.id || item.item?.id);
  });
}

// Check quest objectives when destroying objects
export function onObjectDestroyed(state, object) {
  import('../quests/candyKingdomQuests.js').then(module => {
    module.checkQuestObjective(state, 'destroy', object.id);
  });
  
  // Run destroy callback if exists
  if (object.onDestroy) {
    object.onDestroy(state);
  }
}