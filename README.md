# perde. — Gitar klavyesini keşfet

Yatay gitar klavyesinde gamları, akorları ve notaların yerlerini keşfetmek için HTML, CSS ve JavaScript ile hazırlanmış uygulama. Bilgisayar ve telefon tarayıcılarında çalışır. Kurulacak bir JavaScript paketi veya veritabanı gerektirmez.

## İnternetten açma

Yayın adresi: **https://goktugtutar.github.io/guitarViz/**

Uygulama GitHub Pages üzerinde ücretsiz barındırılır. Telefon veya bilgisayardan bu adresi açabilirsiniz; yerel sunucu, aynı Wi-Fi ağı veya açık bir bilgisayar gerekmez.

Yayın kaynağı GitHub reposunda **Settings → Pages → Deploy from a branch → main → / (root)** olarak ayarlanır. `main` dalına yüklenen değişiklikler otomatik olarak yayımlanır; güncellemelerin görünmesi birkaç dakika sürebilir. `.nojekyll` dosyası HTML, CSS ve JavaScript dosyalarının doğrudan sunulmasını sağlar.

## Yerelde çalıştırma

Bu klasörde bir terminal açın. Node.js kuruluysa:

```sh
npm start
```

Aynı sunucuyu doğrudan da başlatabilirsiniz:

```sh
node serve.mjs
```

Tarayıcıda **http://localhost:5173** adresini açın. Port kullanımdaysa:

```sh
node serve.mjs --port 5174
```

Python 3 kuruluysa alternatif olarak:

```sh
python3 serve.py
```

Python sunucusu da `--port 5174` seçeneğini destekler. İki sunucudan yalnızca birini çalıştırmanız yeterlidir. JavaScript modülleri kullanıldığı için uygulamayı `index.html` dosyasına çift tıklayarak değil, sunucunun adresinden açın.

## Yerel geliştirme sürümünü telefondan açma

1. Telefonu ve bilgisayarı aynı Wi-Fi ağına bağlayın.
2. Sunucuyu bilgisayarda başlatın.
3. Terminalde **Telefon:** satırında gösterilen adresi telefonun tarayıcısına yazın. Örnek: `http://192.168.1.20:5173`.
4. Uygulamayı kullandığınız sürece bilgisayarı açık ve sunucuyu çalışır durumda tutun. Sunucuyu kapatmak için terminalde **Ctrl+C** kullanın.

Telefondaki `localhost` adresi bilgisayara ulaşmaz; terminaldeki ağ adresini kullanın. Birden fazla adres görünüyorsa bilgisayarın Wi-Fi bağlantısının IPv4 adresini deneyin. Bağlantı kurulamazsa bilgisayarın güvenlik duvarında Node.js veya Python için yerel ağ erişimini kontrol edin. Misafir Wi-Fi ağları, VPN veya modemlerdeki cihaz yalıtımı aynı ağdaki cihazların birbirine erişmesini engelleyebilir.

Bu yöntem yalnızca yerel geliştirme içindir. Normal kullanımda yukarıdaki GitHub Pages adresini açın.

## Kullanım

### Sekmeler

- **Keşfet:** Gam, akor ve katman haritaları. Başka bir sekmeye geçip döndüğünüzde bu ekrandaki seçimleriniz korunur.
- **Progresyonlar:** Majör/minör ton ve sekiz hazır yürüyüşten birini seçin. Roma rakamı, akor adı ve işlev açıklaması birlikte gösterilir. Akora dokunun, yatay klavyede pozisyonunu görün. Örneğin G majörde I–V–vi–IV = G–D–Em–C. Tonun yedi diyatonik akorunu ayrıca inceleyebilirsiniz.
- **Akor Bul:** Kök nota ve akor türünü seçin. Tüm nota yerleri ile çalınabilir açık/bareli pozisyonlar arasında geçiş yapın. Pozisyonları düğmeler veya oklarla gezin; perde ve parmak numaralarını tablodan ya da **Parmaklar** görünümünden okuyun.

Progresyonlar 40–180 BPM aralığında, her akor dört vuruş sürecek şekilde çalınır. **Tekrarla** döngüyü açar; durdurma, sekme/ton/tempo değişikliği veya sayfadan ayrılma çalmayı sonlandırır. Akor Bul'da **Akoru dinle** seçilen tutuşu çalar.

Parmak numaraları: 1 = işaret, 2 = orta, 3 = yüzük, 4 = serçe. 0 açık tel, × susturulan teldir. Parmak numaraları bir tutuş önerisidir. Drop D pozisyonlarında altıncı tel susturulur; bu telin değiştirilmesi diğer tellerdeki akor seslerini etkilemez.

### Keşfet kontrolleri

- **Gam:** Bir kök nota ve gam seçerek klavyedeki ilgili notaları görün.
- **Akor:** Kök nota ve akor türü üzerinden akor seslerini inceleyin.
- **Katman:** Gam ve akoru birlikte göstererek ortak sesleri karşılaştırın.
- **Görünüm:** Nota adları, aralıklar ve TAB perde numaraları arasında geçiş yapın.
- **Akort:** Standart, Drop D veya yarım ses pes akort seçin.
- **Perdeler:** Görünecek perde sayısını değiştirin; dar ekranda klavyeyi yatay kaydırın.
- **Dinleme:** Klavyedeki bir notaya dokunarak sesini dinleyin. Ses ilk dokunuştan sonra etkinleşir; telefonun medya sesini açık tutun.

Klavyede ince teller üstte, kalın teller altta yer alır. TAB görünümündeki sayılar perde numarasıdır; **0** açık tel anlamına gelir. Bu görünüm seçili gam veya akorun yerlerini gösterir; ritim içeren bir şarkı transkripsiyonu değildir.

## Kontrol

Müzik hesaplamaları ve arayüz etkileşimlerinin otomatik kontrollerini çalıştırmak için geliştirme bağımlılıklarını kurun:

```sh
npm ci
npm test
```

Güncel bir Node.js sürümü kullanın. Testlerde jsdom ve sahte zamanlayıcı kullanılır; bunlar gerçek tarayıcı yerleşimi veya ses tınısını ölçmez. Uygulamayı çalıştırmak için bu paketler gerekmez. Geliştirme sunucusu yalnızca statik dosyaları sunar; uygulama hesaplamaları ve ses üretimi tarayıcıda yapılır.
