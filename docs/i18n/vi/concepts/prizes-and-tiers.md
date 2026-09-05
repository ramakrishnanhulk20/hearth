# Giải thưởng và các hạng giải

Lợi suất đi vào thành một cục mỗi kỳ. Các hạng giải là cách cục tiền đó biến thành một hỗn hợp
gồm nhiều giải nhỏ thường xuyên và một giải lớn hiếm hoi. Trang này giải thích phần tiền bạc:
thanh khoản được chia ra sao, một giải được định cỡ thế nào, chuyện gì xảy ra khi một hạng trả
nhiều hơn dự tính, và ba chỗ chúng tôi cố ý làm khác PoolTogether V5.

Giá trị giải, thanh khoản của hạng và số giải luôn công khai trong PoolTogether, và ở đây phần
bản rõ của cả ba cũng công khai. Thứ vẫn được mã hoá là ai trúng, cùng một tổng luỹ kế cho mỗi
hạng gọi là phần dư.

## Thanh khoản và phần chia

Mỗi hạng giải giữ một quỹ gọi là thanh khoản của nó, bằng những con số thường mà ai cũng đọc
được. Hai dòng tiền chảy vào đó:

- **Các lần thu hoạch.** Mỗi lần trao giải sẽ chia phần thu hoạch đã kiểm chứng cho các hạng
  theo trọng số phần chia của chúng. Phần dư nguyên của phép chia đó, tức vài đơn vị cơ sở lẻ
  không chia hết, được đưa cho hạng giải lớn thay vì bị bỏ đi. Một khoản thu hoạch ghi sổ lúc
  trao giải của kỳ quay `p` sẽ được đem ra ở lần đóng kế tiếp, không phải ở chính kỳ quay `p`.
- **Phần dư đã đối soát.** Bất cứ thứ gì một hạng đem ra ở một kỳ quay trước mà không ai trúng
  sẽ quay về khi hạng đó đối soát, trên Sepolia là trễ một kỳ quay.

Mỗi hạng còn giữ một quỹ thứ hai, gọi là **phần dư**, và quỹ này thì được mã hoá. Nó là tổng
luỹ kế của mọi thứ hạng đó đem ra mà không ai trúng, và nó được cộng vào phần hạng đó đem ra ở
mỗi lần đóng, dù độ lớn của nó là bí mật.

Lúc đóng, với mỗi hạng giải:

```
prize[t]     = liquidity[t] * UTILISATION / count[t]     // plaintext only
offered[t]   = liquidity[t] + carry[t]                   // plaintext plus encrypted
liquidity[t] = 0                                         // until the tier reconciles
```

Có hai điều rút ra từ đó. Giá trị giải chỉ đến từ phần bản rõ, và đó là thứ giữ cho chúng công
khai. Phần dư mã hoá chỉ có thể thêm sức chi trả, nên một hạng luôn có khả năng trả ít nhất
bằng cái giá trị giải công khai của nó gợi ý.

`UTILISATION` là 50 phần trăm. Đó là tỷ lệ sử dụng của PoolTogether, và nó là hàng phòng thủ
cho tình huống vượt số giải: một hạng đem ra toàn bộ thanh khoản của mình nhưng định cỡ mỗi
giải như thể chỉ có một nửa. Nhờ vậy một hạng trả được gấp đôi số giải nó kỳ vọng trước khi
cạn.

**Tất cả những điều này được chốt lúc đóng, trước khi seed ngẫu nhiên của kỳ quay đó tồn
tại.** Seed được rút sau đó trong cùng giao dịch. Không ai nhìn thấy seed, tính ra là mình
trúng, rồi chuyển tiền giữa các hạng cho cái giải to hơn được.

## Ba hạng giải trên Sepolia

Mỗi pool mang bộ hạng giải riêng của mình, vì tỷ lệ trúng là một phân số tính theo chính kỳ của
pool đó. Pool USDC theo giờ:

| Hạng giải | Số giải mỗi kỳ quay (`count`) | Tỷ lệ | Phần chia | Đối soát mỗi | Cảm giác thế nào |
| --- | --- | --- | --- | --- | --- |
| Giải lớn | 1 | 1 trên 24 | 40 | 1 kỳ quay | Hiếm và lớn |
| Giải vừa | 1 | 1 trên 6 | 20 | 1 kỳ quay | Vài lần một ngày |
| Giải thường | 4 | 1 trên 1 | 40 | 1 kỳ quay | Bốn giải mỗi kỳ quay |

Sáu pool quay sáu giờ một lần giữ nguyên số giải, phần chia và nhịp đối soát, chỉ đổi tỷ lệ:
giải lớn 1 trên 4, giải vừa 1 trên 2, giải thường 1 trên 1. Một kỳ quay sáu giờ thì hiếm gấp
sáu lần, nên tỷ lệ 1 trên 4 làm giải lớn rơi khoảng một lần mỗi ngày, đúng nhịp mà bộ theo giờ
tạo ra. Hạng giải vừa là chỗ khác biệt duy nhất: khoảng hai lần một ngày ở các pool sáu giờ so
với khoảng bốn lần một ngày ở pool theo giờ. Vì sao lại là sáu giờ: [pool và
token](pools-and-tokens.md).

Tổng phần chia là 100 ở cả hai bộ, nên hạng giải lớn lấy 40 phần trăm mỗi lần thu hoạch, hạng
giải vừa 20 phần trăm và hạng giải thường 40 phần trăm. Mọi hạng giải của mọi pool đều đối soát
mỗi kỳ quay, đó là một lựa chọn có cái giá ở cả hai phía; nó có mục riêng ở dưới.

### Những thiết lập đó tạo ra cái gì

Ký hiệu `H` là phần thu hoạch gom được trong một kỳ. Số giải kỳ vọng danh nghĩa của một hạng ở
mỗi kỳ quay là `count * odds`. Đưa con số đó ngược vào công thức định cỡ thì mỗi hạng ổn định ở
một trạng thái dừng:

| Hạng giải | Thanh khoản lúc ổn định | Giá trị giải | Khoản chi kỳ vọng mỗi kỳ quay | Nổ thường xuyên cỡ nào |
| --- | --- | --- | --- | --- |
| Giải lớn | 19,2 H | 9,6 H | 0,4 H | Khoảng một lần một ngày |
| Giải vừa | 2,4 H | 1,2 H | 0,2 H | Khoảng sáu giờ một lần |
| Giải thường | 0,8 H | 0,1 H | 0,4 H (bốn giải) | Mỗi kỳ quay |

Ba khoản chi kỳ vọng cộng lại đúng bằng `H`. Toàn bộ lợi suất đi ra thành giải thưởng và không
phần nào tích lại mãi mãi.

Bảng đó là của pool theo giờ. Một pool sáu giờ gom được gấp sáu lần trong một kỳ và quay ít hơn
sáu lần, còn tỷ lệ ngắn hơn của nó rải khoản thu nhập đó ra trên cùng số giải: hạng giải lớn ổn
định ở 3,2 H thanh khoản và một giải 1,6 H, hạng giải vừa ở 0,8 H và 0,4 H, còn hạng giải
thường không đổi ở 0,1 H một giải. Đo bằng tiền thật thay vì bằng `H`, giải lớn của một pool
sáu giờ có cùng độ lớn với giải lớn của một pool theo giờ sinh lời cùng tốc độ, vì một kỳ quay
hiếm hơn mang theo lượng thu hoạch gấp sáu.

Đó là các con số danh nghĩa. Kỳ quay chạy trên bậc `M` chứ không phải tổng chính xác `W`, và
`M` nằm giữa `W` và `2W`, nên thực tế mỗi kỳ quay một hạng trả từ một nửa tới toàn bộ số giải
danh nghĩa của nó. Xem [chọn người trúng](winner-selection.md). Phần nó không trả sẽ đi vào
phần dư và được đem ra lần nữa, nên không mất gì; thay vào đó, giá trị giải ổn định ở đâu đó
giữa các con số phía trên và gấp đôi chúng, tuỳ vào việc tổng của pool nằm ở đâu trong bậc của
nó. Một pool nằm gần đỉnh một bậc thì trả sát bảng. Một pool vừa vượt qua một luỹ thừa hai thì
trả ít giải hơn nhưng to hơn trong một thời gian.

Một lý do khiến bảng này mô tả bản triển khai đang chạy chứ không phải một trạng thái lý tưởng:
mọi hạng giải đều đối soát mỗi kỳ quay. Phần một hạng đem ra mà không ai trúng được công bố lúc
chốt kỳ quay đó và ghi thẳng ngược vào thanh khoản công khai của nó, nên thanh khoản lúc ổn
định của một hạng đúng là dừng ở chỗ bảng nói, và cái quỹ ứng dụng hiển thị đúng là cái quỹ
hạng đó đang mang. Với nhịp chậm hơn, cùng số tiền đó vẫn được đem ra và vẫn trúng được, nhưng
nó sẽ nằm trong phần dư mã hoá giữa hai lần đối soát, và phần thanh khoản công khai, tức thứ
định cỡ giải, sẽ chỉ còn là phần thu hoạch ghi sổ kể từ lần đối soát gần nhất của hạng đó. Mục
kế tiếp trình bày đầy đủ sự đánh đổi ấy.

Để có một con số cụ thể, giả sử nguồn USDC trên Sepolia nhỏ giọt 10 USDC mỗi kỳ. Khi đó giải
lớn nằm quanh 96 USDC và rơi khoảng một lần một ngày, giải vừa quanh 12 USDC khoảng sáu giờ
một lần, và bốn giải khoảng 1 USDC rơi ở mỗi kỳ quay, mỗi con số trong đó đều có thể chạy lên
tới gấp đôi tuỳ theo bậc. Tốc độ nhỏ giọt thực tế trên pool đó là
`5,555 base units a second, which is 19.998 USDC a period`, tốc độ của từng pool được liệt kê
trong [pool và token](pools-and-tokens.md), còn giá trị giải thực tế nằm ở thẻ "Pool ngay lúc
này" trên bảng điều khiển của pool đó tại `/app/<slug>`, đọc thẳng từ chuỗi.

Đây là các tham số khởi tạo, chọn theo công thức tỷ lệ của PoolTogether V5 và ghi riêng cho
từng pool trong `packages/contracts/hearth.config.ts`. Một bản triển khai mainnet với kỳ một
ngày sẽ lại dùng bộ tham số khác; xem [triển khai](../operations/deploying.md).

## Nhịp đối soát, và cái giá của việc nâng nó lên

Đối soát một hạng là công bố phần dư của nó, và phần dư đúng bằng số tiền hạng đó đem ra mà
không ai trúng. Lấy phần đem ra trừ đi nó, chia cho giá trị giải, là bạn biết hạng đó đã trả
bao nhiêu giải. Con số ấy là một tiết lộ thật sự: nó là một phép đo trên các số dư đã mã hoá,
có dạng "bao nhiêu người gửi trong nhóm này có trọng số vượt ngưỡng công bố của chính họ".

`reconcileEvery[t]` là cái núm điều chỉnh mức tiết lộ đó, và nó là một tham số khởi tạo cho
từng hạng. Nâng nó lên là giấu số đếm đi bấy nhiêu kỳ quay rồi công bố một con số cho cả quãng
đó. Đặt hạng giải lớn thành 24 thì số đếm của nó thành con số theo ngày, và tập người có thể
là người trúng sẽ là tất cả những ai đủ điều kiện ở bất kỳ thời điểm nào trong ngày, thay vì
khoảng bốn phần trăm số người trong pool đủ điều kiện trong một kỳ quay. Với một hạng 1 trên
24 thì khác biệt đó không phải chuyện hình thức: một số đếm theo từng kỳ quay là gọi tên người
trúng độc đắc trong một nhóm nhỏ.

Cái giá của việc nâng nó lên chính là cái giải độc đắc. Một lần đóng chuyển toàn bộ thanh khoản
công khai của một hạng vào kỳ quay và để hạng đó về không, và số tiền ấy chỉ quay lại ở một lần
đối soát. Nên với nhịp 24, ở 23 trên 24 kỳ quay, thanh khoản công khai của hạng giải lớn chỉ là
phần thu hoạch ghi sổ kể từ lần đối soát trước, giải được công bố định cỡ theo phần chia của
đúng một kỳ quay đó, và cái quỹ tích luỹ chỉ lộ ra ở kỳ quay có đối soát. Trong lúc đó tiền
không hề nằm chơi, vì phần dư mã hoá được cộng vào phần hạng đó đem ra ở mỗi lần đóng và trúng
được suốt. Có điều nó vô hình, và một giải độc đắc mà không ai xem được nó lớn lên thì không
thật sự là giải độc đắc.

Không thể vừa giấu được số đếm giải vừa có một giải độc đắc lớn dần trước mắt mọi người. **Bản
triển khai này chọn giải độc đắc nhìn thấy được.** Cả ba hạng đều chạy ở `reconcileEvery = 1`,
nên phần dư của từng hạng được công bố lúc chốt chính kỳ quay sinh ra nó, được kiểm chứng trên
chuỗi đối chiếu với handle mà vault đã công bố, rồi ghi ngược vào thanh khoản công khai bằng
`reconcile`. Cái quỹ lớn dần công khai, đúng như của PoolTogether, và mỗi hạng đã trả bao nhiêu
giải thì thành công khai trễ một kỳ quay, cũng đúng như của PoolTogether. Cả hai trường hợp đều
không bao giờ lộ ai trúng.

Điều đó biến con số đếm nói trên thành một phần dư đã được tiết lộ, chứ không phải một phần đã
được giảm nhẹ. Lập luận không đổi và vẫn đúng: một số đếm theo từng kỳ quay trên một hạng 1
trên 24 là một phép đo trên nhóm nhỏ người gửi đủ điều kiện ở kỳ quay đó, và nó tích luỹ dần
đối với một số dư không bao giờ dịch chuyển. Nó là phép đo yếu hơn ở các pool sáu giờ, vì hạng
giải lớn của chúng là 1 trên 4, nên mỗi số đếm phủ khoảng một phần tư pool chứ không phải một
phần hai mươi tư, và mỗi ngày có bốn số đếm chứ không phải hai mươi tư. Nó được ghi lại trong
[những gì được giữ kín](../security/what-stays-private.md) và được mang trong
[danh sách giới hạn](../limitations.md). Vẫn có hai thứ hạn chế nó. Các số đếm là thô, vì không
bao giờ có gì mịn hơn một số nguyên giải được công bố. Và các ngưỡng không thể nhắm vào một số
dư bị nghi ngờ, vì seed được rút bên trong coprocessor và chỉ được hé lộ khi kỳ của nó đã kết
thúc.

Một bản triển khai thà chịu phép đo chậm hơn để đổi lấy cái quỹ nhìn thấy được thì cứ vặn núm
lên cao và nhận sự đánh đổi theo chiều ngược lại. Chỉ cần triển khai lại một lần.

## Vượt số giải: khi một hạng trả nhiều hơn dự tính

Các giải độc lập với nhau, nên một hạng kỳ vọng bốn giải đôi khi phát ra sáu, hoặc chín. Mỗi
giải bằng một phần tám thanh khoản của hạng giải thường, nên nó trả được tám giải. Quá số đó là
hạng cạn sạch.

Hearth xử lý chuyện này bằng một bộ đếm mã hoá cho mỗi hạng ở mỗi kỳ quay. Mọi khoản chi đều bị
kẹp xuống theo giá trị nhỏ hơn giữa số người gửi trúng và số hạng đó còn lại, và bộ đếm giảm đi
đúng số đã kẹp. Không giao dịch nào bị revert, và không phép tính của ai bị tràn.

### Người trúng muộn trải nghiệm điều gì

Việc duyệt đi qua danh sách người gửi từ một điểm khởi đầu suy ra từ seed của kỳ quay đó. Nếu
hạng giải cạn giữa chừng vòng duyệt:

- Người gửi đang được duyệt vào đúng lúc đó nhận phần còn lại, có thể ít hơn số giải mà các
  ngưỡng của họ nói là họ đã trúng.
- Những người gửi ở phía sau vòng duyệt không nhận được gì từ hạng đó trong kỳ quay đó. Các
  hạng khác không bị ảnh hưởng: mỗi hạng có bộ đếm riêng.

Không ai mua được chỗ đứng tốt hơn trong hàng đó. Thứ tự vòng duyệt do seed cố định, người gọi
`evaluate` chỉ chọn được đi tiếp bao nhiêu người gửi chứ không bao giờ chọn được là những ai,
và điểm khởi đầu dịch chuyển mỗi kỳ quay, nên không địa chỉ nào đứng cuối một cách hệ thống.

Chuyện này người gửi bị ảnh hưởng nhìn thấy được, chứ không âm thầm. Trọng số đã lưu và khoản
ghi có đã lưu của họ cho kỳ quay đó đều tự họ giải mã được, nên họ tính lại được các ngưỡng của
mình từ seed công khai và thấy khoản ghi có bị hụt.

### Chuyện đó xảy ra thường xuyên cỡ nào

Với hạng giải thường, trong một pool nhiều người gửi nhỏ, số giải phát ra xấp xỉ phân phối
Poisson với kỳ vọng 4, còn hạng đó trả được 8 giải. Xác suất cần tới giải thứ chín là khoảng 2
phần trăm mỗi kỳ quay. Vì kỳ quay chạy trên bậc chứ không phải tổng chính xác, số giải kỳ vọng
thật nằm giữa 2 và 4, nên 2 phần trăm là mức trần chứ không phải trường hợp điển hình. Với hai
hạng có `count = 1`, số giải kỳ vọng thấp hơn một khá nhiều trong khi sức chi trả vẫn là hai,
nên phép kẹp ở đó hiếm hơn tới vài bậc độ lớn.

Phép xấp xỉ đó giả định một pool có nhiều người gửi nhỏ. Trong một pool ba người gửi với quy mô
rất khác nhau thì độ phân tán khác hẳn, và trong pool demo nhỏ trên Sepolia thì dựng ra một kỳ
quay bị kẹp là chuyện dễ. Đó là đặc tính của quy mô bản demo, không phải một lỗi.

## Ba khác biệt cố ý so với PoolTogether V5

Cả ba đều được nói thẳng ở đây thay vì chôn đi, vì người rà soát nào biết V5 cũng sẽ đi tìm
chúng.

### 1. Kỳ quay chạy trên một bậc, không phải tổng chính xác

V5 chạy phép thử người trúng trên đúng tổng nguồn cung của kỳ quay, và nó làm được vì con số
đó công khai trên một chuỗi minh bạch. Công bố tổng chính xác ở đây sẽ làm rò số tiền gửi của
từng người, nên Hearth chỉ công bố bậc luỹ thừa hai nằm trên nó.

Hệ quả đúng là điều đã mô tả ở trên: mỗi kỳ quay một hạng trả từ một nửa tới toàn bộ số giải
danh nghĩa của nó, và giá trị giải ổn định ở mức cao hơn tương ứng. Không mất đồng nào và tỷ lệ
trúng của người gửi nào cũng không bị méo so với người gửi khác, vì mọi người gửi trong một
hạng đều bị co bởi cùng một hệ số `W / M`. Đó là giới hạn số 12.

### 2. Không có hạng dự trữ

V5 trích một phần của mọi khoản đóng góp vào một quỹ dự trữ. Quỹ dự trữ tài trợ cho phần
thưởng khuyến khích người trao giải, và nó đỡ cho một hạng bị vượt số giải bằng cách bù thêm
vào.

Hearth không có quỹ dự trữ. Tỷ lệ sử dụng 50 phần trăm là tấm đệm duy nhất, và đó chính là
phương án thay thế mà tài liệu của chính V5 gọi tên cho những bản triển khai dùng
`tierLiquidityUtilizationRate` vào mục đích này. Hệ quả là phép kẹp đã mô tả ở trên: trong một
kỳ quay hiếm hoi bị vượt số giải, những người trúng cuối cùng theo thứ tự vòng duyệt bị hụt
thay vì được bù thêm.

Chúng tôi chọn thế vì một quỹ dự trữ muốn hữu dụng thì cần một đường rút do chủ sở hữu kiểm
soát, mà mọi quyền của chủ sở hữu trong một pool bảo mật đều là một thứ người gửi buộc phải tin
tưởng. Sự đánh đổi đó được ghi trong [danh sách giới hạn](../limitations.md) ở giới hạn số 4.

### 3. Tỷ lệ của giải lớn được đo trên một kỳ

V5 đo tỷ lệ của hạng giải lớn trên cả cửa sổ tích luỹ của hạng đó, nên cơ hội ôm một cái quỹ đã
tích cả năm phản ánh cả một năm tham gia.

Hearth đo tỷ lệ giải lớn trên một kỳ duy nhất, như mọi hạng khác. Nghĩa là một người giữ nhiều
xuất hiện đúng một kỳ vẫn có một cú bắn trọn theo tỷ lệ vào cái quỹ mà người khác mất 24 kỳ mới
đắp lên. Đó là một sự bất đối xứng có thật và nó được nêu thành giới hạn số 5.

Cách sửa rẻ tiền thì đã biết và đã ghi lại cho một phiên bản sau: theo dõi số-dư-giây tích luỹ
kể từ lần trả giải lớn gần nhất, rồi tính trọng số hạng giải lớn theo đó thay vì theo trọng số
của một kỳ. Nó bị để lại ngoài phiên bản một vì nó thêm một bộ luỹ kế thứ hai kèm phần phân
tích tràn số riêng, và việc phát hành thứ đơn giản hơn nhưng đã được chứng minh trọn vẹn thì
hơn việc phát hành thứ tốt hơn mà chưa được chứng minh.

## Trang này không nói tới điều gì

Nó không nói tới phần thu hoạch đến từ đâu hay được kiểm chứng thế nào, chuyện đó ở
[nguồn lợi suất](yield-source.md). Nó không nói tới phép thử trên từng người gửi để quyết định
ai trúng, chuyện đó ở [chọn người trúng](winner-selection.md). Và nó không đưa ra tuyên bố
riêng tư nào về giá trị giải: những con số đó ở đây là công khai theo thiết kế, còn số đếm giải
được công bố thì tiết lộ những gì, chuyện đó nằm ở
[những gì được giữ kín](../security/what-stays-private.md).
