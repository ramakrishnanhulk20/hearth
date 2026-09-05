# Keeper

Các kỳ quay không tự diễn ra. Phải có cái gì đó gửi các giao dịch. Trang này nói cái đó làm gì,
chuyện gì xảy ra khi nó dừng, và nó tốn bao nhiêu.

Một tiến trình vận hành một pool. Hearth chạy bảy pool trên Sepolia, nên có bảy tiến trình
keeper chạy, mỗi tiến trình ký từ tài khoản riêng của cùng một cụm từ khôi phục và mỗi tiến
trình trỏ vào tệp địa chỉ của một pool. Mục "Mỗi pool một keeper" bên dưới có bảng phân công.

Điều quan trọng cần nói trước: keeper không có đặc quyền nào. Mọi hàm nó gọi thì ai cũng gọi
được, và hai cái đòn bẩy mà một keeper có thể lạm dụng, tức chọn ai được duyệt và chọn thứ tự
chi trả, đã không còn là đòn bẩy nữa. Nó là tiện ích giúp người gửi đỡ nhọc, không phải một vai
trò mà pool phải dựa vào để an toàn.

## Công việc, theo thứ tự, cho kỳ quay `p`

1. **Đóng.** Gọi `closeDraw(p)` khi kỳ `p` đã kết thúc và trước `closeDeadline(p)`, tức giữa kỳ
   `p+2`. Thói quen đúng là làm sớm trong kỳ `p+1`. Bước này chốt giá trị giải và phần thanh
   khoản đem ra của từng hạng, chuyển phần thanh khoản đó vào kỳ quay, rút seed đã mã hoá, hỏi
   vault lấy con đếm thang mã hoá và cờ khác rỗng, thu hoạch nguồn lợi suất, rồi đánh dấu cả bốn
   handle là giải mã công khai được.
2. **Lấy các bằng chứng.** Xin relayer của Zama giải mã công khai bốn handle theo thứ tự
   `[seed, scaleCount, nonEmpty, harvested]`. Relayer trả về các bản rõ kèm chữ ký của dịch vụ
   quản lý khoá.
3. **Trao giải.** Gọi `awardDraw(p, seed, scaleCount, nonEmpty, harvested, proof)`. Hợp đồng
   kiểm chữ ký ngay trên chuỗi, ghi sổ phần thu hoạch vào các hạng giải, và mở kỳ quay. Người
   trúng được quyết định ở khoảnh khắc này.
4. **Duyệt.** Gọi `evaluate(p, count)` trên vault, lặp đi lặp lại, cho tới khi vòng duyệt quay
   về đúng chỗ nó bắt đầu. Mỗi lệnh gọi đẩy một con trỏ riêng của kỳ quay đi qua danh sách người
   gửi từ một điểm khởi đầu suy ra từ seed. Keeper chọn `count`, không bao giờ chọn địa chỉ nào;
   `4` là số người gửi cần tới phép tính mã hoá nhiều nhất mà một giao dịch chứa nổi. Người gửi
   không có mốc quan sát tại hoặc trước kỳ `p` thì bị chính hợp đồng bỏ qua, dựa trên dấu thời
   gian bản rõ, không tốn chi phí mã hoá.
5. **Chốt.** Sau khi cửa sổ đóng lại vào cuối kỳ `p+2`, gọi `finalizeDraw(p)`. Bước này gộp phần
   chưa trả của từng hạng vào phần dư mã hoá của hạng đó, công bố bộ đếm khoản chưa cấp vốn, và
   đánh dấu phần dư là giải mã công khai được với mọi hạng tới hạn đối soát, phát ra
   `CarryPublished`.
6. **Đối soát, cho từng hạng tới hạn.** Với mỗi hạng mà `finalizeDraw` đã công bố, lấy bản rõ
   của phần dư rồi gọi `reconcile(tier, carry, proof)`. Pool kiểm bằng chứng đối chiếu với cái
   handle mà vault đã công bố, ghi con số đã kiểm chứng vào thanh khoản bản rõ của hạng, vault
   trừ nó khỏi phần dư (phần dư này có thể đã tăng lên kể từ lúc được công bố), và
   `TierReconciled` được phát ra.

Trên Sepolia, mọi hạng giải của mọi pool đều tới hạn ở mỗi kỳ quay, nên bước 6 chạy tới ba lần
sau mỗi lần chốt. Nhịp đối soát là một tham số khởi tạo cho từng hạng và keeper đọc nó từ chuỗi
thay vì mặc định, nên một bản triển khai công bố phần dư của một hạng thưa hơn thì không cần đổi
gì ở keeper. Vì sao bản này công bố cả ba mỗi kỳ quay thì nằm ở
[giải thưởng và các hạng giải](../concepts/prizes-and-tiers.md).

## Quy tắc thứ tự

**Chốt và đối soát kỳ quay `p` vào đầu kỳ `p+3`, trước khi đóng kỳ quay `p+2` cũng trong kỳ
đó.**

Lý do là tiền, không phải tính đúng đắn. Một lần đóng định cỡ giải của từng hạng theo thanh
khoản bản rõ của hạng đó vào đúng thời điểm ấy, còn việc đối soát mới là thứ biến phần dư của
một kỳ quay trước thành thanh khoản bản rõ. Đối soát trước thì số tiền đó tính ngay vào giá trị
giải; đối soát sau thì nó phải chờ một kỳ quay.

Cả hai việc trở nên khả dụng vào cùng một khoảnh khắc. Cửa sổ của kỳ quay `p` kết thúc vào cuối
kỳ `p+2`, còn kỳ quay `p+2` đóng được từ đầu kỳ `p+3`, nên keeper làm việc chốt và mọi lần đối
soát tới hạn trước, rồi mới đóng.

Không mất gì nếu thứ tự bị lệch, nhưng lệch theo chiều nào thì có khác. Đóng trước khi chốt thì
phần dư của hạng chưa ở trạng thái chờ, nên `openDraw` gộp nó vào phần đem ra và số tiền đó vẫn
trúng được; chỉ là nó không nâng được giá trị giải công bố, thứ mà `closeDraw` chốt chỉ từ thanh
khoản bản rõ. Chốt, rồi đóng, rồi mới đối soát thì phần dư đang ở trạng thái chờ: `openDraw` để
một phần dư đang chờ hoàn toàn ra ngoài kỳ quay, nên số tiền đó không được đem ra mà cũng không
trúng được cho tới khi lần đối soát xoá cờ. Trên Sepolia mọi hạng đều tới hạn ở mọi lần chốt,
nên đây là trường hợp thông thường, và đó là lý do keeper đọc lại các phần dư sau các lần chốt
rồi đối soát trước khi đóng. Đằng nào cũng không mất gì: lần đóng đầu tiên sau một lần đối soát
gộp tất cả lại.

## Chuyện gì xảy ra khi keeper ngừng chạy

Không mất gì cả. Đó là toàn bộ câu trả lời, và nó đúng nhờ cách một bước bị bỏ lỡ được xử lý:

| Bước bị bỏ lỡ | Hệ quả |
| --- | --- |
| Việc đóng không bao giờ xảy ra, hoặc xảy ra sau `closeDeadline` và bị revert | Kỳ quay giữ nguyên `None` và bị bỏ qua. Thanh khoản của nó chưa hề dịch chuyển, nên nó ở lại trong các hạng và được đem ra ở kỳ quay sau. Phần thu hoạch được thu ở lần đóng kế tiếp. |
| Việc trao giải không xảy ra trong cửa sổ | Một lần trao giải muộn vẫn ghi sổ phần thu hoạch, vẫn trả phần thanh khoản đem ra về các hạng, và đánh dấu kỳ quay là `Skipped`. Không lợi suất và không thanh khoản nào biến mất. |
| Vòng duyệt không chạm tới hết mọi người gửi | Người gửi bị vòng duyệt bỏ sót không nhận được gì từ kỳ quay đó. Phần của họ trong khoản đem ra được gộp vào phần dư của hạng lúc chốt và được đem ra lần nữa. Đây là trường hợp duy nhất mà một người gửi thật mất đi thứ họ có thể đã trúng, và nó là giới hạn số 2. |
| Việc chốt hay đối soát bị trễ | Các hạng giữ ít thanh khoản bản rõ hơn trong một thời gian, nên giá trị giải nhỏ hơn. Một phần dư mà một lần chốt đã công bố và chưa lần đối soát nào xoá thì nằm ngoài mọi lần đóng cho tới khi lần đối soát tới. Không mất gì: lần đóng đầu tiên sau một lần đối soát gộp tất cả lại. |

Một keeper đứng máy làm pool mất các kỳ quay, chứ không mất tiền. Việc gửi và rút vẫn chạy suốt,
vì đường tạm dừng không bao giờ chạm tới chúng và một kỳ quay đứng máy không khoá gì cả.

Bản triển khai trước của chúng tôi là ví dụ cảnh tỉnh: `openDraw` không cần cấp phép mà chẳng ai
gọi nó, nên pool đang chạy đã nằm im 26 giờ với một kỳ quay sẵn sàng để mở. Không cần cấp phép
không đồng nghĩa với tự động. Đó là lý do thiết kế này có một keeper thật và một đường dự phòng
bên dưới nó.

## Người gửi tự đẩy một kỳ quay đi tiếp thế nào

Mọi bước phía trên đều không cần cấp phép, và ứng dụng đưa từng bước ra màn hình "Chạy một kỳ
quay" của nó, tại `/app/<slug>/run` cho pool họ đang ở, tức dòng ở thanh bên ghi "Bất kỳ ai".
Một thẻ ở trên cùng gọi tên bước mà pool đang chờ, và mỗi bước trong năm bước bên dưới có nút
riêng, tắt kèm lý do khi chưa tới lượt bước đó:

- **Đóng**, rồi **Trao giải.** Việc đóng chốt giá trị giải và rút seed đã mã hoá. Việc trao giải
  lấy bốn bằng chứng giải mã ngay trong trình duyệt rồi gửi các bản rõ đã ký về lại. Lệnh gọi
  relayer đúng là lệnh mà keeper vẫn gọi, và SDK làm nó ngay từ trang web.
- **Đi tiếp.** Chạy `evaluate(p, count)` cho kỳ quay đang mở, đẩy vòng duyệt chung tiến thêm một
  lô. Chính lệnh gọi đó cũng nằm trên thẻ kỳ quay của bạn ở "Kỳ quay của tôi" với tên "Đẩy kỳ
  quay đi tiếp". Đây là nút cần bấm nếu keeper ngừng chạy và vòng duyệt chưa chạm tới bạn. Nó
  không cho bạn tự chọn mình, và đó chính là tính năng: vì không ai tách riêng mình ra được, việc
  gửi giao dịch này chẳng nói gì về chuyện bạn có trúng hay không.
- **Chốt** và **Đối soát.** Chạy hai bước kết thúc cho bất kỳ kỳ quay nào đã hết cửa sổ.

Không việc nào trong số này cần chúng tôi cho phép, cần khoá của chúng tôi hay cần máy chủ của
chúng tôi còn sống.

## Chainlink Automation, chỉ cho bước đóng

`HearthPrizePool` cài đặt giao diện `checkUpkeep` và `performUpkeep` của Chainlink cho bước
đóng. Đăng ký một upkeep theo thời gian cho pool thêm một con đường thứ hai, độc lập, để các kỳ
quay được đóng đúng lịch, mà đóng lại là bước có hạn chót, nên nó là bước đáng mua bảo hiểm.

Nó chỉ phủ bước đóng chứ không phủ gì khác, và lý do rất đơn giản: đóng là bước duy nhất không
cần dữ liệu ngoài chuỗi. Trao giải cần một bằng chứng giải mã lấy từ relayer của Zama. Duyệt cần
lặp lại cho tới khi một con trỏ quay vòng. Đối soát cần thêm một lần giải mã nữa. Một mạng tự
động hoá trên chuỗi không lấy được thứ nào trong số đó, nên giả vờ rằng nó lấy được thì chỉ là
diễn.

Upkeep là tuỳ chọn. Nó cần LINK trong một tài khoản upkeep đã đăng ký, nó là lớp dự phòng chứ
không phải con đường chính, và nó sẽ là một upkeep cho mỗi pool, mỗi cái theo lịch riêng của
pool đó. Hiện chưa pool nào trong bảy pool đăng ký, nên chỉ có các keeper chạy những pool demo.

Chúng tôi khai báo giao diện hai hàm đó ngay tại chỗ thay vì kéo cả gói hợp đồng Chainlink với
mọi phụ thuộc của nó về chỉ vì hai selector.

## Ngân sách

Chi phí cho mỗi kỳ quay, lấy từ bản triển khai đang chạy.

| Bước | Số giao dịch mỗi kỳ quay | Gas mỗi giao dịch |
| --- | --- | --- |
| Đóng | 1 | `1,422,474` |
| Trao giải | 1 | `435,578` |
| Duyệt, một lô đầy 4 người | `floor(savers / 4)`, ở đây là 1 | `3,417,699` |
| Duyệt, lô lẻ cuối cùng | 0 hoặc 1, ở đây là 1 lô chở một người gửi | `1,291,192` cho một người gửi, cộng `708,836` cho mỗi người thêm |
| Chốt | 1 | `509,463` |
| Đối soát | 3, mỗi hạng một lần, vì mọi hạng đều tới hạn ở mọi kỳ quay | `459,994` |

Với 5 người gửi thì đó là `8,456,388` gas mỗi kỳ quay, tức khoảng `0.0085 ETH` ở mức 1 gwei, là
phí cơ sở của Sepolia lúc triển khai. Với kỳ một giờ thì đó là 24 kỳ quay một ngày và
`0.2030 ETH` mỗi ngày; với kỳ một ngày thì là `0.0085 ETH`.

Nhân con số đó với bảy pool là ra toàn bộ lý do vì sao sáu pool quay sáu giờ một lần chứ không
phải mỗi giờ. Cả bảy pool cùng quay theo giờ là 168 kỳ quay một ngày, khoảng `1.43 ETH`, mà
faucet công khai không theo nổi. Một pool theo giờ và sáu pool sáu giờ là 48 kỳ quay một ngày,
khoảng `0.41 ETH`. Mỗi tài khoản keeper được nạp riêng, nên một pool hết gas chỉ làm dừng các kỳ
quay của chính nó.

Thêm một người gửi trong một lô tốn `708,836` gas trên Sepolia, còn một lô chở đúng một người
gửi tốn `1,291,192`, vì phần chi phí cố định của lệnh gọi thì đằng nào cũng phải trả. Tính bằng
đơn vị tính toán thì một người gửi là `3,674,128` theo bảng giá của coprocessor bản mock, và đó
là chỗ đọc được con số này, vì một biên lai thật không báo cáo đơn vị tính toán. Cỡ lô `4` được
đặt từ phép đo đó, đối chiếu với các giới hạn Sepolia mà Zama công bố là 20.000.000 đơn vị tính
toán mỗi giao dịch với 5.000.000 ở độ sâu tuần tự. `evaluate` chấp nhận số lượng bất kỳ, nên nếu
Zama định giá lại một phép toán thì keeper hạ xuống lô nhỏ hơn được mà không cần triển khai lại.

**Keeper duyệt trọn cả vòng.** Trên chuỗi không có gì giới hạn chi phí duyệt, và keeper cũng
không dừng giữa chừng; thứ nó cưỡng chế là một trần phí (`KEEPER_MAX_FEE_GWEI`), dưới trần đó
thì nó cứ gửi tiếp cho tới khi con trỏ chạm cuối. Hệ quả trung thực được nêu trong
[mô hình mối đe doạ](../security/threat-model.md): một pool bị nhồi những địa chỉ vô giá trị thì
tốn thêm gas của keeper mỗi kỳ quay, chứ không làm người gửi mất giải, vì những địa chỉ không có
mốc quan sát trước kỳ đều bị bỏ qua mà không tốn phép tính mã hoá nào. Nếu keeper ngừng chạy thì
bất kỳ ai cũng bấm được "Đi tiếp", và vì vòng duyệt bắt đầu ở một điểm khác nhau mỗi kỳ quay,
không ai ngồi mãi ở cuối hàng.

## Mỗi pool một keeper

Một tiến trình được cho biết nó vận hành pool nào qua `HEARTH_ADDRESSES_FILE`, tức tệp địa chỉ mà
lần triển khai của pool đó đã ghi, và tệp này cũng cho nó ký hiệu token, số chữ số thập phân và
chỉ số tài khoản để ký. `KEEPER_NAME` là cái nhãn mà mọi dòng log đều mang theo.
`packages/keeper/ecosystem.config.cjs` khởi động cả bảy dưới pm2 trên một máy, mỗi pool một tiến
trình.

| Tiến trình pm2 | `HEARTH_ADDRESSES_FILE` | `KEEPER_ACCOUNT_INDEX` |
| --- | --- | --- |
| `hearth-keeper-usdc` | `hearth.json` | 1 |
| `hearth-keeper-usdt` | `hearth.usdt.json` | 10 |
| `hearth-keeper-weth` | `hearth.weth.json` | 11 |
| `hearth-keeper-bron` | `hearth.bron.json` | 12 |
| `hearth-keeper-zama` | `hearth.zama.json` | 13 |
| `hearth-keeper-tgbp` | `hearth.tgbp.json` | 14 |
| `hearth-keeper-xaut` | `hearth.xaut.json` | 15 |

Tiến trình `usdc` trỏ vào `hearth.json` chứ không phải `hearth.usdc.json` vì đó là tệp mà lần
triển khai đầu tiên đã ghi, hồi các pool còn chưa có slug, và keeper đang chạy đã trỏ vào nó
nhiều ngày rồi. Cả hai tệp mang cùng các địa chỉ.

Các chỉ số được rải thưa ra để về sau thêm một pool mà không phải đánh số lại, và mỗi tài khoản
cần ETH Sepolia riêng. Chỉ số 0 là tài khoản triển khai và keeper từ chối nó.

## Bảy keeper đang chạy được đặt ở đâu

pm2 trên một chiếc laptop là một cách chạy cả bảy và cách đó vẫn dùng được. Nó không phải cái đang
chạy thật. Cả bảy keeper Sepolia chạy trên Railway, mỗi pool một dịch vụ, nên một chiếc laptop gập
lại không làm dừng kỳ quay nào.

Keeper là một tiến trình sống lâu chứ không phải một hàm chạy theo lịch: một lượt có thể mất hai
phút chờ dịch vụ quản lý khoá, dài hơn mức phần lớn nền tảng serverless cho phép. Bất kỳ máy chủ
nào giữ được một tiến trình Node sống đều dùng được, và kho mã mang sẵn cấu hình cho máy chủ này:

- `railway.json` ở gốc kho mã vận hành pool `usdc`.
- `railway/hearth-keeper-<slug>.json` vận hành từng pool trong sáu pool còn lại. Mỗi lệnh khởi
  động đặt thẳng `KEEPER_NAME`, `KEEPER_ACCOUNT_INDEX` và `HEARTH_ADDRESSES_FILE` của pool đó, nên
  một dịch vụ dựng từ một trong các tệp này chỉ cần `RECOVERY_PHRASE` và `SEPOLIA_RPC_URL`.

Lệnh build là `npm run build -w @hearth/keeper` và lệnh khởi động là
`node packages/keeper/dist/src/index.js`, trên máy chủ nào cũng vậy. Các ABI hợp đồng mà keeper cần
đã được commit dưới `packages/keeper/abi`, nên một máy chủ chưa từng biên dịch hợp đồng vẫn chạy
được nó, và bước kiểm tra lúc khởi động đối chiếu ABI đã nạp với những hàm mà keeper gọi, nên một
sai lệch được báo ngay lúc khởi động chứ không đợi tới giao dịch đầu tiên. Các tệp địa chỉ phải
được commit vì cùng lý do đó, và chúng đã được commit, dưới
`packages/contracts/deployments/sepolia/`.

Chạy đúng một tiến trình cho mỗi pool, dù chạy ở đâu. Hai keeper cùng ký từ một tài khoản sẽ tranh
nhau cùng một nonce, nên hãy dừng bản chạy cục bộ trước khi khởi động bản đặt trên máy chủ cho cùng
pool đó. Phần cài đặt từng bước, từng dịch vụ một, nằm trong README riêng của gói keeper,
`packages/keeper/README.md`.

## Chạy nó

Keeper là gói `@hearth/keeper`. Nó ký bằng một tài khoản của cùng `RECOVERY_PHRASE` mà lần triển
khai dùng và đọc `SEPOLIA_RPC_URL` từ `packages/contracts/.env`; các thiết lập riêng của nó nằm
trong `packages/keeper/.env`:

```
HEARTH_ADDRESSES_FILE=../contracts/deployments/sepolia/hearth.weth.json
KEEPER_ACCOUNT_INDEX=11            # defaults to the index in the address file
KEEPER_NAME=weth                   # defaults to the slug in the address file
KEEPER_BATCH=4                     # savers of encrypted work per evaluate call
KEEPER_POLL_SECONDS=30
KEEPER_MAX_FEE_GWEI=20             # refuse to send above this
```

```
npm run compile -w @hearth/contracts    # the keeper reads the compiled ABI
npm run build -w @hearth/keeper
npm run plan -w @hearth/keeper          # one pass, simulates every call, sends nothing
npm run once -w @hearth/keeper          # one live pass
pm2 start packages/keeper/ecosystem.config.cjs   # all seven
pm2 logs hearth-keeper-weth                      # one pool
```

`plan` và `once` vận hành đúng cái pool mà `HEARTH_ADDRESSES_FILE` trỏ tới, nên kiểm một pool
khác chỉ là đổi một biến ở đầu câu lệnh. Nếu `HEARTH_VAULT` và `HEARTH_POOL` vẫn còn nằm trong
`packages/keeper/.env` từ hồi cấu hình một pool, hãy bỏ chúng đi: chúng được đọc trước tệp địa
chỉ, nên cả bảy tiến trình sẽ cùng vận hành một pool.

Một lượt chạy ghi mỗi sự việc một dòng log, và mọi dòng đều được gắn nhãn pool mà tiến trình
đang vận hành, nên bảy dòng log đan xen vẫn đọc được. Các số tiền mang ký hiệu và số chữ số thập
phân của chính pool đó, cả hai đọc từ tệp địa chỉ:

```
09:14:37 [usdc] closed draw 41 (gas 1,422,474)
09:14:39 [usdc] draw 41: asking the relayer for the seed, the scale, the empty flag and the harvest
09:14:53 [usdc] awarded draw 41: 3 tiers, prizes 12.40 / 2.10 / 0.40 cUSDC, harvest 3.60 cUSDC (gas 435,578)
09:15:07 [usdc] evaluated draw 41: 4 of 9 savers done (gas 3,417,699)
09:15:38 [usdc] nothing to do: period 43, draw 41 has 8 of 9 savers evaluated
```

Tiến trình WETH in ra đúng những dòng đó dưới nhãn `[weth]`, tính bằng `cWETH`. Từng loại dòng
log nghĩa là gì, theo từng dòng một, nằm trong README riêng của gói keeper,
`packages/keeper/README.md`.

Keeper không giữ trạng thái giữa các nhịp: nó đọc trạng thái kỳ quay, con trỏ duyệt và nhịp đối
soát từ chuỗi rồi tự tính ra phải làm gì. Khởi động lại nó thì không mất gì. Hãy chạy đúng một
bản cho mỗi pool, và đừng bao giờ chạy hai bản trên một tài khoản: trên chuỗi thì mỗi bước chỉ
thành công đúng một lần cho mỗi kỳ quay và mỗi hạng giải, còn hai lệnh gọi duyệt thì đơn giản là
cùng đẩy một con trỏ, nhưng hai keeper trên một tài khoản sẽ tranh nhau nonce của giao dịch.

## Trang này không nói tới điều gì

Nó không nói tới việc các giao dịch của keeper thực sự làm gì với tiền, chuyện đó ở
[một kỳ quay diễn ra thế nào](../concepts/how-a-draw-works.md). Nó không nói tới việc triển
khai, chuyện đó ở [triển khai](deploying.md). Và nó không hứa hẹn gì về tính sẵn sàng: chúng tôi
có chạy một keeper, chúng tôi không bảo đảm nó, và thiết kế được dựng lên sao cho việc không bảo
đảm đó vẫn chấp nhận được.
