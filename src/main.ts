import './style.css';
import { Game } from './game/Game';
import { getTranslation, CHARACTER } from './game/Constants';
import { BackgroundManager } from './game/Background';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.classList.add('menu-mode');

// --- 属性与记录系统状态 ---
const DEFAULT_ATTRS = { bili: 1, shenfa: 1, gengu: 1, neigong: 1 };
let attributes = JSON.parse(localStorage.getItem('wuxia_attributes') || JSON.stringify(DEFAULT_ATTRS));
// Clamp existing attributes to new max level
Object.keys(attributes).forEach(key => {
    if (attributes[key] > CHARACTER.MAX_ATTR_LEVEL) attributes[key] = CHARACTER.MAX_ATTR_LEVEL;
});
let totalScore = parseInt(localStorage.getItem('wuxia_total_score') || '0');
let leaderboard: any[] = JSON.parse(localStorage.getItem('wuxia_leaderboard') || '[]');
let currentLang: 'ZH' | 'EN' = (localStorage.getItem('wuxia_lang') as 'ZH' | 'EN') || 'EN';

// --- 主菜单动态背景 ---
const bgCanvas = document.createElement('canvas');
bgCanvas.width = 1280;
bgCanvas.height = 720;
bgCanvas.style.position = 'absolute';
bgCanvas.style.top = '0';
bgCanvas.style.left = '0';
bgCanvas.style.zIndex = '0';
app.appendChild(bgCanvas);

// 创建一个专门存放 UI 的容器，防止 renderUI 清空背景
const uiRoot = document.createElement('div');
uiRoot.id = 'ui-root';
uiRoot.style.position = 'relative';
uiRoot.style.zIndex = '10';
uiRoot.style.width = '100%';
uiRoot.style.height = '100%';
app.appendChild(uiRoot);

const bgCtx = bgCanvas.getContext('2d')!;
const bgManager = new BackgroundManager(bgCanvas, bgCtx);
let menuAnimationId: number;
let menuCameraX = 0;

function drawMenuBackground() {
    // 摄像机缓慢右移，营造电影般的摇摄镜头
    menuCameraX += 0.8;
    
    bgManager.draw(menuCameraX);
    bgManager.drawForeground(menuCameraX, []); // 菜单中没有人物
    bgManager.drawOverlay();

    menuAnimationId = requestAnimationFrame(drawMenuBackground);
}
// 启动主菜单背景动画
drawMenuBackground();

function t(key: any, params: any = {}) {
    return getTranslation(currentLang, key, params);
}

function saveGame() {
    localStorage.setItem('wuxia_attributes', JSON.stringify(attributes));
    localStorage.setItem('wuxia_total_score', totalScore.toString());
}

function getUpgradeCost(level: number): number {
    // Increased power from 1.2 to 1.5 to compensate for fewer levels, 
    // but still much faster overall than 100 levels.
    return Math.floor(10 + Math.pow(level, 1.5) * 5);
}

function renderUI() {
    // 重新获取数据以确保显示最新
    totalScore = parseInt(localStorage.getItem('wuxia_total_score') || '0');
    leaderboard = JSON.parse(localStorage.getItem('wuxia_leaderboard') || '[]');

    uiRoot.innerHTML = `
      <div class="ui-overlay" id="main-title">
        <div class="controls-hint">${t('HINT')}</div>
        <div id="hell-indicator-overlay" class="hell-indicator-overlay"></div>
      </div>

      <div class="difficulty-overlay" id="start-menu">
        <h1 class="menu-header-title">${t('TITLE')}</h1>
        <button id="lang-switch" class="lang-btn">${t('LANG_BTN')}</button>
        
        <div class="main-container">
            <!-- 1. 最左侧：江湖龙虎榜 -->
            <div class="menu-content leaderboard-panel">
                <h2>${t('LEADERBOARD')}</h2>
                <div class="leaderboard-list">
                    ${leaderboard.length > 0 ? 
                        leaderboard.map((entry: any, i) => `
                            <div class="leader-row ${i < 3 ? 'top-three' : ''}">
                                <div class="leader-main">
                                    <span class="rank">#${i + 1}</span>
                                    <span class="score">${entry.score} ${t('SCORE_UNIT')}</span>
                                </div>
                                <span class="date">${entry.date}</span>
                            </div>
                        `).join('') : 
                        `<div class="empty-hint">${t('EMPTY_LEADERBOARD')}</div>`
                    }
                </div>
            </div>

            <!-- 2. 中间：境界选择 -->
            <div class="menu-content center-panel">
                <h2>${t('CHOOSE_REALM')}</h2>
                <div class="total-score-display">${t('TOTAL_POWER')}: ${totalScore} ${t('SCORE_UNIT')}</div>
                <div class="difficulty-options">
                    <button data-diff="EASY">${t('DIFF_EASY')} <small>(${t('DIFF_EASY_DESC')})</small></button>
                    <button data-diff="MEDIUM">${t('DIFF_MEDIUM')} <small>(${t('DIFF_MEDIUM_DESC')})</small></button>
                    <button data-diff="HARD">${t('DIFF_HARD')} <small>(${t('DIFF_HARD_DESC')})</small></button>
                    <button data-diff="NIGHTMARE" style="color: var(--color-vermilion); border-color: var(--color-vermilion);">
                        ${t('DIFF_NIGHTMARE')} <small>(${t('DIFF_NIGHTMARE_DESC')})</small>
                    </button>
                </div>
            </div>

            <!-- 3. 右侧：修为养成 -->
            <div class="menu-content right-panel attribute-panel">
                <h2>${t('CULTIVATION')}</h2>
                <div class="attr-list">
                    ${renderAttrRow(t('ATTR_BILI'), 'bili', attributes.bili)}
                    ${renderAttrRow(t('ATTR_SHENFA'), 'shenfa', attributes.shenfa)}
                    ${renderAttrRow(t('ATTR_GENGU'), 'gengu', attributes.gengu)}
                    ${renderAttrRow(t('ATTR_NEIGONG'), 'neigong', attributes.neigong)}
                </div>
                <div class="attr-hint">${t('HINT_FOOTER')}</div>
            </div>
        </div>
      </div>
    `;

    setupEventListeners();
}

function renderAttrRow(name: string, key: string, level: number) {
    const cost = getUpgradeCost(level);
    const canAfford = totalScore >= cost && level < CHARACTER.MAX_ATTR_LEVEL;
    return `
        <div class="attr-row">
            <div class="attr-info">
                <span class="attr-name">${name}</span>
                <span class="attr-level">${t('REALM')}: ${level} ${t('LEVEL')}</span>
            </div>
            <button class="upgrade-btn ${canAfford ? '' : 'disabled'}" data-attr="${key}" ${canAfford ? '' : 'disabled'}>
                ${level >= CHARACTER.MAX_ATTR_LEVEL ? t('MAX_LEVEL') : `${t('UPGRADE')} (${cost})`}
            </button>
        </div>
    `;
}

function setupEventListeners() {
    const startMenu = document.getElementById('start-menu')!;
    
    // 语言切换
    const langBtn = document.getElementById('lang-switch');
    if (langBtn) {
        langBtn.onclick = () => {
            currentLang = currentLang === 'ZH' ? 'EN' : 'ZH';
            localStorage.setItem('wuxia_lang', currentLang);
            renderUI();
        };
    }

    // 难度选择
    startMenu.querySelectorAll('.difficulty-options button').forEach(btn => {
        (btn as HTMLButtonElement).onclick = () => {
            const diff = btn.getAttribute('data-diff') as any;
            startMenu.style.display = 'none';
            app.classList.remove('menu-mode');
            
            // 停止菜单的背景动画，并移除背景 Canvas
            cancelAnimationFrame(menuAnimationId);
            if (bgCanvas.parentNode) {
                bgCanvas.parentNode.removeChild(bgCanvas);
            }
            
            // 降低 UI 层的层级，并关闭鼠标穿透，确保不遮挡游戏画布
            uiRoot.style.zIndex = '5';
            uiRoot.style.pointerEvents = 'none';
            
            // 显示操作提示
            const mainTitle = document.getElementById('main-title');
            if (mainTitle) mainTitle.style.display = 'block';
            
            new Game('app', diff, attributes, currentLang);
        };
    });

    // 属性加点
    startMenu.querySelectorAll('.upgrade-btn').forEach(btn => {
        (btn as HTMLButtonElement).onclick = () => {
            const attrKey = btn.getAttribute('data-attr') as keyof typeof attributes;
            const cost = getUpgradeCost(attributes[attrKey]);
            
            if (totalScore >= cost && attributes[attrKey] < CHARACTER.MAX_ATTR_LEVEL) {
                totalScore -= cost;
                attributes[attrKey]++;
                saveGame();
                renderUI();
            }
        };
    });
}

function updateScale() {
    const baseWidth = 1280;
    const baseHeight = 720;
    const scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);
    app.style.transform = `scale(${scale})`;
    (window as any).gameScale = scale;
}

window.addEventListener('resize', updateScale);
updateScale();

renderUI();
