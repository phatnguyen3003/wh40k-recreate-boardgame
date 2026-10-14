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
