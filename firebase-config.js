// Bulut eşitleme (Firebase) ayarı: VibePsych ve Okuma Atlası ikisi de bu dosyayı okur.
// Boş (null) bırakılırsa "Google ile giriş" gizlenir ve uygulama yalnızca tarayıcıda saklar.
// Firebase konsolu > Proje ayarları > Uygulamalarım > Web uygulaması > "firebaseConfig" nesnesini buraya yapıştır.
// Bu değerler gizli değildir; erişimi Firestore güvenlik kuralları korur (bkz. FIREBASE-KURULUM.md).
window.VIBE_FIREBASE_CONFIG = null;
/* Örnek:
window.VIBE_FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "vibepsych-xxxx.firebaseapp.com",
  projectId: "vibepsych-xxxx",
  storageBucket: "vibepsych-xxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/
