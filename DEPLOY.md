# Hướng dẫn deploy production

## 1. Chuẩn bị

### Đổi DB sang PostgreSQL (bắt buộc cho Vercel)

SQLite không chạy được trên serverless. Đổi schema:

```prisma
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
}
```

Lấy free PostgreSQL từ:
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (free 60MB)
- [Supabase](https://supabase.com) (free 500MB) ← đang dùng cho dự án này
- [Neon](https://neon.tech) (free 0.5GB)

Sau khi có connection string:
```bash
bun run db:push   # tạo schema
bun run db:generate
```

> ⚠ Supabase + Vercel: dùng connection POOLED (port 6543, có
> `pgbouncer=true`) — `src/lib/db.ts` đã tự thêm tham số này.
> Nhớ set biến môi trường trên Vercel: Project → Settings → Environment
> Variables (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL,
> NEXT_PUBLIC_SITE_URL, các key Cloudinary/Sepay/MoMo/VNPay/ZaloPay…).

### Tài khoản admin sau deploy (TỰ ĐỘNG)

Sau khi deploy xong, KHÔNG cần gọi endpoint nào cả: lần đầu khách truy cập
site, `/api/seed` sẽ tự động **tạo-nếu-thiếu** các tài khoản admin trong
`src/lib/setup-admins.ts`, gồm:

| Email | Mật khẩu | Vai trò |
|---|---|---|
| `buifkhanh57@gmail.com` | `AVHSTORE@123` | Chủ shop (ADMIN) |
| `buikhanh57@gmail.com` | `avhstore@123` | Admin |
| `buithimai11021987@gmail.com` | `avhstore@123` | Admin |
| `duongyenavh@gmail.com` | `avhstore@123` | Admin |
| `nguyenanh2406@gmail.com` | `avhstore@123` | Admin |

Hàm chỉ tạo mới khi email chưa tồn tại và chỉ thăng quyền ADMIN khi role
chưa phải ADMIN — **không bao giờ** ghi đè mật khẩu của user cũ. Sau lần
đầu tiên nên đổi mật khẩu trong trang Tài khoản.

### URL sản phẩm + SEO (mới)

Mỗi sản phẩm có URL riêng: `https://<domain>/san-pham/<slug>`
- Server-render đầy đủ `<title>`, description, canonical, Open Graph,
  Twitter Card (Facebook/Zalo chia sẻ ra đúng ảnh + tên sản phẩm).
- Chèn JSON-LD Product schema (giá VND, còn/hết hàng, rating) → Google hiển
  thị sao + giá trên kết quả tìm kiếm.
- `sitemap.xml` tự liệt kê toàn bộ sản phẩm published; `robots.txt` trỏ
  về sitemap. Không cần cấu hình gì thêm — nhớ đặt `NEXT_PUBLIC_SITE_URL`
  bằng domain thật để link chuẩn.
- Nút "Sao chép link" / "Chia sẻ Facebook" ở trang sản phẩm dùng đúng URL
  `/san-pham/<slug>` thay vì `/`.

### Lưu trữ ảnh upload

Serverless không ghi file cố định. Cấu hình S3/R2/Cloudinary:

1. Tạo bucket AWS S3 / Cloudflare R2 / Cloudinary
2. Cài `@aws-sdk/client-s3` hoặc dùng Cloudinary SDK
3. Sửa `src/app/api/upload/route.ts` để upload lên cloud thay vì `/public/uploads/`

## 2. Push lên GitHub

```bash
git init
git add .
git commit -m "init: Nội Thất AVH e-commerce"
git branch -M main
git remote add origin https://github.com/<bạn>/avh-furniture.git
git push -u origin main
```

## 3. Deploy lên Vercel

1. Vào [vercel.com](https://vercel.com) → New Project → import repo GitHub vừa push
2. Vercel tự nhận diện Next.js → bấm **Deploy**
3. 2-3 phút sau có URL: `https://avh-furniture.vercel.app`

### Cấu hình biến môi trường

Vào Vercel → Settings → Environment Variables. **DATABASE_URL phải dùng
connection POOLED (port 6543)** — host trực tiếp `db.<ref>.supabase.co`
chỉ có IPv6, serverless Vercel không kết nối được:

| Tên | Giá trị | Ghi chú |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<DB-PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require` | Supabase → Connect → Transaction pooler |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | |
| `NEXTAUTH_URL` | `https://<domain>` | |
| `NEXT_PUBLIC_SITE_URL` | `https://<domain>` | SEO canonical + sitemap |
| `SEPAY_WEBHOOK_SECRET` | trùng secret trong dashboard SePay | tự động xác nhận chuyển khoản |
| `PAYMENT_WEBHOOK_SECRET` | random 32 ký tự | |
| `CLOUDINARY_URL` | `cloudinary://<key>:<secret>@<cloud>` | lưu ảnh upload |
| `GROQ_API_KEY` | `gsk_...` | chatbot AI |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | tuỳ chọn (Storage/Realtime) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | tuỳ chọn, public |

### Chống Supabase pause (QUAN TRỌNG)

Supabase free **pause project sau ~5-7 ngày không có hoạt động** (không ai
vào web = DB không được hỏi gì = bị pause = web chết). Đã fix tận gốc:

- `vercel.json` khai báo cron mỗi ngày 02:00 UTC (09:00 giờ VN) gọi
  `GET /api/keep-alive` → endpoint mở connection + query nhẹ → Supabase
  tính là hoạt động, không bao giờ pause nữa.
- Endpoint chỉ đọc, trả về số lượng sản phẩm/danh mục/đơn hàng (không lộ
  dữ liệu nhạy cảm), trả 500 nếu DB chết để Vercel log cảnh báo.

### Migrate sang project Supabase MỚI (project cũ bị pause)

```bash
# 1. Đẩy schema sang DB mới (dùng session pooler port 5432 cho ổn định)
DATABASE_URL='postgresql://postgres.<ref>:<PASS>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require' \
  bunx prisma db push

# 2. Copy dữ liệu catalog từ SQLite local (sản phẩm, danh mục, blog, banner,
#    voucher, setting) — bỏ qua đơn hàng/user test:
DATABASE_URL='postgresql://postgres.<ref>:<PASS>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require' \
  ONLY_TABLES='Category,Product,ProductVariant,ProductMedia,Voucher,Banner,BlogPost,Setting' \
  bun run migrate:sqlite-to-postgres

# 3. Deploy → lần truy cập đầu tiên /api/seed tự tạo admin + đồng bộ
#    tài khoản ngân hàng (ensureFixedBankAccountSetting).
```

> ⚠ `BlogPost.authorId` trỏ tới User — khi bỏ qua bảng User, script loại
> author (cột nullable) nên không lỗi FK.
>
> 💡 Đơn hàng/khách hàng của project cũ (đã pause): vào dashboard Supabase
> → chọn project cũ → **Restore project** để mở lại rồi export, hoặc bỏ
> qua nếu chỉ cần catalog + đơn mới.

### Thêm tên miền riêng

1. Mua tên miền ở [Mắt Báo](https://matbao.net) / [P.A Vietnam](https://pavietnam.vn) (~200-500k/năm)
2. Vercel → Settings → Domains → Add → nhập `noithatavh.vn`
3. Cập nhật DNS record theo hướng dẫn Vercel (thêm CNAME → `cname.vercel-dns.com`)
4. Đợi 5-30 phút để SSL tự cấp → web live ở `https://noithatavh.vn`

## 4. Lệnh deploy thủ công (tuỳ chọn)

```bash
# Cài Vercel CLI
bun add -g vercel

# Login + link project
vercel login
vercel link

# Deploy production
vercel --prod
```

## 5. Checklist trước khi go-live

- [ ] Đổi mật khẩu admin `admin123` → mật khẩu mạnh + đổi email
- [ ] Cấu hình email gửi thật (Resend / SendGrid) cho email xác nhận đơn
- [ ] Bật HTTPS-only cookies (`cookies.secure = true`)
- [ ] Test thanh toán thật (VNPAY/MoMo gateway nếu tích hợp)
- [ ] Backup DB định kỳ
- [ ] Setup monitoring (Vercel Analytics / Sentry)
- [ ] Xoá dữ liệu seed demo (chạy `db:reset` rồi seed lại chỉ production data)

## 6. Tuỳ chọn deploy khác

### VPS (Hostinger / VNCloud)

```bash
# Trên VPS
git clone https://github.com/<bạn>/avh-furniture.git
cd avh-furniture
bun install
bun run build
bun run start   # port 3000

# Caddy/Nginx reverse proxy + Let's Encrypt SSL
```

### Docker

Tạo `Dockerfile`:
```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
```
