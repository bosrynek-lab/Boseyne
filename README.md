# Rynek Shop — Discord Bot (Node.js 18)

Gotowa paczka bota Discord przygotowana pod **Node.js 18.x** i skonfigurowana na podstawie podanych ID oraz grafik.

## Już wpisane w konfiguracji

- rola sprzedawcy/staff: `1499321419648077883`
- kategoria, w której tworzą się tickety: `1499321421979975833`
- Jailbreak: `1506203233633304688`
- Robux: `1512697980011151432`
- MM2: `1546969811798462474`
- case-world: `1548648793095020574`
- Petsim99: `1506203270757089322`
- kanał sticky Legit Check: `1506203473778049096`

Administratorzy Discorda także mają dostęp do przycisków administracyjnych ticketa.

## Funkcje
- po zamknięciu ticketa bot wysyła właścicielowi wiadomość prywatną z podsumowaniem ticketa,

- panel tworzenia ticketów z brandingiem **Rynek Shop** i niebieskim kolorem,
- formularz po kliknięciu **Utwórz ticket**:
  - Co chcesz zakupić
  - Kwota
  - Metoda płatności
- po wysłaniu formularza użytkownik dostaje prywatną/ephemeral wiadomość z odnośnikiem do utworzonego ticketa,
- ticket tworzy się jako prywatny kanał w skonfigurowanej kategorii,
- wiadomość w tickecie pokazuje użytkownika oraz odpowiedzi z formularza,
- przyciski **Zamknij ticketa**, **Ustawienia ticketa**, **Przejmij ticketa** działają tylko dla administratora lub roli sprzedawcy,
- ustawienia ticketa pozwalają zmienić nazwę, dodać użytkownika i usunąć użytkownika,
- Legit Check ma wzór:
  `+rep @Użytkownik (co zakupiłeś/sprzedałeś) (metoda płatności)`
- przykład:
  `+rep @auto_wywrotka torpedo (blik)`
- Legit Check działa jako sticky i po restarcie bota jest ponownie ustawiany na skonfigurowanym kanale,
- panel produktów z kategoriami: Jailbreak, Robux, MM2, case-world, Petsim99,
- wybranie kategorii pokazuje tylko danemu użytkownikowi wiadomość: **Ceny tych przedmiotów znajdziesz na kanale #...** oraz przycisk prowadzący do kanału,
- wszystkie dostarczone grafiki są już w `assets/` i podpięte do embedów.

## Node.js

Wymagane: **Node.js 18.18.0–18.x**.

Sprawdzenie wersji:

```bash
node -v
```

Instalacja zależności:

```bash
npm install
```

## `.env`

Skopiuj `.env.example` jako `.env` i wpisz tylko swój token oraz ID serwera:

```env
DISCORD_TOKEN=TWÓJ_TOKEN_BOTA
GUILD_ID=ID_TWOJEGO_SERWERA
```

**Nie wysyłaj nikomu tokena bota.**

## Uruchomienie

```bash
npm start
```

## Wysyłanie paneli

Po uruchomieniu dostępne są komendy slash:

- `/panel-ticket kanal:#kanał` — wysyła panel tworzenia ticketów,
- `/panel-produkty kanal:#kanał` — wysyła panel produktów,
- `/sticky-legit kanal:#kanał` — ręcznie ustawia Legit Check na wskazanym kanale.

Sticky Legit Check jest już przypisany w konfiguracji do kanału `1506203473778049096`, więc bot spróbuje wysłać go automatycznie po uruchomieniu.

## Uprawnienia bota

Bot potrzebuje co najmniej: View Channels, Send Messages, Embed Links, Attach Files, Read Message History, Manage Channels i Manage Messages. Musi też mieć dostęp do kategorii ticketów oraz kanałów, na których mają pojawić się panele.

## Logo bota

Plik `assets/logo.jpg` jest dołączony. Jeśli chcesz, aby był to również **avatar samego bota** widoczny obok wiadomości, ustaw ten plik jako avatar aplikacji/bota w Discord Developer Portal. Kod nie zmienia avatara automatycznie, żeby przy restartach nie wpadać w limity Discorda.
