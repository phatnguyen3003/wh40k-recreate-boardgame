# Kiến Trúc Hệ Thống & Module Hóa Board Game WH40K 2D (System Architecture)

Tài liệu này đặc tả chi tiết kiến trúc phần mềm, cấu trúc thư mục và trách nhiệm của từng file/module cho việc tự xây dựng Board Game 2D mô phỏng **Warhammer 40,000 (10th Edition)** theo phương pháp thiết kế hướng module (Modular Clean Architecture).

---

## MỤC LỤC
1. [Nguyên Tắc Thiết Kế (Design Principles)](#1-nguyên-tắc-thiết-kế-design-principles)
2. [Cấu Trúc Thư Mục Dự Án (Project Structure)](#2-cấu-trúc-thư-mục-dự-án-project-structure)
3. [Đặc Tả Chi Tiết Từng Module & File](#3-đặc-tả-chi-tiết-từng-module--file)
   - [Module 1: Core (`src/core/`)](#module-1-core-srccore)
   - [Module 2: Spatial & Physics 2D (`src/spatial/`)](#module-2-spatial--physics-2d-srcspatial)
   - [Module 3: Entities (`src/entities/`)](#module-3-entities-srcentities)
   - [Module 4: Rules & Combat (`src/rules/`)](#module-4-rules--combat-srcrules)
   - [Module 5: State & Turn Flow (`src/state/`)](#module-5-state--turn-flow-srcstate)
   - [Module 6: Stratagems & Reaction (`src/stratagems/`)](#module-6-stratagems--reaction-srcstratagems)
   - [Module 7: Scoring & Objectives (`src/scoring/`)](#module-7-scoring--objectives-srcscoring)
   - [Module 8: UI & Renderer 2D (`src/ui/`)](#module-8-ui--renderer-2d-srcui)
   - [Module 9: Data Layer (`src/data/`)](#module-9-data-layer-srcdata)
   - [Module 10: Testing & Sandbox Framework (`src/testing/`)](#module-10-testing--sandbox-framework-srctesting)
4. [Luồng Tương Tác Dữ Liệu & Event Bus (Data Flow)](#4-luồng-tương-tác-dữ-liệu--event-bus-data-flow)
5. [Lộ Trình Triển Khai Từng Bước (Implementation Roadmap)](#5-lộ-trình-triển-khai-từng-bước-implementation-roadmap)

---

## 1. Nguyên Tắc Thiết Kế (Design Principles)

1. **Phân tách Tuyệt đối giữa Logic và Hiển thị (Headless Logic)**:
   * Toàn bộ các module toán học, luật chơi, tính toán sát thương, trạng thái lượt (`core`, `spatial`, `entities`, `rules`, `state`, `scoring`) không phụ thuộc vào thư viện đồ họa hay DOM HTML.
   * Có thể chạy độc lập trong môi trường Node.js / CLI để chạy Unit Test hoặc huấn luyện AI.
2. **Kiến trúc Hướng Sự kiện (Event-Driven Architecture)**:
   * Các module giao tiếp lỏng lẻo (loose coupling) thông qua `EventBus` (ví dụ: `ON_UNIT_MOVED`, `ON_ATTACK_DECLARED`, `ON_WOUND_ALLOCATED`).
3. **Mở rộng dựa trên Dữ liệu (Data-Driven)**:
   * Chỉ số quân chủng, vũ khí, kỹ năng đều nằm trong các file JSON/hằng số ở `src/data/`, không hardcode vào logic.
4. **Khai báo Toàn bộ Biến / Hằng số Cấu hình ở Đầu Mỗi Module (Top-of-Module Centralized Constants)**:
   * Mọi file module bắt buộc phải gom tất cả biến số cấu hình, hằng số luật, tham số hiển thị (`CONFIG` / `CONSTANTS`) lên ngay phần đầu file (File Header).
   * Dùng chung thống nhất trong toàn bộ module đó. Tuyệt đối không dùng magic numbers để bất kỳ ai mở file ra cũng có thể tinh chỉnh thông số ngay lập tức.
5. **Môi trường & Thư viện Cô lập trong `venv` (Isolated Virtual Environment)**:
   * Mọi môi trường, công cụ phụ trợ, test scripts hay server runtime nếu cần cài đặt đều phải nằm gọn trong môi trường ảo `venv` (`.venv/`), không cài đặt ra môi trường global của hệ thống.

---

## 2. Cấu Trúc Thư Mục Dự Án (Project Structure)

```text
wh40k_board/
├── docs/
│   ├── CORE_MECHANICS.md         # Luật chơi 40K 10th Edition chuẩn hóa
│   └── ARCHITECTURE_2D.md        # Tài liệu kiến trúc này
├── src/
│   ├── core/                     # Nền tảng toán học & hạ tầng cơ sở
│   │   ├── Vector2D.js
│   │   ├── DiceEngine.js
│   │   └── EventBus.js
│   │
│   ├── spatial/                  # Không gian 2D, khoảng cách, va chạm & tầm nhìn
│   │   ├── Measurement.js
│   │   ├── Collision2D.js
│   │   ├── LineOfSight2D.js
│   │   └── CoherencyValidator.js
│   │
│   ├── entities/                 # Cấu trúc dữ liệu các thực thể trên bàn
│   │   ├── Model.js
│   │   ├── Unit.js
│   │   ├── Weapon.js
│   │   ├── Battlefield.js        # Thực thể quản lý mặt bàn, ranh giới 44"x60"
│   │   ├── TerrainPiece.js
│   │   └── ObjectiveMarker.js
│   │
│   ├── rules/                    # Động cơ xử lý luật chơi & giao tranh
│   │   ├── WoundChart.js
│   │   ├── CombatPipeline.js
│   │   ├── KeywordHandlers.js
│   │   └── BattleShockRule.js
│   │
│   ├── state/                    # Quản lý vòng lặp lượt chơi & FSM
│   │   ├── TurnManager.js
│   │   ├── PhaseStateMachine.js
│   │   └── ActionQueue.js
│   │
│   ├── stratagems/               # Quản lý tài nguyên CP & phản ứng chiến thuật
│   │   ├── CPManager.js
│   │   ├── StratagemDeck.js
│   │   └── ReactionTrigger.js
│   │
│   ├── scoring/                  # Quản lý điểm số & kiểm soát cờ
│   │   ├── ObjectiveScorer.js
│   │   └── VictoryPoints.js
│   │
│   ├── data/                     # Dữ liệu tĩnh (Maps, Units, Weapons, Stratagems)
│   │   ├── maps/                 # Cấu hình địa hình, kích thước bàn, điểm xuất quân
│   │   │   ├── layout_standard.json
│   │   │   └── layout_hammer_and_anvil.json
│   │   ├── factions/
│   │   │   ├── space_marines.json
│   │   │   └── tyranids.json
│   │   ├── core_stratagems.json
│   │   └── missions.json
│   │
│   ├── ui/                       # Giao diện hiển thị Canvas 2D & tương tác người dùng
│       ├── CanvasRenderer.js     # Tổng hợp và điều phối vẽ các lớp (layers)
│       ├── MapRenderer.js        # Vẽ mặt sa bàn, địa hình, vạch xuất quân
│       ├── RangeRingOverlay.js
│       ├── InputController.js
│       ├── CombatModalUI.js
│       └── DatasheetPanelUI.js
│   │
│   └── testing/                  # Module kiểm thử & sandbox độc lập từng cơ chế
│       ├── TestManager.js        # Điều phối các bài test suite & báo cáo kết quả
│       ├── SpatialTester.js      # Kiểm thử đo khoảng cách, va chạm & LoS
│       ├── CombatSimulator.js    # Giả lập sát thương, Monte Carlo & Mathhammer
│       ├── StateFlowTester.js    # Kiểm thử máy trạng thái FSM 5 phase & chuyển lượt
│       ├── ReactionTester.js     # Giả lập kích hoạt Stratagems & cửa sổ ngắt phản ứng
│       ├── ScoringTester.js      # Kiểm thử tranh chấp cờ OC & tính điểm VP
│       └── MapTester.js          # Kiểm thử nạp map JSON, kiểm tra biên bàn cờ
│
├── index.html                    # Điểm nạp giao diện ứng dụng web
└── main.js                       # Điểm khởi tạo & kết nối các module
```

---

## 3. Đặc Tả Chi Tiết Từng Module & File

### Module 1: Core (`src/core/`)

#### 1. `Vector2D.js`
* **Trách nhiệm**: Xử lý tọa độ và các phép toán vector phẳng 2D.
* **Hàm chính**:
  * `distanceTo(v1, v2)`: Tính khoảng cách Euclidean giữa 2 điểm.
  * `add(v)`, `subtract(v)`, `multiply(scalar)`: Phép toán vector.
  * `angleTo(v1, v2)`: Tính góc quay (radian/degree) giữa 2 thực thể.

#### 2. `DiceEngine.js`
* **Trách nhiệm**: Động cơ gieo xúc xắc giả lập (RNG D6).
* **Hàm chính**:
  * `rollD6()`: Gieo 1 viên D6 ngẫu nhiên từ 1 đến 6.
  * `rollBatch(count)`: Gieo số lượng lớn $N$ viên D6, trả về mảng kết quả `[3, 5, 1, 6, ...]`.
  * `roll2D6()`: Gieo 2 viên D6 (dùng cho Charge và Battle-shock).
  * `rerollFailures(rolls, targetNumber, rerollCondition)`: Hỗ trợ gieo lại số 1 (re-roll 1s) hoặc gieo lại tất cả các viên tạch.

#### 3. `EventBus.js`
* **Trách nhiệm**: Kênh truyền tin pub/sub độc lập cho toàn hệ thống.
* **Hàm chính**:
  * `on(eventName, callback)`: Đăng ký nhận sự kiện.
  * `emit(eventName, payload)`: Bắn sự kiện ra toàn bộ ứng dụng.
  * `off(eventName, callback)`: Hủy đăng ký.

---

### Module 2: Spatial & Physics 2D (`src/spatial/`)

#### 1. `Measurement.js`
* **Trách nhiệm**: Quy đổi tỉ lệ và đo khoảng cách sa bàn.
* **Hàm chính**:
  * `inchesToPixels(inches)`: Quy đổi inch sang pixel theo hằng số cấu hình (VD: $1" = 20\text{ px}$).
  * `pixelsToInches(pixels)`: Quy đổi ngược lại.
  * `getBaseToBaseDistance(modelA, modelB)`: Khoảng cách trừ đi bán kính 2 đế: 
    $$d_{\text{base}} = \max(0, \text{distance}(\text{center}_A, \text{center}_B) - (r_A + r_B))$$
  * `isInEngagementRange(modelA, modelB)`: Kiểm tra xem $d_{\text{base}} \le 1"$.

#### 2. `Collision2D.js`
* **Trách nhiệm**: Ngăn chồng lấn đế mô hình và kiểm tra đi xuyên vật cản.
* **Hàm chính**:
  * `checkCircleOverlap(modelA, newPos)`: Kiểm tra vị trí mới có bị đè lên bất kỳ mô hình nào khác không.
  * `checkTerrainCollision(startPos, endPos, modelRadius, terrainList)`: Kiểm tra đường đi có bị chặn bởi tường không thể xuyên qua.

#### 3. `LineOfSight2D.js`
* **Trách nhiệm**: Bắn tia 2D (Raycasting) xác định tầm nhìn và độ che chắn.
* **Hàm chính**:
  * `hasLineOfSight(sourceModel, targetModel, terrainList)`: Trả về `true/false`.
  * `checkObscured(ray, ruinsTerrain)`: Nếu tia cắt ngang qua hình đa giác của tàn tích (Ruins footprint) mà cả 2 mô hình đều đứng ngoài $\rightarrow$ Trả về `true` (không thể bắn).
  * `checkBenefitOfCover(targetModel, shooterModel, terrainList)`: Kiểm tra mô hình mục tiêu có được nhận buff $+1$ giáp do ẩn nấp sau chướng ngại vật hay không.

#### 4. `CoherencyValidator.js`
* **Trách nhiệm**: Đảm bảo toàn bộ mô hình trong một Unit không bị đứt gãy đội hình.
* **Hàm chính**:
  * `validateUnitCoherency(unit)`: Xây dựng đồ thị khoảng cách giữa các model trong unit. Dùng thuật toán DFS kiểm tra đồ thị liên thông và mỗi model có ít nhất 1 (hoặc 2 nếu unit $\ge 7$ lính) liên kết $\le 2"$.
  * Trả về danh sách các model bị vi phạm để đánh dấu viền đỏ cảnh báo.

---

### Module 3: Entities (`src/entities/`)

#### 1. `Model.js`
* **Dữ liệu**: `id`, `baseRadius` (pixels), `position` ({x, y}), `currentWounds`, `isDestroyed`, `isLeader`.
* **Phương thức**: `takeDamage(amount)`, `heal(amount)`.

#### 2. `Unit.js`
* **Dữ liệu**: `unitId`, `name`, `faction`, `models[]`, `datasheetStats` (`M, T, Sv, Invuln, Ld, OC`), `weapons[]`, `statusFlags` (`isBattleShocked`, `hasMoved`, `hasAdvanced`, `hasFallenBack`, `hasShot`, `hasCharged`, `hasFought`).
* **Phương thức**: `getAliveModels()`, `getTotalOC()`, `isBelowHalfStrength()`, `resetTurnFlags()`.

#### 3. `Weapon.js`
* **Dữ liệu**: `name`, `type` (`RANGED` / `MELEE`), `range`, `attacks`, `skill` (BS/WS), `strength`, `ap`, `damage`, `keywords[]` (Mảng chứa chuỗi từ khóa như `"LETHAL_HITS"`, `"BLAST"`, `"TORRENT"`).

#### 4. `Battlefield.js`
* **Trách nhiệm**: Đại diện cho toàn bộ mặt bàn cờ ($44" \times 60"$) trong bộ nhớ logic.
* **Dữ liệu**: `dimensions` (`width`, `height` theo inches/pixels), `deploymentZones` (vùng xuất quân của Player 1 & 2), `terrains[]` (danh sách `TerrainPiece`), `objectives[]` (danh sách `ObjectiveMarker`).
* **Phương thức**:
  * `isWithinBounds(pos, radius)`: Kiểm tra mô hình có nằm trọn vẹn trong mép bàn cờ hay không (ngăn rớt khỏi mép bàn).
  * `getObscuringTerrains()`: Trả về danh sách tàn tích có hiệu ứng Obscuring để phục vụ raycasting LoS.
  * `getDeploymentZone(player)`: Lấy khu vực hợp lệ để đặt quân ở đầu trận.

#### 5. `TerrainPiece.js`
* **Dữ liệu**: `id`, `type` (`RUINS`, `CRATER`, `BARRICADE`), `bounds` (Hình chữ nhật hoặc Đa giác các đỉnh x,y), `walls[]` (danh sách đoạn tường cản bước/chắn đạn), `isObscuring`, `providesCover`.

#### 6. `ObjectiveMarker.js`
* **Dữ liệu**: `id`, `position` ({x, y}), `radius` (40mm quy ra pixel), `controlRadius` (3" tính từ mép marker), `controllingPlayer`.

---

### Module 4: Rules & Combat (`src/rules/`)

#### 1. `WoundChart.js`
* **Trách nhiệm**: Quyết định xúc xắc cần đạt khi so sánh Strength vs Toughness.
* **Hàm**: `getWoundTarget(strength, toughness)` $\rightarrow$ Trả về `2, 3, 4, 5, 6`.

#### 2. `CombatPipeline.js`
* **Trách nhiệm**: Trái tim của hệ thống chiến đấu. Thực hiện tuần tự 4 bước:
  1. `resolveHitPhase(attacks, skill, weaponKeywords)`
  2. `resolveWoundPhase(hits, strength, toughness, weaponKeywords)`
  3. `resolveSavePhase(wounds, targetSave, targetInvuln, ap, inCover)`
  4. `allocateDamagePhase(unmetSaves, damage, targetUnit)`

#### 3. `KeywordHandlers.js`
* **Trách nhiệm**: Chứa các hàm mở rộng cho từ khóa đặc biệt:
  * `applyLethalHits(hitRolls)`
  * `applySustainedHits(hitRolls, bonusFactor)`
  * `applyDevastatingWounds(woundRolls)`
  * `applyBlast(weaponAttacks, targetModelCount)`
  * `applyFeelNoPain(damagePoints, fnpThreshold)`

#### 4. `BattleShockRule.js`
* **Trách nhiệm**: Xử lý bài kiểm tra tinh thần khi đơn vị còn dưới 50% quân số:
  * `performTest(unit, diceEngine)`: Gieo 2D6 so với `unit.Ld`. Nếu thất bại gán `isBattleShocked = true`.

---

### Module 5: State & Turn Flow (`src/state/`)

#### 1. `TurnManager.js`
* **Trách nhiệm**: Quản lý vòng đời trận đấu.
* **Trạng thái**: `currentRound` (1 - 5), `activePlayer` (Player 1 hoặc Player 2), `isGameOver`.
* **Hàm chính**: `startBattle()`, `nextTurn()`, `endBattle()`.

#### 2. `PhaseStateMachine.js`
* **Trách nhiệm**: Máy trạng thái (FSM) quản lý 5 Phase:
  * Trạng thái: `COMMAND` $\rightarrow$ `MOVEMENT` $\rightarrow$ `SHOOTING` $\rightarrow$ `CHARGE` $\rightarrow$ `FIGHT`.
  * Ràng buộc: Ngăn chặn người chơi thực hiện hành động sai thời điểm (VD: cấm bắn khi đang ở Movement phase).
  * Bắn sự kiện `ON_PHASE_CHANGED` qua EventBus.

#### 3. `ActionQueue.js`
* **Trách nhiệm**: Lưu trữ lịch sử hành động để hỗ trợ **Undo/Redo** trong quá trình di chuyển và hiển thị **Combat Log**.

---

### Module 6: Stratagems & Reaction (`src/stratagems/`)

#### 1. `CPManager.js`
* **Trách nhiệm**: Theo dõi Command Points của từng người chơi.
* **Hàm**: `addCP(player, amount)`, `spendCP(player, amount)`, `getCP(player)`.

#### 2. `StratagemDeck.js`
* **Trách nhiệm**: Danh mục thẻ chiến thuật (Core Stratagems: *Command Re-roll, Fire Overwatch, Counter-Offensive, Tank Shock, Smokescreen...*).
* **Hàm**: `canActivate(stratagemId, context)`: Kiểm tra điều kiện xem thẻ có hợp lệ để bật sáng hay không.

#### 3. `ReactionTrigger.js`
* **Trách nhiệm**: Cửa sổ ngắt phản ứng.
* **Cơ chế**: Khi nhận sự kiện `ON_UNIT_MOVE_COMPLETED`, kiểm tra xem đối thủ có đơn vị nào thấy mục tiêu và có đủ 1 CP không $\rightarrow$ Tạm dừng game 5 giây và phát tín hiệu hỏi phản ứng *Fire Overwatch*.

---

### Module 7: Scoring & Objectives (`src/scoring/`)

#### 1. `ObjectiveScorer.js`
* **Trách nhiệm**: Đánh giá ai đang kiểm soát từng điểm mục tiêu.
* **Hàm**: `evaluateControl(objectiveMarkers, unitsList)`:
  * Lọc các model sống trong bán kính 3" của marker.
  * Cộng tổng OC của Player 1 và Player 2 (bỏ qua unit bị Battle-shock).
  * Cập nhật `controllingPlayer`.

#### 2. `VictoryPoints.js`
* **Trách nhiệm**: Theo dõi điểm số Primary và Secondary (tối đa 100 VP).
* **Hàm**: `awardPrimaryPoints(player, round)`, `recordSecondaryObjective(player, missionId, points)`.

---

### Module 8: UI & Renderer 2D (`src/ui/`)

#### 1. `CanvasRenderer.js`
* **Trách nhiệm**: Bộ điều phối chính (Master Canvas Renderer), quản lý thứ tự vẽ các lớp (Render Layers) theo chiều sâu Z-index:
  $$\text{Map Layer} \rightarrow \text{Deployment Lines} \rightarrow \text{Range Overlays} \rightarrow \text{Units Layer} \rightarrow \text{UI FX}$$

#### 2. `MapRenderer.js`
* **Trách nhiệm**: Chuyên trách vẽ toàn bộ yếu tố liên quan đến bản đồ:
  * `drawPlaymat()`: Vẽ nền đất sa bàn ($44" \times 60"$, màu bê tông hoang tàn hoặc đất đỏ viễn tưởng).
  * `drawDeploymentZones(zones)`: Vẽ vạch nét đứt phân định khu vực xuất quân của hai bên.
  * `drawTerrains(terrains)`: Vẽ các khối nhà Ruins (nền móng footprint che khuất mờ mờ + nét tường dày kiên cố cản đường).
  * `drawObjectives(objectives)`: Vẽ vòng tròn cờ mục tiêu (marker 40mm) và vòng hào quang kiểm soát $3"$.

#### 3. `RangeRingOverlay.js`
* **Trách nhiệm**: Vẽ các vòng hỗ trợ chiến thuật bán trong suốt:
  * Vòng xanh: Phạm vi di chuyển tối đa $M"$.
  * Vòng đỏ: Tầm bắn tối đa của súng được chọn.
  * Viền $1"$: Vùng Engagement Range.

#### 4. `InputController.js`
* **Trách nhiệm**: Lắng nghe tương tác chuột / phím:
  * `onMouseDown`, `onMouseMove`, `onMouseUp`: Kéo thả di chuyển mô hình.
  * `onClick`: Chọn đơn vị (Select), chọn mục tiêu bắn/charge.

#### 5. `CombatModalUI.js` & `DatasheetPanelUI.js`
* **Trách nhiệm**: Các cửa sổ giao diện HTML/DOM:
  * Popup hiển thị khay gieo xúc xắc sinh động (xúc xắc xanh trúng, đỏ trượt).
  * Bảng tra cứu chỉ số Datasheet chi tiết khi click vào đơn vị.

---

### Module 9: Data Layer & Map Layouts (`src/data/`)

#### 1. `src/data/maps/layout_standard.json`
* **Trách nhiệm**: File cấu hình bản đồ độc lập. Chứa thông số kích thước, vị trí xuất quân, các khối địa hình và điểm cờ:

```json
{
  "map_id": "map_strike_force_01",
  "name": "Ruins of Oghram",
  "dimensions": { "width_inches": 60, "height_inches": 44 },
  "deployment_zones": {
    "type": "DAWN_OF_WAR",
    "player_1": { "min_x": 0, "max_x": 60, "min_y": 0, "max_y": 12 },
    "player_2": { "min_x": 0, "max_x": 60, "min_y": 32, "max_y": 44 }
  },
  "objectives": [
    { "id": "obj_center", "x": 30, "y": 22 },
    { "id": "obj_top_left", "x": 12, "y": 10 },
    { "id": "obj_bottom_right", "x": 48, "y": 34 }
  ],
  "terrain_pieces": [
    {
      "id": "ruin_large_1",
      "type": "RUINS",
      "shape": "POLYGON",
      "vertices": [
        { "x": 18, "y": 14 }, { "x": 26, "y": 14 },
        { "x": 26, "y": 20 }, { "x": 18, "y": 20 }
      ],
      "walls": [
        { "from": { "x": 18, "y": 14 }, "to": { "x": 26, "y": 14 } },
        { "from": { "x": 18, "y": 14 }, "to": { "x": 18, "y": 20 } }
      ],
      "is_obscuring": true,
      "provides_cover": true
    }
  ]
}
```

#### 2. `factions/` & `core_stratagems.json`
* Lưu thông số Datasheet của lính, vũ khí và thẻ bài chiến thuật, độc lập hoàn toàn với engine.

---

### Module 10: Testing & Sandbox Framework (`src/testing/`)

Module này chịu trách nhiệm kiểm thử tự động, cô lập và xác thực tính đúng đắn của từng cơ chế trước khi ghép nối vào game hoàn chỉnh. Hỗ trợ 2 chế độ:
1. **Chế độ Headless CLI / Unit Test**: Chạy tự động không cần giao diện, kiểm tra các câu lệnh khẳng định (Assertions: Pass / Fail).
2. **Chế độ Visual Sandbox**: Cung cấp giao diện trực quan cho phép đặt thử 2 đơn vị trên bàn cờ để kích hoạt thủ công từng cơ chế.

#### 1. `TestManager.js` (Bộ điều phối kiểm thử)
* **Trách nhiệm**: Đăng ký và thực thi toàn bộ các bộ kiểm thử (Test Suites).
* **Hàm chính**:
  * `registerSuite(name, testSuite)`: Đăng ký một nhóm kiểm thử.
  * `runAll()`: Chạy toàn bộ test suites và in báo cáo tổng kết (Số test Passed, Failed, thời gian thực thi).
  * `runSuite(name)`: Chỉ chạy riêng một bộ kiểm thử cho một module chỉ định.

#### 2. `SpatialTester.js` (Thử nghiệm Không gian & Hình học)
* **Mục tiêu thử nghiệm**: Module `src/spatial/`.
* **Kịch bản kiểm tra**:
  * **Đo khoảng cách**: Xác nhận cự ly Base-to-base giữa 2 mô hình 32mm đặt cách nhau 100px có quy đổi đúng ra số inch mong muốn hay không.
  * **Va chạm đế**: Thử di chuyển model A đè lên model B $\rightarrow$ Xác nhận `checkCircleOverlap()` trả về `true` (ngăn cản hợp lệ).
  * **Tầm nhìn Obscuring**: Đặt 1 tòa Ruins ở giữa Shooter và Target $\rightarrow$ Bắn tia raycast và xác nhận `hasLineOfSight()` trả về `false`. Nếu Shooter bước chân vào trong Ruins $\rightarrow$ Xác nhận nhìn thấy được.
  * **Đứt gãy đội hình (Coherency)**: Đặt 1 model cách xa đồng đội $> 2"$ $\rightarrow$ Xác nhận `validateUnitCoherency()` phát hiện và gắn cờ cảnh báo chính xác model vi phạm.

#### 3. `CombatSimulator.js` (Thử nghiệm Sát thương & Mathhammer)
* **Mục tiêu thử nghiệm**: Module `src/rules/` (`CombatPipeline`, `WoundChart`, `KeywordHandlers`).
* **Kịch bản kiểm tra**:
  * **Bảng Wound S vs T**: Kiểm tra tự động toàn bộ ma trận $S \in [1..14]$ vs $T \in [1..14]$ xem có cho đúng kết quả `2+, 3+, 4+, 5+, 6+` hay không.
  * **Keyword Unit Tests**:
    * Mock xúc xắc Hit ra 6 có `Lethal Hits` $\rightarrow$ Xác nhận số lượt Wound roll bị bỏ qua 1 đòn.
    * Mock xúc xắc Wound ra 6 có `Devastating Wounds` $\rightarrow$ Xác nhận giáp Save bị bỏ qua hoàn toàn.
    * Đơn vị có `Feel No Pain 5+` nhận 3 Damage $\rightarrow$ Mock xúc xắc 5, 5, 2 $\rightarrow$ Xác nhận chỉ nhận 1 Damage thực tế.
  * **Mô phỏng Monte Carlo (Mathhammer)**:
    * Hàm `simulateMonteCarlo(attackerWeapon, targetUnit, iterations = 10000)`: Chạy 10.000 đợt bắn liên tiếp, tính toán **Sát thương kỳ vọng trung bình (Average Damage)** và độ lệch chuẩn, so sánh đối chiếu với công thức xác suất giải tích lý thuyết.

#### 4. `StateFlowTester.js` (Thử nghiệm Máy trạng thái Lượt)
* **Mục tiêu thử nghiệm**: Module `src/state/` (`PhaseStateMachine`, `TurnManager`).
* **Kịch bản kiểm tra**:
  * **Chuyển Phase tuần tự**: Xác nhận đúng thứ tự `Command -> Move -> Shoot -> Charge -> Fight` và lặp lại qua 5 Battle Rounds.
  * **Ràng buộc hành vi**:
    * Thử gọi lệnh tấn công khi đang ở `Movement Phase` $\rightarrow$ Xác nhận hệ thống ném ra lỗi hoặc từ chối hành động.
    * Cho một đơn vị Advance trong Movement $\rightarrow$ Xác nhận cờ `hasAdvanced = true` và đơn vị bị khóa quyền bắn vũ khí thường ở Shooting Phase.
  * **Battle-shock**: Giả lập đơn vị 10 lính bị chết 6 lính (còn 4 lính < 50%) $\rightarrow$ Xác nhận kích hoạt `performTest()`, nếu tạch thì `unit.statusFlags.isBattleShocked === true` và `unit.getTotalOC() === 0`.

#### 5. `ReactionTester.js` (Thử nghiệm Phản xạ & Ngắt)
* **Mục tiêu thử nghiệm**: Module `src/stratagems/` (`ReactionTrigger`, `CPManager`).
* **Kịch bản kiểm tra**:
  * **Fire Overwatch Trigger**: Giả lập Player 1 di chuyển 1 Unit vào tầm nhìn của Player 2. Xác nhận `ReactionTrigger` phát ra tín hiệu chờ phản xạ.
  * **Kiểm tra điều kiện kích hoạt**: Nếu Player 2 có $0\text{ CP}$ hoặc không có đơn vị nào nhìn thấy $\rightarrow$ Xác nhận cửa sổ Overwatch không được mở.
  * **Tiêu hao tài nguyên**: Khi xác nhận kích hoạt Overwatch $\rightarrow$ Kiểm tra Player 2 bị trừ đúng $1\text{ CP}$.

#### 6. `ScoringTester.js` (Thử nghiệm Tranh chấp & Điểm số)
* **Mục tiêu thử nghiệm**: Module `src/scoring/` (`ObjectiveScorer`, `VictoryPoints`).
* **Kịch bản kiểm tra**:
  * **Tranh chấp OC đa đơn vị**: Đặt Player 1 có 5 lính Intercessors (OC 2 $\times$ 5 = 10) và Player 2 có 10 lính Gaunts (OC 1 $\times$ 10 = 10) vào cùng vùng 3" của cờ $\rightarrow$ Xác nhận trạng thái là Tranh chấp bất phân thắng bại (Contested / Giữ nguyên chủ cũ).
  * Nếu 1 lính của Player 2 bị tiêu diệt $\rightarrow$ Xác nhận Player 1 chiếm quyền kiểm soát cờ ngay lập tức.
  * Nếu Player 1 bị Battle-shocked $\rightarrow$ Tổng OC của Player 1 tụt về 0 $\rightarrow$ Quyền kiểm soát thuộc về Player 2.

#### 7. `MapTester.js` (Thử nghiệm Bản đồ & Biên)
* **Mục tiêu thử nghiệm**: Module `src/entities/Battlefield.js` và `src/data/maps/`.
* **Kịch bản kiểm tra**:
  * **Tính toàn vẹn dữ liệu JSON**: Kiểm tra file JSON map có đủ kích thước $44" \times 60"$, đủ điểm Objective (thường là 4 hoặc 5 điểm), và các tọa độ polygon không bị tự cắt (self-intersecting).
  * **Kiểm tra ranh giới biên**: Thử đặt mô hình ở tọa độ $(-1, 10)$ hoặc $(61, 20)$ $\rightarrow$ Xác nhận `isWithinBounds()` trả về `false`.

---

## 4. Luồng Tương Tác Dữ Liệu & Event Bus (Data Flow)

Ví dụ về chuỗi sự kiện khi thực hiện một đòn bắn trong **Shooting Phase**:

```text
[Người chơi click Chọn Mục Tiêu]
               │
               ▼
   InputController.js
               │  phát tín hiệu
               ▼
   EventBus.emit("REQUEST_ATTACK", { attacker, target, weapon })
               │
               ├──► LineOfSight2D.hasLineOfSight() ---> Kiểm tra tầm nhìn & Cover
               │
               ├──► CombatPipeline.resolve() ---------> Chạy chuỗi Hit -> Wound -> Save -> Damage
               │
               ▼
   EventBus.emit("ATTACK_RESOLVED", combatResult)
               │
               ├──► Model.takeDamage() ---------------> Trừ máu, hủy model nếu W <= 0
               ├──► CombatModalUI.showDice() ---------> Hiển thị xúc xắc nảy trên màn hình
               └──► CanvasRenderer.draw() ------------> Vẽ lại bàn cờ cập nhật
```

---

## 5. Lộ Trình Triển Khai Từng Bước (Implementation Roadmap)

1. **Giai đoạn 1 - Nền tảng Toán & Dữ liệu (Core & Math)**:
   * Viết `Vector2D.js`, `DiceEngine.js`, `EventBus.js`.
   * Tạo cấu trúc dữ liệu JSON mẫu cho 2 đơn vị đối kháng (ví dụ: *Space Marine Intercessors* vs *Tyranid Termagants*).
2. **Giai đoạn 2 - Động cơ Giao tranh Headless (Combat Engine)**:
   * Viết `WoundChart.js`, `CombatPipeline.js`, `KeywordHandlers.js`.
   * Viết kịch bản test CLI: Cho 5 lính Space Marine bắn 10 lính Tyranids và in kết quả ra console.
3. **Giai đoạn 3 - Không gian 2D & Renderer Cơ bản (Spatial & Canvas)**:
   * Viết `Measurement.js`, `Collision2D.js`, `CanvasRenderer.js`.
   * Cho phép click chọn và kéo thả mô hình trên màn hình với thước đo inch hiển thị trực tiếp.
4. **Giai đoạn 4 - Quản lý Lượt & Luật chơi Đầy đủ (Turn & Rules)**:
   * Tích hợp `PhaseStateMachine.js`, `LineOfSight2D.js` (Obscuring Ruins).
   * Triển khai `ObjectiveScorer.js` và `BattleShockRule.js`.
5. **Giai đoạn 5 - Hoàn thiện Giao diện & Đánh bóng (UI & Polish)**:
   * Làm giao diện khay xúc xắc `CombatModalUI.js`, bảng chỉ số `DatasheetPanelUI.js`.
   * Thêm hệ thống Stratagem phản ứng (*Overwatch, Re-roll*).
