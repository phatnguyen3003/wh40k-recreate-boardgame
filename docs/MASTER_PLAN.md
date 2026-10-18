# Kế Hoạch Tổng Thể & Lộ Trình Triển Khai (Master Execution Plan)

Tài liệu này tổng hợp toàn bộ các quyết định kỹ thuật, lộ trình từng bước (Step-by-step Roadmap) và quy chuẩn triển khai cho dự án **Warhammer 40,000 2D Board Game Simulator**. 

Khi bắt tay vào code, bạn chỉ cần mở tài liệu này và làm theo các checklist tuần tự.

---

## 📑 1. Bản Đồ Tài Liệu Kỹ Thuật (Documentation Index)

Toàn bộ tri thức của dự án được phân bổ trong thư mục `docs/`:

| Tài liệu | Vai trò | Khi nào cần tra cứu? |
| :--- | :--- | :--- |
| **[docs/CORE_MECHANICS.md](./CORE_MECHANICS.md)** | **Bách khoa toàn thư luật chơi**: Đặc tả chỉ số profile, chuỗi sát thương 4 bước, bảng tra $S$ vs $T$, toàn bộ từ khóa (Keywords) và Stratagems của WH40K 10th Edition. | Khi code các module luật (`src/rules/`), tính toán xúc xắc, xử lý từ khóa vũ khí. |
| **[docs/ARCHITECTURE_2D.md](./ARCHITECTURE_2D.md)** | **Bản vẽ thiết kế hệ thống**: Đặc tả cấu trúc thư mục, trách nhiệm từng file trong 10 module, luồng EventBus, và chi tiết Map, Testing. | Khi tạo file mới, phân chia trách nhiệm class, viết interface và kết nối các module. |
| **[docs/MASTER_PLAN.md](./MASTER_PLAN.md)** *(File này)* | **Kế hoạch hành động & Checklist**: Lộ trình 6 giai đoạn từ khởi tạo dự án, code tuần tự, test đến host multiplayer qua Cloudflare Tunnel. | Kim chỉ nam chỉ đạo tiến độ từng ngày, kiểm tra việc hoàn thành từng tính năng. |

---

## 🛠 2. Quyết Định Công Nghệ & Kiến Trúc Đã Thống Nhất

* **Ngôn ngữ**: **TypeScript** (Áp dụng lập trình Hướng Đối Tượng - **OOP** với `class`, `interface`, đóng gói dữ liệu và đa hình).
* **Môi trường & Build Tool**: **Vite** (nhanh, nhẹ, hỗ trợ TypeScript và HMR tức thì).
* **Đồ họa Sa bàn**: **HTML5 Canvas 2D Context** (vẽ theo tọa độ thực, $1" = 20\text{ pixels}$).
* **Giao diện & HUD**: **HTML5 / Vanilla CSS** nổi đè lên Canvas (Glassmorphism, thanh hiển thị Phase, khay xúc xắc, bảng chỉ số Datasheet).
* **Kiểm thử tự động**: **Vitest** (Chạy toàn bộ module kiểm thử `src/testing/` không cần mở trình duyệt).
* **Mạng Đa người chơi (Multiplayer)**:
  * Mô hình: **Authoritative Host** trên máy cá nhân (`Node.js` + `WebSocket` / `socket.io`).
  * Hạ tầng ra Internet: **Cloudflare Tunnel (`cloudflared`)** trỏ vào `localhost` $\rightarrow$ Bạn bè mở link trình duyệt vào chơi ngay lập tức, không cần mở port modem, không cần cài mạng ảo.
* **Môi trường Cô Lập (`venv`)**:
  * Mọi công cụ môi trường hoặc thư viện phụ trợ (scripts, python helpers, test tools) bắt buộc phải cài đặt trong môi trường ảo **`venv`** (ví dụ thư mục `.venv/`), tuyệt đối không cài đặt global trên máy.
* **Quy chuẩn Biến số & Hằng số**:
  * Tất cả biến cấu hình, hằng số luật, tham số đồ họa của từng module **phải được khai báo tập trung, rõ ràng ngay ở đầu module (Top of File)** và dùng chung trong module đó để tiện chỉnh sửa, tránh hardcode rải rác.

---

## 🚀 3. Lộ Trình Triển Khai Chi Tiết (6 Giai Đoạn)

```
Phase 0: Setup Dự án & Tooling
   │
   ▼
Phase 1: Nền tảng Toán, EventBus & Dữ liệu OOP
   │
   ▼
Phase 2: Động cơ Giao tranh & Sát thương Headless (Testable)
   │
   ▼
Phase 3: Không gian 2D, Raycasting Tầm nhìn & Canvas Renderer
   │
   ▼
Phase 4: Quản lý Lượt (FSM 5 Phase), Điểm số & Chiến thuật
   │
   ▼
Phase 5: Giao diện HUD, Khay Xúc xắc & Đánh bóng UI
   │
   ▼
Phase 6: Tích hợp WebSocket Host & Cloudflare Tunnel
```

---

### GIAI ĐOẠN 0: Khởi Tạo Dự Án & Hạ Tầng Cơ Sở (Project Setup)
- [x] Khởi tạo môi trường ảo độc lập: `python -m venv .venv`.
- [x] Khởi tạo dự án Vite với TypeScript và cấu hình package.json.
- [x] Cài đặt công cụ kiểm thử tự động `vitest` và kiểu dữ liệu `@types/node`.
- [x] Cấu hình `tsconfig.json` và `vite.config.ts` hỗ trợ path alias `@/` và strict type checking.
- [x] Tạo khung cấu trúc thư mục rỗng chuẩn theo [ARCHITECTURE_2D.md](./ARCHITECTURE_2D.md):
  `src/core`, `src/spatial`, `src/entities`, `src/rules`, `src/state`, `src/stratagems`, `src/scoring`, `src/ui`, `src/data/maps`, `src/data/factions`, `src/testing`.
- [x] Viết smoke test kiểm tra xác nhận Vitest hoạt động hoàn hảo (`npm test` passed 2/2).

---

### GIAI ĐOẠN 1: Core Math, EventBus & Tầng Dữ Liệu OOP (Entities & Data)
- [x] **`src/core/Vector2D.ts`**: Lớp xử lý tọa độ 2D, khoảng cách Euclid, phép cộng trừ vector, góc xoay.
- [x] **`src/core/DiceEngine.ts`**: Xử lý gieo D6, 2D6, batch rolls và logic re-roll (re-roll 1s, re-roll all).
- [x] **`src/core/EventBus.ts`**: Kênh truyền thông Pub/Sub độc lập kết nối các module.
- [x] **Tạo dữ liệu tĩnh ban đầu (`src/data/`)**:
  - [x] `factions/space_marines.json`: Chỉ số Intercessors, Captain.
  - [x] `factions/tyranids.json`: Chỉ số Termagants, Tyranid Warrior.
  - [x] `maps/layout_standard.json`: Kích thước $44" \times 60"$, 5 điểm cờ, tọa độ các khối nhà Ruins.
- [x] **Xây dựng các Class thực thể OOP (`src/entities/`)**:
  - [x] `Model.ts`: Đóng gói `currentWounds`, tọa độ `position`, bán kính đế `baseRadius`.
  - [x] `Unit.ts`: Quản lý danh sách `Model[]`, tính tổng OC, kiểm tra `isBelowHalfStrength()`.
  - [x] `Weapon.ts`: Chỉ số vũ khí, phân loại Ranged/Melee, danh sách Keywords.
  - [x] `TerrainPiece.ts`: Ranh giới phế tích (Polygon bounds), tường cản, cờ Obscuring và Cover.
  - [x] `ObjectiveMarker.ts`: Tọa độ cờ, bán kính 40mm, vùng kiểm soát $3"$.
  - [x] `Battlefield.ts`: Quản lý mặt bàn cờ, kiểm tra biên bàn cờ `isWithinBounds()`.

---

### GIAI ĐOẠN 2: Động Cơ Giao Tranh & Kiểm Thử Headless (Rules & Combat)
*Mục tiêu: Đảm bảo toàn bộ luật tính toán sát thương chính xác 100% trước khi đụng vào đồ họa.*
- [x] **`src/rules/WoundChart.ts`**: Hàm so sánh $S$ vs $T$ trả về ngưỡng xúc xắc mục tiêu (`2+, 3+, 4+, 5+, 6+`).
- [x] **`src/rules/KeywordHandlers.ts`**: Plugin xử lý từ khóa đặc biệt (`Lethal Hits`, `Devastating Wounds`, `Sustained Hits`, `Blast`, `Feel No Pain`).
- [x] **`src/rules/CombatPipeline.ts`**: Chuỗi 4 bước tuần tự: Hit $\rightarrow$ Wound $\rightarrow$ Save (chọn Save trừ AP hoặc Invuln) $\rightarrow$ Allocate Damage.
- [x] **`src/rules/BattleShockRule.ts`**: Kiểm tra Ld trên 2D6 khi đơn vị dưới 50% quân số.
- [x] **`src/testing/CombatSimulator.ts`**:
  - [x] Viết Unit Test bằng Vitest: Kiểm tra ma trận $S$ vs $T$.
  - [x] Viết kiểm tra tự động cho từng Keyword.
  - [x] Chạy mô phỏng Monte Carlo 10.000 lượt bắn so khớp với giá trị kỳ vọng lý thuyết.

---

### GIAI ĐOẠN 3: Không Gian 2D & Canvas Renderer (Spatial & Graphics)
- [x] **`src/spatial/Measurement.ts`**: Quy đổi tỉ lệ $1" = 20\text{ px}$, tính khoảng cách Base-to-base giữa 2 hình tròn.
- [x] **`src/spatial/Collision2D.ts`**: Chống đè đế mô hình, chống đi xuyên tường kín.
- [x] **`src/spatial/LineOfSight2D.ts`**: Raycasting 2D kiểm tra cản tầm nhìn qua khối đa giác Ruins (Obscuring check).
- [x] **`src/spatial/CoherencyValidator.ts`**: Thuật toán đồ thị đảm bảo mỗi lính cách đồng đội $\le 2"$.
- [x] **`src/ui/MapRenderer.ts`**: Vẽ mặt sa bàn, vạch xuất quân, khối phế tích và điểm cờ lên Canvas.
- [x] **`src/ui/CanvasRenderer.ts`**: Vẽ mô hình lính (đế tròn màu phe, thanh máu nhỏ).
- [x] **`src/ui/RangeRingOverlay.ts`**: Vẽ vòng tròn bán kính di chuyển $M"$, tầm bắn và viền $1"$.
- [x] **`src/ui/InputController.ts`**: Bắt sự kiện chuột: Click chọn đơn vị, kéo thả di chuyển mô hình.
- [x] **`src/testing/SpatialTester.ts`**: Test đo cự ly, test tia raycast bị nhà che khuất, test cảnh báo đứt đội hình.

---

### GIAI ĐOẠN 4: Quản Lý Lượt, Điểm Số & Chiến Thuật (State, FSM & Stratagems)
- [ ] **`src/state/PhaseStateMachine.ts`**: Máy trạng thái 5 Phase (`COMMAND` $\rightarrow$ `MOVEMENT` $\rightarrow$ `SHOOTING` $\rightarrow$ `CHARGE` $\rightarrow$ `FIGHT`).
- [ ] **`src/state/TurnManager.ts`**: Quản lý 5 Battle Rounds, chuyển lượt 2 người chơi, reset cờ hành động.
- [ ] **`src/scoring/ObjectiveScorer.ts`**: Quét bán kính $3"$ của cờ, so sánh tổng $OC$ của hai bên để xác định người giữ cờ.
- [ ] **`src/scoring/VictoryPoints.ts`**: Cộng điểm Primary (tối đa 50) và Secondary (tối đa 40).
- [ ] **`src/stratagems/CPManager.ts`**: Cộng 1 CP mỗi đầu lượt, trừ CP khi kích hoạt thẻ bài.
- [ ] **`src/stratagems/StratagemDeck.ts`**: Danh sách chiến thuật (*Command Re-roll, Fire Overwatch, Counter-offensive*).
- [ ] **`src/stratagems/ReactionTrigger.ts`**: Cửa sổ ngắt phản ứng (hỏi đối thủ có bắn Overwatch khi lính vừa đi không).
- [ ] **`src/testing/StateFlowTester.ts` & `ScoringTester.ts`**: Kiểm thử máy trạng thái và tranh chấp cờ.

---

### GIAI ĐOẠN 5: Giao Diện Người Dùng & Trải Nghiệm (UI & Polish)
- [ ] **Header HUD**: Hiển thị Vòng đấu (Round 1–5), Phase hiện tại, nút *Next Phase*, bộ đếm CP và điểm số VP của hai bên.
- [ ] **`src/ui/DatasheetPanelUI.ts`**: Popup hiển thị chi tiết chỉ số $M, T, Sv, W, Ld, OC$ và danh sách súng khi click vào đơn vị.
- [ ] **`src/ui/CombatModalUI.ts`**: Hộp thoại hiển thị khay xúc xắc nảy trực quan, làm sáng các viên trúng/trượt và nút bấm dùng 1 CP để *Command Re-roll*.
- [ ] **Combat Log Panel**: Cửa sổ bên góc hiển thị nhật ký hành động chi tiết của trận đấu.

---

### GIAI ĐOẠN 6: Đa Người Chơi (Multiplayer Host & Cloudflare Tunnel)
- [ ] **Tạo WebSocket Server (Node.js)**:
  - Máy Host vừa chạy game vừa lắng nghe kết nối WebSocket (cùng port hoặc port riêng).
  - Định nghĩa giao thức gói tin đồng bộ hành động:
    * `SYNC_STATE`: Gửi toàn bộ trạng thái bàn cờ khi người chơi mới tham gia.
    * `MOVE_MODEL`: Đồng bộ vị trí mô hình di chuyển.
    * `RESOLVE_ATTACK`: Đồng bộ kết quả giao tranh và lượng máu bị trừ.
    * `NEXT_PHASE`: Đồng bộ chuyển lượt.
- [ ] **Kịch bản Khởi chạy & Host qua Cloudflare Tunnel**:
  1. Chạy server game: `npm run dev` (lắng nghe tại `http://localhost:3000`).
  2. Mở đường hầm ra Internet: `cloudflared tunnel --url http://localhost:3000`.
  3. Lấy link công khai (dạng `https://xyz.trycloudflare.com`) gửi cho bạn bè để cùng chơi.

---

## 📌 4. Quy Chuẩn Code (Coding Standards)

1. **Quy ước Tọa độ & Đo đạc**:
   * Hằng số tỉ lệ: `PIXELS_PER_INCH = 20`.
   * Luôn đo khoảng cách giữa hai mô hình theo nguyên tắc **Base-to-base** (mép đế gần nhất), không lấy khoảng cách từ tâm:
     ```typescript
     const distanceBaseToBase = Math.max(0, centerDistance - (radiusA + radiusB));
     ```
2. **Nguyên tắc Đóng gói OOP**:
   * Không can thiệp trực tiếp vào mảng con hoặc thuộc tính nhạy cảm:
     * Dùng `model.takeDamage(amount)` thay vì `model.wounds -= amount`.
     * Dùng `unit.getAliveModels()` thay vì duyệt trực tiếp `unit.models`.
3. **EventBus Naming**:
   * Định danh sự kiện viết hoa dạng SNAKE_CASE có tiền tố rõ ràng:
     `"UNIT:SELECTED"`, `"UNIT:MOVED"`, `"COMBAT:HIT_ROLLED"`, `"PHASE:CHANGED"`.
4. **Môi trường & Thư viện Cô lập trong `venv`**:
   * Khi cần cài đặt môi trường, công cụ phụ trợ, script test hay backend server hỗ trợ, **bắt buộc phải cài đặt trong môi trường ảo `venv`** (ví dụ thư mục `.venv/` trong dự án).
   * Lệnh khởi tạo: `python -m venv .venv` và kích hoạt môi trường ảo trước khi chạy:
     * Windows PowerShell: `.venv\Scripts\Activate.ps1`
     * CMD: `.venv\Scripts\activate.bat`
   * **Tuyệt đối không cài đặt thư viện ra môi trường global** của hệ điều hành để tránh xung đột phiên bản.
5. **Khai báo Toàn bộ Biến / Hằng số Cấu hình ở Đầu Module (Top-of-Module Configuration)**:
   * **Quy tắc bắt buộc**: Mọi file module (`.ts` / `.js`) phải gom toàn bộ các biến cấu hình, tham số tính toán, hằng số luật chơi (`CONFIG` / `CONSTANTS`) **lên ngay phần đầu file (File Header)** và dùng chung trong toàn bộ module đó.
   * **Cấm**: Tuyệt đối không hardcode "Magic numbers" (ví dụ: tự ý gõ `20`, `1.0`, `3.0`, `10000`) rải rác bên trong các hàm hoặc class.
   * **Mục đích**: Khi cần tinh chỉnh luật chơi, đổi màu sắc giao diện, hoặc thay đổi tỉ lệ hiển thị sa bàn, bạn chỉ cần mở đầu file và sửa một chỗ duy nhất mà không phải lùng sục khắp source code.
   * **Mẫu cấu trúc chuẩn ở đầu mỗi file**:
     ```typescript
     // =========================================================================
     // ⚙️ MODULE CONFIGURATION & CONSTANTS (Khai báo tập trung ở đầu module)
     // =========================================================================
     export const SPATIAL_CONFIG = {
       PIXELS_PER_INCH: 20,                // Tỉ lệ quy đổi 1 inch = 20 pixels
       ENGAGEMENT_RANGE_INCHES: 1.0,       // Vùng áp sát cận chiến (1 inch)
       COHERENCY_MAX_DISTANCE_INCHES: 2.0, // Cự ly tối đa giữa các lính (2 inches)
       COHERENCY_MIN_NEIGHBORS: 1,         // Số đồng đội tối thiểu đứng gần (unit < 7 lính)
       COHERENCY_MIN_NEIGHBORS_LARGE: 2,   // Số đồng đội tối thiểu đứng gần (unit >= 7 lính)
       OBJECTIVE_RADIUS_INCHES: 3.0,       // Bán kính kiểm soát điểm cờ (3 inches)
       DEFAULT_MODEL_COLOR: '#2980b9',     // Màu hiển thị mặc định của lính
       SELECTION_BORDER_COLOR: '#e74c3c',  // Màu viền khi click chọn
     } as const;

     // =========================================================================
     // 📦 MODULE IMPLEMENTATION (Triển khai code logic bên dưới)
     // =========================================================================
     export class Measurement {
       // Sử dụng SPATIAL_CONFIG.PIXELS_PER_INCH thay vì hardcode số 20
     }
     ```
6. **Bình Luận Code Cho Dễ Debug (Inline Comments for Debugging)**:
   * **Quy tắc bắt buộc**: Mọi đoạn code thực hiện logic phức tạp, tính toán luật chơi, hoặc quy trình nhiều bước **phải có chú thích (comment) inline** giải thích từng bước để dễ dàng theo dõi và gỡ lỗi.
   * **Các trường hợp bắt buộc comment**:
     * Các phép tính toán luật chơi (Wound chart, Save modifier, Damage allocation).
     * Các nhánh điều kiện phức tạp (`if/else` nhiều lớp, `switch` case).
     * Các bước trong chuỗi pipeline (ví dụ: Hit → Wound → Save → Damage).
     * Các thuật toán không rõ ràng bằng tên hàm (raycasting, coherency graph).
   * **Quy tắc viết comment**:
     * Viết comment **ngắn gọn, đúng trọng tâm**, mô tả *tại sao* (why) và *làm gì* (what), không cần lặp lại *cách* (how) đã thể hiện qua code.
     * Đặt comment **trước** dòng/khối code cần giải thích, hoặc **cuối dòng** nếu là chú thích ngắn.
     * Dùng comment để đánh dấu các điểm cần kiểm tra khi debug (ví dụ: `// DEBUG: xác nhận wounds không bị âm`).
   * **Cấm**: Không comment bừa bãi mọi dòng code đơn giản (ví dụ: `// cộng 1`), chỉ comment khi thực sự cần giải thích logic hoặc mục đích.
   * **Mẫu comment chuẩn**:
     ```typescript
     // BƯỚC 2: Wound Roll — so sánh Strength của vũ khí với Toughness của mục tiêu
     // Quy tắc: S >= 2T → 2+, S > T → 3+, S = T → 4+, S < T → 5+, S <= T/2 → 6+
     let woundTarget: number;
     if (strength >= 2 * toughness) {
       woundTarget = 2;
     } else if (strength > toughness) {
       woundTarget = 3;
     } else if (strength === toughness) {
       woundTarget = 4;
     } else if (strength > toughness / 2) {
       woundTarget = 5;
     } else {
       woundTarget = 6;
     }
     ```
7. **Quy Chuẩn Viết Test (Test Authoring Standards)**:
   * Mọi file test nằm trong `src/testing/`, đặt tên `<module>.test.ts`, dùng chung framework **Vitest** (`describe` / `it` / `it.each` / `expect`).
   * **Cấu trúc file bắt buộc theo thứ tự**:
     1. Khối header `// ⚙️ TEST CONFIGURATION & FIXTURES` — tóm tắt **luật chơi đang kiểm chứng** bằng comment, khai báo hằng số test (`*_TEST_CONFIG`) và các hàm fixture (`makeWeapon`, `makeTarget`, `makeShockUnit`, `buildTestUnit`...).
     2. Bảng dữ liệu test (data-driven) có type rõ ràng.
     3. Khối `// 📦 MODULE IMPLEMENTATION (TEST SUITES)` — các `describe` / `it`.
   * **Ưu tiên data-driven bằng `it.each`**: mọi nhóm ca test cùng dạng phải gom vào một bảng. Mỗi phần tử bảng là một object có tối thiểu 2 trường:
     * `name` — chuỗi ngắn mô tả ca test (dùng làm tên qua `it.each(cases)('$name', ...)`).
     * `note` — giải thích **luật/quy tắc và lý do kỳ vọng** (ví dụ: `'S4 vs T4 → 4+; 2×(4/6)×(3/6)×(3/6) = 1/3'`).
     * Truyền `note` làm tham số thứ hai của `expect(actual, note).toBe(...)` để khi test đỏ, log in ra luôn cả căn cứ luật.
   * **Bắt buộc bao phủ ca biên (edge cases)** cho mỗi hàm: giá trị 0 / rỗng, đúng ngưỡng (`>=` vs `>`), kém/vượt ngưỡng 1 đơn vị, ngưỡng không nguyên (ví dụ nửa quân số của unit lẻ), danh sách rỗng, và các nhánh `if` ít gặp.
   * **Comment giải thích trong test** theo đúng tinh thần quy chuẩn #6: nêu rõ công thức, hằng số luật chơi, và giá trị kỳ vọng. Không viết comment vô nghĩa.
   * **Nguồn xúc xắc phải tất định**:
     * Test chuỗi logic (pipeline Hit→Wound→Save→Damage, Battle-shock): dùng `createDeterministicRng([...])` — chuỗi mặt xúc xắc nạp sẵn, quấn vòng.
     * Test thống kê (Monte Carlo, Feel No Pain): dùng PRNG tất định `mulberry32(seed)` để kết quả lặp lại được giữa các lần chạy.
   * **Test thống kê phải nới dung sai hợp lý**: dùng `toBeCloseTo(value, -2 / -3)` kèm comment ước lượng độ lệch chuẩn (ví dụ `// ±500 ≈ 7σ`); **tuyệt đối không** so khớp chính xác tuyệt đối giá trị ngẫu nhiên.
   * **Đối chiếu chéo (cross-reference) & property-based**: với hàm luật chơi (Wound chart, xác suất), viết thêm một hàm tham chiếu độc lập (diễn đạt khác) để đối chiếu, đồng thời kiểm tra bất biến (monotonicity, tập giá trị hợp lệ `∈ {2,3,4,5,6}`, đối xứng...).
   * **Đồng bộ với API nguồn**: đọc kỹ implementation trước khi viết test để khớp đúng hành vi thật (ví dụ: `applyFeelNoPain` coi threshold `0` là "không có FNP"; điều kiện dưới 50% quân số là `alive < initial * 0.5`).
   * **Bắt buộc xác minh trước khi kết thúc**: chạy lần lượt `npx tsc --noEmit` → `npm test` → `npm run build`; cả ba phải sạch mới coi là hoàn thành.
   * **Mẫu bảng test chuẩn**:
     ```typescript
     interface WoundCase {
       name: string;   // tên ca test hiển thị
       note: string;   // giải thích luật & lý do kỳ vọng
       strength: number;
       toughness: number;
       expected: number;
     }

     const cases: WoundCase[] = [
       // S >= 2T → 2+ (strength áp đảo toughness)
       { name: 'S8 vs T4 (S >= 2T) → 2+', note: '8 >= 2×4', strength: 8, toughness: 4, expected: 2 },
       // Biên: đúng ngưỡng S = 2T
       { name: 'Biên S6 vs T3 (S = 2T) → 2+', note: 'dấu bằng vẫn tính 2+', strength: 6, toughness: 3, expected: 2 },
       // S = T → 4+
       { name: 'S4 vs T4 (S = T) → 4+', note: 'strength bằng toughness', strength: 4, toughness: 4, expected: 4 },
     ];

     describe('WoundChart.getWoundTarget — bảng ca dữ liệu', () => {
       it.each(cases)('$name', (c) => {
         expect(WoundChart.getWoundTarget(c.strength, c.toughness), c.note).toBe(c.expected);
       });
     });
     ```

---

## 🏁 5. Kết Luận & Bước Bắt Đầu Tiếp Theo

Tất cả nền tảng thiết kế, luật chơi và kiến trúc đã hoàn thiện đầy đủ trên giấy tờ. Khi bạn sẵn sàng bắt đầu code:
1. Mở file này và thực hiện **[GIAI ĐOẠN 0: Khởi Tạo Dự Án](#giai-đoạn-0-khởi-tạo-dự-án--hạ-tầng-cơ-sở-project-setup)**.
2. Tra cứu chi tiết class trong [docs/ARCHITECTURE_2D.md](./ARCHITECTURE_2D.md).
3. Tra cứu công thức luật trong [docs/CORE_MECHANICS.md](./CORE_MECHANICS.md).
