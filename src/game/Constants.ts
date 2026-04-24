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
  SWORD_STIFFNESS: 1.5,
  SWORD_DAMPING: 0.5,   // Increased from 0.25 to prevent jitter
  CATEGORIES: {
    GROUND: 0x0001,
    PLAYER: 0x0002,
    ENEMY: 0x0004,
    MEDICINE: 0x0008
  },
  MAX_VELOCITY_Y: 15,    // Cap upward velocity to prevent flying away
  MAX_IMBALANCE: 2.5     // Cap internal power recoil multiplier
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
  YAODAO_MASS: 0.8,   // Reduced to prevent tipping character over
  YAODAO_INERTIA: 30000, // Balanced for responsiveness and weight
  MAX_HP: 100,
  MAX_ATTR_LEVEL: 30,
};

export const COMBAT = {
  VELOCITY_THRESHOLD: 1.5,   // Minimum relative velocity for damage
  DAMAGE_SCALE: 5.0,         // Overall damage multiplier
  REFERENCE_INERTIA: 80000,  // Base inertia used for damage scaling
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
      moveMultiplier: 1.0,
      stiffnessMultiplier: 1.0,
      thresholdModifier: 0,
      internalPowerMultiplier: 1.0,
      scoreReward: 1
    },
    MEDIUM: {
      interval: 20000,
      hpMultiplier: 1.0,
      damageMultiplier: 1.0,
      moveMultiplier: 1.2,
      stiffnessMultiplier: 1.05,
      thresholdModifier: 0.2,
      internalPowerMultiplier: 1.2,
      scoreReward: 2
    },
    HARD: {
      interval: 10000,
      hpMultiplier: 2.0,
      damageMultiplier: 2.0,
      moveMultiplier: 1.8,
      stiffnessMultiplier: 1.2,
      thresholdModifier: 0.6,
      internalPowerMultiplier: 2.0,
      scoreReward: 5
    },
    NIGHTMARE: {
      interval: 5000,
      hpMultiplier: 3.0,
      damageMultiplier: 3.0,
      moveMultiplier: 2.5,
      stiffnessMultiplier: 1.4,
      thresholdModifier: 1.0,
      internalPowerMultiplier: 4.0,
      scoreReward: 10
    }
  },
  OFFSET_X: 1000, // spawn this far outside the camera view center
};

export const MEDICINE = {
  SMALL: {
    chance: 0.20, // 20%
    healPercent: 0.3,
    color: '#3B7A57', // Jade green
    label: 'medicine_small'
  },
  LARGE: {
    chance: 0.10, // 10%
    healPercent: 0.6,
    color: '#FFD700', // Gold
    label: 'medicine_large'
  },
  RADIUS: 10
};

export const TRANSLATIONS = {
  ZH: {
    TITLE: "武 侠 决",
    HINT: "AD 键：平移 | 空格：纵跃 | S 键：转向 | 鼠标：挥剑 | ESC：暂停",
    LEADERBOARD: "江湖龙虎榜",
    EMPTY_LEADERBOARD: "暂无江湖传闻",
    SCORE_UNIT: "积分",
    CHOOSE_REALM: "选择感悟境界",
    TOTAL_POWER: "累积功力",
    CULTIVATION: "修为养成",
    ATTR_BILI: "臂力 (攻击/稳)",
    ATTR_SHENFA: "身法 (敏捷/速)",
    ATTR_GENGU: "根骨 (血量/定)",
    ATTR_NEIGONG: "内功 (破招/威)",
    LEVEL: "阶",
    REALM: "境界",
    UPGRADE: "精进",
    MAX_LEVEL: "已满级",
    HINT_FOOTER: "精微增长，厚积薄发",
    DIFF_EASY: "闻鸡起舞",
    DIFF_MEDIUM: "初窥门径",
    DIFF_HARD: "登峰造极",
    DIFF_NIGHTMARE: "无间地狱",
    DIFF_EASY_DESC: "简单 - 30s刷新",
    DIFF_MEDIUM_DESC: "中等 - 20s刷新",
    DIFF_HARD_DESC: "困难 - 10s刷新",
    DIFF_NIGHTMARE_DESC: "噩梦 - 5s刷新，无限增强",
    LANG_BTN: "English",
    RETRY_BTN: "再战一回",
    HOME_BTN: "归隐山林",
    PAUSE_TITLE: "战 局 中 止",
    RESUME_BTN: "继 续 战 斗",
    QUIT_BTN: "退 出 战 局",
    DEFEAT_TITLE: "惜  败",
    DEFEAT_SUB: "无 尽 之 战 ， 终 有 一 死",
    SESSION_SCORE: "本局战绩",
    CURRENT_SCORE: "当前战绩",
    HELL_INDICATOR: "无 间 地 狱 : 第 {layer} 层",
    WELCOME_TITLE: "初 入 江 湖",
    WELCOME_SUB: "武学之道，首在根基。请先进入新手试炼，熟悉操纵之法。",
    START_TUTORIAL: "开 始 试 炼",
    SKIP_TUTORIAL: "跳过（江湖老手）",
    TUT_MOVE: "【A / D】键：左右平移",
    TUT_JUMP: "【空格】键：纵跃如飞",
    TUT_FLIP: "【S】键：瞬间转向",
    TUT_ATTACK: "【鼠标】挥动：剑随心转",
    TUT_GOAL: "试炼目标：击败眼前的对手",
    TUT_MEDICINE: "【拾取药物】：击败强敌可能掉落创伤药，拾取可恢复气血",
    TUT_CONGRATS: "恭喜！你已掌握所有基础招式，从此纵横江湖，去留随心",
    TUT_END_TITLE: "试 炼 结 束",
    TUT_END_SUB: "功力已成。现在去“修为养成”提升属性，或在“江湖龙虎榜”查看威名。",
    TUT_UPGRADE_HINT: "功力已成！点击任意【提升】按钮，消耗积分增强你的属性。",
    TUT_RANK_HINT: "你的最高战绩将记录于此。不断突破自我，冲击武林巅峰吧！",
    TUT_FINAL_HINT: "全部教学完成！现在，自由选择一个难度，开启你的江湖挑战吧！",
    I_KNOW: "领悟了",
    DESC_BILI: "提升攻击威力和武器惯性。每阶提升约10%的基础伤害。",
    DESC_SHENFA: "提升移动速度和身形稳健度。每阶提升约10%的速度。",
    DESC_GENGU: "提升气血上限。每阶大幅提升生存能力。",
    DESC_NEIGONG: "提升招架时的气劲。使你在格挡中更占优势，并能无视一部分轻微伤害。"
  },
  EN: {
    TITLE: "WUXIA DUEL",
    HINT: "AD: Move | Space: Jump | S: Flip | Mouse: Attack | ESC: Pause",
    LEADERBOARD: "RANKINGS",
    EMPTY_LEADERBOARD: "No legends yet",
    SCORE_UNIT: "Pts",
    CHOOSE_REALM: "SELECT REALM",
    TOTAL_POWER: "Total Power",
    CULTIVATION: "CULTIVATION",
    ATTR_BILI: "STR (Atk/Stab)",
    ATTR_SHENFA: "AGI (Spd/Dex)",
    ATTR_GENGU: "VIT (HP/Def)",
    ATTR_NEIGONG: "INT (Pwr/Crit)",
    LEVEL: "Stage",
    REALM: "Rank",
    UPGRADE: "Train",
    MAX_LEVEL: "Maxed",
    HINT_FOOTER: "Constant growth leads to mastery",
    DIFF_EASY: "Beginner",
    DIFF_MEDIUM: "Apprentice",
    DIFF_HARD: "Master",
    DIFF_NIGHTMARE: "Hell Mode",
    DIFF_EASY_DESC: "Easy - 30s spawn",
    DIFF_MEDIUM_DESC: "Med - 20s spawn",
    DIFF_HARD_DESC: "Hard - 10s spawn",
    DIFF_NIGHTMARE_DESC: "Nightmare - 5s spawn",
    LANG_BTN: "中文",
    RETRY_BTN: "Fight Again",
    HOME_BTN: "Retire",
    PAUSE_TITLE: "GAME PAUSED",
    RESUME_BTN: "RESUME",
    QUIT_BTN: "QUIT",
    DEFEAT_TITLE: "DEFEAT",
    DEFEAT_SUB: "In the endless war, death is inevitable.",
    SESSION_SCORE: "Session Score",
    CURRENT_SCORE: "Current Score",
    HELL_INDICATOR: "HELL MODE: LAYER {layer}",
    WELCOME_TITLE: "FIRST STEPS",
    WELCOME_SUB: "Mastery begins with a single step. Enter training to learn the way of the sword.",
    START_TUTORIAL: "START TRAINING",
    SKIP_TUTORIAL: "Skip (Veteran)",
    TUT_MOVE: "[A / D]: Move Left & Right",
    TUT_JUMP: "[Space]: Jump High",
    TUT_FLIP: "[S]: Instant Flip",
    TUT_ATTACK: "[Mouse]: Swing Sword",
    TUT_GOAL: "Goal: Defeat the opponent",
    TUT_MEDICINE: "[Pick up Medicine]: Defeat foes to find medicine and restore health",
    TUT_CONGRATS: "Congrats! You've mastered the basics. The path of the sword is yours to walk.",
    TUT_END_TITLE: "TRAINING COMPLETE",
    TUT_END_SUB: "Your power grows. Upgrade your attributes in 'Cultivation' or check your rank.",
    TUT_UPGRADE_HINT: "Power gained! Click an [Upgrade] button to spend points and enhance your attributes.",
    TUT_RANK_HINT: "Your highest records are saved here. Keep breaking your limits!",
    TUT_FINAL_HINT: "Training complete! Now, choose a difficulty and begin your true challenge!",
    I_KNOW: "I Understand",
    DESC_BILI: "Increases attack damage and weapon inertia. Approx +10% base damage per stage.",
    DESC_SHENFA: "Increases movement speed and balance. Approx +10% speed per stage.",
    DESC_GENGU: "Increases maximum health. Greatly improves survival per stage.",
    DESC_NEIGONG: "Increases internal power. Gives you an edge in sword clashes and resists light strikes."
  }
};

export function getTranslation(lang: 'ZH' | 'EN', key: keyof typeof TRANSLATIONS.ZH, params: any = {}) {
  let text = TRANSLATIONS[lang][key];
  for (const p in params) {
    text = text.replace(`{${p}}`, params[p]);
  }
  return text;
}
