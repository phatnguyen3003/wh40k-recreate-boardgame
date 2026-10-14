# Warhammer 40,000 (10th Edition) - Tài Liệu Cơ Chế Cốt Lõi (Core Mechanics)

Tài liệu này hệ thống hóa toàn bộ các cơ chế cốt lõi của trò chơi chiến thuật sa bàn **Warhammer 40,000 (WH40K)**, phục vụ cho việc tra cứu luật chơi hoặc làm tài liệu đặc tả kỹ thuật (Game Design Document / System Architecture) để phát triển video game / board game mô phỏng.

---

## MỤC LỤC
1. [Hệ thống Không gian & Đo đạc (Spatial System)](#1-hệ-thống-không-gian--đo-đạc-spatial-system)
2. [Cấu trúc Thực thể & Chỉ số (Unit & Weapon Profiles)](#2-cấu-trúc-thực-thể--chỉ-số-unit--weapon-profiles)
3. [Vòng lặp Lượt chơi (Game Loop & Phase State Machine)](#3-vòng-lặp-lượt-chơi-game-loop--phase-state-machine)
4. [Quy trình Xử lý Giao tranh (Combat Resolution Pipeline)](#4-quy-trình-xử-lý-giao-tranh-combat-resolution-pipeline)
5. [Cơ chế Địa hình & Tầm nhìn (Terrain & Line of Sight)](#5-cơ-chế-địa-hình--tầm-nhìn-terrain--line-of-sight)
6. [Hệ thống Từ khóa Nâng cao (Special Keywords)](#6-hệ-thống-từ-khóa-nâng-cao-special-keywords)
7. [Tài nguyên Chiến thuật & Stratagems (CP System)](#7-tài-nguyên-chiến-thuật--stratagems-cp-system)
8. [Hệ thống Mục tiêu & Tính điểm Thắng (Victory System)](#8-hệ-thống-mục-tiêu--tính-điểm-thắng-victory-system)
9. [Đặc tả Dữ liệu & Thuật toán cho Lập trình viên (Developer Specifications)](#9-đặc-tả-dữ-liệu--thuật-toán-cho-lập-trình-viên-developer-specifications)

---

## 1. Hệ thống Không gian & Đo đạc (Spatial System)

Khác với board game dùng ô lưới (Square / Hex Grid), Warhammer 40,000 vận hành trên **không gian liên tục 2D/3D tự do**.

* **Đơn vị đo**: Inch (`"`), $1" \approx 2.54\text{ cm}$.
* **Kích thước bàn chuẩn (Battlefield)**:
  * Trận nhỏ (*Incursion* - 1.000 pts): $44" \times 30"$.
  * Trận tiêu chuẩn thi đấu (*Strike Force* - 2.000 pts): $44" \times 60"$.
* **Đế mô hình (Bases)**:
  * Mỗi mô hình (model) đứng trên một đế hình tròn hoặc oval (từ 25mm, 32mm, 40mm tới 160mm).
  * Khoảng cách giữa hai mô hình luôn được đo từ **mép đế gần nhất đến mép đế gần nhất** (Base-to-Base).
* **Vùng giao tranh (Engagement Range)**:
  * Vùng kiểm soát hình trụ: Bán kính ngang $\le 1"$, chiều cao $\le 5"$.
  * Khi mô hình địch nằm trong phạm vi này, hai bên bị khóa vào trạng thái **In Engagement Range** (giao tranh cận chiến).
* **Đội hình duy trì (Unit Coherency)**:
  * Các cá thể trong cùng một tiểu đội (unit) phải đứng cách nhau tối đa $2"$ theo chiều ngang và $5"$ theo chiều dọc.
  * Nếu đội có từ 7 mô hình trở lên, mỗi mô hình phải đứng gần ít nhất **2** mô hình đồng đội khác.

---

## 2. Cấu trúc Thực thể & Chỉ số (Unit & Weapon Profiles)

Mỗi đơn vị sở hữu một bảng chỉ số chuẩn hóa (**Datasheet**):

### 2.1. Chỉ số Đơn vị (Unit Profile)

| Ký hiệu | Tên gọi | Định dạng | Giải thích ý nghĩa |
| :---: | :--- | :---: | :--- |
| **M** | Movement | X" | Quãng đường tối đa đơn vị di chuyển trong một lượt. |
| **T** | Toughness | Số nguyên | Độ dẻo dai, bền bỉ của cơ thể hoặc giáp phương tiện. |
| **Sv** | Save | X+ | Giáp cơ bản. Cần gieo D6 $\ge$ giá trị này để triệt tiêu đòn đánh. |
| **W** | Wounds | Số nguyên | Lượng máu của mỗi mô hình trong đơn vị. |
| **Ld** | Leadership | X+ | Chỉ số tinh thần (gieo trên 2D6, càng thấp càng tốt). |
| **OC** | Objective Control | Số nguyên | Điểm số tranh chấp mục tiêu của mỗi mô hình. |
| **Invuln** | Invulnerable Save | X+ *(tùy chọn)* | Lớp giáp năng lượng đặc biệt, **không bao giờ bị trừ bởi AP**. |

---

### 2.2. Chỉ số Vũ khí (Weapon Profile)

| Ký hiệu | Tên gọi | Định dạng | Giải thích ý nghĩa |
| :---: | :--- | :---: | :--- |
| **Range** | Tầm bắn | X" hoặc Melee | Khoảng cách hiệu dụng tối đa. Melee chỉ dùng khi áp sát. |
| **A** | Attacks | Số nguyên / Xúc xắc (VD: D6, 4) | Số lượng phát bắn / đòn đánh tạo ra (số xúc xắc gieo). |
| **BS / WS** | Ballistic / Weapon Skill | X+ | Độ chính xác khi bắn (BS) hoặc cận chiến (WS). |
| **S** | Strength | Số nguyên | Sức công phá của đòn đánh (đọ với Toughness đối thủ). |
| **AP** | Armour Penetration | Số âm (0, -1, -2, -3...) | Chỉ số trừ trực tiếp vào giáp Save của mục tiêu. |
| **D** | Damage | Số nguyên / Xúc xắc (VD: 1, 2, D3) | Lượng sát thương gây ra cho máu (W) khi đòn xuyên thủng giáp. |

---

## 3. Vòng lặp Lượt chơi (Game Loop & Phase State Machine)

Trận đấu kéo dài cố định **5 Vòng đấu (Battle Rounds)**. Mỗi vòng gồm 2 Lượt người chơi (Player Turn: Người đi trước $\rightarrow$ Người đi sau).

Mỗi Player Turn gồm **5 giai đoạn tuần tự**:

```
[Start Turn]
     │
     ▼
┌─────────────────────────┐
│ 1. COMMAND PHASE        │ ──► Nhận 1 CP, Test Battle-shock, Tính điểm Primary
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ 2. MOVEMENT PHASE       │ ──► Normal Move / Advance / Fall Back / Deep Strike
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ 3. SHOOTING PHASE       │ ──► Chọn mục tiêu hợp lệ, Bắn theo 4-Step Pipeline
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ 4. CHARGE PHASE         │ ──► Tuyên bố Charge (trong 12"), Gieo 2D6 áp sát
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ 5. FIGHT PHASE          │ ──► Fights First ──► Xoay tua đánh luân phiên
└─────────────────────────┘
     │
     ▼
[End Turn ──► Chuyển sang đối thủ]
```

---

### Chi tiết các Phase

#### Phase 1: Command Phase (Chỉ huy)
1. **Nhận tài nguyên**: Người chơi nhận **1 Command Point (CP)**.
2. **Battle-shock Test**: Bắt buộc kiểm tra với tất cả đơn vị đang ở mức **Below Half-strength** (còn dưới 50% số quân hoặc máu ban đầu):
   * Gieo **2D6**. Nếu kết quả $\ge$ **Leadership (Ld)** $\rightarrow$ Vượt qua.
   * Nếu kết quả $<$ **Ld** $\rightarrow$ Bị **Battle-shocked** cho đến Command Phase lượt sau:
     * Chỉ số **OC = 0** (mất quyền kiểm soát mục tiêu).
     * **Không thể** làm mục tiêu của bất kỳ Stratagem nào.
     * Khi chọn Fall Back (Rút lui), phải thực hiện **Desperate Escape Test** (mỗi model gieo 1D6, ra 1 hoặc 2 thì model đó chết ngay lập tức).
3. **Scoring**: Chấm điểm các mục tiêu Primary nếu hoàn thành điều kiện chiếm giữ.

#### Phase 2: Movement Phase (Di chuyển)
Chọn từng đơn vị chưa hành động và chọn 1 trong 4 trạng thái:
* **Normal Move**: Di chuyển quãng đường $\le \mathbf{M}"$. Không được đi vào Engagement Range ($1"$) của địch.
* **Advance**: Di chuyển quãng đường $\le \mathbf{M} + 1\text{D6}"$. Lượt này đơn vị **không được bắn thường và không được Charge**.
* **Fall Back**: Rút lui khỏi Engagement Range của địch. Đơn vị không được bắn và không được Charge lượt này.
* **Remain Stationary**: Đứng yên hoàn toàn (để nhận buff từ vũ khí Heavy).
* **Reinforcements (Viện binh)**: Cuối Movement Phase, các đơn vị nằm trong khu vực Dự bị (Reserves / Deep Strike) được đặt lên bàn cờ, cách mọi mô hình địch ít nhất $9"$.

#### Phase 3: Shooting Phase (Bắn tỉa)
* Chỉ những đơn vị không kẹt trong Engagement Range (trừ khi có súng Pistol hoặc là Monster/Vehicle) và chưa Advance/Fall Back mới được bắn.
* Khai hỏa theo [Quy trình Xử lý Giao tranh](#4-quy-trình-xử-lý-giao-tranh-combat-resolution-pipeline).

#### Phase 4: Charge Phase (Xung phong)
* Đơn vị nằm trong khoảng cách $12"$ tới địch và chưa Advance/Fall Back có thể tuyên bố Charge.
* Gieo **2D6"**:
  * Nếu giá trị gieo được $\ge$ khoảng cách ngắn nhất để tiếp cận mục tiêu trong vòng $1"$ (Engagement Range) $\rightarrow$ **Charge thành công** (di chuyển vào áp sát).
  * Nếu không đủ khoảng cách $\rightarrow$ **Charge thất bại** (đứng yên tại chỗ, không di chuyển).

#### Phase 5: Fight Phase (Cận chiến)
Phân loại đơn vị tham chiến theo 2 nhóm ưu tiên:
1. **Nhóm 1 - Fights First**: Các đơn vị vừa Charge thành công trong lượt này, hoặc có kỹ năng nội tại *Fights First*.
2. **Nhóm 2 - Remaining Combats**: Các đơn vị còn lại đang kẹt trong Engagement Range.

Quy tắc kích hoạt luân phiên:
* Bên đến lượt kích hoạt 1 đơn vị Fights First $\rightarrow$ Đối thủ kích hoạt 1 đơn vị Fights First... cho đến hết nhóm 1.
* Chuyển sang nhóm 2: Bên **không phải lượt của mình (Inactive Player)** được quyền kích hoạt trước, sau đó xoay tua luân phiên.

**Chu kỳ tấn công của 1 Unit trong Fight Phase**:
1. **Pile-in**: Di chuyển mỗi mô hình tối đa $3"$ để áp sát kẻ địch gần nhất.
2. **Make Melee Attacks**: Gieo đòn đánh cận chiến theo pipeline 4 bước.
3. **Consolidate**: Di chuyển mỗi mô hình tối đa $3"$ để gom đội hình hoặc áp sát mục tiêu địch tiếp theo.

---

## 4. Quy trình Xử lý Giao tranh (Combat Resolution Pipeline)

Toàn bộ sát thương (Bắn xa lẫn Cận chiến) được xử lý qua chuỗi 4 bộ lọc chuẩn mực:

```
[Attacker: Weapon Attacks]
            │
            ▼
┌─────────────────────────┐
│ 1. HIT ROLL             │ ──► Gieo D6 >= BS hoặc WS (Tự nhiên: 1 auto-fail, 6 auto-hit)
└─────────────────────────┘
            │  (Số Hit thành công)
            ▼
┌─────────────────────────┐
│ 2. WOUND ROLL           │ ──► So khớp S của Vũ khí vs T của Nạn nhân
└─────────────────────────┘
            │  (Số Wound thành công)
            ▼
┌─────────────────────────┐
│ 3. ALLOCATE & SAVE      │ ──► Defender chọn model hứng đòn, gieo Save đã trừ AP (hoặc Invuln)
└─────────────────────────┘
            │  (Save thất bại)
            ▼
┌─────────────────────────┐
│ 4. DAMAGE ALLOCATION    │ ──► Trừ Wounds theo chỉ số D của vũ khí (Check Feel No Pain nếu có)
└─────────────────────────┘
```

---

### Bước 1: Hit Roll
* Người tấn công gieo số xúc xắc bằng chỉ số **Attacks (A)**.
* Thành công nếu $\text{D6} \ge \mathbf{BS}$ (Bắn) hoặc $\mathbf{WS}$ (Cận chiến).
* Mặt xúc xắc **1 tự nhiên luôn trượt**, mặt **6 tự nhiên luôn trúng (Critical Hit)**.

---

### Bước 2: Wound Roll (Bảng so sánh S vs T)
Người tấn công lấy số viên Hit thành công gieo tiếp, đối chiếu chỉ số **Strength (S)** của vũ khí với **Toughness (T)** của mục tiêu:

$$\begin{array}{|l|c|}
\hline
\textbf{Điều kiện so sánh} & \textbf{Xúc xắc cần đạt (Target Roll)} \\
\hline
S \ge 2 \times T & \mathbf{2+} \\
S > T & \mathbf{3+} \\
S = T & \mathbf{4+} \\
S < T & \mathbf{5+} \\
S \le \frac{T}{2} & \mathbf{6+} \\
\hline
\end{array}$$

* Mặt **1 tự nhiên luôn thất bại**, mặt **6 tự nhiên luôn thành công (Critical Wound)**.

---

### Bước 3: Allocate Attack & Save Roll
1. Người phòng thủ chọn 1 mô hình trong tiểu đội để chịu đòn (nếu tiểu đội đã có mô hình bị thương trước đó, bắt buộc phải phân bổ vào mô hình đó cho đến khi chết).
2. Người phòng thủ chọn 1 trong 2 loại giáp:
   * **Giáp cơ bản (Save)**: Giá trị cần gieo = $\mathbf{Sv} - \mathbf{AP}$. *(Ví dụ: Sv 3+, vũ khí có AP -2 $\rightarrow$ cần gieo $5+$).*
   * **Giáp vĩnh cửu (Invulnerable Save)**: Dùng thẳng chỉ số Invuln không bị trừ bởi AP.
3. Nếu kết quả gieo $\ge$ Giá trị yêu cầu $\rightarrow$ Đòn đánh bị chặn đứng hoàn toàn. Nếu nhỏ hơn $\rightarrow$ Nhận sát thương.

---

### Bước 4: Inflict Damage & Feel No Pain
* Mỗi đòn đánh lọt qua giáp gây lượng sát thương bằng đúng chỉ số **Damage (D)** của vũ khí.
* **Quy tắc sát thương dư thừa**: Sát thương từ một đòn đánh đơn lẻ **KHÔNG** lan sang mô hình thứ hai trong cùng tiểu đội.
  * *Ví dụ*: Vũ khí gây $3\text{ Damage}$ bắn trúng lính có $1\text{ Wound}$. Mô hình đó chết ngay, $2\text{ Damage}$ thừa biến mất.
* **Feel No Pain (FNP X+)**: Nếu mô hình có FNP, cứ mỗi $1$ điểm Damage nhận vào, gieo 1D6:
  * Nếu $\ge X \rightarrow$ Điểm sát thương đó bị triệt tiêu.
  * Nếu $< X \rightarrow$ Mất $1\text{ Wound}$.
* Khi một mô hình còn $0\text{ Wound}$, nó bị tiêu diệt và loại bỏ khỏi bàn cờ.

---

## 5. Cơ chế Địa hình & Tầm nhìn (Terrain & Line of Sight)

### 5.1. True Line of Sight (TLOS)
* Để bắn được, người tấn công phải nhìn thấy vật lý bất kỳ bộ phận nào của mô hình mục tiêu từ mắt của mô hình bắn.

### 5.2. Các Loại Địa hình Chuẩn
* **Ruins (Tàn tích phế tích - Quan trọng nhất)**:
  * **Obscuring (Che khuất tuyệt đối)**: Tầm nhìn không thể xuyên qua footprint (ranh giới nền) của tòa tàn tích sang phía bên kia, bất kể tòa nhà có cửa sổ hay khe hở trống.
  * **Chỉ nhìn thấy khi**: Mô hình đứng bên trong tàn tích nhìn ra ngoài, hoặc bắn vào mô hình đang đứng bên trong tàn tích.
  * **Tầng trệt (Plunging / Walls)**: Bộ binh (Infantry) có thể đi xuyên qua tường của Ruins, nhưng xe tăng (Vehicles/Monsters) không thể đi xuyên tường.
* **Benefit of Cover**:
  * Đơn vị đứng sau hoặc trong địa hình được **$+1$ vào chỉ số giáp (Save roll)**.
  * *Giới hạn*: Không cải thiện giáp tốt hơn $3+$ khi đối đầu với vũ khí có $\text{AP} = 0$.

---

## 6. Hệ thống Từ khóa Nâng cao (Special Keywords)

### 6.1. Từ khóa Vũ khí (Weapon Abilities)

| Từ khóa | Cơ chế hoạt động |
| :--- | :--- |
| **Torrent** | Tự động bắn trúng. Bỏ qua hoàn toàn bước Hit Roll. |
| **Lethal Hits** | Critical Hit (mặt 6 khi Hit roll) tự động gây vết thương (Auto-wound), bỏ qua bước Wound Roll. |
| **Sustained Hits X** | Critical Hit (mặt 6 khi Hit roll) cộng thêm $X$ đòn trúng bổ sung vào đợt tấn công. |
| **Devastating Wounds** | Critical Wound (mặt 6 khi Wound roll) gây sát thương bỏ qua hoàn toàn Save và Invulnerable Save. |
| **Hazardous** | Bắn xong gieo 1D6; nếu ra 1, vũ khí phát nổ gây chết 1 model hoặc trừ 3 Wounds. |
| **Blast** | Bắn vào cụm đông người: Cộng thêm $+1$ phát bắn cho mỗi 5 lính của đơn vị mục tiêu (không được bắn khi kẹt cận chiến). |
| **Heavy** | Nếu đơn vị không di chuyển trong Movement Phase, được cộng $+1$ vào Hit Roll. |
| **Assault** | Đơn vị vẫn được phép bắn vũ khí này sau khi đã thực hiện hành động Advance. |
| **Pistol** | Được phép bắn ngay cả khi đang bị kẹt trong Engagement Range của đối thủ. |
| **Rapid Fire X** | Tăng thêm $+X$ phát bắn khi mục tiêu nằm trong vòng một nửa tầm bắn tối đa ($Range / 2$). |
| **Twin-linked** | Cho phép gieo lại (Re-roll) toàn bộ các xúc xắc Wound Roll thất bại. |
| **Precision** | Cho phép người tấn công chỉ định phân bổ sát thương trực tiếp vào Tướng (Character) thay vì lính bảo vệ. |
| **Lance** | Được cộng $+1$ vào Wound Roll nếu đơn vị vừa Charge trong lượt đó. |
| **Melta X** | Tăng thêm $+X$ Damage cho mỗi đòn đánh khi ở cự ly một nửa tầm bắn ($Range / 2$). |

---

### 6.2. Từ khóa Đơn vị (Unit Keywords & Mechanics)

* **Leader & Attached Units**:
  * Tướng (**Character**) có thể ghép chung với một tiểu đội hộ vệ (**Bodyguard**) thành một cụm thực thể (**Attached Unit**).
  * Đòn tấn công từ xa phải nhắm vào và giết hết Bodyguard trước khi chạm tới Character.
  * Toughness của Attached Unit lấy theo Toughness của Bodyguard.
* **Lone Operative**: Không thể bị chọn làm mục tiêu bắn tầm xa nếu kẻ bắn đứng xa hơn $12"$.
* **Stealth**: Đòn tấn công tầm xa nhắm vào đơn vị này luôn bị phạt $-1$ vào Hit Roll.
* **Infiltrators**: Cho phép triển khai ở bất kỳ đâu trên bàn cờ khi bắt đầu game, miễn là cách vùng triển khai của địch và mô hình địch $> 9"$.
* **Scout X"**: Được phép di chuyển miễn phí $X"$ ngay trước khi Vòng 1 bắt đầu.
* **Fly**: Có thể di chuyển bay qua mô hình khác và địa hình như thể chúng không tồn tại.

---

## 7. Tài nguyên Chiến thuật & Stratagems (CP System)

### 7.1. Cơ chế Command Points (CP)
* Mỗi người chơi nhận $1\text{ CP}$ vào đầu mỗi Command Phase (tối đa nhận thêm $+1\text{ CP}$ phụ từ kỹ năng mỗi battle round).
* Tiêu tốn CP để kích hoạt các thẻ chiến thuật phản ứng (**Stratagems**).

### 7.2. Bộ Chiến thuật Cốt lõi (Core Stratagems)

| Stratagem | Chi phí | Thời điểm kích hoạt | Tác dụng |
| :--- | :---: | :--- | :--- |
| **Command Re-roll** | 1 CP | Ngay sau khi gieo xúc xắc | Gieo lại 1 viên xúc xắc bất kỳ (Hit, Wound, Save, Damage, Charge, v.v.). |
| **Fire Overwatch** | 1 CP | Movement / Charge Phase của địch | Bắn chặn một đơn vị địch vừa di chuyển trong tầm ngắm (chỉ trúng khi gieo được 6 tự nhiên). |
| **Counter-Offensive** | 2 CP | Fight Phase (sau khi 1 đơn vị địch vừa đánh) | Tranh quyền kích hoạt 1 đơn vị phe mình đánh cận chiến ngay lập tức. |
| **Go to Ground** | 1 CP | Shooting Phase của địch (khi bị nhắm bắn) | Bộ binh nhận trạng thái Cover ($+1$ Save) và Invulnerable Save $6+$. |
| **Smokescreen** | 1 CP | Shooting Phase của địch (khi bị nhắm bắn) | Nhận trạng thái Stealth ($-1$ to Hit) và Cover ($+1$ Save). |
| **Tank Shock** | 1 CP | Charge Phase (khi Xe tăng Charge xong) | Dùng xe tăng đâm va, gieo xúc xắc dựa trên Strength để gây sát thương trực tiếp (Mortal Wounds, tối đa 6 MW). |
| **Heroic Intervention**| 2 CP | Charge Phase của địch | 1 đơn vị phe mình nhảy vào phản công áp sát nếu địch Charge gần trong vòng $6"$. |

---

## 8. Hệ thống Mục tiêu & Tính điểm Thắng (Victory System)

Trận đấu kéo dài qua **5 Battle Rounds**. Kết quả phân định bằng điểm chiến thắng **Victory Points (VP)** (Tối đa **100 VP**):

```
TỔNG ĐIỂM CHIẾN THẮNG (Tối đa 100 VP)
├── Primary Missions (Mục tiêu chính)  : Tối đa 50 VP
├── Secondary Missions (Mục tiêu phụ)  : Tối đa 40 VP
└── Battle Ready (Sơn đủ quân)         : Cố định 10 VP
```

### 8.1. Tranh chấp Điểm mục tiêu (Objective Control)
* Các Objective Markers có bán kính kiểm soát $3"$ tính từ mép marker.
* Tính tổng điểm **OC** của toàn bộ mô hình hai bên nằm trong phạm vi $3"$:
  $$\text{Tổng OC bên A} > \text{Tổng OC bên B} \implies \text{Bên A chiếm giữ Mục tiêu}$$
* Đơn vị đang bị **Battle-shocked** có $\text{OC} = 0$.

### 8.2. Secondary Objectives (Nhiệm vụ phụ)
Người chơi có thể chọn 1 trong 2 hình thức:
* **Tactical Missions**: Mỗi vòng rút ngẫu nhiên 2 thẻ nhiệm vụ từ bộ bài. Hoàn thành thẻ nào ghi điểm thẻ đó và rút mới (đòi hỏi khả năng thích ứng cao).
* **Fixed Missions**: Chọn cố định 2 nhiệm vụ suốt cả trận (VD: Luôn nhắm tới *Assassination* - Giết tướng địch, hoặc *Bring It Down* - Bắn cháy xe tăng địch).

---

## 9. Đặc tả Dữ liệu & Thuật toán cho Lập trình viên (Developer Specifications)

Dành cho việc lập trình Game Engine, Simulator hoặc Board Game Engine.

### 9.1. Lược đồ Dữ liệu (JSON Schemas)

#### Mô hình Đơn vị (Unit Schema)
```json
{
  "unit_id": "sm_intercessors_01",
  "name": "Intercessor Squad",
  "faction": "Space Marines",
  "keywords": ["INFANTRY", "GRENADES", "IMPERIUM", "TACTICUS"],
  "stats": {
    "movement": 6,
    "toughness": 4,
    "save": 3,
    "invulnerable_save": null,
    "wounds_per_model": 2,
    "leadership": 6,
    "objective_control": 2
  },
  "models": [
    { "id": 1, "current_wounds": 2, "is_leader": false, "position": { "x": 12.5, "y": 8.0, "z": 0.0 } },
    { "id": 2, "current_wounds": 2, "is_leader": false, "position": { "x": 13.5, "y": 8.2, "z": 0.0 } }
  ],
  "status_flags": {
    "is_battle_shocked": false,
    "has_advanced": false,
    "has_fallen_back": false,
    "remained_stationary": true,
    "has_fought": false
  }
}
```

#### Mô hình Vũ khí (Weapon Schema)
```json
{
  "weapon_id": "bolt_rifle",
  "name": "Bolt Rifle",
  "type": "RANGED",
  "range": 24,
  "attacks": "2",
  "skill": 3,
  "strength": 4,
  "ap": -1,
  "damage": 1,
  "abilities": ["ASSAULT", "HEAVY"]
}
```

---

### 9.2. Thuật toán Xử lý Giao tranh (Combat Resolution Pseudo-code)

```python
import random

def resolve_combat_sequence(attacker_weapon, attacker_model, target_unit, target_model, in_cover=False):
    """
    Xử lý tuần tự chuỗi 4 bước: Hit -> Wound -> Save -> Inflict Damage
    """
    total_attacks = evaluate_dice_expr(attacker_weapon.attacks)
    successful_wounds = []
    
    # BƯỚC 1: HIT ROLL
    for _ in range(total_attacks):
        if "TORRENT" in attacker_weapon.abilities:
            hit_success = True
            is_crit_hit = False
        else:
            roll = random.randint(1, 6)
            is_crit_hit = (roll == 6)
            req_bs = attacker_weapon.skill
            if "HEAVY" in attacker_weapon.abilities and attacker_model.remained_stationary:
                req_bs = max(2, req_bs - 1)
            hit_success = (roll >= req_bs and roll != 1) or is_crit_hit

        if not hit_success:
            continue
            
        # Xử lý Keywords khi Hit
        if is_crit_hit and "LETHAL_HITS" in attacker_weapon.abilities:
            successful_wounds.append({"is_crit_wound": False, "auto_wound": True})
            continue
            
        if is_crit_hit and "SUSTAINED_HITS_1" in attacker_weapon.abilities:
            # Sinh thêm đòn Hit phụ
            pass

        # BƯỚC 2: WOUND ROLL
        s = attacker_weapon.strength
        t = target_unit.stats.toughness
        if s >= 2 * t:
            wound_target = 2
        elif s > t:
            wound_target = 3
        elif s == t:
            wound_target = 4
        elif s > t // 2:
            wound_target = 5
        else:
            wound_target = 6
            
        w_roll = random.randint(1, 6)
        is_crit_wound = (w_roll == 6)
        if (w_roll >= wound_target and w_roll != 1) or is_crit_wound:
            successful_wounds.append({"is_crit_wound": is_crit_wound, "auto_wound": False})

    # BƯỚC 3 & 4: SAVE & DAMAGE ALLOCATION
    for wound in successful_wounds:
        # Devastating Wounds bỏ qua toàn bộ giáp
        if wound["is_crit_wound"] and "DEVASTATING_WOUNDS" in attacker_weapon.abilities:
            save_failed = True
        else:
            effective_save = target_unit.stats.save
            if in_cover and effective_save >= 3:
                effective_save -= 1  # Benefit of Cover (+1 vào roll tương đương giảm 1 target)
            
            # Trừ AP
            effective_save -= attacker_weapon.ap # AP là số âm, ví dụ save 3 - (-2) = 5
            
            # So sánh với Invulnerable Save nếu có
            if target_unit.stats.invulnerable_save is not None:
                final_save_target = min(effective_save, target_unit.stats.invulnerable_save)
            else:
                final_save_target = effective_save

            s_roll = random.randint(1, 6)
            save_failed = (s_roll < final_save_target or s_roll == 1)

        if save_failed:
            raw_damage = evaluate_dice_expr(attacker_weapon.damage)
            
            # Áp dụng Feel No Pain nếu nạn nhân sở hữu
            applied_damage = 0
            fnp_target = target_unit.abilities.get("FEEL_NO_PAIN", None)
            for _ in range(raw_damage):
                if fnp_target and random.randint(1, 6) >= fnp_target:
                    continue # Bỏ qua điểm sát thương này
                applied_damage += 1

            # Trừ máu mô hình mục tiêu
            target_model.current_wounds -= applied_damage
            if target_model.current_wounds <= 0:
                target_unit.remove_model(target_model)
                break # Mô hình chết, đòn tiếp theo phân bổ cho mô hình kế tiếp
```
