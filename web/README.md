# CookClip Web

Wersja przeglądarkowa CookClip przygotowana głównie pod Safari na iPhonie.

## Jak działa przechowywanie danych

- przepisy są zapisywane lokalnie w IndexedDB,
- filmy są przechowywane lokalnie jako Blob w IndexedDB,
- dane nie są wysyłane na żaden serwer,
- aplikacja używa service workera do działania offline,
- po ponownym otwarciu strony zapisane przepisy i filmy pozostają dostępne,
- pliki wideo nie pojawiają się automatycznie jako zwykłe pliki w aplikacji Pliki — są częścią lokalnego magazynu CookClip w Safari.

## iPhone

Stronę można otworzyć w Safari i używać bez instalacji natywnej aplikacji. Po wdrożeniu na HTTPS możliwe jest również dodanie jej do ekranu początkowego jako aplikacji webowej.

## Funkcje

- kafelkowa biblioteka przepisów,
- wyszukiwanie po nazwie i składnikach,
- kategorie i ulubione,
- dodawanie i edycja przepisu,
- lokalny film instruktażowy,
- porcje +/- i skalowanie składników,
- odhaczanie składników,
- kroki z timestampami filmu,
- czasy przygotowania i gotowania,
- źródło/link,
- notatki,
- wartości odżywcze na porcję i całość,
- automatyczny jasny/ciemny wygląd,
- podstawowe działanie offline.

## Ograniczenia iOS/Safari

Pamięć witryny jest zarządzana przez iOS. Usunięcie danych Safari lub danych witryny usuwa lokalną bazę CookClip. Przy bardzo dużej liczbie filmów warto dodać eksport/import kopii zapasowej lub opcjonalną synchronizację z chmurą.
