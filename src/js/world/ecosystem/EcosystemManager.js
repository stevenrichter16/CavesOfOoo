/**
 * Ecosystem Manager
 * Manages resource regeneration, population dynamics, and seasonal changes
 */

export class EcosystemManager {
  constructor(chunkSystem) {
    this.chunkSystem = chunkSystem;
    
    // Seasons
    this.seasons = ['spring', 'summer', 'fall', 'winter'];
    this.currentSeasonIndex = 0;
    this.seasonDuration = 90 * 288; // 90 days in ticks (5 min per tick)
    this.seasonTicks = 0;
    
    // Weather system reference
    this.weatherSystem = null;
    
    // Resource regeneration rates
    this.baseGrowthRates = {
      trees: 0.01,
      bushes: 0.02,
      grass: 0.05,
      stones: 0.001,
      flowers: 0.03
    };
    
    // Population dynamics parameters
    this.populationParams = {
      rabbits: {
        birthRate: 0.02,
        deathRate: 0.01,
        carryingCapacity: 100,
        predation: 0.03
      },
      wolves: {
        birthRate: 0.01,
        deathRate: 0.005,
        carryingCapacity: 20,
        huntingSuccess: 0.1
      }
    };
    
    // Seasonal modifiers
    this.seasonalModifiers = {
      spring: {
        growth: 1.5,
        birth: 1.3,
        death: 0.8
      },
      summer: {
        growth: 1.2,
        birth: 1.0,
        death: 0.9
      },
      fall: {
        growth: 0.8,
        birth: 0.9,
        death: 1.0
      },
      winter: {
        growth: 0.3,
        birth: 0.5,
        death: 1.5
      }
    };
  }
  
  /**
   * Update ecosystem for one tick
   */
  tick() {
    this.seasonTicks++;
    
    // Check for season change
    if (this.seasonTicks >= this.seasonDuration) {
      this.seasonTicks = 0;
      this.currentSeasonIndex = (this.currentSeasonIndex + 1) % this.seasons.length;
    }
  }
  
  /**
   * Get current season
   */
  getSeason() {
    return this.seasons[this.currentSeasonIndex];
  }
  
  /**
   * Set current season
   */
  setSeason(season) {
    const index = this.seasons.indexOf(season);
    if (index !== -1) {
      this.currentSeasonIndex = index;
      this.seasonTicks = 0;
    }
  }
  
  /**
   * Set weather system reference
   */
  setWeatherSystem(weatherSystem) {
    this.weatherSystem = weatherSystem;
  }
  
  /**
   * Update resources in a chunk
   */
  updateChunk(chunk) {
    // Initialize resources if needed
    if (!chunk.resources) {
      chunk.resources = {
        trees: 10,
        bushes: 15,
        grass: 50,
        stones: 5,
        flowers: 8
      };
    }
    
    // Get growth rate based on conditions
    const growthRate = this.calculateGrowthRate(chunk);
    
    // Update each resource type
    for (const [resource, baseRate] of Object.entries(this.baseGrowthRates)) {
      if (chunk.resources[resource] !== undefined) {
        const maxCapacity = this.getResourceCapacity(resource);
        const current = chunk.resources[resource];
        
        // Logistic growth
        const growth = baseRate * growthRate * current * 
                      (1 - current / maxCapacity);
        
        chunk.resources[resource] = Math.max(0, 
          Math.min(maxCapacity, current + growth)
        );
      }
    }
    
    // Random events
    this.applyRandomEvents(chunk);
    
    return chunk;
  }
  
  /**
   * Calculate growth rate based on conditions
   */
  calculateGrowthRate(chunk) {
    let rate = 1.0;
    
    // Season modifier
    const season = this.getSeason();
    const seasonMod = this.seasonalModifiers[season];
    rate *= seasonMod.growth;
    
    // Weather modifier
    if (this.weatherSystem) {
      const weather = this.weatherSystem.getCurrentWeather();
      
      // Rain is good for growth
      if (weather.type === 'rain') {
        rate *= 1.3;
      }
      // Storm is bad
      else if (weather.type === 'storm') {
        rate *= 0.7;
      }
      // Snow stops most growth
      else if (weather.type === 'snow') {
        rate *= 0.1;
      }
    }
    
    // Biome modifier
    if (chunk.biome) {
      switch (chunk.biome) {
        case 'forest':
          rate *= 1.2;
          break;
        case 'desert':
          rate *= 0.3;
          break;
        case 'grassland':
          rate *= 1.0;
          break;
        case 'candy_kingdom':
          rate *= 0.8; // Artificial biome
          break;
      }
    }
    
    return rate;
  }
  
  /**
   * Update population dynamics
   */
  updatePopulation(population) {
    const season = this.getSeason();
    const seasonMod = this.seasonalModifiers[season];
    
    // Update rabbits (prey)
    if (population.rabbits !== undefined) {
      const rabbitParams = this.populationParams.rabbits;
      const K = rabbitParams.carryingCapacity;
      const r = rabbitParams.birthRate * seasonMod.birth;
      const d = rabbitParams.deathRate * seasonMod.death;
      const p = rabbitParams.predation * (population.wolves || 0) / 10;
      
      // Logistic growth with predation
      const rabbitGrowth = r * population.rabbits * (1 - population.rabbits / K) 
                          - d * population.rabbits 
                          - p * population.rabbits;
      
      population.rabbits = Math.max(1, 
        Math.round(population.rabbits + rabbitGrowth)
      );
    }
    
    // Update wolves (predator)
    if (population.wolves !== undefined) {
      const wolfParams = this.populationParams.wolves;
      const K = wolfParams.carryingCapacity;
      const r = wolfParams.birthRate * seasonMod.birth;
      const d = wolfParams.deathRate * seasonMod.death;
      const h = wolfParams.huntingSuccess * (population.rabbits || 0) / 50;
      
      // Growth depends on prey availability
      const wolfGrowth = r * population.wolves * h
                        - d * population.wolves;
      
      population.wolves = Math.max(1, 
        Math.round(population.wolves + wolfGrowth)
      );
    }
    
    return population;
  }
  
  /**
   * Get resource capacity
   * @private
   */
  getResourceCapacity(resource) {
    const capacities = {
      trees: 100,
      bushes: 150,
      grass: 500,
      stones: 50,
      flowers: 80
    };
    
    return capacities[resource] || 100;
  }
  
  /**
   * Apply random ecosystem events
   * @private
   */
  applyRandomEvents(chunk) {
    const random = Math.random();
    
    // Forest fire (rare)
    if (random < 0.001 && chunk.resources.trees > 50) {
      chunk.resources.trees *= 0.5;
      chunk.resources.bushes *= 0.3;
      chunk.metadata = chunk.metadata || {};
      chunk.metadata.recentFire = true;
    }
    
    // Disease outbreak
    else if (random < 0.002) {
      // Reduce all organic resources
      chunk.resources.trees *= 0.9;
      chunk.resources.bushes *= 0.85;
      chunk.resources.flowers *= 0.8;
    }
    
    // Resource boom
    else if (random < 0.005) {
      // Increase growth temporarily
      const resource = ['trees', 'bushes', 'flowers'][Math.floor(Math.random() * 3)];
      if (chunk.resources[resource]) {
        chunk.resources[resource] *= 1.2;
      }
    }
  }
  
  /**
   * Get ecosystem health score (0-100)
   */
  getEcosystemHealth(chunk) {
    if (!chunk.resources) return 50;
    
    let score = 0;
    let count = 0;
    
    // Check each resource against its capacity
    for (const [resource, value] of Object.entries(chunk.resources)) {
      const capacity = this.getResourceCapacity(resource);
      const ratio = value / capacity;
      
      // Optimal is around 60-80% capacity
      if (ratio >= 0.6 && ratio <= 0.8) {
        score += 100;
      } else if (ratio >= 0.4 && ratio <= 0.9) {
        score += 70;
      } else if (ratio >= 0.2) {
        score += 40;
      } else {
        score += 20;
      }
      
      count++;
    }
    
    return count > 0 ? Math.round(score / count) : 50;
  }
  
  /**
   * Migrate animals between chunks
   */
  migrateAnimals(fromChunk, toChunk, species, count) {
    if (!fromChunk.animals) fromChunk.animals = {};
    if (!toChunk.animals) toChunk.animals = {};
    
    const available = fromChunk.animals[species] || 0;
    const toMigrate = Math.min(available, count);
    
    if (toMigrate > 0) {
      fromChunk.animals[species] = (fromChunk.animals[species] || 0) - toMigrate;
      toChunk.animals[species] = (toChunk.animals[species] || 0) + toMigrate;
      
      return toMigrate;
    }
    
    return 0;
  }
  
  /**
   * Get season progress (0-1)
   */
  getSeasonProgress() {
    return this.seasonTicks / this.seasonDuration;
  }
  
  /**
   * Get days until next season
   */
  getDaysUntilNextSeason() {
    const ticksRemaining = this.seasonDuration - this.seasonTicks;
    return Math.ceil(ticksRemaining / 288); // 288 ticks per day
  }
}