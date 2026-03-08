# LoveProof (formerly ExCheck)

LoveProof là web app tập trung vào 2 nhu cầu:

1. **Match Checker** cho người dùng app hẹn hò: tra cứu tín hiệu công khai xem một handle có đang trong mối quan hệ verified hoặc có community flags không.
2. **Couple Verify** cho cặp đôi: xác thực mối quan hệ theo luồng 2 bước có đồng thuận (tạo claim + xác nhận bằng claim code).

## Stack

- Frontend: HTML/CSS/JS thuần
- Database online: Supabase (PostgreSQL)
- Fallback: local demo data nếu chưa cấu hình Supabase

## Core flows

### A) Match Checker
- Nhập handle.
- Hệ thống hiển thị:
  - danh sách `relationship_claims` ở trạng thái `verified` có chứa handle đó
  - danh sách `community_flags` do cộng đồng gửi

### B) Couple Verify
1. Partner A tạo claim (`pending`) với `claim_code`.
2. Partner B nhập `claim_code` + handle của mình để xác nhận.
3. Claim chuyển sang `verified`, có thể được tra cứu trong Match Checker.

## Setup

### 1) Tạo bảng ở Supabase
Chạy file `supabase/schema.sql` trên SQL Editor.

### 2) Cấu hình project key
Điền `config.js`:

```js
window.EXCHECK_SUPABASE_URL = "https://<project-ref>.supabase.co";
window.EXCHECK_SUPABASE_ANON_KEY = "<your-anon-key>";
```

### 3) Chạy local

```bash
python3 -m http.server 4173
```

Mở `http://localhost:4173`.

## Lưu ý sản phẩm

- Đây là MVP cộng đồng; cần bổ sung anti-abuse (rate limit, moderation queue, auth) trước production.
- Không khuyến khích doxxing; bằng chứng nên qua link đã ẩn thông tin nhạy cảm.
