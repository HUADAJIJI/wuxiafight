/**
 * Ming Dynasty Aesthetic Palette & Game Constants
 */
export const COLORS = {
  VERMILION: '#8E2323', // Deep red
  GOLD: '#C5A059',      // Imperial gold
  LACQUER: '#1A1A1A',   // Deep black
  JADE: '#2E5A44',      // Dark jade green
  SILK: '#F4EBD0',      // Off-white/silk parchment
  SKY: '#2C3E50',       // Muted slate sky
  GROUND: '#3E2723',    // Dark earthy brown
  INDIGO: '#2E4C6D',    // Imperial Indigo for AI
};

export const PHYSICS = {
  GRAVITY: 0.8,
  FRICTION: 0.8,
  RESTITUTION: 0.01,
  FRICTION_AIR: 0.1,    // Added more air resistance to stabilize
  JOINT_STIFFNESS: 0.6,
  JOINT_DAMPING: 0.2,   // Increased damping
  PD_K: 0.05,
  PD_D: 0.02,           // Increased derivative gain for stability
  TORSO_K: 0.8,         // Standard balance stiffness
  TORSO_D: 0.15,        // Standard balance damping
};

export const CHARACTER = {
  HEAD_RADIUS: 15,
  TORSO_WIDTH: 30,
  TORSO_HEIGHT: 60,
  ARM_WIDTH: 10,
  ARM_HEIGHT: 35,
  LEG_WIDTH: 12,
  LEG_HEIGHT: 40,
  SWORD_WIDTH: 6,
  SWORD_HEIGHT: 80,
  SWORD_HILT_WIDTH: 15,
  SWORD_HILT_HEIGHT: 5,
  YAODAO_CURVE: 15, // Degrees/offset for blade curve
  YAODAO_MASS: 1.5,   // Reduced to prevent tipping character over
  MAX_HP: 100,
};

export const COMBAT = {
  VELOCITY_THRESHOLD: 1.5,   // Minimum relative velocity for damage
  DAMAGE_SCALE: 5.0,         // Overall damage multiplier
  PART_MULTIPLIERS: {
    head: 3.0,
    torso: 1.2,
    limb: 0.5,
  },
  CLASH: {
    RECOIL_FORCE: 1.2,       // Significantly increased for strong feedback
    SPARK_COUNT: 4,          // Reduced number of sparks
    SPARK_THRESHOLD: 1.8,    // Sparks only spawn if relative speed is high
    STUN_FRAMES: 15,         // Baseline stun frames
  }
};

export const SPAWN = {
  DIFFICULTY: {
    EASY: {
      interval: 30000,
      hpMultiplier: 0.6,
      damageMultiplier: 0.6,
      scoreReward: 1
    },
    MEDIUM: {
      interval: 20000,
      hpMultiplier: 1.0,
      damageMultiplier: 1.0,
      scoreReward: 2
    },
    HARD: {
      interval: 10000,
      hpMultiplier: 2.0,
      damageMultiplier: 2.0,
      scoreReward: 5
    },
    NIGHTMARE: {
      interval: 5000,
      hpMultiplier: 3.0,
      damageMultiplier: 3.0,
      scoreReward: 10
    }
  },
  OFFSET_X: 1000, // spawn this far outside the camera view center
};

export const MEDICINE = {
  SMALL: {
    chance: 0.15, // 15%
    healPercent: 0.3,
    color: '#3B7A57', // Jade green
    label: 'medicine_small'
  },
  LARGE: {
    chance: 0.08, // 8%
    healPercent: 0.6,
    color: '#FFD700', // Gold
    label: 'medicine_large'
  },
  RADIUS: 10
};
