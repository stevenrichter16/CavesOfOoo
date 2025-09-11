/**
 * Time System
 * Manages game time, day/night cycles, and scheduled events
 */

import { EventEmitter } from '../core/EventEmitter.js';

export class TimeSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      minutesPerTick: config.minutesPerTick || 5,
      startTime: config.startTime || new Date(1000, 0, 1, 6, 0, 0), // Year 1000, Day 1, 6 AM
      ...config
    };
    
    // Game time state
    this.gameTime = new Date(this.config.startTime);
    this.tickCount = 0;
    
    // Time periods
    this.timePeriods = {
      dawn: { start: 5, end: 7 },
      morning: { start: 7, end: 12 },
      noon: { start: 12, end: 13 },
      afternoon: { start: 13, end: 17 },
      dusk: { start: 17, end: 19 },
      evening: { start: 19, end: 22 },
      night: { start: 22, end: 24 },
      midnight: { start: 0, end: 5 }
    };
    
    // Scheduled events
    this.scheduledEvents = [];
    
    // Track last emitted period events to avoid duplicates
    this.lastEmittedPeriod = null;
  }
  
  /**
   * Advance time by one tick
   */
  tick() {
    this.tickCount++;
    
    // Advance game time
    const minutesToAdd = this.config.minutesPerTick;
    this.gameTime = new Date(this.gameTime.getTime() + minutesToAdd * 60 * 1000);
    
    // Check for period transitions
    this.checkPeriodTransitions();
    
    // Check scheduled events
    this.checkScheduledEvents();
    
    // Emit tick event
    this.emit('tick', {
      gameTime: this.getGameTime(),
      tickCount: this.tickCount
    });
  }
  
  /**
   * Get current game time as timestamp
   */
  getGameTime() {
    return this.gameTime.getTime();
  }
  
  /**
   * Get current day number (starting from 1)
   */
  getDay() {
    const startDate = new Date(this.config.startTime);
    const diffTime = Math.abs(this.gameTime - startDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }
  
  /**
   * Get current hour (0-23)
   */
  getHour() {
    return this.gameTime.getHours();
  }
  
  /**
   * Get current minute (0-59)
   */
  getMinute() {
    return this.gameTime.getMinutes();
  }
  
  /**
   * Get current time period
   */
  getCurrentPeriod() {
    const hour = this.getHour();
    
    for (const [period, times] of Object.entries(this.timePeriods)) {
      if (times.start <= times.end) {
        if (hour >= times.start && hour < times.end) {
          return period;
        }
      } else {
        // Handle periods that cross midnight
        if (hour >= times.start || hour < times.end) {
          return period;
        }
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Check for time period transitions
   */
  checkPeriodTransitions() {
    const currentPeriod = this.getCurrentPeriod();
    const hour = this.getHour();
    const minute = this.getMinute();
    
    // Check for specific time events
    if (hour === 6 && minute < this.config.minutesPerTick && this.lastEmittedPeriod !== 'dawn') {
      this.emit('dawn', { gameTime: this.getGameTime() });
      this.lastEmittedPeriod = 'dawn';
    } else if (hour === 12 && minute < this.config.minutesPerTick && this.lastEmittedPeriod !== 'noon') {
      this.emit('noon', { gameTime: this.getGameTime() });
      this.lastEmittedPeriod = 'noon';
    } else if (hour === 18 && minute < this.config.minutesPerTick && this.lastEmittedPeriod !== 'dusk') {
      this.emit('dusk', { gameTime: this.getGameTime() });
      this.lastEmittedPeriod = 'dusk';
    } else if (hour === 0 && minute < this.config.minutesPerTick && this.lastEmittedPeriod !== 'midnight') {
      this.emit('midnight', { gameTime: this.getGameTime() });
      this.lastEmittedPeriod = 'midnight';
    }
    
    // Reset if we're in a different hour
    if (minute >= this.config.minutesPerTick) {
      this.lastEmittedPeriod = null;
    }
  }
  
  /**
   * Schedule an event at a specific game time
   */
  scheduleAt(timeSpec, callback) {
    const scheduledEvent = {
      day: timeSpec.day,
      hour: timeSpec.hour,
      minute: timeSpec.minute,
      callback: callback,
      executed: false
    };
    
    this.scheduledEvents.push(scheduledEvent);
  }
  
  /**
   * Check and execute scheduled events
   */
  checkScheduledEvents() {
    const currentDay = this.getDay();
    const currentHour = this.getHour();
    const currentMinute = this.getMinute();
    
    for (const event of this.scheduledEvents) {
      if (!event.executed) {
        if (currentDay >= event.day && 
            currentHour >= event.hour && 
            currentMinute >= event.minute) {
          event.callback({
            gameTime: this.getGameTime(),
            day: currentDay,
            hour: currentHour,
            minute: currentMinute
          });
          event.executed = true;
        }
      }
    }
    
    // Remove executed events
    this.scheduledEvents = this.scheduledEvents.filter(e => !e.executed);
  }
  
  /**
   * Set game time directly
   */
  setGameTime(date) {
    this.gameTime = new Date(date);
    this.emit('timeChanged', { gameTime: this.getGameTime() });
  }
  
  /**
   * Skip forward in time
   */
  skipTime(hours) {
    const hoursToMs = hours * 60 * 60 * 1000;
    this.gameTime = new Date(this.gameTime.getTime() + hoursToMs);
    this.emit('timeSkipped', { 
      gameTime: this.getGameTime(),
      hoursSkipped: hours
    });
  }
  
  /**
   * Get formatted time string
   */
  getFormattedTime() {
    const day = this.getDay();
    const hour = String(this.getHour()).padStart(2, '0');
    const minute = String(this.getMinute()).padStart(2, '0');
    
    return `Day ${day}, ${hour}:${minute}`;
  }
  
  /**
   * Get time of day factor (0-1, for lighting/ambience)
   */
  getTimeOfDayFactor() {
    const hour = this.getHour();
    
    // Noon = 1.0, Midnight = 0.0
    if (hour <= 12) {
      return hour / 12;
    } else {
      return (24 - hour) / 12;
    }
  }
  
  /**
   * Check if it's daytime
   */
  isDaytime() {
    const hour = this.getHour();
    return hour >= 6 && hour < 18;
  }
  
  /**
   * Check if it's nighttime
   */
  isNighttime() {
    return !this.isDaytime();
  }
}