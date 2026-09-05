# Pool và token

Hearth không phải một pool. Nó là bảy pool, mỗi pool cho một token bảo mật trong sổ địa chỉ
Sepolia của Zama, và mỗi pool có `HearthVault` riêng, `HearthPrizePool` riêng và
`SponsoredYieldSource` riêng, với người gửi riêng, tiền giải thưởng riêng và keeper riêng.

Các hợp đồng là cùng một đoạn mã, triển khai bảy lần với tham số khởi tạo khác nhau. Trên
chuỗi không có gì dùng chung: không registry, không router, không số dư chung. Người gửi ở
pool WETH không nhìn thấy, không chạm tới và không bị pool USDC chạm tới, và một vault bị tạm
dừng hay một keeper đứng máy ở token này thì sáu pool kia vẫn chạy.

## Bảy pool

| Token | Slug | Quay mỗi | Vault | Quỹ giải thưởng | Nguồn lợi suất |
| --- | --- | --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 giờ | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` |
| Confidential USDT (Mock) | `usdt` | 6 giờ | `0xe54F44dE64F8A7abc0647eaae547dD59ce0EFfac` | `0x6a83Beb2Dc3f258107Cad5e17BC57657fAd4fbd1` | `0x5bb1Cd5380Cb9f2B15569030fF0dB7a445cF54cA` |
| Confidential WETH (Mock) | `weth` | 6 giờ | `0x3D1A182782B68fE270A66294C9adaC7F005c4f14` | `0x1a11e7C689F244fA8Dd5f4abA8F2F3131090cc1C` | `0x40DF298f15c6136294eC651aD7b0c1C6F221DE8F` |
| Confidential BRON (Mock) | `bron` | 6 giờ | `0x18086DC8271f8A73c5Ea985fd519527Dbb991279` | `0x2Ed982979CD184494B947a1E38E597494a38ACe4` | `0x0cD1155D752bD81b3a437a6f0B3965CAA2A1C8e9` |
| Confidential ZAMA (Mock) | `zama` | 6 giờ | `0xEEC26386F273c6678cA538AcA18e1d9384eA9F09` | `0x873B285404199D46325a294Aa0EC7a79C30A7fF7` | `0xdD352D70311E834ab75307f53d5C276060081d23` |
| Confidential tGBP (Mock) | `tgbp` | 6 giờ | `0xCe95dAa01f5354aA8887A5952E403D26d452c323` | `0xC531D54ee2c695e0eBfe8b8258e9Fd80fd507095` | `0xDEa2BD6351072F735B6ea83c357bF157d83c01af` |
| Confidential XAUt (Mock) | `xaut` | 6 giờ | `0x77f701101d66FbD522A3bFdC2c00DB09a4F57daE` | `0x9a2888aca42c707A3BC0D561FdF6ff8Abfda5201` | `0x03fDdAA7C4323C53CE511CC49D4c33B26B492af7` |

Mọi hợp đồng phía trên đều đã được xác minh trên Etherscan. Cặp token mà mỗi pool nắm giữ là
của Zama chứ không phải của chúng tôi, và được liệt kê trong
[dùng thử trên Sepolia](../getting-started/try-it-on-sepolia.md).

Pool USDC được triển khai đầu tiên, ngày 2 tháng 9 năm 2026 tại block `11622398`, và chạy
quay theo giờ từ đó tới nay, nên nó là pool có bề dày lịch sử và cũng là pool mà bản ghi lệnh
chứng minh trong README được thu lại trên đó. Sáu pool còn lại được triển khai ngày 5 tháng 9
năm 2026, trong các block từ `11641314` tới `11641523`.

## Vì sao là sáu giờ, chứ không phải một giờ cho cả bảy

Vì gas. Một kỳ quay trên pool có năm người gửi tốn `8,456,388` gas, đo trên biên lai Sepolia
thật: một lần đóng, một lần trao giải, hai lô duyệt, một lần chốt và một lần đối soát cho mỗi
hạng giải. Ở mức 1 gwei thì đó là `0.0085 ETH`. Bảy pool cùng quay mỗi giờ là 168 kỳ quay một
ngày, khoảng `1.43 ETH`, con số không thể nạp nổi từ faucet công khai suốt một kỳ chấm giải.
Pool mười người gửi tốn `12,582,923` gas một kỳ quay và hoá đơn tăng theo.

Vậy nên sáu pool triển khai sau quay sáu giờ một lần. Mỗi pool bốn kỳ quay một ngày, nên cả
bảy pool cộng lại tốn khoảng `0.41 ETH` một ngày thay vì `1.43`, mà bốn kỳ quay một ngày vẫn
đủ dày để khách ghé thăm kịp thấy một kỳ quay diễn ra ngay trong một lần ghé. Pool USDC giữ
nguyên đồng hồ theo giờ và giữ luôn bề dày các kỳ quay đi kèm.

Tỷ lệ trúng được đặt theo chính kỳ của từng pool chứ không bê nguyên qua, nên cảm giác dùng
sản phẩm là như nhau ở cả hai đồng hồ:

| Hạng giải | Pool theo giờ (`usdc`) | Các pool sáu giờ |
| --- | --- | --- |
| Giải lớn | số lượng 1, tỷ lệ 1 trên 24, phần chia 40 | số lượng 1, tỷ lệ 1 trên 4, phần chia 40 |
| Giải vừa | số lượng 1, tỷ lệ 1 trên 6, phần chia 20 | số lượng 1, tỷ lệ 1 trên 2, phần chia 20 |
| Giải thường | số lượng 4, tỷ lệ 1 trên 1, phần chia 40 | số lượng 4, tỷ lệ 1 trên 1, phần chia 40 |

Nhờ vậy giải lớn trả khoảng một lần mỗi ngày ở mọi pool. Hạng giải vừa là chỗ duy nhất hai
đồng hồ khác nhau: khoảng bốn lần một ngày ở pool theo giờ và khoảng hai lần một ngày ở các
pool sáu giờ, vì giảm tỷ lệ đi một nửa vẫn không bù nổi việc chỉ còn một phần sáu số kỳ quay.
Mọi hạng giải của mọi pool đều đối soát mỗi kỳ quay, vì lý do nêu trong
[giải thưởng và các hạng giải](prizes-and-tiers.md).

## Chữ số thập phân, và một số tiền nghĩa là gì

Mọi lớp bọc bảo mật trong sổ địa chỉ Sepolia của Zama đều báo sáu chữ số thập phân, bất kể
token công khai bên dưới báo bao nhiêu, vì lớp bọc tự giới hạn ở sáu và đẩy phần chênh vào
hàm `rate()` của nó. Confidential WETH là ví dụ rõ nhất: token cơ sở của nó có 18 chữ số thập
phân, nên `rate()` của lớp bọc là một triệu triệu, và một đơn vị cơ sở của lớp bọc bằng một
triệu triệu đơn vị cơ sở của token công khai.

Mọi số tiền trong `packages/contracts/hearth.config.ts` đều tính theo đơn vị cơ sở của lớp
bọc, còn phần triển khai và các tác vụ sẽ nhân với tỷ lệ mà chúng đọc được trên chuỗi trước
khi chạm vào token công khai. Đây không phải chi tiết vụn vặt. Chính lượt tự kiểm toán của
chúng tôi đã tìm ra một lỗi ở chỗ pool ghi sổ theo số tiền mà người gọi truyền vào thay vì số
mà lớp bọc thực sự mint, và với một token 18 chữ số thập phân thì nó thổi phồng tiền giải
thưởng lên gấp một triệu triệu lần. Xem [nguồn lợi suất](yield-source.md).

## Mỗi pool được mồi những gì

`hearth:seed --token <slug>` tài trợ cho nguồn lợi suất và đưa năm người gửi mẫu vào, từ chỉ
số tài khoản 2 đến 6, để khách ghé lần đầu rơi vào một pool đã có người. Số vốn khác nhau theo
từng token vì một pool phải trông giống tài sản mà nó nắm giữ: 1.200 của một stablecoin đô la
và 0,6 ether là hai người gửi cùng cỡ.

| Pool | Năm khoản mẫu | Tài trợ | Tiền giải thưởng nhả ra |
| --- | --- | --- | --- |
| `usdc` | 1.200 / 600 / 300 / 150 / 75 | 10.000 USDC | 20 USDC một giờ, tức 19,998 một kỳ quay |
| `usdt` | 1.200 / 600 / 300 / 150 / 75 | 10.000 USDT | 20 USDT một giờ, tức 119,98 một kỳ quay |
| `weth` | 0,6 / 0,3 / 0,15 / 0,075 / 0,04 | 5 WETH | 0,01 WETH một giờ, làm tròn xuống còn 0,0432 một kỳ quay |
| `bron` | 2.000 / 1.000 / 500 / 250 / 125 | 15.000 BRON | 30 BRON một giờ, tức 179,99 một kỳ quay |
| `zama` | 2.000 / 1.000 / 500 / 250 / 125 | 15.000 ZAMA | 30 ZAMA một giờ, tức 179,99 một kỳ quay |
| `tgbp` | 1.000 / 500 / 250 / 125 / 60 | 8.000 tGBP | 16 tGBP một giờ, tức 95,99 một kỳ quay |
| `xaut` | 0,4 / 0,2 / 0,1 / 0,05 / 0,025 | 3 XAUt | 0,006 XAUt một giờ, làm tròn xuống còn 0,0216 một kỳ quay |

Tốc độ của một nguồn tính bằng số nguyên đơn vị cơ sở mỗi giây, nên hai tốc độ nhỏ nhất bị làm
tròn xuống: 0,01 WETH một giờ là 2,77 đơn vị cơ sở mỗi giây và nhả ra 2, còn 0,006 XAUt một
giờ là 1,67 và nhả ra 1. Mỗi khoản tài trợ đều được tính sao cho đủ dùng hơn tám mươi kỳ quay,
tức từ hai mươi ngày trở lên, nên không ai phải nạp thêm cho pool trong kỳ chấm giải.

## Token mà Hearth từ chối

Zama cũng phát hành một **Confidential tGBP** không phải bản mock trên Sepolia, ở địa chỉ
`0x167DC962808B32CFFFc7e14B5018c0bE06A3A208` trên token công khai
`0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3`. Quyền mint token cơ sở của nó bị giới hạn cho
đơn vị phát hành, nên ngoài đơn vị phát hành thì không ai lấy được token công khai, không ai
bọc thành token bảo mật được, và cũng không thể mở pool nào trên nó cả.

Hearth vẫn liệt kê nó trong bộ chọn pool, để mờ, kèm lý do viết ngay dưới tên nó. Tệp triển khai
ghi lý do đó đúng một lần, bằng tiếng Anh, là `mint restricted to the issuer`, còn ứng dụng in nó
ra bằng thứ tiếng người đọc đang dùng. Chọn nó sẽ mở ra một trang gọi tên token, dẫn tới cả hai hợp
đồng trên Etherscan, nói rõ giới hạn đó là của ai, và không đưa ra thao tác ví nào, vì một nút
gửi tiền chỉ để bị revert còn tệ hơn là không có nút.

Bỏ hẳn token đó khỏi danh sách thì dễ hơn, mà lại trông như Hearth đơn giản là chưa làm tới.
Người gửi nào đi tìm tGBP sẽ thấy hai mục: pool bản mock thì chạy được, và token chính thức
thì không, kèm lý do.

## Dãy pool cho thấy điều gì

Trang chủ kết lại bằng một dãy có đủ mọi pool, mỗi ô mang giải lớn của pool đó ngay lúc này, đọc
trên máy chủ trong một lệnh multicall và gửi kèm sẵn trong trang, nên dãy ấy đã điền xong khi câu
chuyện ngừng cuộn. Bộ chọn bên trong bảng điều khiển hiển thị đúng những con số ấy theo đúng những
quy tắc ấy.

Hai trong số các quy tắc đó tồn tại vì một con số có thể gây hiểu lầm:

- Pool nào không đọc được thì ghi `chưa đọc được`, không bao giờ ghi `0.00`. Một nút mạng không trả
  lời và một hũ giải rỗng trông y hệt nhau một khi đã viết số 0 xuống.
- Pool nào chưa đóng kỳ quay đầu tiên thì ghi **Kỳ quay đầu tiên HH:MM UTC** thay cho một con số, cả
  trên dãy pool lẫn dưới tên nó trong bộ chọn. Tiền giải chỉ tới được các hạng khi kỳ quay đầu tiên
  được trao, nên trước lần đóng đó câu trả lời thành thật là một thời điểm, chứ không phải `0.00`.
  Ô hiển thị cái nào trong hai cái là do `lastClosedDraw` vẫn đọc ra 0 quyết định, còn bản thân thời
  điểm là `firstPeriodAt` cộng `periodLength`, tức lúc kết thúc kỳ đầu tiên và cũng là khoảnh khắc
  sớm nhất mà kỳ quay 1 có thể đóng. Đồng hồ là 24 giờ UTC trong mọi ngôn ngữ.

## Ứng dụng lấy địa chỉ từ đâu

Ứng dụng không bao giờ mang theo một địa chỉ gõ tay. Mọi pool đang mở trong
`packages/web/src/lib/chain/pools.json` đều được sinh ra từ một tệp mà script triển khai đã
ghi, bằng lệnh:

```
node scripts/sync-pools.mjs        # from packages/web
```

Script đó đọc `packages/contracts/deployments/sepolia/hearth.<slug>.json`, từ chối bất kỳ tệp
nào thiếu địa chỉ, từ chối hai pool cùng nhận một slug, và nối thêm đúng một mục bị giới hạn
không có bản triển khai. Hãy chạy nó sau mỗi lần triển khai. Các biến môi trường từng chứa ba
địa chỉ của một pool duy nhất nay đã bỏ.

Người gửi đang xem pool nào thì nhìn đoạn đầu tiên sau `/app`:

| Đường dẫn | Nội dung hiển thị |
| --- | --- |
| `/app` | Chuyển hướng tới pool người gửi dùng lần gần nhất, hoặc `usdc` ở lần ghé đầu tiên |
| `/app/<slug>` | Bảng điều khiển của pool đó |
| `/app/<slug>/deposit` | Mint, shield và gửi tiền cho token đó |
| `/app/<slug>/withdraw` | Rút tiền và unshield cho token đó |
| `/app/<slug>/draws` | Các kỳ quay của pool đó, và kết quả riêng của người gửi ở từng kỳ |
| `/app/<slug>/run` | Năm bước quay thưởng không cần cấp phép của pool đó |
| `/verify?pool=<slug>` | Seed công khai, bậc và các ngưỡng của pool đó |

Mã ngôn ngữ đứng trước tất cả các đường dẫn trên với mọi ngôn ngữ trừ tiếng Anh, nên bảng điều
khiển của người đọc tiếng Nhật là `/ja/app/weth`.

## Mỗi pool một keeper

Bảy pool nghĩa là bảy tiến trình keeper, mỗi tiến trình ký từ chỉ số tài khoản riêng của cùng
một cụm từ khôi phục, vì hai tiến trình trên một tài khoản sẽ tranh nhau cùng một nonce. Bảng
phân công và tệp pm2 nằm ở [trang keeper](../operations/keeper.md).
