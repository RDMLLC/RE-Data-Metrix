import { usePDF } from "react-to-pdf";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import logoPath from "@assets/Transparent Logo_1762969260481.png";
import { useAuth } from "@/contexts/AuthContext";

interface SoldPropertyComp {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  salePrice: number;
  saleDate: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  pricePerSqft: number;
  yearBuilt?: number;
  distanceFromSubject?: number;
  daysOnMarket?: number;
  isManuallyAdded?: boolean;
  isPending?: boolean;
  lotSize?: number;
  hasPool?: boolean;
  hasGarage?: boolean;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

interface CompReportPdfProps {
  subjectAddress: string;
  subjectCity: string;
  subjectState: string;
  subjectZip: string;
  subjectBeds: number;
  subjectBaths: number;
  subjectSqft: number;
  subjectYearBuilt?: number;
  subjectLotSize?: number;
  subjectLastSoldPrice?: number;
  subjectLastSoldDate?: string;
  subjectHasPool?: boolean;
  subjectHasGarage?: boolean;
  subjectImageUrl?: string;
  subjectLat?: number;
  subjectLng?: number;
  suggestedArv: number | null;
  avgPricePerSqft: number | null;
  selectedComps: SoldPropertyComp[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const usMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = parseInt(usMatch[1], 10);
    const day = parseInt(usMatch[2], 10);
    const year = parseInt(usMatch[3], 10);
    return `${months[month - 1]} ${day}, ${year}`;
  }
  
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    return `${months[month - 1]} ${day}, ${year}`;
  }
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateString: string): string {
  if (!dateString) return 'N/A';
  
  const usMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    return `${usMatch[1].padStart(2, '0')}/${usMatch[2].padStart(2, '0')}/${usMatch[3]}`;
  }
  
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  }
  
  return dateString;
}

// MM/DD/YY (two-digit year) — used by the merged Comps table's Sale Date
// column. Kept separate from `formatShortDate` (MM/DD/YYYY) which is still
// used elsewhere in this report (subject "Last sold on" line).
function formatMmDdYy(dateString: string): string {
  if (!dateString) return 'N/A';

  const usMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    return `${usMatch[1].padStart(2, '0')}/${usMatch[2].padStart(2, '0')}/${usMatch[3].slice(-2)}`;
  }

  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1].slice(-2)}`;
  }

  return dateString;
}

export default function CompReportPdf({
  subjectAddress,
  subjectCity,
  subjectState,
  subjectZip,
  subjectBeds,
  subjectBaths,
  subjectSqft,
  subjectYearBuilt,
  subjectLotSize,
  subjectLastSoldPrice,
  subjectLastSoldDate,
  subjectHasPool,
  subjectHasGarage,
  subjectImageUrl,
  subjectLat,
  subjectLng,
  suggestedArv,
  avgPricePerSqft,
  selectedComps,
}: CompReportPdfProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  // Track per-image load failures so we can skip any image that the PDF
  // rasterizer (html2canvas → jsPDF.addImage) would otherwise reject with
  // "addImage does not support files of type 'UNKNOWN'". When an external
  // image URL returns a non-image response (HTML 404, redirect, unsupported
  // format, etc.), the corresponding flag flips to true and the <img> is
  // simply not rendered, so PDF generation continues without it.
  const [userLogoFailed, setUserLogoFailed] = useState(false);
  const [subjectImageFailed, setSubjectImageFailed] = useState(false);
  // Static map below the comp table is loaded from /api/property/comp-map
  // (which proxies Google Static Maps). If it fails (no API key, geocode
  // failure, network error) the <img> simply isn't rendered so the rest of
  // the PDF still generates.
  const [mapImageFailed, setMapImageFailed] = useState(false);
  const { user } = useAuth();

  // Reset the failure flags whenever the underlying image URLs change so a
  // bad image for one report doesn't permanently suppress a valid image in
  // the next report (this component re-renders, not remounts, when the
  // subject address changes).
  useEffect(() => {
    setUserLogoFailed(false);
  }, [user?.reportLogoUrl]);
  useEffect(() => {
    setSubjectImageFailed(false);
  }, [subjectImageUrl]);
  useEffect(() => {
    setMapImageFailed(false);
  }, [subjectLat, subjectLng, selectedComps]);

  const safeAddress = subjectAddress || 'property';
  const { toPDF, targetRef } = usePDF({
    filename: `comp-report-${safeAddress.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
    page: {
      margin: 15,
      format: 'letter',
      orientation: 'portrait',
    },
    canvas: {
      mimeType: 'image/png',
      qualityRatio: 1,
    },
    overrides: {
      pdf: { compress: true },
    },
  });

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await toPDF();
    } catch (err) {
      // Skip silently if a problem image (or any other PDF generation
      // hiccup) trips jsPDF; the button is still re-enabled below.
      console.warn('PDF generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Sort comps by distance ascending (closest first); comps without a
  // distance are placed at the end.
  const sortedComps = [...selectedComps].sort((a, b) => {
    const aDist = a.distanceFromSubject ?? Infinity;
    const bDist = b.distanceFromSubject ?? Infinity;
    return aDist - bDist;
  });

  // Build the URL for the Google Static Maps proxy. Returns null if there
  // isn't enough location data to bother showing a map. The proxy lives at
  // /api/property/comp-map and holds the GOOGLE_MAPS_API_KEY server-side.
  const compMapUrl: string | null = (() => {
    const compsForMap = sortedComps
      .filter(c => c.latitude != null && c.longitude != null)
      .map(c => ({ lat: c.latitude, lng: c.longitude, address: c.address }));
    const hasSubjectLatLng = subjectLat != null && subjectLng != null;
    const hasSubjectAddress = !!subjectAddress;
    if (!hasSubjectLatLng && !hasSubjectAddress && compsForMap.length === 0) {
      return null;
    }
    const params = new URLSearchParams();
    if (hasSubjectLatLng) {
      params.set('subjectLat', String(subjectLat));
      params.set('subjectLng', String(subjectLng));
    }
    if (hasSubjectAddress) {
      const fullAddr = [subjectAddress, subjectCity, subjectState, subjectZip]
        .filter(Boolean)
        .join(', ');
      params.set('subjectAddress', fullAddr);
    }
    params.set('comps', JSON.stringify(compsForMap));
    return `/api/property/comp-map?${params.toString()}`;
  })();

  // Calculate ARV range (±5% of suggested ARV)
  const arvLow = suggestedArv ? Math.round(suggestedArv * 0.95) : null;
  const arvHigh = suggestedArv ? Math.round(suggestedArv * 1.05) : null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleDownload}
        disabled={isGenerating || selectedComps.length === 0}
        data-testid="button-download-comp-report"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {isGenerating ? 'Generating...' : 'Download Comp Report'}
      </Button>

      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
        }}
      >
        <div
          ref={targetRef}
          style={{
            width: '8.5in',
            padding: '0.3in',
            backgroundColor: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#1f2937',
            fontSize: '10px',
            lineHeight: '1.3',
          }}
        >
          {/* Header */}
          {user?.reportLogoUrl && !userLogoFailed ? (
            /* Dual-brand header: user logo left (dominant), RE Data Metrix right */
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={user.reportLogoUrl} alt={user.reportCompanyName || 'Company logo'} style={{ height: '32px', width: 'auto', objectFit: 'contain', maxWidth: '100px' }} onError={() => setUserLogoFailed(true)} />
                {user.reportCompanyName && (
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111' }}>{user.reportCompanyName}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img src={logoPath} alt="RE Data Metrix" style={{ height: '22px', width: 'auto', opacity: 0.65 }} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#1d4ed8' }}>RE Data Metrix</div>
                  <div style={{ fontSize: '8px', color: '#6b7280', fontStyle: 'italic' }}>Turning Terms into Returns</div>
                  <div style={{ fontSize: '8px', color: '#6b7280' }}>www.redatametrix.com</div>
                  <div style={{ fontSize: '9px', color: '#6b7280' }}>Deal Analysis Report</div>
                </div>
              </div>
            </div>
          ) : (
            /* Fallback: original simple header (current layout) */
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <img src={logoPath} alt="RE Data Metrix" style={{ height: '28px', width: 'auto' }} />
              <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1a1a2e' }}>RE Data Metrix</span>
            </div>
          )}

          {/* Title */}
          <h1 style={{ fontSize: '19px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px' }}>
            Comp Report
          </h1>

          {/* Subject Property Card */}
          <div style={{ 
            display: 'flex', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px', 
            marginBottom: '16px',
            overflow: 'hidden',
          }}>
            <div style={{ flex: 1, padding: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', marginBottom: '3px' }}>
                {subjectAddress}, {subjectCity}, {subjectState} {subjectZip}
              </div>
              {subjectLastSoldPrice && subjectLastSoldDate && (
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '6px' }}>
                  Last sold for {formatCurrency(subjectLastSoldPrice)} on {formatShortDate(subjectLastSoldDate)}
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600', marginBottom: '6px' }}>
                Estimated ARV {arvLow && arvHigh ? `${formatCurrency(arvLow)} - ${formatCurrency(arvHigh)}` : (suggestedArv ? formatCurrency(suggestedArv) : 'N/A')}
              </div>
              <div style={{ fontSize: '11px', color: '#374151', marginBottom: '3px' }}>
                {subjectSqft?.toLocaleString()} sq ft
              </div>
              <div style={{ fontSize: '11px', color: '#374151', marginBottom: '3px' }}>
                {subjectBeds} Bedrooms; {subjectBaths} Bathrooms
              </div>
              <div style={{ fontSize: '11px', color: '#374151' }}>
                Garage: {subjectHasGarage === undefined ? 'N/A' : (subjectHasGarage ? 'Yes' : 'No')}; Pool: {subjectHasPool === undefined ? 'N/A' : (subjectHasPool ? 'Yes' : 'No')}
              </div>
            </div>
            {subjectImageUrl && !subjectImageFailed && (
              <div style={{ width: '160px', height: '110px', overflow: 'hidden' }}>
                <img 
                  src={subjectImageUrl} 
                  alt="Subject Property" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setSubjectImageFailed(true)}
                />
              </div>
            )}
          </div>

          {/* Comps Section */}
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
            Comps
          </h2>

          {/* Summary Metrics */}
          <div style={{ 
            display: 'flex', 
            gap: '14px', 
            marginBottom: '12px',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '12px',
          }}>
            <div>
              <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>Price Per Square Foot</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>{avgPricePerSqft != null ? `$${avgPricePerSqft.toFixed(0)}/sq ft` : 'N/A'}</div>
            </div>
          </div>

          {/* Comps Table — single merged table:
                Address | Beds/Baths | Sqft | $/Sqft | Sale Date | Sale Price | Distance | Year Built */}
          <div style={{ marginBottom: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '5px 4px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Address</th>
                  <th style={{ padding: '5px 4px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Beds / Baths</th>
                  <th style={{ padding: '5px 4px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Sqft</th>
                  <th style={{ padding: '5px 4px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>$/Sqft</th>
                  <th style={{ padding: '5px 4px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Sale Date</th>
                  <th style={{ padding: '5px 4px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Sale Price</th>
                  <th style={{ padding: '5px 4px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Distance</th>
                  <th style={{ padding: '5px 4px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Year Built</th>
                </tr>
              </thead>
              <tbody>
                {sortedComps.map((comp, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                    <td style={{ padding: '5px 4px', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.address}
                    </td>
                    <td style={{ padding: '5px 4px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.bedrooms} / {comp.bathrooms}
                    </td>
                    <td style={{ padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.sqft?.toLocaleString()}
                    </td>
                    <td style={{ padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.pricePerSqft != null ? `$${comp.pricePerSqft.toFixed(0)}/sq ft` : '—'}
                    </td>
                    <td style={{ padding: '5px 4px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.isPending ? 'Pending' : formatMmDdYy(comp.saleDate)}
                    </td>
                    <td style={{ padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', fontWeight: '600' }}>
                      {formatCurrency(comp.salePrice)}
                    </td>
                    <td style={{ padding: '5px 4px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.distanceFromSubject != null ? `${comp.distanceFromSubject.toFixed(1)} mi` : '—'}
                    </td>
                    <td style={{ padding: '5px 4px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.yearBuilt || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Map of subject + comps (Google Static Maps via /api/property/comp-map).
              Wrapped in mapImageFailed guard with onError so a failed map
              never blocks the rest of the PDF from generating. */}
          {compMapUrl && !mapImageFailed && (
            <div style={{ marginBottom: '14px', textAlign: 'center' }}>
              <img
                src={compMapUrl}
                alt="Subject and comparable properties map"
                style={{ display: 'block', margin: '0 auto', width: '600px', maxWidth: '100%', height: '300px', border: '1px solid #e5e7eb' }}
                onError={() => setMapImageFailed(true)}
              />
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '3px' }}>
                This comparable sales report was generated using RE Data Metrix™
              </div>
              <strong style={{ display: 'block', fontSize: '10px', color: '#1f2937', fontWeight: 700 }}>
                Start your free trial at redatametrix.com
              </strong>
            </div>
            <div style={{ fontSize: '7px', color: '#9ca3af', textAlign: 'center' }}>
              Disclaimer: This report is for informational purposes only. Comparable sales data is based on publicly available records. 
              Always conduct your own due diligence and consult with qualified professionals before making investment decisions.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
