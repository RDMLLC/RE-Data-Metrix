import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MarketingPixel } from "@shared/schema";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    lintrk?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    ttq?: any;
    twq?: (...args: any[]) => void;
  }
}

function loadMetaPixel(pixelId: string) {
  if (window.fbq) return;
  
  const n = function() {
    // @ts-ignore
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  } as any;
  
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  window.fbq = n;

  const t = document.createElement('script') as HTMLScriptElement;
  t.async = true;
  t.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const s = document.getElementsByTagName('script')[0];
  s?.parentNode?.insertBefore(t, s);

  n('init', pixelId);
  n('track', 'PageView');
}

function loadLinkedInPixel(partnerId: string) {
  if (window.lintrk) return;

  window.lintrk = function(a: any, b: any) {
    (window.lintrk as any).q.push([a, b]);
  };
  (window.lintrk as any).q = [];

  const s = document.createElement('script');
  s.type = 'text/javascript';
  s.async = true;
  s.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  const x = document.getElementsByTagName('script')[0];
  x?.parentNode?.insertBefore(s, x);

  const img = document.createElement('img');
  img.height = 1;
  img.width = 1;
  img.style.display = 'none';
  img.alt = '';
  img.src = `https://px.ads.linkedin.com/collect/?pid=${partnerId}&fmt=gif`;
  document.body.appendChild(img);
}

function loadGooglePixel(conversionId: string) {
  if (window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer?.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', conversionId);

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
  document.head.appendChild(s);
}

function loadTikTokPixel(pixelId: string) {
  if (window.ttq) return;

  window.ttq = window.ttq || [];
  
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://analytics.tiktok.com/i18n/pixel/events.js';
  document.head.appendChild(s);

  s.onload = () => {
    window.ttq?.load?.(pixelId);
    window.ttq?.page?.();
  };
}

function loadTwitterPixel(pixelId: string) {
  if (window.twq) return;

  const e = function() {
    (e as any).exe ? (e as any).exe.apply(e, arguments) : (e as any).queue.push(arguments);
  } as any;
  e.version = '1.1';
  e.queue = [];
  window.twq = e;

  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://static.ads-twitter.com/uwt.js';
  document.head.appendChild(s);

  s.onload = () => {
    window.twq?.('config', pixelId);
    window.twq?.('track', 'PageView');
  };
}

export function useMarketingEvents() {
  const { data: pixels = [], isSuccess: pixelsLoaded } = useQuery<MarketingPixel[]>({
    queryKey: ["/api/marketing-pixels"],
    staleTime: 1000 * 60 * 5,
  });

  const trackEvent = (eventName: string, params?: Record<string, any>) => {
    pixels.forEach(pixel => {
      if (!pixel.isEnabled) return;

      switch (pixel.platform) {
        case 'meta':
          window.fbq?.('track', eventName, params);
          break;
        case 'linkedin':
          window.lintrk?.('track', { conversion_id: params?.conversion_id });
          break;
        case 'google':
          window.gtag?.('event', eventName, params);
          break;
        case 'tiktok':
          window.ttq?.track?.(eventName, params);
          break;
        case 'twitter':
          window.twq?.('track', eventName, params);
          break;
      }
    });
  };

  return {
    trackCompleteRegistration: (params?: { value?: number; currency?: string }) => {
      trackEvent('CompleteRegistration', params);
    },
    trackSubscribe: (params?: { value?: number; currency?: string; plan?: string }) => {
      trackEvent('Subscribe', { ...params, predicted_ltv: params?.value });
    },
    trackLead: (params?: { content_name?: string }) => {
      trackEvent('Lead', params);
    },
    trackViewContent: (params?: { content_name?: string; content_type?: string }) => {
      trackEvent('ViewContent', params);
    },
    trackInitiateCheckout: (params?: { value?: number; currency?: string }) => {
      trackEvent('InitiateCheckout', params);
    },
    trackSubmitApplication: (params?: { content_name?: string }) => {
      trackEvent('SubmitApplication', params);
    },
    trackCustom: (eventName: string, params?: Record<string, any>) => {
      trackEvent(eventName, params);
    },
    pixelsLoaded,
  };
}

export default function MarketingPixelLoader() {
  const { data: pixels = [] } = useQuery<MarketingPixel[]>({
    queryKey: ["/api/marketing-pixels"],
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    pixels.forEach(pixel => {
      if (!pixel.isEnabled) return;

      switch (pixel.platform) {
        case 'meta':
          loadMetaPixel(pixel.pixelId);
          break;
        case 'linkedin':
          loadLinkedInPixel(pixel.pixelId);
          break;
        case 'google':
          loadGooglePixel(pixel.pixelId);
          break;
        case 'tiktok':
          loadTikTokPixel(pixel.pixelId);
          break;
        case 'twitter':
          loadTwitterPixel(pixel.pixelId);
          break;
      }
    });
  }, [pixels]);

  return null;
}
