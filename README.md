# perde. — Gitar klavyesini keşfet

Yatay gitar klavyesinde gamları, akorları ve notaların yerlerini keşfetmek için HTML, CSS ve JavaScript ile hazırlanmış uygulama. Bilgisayar ve telefon tarayıcılarında çalışır. Kurulacak bir JavaScript paketi veya veritabanı gerektirmez.

## Çalıştırma

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

## Telefondan açma

1. Telefonu ve bilgisayarı aynı Wi-Fi ağına bağlayın.
2. Sunucuyu bilgisayarda başlatın.
3. Terminalde **Telefon:** satırında gösterilen adresi telefonun tarayıcısına yazın. Örnek: `http://192.168.1.20:5173`.
4. Uygulamayı kullandığınız sürece bilgisayarı açık ve sunucuyu çalışır durumda tutun. Sunucuyu kapatmak için terminalde **Ctrl+C** kullanın.

Telefondaki `localhost` adresi bilgisayara ulaşmaz; terminaldeki ağ adresini kullanın. Birden fazla adres görünüyorsa bilgisayarın Wi-Fi bağlantısının IPv4 adresini deneyin. Bağlantı kurulamazsa bilgisayarın güvenlik duvarında Node.js veya Python için yerel ağ erişimini kontrol edin. Misafir Wi-Fi ağları, VPN veya modemlerdeki cihaz yalıtımı aynı ağdaki cihazların birbirine erişmesini engelleyebilir.

Bu yöntem aynı yerel ağ içindir. Başka ağlardan erişim için uygulamanın HTML, CSS ve JavaScript dosyaları bir statik site barındırma hizmetine yüklenebilir; proje otomatik olarak internette yayımlanmaz.

## Kullanım

- **Gam:** Bir kök nota ve gam seçerek klavyedeki ilgili notaları görün.
- **Akor:** Kök nota ve akor türü üzerinden akor seslerini inceleyin.
- **Katman:** Gam ve akoru birlikte göstererek ortak sesleri karşılaştırın.
- **Görünüm:** Nota adları, aralıklar ve TAB perde numaraları arasında geçiş yapın.
- **Akort:** Standart, Drop D veya yarım ses pes akort seçin.
- **Perdeler:** Görünecek perde sayısını değiştirin; dar ekranda klavyeyi yatay kaydırın.
- **Dinleme:** Klavyedeki bir notaya dokunarak sesini dinleyin. Ses ilk dokunuştan sonra etkinleşir; telefonun medya sesini açık tutun.

Klavyede ince teller üstte, kalın teller altta yer alır. TAB görünümündeki sayılar perde numarasıdır; **0** açık tel anlamına gelir. Bu görünüm seçili gam veya akorun yerlerini gösterir; ritim içeren bir şarkı transkripsiyonu değildir.

## Kontrol

Müzik hesaplamalarının otomatik kontrollerini çalıştırmak için:

```sh
node --test
```

Güncel bir Node.js sürümü kullanın. Geliştirme sunucusu yalnızca statik dosyaları sunar; uygulama hesaplamaları ve ses üretimi tarayıcıda yapılır.
