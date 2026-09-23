# Generell GTM-mal for Cookie Consent v3.0.0

Denne pakken er klargjort for den stabile utgaven **v3.0.0**. Den kan brukes på
flere nettsteder og inneholder ingen kundespesifikke måle-ID-er, domener eller
hendelser. Samtykkelogikken er identisk med den testede `v3.0.0-rc.1`. Bare
versjonsmerking, dokumentasjon og beskrivende GTM-metadata er oppdatert.

Brukerens skjermbilder og tester bekrefter GTM-import og nettverkstrafikk etter
samtykke i Firefox og Chrome på testnettstedet. Brukeren har også rapportert at de
siste foreslåtte testene ser ut til å fungere. Testomfang og begrensninger er
beskrevet i `VALIDERING.json`; hvert nytt nettsted må kontrolleres med sine egne
tagger og innstillinger.

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
En fast jsDelivr-adresse som peker på `@v3.0.0` oppdateres heller ikke automatisk
til neste kodeversjon.

## Hva containerfilen inneholder

| Element | Innhold |
| --- | --- |
| Template og consent-tagg | Native GTM consent-API-er, på Consent Initialization - All Pages |
| Tre Custom Event-triggere | `cc_v3_ready` kombinert med analytics/marketing/functional = true |
| Tre Data Layer Variables | analytics, marketing og functional, standard false |
| To konfigurasjonsvariabler | GA4: `G-REPLACE`. Clarity: `REPLACE_WITH_CLARITY_ID` |
| `Base - GA4` | Google tag, pauset, analysetrigger og krav om analytics_storage |
| `Base - Clarity` | Custom HTML med v3-loader, pauset, samme analysekrav |

Det er ingen Meta-installasjon eller kundespesifikke konverteringshendelser i malen.
Samtykketriggeren for markedsføring er klar til bruk.

GTM krever at konstantverdiene er utfylt ved import. Verdiene ovenfor er derfor
plassholdere, ikke fungerende måle-ID-er. Begge basetaggene er pauset. Erstatt
plassholderne med nettstedets egne ID-er før du opphever pausen på taggene.

## Import på et nytt nettsted

1. Opprett nettstedets egen **Web**-container i GTM, eller bruk en ny tom container
   som er satt av til v3. Noter den nye `GTM-…`-ID-en.
2. Velg **Admin → Import Container**.
3. Velg `GTM-Cookie-consent-v3-template.json`.
4. Velg et nytt workspace. I en tom container kan du velge **Overwrite**.
5. Kontroller importoversikten og importer. Kildefilens `0`-ID-er og `GTM-REPLACE`
   er kildemetadata; de er ikke nettstedets måleinnstillinger. Bruk ID-en til den
   faktiske målcontaineren i Webflow.
6. Åpne **Variables → Config - GA4 Measurement ID** og erstatt `G-REPLACE` med
   nettstedets `G-…`-ID.
7. Åpne **Variables → Config - Clarity Project ID** og erstatt
   `REPLACE_WITH_CLARITY_ID` med nettstedets Clarity-ID.
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
<script defer src="https://cdn.jsdelivr.net/gh/Furnesdesign/kundeportal-cookie-consent-v3@v3.0.0/cookie-consent.js"></script>
```

Denne adressen fungerer først når `cookie-consent.js` ligger i roten av
repositoryet og taggen `v3.0.0` peker på commit-en med den stabile filen. Opprett
utgivelsen og åpne CDN-adressen i nettleseren før du oppdaterer Webflow. Samme
adresse kan brukes på alle nettstedene.

Et allerede fungerende v3-oppsett trenger bare den nye script-adressen i Webflow
ved denne overgangen. Behold nettstedets head-konfigurasjon og GTM-oppsett.
GTM-filen i pakken er fortsatt en startmal for nye containere; den skal ikke
overskrive en container der du allerede har lagt inn måle-ID-er og egne tagger.

## Test før produksjon

- Ingen valg, lukket banner og avvis alle: ingen GTM-/måleverktøyforespørsler.
- Bare analyse: GA4/Clarity kan starte, markedsføring skal være sperret.
- Bare markedsføring: GA4/Clarity skal være sperret.
- Endre eller trekk tilbake: siden lastes på nytt og det nye valget skal gjelde.
- Kontroller både nettverkstrafikk og faktiske hendelser; cookie-listen alene er ikke nok.

RC-koden hadde 38 beståtte automatiserte enhets-/kontrakttester. Den generelle
malen bestod også kontroller av referanser, kategorisperrer og fravær av kunde-ID-er.
For den stabile pakken er det kontrollert at runtime bare har fått nytt
versjonsnummer, og at GTM-koden og innstillingene er uendret bortsett fra metadata.
Den publiserte RC-filen på jsDelivr ble sammenlignet med kildefilen før oppdatering.

Skjermbilder viser GTM/GA4/Clarity-trafikk etter samtykke, og brukeren rapporterer
fravær av disse forespørslene ved avvisning. I Chrome startet verktøyene straks
brukeren valgte Allow, uten manuell omlasting. Fullstendige nettverkslogger er ikke
arkivert. Produksjonsdomener, andre nettlesere og nye verktøy må kontrolleres ved
utrulling. Test med samme nettleserinnstillinger før og etter samtykke, slik at
nettleserens egen sporingsbeskyttelse ikke skjuler feil i oppsettet.

Ved tilbaketrekking fra en side som allerede har lastet måleverktøy, brukes
stopp-/deaktiveringskall og omlasting. At den nye siden er stille dokumenterer
ikke at et allerede innlastet tredjepartsscript aldri sender en siste forespørsel
under selve overgangen. Kravet om ingen målesignaler før første samtykke må testes
fra en ny sideinnlasting uten lagret tillatelse.

## Publiser stabil v3.0.0 på GitHub

Bruk det eksisterende repositoryet `Furnesdesign/kundeportal-cookie-consent-v3`.
Behold utgivelsen og taggen `v3.0.0-rc.1` slik at gamle script-adresser fortsatt
fungerer. Denne pakken er en ny versjon; det gamle v2-repositoryet skal ikke endres.

1. Pakk ut `Cookie-consent-v3.0.0.zip`. Den inneholder de samme sju filnavnene som
   den generelle RC-pakken.
2. Åpne repositoryets **Code**-fane og velg **main** (eller grenen der du vedlikeholder
   filene). Velg **Add file → Upload files**.
3. Last opp de sju utpakkede filene i roten, på samme sted som de eksisterende
   filene. Ikke last opp bare ZIP-filen eller en mappe rundt filene.
4. Kontroller endringene og velg **Commit changes**, for eksempel med teksten
   `Prepare v3.0.0 stable release`. Dette forutsetter at repositoryet fortsatt
   inneholder den generelle malen. Behold eventuelle egne dokumentasjonsendringer.
5. Gå til **Releases → Draft a new release**.
6. Under **Choose a tag**, skriv `v3.0.0` og velg **Create new tag**. Velg grenen som
   inneholder commit-en fra trinn 4 som **Target**.
7. Skriv `Cookie Consent v3.0.0` som tittel. Beskriv at dette er første stabile
   utgave etter testing i Firefox og Chrome, med uendret samtykkelogikk fra RC.
8. La **This is a pre-release** være av, og velg **Set as latest release** dersom
   valget vises. Velg **Publish release**.
9. Åpne CDN-adressen fra Footer code ovenfor. Kontroller at den returnerer
   JavaScript, og at første linje sier `Cookie Consent v3.0.0`.
10. Oppdater footer-koden på nettstedene du vil flytte til stabil v3, og publiser
    dem i Webflow. Den eksisterende head-konfigurasjonen beholdes.
11. Ta en kort kontroll etter publisering: ingen måleforespørsler uten samtykke,
    og forventet trafikk etter godkjenning. I konsollen kan du skrive
    `window.CookieConsentV3.version`; forventet svar er `3.0.0`.

Eksisterende gyldige v3-samtykker beholdes fordi lagringsnøkkel og policyversjon
ikke er endret. Du trenger ikke å importere GTM på nytt for denne versjonsmerkingen.
Fremtidige rettelser publiseres med en ny tagg, for eksempel `v3.0.1`; la utgitte
tagger peke på de opprinnelige filene.

Offisiell dokumentasjon:

- [GitHub: Managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
- [jsDelivr: GitHub-versjoner i CDN-adresser](https://www.jsdelivr.com/?docs=gh)
