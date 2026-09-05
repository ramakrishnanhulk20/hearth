# Câu hỏi thường gặp

## 1. Tôi tiết kiệm được bằng token nào?

Bảy token: USDC, USDT, WETH, BRON, ZAMA, tGBP và XAUt, tất cả đều là token bảo mật của chính
Zama trên Sepolia. Mỗi token là một pool riêng với hợp đồng riêng, người gửi riêng và tiền giải
thưởng riêng, còn pool bạn đang ở thì nằm ở phần đầu của URL ngay sau `/app`. Bộ chọn cũng hiển
thị Confidential tGBP chính thức của Zama, để mờ: token công khai của nó chỉ đơn vị phát hành
mới mint được, nên không ai bọc nó được và không pool nào tồn tại trên nó được. Mọi điều khác
trên trang này áp dụng cho từng pool một cách độc lập. Chi tiết ở
[pool và token](concepts/pools-and-tokens.md).

## 2. Nút nhận thưởng ở đâu?

Ở mục "Kỳ quay của tôi" trong ứng dụng, trên thẻ của kỳ quay đó, dưới phần "Kết quả của bạn",
sau khi bạn đã mở nó bằng con mắt. Nó chỉ xuất hiện khi kỳ quay đó có ghi có cho bạn thứ gì và
vault vẫn còn nợ ví này tiền: chỉ một con mắt mở ra cùng lúc khoản ghi có của kỳ quay đó và con
số tiền thưởng chưa nhận mà vault đang giữ, rồi cái nút đưa ra con số nhỏ hơn trong hai con số
ấy. Chính con số thứ hai làm cho nó thành thật. Khoản ghi có của một kỳ quay không bao giờ đổi
một khi đã được ghi, nên một cái nút chỉ dựa vào khoản ghi có sẽ mời bạn nhận lại đúng giải đó
sau khi tải lại trang, và chuỗi sẽ trả nó ra từ chính tiền gốc của bạn. Bên
dưới, nó cố ý không phải một giao dịch riêng: giải thưởng được ghi có vào số dư tiền thưởng mã
hoá của bạn trong lúc duyệt, còn nút nhận thưởng, vốn mang theo số tiền, chỉ gửi đi một lệnh rút
bình thường cho số đó, và trên chuỗi nó trông y hệt mọi lệnh rút khác. Ở phần lớn giao thức
trúng thưởng, chỉ người trúng mới có lý do gửi một giao dịch nhận thưởng, nên danh sách giao
dịch lặng lẽ gọi tên họ; ở đây không có giao dịch nào như thế để rình. Cùng số tiền đó cũng lấy
ra được từ tab "Ra khỏi vault" ở màn hình Rút tiền, vì nhận thưởng chỉ là một lệnh rút mang tên
khác.

## 3. Tôi có thể mất tiền gốc không?

Không. Giải thưởng được trả từ lợi suất, không bao giờ từ tiền gửi của ai, và `withdraw` thì
luôn mở, kể cả trong lúc một kỳ quay đang chạy. Thứ duy nhất bạn có thể mất là một giải bạn lẽ
ra đã trúng: nếu vòng duyệt không chạm tới bạn trong cửa sổ hai kỳ thì kỳ quay đó không trả cho
bạn gì cả và số tiền quay về hạng giải. Xem giới hạn số 2.

## 4. Các anh có thấy được số dư hay tiền thưởng của tôi không?

Không. Tiền gốc, tiền thưởng, trọng số của bạn ở từng kỳ quay và khoản ghi có của bạn ở từng kỳ
quay đều là những giá trị mã hoá mà chỉ địa chỉ của bạn được cấp quyền truy cập, và danh sách
kiểm soát truy cập của Zama cưỡng chế điều đó ngay trên chuỗi, chứ không phải một chính sách
chúng tôi hứa suông. Chúng tôi thấy đúng những gì một người lạ thấy: rằng bạn đã gửi tiền, vào
lúc nào, và không gì về số tiền cả.

## 5. Tỷ lệ trúng của tôi được tính thế nào?

Theo số dư trung bình của bạn suốt cả kỳ, không phải số dư lúc kỳ quay diễn ra. Một kỳ dài một
giờ ở pool USDC và sáu giờ ở sáu pool còn lại. Giữ 100 USDC trọn một kỳ một giờ thì trọng số của
bạn là 360.000 số-dư-giây; số giải kỳ vọng của bạn ở một hạng là trọng số đó chia cho cái bậc
được công bố, nhân với tỷ lệ và số giải của hạng. Chia tiền ra nhiều ví không thay đổi gì cả, vì
kỳ vọng tỷ lệ đúng theo trọng số.

## 6. Tôi gửi tiền năm phút trước kỳ quay và không trúng gì. Vì sao?

Vì năm phút của một kỳ một giờ là một phần mười hai tỷ lệ trúng so với việc giữ cả kỳ, và là một
phần bảy mươi hai của một kỳ sáu giờ. Đó là thứ ngăn ai đó nhá một số dư lớn ngay trước mỗi kỳ
quay, trúng, rồi rút ra; chúng tôi đã thực thi cuộc tấn công đó lên chính thiết kế trước của
mình và nó đã ôm 19 trên 20 kỳ quay. Cứ gửi vào rồi để yên đó, bạn sẽ nhận trọn phần của mình từ
kỳ trọn vẹn tiếp theo.

## 7. Tiền thưởng của tôi có sinh tỷ lệ trúng luôn không?

Tự nó thì không. Tiền thưởng nằm ở một số dư mã hoá riêng, không tính vào trọng số của bạn, nên
việc gộp lãi không tự động: hãy rút chúng ra rồi gửi lại vào để chúng làm việc. Chính sự tách
biệt đó là thứ làm cho một lệnh rút tiền thưởng trông y hệt một lệnh rút tiền tiết kiệm.

## 8. Ai kích hoạt các kỳ quay, và nếu họ dừng thì sao?

Chúng tôi chạy mỗi pool một tiến trình keeper, mỗi tiến trình trên tài khoản riêng, nên một
keeper dừng lại chỉ làm một pool mất các kỳ quay và sáu pool kia vẫn chạy. Pool còn cài đặt giao
diện tự động hoá của Chainlink, nên một upkeep theo thời gian có thể phủ bước đóng, dù chưa pool
nào đăng ký. Đằng nào thì mọi bước của một kỳ quay cũng ai gọi cũng được, kể cả bạn từ trong ứng
dụng. Việc đóng có hạn chót riêng, sớm hơn cuối cửa sổ nửa kỳ, để một lần đóng không bao giờ rơi
muộn tới mức việc trao giải không kịp theo sau. Nếu không có gì chạy thì kỳ quay đó bị bỏ qua:
thanh khoản của nó nằm lại trong các hạng để dùng cho kỳ quay sau, phần lợi suất được ghi sổ khi
nào có một lần trao giải muộn, còn việc gửi và rút vẫn chạy. Một keeper đứng máy làm mất các kỳ
quay, không bao giờ mất tiền.

## 9. Các anh có gian lận được số ngẫu nhiên, hay độ lớn của giải không?

Không cái nào cả. Seed được sinh bên trong coprocessor của Zama dưới dạng bản mã, nên không ai
nhìn thấy nó vào lúc nó được rút, và việc đóng một kỳ quay chỉ thành công đúng một lần, nên
không có lần rút thứ hai. Giá trị giải được chốt sớm hơn trong cùng giao dịch đó, trước khi seed
tồn tại, nên không ai đọc được seed, tính ra là mình trúng, rồi làm cái giải to lên. Sau khi kỳ
kết thúc, seed được công bố kèm chữ ký của dịch vụ quản lý khoá của Zama và hợp đồng kiểm nó
ngay trên chuỗi, và từ đó bất kỳ ai cũng tính lại được đúng cái ngưỡng mà một địa chỉ bất kỳ
phải vượt qua.

## 10. Vì sao pool chỉ công bố quy mô áng chừng thay vì tổng chính xác của nó?

Vì tổng chính xác làm lộ các khoản gửi của từng người. Hai con số tổng liên tiếp, cộng với dấu
thời gian công khai của chính lần bạn gửi tiền, là đủ để bất kỳ ai giải ra số tiền chính xác của
bạn nếu bạn là người duy nhất dịch chuyển tiền trong kỳ đó. Không phải ước lượng, mà là đúng con
số. Nên vault chỉ công bố luỹ thừa hai nhỏ nhất nằm trên cái tổng, và kỳ quay chạy trên đó. Cái
giá phải trả là mỗi kỳ quay một hạng trả từ một nửa tới toàn bộ số giải danh nghĩa của nó, phần
còn lại được mang sang và đem ra lần nữa, nên giá trị giải ổn định ở mức cao hơn một chút. Tỷ lệ
trúng của ai cũng không bị méo so với người khác.

## 11. Tiền giải thưởng đến từ đâu?

Trên Sepolia là từ một số dư do nhà tài trợ bỏ vào, nhỏ giọt theo tốc độ cố định, mỗi pool một
nguồn, vì trên Sepolia không nơi nào trả lợi suất trên các token mock của Zama. Trên mainnet,
cùng giao diện đó cắm vào Confidential Vault của Zama, nơi đưa USDC bảo mật vào một vault sinh
lợi suất ERC-4626 thật thông qua một batcher. Đằng nào thì pool cũng chỉ ghi sổ số tiền mà một
lần giải mã được KMS kiểm chứng nói là đã thực sự tới, không bao giờ ghi theo con số mà nguồn tự
khai về mình.

## 12. Người ngồi quan sát chuỗi biết được gì về tôi?

Rằng bạn là một người gửi, bạn gửi hay rút ở block nào, và bạn nằm trong lô duyệt nào. Không
biết số dư của bạn, không biết tỷ lệ trúng của bạn, không biết bạn có trúng hay không. Có bốn
đường nối đáng biết. Bậc được công bố gần như là thông tin cá nhân khi pool có ít hơn ba người
gửi. Nếu ai đó ghim được số dư của bạn, thường là bằng cách rình một lần bọc token công khai
theo sau bởi một khoản gửi cùng cỡ, thì kết quả của bạn ở mọi kỳ quay từ đó trở đi chỉ còn là số
học công khai, vì ngưỡng vốn công khai theo thiết kế. Bọc vào rồi bọc ngược ra hết sẽ công bố
một cận dưới của toàn bộ số tiền bạn đã trúng. Và mỗi hạng giải công bố nó đã trả bao nhiêu
giải, trễ một kỳ quay, đó là một phép đo thô trên các số dư đã mã hoá và nó thu hẹp dần một số
dư không bao giờ dịch chuyển. Chúng tôi công bố số đếm đó ở mọi kỳ quay vì chính bước đó là bước
trả tiền chưa ai trúng về cái quỹ công khai, và đó là thứ cho phép giải độc đắc tích lại ở chỗ
bạn xem được. Cả bốn đều được nói tới trong
[những gì được giữ kín](security/what-stays-private.md).
