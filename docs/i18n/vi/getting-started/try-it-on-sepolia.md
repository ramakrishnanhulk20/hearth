# Dùng thử trên Sepolia

Sepolia là mạng thử nghiệm công khai của Ethereum. Tiền trên đó không phải tiền thật, nên bạn
chạy trọn vòng miễn phí. Pool USDC quay mỗi giờ, sáu pool còn lại quay sáu giờ một lần, nên
chọn USDC nếu bạn muốn xem một kỳ quay cho đúng cái kỳ mà bạn đã gửi tiền vào. Đường đi hai
phút ở cuối trang này thì không phải chờ kỳ nào cả.

Ứng dụng đang chạy ở https://hearth-ram.vercel.app. Mọi thứ bên dưới cũng làm thẳng từ block
explorer được, nếu bạn thích xem các lệnh gọi thô.

Có hai lối vào bằng ví. Nếu trình duyệt có tiện ích mở rộng, "Kết nối ví" sẽ dùng nó. Nếu không
có tiện ích nào, "Quét bằng điện thoại" hiện một mã WalletConnect cho ví trên điện thoại đọc, và
đó là lối duy nhất trên một cái máy mà bạn không cài được gì. Một trình duyệt hoàn toàn không có
ví thì được chỉ nên cài ví nào và cài ở đâu, thay vì bị đưa cho một cái nút hỏng giữa chừng.

## 0. Chọn một token

Hearth chạy bảy pool, mỗi pool cho một token bảo mật mà Zama phát hành trên Sepolia. Mỗi pool
là một bộ hợp đồng riêng với người gửi riêng, tiền giải thưởng riêng và đồng hồ riêng, nên
chọn token chính là chọn pool. Tên token ở đầu thanh bên mở ra bộ chọn, còn pool bạn đang ở
thì nằm ở phần đầu của URL: `/app/usdc`, `/app/weth` và cứ thế.

| Token | Slug | Quay mỗi | Token công khai có hàm `mint` mở |
| --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 giờ | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` |
| Confidential USDT (Mock) | `usdt` | 6 giờ | `0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0` |
| Confidential WETH (Mock) | `weth` | 6 giờ | `0xff54739b16576FA5402F211D0b938469Ab9A5f3F` |
| Confidential BRON (Mock) | `bron` | 6 giờ | `0xFf021fB13cA64e5354c62c954b949a88cfDEb25E` |
| Confidential ZAMA (Mock) | `zama` | 6 giờ | `0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57` |
| Confidential tGBP (Mock) | `tgbp` | 6 giờ | `0x93c931278A2aad1916783F952f94276eA5111442` |
| Confidential XAUt (Mock) | `xaut` | 6 giờ | `0x24377AE4AA0C45ecEe71225007f17c5D423dd940` |

Bộ chọn cũng liệt kê **Confidential tGBP** chính thức của Zama, để mờ, vì quyền mint token cơ
sở thuộc về đơn vị phát hành và không ai khác lấy được token đó. Lý do nằm ngay dưới tên nó,
bằng thứ tiếng bạn đang đọc, và chọn nó sẽ ra một trang gọi tên token, dẫn tới cả hai hợp đồng
và không đưa ra thao tác ví nào, thay vì một nút gửi tiền chỉ để bị revert. Pool nào chưa đóng
kỳ quay đầu tiên cũng dùng đúng dòng dưới tên đó để nói kỳ quay ấy vào lúc nào, vì lúc đó có một
thời điểm để đưa ra chứ chưa có tiền giải.

Ứng dụng đọc được bằng mười sáu ngôn ngữ, chọn từ nút trên thanh đầu trang hoặc nút trên thanh
bên của bảng điều khiển. Tiếng Anh giữ URL trơn còn mọi ngôn ngữ khác đặt mã của mình lên trước,
nên cùng màn hình đó bằng tiếng Nhật là `/ja/app/usdc`. Tiếng Ả Rập lật gương toàn bộ bố cục.
Mọi ngôn ngữ đều giữ chữ số phương Tây và đồng hồ 24 giờ UTC, kể cả tiếng Ả Rập, nên một con số
trên màn hình khớp với con số trên block explorer, và mọi ô nhập số tiền đều nhận dấu phẩy hoặc
dấu chấm làm dấu thập phân, chỉ từ chối số tiền mang cả hai. Chính các trang tài liệu này cũng
được dịch theo cách đó, trang đối trang, còn trang nào chưa ai dịch thì hiện bản tiếng Anh kèm
một dòng ở đầu nói rõ điều đó. Mọi bản dịch đều do một mô hình viết chứ không phải người bản
ngữ: tiếng Anh là bản gốc đáng tin cho mọi con số và tên hợp đồng, như
[danh sách giới hạn](../limitations.md) đã ghi.

## Những hợp đồng bạn sẽ chạm tới

Phần hướng dẫn dưới đây dùng pool USDC. Mọi pool khác là đúng bộ hợp đồng đó ở địa chỉ khác,
liệt kê trong [pool và token](../concepts/pools-and-tokens.md).

| Cái gì | Địa chỉ | Ai triển khai |
| --- | --- | --- |
| Mock USDC (ERC-20 công khai, hàm `mint` mở) | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` | Zama |
| Confidential USDC (`cUSDCMock`, lớp bọc ERC-7984) | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | Zama |
| HearthVault | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | Hearth |
| HearthPrizePool | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | Hearth |
| SponsoredYieldSource | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` | Hearth |

Hai địa chỉ Zama là những địa chỉ được công bố trong chính bảng tra địa chỉ Confidential Vault
của Zama cho Sepolia, nên token thử nghiệm là của Zama chứ không phải của chúng tôi. Mọi lớp
bọc bảo mật trong danh sách đó dùng 6 chữ số thập phân, nghĩa là mọi số tiền trên chuỗi trong
lớp bọc đều tính bằng phần triệu: 1.000 USDC được viết là `1000000000`. Token công khai bên
dưới có thể dùng thang khác, và hàm `rate()` của lớp bọc chính là hệ số quy đổi. Mock USDC
cũng dùng 6, nên hai bên khớp nhau; mock WETH dùng 18, nên tỷ lệ của nó là một triệu triệu.

## 1. Lấy ETH trên Sepolia

Bạn cần một ít ETH Sepolia để trả gas. Faucet Sepolia nào cũng được. Những cái hay dùng là
faucet Google Cloud Web3, faucet Sepolia của Alchemy và faucet Chainlink, mỗi cái chỉ cần xin
một lần là đủ cho cả bài này. Một phần mười ETH là thừa xa.

## 2. Mint token thử nghiệm

Cả bảy token mock công khai đều có hàm `mint(address, uint256)` công khai không kiểm tra chủ
sở hữu, giới hạn một triệu token mỗi lần gọi, và địa chỉ nằm ở bảng phía trên. Ứng dụng đưa nó
ra thành một nút ở màn hình Gửi tiền của pool bạn đang ở, tại bước đầu trong ba bước, ghi "Lấy
USDC thử nghiệm" khi ví bạn chưa có đồng nào và "Lấy thêm một triệu" khi đã có, kèm tên token
của chính pool đó. Làm tay, với USDC, thì là:

```
USDCMock.mint(yourAddress, 1000000000)     // 1,000 USDC
```

Cứ xin nhiều hơn mức bạn cần. Ở đây chẳng có gì đáng giá cả.

## 3. Shield: bọc USDC thành USDC bảo mật

Confidential USDC là lớp bọc ERC-7984 của Zama quanh mock USDC đó. ERC-7984 là chuẩn token
bảo mật: số dư nằm trên chuỗi dưới dạng giá trị đã mã hoá thay vì những con số ai cũng đọc
được. Bọc token là hai lệnh gọi:

```
USDCMock.approve(cUSDC, 1000000000)
cUSDC.wrap(yourAddress, 1000000000)
```

Trong ứng dụng, hai lệnh đó là bước 2 của Gửi tiền, "Shield số USDC của bạn". Nút ghi
"Shield", và ghi "Cấp quyền cho lớp bọc" khi hạn mức của lớp bọc còn thiếu so với số bạn nhập.
Quyền đó chỉ được xin một lần, với một hạn mức lớn, nên mọi lần shield sau lần đầu chỉ còn một
giao dịch thay vì hai. Nó chạm tới đúng một hợp đồng, là lớp bọc bảo mật của token đó, và cho
phép hợp đồng ấy rút token mock công khai ra khỏi ví bạn, không gì khác. Màn hình nói cả hai
điều đó ngay cạnh cái nút chứ không để bạn tự đi tìm.

Giờ bạn đang giữ 1.000 USDC bảo mật. Từ đây trở đi, số dư của bạn là một handle bản mã và chỉ
mình bạn đọc được.

Việc bọc token là công khai. Lớp bọc phát ra sự kiện `Wrap` mang theo số tiền ở dạng bản rõ,
lệnh chuyển ERC-20 bên dưới mang nó lần nữa, và số tiền xuất hiện lần thứ ba trong bản ghi
mã hoá tầm thường của coprocessor. Không có cách nào tránh được: biến một token công khai
thành token bảo mật, theo đúng định nghĩa, là một hành vi công khai.

## 4. Gửi tiền vào pool

Một lệnh gọi, và số tiền được mã hoá ngay từ đầu:

```
cUSDC.confidentialTransferAndCall(vault, encryptedAmount, inputProof, "")
```

Ứng dụng dựng sẵn đầu vào đã mã hoá và bằng chứng của nó cho bạn bằng SDK của Zama. Hook nhận
tiền của vault ghi có đúng số tiền mà token nói là đã thực sự chuyển, chứ không phải số bạn
xin, nên một lần chuyển bị thiếu vì bất kỳ lý do gì cũng không thể tạo ra tiền gốc ảo.

Chuyện đó kéo theo một hệ quả đáng biết trước khi bạn gõ một con số. Xin gửi nhiều hơn số dư
bảo mật của bạn thì trên chuỗi không chỗ nào từ chối cả: token chuyển đúng số mà ví có, có thể
là không có gì, và giao dịch vẫn thành công mà chẳng làm được gì. Nên chính màn hình giữ lấy
lằn ranh đó. Một khi bạn đã mở số dư bảo mật bằng con mắt, ô nhập tiền gửi ghi "Số đó lớn hơn
số bạn đang giữ" và cái nút vẫn tắt. Màn hình unshield còn đi xa hơn, vì bên đó không có gì để
mở: nó đọc số dư token công khai của bạn trước lượt chạy rồi đọc lại sau đó, và nếu hai lần
bằng nhau thì nó ghi "Không có gì dịch chuyển", gọi tên số tiền quá lớn là nguyên nhân thường
gặp, và chỉ sang nút "Tất cả".

Vault từ chối một khoản gửi mà số tiền của nó, hoặc tiền gốc sau khi cộng vào, sẽ đẩy bạn vượt
trần mỗi người gửi, trần đó với kỳ một giờ là khoảng 5 tỷ token và với kỳ sáu giờ là khoảng
854 triệu. Cả hai vế của phép kiểm đều quan trọng: phép cộng trên số mã hoá tràn lặng lẽ ở 64
bit, nên chặn cả số tiền vào lẫn tổng mới là thứ ngăn một khoản gửi khổng lồ làm tổng tràn
vòng về một số nhỏ rồi lọt qua. Bản thân lời từ chối cũng được mã hoá: hook trả về một giá trị
false đã mã hoá và token hoàn tiền cho bạn ngay trong cùng giao dịch, nên một lần bị từ chối
không nói cho ai biết số dư của bạn là bao nhiêu.

### Vì sao bọc và gửi là hai bước, không phải một

Phần lớn ứng dụng trong lĩnh vực này gộp "cấp quyền, bọc, gửi" vào sau một cái nút duy nhất.
Như thế thân thiện hơn, và như thế làm lộ khoản gửi của bạn.

Chúng tôi đã đo chuyện này trên chính bản triển khai trước của mình. Đọc log công khai của
Sepolia từ block 11528000 đến 11618500, ba trong năm khoản gửi nằm cách hai đến bốn block sau
một sự kiện `Wrap` công khai đúng 100 USDC của cùng địa chỉ đó. Ai đọc chuỗi cũng định giá
được ba khoản gửi ấy là 100 USDC mỗi khoản mà chẳng cần phá gì cả. Chính tài liệu của Zama gọi
tên đúng vấn đề này và đặt tên là tương quan shield với tham gia: "Một người dùng bọc 50.000
USDC rồi vài phút sau tham gia một lô thì thực chất chỉ mới công bố cận trên của số tiền họ
tham gia."

Vậy nên Hearth cố ý tách hai bước ra:

- Bọc một lần, bằng một số tròn, vào thời điểm bạn chọn.
- Giữ sẵn một số dư bảo mật thường trực rồi gửi một phần của nó vào sau.
- Gửi tiếp từ chính số dư đó mà không phải bọc lại.

Mối tương quan yếu đi theo thời gian, theo việc tái dùng một số dư thường trực, và theo lưu
lượng của người khác trên lớp bọc. Làm hết trong một cú nhấp là bỏ luôn cả ba lớp phòng thủ.
Ứng dụng hiện cảnh báo ngay ở bước shield thay vì giấu đi sự đánh đổi.

Cũng nên nói thẳng về cái giá của một số dư bị ghim, vì nó lớn hơn số tiền gửi nhiều. Ngưỡng
vốn công khai theo thiết kế, vì chính chúng làm cho kỳ quay kiểm chứng được. Nên ai biết số dư
của bạn thì tính ra được bạn có trúng hay không, ở mọi hạng giải, ở mọi kỳ quay kể từ đó, mà
chẳng cần giải mã gì. Đó là lý do việc này là hai bước chứ không phải một.

## 5. Chờ một kỳ quay

Một kỳ dài một giờ ở pool USDC và sáu giờ ở sáu pool còn lại, vì lý do gas nêu trong
[pool và token](../concepts/pools-and-tokens.md). Kỳ quay của một kỳ chỉ đóng được sau khi kỳ
đó đã kết thúc, và mọi việc liên quan phải xong trong hai kỳ kế tiếp.
Riêng việc đóng có hạn chót chặt hơn, là giữa kỳ thứ hai trong hai kỳ đó, để vòng đi về của
việc giải mã và việc trao giải luôn còn chỗ. Vậy nên khoản bạn gửi bây giờ sẽ ăn tỷ lệ trúng
cho kỳ hiện tại, và kết quả của kỳ đó về trong vòng vài giờ tới.

Bảng điều khiển hiển thị kỳ hiện tại và thời gian còn lại ở "Pool ngay lúc này", còn "Kỳ quay
của tôi" ở thanh bên hiển thị trạng thái của vài kỳ gần nhất. Bạn không phải làm gì cả. Nếu
muốn tự đẩy nó đi tiếp, mọi bước của một kỳ quay đều gọi được bởi bất kỳ ai, và "Chạy một kỳ
quay" ở thanh bên có đủ cả năm bước; xem [trang keeper](../operations/keeper.md).

Tỷ lệ trúng của bạn trong một kỳ dựa trên số dư trung bình của bạn suốt cả kỳ đó, không phải
số dư lúc kỳ kết thúc. Gửi tiền năm phút trước khi một kỳ một giờ đóng lại thì bạn mua được
một phần mười hai tỷ lệ trúng so với việc giữ đúng số tiền ấy cả kỳ. Đó là chủ ý; xem
[số dư bình quân theo thời gian](../concepts/time-weighted-balance.md).

## 6. Mở xem bạn đang giữ gì và trúng gì

Nhấn vào con mắt bên cạnh "Tiền gốc" trong thẻ "Bạn đang giữ" trên bảng điều khiển, rồi ký
thông điệp mà ví hiện ra. Các giá trị đang niêm phong hiện ra thành dấu sao cho tới khi bạn
ký, và con mắt là thứ duy nhất mở được chúng.

Chữ ký đó là giải mã người dùng theo EIP-712: một chữ ký ngoài chuỗi theo định dạng có kiểu,
chứng minh với relayer của Zama rằng bạn kiểm soát địa chỉ này, đổi lấy bản rõ của những giá
trị mà hợp đồng đã cấp quyền truy cập cho bạn. Nó không phải giao dịch. Nó không tốn gas và
không ghi gì lên chuỗi.

Bạn mở xem được bốn thứ về chính mình:

| Giá trị | Ý nghĩa |
| --- | --- |
| Tiền gốc | Số bạn đã tiết kiệm. |
| Tiền thưởng | Tiền giải thưởng đã ghi có cho bạn và chưa rút. |
| Trọng số, theo từng kỳ quay | Số dư bình quân theo thời gian của bạn trong kỳ đó, con số mà phép thử người trúng đem ra so. |
| Khoản ghi có, theo từng kỳ quay | Kỳ quay đó đã trả cho bạn bao nhiêu. Bằng không nếu bạn không trúng. |

Hai giá trị đầu mở cùng nhau từ một con mắt trong "Bạn đang giữ", trên bảng điều khiển. Hai
giá trị cuối mở cùng nhau từ con mắt bên cạnh "Giải của bạn", dưới mục "Kết quả của bạn" trên
thẻ của kỳ quay đó ở "Kỳ quay của tôi". Số dư của bạn và kết quả một kỳ quay mở cùng lúc được,
chữ ký cho cái thứ nhất dùng được luôn cho cái thứ hai, và nhấn vào một con mắt đang mở chỉ
niêm phong lại đúng cái thẻ chứa nó.

Hai giá trị cuối là thứ cho bạn tự kiểm tra kỳ quay: lấy trọng số của bạn, lấy seed công khai
và bậc công khai, tính lại các ngưỡng của bạn, rồi xác nhận khoản ghi có khớp. Vault đưa phép
tính ngưỡng ra thành một hàm view, `thresholdOf`, nên bạn đối chiếu được phần tính tay của
mình với hợp đồng. Xem
[tính ngẫu nhiên và cách kiểm chứng](../security/randomness-and-verification.md).

Không ai khác đọc được bốn giá trị này. Relayer từ chối yêu cầu giải mã đến từ một địa chỉ mà
hợp đồng chưa cấp quyền, và chính lời từ chối đó là cơ chế cưỡng chế, chứ không phải một chính
sách suông.

## 7. Nhận thưởng

Không có giao dịch nhận thưởng, chỉ có nút nhận thưởng.

Giải của bạn đã nằm sẵn trong số dư tiền thưởng ngay khi vòng duyệt chạm tới bạn. Bước 6 là
cách bạn biết chuyện đó. Khi kết quả của kỳ quay đã mở, thẻ của nó ở "Kỳ quay của tôi" hiện
một nút nhận thưởng mang theo số tiền, kiểu như "Nhận 1,00 USDC"; nhấn vào là gửi một lệnh rút
bình thường đúng số tiền ấy, còn bước 8 đem phần còn lại về nhà. Trên chuỗi, một lần nhận
thưởng và một lần rút tiền là cùng một lệnh gọi với cùng hình dạng, và đó là thứ giữ cho người
trúng không nổi bật lên.

Con mắt duy nhất trên tấm thẻ đó mở ra ba con số cùng lúc: trọng số của bạn cho kỳ quay ấy,
khoản ghi có của chính kỳ quay ấy, và `confidentialWinningsOf`, tức tất cả những gì vault còn
nợ ví này qua mọi kỳ quay. Cái nút dựa vào cả khoản ghi có lẫn con số đang chạy đó, và nó đưa
ra con số nhỏ hơn trong hai con số. Khoản ghi có của một kỳ quay không bao giờ đổi một khi đã
được ghi, nên một tấm thẻ chỉ dựa vào khoản ghi có sẽ mời bạn nhận lại đúng giải đó sau khi tải
lại trang, và chuỗi sẽ chấp nhận, lấy ra từ chính tiền gốc của bạn. Con số đang chạy kia tụt
xuống ngay khi một lệnh nhận thưởng vào block, đó là thứ lấy cái nút đi và để lại tấm thẻ nói
rằng giải đã được rút ra rồi, với con số được giữ lại làm ghi chép của kỳ quay.

Cũng chẳng có gì phải nhấn để được ghi có cả. Việc duyệt đi qua danh sách người gửi từ một
điểm do seed của kỳ quay đó quyết định. Nút "Đẩy kỳ quay đi tiếp" trên thẻ của kỳ quay, và nút
"Đi tiếp" ở màn hình "Chạy một kỳ quay", đều đẩy chung một vòng duyệt đó tiến lên chứ không
lôi riêng bạn ra khỏi nó. Người gửi nào nhấn một trong hai nút cũng không hề nói với ai rằng
mình đã trúng.

## 8. Rút tiền

```
vault.withdraw(encryptedAmount, inputProof)      // or vault.withdrawAll()
```

Trong ứng dụng, đó là hai nút "Rút" và "Rút tất cả" ở màn hình Rút tiền, trong tab "Ra khỏi
vault". Nút "Toàn bộ" bên cạnh ô nhập không phải lệnh gọi thứ ba: nó điền vào ô toàn bộ số bạn
đang giữ, sau khi bạn đã mở số dư của mình.

Lệnh rút trả từ tiền thưởng trước, rồi tới tiền gốc. Số tiền bị kẹp xuống theo giá trị nhỏ hơn
giữa số bạn đang giữ và số vault đang giữ, vì một lần chuyển bảo mật chuyển trọn số tiền hoặc
không chuyển gì, chứ không bao giờ chuyển một phần. Tính ra điều đó trước khi chuyển là thứ
giữ cho sổ sách chính xác mà không phải vá lại sau. Một lần chuyển bảo mật, một sự kiện, một
số tiền đã mã hoá.

Tiền gốc không bao giờ bị khoá. Bạn rút được ngay giữa một kỳ quay, và trọng số mà kỳ quay đã
chốt cho bạn thì không đổi.

## 9. Unshield: bọc ngược về USDC công khai

Hai lệnh gọi, vì việc bọc ngược vốn bất đồng bộ theo thiết kế. Trước là `unwrap`, sau là
`finalizeUnwrap`. Ứng dụng gửi cả hai từ nút "Unshield" ở tab "Về lại USDC thường" của màn
hình Rút tiền. Nếu lệnh thứ hai bị bỏ dở, một thẻ cảnh báo sẽ nằm trên hai tab đó cho tới khi
bạn nhấn "Hoàn tất unshield" trên nó. Danh sách tham số chính xác nằm trong lớp bọc của Zama,
không phải của chúng tôi.

Lệnh đầu đốt số tiền đã mã hoá và đánh dấu nó để giải mã công khai. Lệnh thứ hai giải phóng
token bản rõ sau khi protocol của Zama đã sinh ra bản rõ và bằng chứng của nó. Ứng dụng đọc số
dư token công khai của bạn trước lệnh đầu và đọc lại sau lệnh thứ hai, rồi báo phần chênh lệch,
nên "đã unshield 250,00 USDC" là một sự thật đo được chứ không phải con số bạn đã gõ. Khi phần
chênh lệch đó bằng không, nó ghi "Không có gì dịch chuyển" thay vì tuyên bố thành công: cả hai
giao dịch đều đã vào block, và lớp bọc không nhả gì ra chứ không từ chối khi số tiền lớn hơn số
dư bảo mật của bạn. Số tiền bạn bọc ngược là công khai, y hệt số tiền bạn đã bọc vào, và chính lệnh đầu tiên là lệnh công bố nó,
nên một lần unwrap mà bạn không bao giờ hoàn tất thì cũng đã rò ra rồi.

Từ đó có thêm một điều đáng biết. Nếu bạn bọc vào rồi bọc ngược ra hết, chênh lệch giữa hai
tổng công khai đó là cận dưới của toàn bộ số tiền bạn từng trúng, và khi bạn đã rút sạch thì
nó là con số chính xác. Bọc ngược sang một địa chỉ mới cũng không giúp gì, vì chính lần chuyển
bảo mật sang địa chỉ đó là mối liên kết. Nếu chuyện này quan trọng với bạn, hãy bọc ngược bằng
những số tròn không liên quan tới vị thế của bạn, hoặc để lại một số dư bảo mật thường trực.

## Thử trong hai phút

Ứng dụng là một bảng điều khiển có thanh dọc bên trái, mỗi màn hình một việc, nên đường đi
chính là đi dọc thanh đó xuống.

1. Mở https://hearth-ram.vercel.app, theo mục "Pool" trên đầu trang để tới `/app`, rồi kết nối
   ví trên Sepolia, bằng tiện ích mở rộng của trình duyệt hoặc bằng cách quét mã bằng ví trên
   điện thoại. Bạn sẽ vào pool USDC ở `/app/usdc`; tên token ở đầu thanh bên dùng để đổi pool.
   Bảng điều khiển mở ra với một khối ghi "Tiếp theo" gọi tên đúng một việc cần làm.
2. "Gửi tiền" ở thanh bên, màn hình này mở ngay tại bước mà ví của bạn đang dừng trong ba
   bước. Nhấn "Lấy USDC thử nghiệm", rồi "Shield", rồi "Gửi tiền". Lần shield đầu tiên xin một
   lần cấp quyền cho lớp bọc, và không lần shield nào sau đó hỏi lại.
3. Quay lại bảng điều khiển, nhấn con mắt bên cạnh "Tiền gốc" trong "Bạn đang giữ" rồi ký:
   tiền gốc và tiền thưởng của bạn cùng hiện ra, chỉ trong trình duyệt.
4. "Chạy một kỳ quay" ở thanh bên, dòng ghi "Bất kỳ ai". Nhấn "Đóng", rồi "Trao giải", để tự
   mình đóng và trao giải cho kỳ vừa kết thúc, hoặc ngồi xem keeper làm.
5. Nhấn "Đi tiếp" trên chính màn hình đó. Rồi mở "Kỳ quay của tôi" và nhấn con mắt dưới mục
   "Kết quả của bạn" trên thẻ của kỳ quay đó: trọng số và khoản ghi có của bạn cho kỳ quay ấy
   hiện ra, còn số dư từ bước 3 vẫn mở với chỉ một chữ ký.
6. Mở `/verify?pool=usdc`: seed công khai và bậc công khai nằm ở đó, "Ngưỡng cho một địa chỉ"
   tính lại các ngưỡng của bạn ngay trước mắt bạn, và phép so khớp. Đổi tham số `pool` sang
   slug khác để kiểm pool khác.
7. "Rút tiền" ở thanh bên, tab "Ra khỏi vault", nút "Rút tất cả". Tiền gốc và mọi khoản tiền
   thưởng về trong một lần chuyển.

Không bước nào trên đường đi đó cần chúng tôi online. Mọi bước của kỳ quay đều không cần cấp
phép.
