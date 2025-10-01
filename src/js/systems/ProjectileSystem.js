// src/js/systems/ProjectileSystem.js
// Centralized system for all projectile animations and ranged attacks

import { emit } from '../utils/events.js';
import { EventType } from '../utils/eventTypes.js';

const PROJECTILE_SYMBOL_MAP = {
  fire: ['*', '✦', '◉'],
  ice: ['*', '❄', '◆'],
  electric: ['⚡', 'z', 'Z'],
  explosive: ['o', 'O', '@'],
  poison: ['o', '@', 'o', '@'],
  arrow: ['-', '>', '=', '>'],
  magic: ['*', '+', 'x', '+'],
  default: ['o', 'O', '0', 'O']
};

function normalizeArcHeight(arcHeight) {
  return Number.isFinite(arcHeight) ? arcHeight : 0;
}

function sanitizeCoordinate(value) {
  return Object.is(value, -0) ? 0 : value;
}

export function calculateProjectilePath(fromX, fromY, toX, toY, arcHeight = 0) {
  if (![fromX, fromY, toX, toY].every(Number.isFinite)) {
    return [];
  }

  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return [{ x: fromX, y: fromY }];
  }

  const steps = Math.max(1, Math.ceil(distance * 2));
  const path = [];
  const safeArc = normalizeArcHeight(arcHeight);

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const x = fromX + dx * progress;
    const baseY = fromY + dy * progress;
    const arcOffset = safeArc !== 0 ? Math.sin(progress * Math.PI) * safeArc : 0;
    path.push({ x, y: baseY - arcOffset });
  }

  return path;
}

export function getProjectileSymbol(type, frame = 0, customSymbols = null) {
  const symbolPool = Array.isArray(customSymbols) && customSymbols.length > 0
    ? customSymbols
    : PROJECTILE_SYMBOL_MAP[type] || PROJECTILE_SYMBOL_MAP.default;

  if (!symbolPool.length) {
    return 'o';
  }

  const index = Math.abs(frame) % symbolPool.length;
  return symbolPool[index];
}

/**
 * ProjectileSystem - Handles projectile animations and completion events
 */
class ProjectileSystem {
  constructor() {
    this.activeProjectiles = new Map();
  }

  /**
   * Launch a projectile along a computed path.
   * Schedules floating-text animations and resolves when the impact occurs.
   */
  async launch(config) {
    const {
      fromX,
      fromY,
      toX,
      toY,
      type = 'default',
      speed = 500,
      arcHeight = 0.3,
      trail = false,
      animationSymbols = null,
      impactSymbols = null,
      displayKind = null,
      checkCollision = null,
      onImpact = null
    } = config;

    if (![fromX, fromY, toX, toY].every(Number.isFinite)) {
      console.error('Invalid projectile coordinates:', { fromX, fromY, toX, toY });
      return Promise.reject(new Error('Invalid projectile coordinates'));
    }

    const normalizedSpeed = speed > 0 ? speed : 100;
    const safeArcHeight = normalizeArcHeight(arcHeight);
    const rawPath = calculateProjectilePath(fromX, fromY, toX, toY, safeArcHeight);
    const discretePath = this.buildDiscretePath(rawPath, fromX, fromY);

    const distance = Math.hypot(toX - fromX, toY - fromY);
    let duration = 0;
    if (distance !== 0) {
      const computed = (distance / normalizedSpeed) * 1000;
      duration = Math.max(100, computed);
      if (speed <= 0) {
        duration = 100;
      }
    }

    const impactIndex = this.findImpactIndex(discretePath, checkCollision);
    const impactPoint = discretePath[impactIndex] ?? discretePath[discretePath.length - 1];
    const collided = typeof checkCollision === 'function' ? impactIndex < discretePath.length - 1 : false;

    const stepCount = Math.max(impactIndex, 1);
    const stepDuration = stepCount === 0 ? 0 : duration / stepCount;
    const impactDelay = duration === 0 ? 0 : Math.round(stepDuration * impactIndex);

    const launchPayload = {
      fromX,
      fromY,
      toX,
      toY,
      type,
      speed: normalizedSpeed,
      arcHeight: safeArcHeight,
      trail: !!trail,
      path: rawPath,
      animationSymbols: animationSymbols || undefined,
      impactSymbols: impactSymbols || undefined,
      displayKind: displayKind || undefined
    };

    emit('ProjectileLaunched', launchPayload);

    if (duration === 0) {
      if (onImpact) {
        onImpact(impactPoint.x, impactPoint.y);
      }
      emit('ProjectileComplete', {
        x: impactPoint.x,
        y: impactPoint.y,
        type,
        collided,
        path: rawPath
      });
      return { x: impactPoint.x, y: impactPoint.y };
    }

    return new Promise((resolve) => {
      const projectile = {
        id: `proj_${Date.now()}_${Math.random()}`,
        type,
        trail,
        animationSymbols,
        impactSymbols,
        displayKind,
        path: rawPath,
        pathPoints: discretePath,
        timers: [],
        onImpact,
        collided,
        finalPoint: impactPoint,
        resolvePromise: resolve,
        stepDuration,
        impactDelay
      };

      this.activeProjectiles.set(projectile.id, projectile);

      this.schedulePathAnimation(projectile, impactIndex);
      this.scheduleImpact(projectile);
    });
  }

  buildDiscretePath(rawPath, fallbackX, fallbackY) {
    if (!Array.isArray(rawPath) || rawPath.length === 0) {
      return [{ x: Math.round(fallbackX), y: Math.round(fallbackY) }];
    }

    const discrete = [];
    for (const point of rawPath) {
      const x = sanitizeCoordinate(Math.round(point.x));
      const y = sanitizeCoordinate(Math.round(point.y));
      const last = discrete[discrete.length - 1];
      if (!last || last.x !== x || last.y !== y) {
        discrete.push({ x, y });
      }
    }

    if (discrete.length === 0) {
      return [{ x: sanitizeCoordinate(Math.round(fallbackX)), y: sanitizeCoordinate(Math.round(fallbackY)) }];
    }

    return discrete;
  }

  findImpactIndex(path, checkCollision) {
    if (typeof checkCollision !== 'function') {
      return path.length - 1;
    }

    for (let i = 0; i < path.length; i++) {
      const point = path[i];
      if (checkCollision(point.x, point.y)) {
        let fallback = i - 1;
        while (fallback >= 0 && checkCollision(path[fallback].x, path[fallback].y)) {
          fallback--;
        }
        return Math.max(0, fallback);
      }
    }

    return path.length - 1;
  }

  schedulePathAnimation(projectile, impactIndex) {
    const { pathPoints, stepDuration, type, animationSymbols, trail, displayKind } = projectile;
    if (!Array.isArray(pathPoints) || pathPoints.length === 0) {
      return;
    }

    for (let i = 0; i <= impactIndex; i++) {
      const point = pathPoints[i];
      const delay = Math.round(stepDuration * i);
      const timerId = setTimeout(() => {
        const symbol = getProjectileSymbol(type, i, animationSymbols);
        emit(EventType.FloatingText, {
          x: point.x,
          y: point.y,
          text: symbol,
          kind: displayKind || this.getProjectileKind(type),
          duration: Math.max(75, Math.round(stepDuration) || 75)
        });

        if (trail && i > 0) {
          emit(EventType.FloatingText, {
            x: point.x,
            y: point.y,
            text: '.',
            kind: 'magic',
            duration: Math.max(50, Math.round(stepDuration / 2) || 50),
            opacity: 0.6
          });
        }
      }, delay);

      this.queueTimer(projectile, timerId);
    }
  }

  scheduleImpact(projectile) {
    const timerId = setTimeout(() => {
      this.emitImpactSymbols(projectile);

      emit('ProjectileComplete', {
        x: projectile.finalPoint.x,
        y: projectile.finalPoint.y,
        type: projectile.type,
        collided: projectile.collided,
        path: projectile.path
      });

      if (projectile.onImpact) {
        projectile.onImpact(projectile.finalPoint.x, projectile.finalPoint.y);
      }

      this.activeProjectiles.delete(projectile.id);
      projectile.resolvePromise({ x: projectile.finalPoint.x, y: projectile.finalPoint.y });
    }, Math.max(0, projectile.impactDelay));

    this.queueTimer(projectile, timerId);
  }

  emitImpactSymbols(projectile) {
    const symbols = projectile.impactSymbols || this.getImpactSymbols(projectile.type);

    symbols.forEach((symbol, index) => {
      const timerId = setTimeout(() => {
        const offset = this.getImpactOffset(index);
        emit(EventType.FloatingText, {
          x: projectile.finalPoint.x + offset.x,
          y: projectile.finalPoint.y + offset.y,
          text: symbol,
          kind: projectile.displayKind || this.getProjectileKind(projectile.type),
          duration: Math.max(80, 150 - index * 30)
        });
      }, index * 20);

      this.queueTimer(projectile, timerId);
    });
  }

  getProjectileKind(type) {
    const kindMap = {
      fire: 'crit',
      ice: 'freeze',
      poison: 'poison',
      electric: 'magic',
      explosive: 'damage',
      magic: 'magic',
      default: 'damage',
      arrow: 'damage'
    };

    return kindMap[type] || 'damage';
  }

  getImpactSymbols(type) {
    const symbolMap = {
      fire: ['*', 'x', 'X', '+'],
      ice: ['*', '+', '*'],
      poison: ['@', 'o', '@'],
      electric: ['z', 'Z', 'x', 'Z'],
      explosive: ['@', 'O', '*'],
      default: ['x', '+', '*'],
      magic: ['*', '+', 'x', '*']
    };

    return symbolMap[type] || symbolMap.default;
  }

  getImpactOffset(index) {
    const offsets = [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 }
    ];

    return offsets[index] || { x: 0, y: 0 };
  }

  queueTimer(projectile, timerId) {
    if (!projectile.timers) {
      projectile.timers = [];
    }
    projectile.timers.push(timerId);
  }

  cancelAll() {
    let count = 0;

    for (const projectile of this.activeProjectiles.values()) {
      if (Array.isArray(projectile.timers)) {
        projectile.timers.forEach((timerId) => clearTimeout(timerId));
      }
      if (projectile.resolvePromise) {
        projectile.resolvePromise({ x: projectile.finalPoint?.x ?? 0, y: projectile.finalPoint?.y ?? 0 });
      }
      count++;
    }

    this.activeProjectiles.clear();
    return count;
  }
}

export const projectileSystem = new ProjectileSystem();

export async function launchProjectile(config) {
  return projectileSystem.launch(config);
}
