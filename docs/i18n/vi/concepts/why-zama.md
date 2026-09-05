# Vì sao việc này cần Zama

Phép thử để áp lên bất kỳ dự án nào tuyên bố mình cần một công nghệ cụ thể: xoá công nghệ đó
đi rồi xem sản phẩm có sống sót không. Nếu nó vẫn chạy, công nghệ kia chỉ là đồ trang trí.

## Xoá phần mã hoá đi thì không còn sản phẩm nào cả

Mã hoá đồng cấu hoàn toàn, thường gọi tắt là FHE, nghĩa là thực hiện phép tính trực tiếp trên
những con số đã mã hoá, cho ra một đáp án đã mã hoá, mà không bao giờ giải mã đầu vào. Protocol
của Zama mang điều đó lên Ethereum: một hợp đồng Solidity cộng, so sánh và chọn được giữa
những giá trị mà nó không đọc được.

Lấy nó ra khỏi Hearth thì còn lại thế này.

| Mảnh của Hearth | Khi không có FHE |
| --- | --- |
| Số dư của bạn | Một con số công khai. Ai cũng định giá được khoản tiết kiệm và tỷ lệ trúng của bạn. |
| Phép thử người trúng | Một phép so công khai. Kết quả hiện ra cho tất cả mọi người ngay khi nó chạy. |
| Ai trúng một kỳ quay | Công khai, vì khoản ghi có rơi vào số dư của ai đó là một con số nhìn thấy được. |
| Seed ngẫu nhiên | Hoặc là một con số công khai mà người ta thấy trước, hoặc một con số ngoài chuỗi mà người ta chọn được. |
| Các khoản ghi có giải thưởng | Những lần chuyển công khai tới những người trúng đã bị nhận diện. |

Thứ bạn nhận được là PoolTogether. PoolTogether đã tồn tại, nó chạy được, và nó chạy nhiều năm
rồi. Không có lý do gì để xây lại nó.

Sản phẩm mà Hearth thực sự bán là thứ PoolTogether không thể mời chào: tiết kiệm trúng thưởng
mà số dư, tỷ lệ trúng và các lần trúng của bạn là của riêng bạn, trong khi kỳ quay vẫn để người
lạ kiểm được. Hai tính chất đó xung khắc nhau trên một chuỗi minh bạch. Tính toán trên dữ liệu
mã hoá là thứ duy nhất hoá giải được chúng, và Protocol của Zama là nơi duy nhất trên Ethereum
làm được điều đó hôm nay.

Không có phiên bản nửa vời. Cả năm dòng phía trên đều là lời hứa cốt lõi. Bỏ phần mã hoá khỏi
bất kỳ dòng nào thì sản phẩm hỏng ngay ở dòng đó.

## Chính xác những mảnh chúng tôi dùng

Không phải kiểu "xây trên Zama". Đây là danh sách, kèm việc mỗi mảnh làm gì cho chúng tôi.

### Số nguyên đã mã hoá

`euint64` cho tiền và trọng số, `euint128` cho bộ luỹ kế tổng của pool, `ebool` cho kết quả
của một phép so. Tiền gốc, tiền thưởng, trọng số và khoản ghi có của mọi người gửi đều là một
trong những kiểu này, phần dư của mỗi hạng giải cũng vậy. Các phép tính chúng tôi thực hiện
trên chúng là `FHE.add`, `FHE.sub`, `FHE.mul` với một số công khai, `FHE.min`, `FHE.gt`,
`FHE.le`, `FHE.and` và `FHE.select`.

Phép so ở đây làm nhiều việc hơn là chỉ phục vụ phép thử người trúng. Mỗi kỳ quay có năm phép
so mã hoá đặt tổng trọng số của pool cạnh các luỹ thừa hai quanh cái bậc gần nhất đã biết của
nó, và thứ duy nhất rời khỏi thế giới mã hoá là con đếm nhỏ cho biết nó vượt được bao nhiêu
trong năm cái đó. Đó là cách kỳ quay có được một thang công khai để chạy trên đó mà bản thân
cái tổng không bao giờ trở thành một con số.

`FHE.select` đáng được ghi chú riêng, vì nó là thứ làm cho toàn bộ thiết kế này khả thi. Nó là
một câu lệnh if mà điều kiện đã bị mã hoá: nó trả về một trong hai giá trị mã hoá và chuỗi
không biết được là cái nào. Đó là cách một người trúng và một người trượt tạo ra hai giao dịch
y hệt nhau. Không có chỗ nào trong Hearth rẽ nhánh trên một bí mật.

`FHE.fromExternal` nhận một giá trị đã mã hoá mà người dùng dựng trong trình duyệt của họ, kèm
bằng chứng của nó, rồi biến nó thành một giá trị hợp đồng dùng được. Đó là cách một số tiền gửi
đi vào ở dạng mã hoá từ đầu tới cuối.

### ERC-7984, chuẩn token bảo mật

Tài sản của mỗi pool là một trong các token bảo mật của Zama, một lớp bọc ERC-7984 quanh một
ERC-20 thông thường: cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP hoặc cXAUt. Số dư trong chúng là
những giá trị đã mã hoá chứ không phải những con số công khai.

Các khoản gửi đi vào qua `confidentialTransferAndCall`, hàm này chuyển một số tiền đã mã hoá và
gọi hook của bên nhận trong cùng một giao dịch. Hook của vault được trao đúng số tiền mà token
thực sự đã chuyển, và đó là cách vault ghi có theo thực tế chứ không theo một lời yêu cầu. Các
khoản chi đi theo chiều ngược lại qua `confidentialTransfer`.

Việc dùng token chuẩn thay vì tự viết là quan trọng. Vài dự án trong lĩnh vực này tự nặn ra một
token "kiểu ERC-7984". Mọi token của chúng tôi đều là token do Zama triển khai, nên số dư bảo
mật của một người gửi vẫn dùng được bên ngoài Hearth và hành vi của chính token không phải thứ
chúng tôi được quyền định nghĩa theo hướng có lợi cho mình. Nó cũng có nghĩa là Hearth mở được
pool trên một token bảo mật mới ngay ngày Zama phát hành nó, và đó là cách sáu trong bảy pool
được thêm vào, đồng thời có thể không mở pool nào trên một token mà đơn vị phát hành giữ riêng
quyền mint.

### Tính ngẫu nhiên trên dữ liệu mã hoá

`FHE.randEuint64()` sinh một số ngẫu nhiên bên trong coprocessor của Zama, dưới khoá FHE của
mạng, từ một seed công khai nhưng vô dụng nếu không có khoá đó. Con số đi ra ở dạng bản mã.
Không ai, kể cả chúng tôi và kể cả người gửi giao dịch, nhìn thấy nó vào khoảnh khắc nó được
tạo ra.

Nó buộc phải được sinh bên trong một giao dịch, vì nó làm thay đổi trạng thái bộ sinh trên
chuỗi. Điều đó loại bỏ mẹo xem trước một kỳ quay ngoài chuỗi bằng `eth_call` để biết mình có
trúng hay không, và đó là lý do đóng một kỳ quay là một giao dịch thật chỉ thành công đúng một
lần. Không ai quay lại được một seed mà họ không ưa.

### Danh sách kiểm soát truy cập

ACL trên chuỗi của Zama quyết định ai được giải mã bản mã nào. Nó là cơ chế cưỡng chế, không
phải chính sách suông: relayer từ chối một yêu cầu cho handle mà người gọi không có quyền.

Hearth dùng bốn lệnh gọi trên đó. `FHE.allowThis` giữ cho một giá trị vẫn dùng được bởi hợp
đồng trong các giao dịch sau. `FHE.allow` cấp cho một người gửi quyền đọc vĩnh viễn với tiền
gốc, tiền thưởng, trọng số theo từng kỳ quay và khoản ghi có theo từng kỳ quay của chính họ.
`FHE.allowTransient` cấp quyền trong đúng độ dài một giao dịch, và đó là cách vault trao cho
pool một hạn mức dùng một lần trên tổng của một lô duyệt mà không hề cho nó quyền truy cập
thường trực. `FHE.makePubliclyDecryptable` mở một giá trị ra cho tất cả mọi người, và chúng tôi
dùng nó trên đúng sáu loại giá trị: seed, con đếm thang cho ra cái bậc, cờ khác rỗng, phần thu
hoạch, phần dư của một hạng khi hạng đó tới hạn đối soát, và bộ đếm khoản chưa cấp vốn. Tổng
trọng số chính xác của pool cố ý không nằm trong danh sách đó.

Lệnh gọi cuối cùng ấy là một chiều và vĩnh viễn. Nó là việc hệ trọng nhất mà một hợp đồng trên
protocol này làm được, nên mọi lần dùng nó trong Hearth đều được liệt kê ở
[những gì được giữ kín](../security/what-stays-private.md).

### Giải mã người dùng theo EIP-712

Đây là cách một người gửi đọc những con số của chính mình. Họ ký một thông điệp có cấu trúc và
có kiểu, đó là một chuẩn chữ ký cho người ký thấy chính xác họ đang chấp thuận điều gì, rồi
relayer của Zama trả về bản rõ của những giá trị mà người gửi đó có quyền.

Đây là một yêu cầu ngoài chuỗi. Không giao dịch, không gas, không dấu vết. Đó là lý do Hearth
có thể hoàn toàn không có hàm nhận thưởng: biết được mình trúng thì không tốn gì và không để
lại gì. Nửa còn lại của lời hứa đó là việc duyệt cũng không thể nhắm vào chính mình, nên không
có loại giao dịch nào mà chỉ người trúng mới gửi.

Cả số dư lẫn tiền thưởng đều do chủ của chúng giải mã được. Hearth còn cấp thêm quyền cho trọng
số theo từng kỳ quay và khoản ghi có theo từng kỳ quay, để một người gửi kiểm chứng được phép
tính của kỳ quay đối chiếu với đầu vào của chính họ, thay vì bị yêu cầu phải tin.

### Giải mã công khai có chữ ký KMS

Chiều ngược lại. Một hợp đồng đánh dấu một giá trị là giải mã công khai được, ai đó hỏi relayer
lấy bản rõ, và relayer trả về kèm chữ ký của dịch vụ quản lý khoá, tức nhóm nắm khoá giải mã
của mạng. Rồi hợp đồng kiểm chữ ký đó ngay trên chuỗi bằng `FHE.checkSignatures` trước khi hành
động dựa trên con số.

Đây là thứ biến câu "chúng tôi nói seed là 12345" thành một con số mà chính hợp đồng từ chối
chấp nhận nếu không có bằng chứng. Hearth dùng nó một lần mỗi kỳ quay cho seed, con đếm thang,
cờ khác rỗng và phần thu hoạch, cả bốn cùng lúc, vào lúc trao giải, rồi dùng lại cho phần dư
của một hạng mỗi khi hạng đó tới hạn đối soát, mà trên Sepolia thì mọi hạng đều tới hạn ở mọi
kỳ quay. Mỗi bằng chứng đều gắn với các handle của nó theo một thứ tự cố định, nên không gì bị
xáo trộn hay phát lại sang một kỳ quay khác hay một hạng giải khác.

## Một người gửi thực sự phải tin vào điều gì

Gọi tên chuyện này chính là mục đích của trang này.

- **Zama Protocol**, tin rằng nó tính đúng trên bản mã và chỉ giải mã những gì đã được đánh dấu
  là giải mã được. Mọi lần giải mã mà các hợp đồng hành động theo đều mang một bằng chứng được
  kiểm ngay trên chuỗi. Đây đúng là ranh giới tin cậy mà chính Confidential Vault của Zama ghi
  trong tài liệu.
- **Các lớp bọc token bảo mật**, vốn là hợp đồng của Zama chứ không phải của chúng tôi, và
  chúng nâng cấp được bởi chủ sở hữu của chúng. Xem mục về tầng token trong
  [những gì được giữ kín](../security/what-stays-private.md).
- **Chính các hợp đồng của Hearth**, vốn bất biến sau khi triển khai, không proxy và không
  đường nâng cấp. Những quyền còn lại của chủ sở hữu rất hẹp và được liệt kê trong
  [mô hình mối đe doạ](../security/threat-model.md): một nút tạm dừng chặn việc gửi tiền và
  việc đóng kỳ quay nhưng không bao giờ chặn việc rút tiền hay việc duyệt, một hàm đặt nguồn
  lợi suất, một đường cứu hộ cho token lạ không đụng được vào số dư người gửi, và việc chuyển
  quyền sở hữu hai bước với chức năng từ bỏ quyền bị tắt.

Không mục nào trong danh sách đó là một con người mà chúng tôi bảo bạn phải tin.
