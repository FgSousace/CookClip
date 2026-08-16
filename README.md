# CookClip

## 📱 Pobierz wersję iOS

### [⬇️ POBIERZ COOKCLIP NA IPHONE — ZIP](https://github.com/FgSousace/CookClip/archive/refs/heads/agent/ios-swiftui-mvp.zip)

> To jest paczka projektu iOS do otwarcia w Xcode. Gotowego pliku `.ipa` do instalacji jednym kliknięciem jeszcze nie ma — taki plik wymaga zbudowania i podpisania aplikacji w środowisku Apple/Xcode.

CookClip to lokalna aplikacja do przechowywania przepisów z krótkim filmem instruktażowym. Ten branch zawiera natywną wersję iPhone w SwiftUI, odwzorowującą ustalony zakres funkcji wersji Android.

## iOS

- SwiftUI, iPhone, iOS 17+
- projekt: `CookClip.xcodeproj`
- brak konta i backendu — dane oraz filmy są przechowywane lokalnie
- automatyczny jasny/ciemny wygląd systemowy
- siatka kafelków z wyszukiwaniem, kategoriami i ulubionymi
- pełny edytor przepisu
- film wymagany dla nowego przepisu
- lokalna kompresja filmu: 540p / 720p / 1080p
- porcje +/- i automatyczne skalowanie ilości składników
- odhaczanie składników podczas gotowania
- kroki z timestampami i skokiem do wskazanego momentu filmu
- przygotowanie / gotowanie / czas całkowity
- źródło oraz link
- notatki
- wartości odżywcze: kcal, białko, tłuszcz, węglowodany, błonnik, cukry i sól; widok na porcję oraz całość

## Uruchomienie

1. Pobierz ZIP przyciskiem powyżej i rozpakuj paczkę.
2. Otwórz `CookClip.xcodeproj` w Xcode.
3. W `Signing & Capabilities` wybierz własny Apple Development Team.
4. Wybierz iPhone Simulator albo podłączony iPhone.
5. Uruchom target `CookClip`.

Bundle identifier: `com.fgsousace.CookClip`.

> Xcode wymaga macOS. Instalacja na fizycznym iPhonie wymaga podpisania aplikacji kontem Apple Developer / Apple ID zgodnie z zasadami Xcode.
