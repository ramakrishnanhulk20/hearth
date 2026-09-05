# Phân tích tĩnh

Mọi hợp đồng đều được chạy qua slither 0.11.6 và solhint trước khi triển khai, và mọi phát hiện
đều được sửa hoặc được giải thích ở đây. Bảy pool là bảy bản triển khai của cùng ba hợp đồng
này, nên một lượt chạy phủ hết cả bảy. Trang này là phần giải thích. Lượt chạy thô thì lặp lại
được:

```bash
npm run lint -w @hearth/contracts
```

cho solhint, và nó qua với con số không cảnh báo trên bộ quy tắc đã tinh chỉnh trong
`.solhint.json`, còn với slither thì là một lượt biên dịch thường trên chính những mã nguồn đó
mà không có plugin FHEVM cho Hardhat, vì plugin ghi lại `ZamaConfig.sol` ngay lúc biên dịch và
sau đó slither không còn ánh xạ được các độ dời trong mã nguồn ngược về tệp trên đĩa. Lượt biên
dịch thường dùng đúng các thiết lập trình biên dịch ấy (0.8.27, tối ưu ở 800 lượt, cancun), nên
bytecode mà slither đọc chính là bytecode được phát hành.

## Lượt chạy

slither phân tích 46 hợp đồng với 102 bộ dò và báo về 88 kết quả, trong đó 85 kết quả nằm trong
chính các hợp đồng của Hearth. Không cái nào là lỗi. Chúng rơi vào năm nhóm, và mỗi nhóm có một
lý do.

| Nhóm | Số lượng | Mức độ slither gán | Vì sao nó không phải một phát hiện |
| --- | --- | --- | --- |
| `unused-return` | 38 | Trung bình | 36 trong số đó là `FHE.allow`, `FHE.allowThis`, `FHE.allowTransient` và `FHE.makePubliclyDecryptable`, các hàm này trả lại chính cái handle được đưa vào để nối chuỗi lệnh gọi. Bỏ qua giá trị trả về đó là cách dùng đã ghi trong tài liệu ở mọi ví dụ của Zama. Hai cái còn lại nằm ở dưới. |
| `reentrancy-no-eth`, `reentrancy-benign`, `reentrancy-events` | 20 | Trung bình và Thấp | slither coi mọi thao tác `FHE.*` là một lệnh gọi ngoài, vì mỗi thao tác là một lệnh gọi vào hợp đồng coprocessor. Những lệnh gọi đó mang theo handle bản mã chứ không mang quyền điều khiển, và không hợp đồng nào của người dùng chạy bên trong chúng. Các lệnh gọi ngoài thật sự là tới token và tới vault, cả hai đều cố định lúc khởi tạo, còn mọi hàm dịch chuyển giá trị đều là `nonReentrant` và ghi trạng thái của mình trước khi chuyển. |
| `timestamp` và `incorrect-equality` | 18 | Thấp và Trung bình | Các kỳ được định nghĩa theo `block.timestamp` là có chủ ý, và các phép so bằng nghiêm ngặt là để so số hiệu kỳ và các cờ bằng không, không bao giờ so số dư. Một validator dịch được dấu thời gian vài giây so với các kỳ dài một giờ hoặc sáu giờ, việc đó dịch trọng số của một người gửi đúng bấy nhiêu giây trên tổng 3.600 hoặc 21.600. |
| `uninitialized-local` | 8 | Trung bình | Các bộ luỹ kế và bộ đếm bắt đầu từ giá trị không mặc định của Solidity một cách có chủ ý: `offered`, `assigned`, `totalShares`, `processed`, `heavy`, `marked`, `cleared`. Còn `harvestHandle` được gán trên mọi nhánh của khối try/catch nằm ngay sau phần khai báo nó. |
| `calls-loop` | 1 | Thấp | `finalizeDraw` hỏi pool về nhịp đối soát của từng hạng trong ba hạng. Vòng lặp bị chặn ở ba và pool đó là pool của chính vault, do chủ sở hữu đặt một lần. |

Hai kết quả `unused-return` không phải lệnh gọi kiểm soát truy cập:

- `HearthVault._withdraw` bỏ qua cái handle mà `confidentialTransfer` trả về. Một lần chuyển
  ERC-7984 chuyển trọn số tiền hoặc không chuyển gì, và vault đã kẹp số tiền xuống theo giá trị
  nhỏ hơn giữa số người gửi đang giữ và số vault đang giữ, ngay trong cùng giao dịch, nên số
  tiền đã chuyển đúng bằng số tiền yêu cầu theo đúng cấu trúc. Sổ sách đã được cập nhật trước
  lệnh gọi.
- `SponsoredYieldSource.sponsor` bỏ qua giá trị mà `wrap` trả về. Nhà tài trợ ở đây theo đúng
  định nghĩa là bên được tin cậy, và thứ pool ghi sổ lúc đóng không bao giờ là con số của chính
  nhà tài trợ mà là số tiền đã được KMS kiểm chứng mà nguồn thực sự chuyển đi lúc thu hoạch.

## Những gì slither không nhìn thấy

slither lập luận trên luồng điều khiển ở dạng bản rõ. Nó không nói được một phép so mã hoá có
phải phép so đúng hay không, một lần cấp quyền trên danh sách kiểm soát truy cập có bị thiếu hay
không, hay một giá trị lẽ ra không nên công bố có bị công bố hay không. Những tính chất đó được
phủ bởi các bài kiểm thử đơn vị, các bài kiểm thử về công bằng và bất biến, cùng những script
tấn công đã thực thi trong [mô hình mối đe doạ](threat-model.md).

## Kiểm toán phụ thuộc

`npm audit --omit=dev` ở thư mục gốc của kho báo về hai phát hiện vào ngày 6 tháng 9 năm 2026, cả
hai đều nằm trong `axios`, và cả hai đều nằm trong phần mã mà ứng dụng không bao giờ chạy:

- `axios@0.21.4` dưới `hardhat-deploy@0.11.45`, trong gói hợp đồng. Đó là công cụ triển khai chạy
  trên máy của người vận hành và không bao giờ đi kèm trong một bundle. `hardhat-deploy` 0.11 ghim
  vào dòng 0.21, nên cách sửa duy nhất là nâng cấp lớn công cụ triển khai, việc đó sẽ làm đổi
  những bản ghi triển khai mà kho này đang dựa vào.
- `axios` dưới `@coinbase/cdp-sdk`, thứ mà `@wagmi/connectors` kéo theo cùng với connector
  WalletConnect. Hearth không bao giờ import axios và không bao giờ gọi SDK của Coinbase; các
  cảnh báo đó nói về việc xử lý proxy phía máy chủ và giả mạo yêu cầu trong Node, không phải một
  bundle trình duyệt. `npm audit fix` chuyển bản sao lồng bên trong sang một bản phát hành khác
  cũng dính lỗi chứ không đưa nó ra khỏi khoảng đó, nên nó được để nguyên như lockfile ghi.

Riêng gói web, khi bỏ connector đi, thì kiểm toán sạch, và đó là cách con số không phát hiện nào
của ngày 3 tháng 9 được tạo ra.
