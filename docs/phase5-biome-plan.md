# Phase 5: Adventure Time Biome Improvements Plan

## Overview
Enhance the biome system with lore-accurate Adventure Time biomes, using Perlin noise for natural distribution while maintaining the unique and bizarre nature of the Land of Ooo.

## Adventure Time Biomes

### Core Biomes (Must Have)

#### 1. **Candy Kingdom Territory**
- **Terrain**: Candy grass (pink/purple), lollipop trees, chocolate dirt
- **Features**: 
  - Candy cane lamp posts
  - Gumball guardians (rare)
  - Sugar crystal formations
  - Candy houses (near edges)
- **NPCs**: Candy People variants
- **Resources**: Various candies, sugar, syrup

#### 2. **Grasslands**
- **Terrain**: Normal green grass, occasional flowers
- **Features**:
  - Finn and Jake's treehouse (specific location)
  - Random dungeon entrances
  - Occasional ruins
- **NPCs**: Wildlife, random adventurers
- **Resources**: Apples, berries, wood

#### 3. **Ice King's Domain**
- **Terrain**: Snow, ice, frozen ground
- **Features**:
  - Ice spikes
  - Frozen lakes
  - Ice King's castle (specific location)
  - Snow goose nests
- **NPCs**: Penguins, snow golems, ice creatures
- **Resources**: Ice, crystals, fish

#### 4. **Fire Kingdom**
- **Terrain**: Lava pools, obsidian, charred ground
- **Features**:
  - Lava falls
  - Fire pillars
  - Flame buildings (rare)
- **NPCs**: Flame people, fire wolves
- **Resources**: Coal, obsidian, flame gems

#### 5. **Dungeon of the Crystal Eye** (Underground/Dungeon biome)
- **Terrain**: Stone, darkness, crystals
- **Features**:
  - Crystal formations
  - Traps
  - Treasure rooms
  - Ancient mechanisms
- **NPCs**: Monsters, dungeon creatures
- **Resources**: Gems, gold, ancient artifacts

### Extended Biomes

#### 6. **Cloud Kingdom**
- **Terrain**: Cloud blocks, rainbow bridges
- **Features**:
  - Cloud houses
  - Bouncy cloud platforms
  - Rainbow pools
- **NPCs**: Cloud people
- **Resources**: Cloud stuff, rainbow essence

#### 7. **Marceline's Cave**
- **Terrain**: Dark stone, red accents
- **Features**:
  - Bass guitars
  - Red furniture
  - Memory artifacts
- **NPCs**: Marceline (unique)
- **Resources**: Music sheets, vampire artifacts

#### 8. **Breakfast Kingdom**
- **Terrain**: Bacon strips, egg platforms, toast ground
- **Features**:
  - Syrup lakes
  - Breakfast buildings
  - Butter pads
- **NPCs**: Breakfast people
- **Resources**: Breakfast foods

#### 9. **Lemongrab's Earldom**
- **Terrain**: Lemon yellow ground, sour grass
- **Features**:
  - Lemon castle
  - Surveillance equipment
  - Lemon trees
- **NPCs**: Lemon people
- **Resources**: Lemons, sour candies

#### 10. **Bad Lands/Desert**
- **Terrain**: Red sand, rock formations
- **Features**:
  - Canyon mazes
  - Desert ruins
  - Cactus variations
  - Door Lord's doors
- **NPCs**: Desert creatures, bandits
- **Resources**: Cactus juice, desert gems

## Technical Implementation

### BiomeManager Enhancement
```javascript
class BiomeManager {
  constructor(seed) {
    this.seed = seed;
    this.noiseGenerators = {
      temperature: new PerlinNoise(seed + 'temp'),
      humidity: new PerlinNoise(seed + 'humid'),
      magic: new PerlinNoise(seed + 'magic'),
      evil: new PerlinNoise(seed + 'evil')
    };
    
    // Adventure Time biome rules
    this.biomeRules = {
      'candy_kingdom': {
        center: { x: 0, y: 0 },
        radius: 15,
        priority: 10
      },
      'ice_kingdom': {
        center: { x: -50, y: 50 },
        radius: 20,
        priority: 9
      },
      'fire_kingdom': {
        center: { x: 50, y: -50 },
        radius: 20,
        priority: 9
      }
    };
  }
  
  getBiome(cx, cy) {
    // Check for specific kingdom territories first
    for (const [biome, rule] of Object.entries(this.biomeRules)) {
      const dist = Math.sqrt(
        Math.pow(cx - rule.center.x, 2) + 
        Math.pow(cy - rule.center.y, 2)
      );
      if (dist <= rule.radius) {
        return biome;
      }
    }
    
    // Use noise for general biomes
    const temp = this.noiseGenerators.temperature.get(cx * 0.1, cy * 0.1);
    const humidity = this.noiseGenerators.humidity.get(cx * 0.1, cy * 0.1);
    const magic = this.noiseGenerators.magic.get(cx * 0.05, cy * 0.05);
    const evil = this.noiseGenerators.evil.get(cx * 0.08, cy * 0.08);
    
    // Adventure Time logic
    if (magic > 0.7) {
      if (temp > 0.5) return 'cloud_kingdom';
      else return 'crystal_dimension';
    }
    
    if (evil > 0.6) {
      return 'dungeon';
    }
    
    if (temp < -0.3) {
      return 'ice_kingdom_territory';
    }
    
    if (temp > 0.6 && humidity < -0.3) {
      return 'bad_lands';
    }
    
    if (temp > 0.7) {
      return 'fire_kingdom_territory';
    }
    
    // Default to grasslands
    return 'grasslands';
  }
}
```

### Biome Features
```javascript
class BiomeFeatures {
  static features = {
    candy_kingdom: {
      common: ['candy_grass', 'lollipop_tree', 'gumdrop_bush'],
      uncommon: ['candy_house', 'candy_cane_lamp'],
      rare: ['gumball_guardian', 'candy_dungeon_entrance']
    },
    grasslands: {
      common: ['grass', 'tree', 'flower'],
      uncommon: ['ruins', 'campsite'],
      rare: ['dungeon_entrance', 'treehouse']
    },
    ice_kingdom: {
      common: ['snow', 'ice_spike', 'frozen_tree'],
      uncommon: ['ice_cave', 'penguin_nest'],
      rare: ['ice_palace_chunk', 'frozen_artifact']
    },
    fire_kingdom: {
      common: ['lava_pool', 'charred_ground', 'fire_geyser'],
      uncommon: ['obsidian_spire', 'flame_vent'],
      rare: ['flame_palace_chunk', 'fire_gem_deposit']
    }
  };
}
```

## Testing Strategy

### Lore Accuracy Tests
```javascript
describe('Adventure Time Biome Accuracy', () => {
  it('should place Candy Kingdom at origin', () => {
    const biome = biomeManager.getBiome(0, 0);
    expect(biome).toBe('candy_kingdom');
  });
  
  it('should have Ice Kingdom in cold north', () => {
    const biome = biomeManager.getBiome(-50, 50);
    expect(biome).toBe('ice_kingdom');
  });
  
  it('should have Fire Kingdom in hot south', () => {
    const biome = biomeManager.getBiome(50, -50);
    expect(biome).toBe('fire_kingdom');
  });
  
  it('should generate appropriate features per biome', () => {
    const candyChunk = generateChunk('candy_kingdom', 0, 0);
    expect(candyChunk.features).toContain('lollipop_tree');
    expect(candyChunk.features).not.toContain('normal_tree');
  });
});
```

### Distribution Tests
```javascript
describe('Biome Distribution', () => {
  it('should create natural biome clusters', () => {
    const region = generateRegion(-10, -10, 20, 20);
    const biomeClusters = analyzeClusters(region);
    
    // Biomes should form regions, not random pixels
    expect(biomeClusters.averageSize).toBeGreaterThan(5);
  });
  
  it('should have smooth transitions', () => {
    const transitionZone = getTransitionBetween('candy_kingdom', 'grasslands');
    expect(transitionZone).toContain('candy_grass_fading');
    expect(transitionZone).toContain('mixed_vegetation');
  });
});
```

## Implementation Phases

### Phase 5.1: Core Biome System (Days 1-2)
- [ ] Implement PerlinNoise generator
- [ ] Create BiomeManager with AT rules
- [ ] Add biome detection to ChunkPipeline
- [ ] Test biome distribution

### Phase 5.2: Biome Features (Days 3-4)
- [ ] Implement feature tables for each biome
- [ ] Add feature generation to FeatureStep
- [ ] Create biome-specific tile sets
- [ ] Test feature placement

### Phase 5.3: Biome Transitions (Day 5)
- [ ] Implement smooth biome edges
- [ ] Add transition features
- [ ] Create mixed biome zones
- [ ] Test transition aesthetics

### Phase 5.4: Testing & Polish (Day 6)
- [ ] Verify lore accuracy
- [ ] Test performance impact
- [ ] Balance biome distribution
- [ ] Document biome system

## Success Criteria

1. **Lore Accuracy**: Biomes match Adventure Time locations and aesthetics
2. **Natural Distribution**: Biomes form logical regions, not random scatter
3. **Smooth Transitions**: No harsh biome edges
4. **Performance**: Generation still < 50ms per chunk
5. **Variety**: Each biome feels unique and interesting

## Notes on Adventure Time Lore

- The Land of Ooo is post-apocalyptic Earth (Great Mushroom War)
- Magic and science coexist
- Biomes can be surreal and don't need real-world logic
- Candy Kingdom is central to many stories
- Ice King's domain is in the mountains
- Fire Kingdom is underground/volcanic
- Many kingdoms are small (Breakfast Kingdom, Lemongrab's Earldom)
- Dungeons appear randomly throughout the land
- The landscape is whimsical and often food-themed