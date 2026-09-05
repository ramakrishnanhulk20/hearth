# Chọn người trúng

Đây là trái tim của sản phẩm: quyết định ai trúng, trên những con số không ai đọc được, theo
một cách mà người lạ vẫn kiểm được.

**Câu quan trọng nhất: người trúng được chốt ngay tại kỳ quay, và việc duyệt chỉ ghi lại điều
đó.** Ngay khi pool kiểm chứng xong seed ngẫu nhiên và bậc mà tổng của pool rơi vào, kết quả
của mọi người gửi ở mọi hạng giải đã được định đoạt. Các ngưỡng là những con số công khai mà ai
cũng tính lại được, còn trọng số mã hoá đem ra so với chúng thì không đổi được nữa. Việc duyệt
chỉ là ghi sổ. Nó không thể bị lái, bị chen ngang, hay bị bỏ qua theo cách làm đổi người
trúng.

## Những gì được chốt khi một kỳ quay được trao giải

| Ký hiệu | Nó là gì | Công khai? |
| --- | --- | --- |
| `R` | Seed ngẫu nhiên cho kỳ quay này | Có, sau khi kỳ kết thúc |
| `M` | Bậc mà tổng trọng số của pool rơi vào, một luỹ thừa hai | Có, sau khi kỳ kết thúc |
| `prize[t]` | Một giải ở hạng `t` trả bao nhiêu | Có, chốt lúc đóng |
| `offered[t]` | Phần thanh khoản hạng `t` góp cho kỳ quay này | Có, chốt lúc đóng |
| `count[t]` | Hạng `t` đem ra bao nhiêu giải mỗi kỳ quay | Có, chốt lúc triển khai |
| `odds[t]` | Hạng `t` nổ bao nhiêu lần, dưới dạng phân số | Có, chốt lúc triển khai |
| `W` | Tổng số dư bình quân theo thời gian của pool trong kỳ | **Không. Không bao giờ công bố** |
| `twab` | Số dư bình quân theo thời gian của một người gửi trong kỳ | Không, đã mã hoá, chỉ người gửi đó đọc được |

Hai dòng cuối là phần bí mật. `twab` là của từng người. `W` là tổng của mọi `twab`, và nó bị
giữ lại vì công bố chính xác nó là trao cho người quan sát một cách moi ra số tiền gửi của
người duy nhất dịch chuyển, chỉ bằng phép trừ. Thứ mà kỳ quay chạy trên đó thay vào đó là `M`:
luỹ thừa hai nhỏ nhất bằng hoặc lớn hơn `W`. Vậy nên `M` nằm đâu đó giữa `W` và `2W`, và điều
duy nhất người quan sát biết được từ kỳ quay này sang kỳ quay khác là pool có vượt qua một luỹ
thừa hai hay không.

## Quy tắc của PoolTogether, và của chúng tôi

PoolTogether V5 cho mỗi người gửi `count[t]` cơ hội độc lập ở hạng `t`. Mỗi cơ hội trúng với
xác suất `min(1, twab * odds[t] / W)`. Vậy nên số giải kỳ vọng của một người gửi ở một hạng là
phần của họ trong pool, nhân với tỷ lệ của hạng, nhân với số giải.

Làm đúng như thế trên những con số đã mã hoá sẽ phải rút một số ngẫu nhiên mới cho mỗi người
gửi ở mỗi giải, và sẽ cần đúng con số `W`. Hearth tái tạo cùng hình dạng đó bằng một số ngẫu
nhiên đều cho mỗi người gửi ở mỗi hạng, một cái thang ngưỡng lồng nhau, và `M` thay cho `W`.

Đặt `z = twab * odds[t] * count[t] / M`. Đó là số giải kỳ vọng mà người gửi này trúng ở hạng
này. Hearth trả cho họ `floor(z)` hoặc `ceil(z)` giải, chặn trên tại `count[t]`, và trung bình
qua nhiều kỳ quay thì đúng bằng `z`.

Vì mẫu số là `M` chứ không phải `W`, kỳ vọng của mọi người gửi bị co lại theo hệ số `W / M`,
một số nằm giữa một nửa và một. Cộng tất cả người gửi lại thì mỗi kỳ quay một hạng trả từ một
nửa tới toàn bộ số giải danh nghĩa `count * odds` của nó. Không có gì mất đi vì chuyện đó.
Phần một hạng không trả sẽ nằm lại trong phần dư mã hoá của nó và được đem ra lần nữa ở lần
đóng kế tiếp, nên theo thời gian toàn bộ lợi suất vẫn đi ra hết; chỉ là giá trị giải đứng cao
hơn. Xem [giải thưởng và các hạng giải](prizes-and-tiers.md).

## Phép thử, từng bước một

Với người gửi `u` ở hạng `t` của kỳ quay `p`:

1. Sinh ra số ngẫu nhiên của họ cho hạng này. `prn = keccak256(R, p, u, t)`. Vì địa chỉ của
   người gửi và chỉ số hạng đều đi vào hàm băm, mỗi người gửi có số riêng của mình và mỗi hạng
   có một số khác, tất cả từ một seed `R` duy nhất.
2. Rút gọn nó về bậc. `r = prn mod M`, một số nguyên từ `0` tới `M - 1`. `M` là luỹ thừa hai,
   nên đây chỉ là phép chia lấy dư một hàm băm 256 bit cho một luỹ thừa hai, và nó đều tuyệt
   đối, không có độ lệch nào phải chỉnh. Đây là phép tính công khai trên các giá trị công khai.
3. Dựng cái thang. Với mỗi giải `k` từ `0` tới `count[t] - 1`:
   `threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))`.
   Đây là những con số công khai. Ai cũng tính chúng cho địa chỉ bất kỳ được, và hợp đồng đưa
   ra đúng phép tính đó dưới dạng hàm view, `thresholdOf(drawId, saver, tier, k)`, nên bảng
   kiểm chứng của ứng dụng, các bài kiểm thử và mọi bên kiểm bên ngoài đều dùng chung một bản
   cài đặt.
4. So sánh. Giải `k` thắng khi trọng số mã hoá của người gửi lớn hơn `threshold_k`. Đây là
   bước duy nhất chạm vào một bí mật, và nó là một phép so mã hoá cho kết quả là một giá trị
   đúng hoặc sai đã mã hoá mà không ai đọc được.
5. Trả. Mỗi giải thắng được cộng `prize[t]` vào khoản chi mã hoá của người gửi cho hạng này,
   bằng một phép chọn mã hoá chứ không phải một câu lệnh if, nên giao dịch trông y hệt nhau dù
   họ trúng con số không hay trúng hết.
6. Kẹp. Khoản hạng đó trả cho người gửi này là giá trị nhỏ hơn giữa số họ trúng và số hạng đó
   còn lại. Phép trừ ấy cập nhật phần thanh khoản mã hoá còn lại của hạng.
7. Ghi có. Số đã kẹp được cộng vào tiền thưởng mã hoá của người gửi.

Các ngưỡng tăng dần theo `k`, nên một người gửi trúng các giải từ `0` tới `j-1` với một `j`
nào đó rồi dừng. Điều kiện cho giải `k` đúng bằng
`twab * odds * count > r + k * M`.

### Đúng một nhánh chạy trên bản rõ

Nếu một ngưỡng lớn hơn `2^64 - 1` thì không trọng số 64 bit nào vượt nổi nó, nên câu trả lời
là sai và phép so bị bỏ qua hoàn toàn. Chuyện này xảy ra với một hạng có tỷ lệ thấp khi `M`
rất lớn. Vì ngưỡng chỉ tăng theo `k`, vòng lặp của hạng đó dừng ngay tại ngưỡng đầu tiên như
vậy thay vì kiểm nốt phần còn lại. Nhánh đó rẽ trên một con số công khai. Không có chỗ nào
trong Hearth rẽ nhánh trên một bí mật.

## Ví dụ tính tay: ba người gửi, một hạng giải

Một pool tí hon, để các con số còn đọc được. Một hạng giải: hạng giải thường, `count = 4`,
`odds = 1` (tức là `oddsNum = 1`, `oddsDen = 1`). Trọng số tính bằng số-dư-giây của token mà
pool đó nắm giữ; ví dụ này đọc chúng như USDC.

| Người gửi | Trọng số | Phần trong `W` | `z = trọng số * 4 / M` |
| --- | --- | --- | --- |
| Ada | 600 | 60% | 2,34 |
| Ben | 300 | 30% | 1,17 |
| Cy | 100 | 10% | 0,39 |
| **Tổng `W`** | **1.000** | 100% | **3,91** |

`W` là 1.000, nên bậc là `M = 1.024`, luỹ thừa hai nhỏ nhất bằng hoặc lớn hơn nó. Không ai
ngoài pool nhìn thấy con số 1.000. Họ thấy 1.024.

Chú ý cột tổng. Khoản chi danh nghĩa của hạng này là `count * odds = 4` giải mỗi kỳ quay. Số
nó thực sự kỳ vọng phải trả là `4 * W / M = 4 * 1000 / 1024 = 3,91`. Đó chính là hệ số co
`W / M`, và ở đây nó là mức hụt 2,3 phần trăm vì 1.000 nằm gần đỉnh bậc của nó. Một pool cỡ
520 sẽ nằm gần đáy cùng bậc đó và hạng này sẽ kỳ vọng trả khoảng 2,03 giải.

Giờ kỳ quay diễn ra. Số `r` của mỗi người gửi đến từ việc băm seed với chính địa chỉ của họ,
nên mỗi người một số khác nhau, và nó rơi vào khoảng từ 0 tới 1.023.

**Ada, `r = 271`.** Các ngưỡng là `floor((271 + k * 1024) / 4)`:

| k | Ngưỡng | Trọng số 600 của Ada có vượt không? |
| --- | --- | --- |
| 0 | 67 | Có |
| 1 | 323 | Có |
| 2 | 579 | Có |
| 3 | 835 | Không |

Ada trúng 3 giải. Kỳ vọng của cô là 2,34, nên 3 là phía cao của `floor` hoặc `ceil`.

**Ben, `r = 812`.** Các ngưỡng `floor((812 + k * 1024) / 4)`:

| k | Ngưỡng | Trọng số 300 của Ben có vượt không? |
| --- | --- | --- |
| 0 | 203 | Có |
| 1 | 459 | Không |

Ben trúng 1 giải, so với kỳ vọng 1,17.

**Cy, `r = 155`.** Các ngưỡng `floor((155 + k * 1024) / 4)`:

| k | Ngưỡng | Trọng số 100 của Cy có vượt không? |
| --- | --- | --- |
| 0 | 38 | Có |
| 1 | 294 | Không |

Cy trúng 1 giải. Kỳ vọng của anh là 0,39, nên đây là ngày đẹp trời của anh. Qua nhiều kỳ quay,
khoảng 39 phần trăm số lần anh trúng một giải và những lần còn lại không trúng gì.

Năm giải đã được phát ra trong khi kỳ vọng là 3,91. Không sao cả: mỗi giải bằng một phần tám
thanh khoản của hạng, nên hạng đó trả được tám giải rồi mới cạn. Xem
[tình huống vượt số giải](prizes-and-tiers.md).

Giờ hãy để ý người quan sát nhìn thấy gì sau tất cả những chuyện đó. Họ tự lập được cả ba
bảng, vì `R`, `M`, các ngưỡng và các địa chỉ đều công khai. Thứ họ không làm được là điền cột
bên phải, vì các trọng số đều đã mã hoá, và họ cũng không moi ra được con số 1.000, vì chỉ có
1.024 được công bố. Sau khi hạng giải đối soát, trễ một kỳ quay, họ biết hạng đó đã trả bao
nhiêu giải. Họ không bao giờ biết trả cho ai.

## Vì sao chia nhỏ ví chẳng được gì

Đây là tính chất mà một phiên bản làm ẩu sẽ đánh mất.

Số giải kỳ vọng của một người gửi ở một hạng là `z = twab * odds * count / M`, tuyến tính theo
trọng số của họ, và `M` không phụ thuộc vào việc trọng số của pool được chia ra sao giữa các
địa chỉ. Tách một trọng số 600 thành hai ví mỗi ví 300 thì mỗi ví được `z = 1,17`, tổng cộng
2,34. Y hệt. Tách thành sáu ví mỗi ví 100 thì mỗi ví được 0,39, tổng 2,34. Lại y hệt. Không có
ngưỡng nào để lách và không có phần làm tròn nào để cày, chỉ có thêm gas phải trả.

Một phiên bản trước của thiết kế này gộp số giải vào một vùng thắng rộng duy nhất, khiến mỗi
người gửi trúng nhiều nhất một giải ở mỗi hạng. Cách đó chặn người giữ nhiều xuống dưới phần
công bằng của họ và trả tiền cho việc chia nhỏ ví. Một lượt rà soát thiết kế đã bắt được và
cái thang lồng nhau thay thế nó.

## Chi phí của nó

Với mỗi người gửi trong mỗi kỳ quay, phần việc mã hoá gồm: một phép nhân và một phép cộng để
tính trọng số, rồi với mỗi hạng là một phép so và một phép chọn cho mỗi giải, cộng thêm một
phép kẹp. Với ba hạng giải trên Sepolia thì đó là 6 phép so, 6 phép chọn và khoảng một tá phép
cộng, trừ và lấy giá trị nhỏ nhất.

Zama công bố ngân sách mỗi giao dịch trên Sepolia là 20.000.000 đơn vị tính toán tổng cộng với
5.000.000 ở độ sâu tuần tự, và định giá một phép cộng 64 bit là 162.000, một phép so khoảng
118.000, một phép chọn 55.000 và một phép nhân với số công khai 365.000. Những con số đó đặt
một người gửi ở mức vài triệu đơn vị tính toán, và đó là lý do việc duyệt được gom lô `4` người
gửi mỗi giao dịch. Con số đo được là
`3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)` cho mỗi người gửi và mức gas đo được là `708,836 (the marginal cost of one more saver in a batch; a batch of one costs 1,291,192)`.

## Trang này không nói tới điều gì

Nó không nói tới `R` đến từ đâu hay cách kiểm chứng nó, chuyện đó ở
[tính ngẫu nhiên và cách kiểm chứng](../security/randomness-and-verification.md). Nó không
nói tới cách `prize[t]` được định cỡ hay chuyện gì xảy ra khi một hạng cạn giữa chừng một kỳ
quay, chuyện đó ở [giải thưởng và các hạng giải](prizes-and-tiers.md). Và nó không hề khẳng
định là có che giấu ai đã tham gia: danh sách người gửi, các lô duyệt và số giải theo từng
hạng đều công khai. Xem [những gì được giữ kín](../security/what-stays-private.md).
