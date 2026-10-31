"use client";

import Script from "next/script";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AdvertisingConsentPanel } from "./AdvertisingConsent";
import {
  ADVERTISING_CONSENT_CHANGE_EVENT,
  getAdvertisingConsent,
  isExactProductionHost,
  setAdvertisingConsent,
  syncAdvertisingConsentFromStorage,
  type AdvertisingConsent,
} from "@/lib/meta-consent";
import {
  initializeMetaPixel,
  revokeMetaPixel,
} from "@/lib/meta-pixel";

const pixelBootstrap = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');`;

function subscribeToConsent(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    syncAdvertisingConsentFromStorage(event);
    onChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(ADVERTISING_CONSENT_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ADVERTISING_CONSENT_CHANGE_EVENT, onChange);
  };
}

function subscribeToClientReady() {
  return () => undefined;
}

export default function MetaPixel() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const consent = useSyncExternalStore<AdvertisingConsent>(
    subscribeToConsent,
    getAdvertisingConsent,
    () => "unset",
  );
  const consentLoaded = useSyncExternalStore(
    subscribeToClientReady,
    () => true,
    () => false,
  );
  const productionHost = consentLoaded && isExactProductionHost();

  useEffect(() => {
    if (!consentLoaded) return;
    if (consent !== "granted") {
      // Clear identifiers left by the previous unconditional Pixel as soon as
      // the new consent manager hydrates, including while the choice is unset.
      revokeMetaPixel();
      return;
    }
    if (productionHost) initializeMetaPixel();
  }, [consent, consentLoaded, productionHost]);

  function chooseConsent(choice: "granted" | "denied") {
    setAdvertisingConsent(choice);
    setSettingsOpen(false);
  }

  const shouldLoadPixel =
    consentLoaded && consent === "granted" && productionHost;

  return (
    <>
      {shouldLoadPixel ? (
        <Script
          id="meta-pixel-bootstrap"
          strategy="afterInteractive"
          onReady={initializeMetaPixel}
        >
          {pixelBootstrap}
        </Script>
      ) : null}

      {consentLoaded ? (
        <AdvertisingConsentPanel
          consent={consent}
          settingsOpen={settingsOpen}
          onChoose={chooseConsent}
          onOpenSettings={() => setSettingsOpen(true)}
          onCloseSettings={() => setSettingsOpen(false)}
        />
      ) : null}
    </>
  );
}
