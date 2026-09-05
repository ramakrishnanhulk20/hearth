# Tính ngẫu nhiên và cách kiểm chứng

Một kỳ quay chỉ có giá trị khi người lạ kiểm được nó. Trang này nói cách làm điều đó.

## Seed đến từ đâu

Một lệnh gọi, bên trong giao dịch đóng một kỳ quay:

```solidity
euint64 seed = FHE.randEuint64();
```

Lệnh đó chạy bên trong coprocessor của Zama. Con số được sinh ra bởi một bộ sinh an toàn về mặt
mật mã dưới khoá FHE của mạng, và thứ quay về hợp đồng là một handle bản mã, không phải một con
số. Vào khoảnh khắc đó chưa ai nhìn thấy giá trị: không phải người gọi, không phải chúng tôi,
không phải người đào block.

Có hai tính chất của bộ sinh của Zama quan trọng ở đây, và cả hai đều được nêu trong chính tài
liệu của Zama:

- **Nó buộc phải chạy bên trong một giao dịch.** Việc sinh một giá trị ngẫu nhiên làm thay đổi
  trạng thái bộ sinh trên chuỗi, nên không làm được qua `eth_call`, tức cách mô phỏng một lệnh
  gọi ở chế độ chỉ đọc. Không ai xem trước được một kỳ quay ngoài chuỗi để biết mình có trúng
  hay không.
- **Nó an toàn về mặt mật mã và vẫn ở dạng mã hoá** cho tới khi có thứ gì đó chủ động làm cho nó
  giải mã được.

## Vì sao không ai quay lại được nó, hay đổi được giá trị nó trúng

Bốn thứ, gộp lại.

1. **Việc đóng chỉ thành công một lần.** Máy trạng thái của kỳ quay cho phép `closeDraw(p)` đúng
   một lần cho mỗi kỳ quay. Không có lần thử thứ hai để mua một con số đẹp hơn.
2. **Giá trị chưa ai biết vào lúc nó được rút.** Vì seed là bản mã ngay khi được tạo, người gửi
   giao dịch đóng chẳng biết thêm gì nhờ việc đã gửi nó. Chẳng có ích gì khi tranh nhau làm
   người gọi.
3. **Bước công bố là một chiều.** Sau khi đóng, seed được đánh dấu là giải mã công khai được. Lá
   cờ đó là vĩnh viễn và không thu hồi được trên danh sách kiểm soát truy cập của Zama, nên con
   số mà thế giới thấy đúng là con số hợp đồng đã cam kết, chứ không phải một con số chọn sau
   đó.
4. **Giải thưởng được chốt trước khi seed tồn tại.** Giá trị giải của mỗi hạng và phần thanh
   khoản nó đem ra được tính ở đầu chính cái giao dịch đóng đó, trước khi `randEuint64` được
   gọi. Ở một bản nháp trước, chúng được đặt muộn hơn, lúc trao giải, và điều đó để hở một cửa
   sổ cho ai đó đọc seed, tính ra là mình đã trúng, rồi chuyển thanh khoản giữa các hạng cho cái
   giải ấy đáng giá hơn. Cửa sổ đó không còn nữa.

Đem so với các thiết kế thay thế. Một kỳ quay dựa vào hàm băm của block thì bị một validator
không ưa kết quả quay lại. Một kỳ quay dựa vào một con số ngoài chuỗi thì bị chọn thẳng. Cả hai
đều không xảy ra được ở đây, và đó chính là lý do tính ngẫu nhiên được sinh trên chuỗi dưới dạng
mã hoá chứ không bao giờ bằng một bộ sinh ngoài chuỗi.

## Cái gì thành công khai, và vào lúc nào

| Giá trị | Công bố khi nào | Vì sao nó buộc phải công khai |
| --- | --- | --- |
| Seed `R` | Lúc đóng, đọc được sau khi relayer giải mã nó | Không có nó thì không ai tính lại được một ngưỡng |
| Con đếm thang, từ đó suy ra bậc `M` | Lúc đóng | Ngưỡng là tương đối so với quy mô của pool |
| Kỳ đó có khác rỗng hay không | Lúc đóng | Phân biệt một kỳ quay rỗng với một kỳ quay thật |
| Phần thu hoạch của kỳ quay | Lúc đóng | Đó là số tiền tài trợ cho các giải sau này |
| Giá trị giải của mỗi hạng và phần thanh khoản bản rõ nó đem ra | Lúc đóng | Cần để kiểm một lần trúng trả bao nhiêu |
| Phần dư của mỗi hạng | Lúc chốt của mọi kỳ quay, vì mọi hạng đều đối soát mỗi kỳ quay | Cần để kiểm hạng đó đã trả bao nhiêu giải |
| Bộ đếm khoản chưa cấp vốn | Lúc chốt | Chứng minh pool đã cấp vốn cho mọi khoản ghi có mà vault đã viết |

Có hai thứ cố ý **không** nằm trong danh sách đó. Tổng số dư bình quân theo thời gian chính xác
của pool không bao giờ được công bố, vì làm vậy cho phép người quan sát moi ra chính xác số tiền
gửi của người duy nhất dịch chuyển; thay vào đó cái bậc nằm trên nó được công bố. Và không giá
trị nào của một người gửi riêng lẻ từng bị đánh dấu là giải mã công khai được.

Mọi thứ trong danh sách đều tới sau khi cái kỳ mà chúng quyết định đã kết thúc. Công bố `R`
không giúp ai đổi được một trọng số, vì trọng số của kỳ `p` bị đóng băng ngay khoảnh khắc kỳ `p`
kết thúc, tức trước cả khi kỳ quay đóng được.

Mỗi con số đó tới hợp đồng kèm một chữ ký của dịch vụ quản lý khoá của Zama, được kiểm ngay trên
chuỗi bằng `FHE.checkSignatures`. Bằng chứng gắn với các handle theo một thứ tự cố định:
`[seed, scaleCount, nonEmpty, harvested]` lúc trao giải, và một handle phần dư cho mỗi lần đối
soát. Không gì bị xáo trộn giữa các ô hay phát lại cho một kỳ quay khác. Máy trạng thái của kỳ
quay chính là lớp chống phát lại: mỗi bước thành công một lần cho mỗi kỳ quay, và việc đối soát
một lần cho mỗi hạng.

## Cái bậc, và cách vault theo dõi nó

Tổng số dư bình quân theo thời gian của pool trong một kỳ, `W`, vẫn ở dạng mã hoá. Con số mà kỳ
quay chạy trên đó là `M = 2^m`, luỹ thừa hai nhỏ nhất bằng hoặc lớn hơn `W`.

Vault theo dõi `m` từ kỳ quay này sang kỳ quay khác thay vì tính lại từ đầu. Ở mỗi lần đóng, nó
so `W` dưới dạng mã hoá với năm luỹ thừa hai quanh giá trị `m` của kỳ quay trước, cộng năm kết
quả lại thành một con đếm nhỏ đã mã hoá, rồi đánh dấu con đếm đó là giải mã công khai được. Pool
đọc con đếm đã kiểm chứng và tính ra `m` mới, giá trị này dịch nhiều nhất ba bước mỗi kỳ quay.
Một phép so mã hoá riêng với 1 cho ra cờ khác rỗng.

Vậy nên bản ghi công khai của mỗi kỳ quay là một số nguyên nhỏ, và nó chỉ đổi khi pool vượt qua
một luỹ thừa hai. Hàm `scaleBits()` trên pool đọc giá trị `m` hiện tại; lúc triển khai, nó được
mồi bằng `initialScaleBits`, tức độ dài bit kỳ vọng của tổng ở kỳ đầu tiên, và bộ theo dõi sửa
mọi sai lệch với tốc độ tối đa ba bit mỗi kỳ quay.

## Bất kỳ ai cũng tính lại được một ngưỡng như thế nào

Mọi thứ dưới đây chỉ dùng dữ liệu công khai. Không cần ví, không cần chữ ký, không cần quyền.

Với kỳ quay `p`, địa chỉ người gửi `u`, hạng giải `t` có `count[t]` giải và tỷ lệ
`oddsNum[t] / oddsDen[t]`:

```
prn         = keccak256(abi.encode(R, p, u, t))
r           = prn mod M                                        // 0 <= r < M
threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))
```

với mỗi `k` từ `0` tới `count[t] - 1`. Người gửi đó trúng giải `k` khi và chỉ khi trọng số bình
quân theo thời gian của họ trong kỳ `p` lớn hơn hẳn `threshold_k`.

Bạn không phải tự cài đặt lại. Vault đưa ra `thresholdOf(drawId, saver, tier, k)` như một hàm
view thuần trên đúng phép tính mà việc duyệt dùng, nên bảng kiểm chứng của ứng dụng, bộ kiểm thử
và bất kỳ ai có một block explorer đều đọc cùng một bản cài đặt. Cài lại nó ngoài chuỗi chỉ là
bốn dòng số học số lớn, nếu bạn thích đối chiếu hợp đồng với mã của chính mình.

Một ví dụ tính tay với những con số nhỏ nằm ở [chọn người trúng](../concepts/winner-selection.md).
Một ví dụ điền số thật từ một kỳ quay Sepolia thì ở đây, lấy từ pool `usdc`, có quỹ giải thưởng
tại `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2`. Mọi pool đều công bố đúng những trường này cho
các kỳ quay của mình:

| Trường | Giá trị |
| --- | --- |
| Kỳ quay | `2, the period from 23:00 to 00:00 UTC on 2 September 2026` |
| Seed `R` | `5625525180683981523` |
| Bậc `M` | `2^43, which is 8,796,093,022,208 balance-seconds` |
| Thu hoạch | `19.531380 USDC` |
| Giá trị giải theo hạng | `3.559644 / 1.779822 / 0.889911 USDC, grand / mid / frequent` |
| Số giải đã trả theo hạng | `0 / 0 / 5, against a funded capacity of 2 / 2 / 8` |

Đọc từ chuỗi: seed và bậc lấy từ sự kiện `DrawAwarded` của pool, giá trị giải và phần thanh
khoản đem ra lấy từ `drawParams(2)`, còn số giải đã trả lấy từ ba sự kiện `TierReconciled` của
kỳ quay đó, vì phần một hạng đem ra mà không trả đúng bằng phần dư nó đã công bố. Hạng giải lớn
và hạng giải vừa không trả gì trong kỳ quay này và trả nguyên phần đem ra về, và đó là điều một
hạng 1 trên 24 và một hạng 1 trên 6 làm trong hầu hết thời gian.

Bảng kiểm chứng của ứng dụng làm phép tính này ngay trong trình duyệt cho bất kỳ địa chỉ nào bạn
gõ vào, tại `/verify?pool=<slug>` cho pool bạn muốn. Nó không có quyền truy cập đặc biệt nào;
vẫn là những đầu vào công khai đó và đúng công thức đó.

## Vì sao phép chia lấy dư không bị lệch

Rút gọn một số ngẫu nhiên lớn về một khoảng bằng phép chia lấy dư thông thường thì thường bị
lệch. Nếu `2^256` không phải bội số chính xác của khoảng đó, các số dư nhỏ xuất hiện hơi thường
xuyên hơn, và độ lệch ấy rơi không đều lên những người gửi. PoolTogether V5 giải quyết nó bằng
lấy mẫu có loại bỏ, và một bản nháp trước của Hearth cũng vậy.

Hearth giờ không cần nữa. `M` là luỹ thừa hai theo đúng cấu trúc, và `2^256` là bội số chính xác
của mọi luỹ thừa hai cho tới `2^256`. Nên `prn mod M` đơn giản là `m` bit thấp của một hàm băm
256 bit, và mọi giá trị từ `0` tới `M - 1` đều đến từ đúng bằng ấy số đầu vào. **Độ lệch bằng
không, không phải nhỏ**, không cần vòng lặp, không cần loại bỏ và không có gì để người kiểm
chứng phải tái hiện cho cẩn thận.

Đó là lợi ích kèm theo của việc công bố cái bậc thay vì tổng chính xác, và nó đáng nói ra vì nó
gỡ bỏ một đoạn mã mà lẽ ra ai kiểm kỳ quay cũng phải khớp cho bằng đúng.

## Cày địa chỉ không ăn thua

Khi `R` đã công khai, ai đó có thể sinh địa chỉ cho tới khi tìm được một địa chỉ có ngưỡng thấp.
Làm vậy vô ích. Ngưỡng được đem so với một trọng số của kỳ `p`, mà một địa chỉ mới toanh thì
không có mốc quan sát nào tại hoặc trước kỳ `p`, nên trọng số của nó bằng không. Số không không
vượt được ngưỡng nào. Muốn có trọng số trong kỳ `p` thì bạn phải giữ số dư trong kỳ `p`, mà kỳ
đó đã kết thúc trước khi `R` tồn tại.

Cày cho một kỳ quay tương lai thì hỏng vì lý do khác: seed của kỳ quay đó chưa được sinh ra, và
nó không đoán trước được.

## Việc kiểm chứng chứng minh được gì, và không chứng minh được gì

Nói cho chính xác chuyện này chính là mục đích của trang.

**Nó chứng minh:**

- Seed được sinh trên chuỗi, bên trong một giao dịch, dưới khoá của mạng, và được công bố đúng
  một lần.
- Giá trị giải và phần thanh khoản đem ra được chốt trước khi seed đó tồn tại.
- Quy tắc áp cho mọi người gửi là công khai, đồng nhất và ai cũng tính lại được.
- Giá trị giải suy ra từ thanh khoản của hạng và các tham số của hạng bằng số học công khai.
- Số giải mà mỗi hạng đã trả khớp với phần hạng đó đem ra trừ đi phần quay về trong phần dư của
  nó.
- Pool đã cấp vốn cho mọi khoản ghi có mà vault đã viết, vì bộ đếm khoản chưa cấp vốn được công
  bố và bằng không.

**Nó không chứng minh:**

- Rằng bộ sinh của coprocessor là đều. Đó là cỗ máy của Zama, và nó được tin chứ không được kiểm
  chứng ở đây.
- Rằng dịch vụ quản lý khoá đã ký đúng bản rõ thật của cái handle seed. Hợp đồng kiểm chữ ký,
  không kiểm ngữ nghĩa. Một nhóm không lương thiện có thể ký một giá trị do họ chọn. Mọi ứng
  dụng trên protocol này đều chung giả định đó; nó là kẻ tấn công số 8 trong
  [mô hình mối đe doạ](threat-model.md).
- Rằng cái bậc được công bố thật sự là bậc của tổng trọng số mọi người gửi. Người ngoài không
  cộng được các trọng số đã mã hoá, và giờ cũng không thấy được cái tổng. Thứ họ có thay vào đó
  là: cùng một đoạn mã công khai, bất biến đã tính các phép so và trọng số của từng người gửi từ
  cùng những mốc quan sát, và các bất biến về bảo toàn vẫn đúng: số đã trả bằng số đã ghi có, và
  không ai rút quá tiền gốc cộng tiền thưởng.
- Bất cứ điều gì về việc ai đã trúng. Đó mới là toàn bộ mục đích, và đó là lý do công bố nhiều
  hơn sẽ làm việc kiểm chứng mạnh lên còn sản phẩm thì tệ đi. Việc công bố tổng chính xác là ví
  dụ cụ thể: nó làm quy mô của pool kiểm được, và nó cũng làm khoản gửi của người duy nhất dịch
  chuyển bị moi ra tới từng đơn vị cơ sở.

## Người gửi kiểm được gì mà người khác không kiểm được

Người gửi đi xa hơn người ngoài được một bước, vì họ giải mã được trọng số của chính mình và
khoản ghi có của chính mình cho một kỳ quay.

1. Mở xem trọng số của bạn cho kỳ quay `p`.
2. Tự tính lại các ngưỡng của mình từ `R` và `M` công khai, hoặc đọc chúng từ `thresholdOf`.
3. Đếm xem bạn vượt được bao nhiêu cái, nhân với giá trị giải của hạng đó.
4. Mở xem khoản ghi có của bạn cho kỳ quay `p` và kiểm xem có khớp không.

Nếu không khớp thì hoặc là một hạng giải đã cạn trước khi vòng duyệt chạm tới bạn, tức phép kẹp
đã được ghi trong tài liệu, hoặc là có gì đó sai và bạn có sẵn những con số để chứng minh. Ứng
dụng làm cả bốn bước hộ bạn và hiển thị phép tính.
