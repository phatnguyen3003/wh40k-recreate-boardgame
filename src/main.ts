import './style.css';
import layoutData from './data/maps/layout_standard.json';
import spaceMarinesData from './data/factions/space_marines.json';
import tyranidsData from './data/factions/tyranids.json';
import { Battlefield, BattlefieldMapData } from './entities/Battlefield';
import { Unit, UnitData } from './entities/Unit';
import { CanvasRenderer, RenderScene } from './ui/CanvasRenderer';
import { InputController } from './ui/InputController';
import { RangeRingOverlay, RangeRing } from './ui/RangeRingOverlay';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const APP_CONFIG = {
  TITLE: 'WH40K 2D Board Game Simulator',
  VERSION: '0.3.0-alpha',
  PHASE: 'Phase 3 - Spatial & Renderer',
} as const;

// Bố trí quân khởi đầu (đơn vị: inch) — tránh đè lên địa hình
const DEPLOYMENT = {
  intercessors: { x: 24, y: 8, spacing: 1.4 },
  captain: { x: 28, y: 5 },
  termagants: { x: 22, y: 36, spacing: 1.1 },
  warrior: { x: 28, y: 40 },
} as const;

// =========================================================================
// 📦 BOOTSTRAP IMPLEMENTATION
// =========================================================================

/** Tạo Unit từ dữ liệu datasheet và rải mô hình theo hàng ngang. */
function buildUnit(data: UnitData, startX: number, startY: number, spacing: number): Unit {
  const unit = new Unit(data);
  const models = unit.getAliveModels();
  models.forEach((model, i) => {
    model.setPosition(startX + i * spacing, startY);
  });
  return unit;
}

function bootstrap(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  // 1. Dựng sa bàn & đơn vị từ dữ liệu JSON
  const battlefield = new Battlefield(layoutData as BattlefieldMapData);

  const units: Unit[] = [
    buildUnit(
      spaceMarinesData.units[0] as UnitData,
      DEPLOYMENT.intercessors.x,
      DEPLOYMENT.intercessors.y,
      DEPLOYMENT.intercessors.spacing,
    ),
    buildUnit(spaceMarinesData.units[1] as UnitData, DEPLOYMENT.captain.x, DEPLOYMENT.captain.y, 0),
    buildUnit(
      tyranidsData.units[0] as UnitData,
      DEPLOYMENT.termagants.x,
      DEPLOYMENT.termagants.y,
      DEPLOYMENT.termagants.spacing,
    ),
    buildUnit(tyranidsData.units[1] as UnitData, DEPLOYMENT.warrior.x, DEPLOYMENT.warrior.y, 0),
  ];

  // 2. Dựng khung DOM (header + board)
  app.innerHTML = `
    <header class="app-header">
      <h1 class="app-title">${APP_CONFIG.TITLE}</h1>
      <div class="header-right">
        <span class="phase-badge">${APP_CONFIG.PHASE} (v${APP_CONFIG.VERSION})</span>
      </div>
    </header>
    <main class="board-wrapper">
      <canvas id="board-canvas"></canvas>
      <div class="hint">Click chọn đơn vị · Kéo thả để di chuyển mô hình</div>
      <div id="unit-info" class="unit-info hidden"></div>
    </main>
  `;

  const canvas = app.querySelector<HTMLCanvasElement>('#board-canvas');
  const infoPanelEl = app.querySelector<HTMLDivElement>('#unit-info');
  if (!canvas || !infoPanelEl) return;
  // Gán lại kiểu non-null để dùng an toàn bên trong closure
  const infoPanel: HTMLDivElement = infoPanelEl;

  // 3. Khởi tạo renderer & input
  const renderer = new CanvasRenderer(canvas);
  renderer.resizeToBattlefield(battlefield);

  let selectedUnitId: string | null = null;

  const render = (): void => {
    const rangeRings = buildRangeRings();
    const scene: RenderScene = { battlefield, units, selectedUnitId, rangeRings };
    renderer.render(scene);
    updateInfoPanel();
  };

  /** Tạo vòng hỗ trợ chiến thuật (M", tầm bắn, engagement 1") cho đơn vị đang chọn. */
  function buildRangeRings(): RangeRing[] {
    if (!selectedUnitId) return [];
    const unit = units.find((u) => u.unitId === selectedUnitId);
    if (!unit) return [];
    const anchor = unit.getLeader() ?? unit.getAliveModels()[0];
    if (!anchor) return [];

    // Tầm bắn xa nhất trong số vũ khí bắn xa của đơn vị
    const rangedRanges = unit.weapons
      .filter((w) => w.type === 'RANGED' && w.range > 0)
      .map((w) => w.range);
    const weaponRange = rangedRanges.length > 0 ? Math.max(...rangedRanges) : undefined;

    return RangeRingOverlay.buildStandardRings(
      anchor.position,
      unit.datasheetStats.movement,
      weaponRange,
    );
  }

  function updateInfoPanel(): void {
    if (!selectedUnitId) {
      infoPanel.classList.add('hidden');
      return;
    }
    const unit = units.find((u) => u.unitId === selectedUnitId);
    if (!unit) {
      infoPanel.classList.add('hidden');
      return;
    }
    const stats = unit.datasheetStats;
    infoPanel.classList.remove('hidden');
    infoPanel.innerHTML = `
      <div class="unit-info__name">${unit.name}</div>
      <div class="unit-info__row"><span>T</span>${stats.toughness}</div>
      <div class="unit-info__row"><span>Sv</span>${stats.save}+</div>
      <div class="unit-info__row"><span>M</span>${stats.movement}"</div>
      <div class="unit-info__row"><span>OC</span>${stats.objectiveControl}</div>
      <div class="unit-info__row"><span>Số lính</span>${unit.getAliveModelCount()}/${unit.modelCount}</div>
    `;
  }

  const input = new InputController(canvas, {
    getScene: () => ({ battlefield, units, selectedUnitId }),
    onSelectUnit: (unitId) => {
      selectedUnitId = unitId;
      render();
    },
    onModelMoved: () => render(),
    requestRender: () => render(),
  });

  // Giữ tham chiếu để tránh bị tree-shake (và để mở rộng sau này)
  void input;

  // 4. Render lần đầu
  render();
}

bootstrap();
