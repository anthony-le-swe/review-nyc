# review-nyc

Ứng dụng web tĩnh **ExCheck** để cộng đồng chia sẻ và tra cứu review người yêu cũ theo hướng minh bạch.

## Tính năng chính

- Thêm review mối quan hệ cũ có cấu trúc.
- Bắt buộc khai báo bằng chứng đã từng quen nhau.
- Nếu review tiêu cực thì bắt buộc bổ sung bằng chứng cụ thể.
- Tìm kiếm theo tên/khu vực và lọc theo mức đánh giá.
- **Auth Check FB/Instagram**:
  - Gửi báo cáo nick là `real` / `fake` / `chưa rõ` có kèm bằng chứng.
  - Tra cứu theo link profile để xem tổng hợp cộng đồng.
  - Có upvote/downvote cho từng báo cáo để tăng độ tin cậy xã hội.
- Dữ liệu lưu local bằng `localStorage` để demo nhanh.

## Chạy dự án

Mở trực tiếp file `index.html` bằng trình duyệt hoặc chạy server tĩnh:

```bash
python3 -m http.server 4173
```

Sau đó truy cập `http://localhost:4173`.
