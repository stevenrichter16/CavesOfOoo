/**
 * Movement-related constants
 * Constants for NPC and player movement, pathfinding, and spatial interactions
 */

// Interaction distances
export const INTERACTION_DISTANCE = 1.5;
export const INTERACTION_DISTANCE_SQUARED = INTERACTION_DISTANCE * INTERACTION_DISTANCE;
export const PERCEPTION_RANGE = 5;
export const HOSTILE_ATTACK_RANGE = 1;
export const DIALOGUE_TRIGGER_DISTANCE = 2;

// Movement limits
export const MAX_MOVEMENT_PER_TURN = 1;
export const PATHFINDING_MAX_DISTANCE = 20;
export const CROWD_SPACING = 1;

// Movement requirements
export const MIN_HP_FOR_MOVEMENT = 1;
export const MIN_HP_FOR_INTERACTION = 1;

// Animation timings (milliseconds)
export const MOVEMENT_ANIMATION_DURATION = 200;
export const NPC_TURN_DELAY = 100;