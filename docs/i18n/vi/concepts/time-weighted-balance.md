# Số dư bình quân theo thời gian

Tỷ lệ trúng của bạn trong một kỳ quay không dựa trên số bạn đang giữ lúc kỳ quay diễn ra. Nó
dựa trên số dư trung bình của bạn suốt cả kỳ. Trang này giải thích vì sao, việc gửi muộn phải
trả giá thế nào, và vì sao vault chỉ cần nhớ ba thời điểm cho mỗi người gửi.

## Vì sao lấy trung bình, không lấy số cuối kỳ

Hãy xét thiết kế đơn giản trước: tính trọng số cho mọi người theo số dư ngay khoảnh khắc kỳ
quay diễn ra. Nó dễ làm, và nó hỏng.

Kẻ tấn công gửi vào một khoản lớn, chờ kỳ quay, trúng, rồi rút ra. Tiền của họ nằm trong pool
đúng một block. Họ không sinh lợi suất cho ai, không gánh rủi ro nào, mà lấy mất giải thưởng
do những người gửi kiên nhẫn nuôi. Rồi kỳ quay sau họ lại làm y hệt.

Chúng tôi đã thực thi kịch bản này lên chính thiết kế trước đó của mình vào ngày 2 tháng 9 năm
2026. Trong một pool có một người gửi trung thực giữ 100 USDC, kẻ tấn công quay vòng 9.000
USDC ra vào quanh mỗi kỳ quay đã trúng 19 trên 20 kỳ và vét sạch khoản dự trữ giải thưởng
5.000 USDC. Vốn của kẻ tấn công chưa bao giờ gặp rủi ro, vì một pool không thua lỗ, theo đúng
định nghĩa, sẽ trả lại vốn. Cả vòng quay đó thậm chí gói gọn trong một giao dịch: gửi, mở kỳ
quay, quét, rút, hết 2.189.992 gas.

Cách sửa chính là cách PoolTogether dùng. Tài liệu của họ nói thế này: khả năng nhìn ngược
thời gian là quan trọng "để người dùng có thể tự do gửi vào và rút ra khỏi một prize pool mà
phần đóng góp thanh khoản của họ vẫn được đo hoàn hảo". Hãy đo phần đóng góp, đừng đo bức ảnh
chụp một khoảnh khắc.

## Một khoản gửi muộn đáng giá bao nhiêu

Một kỳ dài 3.600 giây ở pool USDC và 21.600 giây ở sáu pool còn lại. Trọng số là số dư nhân
với số giây đã giữ, nên nó được đo bằng đơn vị số-dư-giây của chính token trong pool đó. Ví dụ
bên dưới là pool USDC theo giờ.

| Người gửi | Họ đã làm gì | Trọng số trong kỳ |
| --- | --- | --- |
| Ada | Giữ 100 USDC suốt cả 3.600 giây | 100 x 3600 = 360.000 |
| Ben | Gửi 1.000 USDC khi còn 360 giây | 1.000 x 360 = 360.000 |
| Cy | Giữ 1.000 USDC suốt cả kỳ | 1.000 x 3600 = 3.600.000 |

Ben bỏ vào gấp mười lần tiền của Ada mà mua được đúng bằng ấy tỷ lệ trúng, vì anh ta chỉ có
mặt một phần mười thời gian. Cy, người làm đúng cái việc mà sản phẩm này sinh ra để phục vụ,
có tỷ lệ trúng gấp mười lần cả hai người kia.

Trường hợp ngược lại cũng vậy. Rút ra ngay khi một kỳ quay đóng thì bạn vẫn giữ được phần
trọng số đã kiếm cho kỳ vừa xong, và bạn hầu như không mang gì sang kỳ sau. Bạn không thuê
được tỷ lệ trúng.

Chẳng điều nào trong số này ngăn được một người thực sự giữ số dư lớn suốt cả kỳ trúng thường
xuyên. Đó không phải tấn công. Đó là sản phẩm đang chạy đúng: tiền của họ nằm trong pool, sinh
ra phần lợi suất trả giải cho tất cả mọi người, suốt cả kỳ.

## Vault ghi nhớ bằng cách nào

Vault lưu ba bức ảnh chụp cho mỗi người gửi, gọi là các mốc quan sát. Mỗi mốc giữ ba thứ: một
tổng luỹ kế số-dư-giây, số dư ngay sau lần thay đổi đó, và dấu thời gian. Ba ô đó tên là
`current`, `previous` và `older`.

Tổng luỹ kế được đặt lại về không ở đầu mỗi kỳ. Chính lần đặt lại đó giữ cho con số nhỏ: trong
một kỳ, nó không bao giờ vượt quá số dư nhân với độ dài kỳ.

Khi số dư của bạn thay đổi, một trong ba chuyện sau xảy ra:

- **Lần thay đổi đầu tiên trong đời bạn.** Ô `current` được tạo ra với tổng luỹ kế bằng không
  và số dư mới của bạn.
- **Một thay đổi trong cùng kỳ với `current`.** Vault cộng thêm phần số-dư-giây bạn kiếm được
  kể từ lần thay đổi trước, rồi ghi đè `current` tại chỗ. Không tốn ô mới nào.
- **Một thay đổi ở kỳ muộn hơn kỳ của `current`.** Ba ô dịch xuống: `older` nhận `previous`
  cũ, `previous` nhận `current` cũ, và một `current` mới được ghi, mang theo phần số-dư-giây
  bạn kiếm được từ đầu kỳ này tới lúc đó.

Việc đọc trọng số của bạn cho kỳ `p` dùng mốc quan sát mới nhất tại hoặc trước kỳ đó:

- Nếu mốc đó nằm trong kỳ `p`, trọng số của bạn là tổng luỹ kế nó mang theo cộng với số dư của
  bạn nhân với số giây từ khoảnh khắc đó tới hết kỳ.
- Nếu mốc đó nằm trước kỳ `p`, tức bạn không hề đụng vào số dư trong cả kỳ, thì trọng số của
  bạn đơn giản là số dư đó nhân với trọn độ dài kỳ.
- Nếu bạn không có mốc quan sát nào tại hoặc trước kỳ `p`, tức bạn chưa phải người gửi, thì
  trọng số của bạn bằng không. Trường hợp đó được quyết định từ các dấu thời gian công khai,
  không cần một phép tính mã hoá nào.

Mỗi bước mã hoá ở đây là một phép nhân với một số công khai và một phép cộng. Đó là thứ giữ
cho việc duyệt đủ rẻ để gom lô.

Một chi tiết quan trọng cho lập luận đếm ở dưới. Mọi lần lấy tiền ra đều ghi một mốc quan sát,
dù nó có động vào tiền gốc hay không, vì vault không nhìn thấy lệnh rút lấy từ ô nào trong hai
số dư của bạn. Chuyện đó vô hại: một ô chỉ dịch khi một kỳ mới đã bắt đầu, nên rút riêng tiền
thưởng không tốn thêm ô nào ngoài cái ô mà kỳ của bạn đằng nào cũng dùng tới.

## Vì sao ba mốc quan sát là đủ

Đây là câu hỏi mà một người rà soát nên đặt ra, và câu trả lời là một lập luận đếm.

Một ô mới chỉ được đẩy vào khi một lần đổi số dư rơi vào kỳ muộn hơn kỳ mà `current` đang nằm.
Mỗi kỳ nhiều nhất chỉ có một lần đẩy, dù bạn gửi hay rút bao nhiêu lần trong kỳ đó.

Kỳ quay `p` chỉ đóng, trao giải và duyệt được trong kỳ `p+1` và `p+2`. Vậy nên tới lúc có
người đọc trọng số của bạn cho kỳ `p`, nhiều nhất là hai kỳ sau `p` đã bắt đầu, và do đó nhiều
nhất là hai mốc quan sát mới đã được đẩy chồng lên cái mốc mới nhất tại hoặc trước kỳ `p`. Ba
ô là đủ chứa: cái ta cần, cộng với nhiều nhất hai cái rơi xuống sau nó.

Đó là lý do cửa sổ dài hai kỳ chứ không dài hơn. Nới cửa sổ ra thì bạn cần ô thứ tư; giữ nó ở
một kỳ thì chỉ một lần relayer trả lời chậm là mất một kỳ quay, mà một kỳ ngắn khiến chuyện đó
dễ xảy ra tới mức đau đớn. Việc đóng có hạn chót riêng, sớm hơn cuối cửa sổ nửa kỳ, nên vẫn ba
ô đó luôn phủ được vòng đi về diễn ra sau một lần đóng.

Vault giữ đúng ba mốc quan sát như vậy cho tổng số dư của pool, nên tổng trọng số của một kỳ
được tính bằng đúng quy tắc ấy và có hiệu lực trong cùng cửa sổ ấy. Tổng đó không bao giờ được
công bố. Thứ vault công bố là bậc luỹ thừa hai nằm trên nó, và nó tính ra bậc ấy bằng cách so
chính con số luỹ kế đó với năm luỹ thừa hai cố định, tất cả dưới dạng mã hoá. Xem
[những gì được giữ kín](../security/what-stays-private.md).

## Hai giới hạn về độ lớn

Giá trị mã hoá ở đây là số nguyên không dấu 64 bit, nên phép tính phải nằm gọn trong khoảng
đó. Một số mã hoá bị tràn còn tệ hơn một số thường bị tràn, vì không có gì revert và không ai
nhìn thấy nó xảy ra.

**Trên mỗi người gửi.** Vault từ chối mọi khoản gửi mà số tiền của nó, hoặc tiền gốc sau khi
cộng vào, vượt quá `maxPrincipal = (2^64 - 1) / L`. Với kỳ một giờ thì đó là khoảng 5 tỷ
token, kỳ sáu giờ khoảng 854 triệu, và kỳ một ngày khoảng 213 triệu. Vì tổng luỹ kế của bạn
không thể vượt quá số dư nhân độ dài kỳ, còn số dư của bạn không thể vượt trần đó, nên tổng
luỹ kế của bạn không thể vượt 64 bit. Lời từ chối được trả về dưới dạng một giá trị false đã
mã hoá và token hoàn tiền cho bạn trong cùng giao dịch, nên chạm trần cũng không để lộ số dư
của bạn.

Phép kiểm chặn cả số tiền vào lẫn kết quả, và vế thứ hai đó không phải để trang trí. Phép cộng
trên số mã hoá tràn vòng ở 64 bit mà không revert, nên một khoản gửi bằng `2^64` trừ đi tiền
gốc của bạn sẽ cho tổng bằng không, và một phép kiểm chỉ nhìn vào tổng sẽ cho nó đi qua. Khi
cả số tiền lẫn tiền gốc sẵn có đều bị giữ dưới trần, tổng không thể chạm tới `2^64` ở bất kỳ
độ dài kỳ nào mà hàm khởi tạo cho phép, nên việc tràn vòng là bất khả chứ không chỉ là khó
xảy ra.

**Với tổng của pool.** Bộ luỹ kế của tổng là 128 bit chứ không phải 64, nên tổng không thể
tràn với bất kỳ lượng cung nào mà lớp bọc mint nổi.

Một phiên bản trước của thiết kế này từng khẳng định bộ luỹ kế 64 bit không thể tràn. Điều đó
sai, một lượt rà soát thiết kế đã bắt được, và cái trần cộng với tổng 128 bit là cách sửa.

## Trang này không nói tới điều gì

Nó không nói tới chuyện gì xảy ra khi trọng số của bạn đã biết. Đó là
[phép thử người trúng](winner-selection.md). Nó cũng không khẳng định rằng tính trọng số theo
thời gian là một tính năng riêng tư: trọng số của bạn được mã hoá, nhưng bậc mà tổng của pool
rơi vào thì được công bố mỗi kỳ quay, và khi có rất ít người gửi thì cái bậc ấy ghim được một
trọng số trong sai số gấp đôi. Xem
[những gì được giữ kín](../security/what-stays-private.md).
