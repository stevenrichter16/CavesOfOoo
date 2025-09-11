/**
 * Constants for the Quest System
 */

export const QuestState = {
  AVAILABLE: 'available',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ABANDONED: 'abandoned'
};

export const QuestObjective = {
  COLLECT: 'collect',
  DEFEAT: 'defeat',
  EXPLORE: 'explore',
  DELIVER: 'deliver',
  ESCORT: 'escort',
  SURVIVE: 'survive',
  INTERACT: 'interact'
};

export const QuestReward = {
  EXPERIENCE: 'experience',
  GOLD: 'gold',
  ITEM: 'item',
  REPUTATION: 'reputation',
  UNLOCK: 'unlock'
};

export const QuestPriority = {
  MAIN: 'main',
  SIDE: 'side',
  DAILY: 'daily',
  HIDDEN: 'hidden'
};

export const QuestDifficulty = {
  TRIVIAL: 1,
  EASY: 2,
  NORMAL: 3,
  HARD: 4,
  EPIC: 5,
  LEGENDARY: 6
};