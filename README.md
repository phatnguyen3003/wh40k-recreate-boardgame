# Warhammer 40,000 2D Board Game Simulator

Dự án phát triển và mô phỏng bàn cờ chiến thuật **Warhammer 40,000 (10th Edition)** dưới dạng 2D Canvas Web App (TypeScript + Vite + OOP), hỗ trợ chơi mạng đa người chơi host từ localhost thông qua Cloudflare Tunnel (`cloudflared`).

---

## 📚 Bộ Tài Liệu Kỹ Thuật (Trong thư mục `docs/`)

Khi phát triển dự án, toàn bộ thông tin đã được đóng gói sẵn trong 4 tài liệu chính:

1. 🚀 **[docs/MASTER_PLAN.md](./docs/MASTER_PLAN.md)** *(Kế hoạch hành động & Lộ trình thực thi)*:
   * Tổng quan quyết định kiến trúc & Tech Stack đã chọn.
   * Checklist 6 giai đoạn từ setup dự án, code tuần tự, test đến host multiplayer qua Cloudflare Tunnel.
   * Quy chuẩn code TypeScript OOP, môi trường venv và khai báo biến đầu module.

2. 🏗️ **[docs/ARCHITECTURE_2D.md](./docs/ARCHITECTURE_2D.md)** *(Bản vẽ thiết kế hệ thống)*:
   * Đặc tả chi tiết 10 module độc lập (`core`, `spatial`, `entities`, `rules`, `state`, `stratagems`, `scoring`, `ui`, `data`, `testing`).
   * Phân tách trách nhiệm từng class/file, sơ đồ luồng dữ liệu EventBus, và chi tiết Map, Testing.

3. 📖 **[docs/CORE_MECHANICS.md](./docs/CORE_MECHANICS.md)** *(Bách khoa toàn thư luật chơi)*:
   * Đặc tả chỉ số Datasheet ($M, T, Sv, W, Ld, OC$), vòng lặp 5 Phase.
   * Quy trình tính toán sát thương 4 bước chuẩn mực, bảng so khớp $S$ vs $T$, toàn bộ từ khóa đặc biệt (Keywords) và Stratagems của 40K 10th Edition.

4. 📝 **[docs/DEVELOPMENT_LOG.md](./docs/DEVELOPMENT_LOG.md)** *(Nhật ký phát triển thời gian thực)*:
   * Ghi nhận chi tiết từng bước thực hiện, các file thay đổi và kết quả kiểm thử sau mỗi giai đoạn.
