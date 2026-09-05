# Những gì được giữ kín

Có ba điều đáng quan tâm về tính bảo mật: cái gì vẫn ở dạng mã hoá, kỳ quay có chứng minh được
là công bằng và tính theo số tiền gửi hay không, và mọi lỗ rò đã được gọi tên chưa. Trang này
trả lời điều thứ nhất và điều thứ ba. Quan điểm của chúng tôi là tự mình gọi tên từng đường nối
thì đáng giá hơn một lời tuyên bố mà không ai kiểm được.

Mọi thứ ở đây được viết cho một pool, mà Hearth chạy bảy pool, mỗi pool một token bảo mật.
Chúng không chia sẻ gì với nhau, nên tập ẩn danh của mỗi pool chỉ là những người gửi của chính
nó chứ không phải của ai khác, và một pool ba người gửi chẳng được lợi gì từ việc một pool khác
có ba mươi người.

## Bảng tổng hợp

| Giá trị | Trạng thái | Ai đọc được |
| --- | --- | --- |
| Tiền gốc của bạn | Đã mã hoá | Chỉ mình bạn, bằng chữ ký EIP-712 |
| Tiền thưởng chưa nhận của bạn | Đã mã hoá | Chỉ mình bạn |
| Trọng số theo thời gian của bạn, theo từng kỳ quay | Đã mã hoá | Chỉ mình bạn |
| Khoản ghi có của bạn theo từng kỳ quay, và do đó cả việc bạn có trúng hay không | Đã mã hoá | Chỉ mình bạn |
| Số tiền bạn gửi | Mã hoá từ đầu tới cuối | Chỉ mình bạn |
| Số tiền bạn rút | Mã hoá từ đầu tới cuối | Chỉ mình bạn |
| **Tổng trọng số của pool trong một kỳ** | **Đã mã hoá, không bao giờ công bố** | **Không ai** |
| Phần dư của mỗi hạng giải giữa hai lần đối soát | Đã mã hoá | Không ai |
| Bậc mà tổng của pool rơi vào, một luỹ thừa hai | Công khai khi kỳ kết thúc | Tất cả mọi người |
| Có ai giữ số dư trong kỳ hay không | Công khai khi kỳ kết thúc | Tất cả mọi người |
| Seed ngẫu nhiên của mỗi kỳ quay | Công khai khi kỳ kết thúc | Tất cả mọi người |
| Lợi suất thu hoạch được mỗi kỳ quay | Công khai khi kỳ kết thúc | Tất cả mọi người |
| Giá trị giải và phần thanh khoản bản rõ mà mỗi hạng đem ra | Công khai từ lúc đóng | Tất cả mọi người |
| Hạng giải thường đã trả bao nhiêu giải | Công khai trễ một kỳ quay | Tất cả mọi người |
| Hạng giải vừa đã trả bao nhiêu giải | Công khai trễ một kỳ quay | Tất cả mọi người |
| Hạng giải lớn đã trả bao nhiêu giải | Công khai trễ một kỳ quay | Tất cả mọi người |
| Danh sách địa chỉ người gửi | Công khai | Tất cả mọi người |
| Bạn gửi, rút, hay được duyệt lúc nào, và trong lô nào | Công khai | Tất cả mọi người |
| Bộ đếm khoản chưa cấp vốn | Công khai lúc chốt | Tất cả mọi người |
| Số tiền tài trợ và tốc độ nhỏ giọt | Công khai | Tất cả mọi người |
| Số tiền bạn bọc vào, hoặc bọc ra khỏi, token bảo mật | Công khai | Tất cả mọi người |
| Mọi ngưỡng mà một địa chỉ bất kỳ phải vượt, ở hạng giải bất kỳ | Tính ra được công khai | Tất cả mọi người |

Có hai cách đọc bảng đó. Cột trái, phần bí mật, đúng là thông tin của từng người, cộng thêm hai
con số tổng toàn pool hoá ra cũng là thông tin của từng người đội lốt. Cột phải, phần công
khai, là những gì người ngoài cần để kiểm rằng kỳ quay là trung thực. Chính cách chia đó là
thiết kế.

## Người quan sát tính ra được gì và không tính ra được gì

Một người quan sát có nút lưu trữ đầy đủ và đủ kiên nhẫn thì dựng được:

- Danh sách đầy đủ người gửi và đúng block mà từng người đã hành động.
- Seed, bậc, phần thu hoạch và giá trị giải của mọi kỳ quay, cùng số giải của từng hạng, trễ
  một kỳ quay so với kỳ quay nó thuộc về.
- Mọi ngưỡng mà mọi địa chỉ phải vượt. Họ tính ra được đúng cái thang của bạn theo nghĩa đen.
- Tổng lượng token bảo mật mà pool nắm giữ, dưới dạng một handle mã hoá mà họ không đọc được.

Họ không lấy được:

- Bất kỳ số dư cá nhân nào, ở bất kỳ thời điểm nào.
- Bất kỳ trọng số cá nhân nào, nên cũng không có tỷ lệ trúng của cá nhân nào.
- Địa chỉ nào trúng ở kỳ quay nào, hay ai được trả bao nhiêu.
- Tổng trọng số chính xác của pool, chỉ có luỹ thừa hai nằm trên nó.

Khoảng cách giữa hai danh sách đó chính là thứ Hearth bán. Phần còn lại của trang này là bản
tường trình trung thực về những chỗ khoảng cách ấy hẹp lại.

## Quy tắc 1: cái bậc, và lỗ rò chúng tôi đã bỏ đi

Cho tới ngày 3 tháng 9 năm 2026, thiết kế này công bố tổng số dư bình quân theo thời gian chính
xác `W` của pool ở mỗi kỳ quay, với lập luận rằng công bố nó là thứ làm cho kỳ quay kiểm chứng
được. Một lượt rà soát đã chứng minh lập luận đó quá đắt.

Đây là lỗ rò, theo đúng cách người rà soát trình bày. Với mọi kỳ `p` đã đóng,
`W_p = B * L + tổng theo từng hành động của D_i * (periodEnd(p) - t_i)`, trong đó `B` là tổng
tiền gốc mang vào kỳ và `D_i` là mức thay đổi có dấu do mỗi hành động tạo ra. `B`, `L`,
`periodEnd(p)` và mọi `t_i` đều công khai, vì các sự kiện gửi và rút đều mang theo dấu thời
gian. Vậy nên **người gửi nào là người duy nhất dịch chuyển tiền trong một kỳ thì số tiền đó
moi lại được từ hai con số tổng đã công bố cộng với dấu thời gian công khai của chính giao dịch
họ.** Không phải chặn khoảng, mà là moi lại chính xác, dư bằng không. Càng nhiều dữ liệu càng
tệ chứ không khá lên: mỗi kỳ đã đóng là thêm một phương trình, mỗi hành động là một ẩn số,
chuỗi được neo về không, và các sự kiện gọi tên ai đã hành động vào lúc nào, nên hai người dịch
chuyển giữa hai kỳ im ắng cũng bị moi ra chính xác.

Lỗ rò đó không còn nữa, vì con số nó cần đã không còn được công bố. Thứ vault công bố bây giờ
là cái bậc: luỹ thừa hai nhỏ nhất bằng hoặc lớn hơn `W`, ký hiệu `M`. Năm phép so mã hoá mỗi kỳ
quay theo dõi `W` nằm ở đâu so với bậc của kỳ quay trước, và chỉ có con đếm nhỏ mà chúng cộng
lại là được giải mã. Giữa hai lần vượt qua một luỹ thừa hai, các kỳ quay liên tiếp công bố cùng
một con số, và lấy chúng trừ nhau thì ra không.

Thứ còn lại là một phiên bản nhỏ hơn nhiều của cùng vấn đề đó.

- **Một người gửi.** Bậc công bố chính là trọng số của người đó, sai lệch trong khoảng gấp đôi.
- **Hai người gửi.** Mỗi người trừ đi trọng số của mình là chặn được khoảng của người kia, cũng
  trong sai số gấp đôi.
- **Ba người trở lên.** Mọi cách chia phù hợp với cái bậc đều có thể xảy ra, và tập khả năng
  phình ra theo mỗi người gửi thêm vào.

Ứng dụng nói rõ điều này ở đầu mọi màn hình mỗi khi pool có ít hơn ba người gửi. Chính tài liệu
của Zama cũng nêu đúng ý đó về batcher của họ, bằng đúng câu: "tổng của một giá trị chính là giá
trị đó". Một cái bậc là phiên bản yếu hơn của câu ấy, không phải một lối thoát khỏi nó.

## Quy tắc 2: một số dư mà người quan sát ghim được thì không còn chút riêng tư nào trong kỳ quay

Đây là câu sắc bén nhất trên trang này, nên nó có quy tắc riêng.

Phép thử người trúng là một hàm tất định của đúng một bí mật, tức trọng số của bạn, còn lại
toàn là dữ liệu công khai. Ngưỡng công khai theo thiết kế, vì chúng là thứ làm cho kỳ quay kiểm
được. Vậy nên **ai ghim được số dư của bạn thì tính ra được bạn trúng hay trượt ở mọi hạng giải
của mọi kỳ quay mà không cần giải mã gì cả**, và cũng tính được cho mọi kỳ quay về sau, vì tiền
thưởng nằm ở một số dư riêng không bao giờ tham gia vào tỷ lệ trúng.

Cách một số dư thường bị ghim là đường nối lúc bọc token ở quy tắc 3: bọc một token công khai
thành dạng bảo mật của nó là một lần dịch chuyển công khai, nên người gửi nào bọc rồi vài giây
sau gửi đúng số tiền ấy thì đã công bố khoản gửi của mình. Từ đó trở đi, kết quả các kỳ quay
của họ chỉ là số học công khai.

Ngay cả một cận lỏng cũng cắn được. Một người quan sát chỉ nắm được cận trên của số dư của bạn
vẫn chứng minh được chắc chắn bạn trượt ở bất kỳ hạng nào có ngưỡng nằm trên cái cận đó.

Ứng dụng làm gì với chuyện này: giữ việc shield và việc gửi tiền thành hai bước riêng của màn
hình Gửi tiền, và ở bước shield nói với bạn trong một đoạn văn rằng hãy dùng một số tròn để một
lần shield là một cái xô chứ không phải một khoản gửi chính xác, hãy shield vào thời điểm bạn
chọn, và hãy gửi một phần của nó vào sau, để một khoản gửi được rút ra từ một khối tích luỹ mà
không ai biết thành phần. Thứ không thay đổi hợp đồng nào làm được là biến một ngưỡng thành
riêng tư, vì một ngưỡng riêng tư nghĩa là một kỳ quay không kiểm được.

## Quy tắc 3: đường nối lúc bọc token, cả hai chiều

Biến một token công khai thành dạng bảo mật của nó là một lần dịch chuyển ERC-20 công khai. Số
tiền xuất hiện trong sự kiện `Wrap` của lớp bọc, trong sự kiện `Transfer` của token cơ sở, và
lần nữa trong bản ghi mã hoá cái bản rõ đó của coprocessor. Không có cách bảo mật nào để đổi
một token công khai cả.

Chúng tôi đã đo mối tương quan này trên chính bản triển khai trước của mình. Quét các block
Sepolia từ 11528000 tới 11618500, ba trong năm khoản gửi nằm cách hai đến bốn block sau một lần
bọc công khai đúng 100 USDC của cùng địa chỉ đó. Ai đọc log công khai cũng định giá được ba
khoản gửi ấy là 100 USDC mà không phá vỡ một bảo đảm mật mã nào. Zama ghi lại đúng hiệu ứng đó
cho batcher của họ và gọi nó là tương quan shield với tham gia.

Việc bọc ngược cũng công bố một số tiền, và chính lệnh gọi đầu tiên trong hai lệnh unwrap là
lệnh công bố nó, nên một lần unwrap không bao giờ được hoàn tất thì vẫn rò. Từ đó có tiết lộ
thứ hai được gọi tên: **tổng tiền thưởng tích luỹ trở thành một cận dưới công khai với bất kỳ
địa chỉ nào bọc vào rồi bọc ngược ra hết.** Với một địa chỉ mà đối tác duy nhất của nó trong
token bảo mật ấy là Hearth, tổng công khai đã bọc ngược trừ tổng công khai đã bọc vào đúng bằng
số tiền thưởng cả đời đã rút, trừ đi phần tiền gốc và số dư bảo mật mà địa chỉ đó còn giữ. Cả
hai phần trừ ấy đều bị giấu và không âm, nên hiệu số luôn là một cận dưới, và nó trở thành con
số chính xác khi địa chỉ đó đã rút sạch.

Bọc ngược sang một địa chỉ mới cũng không giúp gì, vì chính lần chuyển bảo mật sang địa chỉ đó
là mối liên kết.

Hearth làm gì: tách thành các bước riêng, một cảnh báo ở bước shield của màn hình Gửi tiền, một
dòng ở bước đó và một dòng nữa ở tab "Về lại USDC thường" của màn hình Rút tiền, khuyên bạn
dịch chuyển một số tròn, cùng gợi ý để lại một số dư bảo mật thường trực. Đằng nào số tiền cũng
do bạn tự gõ; ứng dụng không đưa ra một bộ mệnh giá. Thứ Hearth không làm được: bỏ đi bất cứ
phần nào trong số đó.

## Quy tắc 4: các số đếm giải được công bố là một phép đo chậm

Mỗi lần đối soát đều công bố một hạng đã trả bao nhiêu giải. Vì ngưỡng của mọi người gửi đều
công khai, con số đếm đó là một ràng buộc chặt có dạng "bao nhiêu người gửi trong nhóm này có
trọng số vượt ngưỡng công bố của chính họ". Nó chỉ mang vài bit, nhưng nó là một phép đo thật,
và nó tích luỹ dần.

**Một số dư không bao giờ đổi qua nhiều kỳ quay sẽ bị các số đếm đó thu hẹp dần.** Người gửi
nào gửi thêm hay rút bớt là đặt lại ẩn số của chính mình và bắt việc thu hẹp phải làm lại từ
đầu.

Có hai thứ giới hạn tốc độ ấy. Các số đếm là thô: không bao giờ có gì mịn hơn một số nguyên
giải được tiết lộ. Và các ngưỡng thì kẻ tấn công không chọn được, vì seed được rút bên trong
coprocessor và chỉ hé lộ sau khi kỳ của nó đã đóng, nên không ai nhắm được một truy vấn vào một
số dư bị nghi ngờ.

Còn một cái giảm chấn thứ ba nữa, và bản triển khai này cố ý từ bỏ nó. `reconcileEvery[t]` đặt
số kỳ quay trôi qua giữa hai lần công bố phần dư của một hạng. Nâng nó lên là công bố một số
đếm cho cả quãng thay vì một số đếm mỗi kỳ quay, nên một giải độc đắc bị quy cho tất cả những
ai đủ điều kiện trong quãng đó. Cái giá phải trả chính là giải độc đắc: một lần đóng chuyển
toàn bộ thanh khoản công khai của một hạng vào kỳ quay, và số tiền ấy chỉ quay lại ở một lần
đối soát, nên với nhịp 24 thì thanh khoản công khai của hạng giải lớn chỉ là phần thu hoạch của
một kỳ quay ở 23 trên 24 kỳ quay, giải công bố được định cỡ theo đó, và cái quỹ tích luỹ chỉ lộ
ra ở kỳ quay có đối soát. Số tiền đó vẫn được đem ra và vẫn trúng được suốt thời gian ấy, bên
trong phần dư mã hoá. Chỉ là không ai nhìn thấy nó.

Vậy nên cả ba hạng chạy ở `reconcileEvery = 1`. Cái quỹ tích luỹ công khai, số đếm của mỗi hạng
thành công khai trễ một kỳ quay, và phép đo nói trên chạy ở tốc độ tối đa là một số đếm cho mỗi
hạng ở mỗi kỳ quay. Với hạng giải lớn, điều đó nghĩa là một lần chi trỏ vào nhóm người gửi đủ
điều kiện trong đúng một kỳ quay, tức khoảng bốn phần trăm của pool, chứ không phải một ngày
người gửi. Đây là một phần dư đã được tiết lộ, không phải một phần đã được giảm nhẹ, và nó là
giới hạn số 14. Cái nhịp đó vẫn là một tham số khởi tạo, nên một bản triển khai muốn phép đo
chậm hơn hơn là muốn cái quỹ nhìn thấy được thì cứ việc lấy.

## Quy tắc 5: tầng token là của Zama, không phải của chúng tôi

Tài sản của mọi pool đều là một trong các token bảo mật của Zama. Đó là chủ ý, và nó có nghĩa
là các quyền của chính token đó áp lên số tiền đi qua Hearth, ở từng pool một: bảy lớp bọc, mỗi
lớp cùng ngần ấy quyền. Gọi tên chúng ra:

Hợp đồng trên Sepolia là một `ConfidentialWrapper` nằm sau một proxy nâng cấp được, do Zama sở
hữu, với quyền sở hữu hai bước và chức năng từ bỏ quyền bị tắt. Đọc mã nguồn đã xác minh của nó
ngày 2 tháng 9 năm 2026 cho ra ba sự thật quan trọng với quyền riêng tư:

1. **Người quan sát, có hiệu lực hồi tố.** Chủ sở hữu gọi được `addObserver(address)`, hàm này
   cấp cho địa chỉ đó quyền giải mã người dùng kiểu ký tự đại diện trên mọi handle mà hợp đồng
   token có quyền. Phạm vi đó phủ mọi số tiền gửi, mọi khoản chi khi rút, và mọi số tiền cấp
   vốn giải thưởng theo từng lô mà pool gửi cho vault. Từ quan trọng ở đây là hồi tố: một người
   quan sát được bổ nhiệm ở bất kỳ thời điểm nào trong tương lai vẫn giải mã được những số tiền
   đã nằm sẵn trên chuỗi, nên "canh sự kiện `ObserverAdded` rồi rút" không phải một hàng phòng
   thủ. Trạng thái thực tế ngày 2 tháng 9 năm 2026: `observerCount()` bằng 0 và `observers()`
   rỗng.
2. **Danh sách chặn và nút tạm dừng.** Chủ sở hữu chặn được một địa chỉ, việc đó ngăn địa chỉ
   ấy gửi, rút hay bọc ngược, vì mỗi việc trong số đó là một lần cập nhật token có địa chỉ ấy ở
   một đầu. Có tồn tại một vai trò tạm dừng; trên thực tế nó đang được đặt về địa chỉ không,
   nên việc tạm dừng hiện đang bị vô hiệu.
3. **Khả năng nâng cấp.** Phần cài đặt có thể bị chủ sở hữu thay thế, nên hành vi của token, kể
   cả cách nó xử lý những handle mà nó có quyền, có thể đổi ngay dưới chân chúng ta.

Chú ý phạm vi chính xác của mục 1. Trong Hearth không có lần chuyển giải thưởng riêng cho từng
người gửi, nên cũng không có khoản chi riêng cho từng người trúng để một người quan sát đọc.
Thứ dịch chuyển ở tầng token là một lần chuyển cấp vốn cho mỗi lô duyệt, từ pool sang vault,
mang theo tổng đã ghi có cho tất cả mọi người trong lô đó. Một lô chỉ có một người thì cái tổng
ấy chính là giải thưởng chính xác của một người gửi, và pool năm người gửi đang chạy với cỡ lô
4 luôn kết thúc mỗi vòng duyệt bằng một lô một người. `evaluate` không cần cấp phép và lấy cỡ
lô từ người gọi, nên không thể cưỡng chế một cỡ lô tối thiểu nào. [Giới hạn số
7](../limitations.md) ghi nhận nó như một phần dư được chấp nhận và gọi tên cách sửa ở phía hợp
đồng.

Thứ mà một người quan sát ở tầng token không lấy được là chính cuốn sổ của Hearth. Tiền gốc,
tiền thưởng, trọng số và khoản ghi có của bạn nằm trong bộ nhớ của vault, và token không có
quyền kiểm soát truy cập nào trên bất kỳ thứ nào trong đó. Chúng tôi đã kiểm chứng điều đó trên
bản triển khai trước: địa chỉ token trả về false khi hỏi quyền trên các handle tiền thưởng và
tiền gốc của một người gửi, trong khi người gửi đó và pool đều trả về true.

Vậy nên lời tuyên bố trung thực là: dùng Hearth thì bạn tin lớp bọc của Zama với những số tiền
đi ngang qua nó, đúng như mọi ứng dụng ERC-7984 khác. Bạn không phải tin nó với vị thế của
mình.

Phương án thay thế là tự viết token bảo mật của mình, điều mà vài dự án trong lĩnh vực này đã
làm. Cách đó đánh đổi một hợp đồng đã biết, đã kiểm toán, do Zama vận hành, lấy một hợp đồng mà
chúng tôi tự chấm điểm cho mình. Chúng tôi thà ghi lại ranh giới tin cậy thật còn hơn chế ra
một ranh giới nhỏ hơn.

## Quy tắc 6: việc duyệt không phải một dấu hiệu, và không ai chọn được thứ tự

`evaluate(drawId, count)` nhận một con số, không nhận một danh sách địa chỉ. Vault đi qua danh
sách người gửi từ một điểm khởi đầu suy ra từ seed của kỳ quay đó, theo thứ tự trong danh sách,
còn người gọi chỉ quyết định đi tiếp bao xa. Người gửi muốn biết kết quả của mình thì đẩy đúng
cái vòng duyệt mà keeper cũng đẩy.

Chuyện đó khoá lại hai thứ cùng lúc.

Nó khoá dấu hiệu tự duyệt. Ở một phiên bản trước, việc duyệt nhận một danh sách địa chỉ, nên
một người gửi tính được kết quả của chính mình từ các đầu vào công khai rồi chỉ trả tiền để
được duyệt khi họ đã trúng. Gửi giao dịch đó sẽ là một dấu hiệu người trúng to bằng một hàm
nhận thưởng. Bây giờ không có giao dịch nào mà chỉ người trúng mới gửi.

Nó khoá luôn cái đòn bẩy thứ tự. Khi một hạng giải bị vượt số giải và cạn sạch, ai bị vòng
duyệt chạm tới cuối cùng thì bị hụt. Thứ tự đó do seed cố định, nên không ai mua được chỗ đứng
tốt hơn bằng gas, và điểm khởi đầu dịch chuyển mỗi kỳ quay, nên không địa chỉ nào đứng cuối một
cách hệ thống. Hệ quả về công bằng được mô tả trong
[giải thưởng và các hạng giải](../concepts/prizes-and-tiers.md) và là giới hạn số 11.

Mọi người gửi được duyệt trong một kỳ quay đều nhận cùng các thao tác ghi, cùng hình dạng, dù
họ trúng hay không, vì khoản chi đi qua một phép chọn mã hoá chứ không qua một nhánh rẽ. Người
gửi rơi vào lô nào, và ở vị trí nào trong lô, đều công khai và chẳng nói gì về kết quả của họ.

## Quy tắc 7: phần dư hành vi

Hearth không có giao dịch nhận thưởng, nên không có hành động mang hình dạng người trúng để ai
đó rình. Biết được mình trúng là một chữ ký ngoài chuỗi không chạm vào gì cả, và nút nhận
thưởng của ứng dụng, vốn mang theo số tiền, gửi đi một lệnh rút bình thường trông y hệt mọi
lệnh rút khác.

Phần dư nằm ở việc bạn làm gì tiếp theo. Người gửi nào cứ trúng kỳ nào là rút ngay sau kỳ đó,
và ngoài ra không bao giờ rút, thì theo thời gian sẽ trao cho người quan sát một manh mối thống
kê. Nó yếu, nó cần nhiều kỳ quay mới dựng lên được, và nó hoàn toàn nằm trong tay người gửi.
Cách giảm nhẹ là hành vi chứ không phải mật mã: hãy rút theo lịch của riêng bạn, hoặc cứ để
tiền thưởng tích lại.

Chúng tôi nói ra điều này vì phương án còn lại, tức tuyên bố rằng hành vi trên chuỗi không tiết
lộ gì, là sai trong mọi thiết kế kiểu này. Những dự án trong lĩnh vực này đã bỏ hàm nhận thưởng
của họ cũng đi tới cùng kết luận và viết nó ra. Chúng tôi cũng vậy.

## Trang này không nói tới điều gì

Nó không nói tới những kẻ tấn công và động cơ của họ, chuyện đó ở
[mô hình mối đe doạ](threat-model.md). Nó không nói tới cách tự kiểm một kỳ quay, chuyện đó ở
[tính ngẫu nhiên và cách kiểm chứng](randomness-and-verification.md). Và nó không đưa ra tuyên
bố nào về quyền riêng tư ở tầng mạng: địa chỉ IP bạn kết nối từ đó, nhà cung cấp RPC bạn dùng
và yêu cầu bạn gửi tới relayer đều nằm ngoài chuỗi và nằm ngoài phân tích này.
