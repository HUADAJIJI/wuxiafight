import './style.css';
import { Game } from './game/Game';

const app = document.querySelector<HTMLDivElement>('#app')!;

// --- 属性与记录系统状态 ---
const DEFAULT_ATTRS = { bili: 1, shenfa: 1, gengu: 1, neigong: 1 };
let attributes = JSON.parse(localStorage.getItem('wuxia_attributes') || JSON.stringify(DEFAULT_ATTRS));
let totalScore = parseInt(localStorage.getItem('wuxia_total_score') || '0');
let leaderboard: number[] = JSON.parse(localStorage.getItem('wuxia_leaderboard') || '[]');

function saveGame() {
    localStorage.setItem('wuxia_attributes', JSON.stringify(attributes));
    localStorage.setItem('wuxia_total_score', totalScore.toString());
}

function getUpgradeCost(level: number): number {
    return Math.floor(10 + Math.pow(level, 1.2) * 2);
}

function renderUI() {
    // 重新获取数据以确保显示最新
    totalScore = parseInt(localStorage.getItem('wuxia_total_score') || '0');
    leaderboard = JSON.parse(localStorage.getItem('wuxia_leaderboard') || '[]');

    app.innerHTML = `
      <div class="ui-overlay" id="main-title">
        <h1>武 侠 决</h1>
        <div class="controls-hint">AD 键：平移 | 空格：纵跃 | S 键：转向 | 鼠标：挥剑 | ESC：暂停</div>
      </div>
      
      <div class="difficulty-overlay" id="start-menu">
        <div class="main-container">
            <!-- 1. 最左侧：江湖龙虎榜 -->
            <div class="menu-content leaderboard-panel">
                <h2>江湖龙虎榜</h2>
                <div class="leaderboard-list">
                    ${leaderboard.length > 0 ? 
                        leaderboard.map((entry: any, i) => `
                            <div class="leader-row ${i < 3 ? 'top-three' : ''}">
                                <div class="leader-main">
                                    <span class="rank">#${i + 1}</span>
                                    <span class="score">${entry.score} 积分</span>
                                </div>
                                <span class="date">${entry.date}</span>
                            </div>
                        `).join('') : 
                        '<div class="empty-hint">暂无江湖传闻</div>'
                    }
                </div>
            </div>

            <!-- 2. 中间：境界选择 -->
            <div class="menu-content center-panel">
                <h2>选择感悟境界</h2>
                <div class="total-score-display">累积功力: ${totalScore} 积分</div>
                <div class="difficulty-options">
                    <button data-diff="EASY">闻鸡起舞 <small>(简单 - 30s刷新)</small></button>
                    <button data-diff="MEDIUM">初窥门径 <small>(中等 - 20s刷新)</small></button>
                    <button data-diff="HARD">登峰造极 <small>(困难 - 10s刷新)</small></button>
                    <button data-diff="NIGHTMARE" style="color: var(--color-vermilion); border-color: var(--color-vermilion);">
                        无间地狱 <small>(噩梦 - 5s刷新，无限增强)</small>
                    </button>
                </div>
            </div>

            <!-- 3. 右侧：修为养成 -->
            <div class="menu-content right-panel attribute-panel">
                <h2>修为养成</h2>
                <div class="attr-list">
                    ${renderAttrRow('臂力 (攻击/稳)', 'bili', attributes.bili)}
                    ${renderAttrRow('身法 (敏捷/速)', 'shenfa', attributes.shenfa)}
                    ${renderAttrRow('根骨 (血量/定)', 'gengu', attributes.gengu)}
                    ${renderAttrRow('内功 (破招/威)', 'neigong', attributes.neigong)}
                </div>
                <div class="attr-hint">精微增长，厚积薄发</div>
            </div>
        </div>
      </div>
    `;

    setupEventListeners();
}

function renderAttrRow(name: string, key: string, level: number) {
    const cost = getUpgradeCost(level);
    const canAfford = totalScore >= cost && level < 100;
    return `
        <div class="attr-row">
            <div class="attr-info">
                <span class="attr-name">${name}</span>
                <span class="attr-level">境界: ${level} 阶</span>
            </div>
            <button class="upgrade-btn ${canAfford ? '' : 'disabled'}" data-attr="${key}" ${canAfford ? '' : 'disabled'}>
                ${level >= 100 ? '已满级' : `精进 (${cost})`}
            </button>
        </div>
    `;
}

function setupEventListeners() {
    const startMenu = document.getElementById('start-menu')!;
    
    // 难度选择
    startMenu.querySelectorAll('.difficulty-options button').forEach(btn => {
        (btn as HTMLButtonElement).onclick = () => {
            const diff = btn.getAttribute('data-diff') as any;
            startMenu.style.display = 'none';
            new Game('app', diff, attributes);
        };
    });

    // 属性加点
    startMenu.querySelectorAll('.upgrade-btn').forEach(btn => {
        (btn as HTMLButtonElement).onclick = () => {
            const attrKey = btn.getAttribute('data-attr') as keyof typeof attributes;
            const cost = getUpgradeCost(attributes[attrKey]);
            
            if (totalScore >= cost && attributes[attrKey] < 100) {
                totalScore -= cost;
                attributes[attrKey]++;
                saveGame();
                renderUI();
            }
        };
    });
}

renderUI();
