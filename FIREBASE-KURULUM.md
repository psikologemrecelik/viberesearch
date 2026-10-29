# Bulut eşitleme kurulumu (Firebase, ücretsiz Spark planı)

Giriş yapınca VibePsych ve Okuma Atlası verileri (makaleler, notlar, vurgular, bağlantılar, klasörler, tarama kararları, Kasam, favori dergiler, arama kaydı, ayarlar) Google hesabına eşitlenir. PDF'ler ve PDF alan görüntüleri her cihazda yerel kalır.

## 1. Proje

1. https://console.firebase.google.com adresine Google hesabınla gir, **Proje ekle**.
2. Ad: örneğin `vibepsych`. Google Analytics gerekmez, kapatabilirsin.

## 2. Google ile giriş

1. Sol menü **Derleme (Build) > Authentication > Başlayın**.
2. **Sign-in method** sekmesi > **Google** > **Etkinleştir**, destek e-postasını seç, **Kaydet**.
3. **Settings > Yetkili alan adları (Authorized domains)** > **Alan adı ekle**: `psikologemrecelik.github.io`
   (`localhost` listede zaten var; yerel denemeler için yeterli.)

## 3. Veritabanı

1. **Derleme > Firestore Database > Veritabanı oluştur**.
2. Konum: `eur3 (europe-west)` (Türkiye'ye yakın). **Üretim modunda başlat**.
3. **Kurallar (Rules)** sekmesine şunu yapıştırıp **Yayınla**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Herkes yalnızca kendi verisini okuyup yazabilir
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 4. Web uygulaması ayarı

1. Sol üstte dişli > **Proje ayarları > Genel > Uygulamalarınız** > web simgesi (`</>`).
2. Takma ad: `vibepsych-web`. "Firebase Hosting" kutusunu işaretleme. **Uygulamayı kaydet**.
3. Çıkan `firebaseConfig = { ... }` nesnesini kopyala ve `firebase-config.js` dosyasındaki `null` yerine yaz:

```js
window.VIBE_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "....firebaseapp.com",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Bu değerler gizli değildir; sitede herkes görebilir. Verini koruyan şey 3. adımdaki kurallardır.

## Kullanım

- VibePsych sağ üstte **Giriş**, ya da Okuma Atlası > **Veri** > **Google ile giriş yap**.
- İlk girişte bu cihazdaki veriler buluttakilerle birleştirilir. Aynı kaydın iki tarafta farklı sürümü varsa hangisinin kalacağı sorulur.
- Sonrasında her değişiklik birkaç saniye içinde buluta yazılır, diğer cihazlarda kendiliğinden görünür.
- Aynı kaydı iki cihazda aynı anda düzenlersen son kaydedilen kalır.

## Ücretsiz plan sınırları

Firestore Spark planı: 1 GB depolama, günde 50.000 okuma, 20.000 yazma. Bir makale bir belgedir; her açılışta makale sayısı kadar okuma yapılır. Tek kişilik kullanım bu sınırların çok altındadır.

## Gizlilik

Veriler bu Firebase projesinde, kullanıcı başına ayrı klasörde (`users/<kullanıcı-id>/...`) tutulur. Siteyi başkaları da kullanırsa onların verileri de bu projede durur; kurallar gereği kimse başkasınınkini okuyamaz, ama proje sahibi Firebase konsolundan görebilir. Başkalarına açacaksan kısa bir gizlilik notu ekle.
