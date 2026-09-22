# Generell GTM-mal for Cookie Consent v3

Denne malen er laget for nye v3-oppsett på flere nettsteder. Den inneholder ingen
kundespesifikke måle-ID-er, domener eller hendelser. Den bruker det samme felles
`cookie-consent.js` som tidligere ble levert, versjon **3.0.0-rc.1**. Runtime-koden
er ikke endret.

Containerfilen er validert lokalt. Faktisk import i GTM og nettverkstest med
leverandørscript gjenstår før produksjonsgodkjenning.

## Én felles kodefil, separate innstillinger

| Del | Felles for nettstedene | Tilpasses per nettsted |
| --- | --- | --- |
| GitHub / jsDelivr | Samme `cookie-consent.js` og versjonsadresse | Vanligvis ingenting i kildekoden |
| Webflow Head code | Samme korte konfigurasjonsformat | GTM-ID og GA4 Measurement-ID-er |
| Webflow Footer code | Samme script-lenke | Bare ved valg av en annen kodeversjon |
| GTM-startmal | Samtykkemotor, kategoritriggere, klargjorte basetagger | Opprettes/importeres for hvert nettsted |
| GA4 og Clarity | Samme samtykkekrav | Nettstedets egne prosjekt-/måle-ID-er |
| Meta og andre verktøy | Riktig kategori og samtykkekrav | Legges til etter behov |

GTM-containeren for hvert nettsted er en selvstendig kopi etter import. En senere
endring i JSON-malen på GitHub oppdaterer ikke automatisk eksisterende GTM-containere.
En fast jsDelivr-adresse som peker på `@v3.0.0-rc.1` oppdateres heller ikke automatisk
til neste kodeversjon.

## Hva containerfilen inneholder

| Element | Innhold |
| --- | --- |
| Template og consent-tagg | Native GTM consent-API-er, på Consent Initialization - All Pages |
| Tre Custom Event-triggere | `cc_v3_ready` kombinert med analytics/marketing/functional = true |
| Tre Data Layer Variables | analytics, marketing og functional, standard false |
| To konfigurasjonsvariabler | Tom GA4 Measurement ID og tom Clarity Project ID |
| `Base - GA4` | Google tag, pauset, analysetrigger og krav om analytics_storage |
| `Base - Clarity` | Custom HTML med v3-loader, pauset, samme analysekrav |

Det er ingen Meta-installasjon eller kundespesifikke konverteringshendelser i malen.
Samtykketriggeren for markedsføring er klar til bruk.

## Import på et nytt nettsted

1. Opprett nettstedets egen **Web**-container i GTM, eller bruk en ny tom container
   som er satt av til v3. Noter den nye `GTM-…`-ID-en.
2. Velg **Admin → Import Container**.
3. Velg `GTM-Cookie-consent-v3-template.json`.
4. Velg et nytt workspace. I en tom container kan du velge **Overwrite**.
5. Kontroller importoversikten og importer. Kildefilens `0`-ID-er og `GTM-REPLACE`
   er kildemetadata; de er ikke nettstedets måleinnstillinger. Bruk ID-en til den
   faktiske målcontaineren i Webflow.
6. Åpne **Variables → Config - GA4 Measurement ID** og sett nettstedets `G-…`-ID.
7. Åpne **Variables → Config - Clarity Project ID** og sett nettstedets Clarity-ID.
8. Opphev pausen på **Base - GA4** og **Base - Clarity** for verktøyene du bruker.
   Hvis et verktøy ikke skal brukes, lar du taggen være pauset eller sletter den.
9. La **Consent - Furnes design v3** være aktiv. Kontroller at den bruker den nye
   templaten og **Consent Initialization - All Pages**.
10. Sett inn Webflow-snippetene nedenfor. Fjern den gamle GTM-innlastingen, v2-scriptet
    og eventuell GTM-noscript-iframe fra nettstedet som migreres.
11. Test GTM Preview og deretter Network uten Preview på publisert testside. Publiser
    v3-containeren og v3-Webflow-koden som ett koordinert bytte.

Ikke bruk **Overwrite** på en eksisterende container med tagger du vil beholde. En
slik migrering krever et eget workspace og gjennomgang av eksisterende tagger. Alle
aktive måletagger må få kategorisperrer, og tidligere basetagger må erstattes eller
omkobles slik at det ikke finnes både gammel og ny aktivering. En separat v3-container
gir en tydelig avgrensning dersom noen nettsteder fortsatt bruker en delt v2-container.

## Legg til Meta og andre tagger

Lag taggene i GTM som vanlig, og legg på begge disse kontrollene:

| Verktøy | Basetaggens trigger | Additional Consent Checks |
| --- | --- | --- |
| GA4 og Clarity | v3 - analytics cookies allowed | analytics_storage |
| Meta / markedsføring | v3 - marketing cookies allowed | ad_storage, ad_user_data, ad_personalization |
| Valgfrie funksjonelle verktøy | v3 - functional cookies allowed | functionality_storage |

Velg **Once per page** for basetagger som bare skal initialiseres én gang. Behold
egne klikk-/konverteringsvilkår på hendelsestagger, og legg til at kategorivariabelen
må være `true`. Samtykkekrav må også settes på hver hendelsestagg. GA4-hendelser kan
bruke `Base - GA4` som setup-tagg med stopp ved setup-feil, slik at grunnkonfigurasjonen
er klar først.

Ikke gi en valgfri måletagg en selvstendig **All Pages**-trigger i tillegg til
kategoritriggeren: flere triggere er alternative måter å aktivere taggen på.

Clarity-taggen er allerede satt opp til å kalle `CookieConsentV3.loadClarity(...)`.
Fyll inn prosjekt-ID-en i variabelen; det er ikke nødvendig å lime inn Claritys
standardbootstrap i tillegg. Loaderen sender det lokale samtykkevalget til køen
før Clarity-scriptet hentes. Kontroller også Clarity-prosjektets samtykkeinnstillinger.

Malen kan sperre aktivering av nye verktøy, men verktøyenes oppførsel etter innlasting
må også kontrolleres. Test særlig delvis samtykke, tilbaketrekking og eventuelle
automatiske forbindelser til andre leverandører/destinasjoner.

## Minimal Webflow Head code

```html
<script>
window.CookieConsentConfig = {
  gtmId: 'GTM-DINCONTAINER',
  ga4MeasurementIds: ['G-DINMAALEID']
};
</script>
```

Begge ID-ene må erstattes. Bruk `ga4MeasurementIds: []` hvis nettstedet ikke bruker
GA4. Ved flere GA4-egenskaper angis alle G-ID-ene i listen.

GA4-ID-en står også i GTM. I denne runtime-versjonen brukes listen i headeren til
Googles `ga-disable-*` når analyse slås av. Den installerer ingen ekstra Google tag.
GTM er fortsatt stedet der selve måleverktøyet og hendelsene konfigureres.

Alle øvrige standardinnstillinger ligger allerede i fellesscriptet:

- `storageKey`: fd_cookie_consent_v3
- `policyVersion`: 3
- `maxAgeDays`: 180
- `gtmCategories`: analytics og marketing

Hvis funksjonelle tagger skal kunne starte GTM uten analyse/markedsføring, legg til
`gtmCategories: ['functional', 'analytics', 'marketing']` i konfigurasjonen. Slike
tagger skal fortsatt ha sitt eget samtykkekrav.

Headeren er dermed bare noen få linjer med nettstedsinnstillinger. Det er ikke
nødvendig å lage en egen GitHub-fil per nettsted for disse.

## Webflow Footer code

```html
<script defer src="https://cdn.jsdelivr.net/gh/Furnesdesign/kundeportal-cookie-consent-v3@v3.0.0-rc.1/cookie-consent.js"></script>
```

Denne adressen fungerer først når du har opprettet repositoryet, lastet opp
`cookie-consent.js` i roten og publisert taggen `v3.0.0-rc.1`. Samme adresse kan brukes
på alle nettstedene. Denne nye generelle GTM-filen krever ingen endring av runtime
eller en allerede publisert script-tagg.

## Test før produksjon

- Ingen valg, lukket banner og avvis alle: ingen GTM-/måleverktøyforespørsler.
- Bare analyse: GA4/Clarity kan starte, markedsføring skal være sperret.
- Bare markedsføring: GA4/Clarity skal være sperret.
- Endre eller trekk tilbake: siden lastes på nytt og det nye valget skal gjelde.
- Kontroller både nettverkstrafikk og faktiske hendelser; cookie-listen alene er ikke nok.

Den eksisterende runtime har 38 beståtte automatiserte enhets-/kontrakttester.
Den generelle malen har i tillegg bestått lokale kontroller av referanser,
kategorisperrer, fravær av kunde-ID-er og uendret samtykkemotor. Dette erstatter ikke
GTM-importvalidering eller nettverkstest i en virkelig nettleser.

Ved behov finnes den komplette GitHub- og utrullingsveiledningen i
`Cookie-consent-v3-installasjon.md` fra forrige leveranse. 7ocean-piloten er fortsatt
et separat eksempel med kundens eksisterende hendelser; denne generelle malen er
utgangspunktet for nye nettsteder.
