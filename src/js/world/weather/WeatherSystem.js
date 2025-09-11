/**
 * Weather System
 * Manages weather patterns, transitions, and effects
 */

import { EventEmitter } from '../core/EventEmitter.js';

export class WeatherSystem extends EventEmitter {
  constructor(chunkSystem) {
    super();
    
    this.chunkSystem = chunkSystem;
    
    // Weather types and their properties
    this.weatherTypes = {
      clear: {
        visibility: 1.0,
        wetness: 0,
        lightLevel: 1.0,
        windSpeed: 0.2
      },
      cloudy: {
        visibility: 0.9,
        wetness: 0,
        lightLevel: 0.8,
        windSpeed: 0.3
      },
      rain: {
        visibility: 0.7,
        wetness: 0.8,
        lightLevel: 0.6,
        windSpeed: 0.5
      },
      storm: {
        visibility: 0.5,
        wetness: 1.0,
        lightLevel: 0.4,
        windSpeed: 0.9,
        hasLightning: true
      },
      snow: {
        visibility: 0.6,
        wetness: 0.3,
        lightLevel: 0.7,
        windSpeed: 0.4,
        temperature: -5
      }
    };
    
    // Current weather state
    this.currentWeather = {
      type: 'clear',
      intensity: 1.0,
      duration: 0,
      windDirection: 0
    };
    
    // Transition state
    this.isTransitioning = false;
    this.transitionFrom = null;
    this.transitionTarget = null;
    this.transitionProgress = 0;
    this.transitionDuration = 0;
    
    // Lightning system for storms
    this.lightningCooldown = 0;
    this.lightningChance = 0.02; // 2% chance per update during storm
  }
  
  /**
   * Get current weather state
   */
  getCurrentWeather() {
    if (this.isTransitioning) {
      // Interpolate between weather states
      return this.interpolateWeather(
        this.transitionFrom,
        this.transitionTarget,
        this.transitionProgress / this.transitionDuration
      );
    }
    
    return {
      ...this.currentWeather,
      ...this.weatherTypes[this.currentWeather.type]
    };
  }
  
  /**
   * Set weather immediately
   */
  setWeather(type) {
    if (!this.weatherTypes[type]) {
      console.warn(`Unknown weather type: ${type}`);
      return;
    }
    
    this.currentWeather.type = type;
    this.currentWeather.intensity = 1.0;
    this.currentWeather.duration = 0;
    this.isTransitioning = false;
    
    this.emit('weatherChanged', {
      weather: this.getCurrentWeather()
    });
  }
  
  /**
   * Transition to new weather over time
   */
  transitionTo(type, duration) {
    if (!this.weatherTypes[type]) {
      console.warn(`Unknown weather type: ${type}`);
      return;
    }
    
    this.transitionFrom = { ...this.currentWeather };
    this.transitionTarget = { type, intensity: 1.0 };
    this.transitionProgress = 0;
    this.transitionDuration = duration;
    this.isTransitioning = true;
    
    this.emit('weatherTransitionStarted', {
      from: this.transitionFrom.type,
      to: type,
      duration
    });
  }
  
  /**
   * Update weather system
   */
  update() {
    // Update transition
    if (this.isTransitioning) {
      this.transitionProgress++;
      
      if (this.transitionProgress >= this.transitionDuration) {
        // Transition complete
        this.currentWeather = { ...this.transitionTarget };
        this.isTransitioning = false;
        
        this.emit('weatherTransitionComplete', {
          weather: this.getCurrentWeather()
        });
      }
    }
    
    // Update weather-specific effects
    const weather = this.getCurrentWeather();
    
    if (weather.hasLightning && this.lightningCooldown <= 0) {
      if (Math.random() < this.lightningChance) {
        this.generateLightning();
      }
    }
    
    if (this.lightningCooldown > 0) {
      this.lightningCooldown--;
    }
    
    // Increment duration
    this.currentWeather.duration++;
  }
  
  /**
   * Generate a lightning strike
   */
  generateLightning() {
    const lightning = {
      type: 'lightning',
      x: Math.random() * 1000, // Random position
      y: Math.random() * 1000,
      intensity: 0.5 + Math.random() * 0.5,
      duration: 1 + Math.floor(Math.random() * 3)
    };
    
    this.lightningCooldown = 10; // Cooldown before next lightning
    
    this.emit('lightning', lightning);
    
    // Chance of thunder
    if (Math.random() < 0.8) {
      setTimeout(() => {
        this.emit('thunder', {
          intensity: lightning.intensity,
          delay: 1000 + Math.random() * 2000 // 1-3 second delay
        });
      }, 500);
    }
    
    return lightning;
  }
  
  /**
   * Apply weather effects to a chunk
   */
  applyWeatherToChunk(chunk) {
    const weather = this.getCurrentWeather();
    
    // Initialize metadata if needed
    chunk.metadata = chunk.metadata || {};
    
    // Apply weather properties
    chunk.metadata.wetness = weather.wetness || 0;
    chunk.metadata.visibility = weather.visibility || 1.0;
    chunk.metadata.lightLevel = weather.lightLevel || 1.0;
    chunk.metadata.windSpeed = weather.windSpeed || 0;
    chunk.metadata.windDirection = this.currentWeather.windDirection || 0;
    
    // Apply weather-specific modifications
    if (weather.type === 'rain' || weather.type === 'storm') {
      this.applyRainEffects(chunk, weather.wetness);
    } else if (weather.type === 'snow') {
      this.applySnowEffects(chunk);
    }
    
    return chunk;
  }
  
  /**
   * Apply rain effects to chunk
   * @private
   */
  applyRainEffects(chunk, wetness) {
    // Increase water in water tiles
    if (chunk.waterLevels) {
      for (let key in chunk.waterLevels) {
        chunk.waterLevels[key] = Math.min(1.0, 
          chunk.waterLevels[key] + wetness * 0.01
        );
      }
    }
    
    // Create puddles in low areas
    if (Math.random() < wetness * 0.1) {
      chunk.metadata.hasPuddles = true;
    }
  }
  
  /**
   * Apply snow effects to chunk
   * @private
   */
  applySnowEffects(chunk) {
    chunk.metadata.snowCover = Math.min(1.0,
      (chunk.metadata.snowCover || 0) + 0.01
    );
    
    chunk.metadata.temperature = -5;
  }
  
  /**
   * Interpolate between two weather states
   * @private
   */
  interpolateWeather(from, to, progress) {
    const fromProps = this.weatherTypes[from.type];
    const toProps = this.weatherTypes[to.type];
    
    return {
      type: progress > 0.5 ? to.type : from.type,
      intensity: from.intensity * (1 - progress) + (to.intensity || 1) * progress,
      visibility: fromProps.visibility * (1 - progress) + toProps.visibility * progress,
      wetness: (fromProps.wetness || 0) * (1 - progress) + (toProps.wetness || 0) * progress,
      lightLevel: fromProps.lightLevel * (1 - progress) + toProps.lightLevel * progress,
      windSpeed: fromProps.windSpeed * (1 - progress) + toProps.windSpeed * progress
    };
  }
  
  /**
   * Get weather forecast
   */
  getForecast(hours = 24) {
    // Simple forecast - would be more complex in production
    const forecast = [];
    const weatherSequence = ['clear', 'cloudy', 'rain', 'cloudy', 'clear'];
    
    for (let i = 0; i < hours; i++) {
      forecast.push({
        hour: i,
        weather: weatherSequence[i % weatherSequence.length],
        probability: 0.7 + Math.random() * 0.3
      });
    }
    
    return forecast;
  }
  
  /**
   * Check if weather is severe
   */
  isSevere() {
    return this.currentWeather.type === 'storm';
  }
  
  /**
   * Get weather effects for rendering
   */
  getRenderEffects() {
    const weather = this.getCurrentWeather();
    
    return {
      fogDensity: weather.type === 'cloudy' ? 0.3 : 0,
      rainIntensity: weather.type === 'rain' ? 0.5 : 
                     weather.type === 'storm' ? 1.0 : 0,
      snowIntensity: weather.type === 'snow' ? 0.7 : 0,
      lightningFlash: this.lightningCooldown > 8 ? 1.0 : 0,
      windStrength: weather.windSpeed || 0,
      windDirection: this.currentWeather.windDirection
    };
  }
}