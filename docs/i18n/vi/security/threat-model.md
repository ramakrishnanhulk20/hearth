# Mô hình mối đe doạ

Chín kiểu kẻ tấn công, mỗi bên muốn gì, cái gì chặn được họ, và cái gì không. Cột cuối cùng mới
là cột đáng đọc. Một mô hình mối đe doạ chỉ liệt kê hàng phòng thủ thì đó là quảng cáo.

Các hợp đồng lõi của Hearth bất biến sau khi triển khai. Không có proxy và không có đường nâng
cấp, nên không gì trên trang này đổi được về sau, trừ khi triển khai một pool mới.

**Mỗi pool là một ốc đảo riêng.** Bảy pool trên Sepolia là bảy bản triển khai riêng của cùng
một đoạn mã, mỗi pool một token bảo mật, và chúng không dùng chung bộ nhớ, số dư hay registry
nào. Một pool chỉ nắm token của chính nó, chỉ cấp vốn cho vault của chính nó và được vận hành
bằng tài khoản keeper của chính nó, nên một lỗi trong lớp bọc của một token, một chủ sở hữu tạm
dừng một vault, hay một keeper đứng máy đều không với tới được người gửi hay tiền giải thưởng
của pool khác. Phần tiếp theo mô tả một pool, và áp dụng cho từng pool trong bảy pool một cách
độc lập.

## 1. Một người quan sát tò mò

Ai đó có nút lưu trữ, một block explorer và thời gian. Không vốn, không quyền truy cập đặc
biệt.

**Muốn gì:** biết ai tiết kiệm bao nhiêu, tỷ lệ trúng của ai tốt nhất, và ai trúng ở kỳ quay
nào.

**Bị chặn bởi:** mọi giá trị của từng người đều là một bản mã. Tiền gốc, tiền thưởng, trọng số
theo từng kỳ quay và khoản ghi có theo từng kỳ quay chỉ đọc được bởi chính người gửi sở hữu
chúng, được cưỡng chế bằng danh sách kiểm soát truy cập của Zama, thứ khiến relayer từ chối yêu
cầu giải mã từ bất kỳ địa chỉ nào khác. Không có giao dịch nhận thưởng nào để rình, và việc
duyệt không nhắm vào chính mình được, nên không tồn tại giao dịch nào mà chỉ người trúng mới
gửi. Người trúng và người trượt nhận cùng các thao tác ghi trong cùng một lô, vì khoản chi là
một phép chọn mã hoá chứ không phải một nhánh rẽ, nên hình dạng giao dịch và chi phí gas trùng
nhau.

**Một lỗ rò mà thiết kế này đã bỏ đi.** Một bản nháp trước đó công bố tổng số dư bình quân theo
thời gian chính xác của pool ở mỗi kỳ quay. Với con số đó công khai ở hai kỳ liên tiếp, cộng
với dấu thời gian công khai của chính giao dịch một người gửi, thì người gửi nào là người duy
nhất dịch chuyển tiền trong một kỳ sẽ bị moi ra chính xác số tiền đó, chứ không chỉ bị chặn
khoảng. Bây giờ vault chỉ công bố bậc luỹ thừa hai nằm trên cái tổng, theo dõi bằng năm phép so
mã hoá mỗi kỳ quay, và phương trình kia chẳng còn gì để giải. Phát biểu đầy đủ là quy tắc 1 của
[những gì được giữ kín](what-stays-private.md).

**Không bị chặn bởi bất cứ thứ gì:**

- Danh sách người gửi, và block mà mỗi người gửi, rút hay được duyệt.
- Cái bậc mà tổng của pool rơi vào, thứ mà khi có ít hơn ba người gửi sẽ ghim trọng số của một
  người gửi trong sai số gấp đôi. Xem quy tắc về tập ẩn danh trong
  [những gì được giữ kín](what-stays-private.md).
- **Một số dư mà người quan sát ghim được thì có kết quả công khai ở mọi kỳ quay.** Ngưỡng công
  khai theo thiết kế, và phép thử người trúng là một hàm tất định của một bí mật cộng với dữ
  liệu công khai. Bọc 1.000 USDC rồi vài giây sau gửi 1.000 USDC là mọi lần trúng và trượt của
  bạn, ở mọi hạng giải, ở mọi kỳ quay từ đó về sau, đều thành số học công khai.
- **Tổng tiền thưởng tích luỹ là một cận dưới công khai** với một địa chỉ bọc vào rồi bọc ngược
  ra hết, vì cả hai chiều dịch chuyển đều công khai ở tầng token.
- **Một số dư đứng yên bị thu hẹp dần.** Các số đếm giải được công bố là một phép đo nhỏ trên
  phân bố số dư và chúng tích luỹ dần đối với người gửi có số dư không bao giờ đổi. Mọi hạng
  giải đều công bố số đếm của mình trễ một kỳ quay, nên phép đo chạy mỗi hạng một lần mỗi kỳ
  quay. Cái nhịp có thể làm nó chậm lại là một núm khởi tạo mà bản triển khai này đặt về một, vì
  chính bước đó là bước trả tiền chưa ai trúng về cái quỹ công khai và giữ cho giải độc đắc nhìn
  thấy được. Giới hạn số 14.
- Phần dư hành vi: chỉ rút sau những kỳ quay bạn trúng, lặp qua nhiều kỳ.

## 2. Cá voi

Ai đó có nhiều vốn và muốn mua tỷ lệ trúng với giá rẻ.

**Muốn gì:** ôm giải mà không để tiền lại trong pool, hoặc cày cơ chế.

**Bị chặn bởi:**

- **Tính trọng số theo thời gian.** Tỷ lệ trúng đến từ số dư trung bình suốt cả kỳ. Một khoản
  gửi lúc chỉ còn 6 phút của một kỳ một giờ chỉ ăn một phần mười tỷ lệ trúng so với cùng số tiền
  đó giữ cả kỳ. Đây là hàng phòng thủ mà thiết kế trước của chúng tôi thiếu, và cuộc tấn công nó
  cho phép đã được thực thi: kẻ tấn công quay vòng 9.000 USDC quanh mỗi kỳ quay đã trúng 19 trên
  20 kỳ và vét sạch khoản dự trữ 5.000 USDC.
- **Tính tuyến tính.** Số giải kỳ vọng tỷ lệ đúng theo trọng số, và cái bậc mà kỳ quay chạy trên
  đó không phụ thuộc vào việc trọng số của pool được chia thế nào giữa các địa chỉ. Tách một ví
  thành sáu chẳng được gì, mà gộp sáu thành một cũng chẳng được gì.
- **Trần cho mỗi người gửi.** Các khoản gửi bị từ chối khi số tiền, hoặc tiền gốc sau khi cộng
  vào, vượt quá `(2^64 - 1) / L`, và lời từ chối được mã hoá nên nó không tiết lộ gì. Chặn cả số
  tiền lẫn cái tổng mới là thứ ngăn phép cộng mã hoá trong phép kiểm bị tràn vòng.

**Không bị chặn:**

- Một cá voi thực sự giữ số dư lớn suốt cả kỳ thì trúng thường xuyên. Đó là sản phẩm, không phải
  một cuộc tấn công: tiền của họ đã sinh ra phần lợi suất trả giải.
- Tỷ lệ của hạng giải lớn được đo trên một kỳ, nên một cá voi tham gia đúng một kỳ vẫn có một cú
  bắn trọn theo tỷ lệ vào cái quỹ mất 24 kỳ mới đắp lên. Đó là một chỗ lệch so với PoolTogether
  V5 đã được nêu rõ và là giới hạn số 5.

## 3. Kẻ phá bĩnh đăng ký người gửi giả

Ai đó thêm thật nhiều địa chỉ vô giá trị vào danh sách người gửi.

**Muốn gì:** làm nghẽn các kỳ quay, pha loãng tỷ lệ trúng, hoặc làm cho pool tốn kém khi vận
hành.

Việc đăng ký mở theo đúng cấu trúc. Hook nhận tiền không nhìn thấy số tiền mã hoá được trao cho
nó, nên bất kỳ địa chỉ nào kích hoạt nó đều vào danh sách người gửi, kể cả với một số không đã
mã hoá, và danh sách thì không bao giờ bị tỉa.

**Bị chặn bởi:**

- **Tỷ lệ trúng không suy suyển.** Người gửi không có số dư thì trọng số bằng không. Trọng số
  không thì không vượt được ngưỡng nào, và nó không đóng góp gì vào cái tổng, nên tỷ lệ trúng
  của mọi người gửi thật đúng bằng mức họ có nếu không có mấy kẻ giả kia. Thiết kế trước của
  chúng tôi cần một khoản đặt cọc đăng ký để làm chuyện này. Thiết kế này thì không.
- **Không nghẽn được việc duyệt.** Người gửi đã được duyệt cho một kỳ quay, địa chỉ không phải
  người gửi, và người gửi có mốc quan sát đầu tiên sau kỳ, tất cả đều bị bỏ qua mà không revert,
  và việc bỏ qua được quyết định từ các dấu thời gian bản rõ, không tốn chi phí mã hoá nào. Một
  mục xấu không làm hỏng được cả lô.
- **Lô bị chặn trần** ở `4` người gửi cần tới phép tính mã hoá cho mỗi lệnh gọi, nên không giao
  dịch đơn lẻ nào bị đẩy quá giới hạn tính toán của Zama.

**Không bị chặn:** chi phí của keeper cho mỗi kỳ quay tăng theo danh sách người gửi, mà danh
sách đó chỉ có thêm chứ không bớt. Kẻ phá bĩnh không đổi được tỷ lệ trúng của ai, nhưng làm cho
việc duyệt hết mọi người trở nên đắt đỏ. Câu trả lời của keeper là một trần phí, không phải một
ngân sách. `KEEPER_MAX_FEE_GWEI` khiến nó ngồi ngoài trọn một nhịp khi phí mạng vượt trần
(`gasIsAffordable` trong `packages/keeper/src/keeper.ts`), còn khi dưới trần thì nó gửi tiếp
cho tới khi con trỏ chạm cuối vòng duyệt. Người gửi không có mốc quan sát trước kỳ thì bị bỏ
qua dựa trên dấu thời gian bản rõ, không tốn chi phí mã hoá, nên nhồi danh sách chỉ tốn gas của
keeper chứ không làm người gửi mất giải. Trên chuỗi không có gì chặn trần việc duyệt, nên hệ
quả trung thực là nếu gas cứ đứng trên trần trong một pool bị phá bĩnh nặng thì vòng duyệt có
thể không chạm hết được mọi người gửi thật trong cửa sổ.
Có hai thứ làm dịu nó. Vòng duyệt bắt đầu ở một điểm khác nhau mỗi kỳ quay, suy ra từ seed của
kỳ quay đó, nên không ai đứng cuối một cách hệ thống. Và bất kỳ ai cũng đẩy vòng duyệt đi xa
hơn được từ ứng dụng, việc đó tốn gas và không tiết lộ gì về người đang yêu cầu. Xem
[trang keeper](../operations/keeper.md).

## 4. Một keeper lười biếng hoặc có ý xấu

Cái địa chỉ vốn thường đẩy các kỳ quay đi tiếp. Của chúng tôi, hay của người khác.

**Muốn gì:** bỏ qua một kỳ quay mà nó không trúng, chọn thứ tự trả tiền cho người gửi, hoặc đơn
giản là ngừng làm việc.

**Bị chặn bởi:**

- **Mọi bước đều không cần cấp phép.** Đóng, trao giải, duyệt, chốt và đối soát, ai cũng gọi
  được, kể cả bất kỳ người gửi nào ngay trong ứng dụng. Một keeper từ chối trao giải cho một kỳ
  quay thì cũng không làm nó biến mất được; người khác sẽ trao giải.
- **Keeper không chọn được ai bị duyệt.** `evaluate(drawId, count)` nhận một con số, không nhận
  một danh sách. Thứ tự vòng duyệt do seed của kỳ quay cố định, nên keeper không đặt được mình
  hay bạn mình lên đầu trong một hạng bị vượt số giải, và cũng không bỏ sót được một người gửi
  cụ thể.
- **Đóng muộn thì bị từ chối, không phải được châm chước.** Việc đóng phải xong trước
  `closeDeadline(p)`, tức giữa kỳ thứ hai của cửa sổ. Một lần đóng ở block cuối cùng của cửa sổ
  sẽ chẳng còn chỗ cho vòng đi về của việc giải mã và sẽ làm kỳ quay kẹt vĩnh viễn. Bây giờ giao
  dịch đó đơn giản là bị revert. Một kỳ quay chưa bao giờ đóng được thì mãi mãi chưa đóng: thanh
  khoản của nó chưa hề chuyển vào, nên không có gì để trả về và không có gì để chốt.
- **Một kỳ quay bị bỏ qua không tốn gì.** Thanh khoản chưa bao giờ được đem ra thì nằm lại trong
  hạng của nó và được đem ra lần nữa. Một lần trao giải muộn vẫn ghi sổ phần thu hoạch, vẫn trả
  phần thanh khoản đem ra về các hạng, và đánh dấu kỳ quay là `Skipped`. Kỳ đó không trả giải
  nào, và không mất hay kẹt đồng nào.
- **Keeper không đổi được kết quả.** Việc chọn người trúng được chốt ngay khoảnh khắc seed và
  bậc được kiểm chứng. Việc duyệt chỉ ghi lại một kết quả đã có.

**Được kiểm chứng một cách tình cờ, ngày 3 tháng 9 năm 2026.** Tiến trình nền pm2 chết theo
tiến trình terminal đã khởi động nó lúc 03:45 UTC, và không ai để ý cho tới 04:52, nên keeper
nghỉ 67 phút. Khi khởi động lại, nó chốt ngay kỳ quay 4 và đóng kỳ quay 6 lúc 04:53. Kỳ 6 đã
kết thúc lúc 04:00, nên lần đóng đó muộn 53 phút so với hạn chót 05:30, tức giữa kỳ thứ hai kế
tiếp. Không mất kỳ quay nào, không kẹt thanh khoản nào, và không ai phải can thiệp gì ngoài
việc khởi động lại tiến trình. Đây chính là lời khẳng định "một keeper đứng máy làm mất kỳ quay,
không bao giờ mất tiền" trong [phần hỏi đáp](../faq.md) và trong các gạch đầu dòng phía trên,
chạy thật chứ không phải lập luận suông.

**Không bị chặn:**

- Khi seed và bậc đã công khai, ai sắp gọi `awardDraw` cũng có thể tính kết quả của chính mình
  trước rồi quyết định có buồn gọi hay không. Việc trao giải không cần cấp phép và ứng dụng mời
  bất kỳ ai làm, nên đây là chuyện phiền toái chứ không phải kiểm duyệt, nhưng nó có thật và nó
  được nói ra.
- Nếu tuyệt nhiên không ai hành động trong cửa sổ hai kỳ, kỳ quay đó không trả gì.

## 5. Chủ sở hữu pool

Chúng tôi. Địa chỉ đã triển khai các hợp đồng.

**Muốn gì:** liệt kê ở đây để người gửi khỏi phải đoán.

**Toàn bộ quyền hạn:**

| Quyền | Giới hạn |
| --- | --- |
| Tạm dừng | Chặn việc gửi tiền và việc đóng kỳ quay. Không bao giờ chặn việc rút tiền, duyệt, trao giải, chốt hay đối soát. |
| Đặt nguồn lợi suất | Phát ra `YieldSourceSet`. Không tác động được tới bất kỳ số dư sẵn có nào. |
| Cứu hộ token lạ | Không đụng được vào tiền gốc hay tiền thưởng của người gửi. |
| Chuyển quyền sở hữu | Hai bước. Chức năng từ bỏ quyền bị tắt, nên quyền sở hữu không thể bị thả vào hư không. |

**Không thể:** đọc tiền gốc, tiền thưởng, trọng số hay khoản ghi có của bất kỳ người gửi nào, vì
các hợp đồng không bao giờ cấp quyền đó cho chủ sở hữu. Không đổi được kết quả một kỳ quay.
Không dịch chuyển được tiền của ai. Không nâng cấp được hợp đồng, vì không có đường nâng cấp.

**Không bị chặn:** một chủ sở hữu có ý xấu có thể tạm dừng việc gửi tiền vô thời hạn, và có thể
trỏ pool sang một nguồn lợi suất không trả gì. Việc đó làm đói phía giải thưởng của sản phẩm.
Nó không còn dừng được đồng hồ: một nguồn bị revert sẽ được bắt lại, phần thu hoạch của kỳ quay
đó được ghi bằng không, `HarvestFailed` được phát ra và việc đóng vẫn thành công. Cả hai quyền
đó đều không lấy đi một đơn vị tiền gốc nào của ai, và việc rút tiền vẫn chạy suốt.

## 6. Nhà tài trợ

Người cấp vốn cho nguồn lợi suất trên Sepolia.

**Muốn gì:** trong trường hợp lương thiện là cho bản demo tiền giải thưởng. Trong trường hợp đối
địch là canh giờ hoặc giữ lại giải thưởng.

**Bị chặn bởi:** nhà tài trợ không có ảnh hưởng nào tới việc ai trúng. Họ cấp vốn cho một số dư;
seed, các trọng số và các ngưỡng chẳng liên quan gì tới họ. Số tiền tài trợ, tốc độ nhỏ giọt và
mọi lần thu hoạch đều công khai, nên ai cũng thấy chính xác có bao nhiêu tiền giải thưởng và nó
về nhanh cỡ nào. Một khoản tài trợ là một khoản cho hẳn: đã cho thì không rút lại được, và chỉ
chủ sở hữu của nguồn mới đổi được tốc độ nhỏ giọt.

**Không bị chặn:** một nhà tài trợ ngừng tài trợ thì giải thưởng kết thúc khi số dư nhỏ giọt
hết. Giải thưởng là lợi suất, và không có lợi suất thì không có giải thưởng. Tiền gốc không hề
bị đụng tới trong suốt quá trình, mà đó chính là toàn bộ ý nghĩa của một thiết kế không thua lỗ.

## 7. Bên vận hành token

Zama, với tư cách chủ sở hữu các lớp bọc token bảo mật. Tài sản của mọi pool đều là hợp đồng của
họ chứ không phải của chúng tôi, và mỗi pool nằm sau một lớp bọc khác nhau trong số đó.

**Muốn gì:** liệt kê ra, không phải cáo buộc.

**Quyền hạn, đọc từ mã nguồn đã xác minh trên Sepolia ngày 2 tháng 9 năm 2026:**

- `addObserver(address)` cấp cho một địa chỉ quyền giải mã kiểu ký tự đại diện trên mọi handle
  mà token có quyền, **có hiệu lực hồi tố**. Một người quan sát được bổ nhiệm ở bất kỳ ngày nào
  trong tương lai vẫn giải mã được những số tiền đã nằm trên chuỗi, nên canh chừng lần bổ nhiệm
  rồi rút ra không phải một hàng phòng thủ. Phạm vi là mọi số tiền gửi, mọi khoản chi khi rút, số
  dư token của chính pool, và một lần chuyển cấp vốn giải thưởng cho mỗi lô duyệt. Không có
  khoản chi riêng cho từng người trúng để đọc, vì Hearth không có lần chuyển giải thưởng riêng
  cho từng người gửi. Có điều một lô chỉ chứa một người gửi thì tổng của lô đó đúng bằng giải
  thưởng chính xác của người gửi ấy, và pool năm người gửi đang chạy với cỡ lô 4 tạo ra đúng một
  lô như vậy ở mỗi kỳ quay. `evaluate` lấy cỡ lô từ người gọi và không cần cấp phép, nên không
  thể cưỡng chế một cỡ lô tối thiểu nào; [giới hạn số 7](../limitations.md) ghi nhận nó như một
  phần dư được chấp nhận và gọi tên cách sửa ở phía hợp đồng. Trạng thái thực tế ngày hôm đó:
  `observerCount()` bằng 0 và `observers()` rỗng.
- Một danh sách chặn. Địa chỉ bị chặn thì không gửi, rút hay bọc ngược được, vì mỗi việc đó là
  một lần chuyển token có địa chỉ ấy ở một đầu.
- Một vai trò tạm dừng, thực tế đang đặt về địa chỉ không, nên việc tạm dừng hiện bị vô hiệu.
- Phần cài đặt nâng cấp được bởi chủ sở hữu của nó, nằm sau một proxy.

**Bị chặn bởi:** không thứ gì chúng tôi kiểm soát. Đây là một giả định tin cậy, không phải một
hàng phòng thủ.

**Điều nó không với tới:** cuốn sổ của chính Hearth. Tiền gốc, tiền thưởng, trọng số và khoản
ghi có nằm trong vault, và token không có quyền truy cập nào trên chúng, kể cả khi token bị nâng
cấp với ý xấu. Chúng tôi đã kiểm chứng điều này trên bản triển khai trước: địa chỉ token trả về
false khi hỏi quyền trên các handle tiền gốc và tiền thưởng của một người gửi, trong khi người
gửi đó và pool đều trả về true.

## 8. Nhóm KMS của Zama

Các bên nắm giữ khoá giải mã của mạng.

**Muốn gì:** liệt kê ra vì đây là giả định sâu nhất trong bất kỳ ứng dụng FHEVM nào.

**Họ có thể làm gì:** hợp đồng kiểm chứng rằng một bản rõ mang chữ ký hợp lệ của nhóm. Nó không
kiểm chứng được rằng bản rõ đó đúng là bản rõ thật của cái handle. Vậy nên một nhóm không lương
thiện có thể ký một giá trị seed do họ chọn, và hợp đồng sẽ chấp nhận, điều đó cho phép họ chọn
người trúng.

**Bị chặn bởi:** không gì trong Hearth cả. Mọi ứng dụng trên protocol này đều thừa hưởng điều
đó, và chính tài liệu của Zama nêu rõ ranh giới: protocol được tin là tính đúng trên bản mã và
chỉ giải mã những gì đã được đánh dấu là giải mã công khai được.

**Đáng biết:** nhóm đó vẫn không đọc được bất cứ thứ gì không được đánh dấu giải mã công khai
được, và trong Hearth thì đó chỉ gồm seed, con đếm thang, cờ khác rỗng, phần thu hoạch, phần dư
của mỗi hạng khi nó tới hạn, và bộ đếm khoản chưa cấp vốn. Không giá trị nào của một người gửi
cụ thể từng nằm trong tập đó, tổng trọng số chính xác của pool cũng không.

## 9. Relayer

Dịch vụ định tuyến các yêu cầu giải mã giữa trình duyệt và protocol.

**Muốn gì:** liệt kê ra.

**Có thể:** từ chối hoặc trì hoãn dịch vụ, việc đó làm chậm một kỳ quay. Nó cũng thấy được địa
chỉ nào xin giải mã handle nào, nên nó biết rằng bạn đã kiểm tra những con số của mình, dù không
biết chúng nói gì.

**Không thể:** tự giải mã bất cứ thứ gì, vì nó không giữ khoá. Không giả mạo được chữ ký KMS, và
đó là mục đích của việc kiểm chứng trên chuỗi. Không tự cấp quyền cho mình trên một handle, vì
đó là việc của danh sách kiểm soát truy cập và nó nằm trên chuỗi.

**Bị chặn bởi:** cửa sổ hai kỳ hấp thụ được một relayer chậm, và hạn chót đóng bảo đảm rằng còn
ít nhất nửa kỳ ở phía trước khi vòng đi về bắt đầu. Quá mức đó thì kỳ quay bị bỏ qua, phần thu
hoạch vẫn được ghi sổ và thanh khoản vẫn còn nguyên. Một lần relayer gián đoạn làm mất một kỳ
quay, không bao giờ mất tiền.

## Thiết kế cũ đã sai ở đâu, và thiết kế này khoá lại thế nào

Trước lần xây lại này, Hearth là một hợp đồng duy nhất tên `LanternPool`, tính trọng số cho
người gửi theo số dư của họ ngay khoảnh khắc kỳ quay diễn ra và quét những người gửi theo từng
khối. Chúng tôi tự kiểm toán nó ngày 2 tháng 9 năm 2026 và thực thi các cuộc tấn công thay vì
lập luận về chúng. Sáu trong tám phát hiện dưới đây đã được tái hiện bằng mã chạy thật.

| # | Sai chỗ nào | Bằng chứng | Thiết kế này khoá lại thế nào |
| --- | --- | --- | --- |
| 1 | **Gửi chớp nhoáng.** Không tính trọng số theo thời gian, nên một khoản gửi trước kỳ quay một block vẫn được tính trọn. | Đã thực thi trên bản mock: 20 vòng, kẻ tấn công trúng 19 trên 20 và rút cạn khoản dự trữ 5.000 USDC. Cả vòng quay còn gói được trong một giao dịch, 2.189.992 gas. | Tỷ lệ trúng đến từ số dư bình quân theo thời gian trên cả kỳ. Một khoản gửi phút chót chỉ ăn đúng phần thời gian của nó trong kỳ, không hơn. |
| 2 | **Giao dịch nhận thưởng là một dấu hiệu người trúng.** Lệnh nhận thưởng của người trúng và người trượt giống hệt nhau, nhưng chỉ người trúng mới có lý do để gửi. | Đã thực thi: lệnh nhận thưởng của người trúng và người trượt đều tốn 391.944 gas trên bản mock với log y hệt nhau. Trên Sepolia, một lệnh nhận thưởng rơi vào 48 giây sau một lần kết toán. | Không có hàm nhận thưởng. Giải thưởng rơi vào một số dư tiền thưởng mã hoá trong lúc duyệt, `withdraw` là lối ra duy nhất, và việc duyệt không nhắm vào chính mình được. |
| 3 | **Một bit công khai mỗi kỳ quay.** Handle tiền thưởng của một vé nhà cái bị công bố lại là giải mã công khai được ở mọi kỳ quay, làm rò việc nhà cái có trúng hay không, mà khi chỉ có một người gửi thật thì điều đó gọi tên luôn người trúng. | Đã thực thi trên bản mock qua 16 kỳ quay, và xác nhận trên Sepolia qua ba kỳ quay đã kết toán. | Không có vé nhà cái. Những giá trị duy nhất giải mã công khai được là seed, con đếm thang, cờ khác rỗng, phần thu hoạch, phần dư của các hạng và bộ đếm khoản chưa cấp vốn. Không cái nào thuộc về một người gửi riêng lẻ. |
| 4 | **Không kiểm chứng công khai được.** Tổng của pool không bao giờ được công bố, nên người ngoài không kiểm được kỳ quay chút nào. | Đọc từ mã nguồn đã triển khai và xác nhận trên bản chạy thật. | Seed và bậc được công bố kèm một bằng chứng KMS được kiểm trên chuỗi, và mọi ngưỡng đều được bất kỳ ai tính lại từ hai con số đó. |
| 5 | **Ghi sổ lợi suất theo lời khai.** Các khoản nạp thêm vào quỹ dự trữ được ghi sổ theo số truyền vào, trong khi lớp bọc mint `amount / rate()`. Chỉ nằm im trên Sepolia vì tỷ lệ tình cờ bằng 1. | Đã thực thi trên một token thử nghiệm 18 chữ số thập phân, nơi tỷ lệ là một triệu triệu. | Pool chỉ ghi sổ số tiền đã được KMS kiểm chứng mà nguồn thực sự chuyển đi. |
| 6 | **Phá bĩnh bằng đăng ký miễn phí.** Một ví chưa từng giữ token cũng tự đăng ký được, và một bên vận hành có thể đăng ký hộ các ví khác bằng một số không mã hoá dùng lại. | Đã thực thi. | Việc đăng ký vẫn mở, theo đúng cấu trúc. Người gửi giả mang trọng số bằng không, không đổi tỷ lệ trúng của ai và bị bỏ qua ở tầng bản rõ. Cái giá duy nhất là gas của keeper, và thứ keeper chặn trần là giá gas nó chịu trả, không phải khối lượng việc nó làm. |
| 7 | **Đường nối lúc bọc token, chưa giảm nhẹ.** Ứng dụng bọc và gửi trong cùng một luồng. | Đo trên bản chạy thật: ba trong năm khoản gửi nằm cách hai đến bốn block sau một lần bọc công khai 100 USDC. | Bọc và gửi là hai bước riêng và ứng dụng giải thích vì sao. Đường nối được giảm bớt, không bị xoá bỏ, và là giới hạn số 10. |
| 8 | **Không có keeper.** Các kỳ quay không cần cấp phép nhưng không ai chạy chúng: pool chạy thật đã nằm im 26 giờ với một kỳ quay đang mở được. | Đọc trực tiếp từ chuỗi. | Một script keeper chạy mọi bước và bất kỳ người gửi nào cũng đẩy được một kỳ quay từ ứng dụng. Pool có cài đặt giao diện tự động hoá của Chainlink cho bước đóng như một lớp dự phòng nữa, dù chưa có upkeep nào được đăng ký. |

Hai thay đổi thiết kế nữa đến từ lượt rà soát ngày 3 tháng 9 và không nằm trong bảng đó, vì
thiết kế cũ chưa đi đủ xa để có chúng: việc công bố tổng chính xác được thay bằng cái bậc (kẻ
tấn công số 1 ở trên), và giá trị giải được chuyển từ bước trao giải sang bước đóng để không
giải nào bị định cỡ lại sau khi seed của nó đã tồn tại.

## Những gì được kiểm, và kiểm bằng cách nào

Mọi khẳng định phía trên đều có một bài kiểm thử. Các kết quả đã thực thi nằm dưới
`docs/security/attacks` và các con số được dán vào README.

| Khẳng định | Cách kiểm |
| --- | --- |
| Người lạ không đọc được các giá trị của một người gửi | Xin relayer giải mã tiền gốc, tiền thưởng, trọng số và khoản ghi có của một địa chỉ khác. Kỳ vọng bị từ chối cả bốn. |
| Không lấy được tổng chính xác của pool | Xin relayer cái handle tổng trọng số. Kỳ vọng bị từ chối. Rồi lấy hiệu các bậc đã công bố của hai kỳ quay liên tiếp trong một pool có một người gửi dịch chuyển, và cho thấy đáp án là một dải rộng gấp đôi chứ không phải một con số. |
| Một khoản gửi chớp nhoáng gần như không ăn được gì | Gửi tiền gần cuối một kỳ, duyệt, rồi so trọng số đã lưu với một người giữ suốt cả kỳ. |
| Người gửi giả không làm nghẽn được một kỳ quay | Đăng ký thật nhiều địa chỉ rỗng, rồi chạy trọn một kỳ quay. |
| Không ai chọn được ai bị duyệt | Gọi `evaluate` từ chính địa chỉ của một người gửi và cho thấy vòng duyệt tiến từ con trỏ suy ra từ seed, không phải từ người gửi đó. |
| Đóng muộn thì bị từ chối | Gọi `closeDraw` sau `closeDeadline` và kỳ vọng bị revert; rồi xác nhận kỳ quay bỏ qua được và thanh khoản của nó còn nguyên. |
| Trao giải trễ không mất gì | Để cửa sổ trôi qua, trao giải muộn, rồi kiểm rằng phần thu hoạch đã được ghi sổ, phần thanh khoản đem ra đã về lại các hạng và kỳ quay hiển thị `Skipped`. |
| Một nguồn lợi suất bị revert không dừng được đồng hồ | Gắn một nguồn bị revert, đóng một kỳ quay, và kỳ vọng thành công kèm `HarvestFailed`. |
| Một hạng bị vượt số giải sẽ kẹp lại chứ không trả quá | Ép số người trúng vượt quá khả năng cấp vốn của hạng và kiểm rằng số đã trả không bao giờ vượt số đem ra. |
| Một bằng chứng không thể bị phát lại | Nộp lại một bằng chứng trao giải cho một kỳ quay khác. Kỳ vọng bị revert. |
| Không ai rút nhiều hơn số mình có | Kiểm thử tính chất: với mọi tài khoản, các lần rút không bao giờ vượt tiền gốc cộng tiền thưởng. |
| Tiền được bảo toàn | Kiểm thử tính chất: số dư token của vault bằng tổng tiền gốc cộng tổng tiền thưởng chưa nhận, và số dư token của pool bằng thanh khoản bản rõ cộng mọi phần dư mã hoá cộng thanh khoản đã đem ra mà chưa chốt cộng các khoản thu hoạch nhận lúc đóng mà chưa được một lần trao giải ghi sổ. Số hạng cuối là phần thu hoạch nằm giữa lần đóng nhận nó và lần trao giải chia nó cho các hạng, khi nó chưa thuộc về hạng nào và kỳ quay nào. |

## Mô hình mối đe doạ này không nói tới điều gì

- Bất cứ thứ gì ngoài chuỗi: thiết bị của bạn, cách ví của bạn xử lý khoá, điểm cuối RPC bạn
  dùng, và siêu dữ liệu ở tầng mạng.
- Các cuộc tấn công kinh tế nhắm vào chính nơi sinh lợi suất. Trên mainnet, rủi ro vault được
  thừa hưởng trọn vẹn từ vault ERC-4626 nằm sau batcher của Zama.
- Kiểm chứng hình thức. Hearth được tự kiểm toán bằng các cuộc tấn công đã thực thi và các bài
  kiểm thử tính chất. Nó chưa được bên thứ ba kiểm toán, và trang này là phần thay thế trung
  thực cho điều đó, không phải một sự thay thế tương đương.
