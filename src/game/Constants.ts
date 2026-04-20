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
};
