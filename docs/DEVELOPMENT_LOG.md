# Nhật Ký Phát Triển Dự Án (Development Log)

Tài liệu này ghi lại chi tiết toàn bộ các bước thực hiện, thay đổi mã nguồn, kết quả kiểm thử và tiến độ dự án **Warhammer 40,000 2D Board Game Simulator** theo thời gian thực.

---

## 📅 [2026-10-12] - Giai Đoạn 0: Khởi Tạo Dự Án & Hạ Tầng Cơ Sở (Phase 0 Setup)

### 1. Mục tiêu
Thiết lập toàn bộ môi trường phát triển, công cụ đóng gói, khung kiểm thử tự động, cấu trúc thư mục module hóa và quy chuẩn mã nguồn cho dự án.

### 2. Chi tiết các công việc đã thực hiện
* **Môi trường ảo cô lập (`.venv`)**:
  * Đã tạo môi trường ảo Python độc lập qua lệnh `python -m venv .venv` theo yêu cầu quy chuẩn.
  * Cấu hình [.gitignore](../.gitignore) để bỏ qua `.venv/`, `node_modules/`, `dist/`.
* **Cấu hình Vite & TypeScript**:
  * Khởi tạo [package.json](../package.json) với `TypeScript ^5.7.2`, `Vite ^6.0.3`.
  * Cài đặt bộ công cụ kiểm thử tự động `Vitest ^2.1.8` và `@types/node`.
  * Thiết lập [tsconfig.json](../tsconfig.json) chế độ `strict: true`, hỗ trợ path alias `@/*` trỏ vào `src/*`.
  * Thiết lập [vite.config.ts](../vite.config.ts) cấu hình dev server tại port `3000`.
* **Khung thư mục Module hóa**:
  * Đã tạo đủ 10 thư mục theo kiến trúc trong [ARCHITECTURE_2D.md](./ARCHITECTURE_2D.md):
    * `src/core/`, `src/spatial/`, `src/entities/`, `src/rules/`, `src/state/`
    * `src/stratagems/`, `src/scoring/`, `src/ui/`, `src/data/maps/`, `src/data/factions/`, `src/testing/`
* **Giao diện & Điểm nạp ban đầu**:
  * [index.html](../index.html): Nạp font chữ sci-fi Orbitron & Rajdhani.
  * [src/style.css](../src/style.css): Hệ thống biến màu dark-slate, gold aquila, neon combat.
  * [src/main.ts](../src/main.ts): Điểm nạp đầu tiên tuân thủ quy tắc khai báo biến `APP_CONFIG` ở đầu file.
* **Quy chuẩn Code đã áp dụng**:
  * Bổ sung quy định bắt buộc khai báo toàn bộ hằng số / cấu hình module ở đầu file vào [MASTER_PLAN.md](./MASTER_PLAN.md) và [ARCHITECTURE_2D.md](./ARCHITECTURE_2D.md).

### 3. Kết quả kiểm thử & xác minh (Verification Results)
* `npx tsc --noEmit`: **0 lỗi biên dịch TypeScript**.
* `npm test` ([src/testing/setup.test.ts](../src/testing/setup.test.ts)): **2/2 tests passed (651ms)**.
* `npm run build`: **Build production bundle thành công (101ms)**.

### 4. Trạng thái hiện tại
* **Hoàn thành**: Giai đoạn 0 (100%).
* **Sẵn sàng tiếp theo**: Giai đoạn 1 (Core Math, EventBus, Dữ liệu tĩnh JSON & các Class Thực thể OOP).

---

## 📅 [2026-10-12] - Giai Đoạn 1: Core Math, EventBus & Tầng Dữ Liệu OOP

### 1. Mục tiêu
Xây dựng nền tảng toán học 2D, động cơ xúc xắc, hệ thống EventBus, dữ liệu tĩnh quân chủng/bản đồ, và các lớp thực thể OOP đóng gói dữ liệu bàn cờ.

### 2. Chi tiết các công việc đã thực hiện

* **Module Core (`src/core/`)**:
  * [Vector2D.ts](../src/core/Vector2D.ts): Lớp vector 2D với khoảng cách Euclid, phép cộng/trừ/nhân chia, normalize, dot/cross product, góc xoay (radian & độ), clone/equals.
  * [DiceEngine.ts](../src/core/DiceEngine.ts): Gieo D6, 2D6, batch rolls, đánh giá thành công/thất bại theo target, re-roll (ONES / FAILURES / ALL). Hỗ trợ inject RNG tuỳ chỉnh cho test.
  * [EventBus.ts](../src/core/EventBus.ts): Pub/Sub với `on`, `once`, `off`, `emit`, `listenerCount`, `clear`. Cảnh báo khi số listener vượt ngưỡng. Export `globalEventBus`.

* **Dữ liệu tĩnh (`src/data/`)**:
  * [factions/space_marines.json](../src/data/factions/space_marines.json): Intercessor Squad (5 lính, T4/Sv3+/W2/OC2) + Captain (T5/Sv3+/W5/Invuln4+/OC3) với Bolt Rifle, Bolt Pistol, Power Sword...
  * [factions/tyranids.json](../src/data/factions/tyranids.json): Termagant Brood (10 lính, T3/Sv6+/W1/OC1) + Tyranid Warrior (T5/Sv4+/W3/OC2) với Fleshborer, Devourer, Boneswords.
  * [maps/layout_standard.json](../src/data/maps/layout_standard.json): Bàn 60"×44", 5 điểm cờ, 4 khối Ruins (Obscuring) + 1 Barricade, kịch bản Dawn of War.

* **Thực thể OOP (`src/entities/`)**:
  * [Model.ts](../src/entities/Model.ts): Đóng gói `currentWounds`, `position`, `baseRadius` (tự quy đổi từ mm→inch), `takeDamage()`/`heal()`, cờ `isDestroyed`.
  * [Weapon.ts](../src/entities/Weapon.ts): Chỉ số vũ khí Ranged/Melee, `hasAbility()`, `hasAbilityPartial()`.
  * [Unit.ts](../src/entities/Unit.ts): Quản lý `Model[]`, `getAliveModels()`, `getTotalOC()` (trả 0 khi Battle-shocked), `isBelowHalfStrength()`, `resetTurnFlags()`, đầy đủ `statusFlags`.
  * [TerrainPiece.ts](../src/entities/TerrainPiece.ts): Đa giác bounds, tường cản, cờ `isObscuring`/`providesCover`.
  * [ObjectiveMarker.ts](../src/entities/ObjectiveMarker.ts): Bán kính 40mm, vùng kiểm soát 3", `controllingPlayer`.
  * [Battlefield.ts](../src/entities/Battlefield.ts): Kích thước bàn, `isWithinBounds()`, `getDeploymentZone()`, `getObscuringTerrains()`, nạp trực tiếp từ JSON map.

### 3. Kết quả kiểm thử & xác minh (Verification Results)
* `npx tsc --noEmit`: **0 lỗi biên dịch TypeScript** (strict mode, `noUnusedLocals`, `noUnusedParameters`).
* `npm test`: **2/2 tests passed**.
* `npm run build`: **Build production thành công (145ms)**.

### 4. Trạng thái hiện tại
* **Hoàn thành**: Giai đoạn 1 (100%).
* **Sẵn sàng tiếp theo**: Giai đoạn 2 (WoundChart, KeywordHandlers, CombatPipeline, BattleShockRule + CombatSimulator tests).

---

## 📅 [2026-10-12] - Giai Đoạn 2: Động Cơ Giao Tranh & Kiểm Thử Headless

### 1. Mục tiêu
Đảm bảo toàn bộ luật tính toán sát thương chính xác 100% trước khi đụng vào đồ họa. Toàn bộ module đều **headless** (không phụ thuộc DOM/Canvas).

### 2. Chi tiết các công việc đã thực hiện

* **Mở rộng Core (`src/core/`)**:
  * [DiceEngine.ts](../src/core/DiceEngine.ts): Thêm `rollD3()` và `evaluateDiceExpression()` — phân tích biểu thức xúc xắc dạng chuỗi từ datasheet (`"2"`, `"D3"`, `"D6"`, `"2D6"`, `"D6+1"`).

* **Module Rules (`src/rules/`)**:
  * [WoundChart.ts](../src/rules/WoundChart.ts): `getWoundTarget(S, T)` → `2/3/4/5/6` theo bảng S vs T 10th Edition.
  * [KeywordHandlers.ts](../src/rules/KeywordHandlers.ts): `applyBlast`, `applyLethalHits`, `applySustainedHits`, `applyDevastatingWounds`, `applyFeelNoPain`.
  * [CombatPipeline.ts](../src/rules/CombatPipeline.ts): Chuỗi 4 bước `Hit → Wound → Save → Damage`. Hỗ trợ Torrent, Heavy, Lance, Twin-linked, Blast, Lethal Hits, Sustained Hits, Devastating Wounds, FNP, Cover. Chống sát thương dư thừa (no spillover). Phát sự kiện `COMBAT:ATTACK_RESOLVED` qua EventBus.
  * [BattleShockRule.ts](../src/rules/BattleShockRule.ts): `performTest(unit)` gieo 2D6 vs Ld khi đơn vị dưới 50% quân số.

* **Kiểm thử (`src/testing/`)**:
  * [CombatSimulator.ts](../src/testing/CombatSimulator.ts): Mô phỏng Monte Carlo (`simulate`), tính kỳ vọng lý thuyết Mathhammer (`calculateExpectedDamage`), RNG tất định cho test (`createDeterministicRng`).
  * [wound_chart.test.ts](../src/testing/wound_chart.test.ts): Ma trận S[1..14] × T[1..14] đối chiếu hàm tham chiếu độc lập.
  * [keyword_handlers.test.ts](../src/testing/keyword_handlers.test.ts): Unit test từng keyword.
  * [combat_pipeline.test.ts](../src/testing/combat_pipeline.test.ts): Test chuỗi 4 bước + Devastating/Lethal/Sustained/Blast/FNP.
  * [battle_shock.test.ts](../src/testing/battle_shock.test.ts): Test vượt/thất bại Battle-shock & OC = 0.
  * [combat_simulator.test.ts](../src/testing/combat_simulator.test.ts): Monte Carlo 10.000 lượt, sai số tương đối < 10%.

### 3. Kết quả kiểm thử & xác minh (Verification Results)
* `npx tsc --noEmit`: **0 lỗi biên dịch TypeScript**.
* `npm test`: **23/23 tests passed** (6 file).
* `npm run build`: **Build production thành công (178ms)**.

### 4. Trạng thái hiện tại
* **Hoàn thành**: Giai đoạn 2 (100%).
* **Sẵn sàng tiếp theo**: Giai đoạn 3 (Không gian 2D & Canvas Renderer: Measurement, Collision2D, LineOfSight2D, CoherencyValidator, MapRenderer, CanvasRenderer...).

---

## 📅 [2026-10-12] - Giai Đoạn 3: Không Gian 2D & Canvas Renderer

### 1. Mục tiêu
Hiện thực hoá toàn bộ hình học bàn cờ 2D và bộ vẽ Canvas: đo đạc, va chạm, tầm nhìn, đội hình, cùng renderer sa bàn và tương tác chuột.

### 2. Chi tiết các công việc đã thực hiện

* **Module Spatial (`src/spatial/`)** — toàn bộ headless, không phụ thuộc DOM:
  * [Measurement.ts](../src/spatial/Measurement.ts): `SPATIAL_CONFIG` ($1" = 20\text{ px}$), `inchesToPixels`, `pixelsToInches`, `getBaseToBaseDistance` (trừ bán kính 2 đế), `isInEngagementRange` ($\le 1"$).
  * [Collision2D.ts](../src/spatial/Collision2D.ts): `checkCircleOverlap` (chống đè đế), `checkTerrainCollision` (khoảng cách đoạn-di chuyển tới đoạn-tường).
  * [LineOfSight2D.ts](../src/spatial/LineOfSight2D.ts): `hasLineOfSight`, `checkObscured` (ray casting qua footprint Ruins + point-in-polygon), `checkBenefitOfCover`.
  * [CoherencyValidator.ts](../src/spatial/CoherencyValidator.ts): dựng đồ thị khoảng cách $\le 2"$, tìm thành phần liên thông bằng DFS, trả về danh sách mô hình vi phạm (đứt gãy hoặc thiếu đồng đội gần; $\ge 7$ lính cần 2 đồng đội).

* **Module UI (`src/ui/`)**:
  * [MapRenderer.ts](../src/ui/MapRenderer.ts): `drawPlaymat`, `drawDeploymentZones` (nét đứt), `drawTerrains` (footprint mờ + tường dày), `drawObjectives` (marker 40mm + hào quang kiểm soát $3"$).
  * [CanvasRenderer.ts](../src/ui/CanvasRenderer.ts): điều phối lớp vẽ theo Z-index (Map → Deployment → Range Overlays → Units → UI FX), vẽ đế tròn theo màu phe, cung máu, viền vàng khi chọn, viền đỏ khi vi phạm coherency.
  * [RangeRingOverlay.ts](../src/ui/RangeRingOverlay.ts): vòng di chuyển $M"$ (xanh), tầm bắn (đỏ), Engagement Range $1"$ (vàng).
  * [InputController.ts](../src/ui/InputController.ts): `onMouseDown/Move/Up` — click chọn đơn vị, kéo thả di chuyển mô hình có kiểm tra biên bàn / chống đè đế / chống xuyên tường; quy đổi toạ độ chuột (tính cả CSS scale).

* **Kiểm thử (`src/testing/`)**:
  * [SpatialTester.ts](../src/testing/SpatialTester.ts): fixture builders (`buildTestUnit`, `buildTerrain`) + 4 kịch bản tự kiểm tra (`runAll`) gồm đo cự ly, raycast bị che, đứt đội hình, chặn xuyên tường.
  * [spatial.test.ts](../src/testing/spatial.test.ts): 15 test cho Measurement / Collision2D / LineOfSight2D / CoherencyValidator + xác nhận `SpatialTester.runAll()` toàn bộ đạt.

* **Tích hợp app**:
  * [main.ts](../src/main.ts): nạp `layout_standard.json` + 2 faction, dựng `Battlefield` và 4 đơn vị với vị trí xuất quân, khởi tạo renderer + input, render vòng hỗ trợ và bảng thông số đơn vị khi chọn.
  * [style.css](../src/style.css): thêm layout header + board-canvas + bảng thông số đơn vị (glassmorphism).

### 3. Kết quả kiểm thử & xác minh (Verification Results)
* `npx tsc --noEmit`: **0 lỗi biên dịch TypeScript**.
* `npm test`: **38/38 tests passed** (7 file).
* `npm run build`: **Build production thành công (300ms)**, bundle JS ~28.95 kB.

### 4. Trạng thái hiện tại
* **Hoàn thành**: Giai đoạn 3 (100%).
* **Sẵn sàng tiếp theo**: Giai đoạn 4 (State, FSM & Stratagems: PhaseStateMachine, TurnManager, ObjectiveScorer, VictoryPoints, CPManager, StratagemDeck, ReactionTrigger).
