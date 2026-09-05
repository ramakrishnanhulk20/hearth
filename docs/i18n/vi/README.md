# Tài liệu Hearth

Hearth là hình thức tiết kiệm trúng thưởng bảo mật, không thua lỗ, chạy trên Zama Protocol.
Bạn gửi vào một token bảo mật, số dư của bạn nằm trên chuỗi ở dạng mã hoá, phần lợi suất mà
pool kiếm được sẽ được chia thành giải thưởng trong mỗi kỳ quay thưởng, và tiền gốc của bạn
rút ra lúc nào cũng được. Không ai đọc được bạn đã tiết kiệm bao nhiêu hay trúng bao nhiêu,
kể cả chúng tôi.

Có bảy pool chạy trên Sepolia, mỗi pool cho một token bảo mật mà Zama phát hành ở đó, mỗi
pool có bộ hợp đồng riêng và keeper riêng. Phần lớn các trang dưới đây lấy USDC làm ví dụ
minh hoạ, vì đó là pool có lịch sử dài nhất; nhưng trang nào cũng mô tả cả bảy pool.

Những trang này là bản ghi đầy đủ về cách Hearth hoạt động và về những gì nó không che giấu.
Tệp `ARCHITECTURE.md` ở thư mục gốc của kho mã là bản đặc tả triển khai; cây tài liệu này là
cùng thiết kế đó, viết lại cho người dùng và cho người kiểm toán.

## Các trang

| Trang | Nội dung |
| --- | --- |
| [Hearth là gì](getting-started/what-is-hearth.md) | Toàn bộ sản phẩm trong một trang: bốn thao tác của người gửi tiết kiệm, và chính xác mỗi thao tác che giấu điều gì. |
| [Dùng thử trên Sepolia](getting-started/try-it-on-sepolia.md) | Chọn một trong bảy token, lấy token từ faucet, shield, gửi tiền, một kỳ quay, mở kết quả, nhận thưởng, rút tiền, unshield. |
| [Pool và token](concepts/pools-and-tokens.md) | Bảy pool cùng địa chỉ của chúng, vì sao sáu pool quay sáu giờ một lần, số vốn mồi cho mỗi token, token mà Hearth từ chối, và đường dẫn riêng của từng pool. |
| [Một kỳ quay diễn ra thế nào](concepts/how-a-draw-works.md) | Các kỳ, cửa sổ hai kỳ và hạn chót đóng kỳ, năm bước của một kỳ quay, và thứ mà vault công bố thay cho tổng số dư của pool. |
| [Số dư bình quân theo thời gian](concepts/time-weighted-balance.md) | Vì sao tỷ lệ trúng dựa trên số dư trung bình của bạn trong kỳ, một khoản gửi muộn đáng giá bao nhiêu, và vì sao lưu ba mốc quan sát là đủ. |
| [Chọn người trúng](concepts/winner-selection.md) | Phép thử người trúng, quy tắc tính theo từng giải của PoolTogether, các ngưỡng lồng nhau đặt cạnh bậc đã công bố, và một ví dụ với ba người gửi. |
| [Giải thưởng và các hạng giải](concepts/prizes-and-tiers.md) | Lợi suất biến thành tiền giải thưởng ra sao, phần dư mã hoá và nhịp đối soát, ba hạng giải trên Sepolia, tình huống vượt số giải, và những chỗ chúng tôi làm khác PoolTogether V5. |
| [Nguồn lợi suất](concepts/yield-source.md) | Nguồn được tài trợ trên Sepolia, vì sao phần thu hoạch được kiểm chứng chứ không phải tự khai, và Confidential Vault của Zama cắm vào ra sao trên mainnet. |
| [Vì sao chọn Zama](concepts/why-zama.md) | Phép thử xoá bỏ: bỏ mã hoá đồng cấu hoàn toàn ra thì không còn sản phẩm nào cả. Gọi tên từng mảnh công nghệ Zama mà chúng tôi dùng. |
| [Những gì được giữ kín](security/what-stays-private.md) | Bảy quy tắc: bậc công bố và lỗ rò mà nó thay thế, cái giá của một số dư bị ghim, đường nối lúc bọc token theo cả hai chiều, số đếm giải thưởng đo cái gì, tầng token, vì sao việc duyệt không phải một dấu hiệu, và phần dư hành vi. |
| [Mô hình mối đe doạ](security/threat-model.md) | Chín kiểu kẻ tấn công, mỗi bên muốn gì, cái gì chặn được họ, và cái gì không. Kèm những thất bại đã thực thi trên thiết kế cũ của chúng tôi. |
| [Tính ngẫu nhiên và cách kiểm chứng](security/randomness-and-verification.md) | Seed đến từ đâu, vì sao không ai quay lại được hay đổi được giá trị nó trúng, và cách bất kỳ ai cũng tính lại được một ngưỡng sau khi mọi chuyện đã xong. |
| [Phân tích tĩnh](security/static-analysis.md) | Các lượt chạy slither và solhint, một lý do đứng sau mỗi nhóm trong năm nhóm phát hiện, và lượt kiểm tra phụ thuộc cùng hai phát hiện axios mà nó vẫn báo. |
| [Keeper](operations/keeper.md) | Công việc của keeper theo từng bước, quy tắc thứ tự, mỗi pool một tiến trình, bảy keeper đang chạy được đặt ở đâu, chuyện gì xảy ra khi nó ngừng chạy, và ngân sách gas. |
| [Triển khai](operations/deploying.md) | Triển khai một pool cho mỗi token, chữ ký và tham số hàm khởi tạo, xác minh hợp đồng, và hai bộ tham số Sepolia đặt cạnh một bộ cho mainnet. |
| [Giới hạn](limitations.md) | Toàn bộ mười bốn giới hạn đã ghi nhận, trong một danh sách đánh số. |
| [Câu hỏi thường gặp](faq.md) | Mười hai câu trả lời ngắn, mở đầu bằng việc bạn tiết kiệm được bằng token nào trong bảy token, và có cả câu nút nhận thưởng đi đâu mất. |
