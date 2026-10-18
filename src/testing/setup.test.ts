import { describe, it, expect } from 'vitest';
import { DiceEngine } from '../core/DiceEngine';
import { EventBus } from '../core/EventBus';

// =========================================================================
// ⚙️ TEST CONFIGURATION & CONSTANTS
// =========================================================================
// Bộ hằng số mô tả môi trường kiểm thử (Phase 0). Giữ nguyên tên khóa cũ để
// không phá vỡ API test đã có, đồng thời bổ sung hằng số hình học sa bàn.
export const SETUP_TEST_CONFIG = {
  EXPECTED_TEST_NAME: 'Setup Verification',
  SYSTEM_STATUS: 'ONLINE',
  PIXELS_PER_INCH: 20,       // Quy đổi chuẩn của toàn dự án: 1" = 20px
  BOARD_WIDTH_INCHES: 60,    // Sa bàn tiêu chuẩn rộng 60"
  BOARD_HEIGHT_INCHES: 44,   // Sa bàn tiêu chuẩn cao 44"
  D6_MIN: 1,
  D6_MAX: 6,
} as const;

// =========================================================================
// 📦 PHASE 0: ENVIRONMENT & TOOLING SETUP
// =========================================================================
describe('Phase 0: Environment & Tooling Setup', () => {
  // -----------------------------------------------------------------------
  // 1) Kiểm tra Tooling (Vitest) đã chạy được
  // -----------------------------------------------------------------------
  it('xác nhận Vitest đang hoạt động', () => {
    expect(SETUP_TEST_CONFIG.SYSTEM_STATUS).toBe('ONLINE');
    expect(SETUP_TEST_CONFIG.EXPECTED_TEST_NAME).toBe('Setup Verification');
  });

  // -----------------------------------------------------------------------
  // 2) Bảng quy đổi inch → pixel (nền tảng của mọi phép đo trên sa bàn)
  //    Quy tắc: pixel = inch * PIXELS_PER_INCH (mặc định 20)
  // -----------------------------------------------------------------------
  const inchToPixelCases: Array<{ inches: number; pixels: number; note: string }> = [
    { inches: 0, pixels: 0, note: 'mốc 0' },
    { inches: 0.5, pixels: 10, note: 'nửa inch (bán kính đế 25mm)' },
    { inches: 1, pixels: 20, note: '1 inch chuẩn' },
    { inches: 2, pixels: 40, note: 'cự ly coherency 2"' },
    { inches: 3.5, pixels: 70, note: 'số thập phân' },
    { inches: 6, pixels: 120, note: 'Movement điển hình' },
    { inches: SETUP_TEST_CONFIG.BOARD_WIDTH_INCHES, pixels: 1200, note: 'chiều rộng sa bàn' },
    { inches: SETUP_TEST_CONFIG.BOARD_HEIGHT_INCHES, pixels: 880, note: 'chiều cao sa bàn' },
  ];

  it.each(inchToPixelCases)('inch→px: $inches" = $pixels px ($note)', ({ inches, pixels }) => {
    expect(inches * SETUP_TEST_CONFIG.PIXELS_PER_INCH).toBe(pixels);
  });

  it('mọi kích thước sa bàn quy đổi đều là số nguyên pixel', () => {
    const widthPx = SETUP_TEST_CONFIG.BOARD_WIDTH_INCHES * SETUP_TEST_CONFIG.PIXELS_PER_INCH;
    const heightPx = SETUP_TEST_CONFIG.BOARD_HEIGHT_INCHES * SETUP_TEST_CONFIG.PIXELS_PER_INCH;
    expect(Number.isInteger(widthPx)).toBe(true);
    expect(Number.isInteger(heightPx)).toBe(true);
    expect(widthPx).toBeGreaterThan(heightPx); // bàn chữ nhật nằm ngang
  });

  // -----------------------------------------------------------------------
  // 3) Bất biến của xúc xắc D6: luôn nằm trong [1..6]
  //    Đây là nền tảng cho toàn bộ chuỗi Hit/Wound/Save phía sau.
  // -----------------------------------------------------------------------
  it('DiceEngine.rollD6 luôn trả giá trị trong [1..6]', () => {
    const engine = new DiceEngine();
    for (let i = 0; i < 2000; i++) {
      const roll = engine.rollD6();
      expect(roll).toBeGreaterThanOrEqual(SETUP_TEST_CONFIG.D6_MIN);
      expect(roll).toBeLessThanOrEqual(SETUP_TEST_CONFIG.D6_MAX);
    }
  });

  it('DiceEngine.rollD6 phủ đủ 6 mặt sau nhiều lần gieo', () => {
    const engine = new DiceEngine();
    const seen = new Set<number>();
    for (let i = 0; i < 6000; i++) {
      seen.add(engine.rollD6());
    }
    // Với 6000 lần gieo, xác suất thiếu 1 mặt gần như bằng 0
    expect(seen.size).toBe(6);
  });

  it('DiceEngine.rollBatch trả đúng số lượng xúc xắc yêu cầu', () => {
    const engine = new DiceEngine();
    expect(engine.rollBatch(0)).toHaveLength(0);
    expect(engine.rollBatch(5)).toHaveLength(5);
    expect(engine.rollBatch(12)).toHaveLength(12);
    // Mọi phần tử của batch đều hợp lệ
    for (const roll of engine.rollBatch(50)) {
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    }
  });

  // -----------------------------------------------------------------------
  // 4) Smoke test EventBus (hạ tầng giao tiếp pub/sub giữa các module)
  // -----------------------------------------------------------------------
  it('EventBus on/emit/off hoạt động đúng cơ chế pub-sub', () => {
    const bus = new EventBus();
    const received: number[] = [];
    const handler = (payload: unknown) => received.push(payload as number);

    const unsubscribe = bus.on<number>('TEST:EVENT', handler);

    bus.emit('TEST:EVENT', 1);
    bus.emit('TEST:EVENT', 2);
    expect(received).toEqual([1, 2]);
    expect(bus.listenerCount('TEST:EVENT')).toBe(1);

    // Hủy đăng ký → không nhận thêm sự kiện
    unsubscribe();
    bus.emit('TEST:EVENT', 3);
    expect(received).toEqual([1, 2]);
    expect(bus.listenerCount('TEST:EVENT')).toBe(0);
  });

  it('EventBus.once chỉ kích hoạt đúng 1 lần rồi tự hủy', () => {
    const bus = new EventBus();
    let calls = 0;
    bus.once('TEST:ONCE', () => {
      calls++;
    });
    bus.emit('TEST:ONCE');
    bus.emit('TEST:ONCE');
    expect(calls).toBe(1);
    expect(bus.listenerCount('TEST:ONCE')).toBe(0);
  });
});
