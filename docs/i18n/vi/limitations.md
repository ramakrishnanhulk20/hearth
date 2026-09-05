# Giới hạn

Mọi giới hạn chúng tôi biết, đánh số, gom về một chỗ. Các trang khác dẫn chiếu tới những con số
này.

Lý do trang này tồn tại rất đơn giản. Một tuyên bố về tính bảo mật chỉ đáng giá đúng bằng những
đường nối mà tác giả chịu gọi tên ra. Bất cứ điều gì bên dưới mà về sau làm bạn bất ngờ thì đó là
lỗi của chúng tôi, không phải một phát hiện.

## 1. Việc duyệt được gom lô, và lô thì có trần

Phép thử người trúng chạy trên những con số đã mã hoá, và Zama chặn mỗi giao dịch ở 20.000.000
đơn vị tính toán với 5.000.000 ở độ sâu tuần tự trên Sepolia. Việc duyệt một người gửi tốn
`3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)` trong số đó, nên nhiều nhất `4` người gửi cần tới phép tính mã hoá là vừa
một lệnh gọi.

**Nghĩa là gì:** một pool nhiều người gửi thì cần nhiều giao dịch mỗi kỳ quay. Chi phí tăng tuyến
tính theo số người gửi, và ai duyệt thì người đó trả bằng gas.

**Không có nghĩa là gì:** không hề có trần cho số người gửi mà pool hỗ trợ. Vài dự án trong lĩnh
vực này chặn số người tham gia ở 32 địa chỉ. Hearth không chặn số người tham gia chút nào; nó chỉ
chặn số người vừa trong một giao dịch. `evaluate` nhận số lượng bất kỳ, nên một lô nhỏ hơn không
cần triển khai lại.

## 2. Cửa sổ hai kỳ, và những giải thưởng hết hạn

Một kỳ quay phải được đóng, trao giải và duyệt trong hai kỳ ngay sau nó. Đó là hai giờ ở pool
USDC và nửa ngày ở các pool sáu giờ. Việc đóng còn có hạn chót chặt hơn nữa: giữa kỳ thứ hai
trong hai kỳ đó, để vòng đi về của việc giải mã và việc trao giải luôn còn ít nhất nửa kỳ. Sau
khi cửa sổ khép lại, kỳ quay kết thúc.

**Nghĩa là gì:** người gửi nào mà vòng duyệt không chạm tới trong cửa sổ thì mất kỳ quay đó, kể
cả khi các ngưỡng nói rằng họ đã trúng. Phần của họ trong thanh khoản của hạng được gộp vào phần
dư của hạng và tài trợ cho một kỳ quay sau. Đây đúng là hành vi của một giải PoolTogether V5 hết
hạn vì không ai nhận, và nó là trường hợp duy nhất trong hệ thống mà một người gửi thật mất đi
thứ họ có thể đã có.

**Vì sao có cửa sổ:** nó chặn việc vault phải nhớ số dư lùi lại xa tới đâu, và đó là thứ làm cho
ba mốc quan sát lưu cho mỗi người gửi là đủ. Cửa sổ một kỳ đã được thử và quá mong manh trước một
relayer chậm.

**Cái gì làm giảm nó:** keeper duyệt hết cả danh sách, ai cũng đẩy được vòng duyệt đi xa hơn từ
ứng dụng, và vòng duyệt bắt đầu ở một điểm khác nhau mỗi kỳ quay, nên không ai ngồi mãi ở cuối
hàng.

## 3. Có trần cho số tiền một người gửi được giữ

Các khoản gửi bị từ chối khi số tiền, hoặc tiền gốc sau khi cộng vào, vượt quá
`maxPrincipal = (2^64 - 1) / periodLength`. Với kỳ một giờ thì đó là khoảng 5 tỷ token, với kỳ
sáu giờ mà các pool kia chạy thì khoảng 854 triệu, và với kỳ một ngày thì sẽ là khoảng 213 triệu.

**Nghĩa là gì:** cái trần đó có thật, và với kỳ một ngày trên mainnet thì đó là con số mà một tổ
chức lớn chạm tới được.

**Vì sao nó tồn tại:** giá trị mã hoá ở đây là 64 bit, và số-dư-giây tích luỹ của một người gửi
phải nằm gọn trong đó. Một lần tràn số mã hoá không revert và không ai nhìn thấy nó xảy ra, nên
cái trần được cưỡng chế ngay ở cửa. Phép kiểm chặn cả số tiền vào lẫn cái tổng sau đó, vì nếu
không thì một khoản gửi đủ lớn để làm tổng tràn vòng qua `2^64` sẽ cho ra một con số nhỏ lọt qua
phép kiểm.

**Lời từ chối hành xử thế nào:** nó được trả về dưới dạng một giá trị false đã mã hoá và token
hoàn lại khoản gửi trong cùng giao dịch, nên chạm trần cũng không để lộ số dư của bạn.

## 4. Không có hạng dự trữ

PoolTogether V5 giữ một phần chia dự trữ để bù cho một hạng bị vượt số giải. Hearth không có quỹ
dự trữ. Tỷ lệ sử dụng 50 phần trăm là tấm đệm duy nhất.

**Nghĩa là gì:** khi một hạng phát ra nhiều giải hơn khả năng cấp vốn của nó, chuyện xảy ra ở
nhiều nhất khoảng 2 phần trăm số kỳ quay với hạng giải thường, thì những người gửi mà vòng duyệt
chạm tới sau cùng nhận ít hơn hoặc không nhận gì, chứ không được bù thêm.

**Vì sao:** một quỹ dự trữ muốn hữu dụng thì cần một đường rút do chủ sở hữu kiểm soát, mà mọi
quyền của chủ sở hữu trong một pool bảo mật đều là thứ người gửi buộc phải tin.

## 5. Tỷ lệ của hạng giải lớn được đo trên một kỳ

V5 đo tỷ lệ của hạng giải lớn trên cả cửa sổ tích luỹ của hạng đó. Hearth đo trên một kỳ duy
nhất, như mọi hạng khác.

**Nghĩa là gì:** một người giữ nhiều tham gia đúng một kỳ vẫn có một cú bắn trọn theo tỷ lệ vào
cái quỹ mất 24 kỳ mới đắp lên. Người tiết kiệm suốt cả 24 kỳ không có quyền đòi hỏi gì thêm với
nó.

**Cách sửa đã biết, hoãn lại:** tích luỹ số-dư-giây kể từ lần trả giải lớn gần nhất rồi tính
trọng số hạng giải lớn theo đó. Nó thêm một bộ luỹ kế thứ hai kèm phần phân tích tràn số riêng,
nên đó là thay đổi cho phiên bản hai chứ không phải một phần thêm chưa được chứng minh vào phiên
bản một.

## 6. Quyền riêng tư cần từ ba người gửi trở lên

Tổng số dư bình quân theo thời gian chính xác của pool không bao giờ được công bố. Thứ được công
bố mỗi kỳ quay là luỹ thừa hai nhỏ nhất nằm trên nó, vì kỳ quay cần một thang công khai nào đó để
chạy trên đó.

**Lỗ rò mà nó thay thế:** công bố tổng chính xác cho phép bất kỳ ai moi ra đúng số tiền gửi của
người duy nhất dịch chuyển. Hai con số tổng liên tiếp, các dấu thời gian công khai của những sự
kiện gửi và rút, thế là phép tính chỉ còn là một phép chia hết không dư. Đó từng là thiết kế cho
tới ngày 3 tháng 9 năm 2026 và một lượt rà soát đã phá vỡ nó.

**Bây giờ nghĩa là gì:** với một người gửi, bậc được công bố chính là trọng số của người đó, sai
lệch trong khoảng gấp đôi. Với hai người, mỗi người chặn được khoảng của người kia theo cách đó.
Dưới ba người gửi thì không có tập ẩn danh nào đáng kể. Các bậc liên tiếp vẫn trừ nhau được,
nhưng chúng bằng nhau trừ khi pool vượt qua một luỹ thừa hai, nên phép trừ cho ra một dải chứ
không cho ra một con số.

**Ứng dụng làm gì:** nó nói rõ điều này mỗi khi pool có ít hơn ba người gửi, thay vì trưng ra một
lời hứa riêng tư không đúng ở quy mô đó.

## 7. Tầng token là của Zama, và các quyền của nó vẫn áp dụng

Tài sản của Hearth là lớp bọc USDC bảo mật của Zama, không phải của chúng tôi.

**Nghĩa là gì:** chủ sở hữu của nó bổ nhiệm được những người quan sát có thể giải mã mọi số tiền
đi qua token, và làm được điều đó **có hiệu lực hồi tố**, nên những số tiền đã nằm trên chuỗi vẫn
phơi ra trước một người quan sát được bổ nhiệm về sau. Canh chừng lần bổ nhiệm rồi rút ra không
phải một hàng phòng thủ. Phạm vi là các số tiền gửi, các khoản chi khi rút, số dư của chính pool,
và một lần chuyển cấp vốn giải thưởng cho mỗi lô duyệt. Chủ sở hữu cũng chặn được một địa chỉ, và
hợp đồng thì nâng cấp được. Tính tới ngày 2 tháng 9 năm 2026, chưa có người quan sát nào và vai
trò tạm dừng chưa được đặt.

**Nó không với tới đâu:** cuốn sổ của chính Hearth. Tiền gốc, tiền thưởng, trọng số theo từng kỳ
quay và khoản ghi có theo từng kỳ quay nằm trong vault, và token không có quyền truy cập nào trên
chúng.

**Một hệ quả về sản phẩm, và mọi pool đang chạy đều dính nó ở mọi kỳ quay:** lần chuyển cấp vốn
của một lô mang theo tổng đã ghi có cho tất cả mọi người trong lô, nên một lô một người thì mang
theo giải thưởng chính xác của một người gửi, dưới giả định có người quan sát. Lô cuối của vòng
duyệt chứa đúng một người gửi mỗi khi số người gửi không phải bội số của cỡ lô. Cả bảy pool đều
được mồi năm người gửi với cỡ lô là 4 (`KEEPER_BATCH`, `packages/keeper/src/config.ts`), nên mọi
kỳ quay đều kết thúc bằng một lô một người, và sự kiện `Evaluated` trong chính giao dịch đó gọi
tên người gửi mà nó thuộc về.

Bảy pool là bảy lớp bọc riêng với quyền của bảy chủ sở hữu riêng, nên điều này áp dụng cho từng
pool một chứ không phải một lần cho tất cả.

Không cỡ lô tối thiểu nào sửa được chuyện này, vì `evaluate(uint32,uint256)`
(`packages/contracts/contracts/HearthVault.sol`) không cần cấp phép và lấy cỡ lô từ người gọi,
nên bất kỳ người quan sát nào cũng ép được một lô một người bất kể keeper làm gì. Chúng tôi ghi
nhận nó như một phần dư được chấp nhận: nó chỉ cắn dưới giả định có người quan sát, mà
`observerCount()` trên thực tế đang bằng 0. Cách sửa ở phía hợp đồng, đã hoãn: tích luỹ các khoản
ghi có theo từng kỳ quay rồi gửi một lần chuyển cấp vốn duy nhất lúc chốt, hoặc chèn thêm cho mọi
tổng của lô.

**Phương án chúng tôi đã bác:** tự viết token bảo mật của mình. Cách đó đổi một hợp đồng đã biết,
đã kiểm toán, do Zama vận hành, lấy một hợp đồng mà chúng tôi tự chấm điểm.

## 8. Các kỳ quay phụ thuộc vào việc có ai đó gửi giao dịch

Trên chuỗi không có gì tự nổ cả.

**Nghĩa là gì:** nếu không keeper nào chạy và không người gửi nào hành động, một kỳ quay bị bỏ
qua và kỳ đó không trả giải nào. Một lần đóng lỡ hạn chót thì bị từ chối thẳng chứ không làm kỳ
quay kẹt lại, và một lần trao giải rơi sau cửa sổ vẫn ghi sổ phần thu hoạch, trả lại phần thanh
khoản đem ra và đánh dấu kỳ quay là `Skipped`.

**Không có nghĩa là gì:** tiền gặp rủi ro. Một kỳ quay bị bỏ qua giữ nguyên thanh khoản của nó
trong các hạng, phần thu hoạch được một lần trao giải muộn ghi sổ, và việc gửi cùng việc rút
không bị ảnh hưởng suốt quá trình.

**Cái gì làm giảm nó:** mọi bước đều không cần cấp phép và ứng dụng đưa chúng ra, nên bất kỳ
người gửi nào cũng đẩy được một kỳ quay đi tiếp. Pool còn cài đặt giao diện tự động hoá của
Chainlink cho bước đóng, tức bước duy nhất không cần dữ liệu ngoài chuỗi và cũng là bước duy nhất
có hạn chót, nhưng chưa pool nào trong bảy pool đăng ký upkeep, nên hôm nay chỉ có các keeper và
ứng dụng là tất cả. Mỗi pool có tiến trình keeper riêng trên tài khoản riêng, nên một keeper dừng
lại, hay một tài khoản hết ETH Sepolia, chỉ làm pool đó mất các kỳ quay và sáu pool kia vẫn chạy.

## 9. Lợi suất trên Sepolia là được tài trợ, không phải kiếm được

Tiền giải thưởng của mọi pool đến từ chính số dư do nhà tài trợ bỏ vào, nhỏ giọt theo một tốc độ
đặt sẵn.

**Nghĩa là gì:** đó không phải lợi suất thật. Không ai kiếm được nó từ việc cho vay hay từ một
vault. Khi số dư được tài trợ cạn, giải thưởng dừng. Một khoản tài trợ đã cho thì không lấy lại
được, và chỉ chủ sở hữu của nguồn mới đổi được tốc độ.

**Vì sao:** trên Sepolia không có nơi nào trả lợi suất trên các token mock của Zama. Aave từ chối
những khoản gửi đó, Compound muốn USDC của chính Circle, còn vault Sepolia của Zama thì chỉ để
không, không có bộ nối lợi suất, và đó là mô tả của chính Zama về nó.

**Cái gì là thật ở đây:** từng đơn vị tiền giải thưởng đều thật sự được bọc, thật sự được chuyển
tới pool bằng một lần chuyển mã hoá, và thật sự được kiểm chứng qua một lần giải mã có chữ ký KMS
trước khi được ghi có. Một nguồn bị revert cũng không còn dừng được một kỳ quay: phần thu hoạch
được ghi bằng không, `HarvestFailed` được phát ra và việc đóng vẫn thành công. Nguồn gốc của tiền
là một bản mock. Phần đường ống thì không.

## 10. Đường nối lúc bọc token, và cái giá của một số dư bị ghim

Biến USDC công khai thành USDC bảo mật là một lần chuyển công khai, nên số tiền nhìn thấy được.

**Nghĩa là gì:** người gửi nào bọc rồi gửi ngay đúng số tiền ấy thì đã công bố khoản gửi của
mình. Chúng tôi đã đo chuyện này trên chính bản triển khai trước của mình: ba trong năm khoản gửi
thật nằm cách hai đến bốn block sau một lần bọc công khai đúng 100 USDC.

**Ngoài số tiền ra thì nó còn tốn gì:** ngưỡng là công khai, vì chúng là thứ làm cho kỳ quay kiểm
được. Nên một số dư mà người quan sát ghim được sẽ có kết quả công khai ở mọi kỳ quay và mọi hạng
giải, tính ra mà chẳng cần giải mã gì cả, và cũng ở mọi kỳ quay về sau nữa, vì tiền thưởng không
bao giờ tham gia vào tỷ lệ trúng. Ngay cả một cận trên lỏng lẻo cũng chứng minh chắc chắn một lần
trượt ở bất kỳ hạng nào có ngưỡng nằm trên nó.

**Hearth làm gì:** giữ việc bọc và việc gửi thành hai bước riêng, nói với bạn ngay ở bước bọc là
hãy dùng một số tròn để lần bọc là một cái xô chứ không phải một con số chính xác, cảnh báo ở
bước gửi, và cho người gửi giữ một số dư bảo mật thường trực để một khoản gửi đi ra từ một khối
tích luỹ mà không ai biết thành phần.

**Hearth không làm được gì:** xoá bỏ nó. Không có cách bảo mật nào để đổi một token công khai, và
không có cách nào làm một ngưỡng thành riêng tư mà không làm kỳ quay hết kiểm được.

## 11. Thứ tự vòng duyệt quyết định ai bị hụt ở một hạng vượt số giải

Khi một hạng cạn giữa chừng một kỳ quay, người gửi mà vòng duyệt chạm tới vào đúng lúc đó nhận
phần còn lại, còn những người sau đó không nhận được gì từ hạng ấy.

**Nghĩa là gì:** trong một kỳ quay hiếm hoi bị vượt số giải, có ai đó bị thiệt vì một vị trí họ
không hề chọn.

**Nó không còn là gì nữa:** một cái đòn bẩy. Một phiên bản trước cho phép người gọi `evaluate`
nộp vào một danh sách địa chỉ, việc đó đặt thứ tự vào tay keeper và cho một người gửi mua chỗ đầu
hàng. Bây giờ người gọi truyền vào một con số, vòng duyệt bắt đầu ở một điểm suy ra từ seed của
kỳ quay, và điểm khởi đầu dịch chuyển mỗi kỳ quay.

**Cái gì làm giảm nó:** người gửi bị ảnh hưởng nhìn thấy được chuyện đó, vì trọng số và khoản ghi
có của họ cho kỳ quay ấy đều tự họ giải mã được, nên một khoản ghi có bị hụt là chuyện chứng minh
được chứ không phải chuyện bí ẩn.

## 12. Kỳ quay chạy trên một bậc, nên một hạng trả từ một nửa tới toàn bộ số giải của nó

Phép thử người trúng dùng `M`, luỹ thừa hai nhỏ nhất nằm trên tổng trọng số của pool, thay cho
chính cái tổng. Vậy nên `M` nằm giữa `W` và `2W`.

**Nghĩa là gì:** số giải kỳ vọng của mọi người gửi bị co theo hệ số `W / M`, một con số giữa một
nửa và một, nên mỗi kỳ quay một hạng trả từ một nửa tới toàn bộ số giải danh nghĩa `count * odds`
của nó. Một pool vừa vượt qua một luỹ thừa hai thì trả ở đầu thấp của dải đó cho tới khi nó lớn
lên vừa với cái bậc của mình.

**Không có nghĩa là gì:** mất tiền hay méo tỷ lệ. Mọi người gửi trong một hạng đều bị co theo
cùng một hệ số, nên phần của ai cũng không đổi so với phần của người khác. Phần một hạng không
trả đi vào phần dư mã hoá của nó và được đem ra lần nữa, nên giá trị giải ổn định ở đâu đó giữa
các con số danh nghĩa và gấp đôi chúng, còn toàn bộ lợi suất thì vẫn đi ra hết.

**Vì sao chúng tôi chọn thế:** phương án còn lại là công bố tổng chính xác, tức giới hạn số 6.

## 13. Tổng tiền thưởng tích luỹ thành công khai nếu bạn đi vòng qua lớp bọc rồi về

Bọc vào và bọc ngược ra đều là những lần dịch chuyển công khai ở tầng token, và chính lệnh gọi
đầu tiên trong hai lệnh unwrap là lệnh công bố số tiền, nên một lần unwrap bạn không bao giờ hoàn
tất thì cũng đã rò nó ra rồi.

**Nghĩa là gì:** với một địa chỉ mà đối tác USDC bảo mật duy nhất của nó là Hearth, tổng công
khai đã bọc ngược trừ tổng công khai đã bọc vào là một cận dưới của tiền thưởng cả đời đã rút, và
nó trở thành con số chính xác khi địa chỉ đó đã rút sạch. Bọc ngược sang một địa chỉ mới cũng
không giúp gì, vì chính lần chuyển bảo mật sang địa chỉ đó là mối liên kết.

**Cái gì làm giảm nó:** bọc ngược bằng những mệnh giá tròn không liên quan tới vị thế của bạn,
hoặc để lại một số dư bảo mật thường trực và không bao giờ đi vòng về hết.

## 14. Một số dư không bao giờ đổi sẽ bị các số đếm giải công bố thu hẹp dần

Mỗi lần đối soát đều công bố một hạng đã trả bao nhiêu giải. Vì mọi ngưỡng đều công khai, con số
đếm đó là một ràng buộc có dạng "bao nhiêu người gửi trong nhóm này có trọng số vượt ngưỡng công
bố của chính họ", và các ràng buộc thì tích luỹ dần.

**Nghĩa là gì:** người gửi nào có số dư không bao giờ đổi qua nhiều kỳ quay sẽ bị các số đếm đó
thu hẹp dần. Người gửi nào gửi thêm hay rút bớt là đặt lại ẩn số của chính mình.

**Cái gì giới hạn tốc độ đó:** không bao giờ có gì mịn hơn một số nguyên giải được tiết lộ, và
các ngưỡng thì kẻ tấn công không chọn được, vì seed được rút bên trong coprocessor và chỉ hé lộ
sau khi kỳ của nó đã đóng.

**Chúng tôi đã làm gì với nó: không làm gì, và đây là lý do.** Hợp đồng có sẵn một cái núm cho
đúng chuyện này. `reconcileEvery[t]` là số kỳ quay trôi qua giữa hai lần công bố phần dư của một
hạng, và nâng nó lên ở hạng giải lớn sẽ công bố một số đếm mỗi ngày thay vì mỗi giờ, nên một giải
độc đắc sẽ bị quy cho tất cả những ai đủ điều kiện trong cả ngày thay vì nhúm người đủ điều kiện
trong một kỳ quay. Lượt chạy kiểm tra công bằng cho thấy cái giá của việc đó. Một lần đóng chuyển
toàn bộ thanh khoản công khai của một hạng vào kỳ quay và nó chỉ quay lại ở một lần đối soát, nên
với nhịp 24 thì thanh khoản công khai của hạng giải lớn chỉ là phần thu hoạch của một kỳ quay ở
23 trên 24 kỳ quay, và giá trị giải được lấy theo đó, còn cái quỹ tích luỹ chỉ lộ ra ở kỳ quay có
đối soát. Số tiền đó vẫn được đem ra và vẫn trúng được suốt thời gian ấy, nằm trong phần dư mã
hoá, nhưng không ai xem được giải độc đắc lớn lên.

Không thể vừa giấu được số đếm vừa có một giải độc đắc lớn dần trước mắt mọi người, và bản triển
khai này chọn giải độc đắc nhìn thấy được. Cả ba hạng chạy ở `reconcileEvery = 1`, nên phép đo
nói trên chạy ở mức một số đếm cho mỗi hạng ở mỗi kỳ quay. Cái núm đó là một tham số khởi tạo và
một bản triển khai coi trọng phép đo chậm hơn cái quỹ nhìn thấy được thì cứ vặn nó lên cao.

## Không phải giới hạn, nhưng đáng nói thẳng

- **Sáu trong bảy pool quay sáu giờ một lần, và đó là một quyết định về gas.** Một kỳ quay với
  năm người gửi tốn `8,456,388` gas, nên bảy pool theo giờ sẽ tiêu khoảng `1.43 ETH` một ngày
  trên Sepolia, mà faucet công khai không theo nổi. Chỉ pool USDC, triển khai đầu tiên, còn quay
  theo giờ. Tỷ lệ trúng theo hạng giải của mỗi pool được đặt theo chính kỳ của pool đó, nên nhịp
  giải thưởng là như nhau ở cả hai đồng hồ.
- **Mười sáu ngôn ngữ là dịch máy.** Phần chữ trên giao diện và các trang tài liệu đã dịch đều do
  một mô hình viết ra chứ không phải người bản ngữ, và chưa được rà soát chuyên nghiệp. Tiếng Anh
  là nguồn chân lý cho mọi con số, tên hợp đồng và tuyên bố trên trang này, còn một trang chưa
  được dịch thì lùi về tiếng Anh chứ không lùi về một bản phỏng đoán.
- **Người gửi lớn thì trúng thường xuyên.** Tỷ lệ trúng tỷ lệ thuận với số dư bình quân theo thời
  gian, nên ai giữ nhiều trong thời gian dài thì trúng nhiều. Đó là thiết kế, không phải khiếm
  khuyết.
- **Giá trị giải và số đếm giải là công khai.** Trong PoolTogether chúng vốn luôn công khai. Thứ
  được giữ kín ở đây là ai trúng, không phải pool kiếm được bao nhiêu.
- **Hearth chưa được bên thứ ba kiểm toán.** Nó được tự kiểm toán bằng các cuộc tấn công đã thực
  thi và các bài kiểm thử tính chất, và [mô hình mối đe doạ](security/threat-model.md) là phần
  thay thế trung thực cho điều đó chứ không phải một sự thay thế tương đương.
