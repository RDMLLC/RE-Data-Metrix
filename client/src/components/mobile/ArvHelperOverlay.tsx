import { useState, useEffect, useMemo, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import { WizardFormData } from "@/components/deal-analysis/DealAnalysisWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  X,
  Search,
  Loader2,
  Home,
  MapPin,
  ExternalLink,
  Plus,
  Clock,
  Pencil,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import ArvQuotaExhaustedModal from "@/components/deal-analysis/ArvQuotaExhaustedModal";
import CompReportPdf from "@/components/deal-analysis/CompReportPdf";
import CollapsibleSection from "@/components/mobile/CollapsibleSection";
import logoImg from "@assets/Transparent Logo_1762969260481.png";

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
  lotSize?: number;
  propertyType?: string;
  daysOnMarket?: number;
  imageUrl?: string;
  distanceFromSubject?: number;
  listingUrl?: string;
  isManuallyAdded?: boolean;
  isPending?: boolean;
  similarityScore?: number;
  distressedFlag?: boolean;
  outlierFlag?: boolean;
  latitude?: number;
  longitude?: number;
}

interface CompsSearchResponse {
  comps: SoldPropertyComp[];
  suggestedArv: number | null;
  weightedAvgPricePerSqft?: number;
  message?: string;
  radiusExpanded?: boolean;
  actualRadiusMiles?: number;
  dateRangeExpanded?: boolean;
  actualDateRangeDays?: number;
  searchStats?: { suitableCount?: number };
}

interface ArvHelperOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  form: UseFormReturn<WizardFormData>;
  onApply: (arv: number) => void;
}

type RadiusOption = 0.5 | 1 | 2 | 3 | 5;
type DateRangeOption = 180 | 270 | 365;

const NON_DISCLOSURE_STATES: Record<string, string> = {
  AK: "Alaska", ID: "Idaho", IN: "Indiana", KS: "Kansas", LA: "Louisiana",
  ME: "Maine", MS: "Mississippi", MO: "Missouri", MT: "Montana", NM: "New Mexico",
  ND: "North Dakota", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
  UT: "Utah", WY: "Wyoming",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "N/A";
  if (dateStr.toLowerCase() === "pending") return "Pending";
  try {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) return `${months[parseInt(usMatch[1], 10) - 1]} ${parseInt(usMatch[2], 10)}, ${usMatch[3]}`;
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${months[parseInt(isoMatch[2], 10) - 1]} ${parseInt(isoMatch[3], 10)}, ${isoMatch[1]}`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function extractApiError(error: any, fallback: string): string {
  try {
    const jsonMatch = error?.message?.match(/\d+:\s*(.+)/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      if (data.error) return data.error;
    }
  } catch {}
  return fallback;
}

function compKey(c: { address?: string; zipCode?: string }): string {
  const addr = (c.address || "").trim().toLowerCase().replace(/\s+/g, " ");
  const zip = (c.zipCode || "").replace(/\D/g, "").slice(0, 5);
  return `${addr}|${zip}`;
}

function computeSmartSelection(
  comps: SoldPropertyComp[],
  subjectBedrooms: number,
  subjectBathrooms: number,
  subjectSqft: number = 1500,
  preserveIndices: Set<number> = new Set(),
): Set<number> {
  const selected = new Set<number>(preserveIndices);
  if (selected.size >= 3) return selected;

  const allPrices = comps.map((x) => x.pricePerSqft).filter((p) => p > 0).sort((a, b) => a - b);
  const medianPpsf = allPrices.length > 0 ? allPrices[Math.floor(allPrices.length / 2)] : null;
  const extremeOutlierThreshold = medianPpsf ? medianPpsf * 3 : Infinity;
  const cleanSorted = comps
    .map((comp, i) => ({ comp, i }))
    .filter(({ comp, i }) => {
      if (selected.has(i)) return false;
      const beds = comp.bedrooms;
      if (typeof beds === "number" && (beds > 10 || beds < 0)) return false;
      const baths = comp.bathrooms;
      return (
        !comp.distressedFlag &&
        !(!comp.saleDate || comp.saleDate === "" || comp.saleDate === "N/A" || comp.saleDate === "Pending") &&
        Math.abs((beds ?? subjectBedrooms) - subjectBedrooms) <= 1 &&
        Math.abs(Math.round(baths ?? subjectBathrooms) - Math.round(subjectBathrooms)) <= 1
      );
    })
    .sort((a, b) => {
      const med = medianPpsf || 150;
      const subSqft = subjectSqft || 1500;
      const dA = a.comp.distanceFromSubject ?? Infinity;
      const dB = b.comp.distanceFromSubject ?? Infinity;
      const pA = a.comp.pricePerSqft ?? 0;
      const pB = b.comp.pricePerSqft ?? 0;
      const bA = Math.round(a.comp.bathrooms ?? subjectBathrooms) === Math.round(subjectBathrooms) ? 1.2 : 1.0;
      const bB = Math.round(b.comp.bathrooms ?? subjectBathrooms) === Math.round(subjectBathrooms) ? 1.2 : 1.0;
      const bdA = (a.comp.bedrooms ?? subjectBedrooms) === subjectBedrooms ? 1.2 : 1.0;
      const bdB = (b.comp.bedrooms ?? subjectBedrooms) === subjectBedrooms ? 1.2 : 1.0;
      const sqA = 1 - Math.abs((a.comp.sqft ?? subSqft) - subSqft) / subSqft;
      const sqB = 1 - Math.abs((b.comp.sqft ?? subSqft) - subSqft) / subSqft;
      const sA = dA > 0 ? (1 / dA) * (pA / med) * bA * bdA * sqA : Infinity;
      const sB = dB > 0 ? (1 / dB) * (pB / med) * bB * bdB * sqB : Infinity;
      return sB - sA;
    });

  const filteredSorted = cleanSorted.filter(({ comp }) => comp.pricePerSqft <= extremeOutlierThreshold);
  for (const { comp, i } of filteredSorted) {
    if (selected.size >= 3) break;
    if (!(comp as any).cityMismatch) selected.add(i);
  }
  if (selected.size < 3) {
    for (const { i } of filteredSorted) {
      if (selected.size >= 3) break;
      selected.add(i);
    }
  }
  return selected;
}

export default function ArvHelperOverlay({ isOpen, onClose, form, onApply }: ArvHelperOverlayProps) {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();

  const city = form.watch("city") || "";
  const state = form.watch("state") || "";
  const zipCode = form.watch("zipCode") || "";
  const address = form.watch("address") || "";
  const bedrooms = form.watch("bedrooms") || 3;
  const bathrooms = form.watch("bathrooms") || 2;
  const sqft = form.watch("sqft") || 1500;
  const yearBuilt = form.watch("yearBuilt");
  const lotSize = form.watch("lotSize");
  const propertyType = form.watch("propertyType") || "";
  const propertyLatitude = form.watch("propertyLatitude");
  const propertyLongitude = form.watch("propertyLongitude");

  const stateCode = state.trim().toUpperCase().slice(0, 2);
  const isNonDisclosure = !!NON_DISCLOSURE_STATES[stateCode];
  const stateName = NON_DISCLOSURE_STATES[stateCode] || state;
  const companyName = user?.reportCompanyName || "your company";
  const propStreamUrl = "https://trial.propstreampro.com/redatametrix";

  const [repairBedrooms, setRepairBedrooms] = useState<number | null>(null);
  const [repairBathrooms, setRepairBathrooms] = useState<number | null>(null);
  const [repairSqft, setRepairSqft] = useState<number | null>(null);
  const [showRepairPanel, setShowRepairPanel] = useState(false);
  const [repairBedroomsInput, setRepairBedroomsInput] = useState("");
  const [repairBathroomsInput, setRepairBathroomsInput] = useState("");
  const [repairSqftInput, setRepairSqftInput] = useState("");
  const effectiveBedrooms = repairBedrooms ?? bedrooms;
  const effectiveBathrooms = repairBathrooms ?? bathrooms;
  const effectiveSqft = repairSqft ?? sqft;
  const hasRepairOverride =
    repairBedrooms !== null || repairBathrooms !== null || repairSqft !== null;

  const [isSearchingComps, setIsSearchingComps] = useState(false);
  const [compsData, setCompsData] = useState<CompsSearchResponse | null>(null);
  const [radiusWasExpanded, setRadiusWasExpanded] = useState(false);
  const [actualRadiusUsed, setActualRadiusUsed] = useState<number | null>(null);
  const [dateRangeWasExpanded, setDateRangeWasExpanded] = useState(false);
  const [actualDateRangeUsed, setActualDateRangeUsed] = useState<number | null>(null);
  const [expandedCompIndex, setExpandedCompIndex] = useState<number | null>(null);
  const [compsError, setCompsError] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<RadiusOption>(0.5);
  const [searchDateRange, setSearchDateRange] = useState<DateRangeOption>(180);

  const [selectedCompIndices, setSelectedCompIndices] = useState<Set<number>>(new Set());
  const lockedSelectionRef = useRef<Set<string> | null>(null);
  const previousCompsDataRef = useRef<CompsSearchResponse | null>(null);
  const [showArvQuotaModal, setShowArvQuotaModal] = useState(false);

  const [showAddCompForm, setShowAddCompForm] = useState(false);
  const [customCompUrl, setCustomCompUrl] = useState("");
  const [isAddingCustomComp, setIsAddingCustomComp] = useState(false);
  const [customCompError, setCustomCompError] = useState<string | null>(null);

  const [manualComp, setManualComp] = useState({
    address: "", city: "", state: "", zipCode: "",
    bedrooms: "", bathrooms: "", sqft: "", salePrice: "", saleDate: "",
  });
  const [manualCompError, setManualCompError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  const [editingCompIndex, setEditingCompIndex] = useState<number | null>(null);
  const [editFormValues, setEditFormValues] = useState<{
    salePrice: string;
    propertyType: string;
  }>({ salePrice: "", propertyType: "" });

  const wasOpenRef = useRef(false);

  // Reset all state on open transition so the overlay re-hydrates fresh each
  // time it's opened. Mirrors the WholesaleOverlay pattern.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setRepairBedrooms(null);
      setRepairBathrooms(null);
      setRepairSqft(null);
      setShowRepairPanel(false);
      setRepairBedroomsInput("");
      setRepairBathroomsInput("");
      setRepairSqftInput("");
      setIsSearchingComps(false);
      setCompsData(null);
      setRadiusWasExpanded(false);
      setActualRadiusUsed(null);
      setDateRangeWasExpanded(false);
      setActualDateRangeUsed(null);
      setExpandedCompIndex(null);
      setCompsError(null);
      setSearchRadius(0.5);
      setSearchDateRange(180);
      setSelectedCompIndices(new Set());
      lockedSelectionRef.current = null;
      previousCompsDataRef.current = null;
      setShowArvQuotaModal(false);
      setShowAddCompForm(false);
      setCustomCompUrl("");
      setIsAddingCustomComp(false);
      setCustomCompError(null);
      setManualComp({
        address: "", city: "", state: "", zipCode: "",
        bedrooms: "", bathrooms: "", sqft: "", salePrice: "", saleDate: "",
      });
      setManualCompError(null);
      setShowManualForm(false);
      setEditingCompIndex(null);
      setEditFormValues({ salePrice: "", propertyType: "" });
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Sorted comps: selected first (by distance), then unselected (by distance)
  const sortedCompsWithIndices = useMemo(() => {
    if (!compsData || !compsData.comps.length) return [];
    const withIndices = compsData.comps.map((comp, originalIndex) => ({ comp, originalIndex }));
    return withIndices.sort((a, b) => {
      const aSel = selectedCompIndices.has(a.originalIndex);
      const bSel = selectedCompIndices.has(b.originalIndex);
      if (aSel !== bSel) return aSel ? -1 : 1;
      const aDist = a.comp.distanceFromSubject ?? 999;
      const bDist = b.comp.distanceFromSubject ?? 999;
      return aDist - bDist;
    });
  }, [compsData, selectedCompIndices]);

  const calculateSelectedArv = () => {
    if (!compsData || compsData.comps.length === 0)
      return { arv: null, avgPricePerSqft: null, count: 0 };
    const selectedComps = compsData.comps.filter((_, i) => selectedCompIndices.has(i));
    if (selectedComps.length < 2) {
      return { arv: null, avgPricePerSqft: null, count: selectedComps.length };
    }
    const totalSalePrice = selectedComps.reduce((sum, c) => sum + c.salePrice, 0);
    const totalSqft = selectedComps.reduce((sum, c) => sum + c.sqft, 0);
    const avgPricePerSqft = Math.round(totalSalePrice / totalSqft);
    const calculatedArv = Math.round(avgPricePerSqft * effectiveSqft);
    return { arv: calculatedArv, avgPricePerSqft, count: selectedComps.length };
  };

  const selectedArvData = calculateSelectedArv();

  const wideRangeWarning = useMemo(() => {
    if (!compsData || selectedCompIndices.size < 2) return null;
    const selectedComps = compsData.comps.filter((_, i) => selectedCompIndices.has(i));
    const unselectedComps = compsData.comps.filter((_, i) => !selectedCompIndices.has(i));
    const selectedPrices = selectedComps.map((c) => c.pricePerSqft).filter((p) => p > 0);
    if (selectedPrices.length < 2) return null;
    const minSelected = Math.min(...selectedPrices);
    const maxSelected = Math.max(...selectedPrices);
    if (minSelected <= 0) return null;
    const selectedSpread = (maxSelected - minSelected) / minSelected;
    let selectedAboveUnselected = false;
    if (unselectedComps.length > 0) {
      const unselectedPrices = unselectedComps.map((c) => c.pricePerSqft).filter((p) => p > 0);
      if (unselectedPrices.length > 0) {
        const avgSelected = selectedPrices.reduce((a, b) => a + b, 0) / selectedPrices.length;
        const avgUnselected = unselectedPrices.reduce((a, b) => a + b, 0) / unselectedPrices.length;
        if (avgUnselected > 0) {
          selectedAboveUnselected = (avgSelected - avgUnselected) / avgUnselected > 0.4;
        }
      }
    }
    if (selectedSpread > 0.4 || selectedAboveUnselected) {
      return "This area shows a significant price gap between selected and unselected comps below. This may indicate a mix of distressed and renovated sales. If you are analyzing a renovation project, confirm your selected comps reflect the repaired condition. If not, deselect and review.";
    }
    return null;
  }, [selectedCompIndices, compsData]);

  const searchCompsWithOverride = async (overrideBeds: number, overrideBaths: number, overrideSqft: number) => {
    if (!city || !state) return;
    setIsSearchingComps(true);
    setCompsError(null);
    setCompsData(null);
    setRadiusWasExpanded(false);
    setActualRadiusUsed(null);
    setDateRangeWasExpanded(false);
    setActualDateRangeUsed(null);
    try {
      const response = await apiRequest("POST", "/api/comps/search", {
        address, city, state, zipCode,
        bedrooms: overrideBeds, bathrooms: overrideBaths, sqft: overrideSqft,
        propertyType,
        subjectLat: propertyLatitude, subjectLng: propertyLongitude,
        radiusMiles: searchRadius, saleDateRangeDays: searchDateRange,
      });
      const data = await response.json();
      setCompsData(data);
      setRadiusWasExpanded(data.radiusExpanded ?? false);
      setActualRadiusUsed(data.actualRadiusMiles ?? null);
      setDateRangeWasExpanded(data.dateRangeExpanded ?? false);
      setActualDateRangeUsed(data.actualDateRangeDays ?? null);
      if (data.dateRangeExpanded && data.actualDateRangeDays) {
        setSearchDateRange(data.actualDateRangeDays);
      }
      if (data.comps && data.comps.length > 0) {
        lockedSelectionRef.current = null;
        setSelectedCompIndices(computeSmartSelection(data.comps, overrideBeds, overrideBaths, overrideSqft));
      }
    } catch (error: any) {
      if (error?.message?.includes("ARV_QUOTA_EXCEEDED")) {
        setShowArvQuotaModal(true);
      } else {
        setCompsError(extractApiError(error, "Failed to search for comparable sales"));
      }
    } finally {
      setIsSearchingComps(false);
    }
  };

  const searchComps = async () => {
    if (!city || !state) {
      toast({
        title: "Missing Location",
        description: "City and state are required to search for comparables.",
        variant: "destructive",
      });
      return;
    }
    setIsSearchingComps(true);
    setCompsError(null);
    setCompsData(null);
    setRadiusWasExpanded(false);
    setActualRadiusUsed(null);
    setDateRangeWasExpanded(false);
    setActualDateRangeUsed(null);
    try {
      const response = await apiRequest("POST", "/api/comps/search", {
        address, city, state, zipCode,
        bedrooms: effectiveBedrooms, bathrooms: effectiveBathrooms, sqft: effectiveSqft, propertyType,
        subjectLat: propertyLatitude, subjectLng: propertyLongitude,
        radiusMiles: searchRadius, saleDateRangeDays: searchDateRange,
      });
      const data = await response.json();
      setCompsData(data);
      setRadiusWasExpanded(data.radiusExpanded ?? false);
      setActualRadiusUsed(data.actualRadiusMiles ?? null);
      setDateRangeWasExpanded(data.dateRangeExpanded ?? false);
      setActualDateRangeUsed(data.actualDateRangeDays ?? null);
      if (data.dateRangeExpanded && data.actualDateRangeDays) {
        setSearchDateRange(data.actualDateRangeDays);
      }
      if (data.comps && data.comps.length > 0) {
        lockedSelectionRef.current = null;
        setSelectedCompIndices(
          computeSmartSelection(data.comps, effectiveBedrooms, effectiveBathrooms, effectiveSqft),
        );
      }
    } catch (error: any) {
      if (error?.message?.includes("ARV_QUOTA_EXCEEDED")) {
        setShowArvQuotaModal(true);
      } else {
        setCompsError(extractApiError(error, "Failed to search for comparable sales"));
      }
    } finally {
      setIsSearchingComps(false);
    }
  };

  const searchCompsWithOptions = async (radius: RadiusOption, dateRange: DateRangeOption) => {
    if (!city || !state) return;
    previousCompsDataRef.current = compsData;
    setIsSearchingComps(true);
    setCompsError(null);
    setCompsData(null);
    setRadiusWasExpanded(false);
    setActualRadiusUsed(null);
    setDateRangeWasExpanded(false);
    setActualDateRangeUsed(null);
    try {
      const response = await apiRequest("POST", "/api/comps/search", {
        address, city, state, zipCode,
        bedrooms: effectiveBedrooms, bathrooms: effectiveBathrooms, sqft: effectiveSqft, propertyType,
        subjectLat: propertyLatitude, subjectLng: propertyLongitude,
        radiusMiles: radius, saleDateRangeDays: dateRange,
      });
      const data = await response.json();
      setCompsData(data);
      setRadiusWasExpanded(data.radiusExpanded ?? false);
      setActualRadiusUsed(data.actualRadiusMiles ?? null);
      setDateRangeWasExpanded(data.dateRangeExpanded ?? false);
      setActualDateRangeUsed(data.actualDateRangeDays ?? null);
      if (data.dateRangeExpanded && data.actualDateRangeDays) {
        setSearchDateRange(data.actualDateRangeDays);
      }
      if (data.comps && data.comps.length > 0) {
        if (lockedSelectionRef.current !== null && lockedSelectionRef.current.size >= 1) {
          const newIndices = new Set<number>();
          (data.comps as SoldPropertyComp[]).forEach((c, i) => {
            if (lockedSelectionRef.current!.has(compKey(c))) newIndices.add(i);
          });
          if (newIndices.size >= 3) {
            setSelectedCompIndices(newIndices);
          } else {
            const lockedKeys = lockedSelectionRef.current!;
            const missingComps = (previousCompsDataRef.current?.comps ?? []).filter(
              (c) =>
                lockedKeys.has(compKey(c)) &&
                !data.comps.some((nc: SoldPropertyComp) => compKey(nc) === compKey(c)),
            );
            const mergedComps = [...data.comps, ...missingComps];
            const mergedIndices = new Set<number>();
            mergedComps.forEach((c, i) => {
              if (lockedKeys.has(compKey(c as SoldPropertyComp))) mergedIndices.add(i);
            });
            if (mergedIndices.size >= 3) {
              setCompsData({ ...data, comps: mergedComps });
              const trimmedIndices = new Set<number>(Array.from(mergedIndices).slice(0, 3));
              setSelectedCompIndices(trimmedIndices);
            } else if (mergedIndices.size > 0) {
              setCompsData({ ...data, comps: mergedComps });
              setSelectedCompIndices(
                computeSmartSelection(mergedComps, effectiveBedrooms, effectiveBathrooms, effectiveSqft, mergedIndices),
              );
            } else {
              setSelectedCompIndices(computeSmartSelection(data.comps, effectiveBedrooms, effectiveBathrooms));
            }
          }
        } else {
          setSelectedCompIndices(computeSmartSelection(data.comps, effectiveBedrooms, effectiveBathrooms));
        }
      }
    } catch (error: any) {
      if (error?.message?.includes("ARV_QUOTA_EXCEEDED")) {
        setShowArvQuotaModal(true);
      } else {
        setCompsError(extractApiError(error, "Failed to search for comparable sales"));
      }
    } finally {
      setIsSearchingComps(false);
    }
  };

  const addCustomComp = async () => {
    if (!customCompUrl.trim()) { setCustomCompError("Please enter a Zillow URL"); return; }
    if (!customCompUrl.includes("zillow.com")) { setCustomCompError("Please enter a valid Zillow URL"); return; }
    setIsAddingCustomComp(true);
    setCustomCompError(null);
    try {
      const response = await apiRequest("POST", "/api/comps/fetch-from-url", {
        url: customCompUrl,
        subjectLat: propertyLatitude,
        subjectLng: propertyLongitude,
      });
      const data = await response.json();
      if (data.comp) {
        const newComp = data.comp;
        const newCompAddress = newComp.address.toLowerCase().trim();
        const existingComps = compsData?.comps || [];
        const duplicateIndices: number[] = [];
        existingComps.forEach((comp, index) => {
          if (comp.address.toLowerCase().trim() === newCompAddress) duplicateIndices.push(index);
        });
        setCompsData((prev) => {
          if (!prev) return { comps: [newComp], suggestedArv: null };
          return { ...prev, comps: [newComp, ...prev.comps] };
        });
        setSelectedCompIndices((prev) => {
          const newSet = new Set<number>();
          newSet.add(0);
          prev.forEach((oldIndex) => {
            const shiftedIndex = oldIndex + 1;
            if (!duplicateIndices.includes(oldIndex)) newSet.add(shiftedIndex);
          });
          return newSet;
        });
        setCustomCompUrl("");
        toast({
          title: "Comp Added",
          description:
            duplicateIndices.length > 0
              ? `${newComp.address} added. Older sale${duplicateIndices.length > 1 ? "s" : ""} for this address deselected.`
              : `${newComp.address} has been added to your comps list.`,
        });
      }
    } catch (error: any) {
      setCustomCompError(extractApiError(error, "Failed to fetch property data"));
    } finally {
      setIsAddingCustomComp(false);
    }
  };

  const addManualComp = () => {
    setManualCompError(null);
    const trimmed = {
      address: manualComp.address.trim(),
      city: manualComp.city.trim(),
      state: manualComp.state.trim().toUpperCase(),
      zipCode: manualComp.zipCode.trim(),
      bedrooms: manualComp.bedrooms.trim(),
      bathrooms: manualComp.bathrooms.trim(),
      sqft: manualComp.sqft.replace(/[^0-9]/g, ""),
      salePrice: manualComp.salePrice.replace(/[^0-9.]/g, ""),
      saleDate: manualComp.saleDate.trim(),
    };
    if (
      !trimmed.address || !trimmed.city || !trimmed.state || !trimmed.zipCode ||
      !trimmed.bedrooms || !trimmed.bathrooms || !trimmed.sqft ||
      !trimmed.salePrice || !trimmed.saleDate
    ) {
      setManualCompError("Please fill in all fields.");
      return;
    }
    const sqftN = parseInt(trimmed.sqft, 10);
    const salePrice = parseFloat(trimmed.salePrice);
    const beds = parseFloat(trimmed.bedrooms);
    const baths = parseFloat(trimmed.bathrooms);
    if (!Number.isFinite(sqftN) || sqftN <= 0) { setManualCompError("Sqft must be a positive number."); return; }
    if (!Number.isFinite(salePrice) || salePrice <= 0) { setManualCompError("Sale price must be a positive number."); return; }
    if (!Number.isFinite(beds) || !Number.isFinite(baths)) { setManualCompError("Beds and baths must be numbers."); return; }
    const newComp: SoldPropertyComp = {
      address: trimmed.address,
      city: trimmed.city,
      state: trimmed.state,
      zipCode: trimmed.zipCode,
      salePrice,
      saleDate: trimmed.saleDate,
      bedrooms: beds,
      bathrooms: baths,
      sqft: sqftN,
      pricePerSqft: Math.round(salePrice / sqftN),
      isManuallyAdded: true,
    };
    const newCompAddress = newComp.address.toLowerCase().trim();
    const existingComps = compsData?.comps || [];
    const duplicateIndices: number[] = [];
    existingComps.forEach((comp, index) => {
      if (comp.address.toLowerCase().trim() === newCompAddress) duplicateIndices.push(index);
    });
    setCompsData((prev) => {
      if (!prev) return { comps: [newComp], suggestedArv: null };
      return { ...prev, comps: [newComp, ...prev.comps] };
    });
    setSelectedCompIndices((prev) => {
      const newSet = new Set<number>();
      newSet.add(0);
      prev.forEach((oldIndex) => {
        const shiftedIndex = oldIndex + 1;
        if (!duplicateIndices.includes(oldIndex)) newSet.add(shiftedIndex);
      });
      return newSet;
    });
    setManualComp({
      address: "", city: "", state: "", zipCode: "",
      bedrooms: "", bathrooms: "", sqft: "", salePrice: "", saleDate: "",
    });
    setManualCompError(null);
    toast({
      title: "Comp Added",
      description:
        duplicateIndices.length > 0
          ? `${newComp.address} added. Older sale${duplicateIndices.length > 1 ? "s" : ""} for this address deselected.`
          : `${newComp.address} has been added to your comps list.`,
    });
  };

  const openEditDialog = (index: number) => {
    if (!compsData) return;
    const comp = compsData.comps[index];
    setEditFormValues({ salePrice: comp.salePrice.toString(), propertyType: comp.propertyType || "" });
    setEditingCompIndex(index);
  };

  const saveCompEdit = () => {
    if (editingCompIndex === null || !compsData) return;
    const newPrice = parseFloat(editFormValues.salePrice.replace(/[^0-9.]/g, ""));
    if (isNaN(newPrice) || newPrice <= 0) {
      toast({ title: "Invalid Price", description: "Please enter a valid price.", variant: "destructive" });
      return;
    }
    const comp = compsData.comps[editingCompIndex];
    const compSqft = comp.sqft && comp.sqft > 0 ? comp.sqft : 1;
    const newPricePerSqft = Math.round(newPrice / compSqft);
    setCompsData((prev) => {
      if (!prev) return prev;
      const updatedComps = [...prev.comps];
      updatedComps[editingCompIndex] = {
        ...updatedComps[editingCompIndex],
        salePrice: newPrice,
        pricePerSqft: newPricePerSqft,
        propertyType: editFormValues.propertyType || updatedComps[editingCompIndex].propertyType,
      };
      return { ...prev, comps: updatedComps };
    });
    toast({ title: "Comp Updated", description: `${comp.address} has been updated.` });
    setEditingCompIndex(null);
  };

  const toggleCompSelected = (index: number) => {
    setSelectedCompIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  };

  const handleApply = () => {
    if (selectedArvData.arv) {
      onApply(selectedArvData.arv);
      toast({
        title: "ARV Applied",
        description: `Est. Market Value set to ${formatCurrency(selectedArvData.arv)}`,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  const effectiveRadius =
    radiusWasExpanded && actualRadiusUsed !== null ? actualRadiusUsed : searchRadius;
  const effectiveDateRange =
    dateRangeWasExpanded && actualDateRangeUsed !== null ? actualDateRangeUsed : searchDateRange;

  return (
    <div
      className="mobile-overlay fixed inset-0 bg-background z-[10001] flex flex-col"
      style={{ height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-label="ARV Helper"
      data-testid="overlay-arv-helper"
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
        <img src={logoImg} alt="RE Data Metrix" className="h-10 w-10 shrink-0" />
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <Search className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-base font-semibold truncate">ARV Helper</h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close"
          data-testid="button-arv-helper-overlay-close"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-3 py-3 space-y-3 pb-40">
          {/* Beta notice */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            This ARV calculator is in beta. We are working to refine it. Thank you for your patience and understanding.
          </div>

          {/* Subject Property */}
          <div className="rounded-md border border-border">
            <CollapsibleSection title="Subject Property" defaultOpen={true}>
              <div className="space-y-3">
                {address ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="font-medium">
                        {address}, {city}, {state} {zipCode}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground pl-6">
                      {effectiveBedrooms && effectiveBathrooms && (
                        <span className="flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          {effectiveBedrooms}/{effectiveBathrooms}
                          {(repairBedrooms !== null || repairBathrooms !== null) && (
                            <span className="text-primary font-medium">(modified)</span>
                          )}
                        </span>
                      )}
                      {effectiveSqft && (
                        <span>
                          {effectiveSqft.toLocaleString()} sqft
                          {repairSqft !== null && (
                            <span className="text-primary font-medium ml-1">(modified)</span>
                          )}
                        </span>
                      )}
                      {yearBuilt && <span>{yearBuilt}</span>}
                      {lotSize && <span>{lotSize.toLocaleString()} sqft lot</span>}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const zillowAddress = `${address} ${city} ${state} ${zipCode}`
                          .replace(/\s+/g, "-")
                          .replace(/[,#]/g, "");
                        window.open(
                          `https://www.zillow.com/homes/${encodeURIComponent(zillowAddress)}_rb/`,
                          "_blank",
                        );
                      }}
                      data-testid="button-view-subject-zillow-mobile"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Subject on Zillow
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add a property address on the previous step to search comps.
                  </p>
                )}

                {/* Repair override */}
                <div>
                  <button
                    type="button"
                    className="text-xs font-bold text-foreground hover:text-primary underline underline-offset-2 flex items-center gap-1"
                    onClick={() => {
                      if (!showRepairPanel) {
                        setRepairBedroomsInput(String(repairBedrooms ?? bedrooms));
                        setRepairBathroomsInput(String(repairBathrooms ?? bathrooms));
                        setRepairSqftInput(String(repairSqft ?? sqft));
                      }
                      setShowRepairPanel(!showRepairPanel);
                    }}
                    data-testid="button-toggle-repair-panel-mobile"
                  >
                    <Pencil className="h-3 w-3" />
                    {showRepairPanel ? "Hide" : "Changing beds, baths, or sqft?"}
                  </button>
                  {showRepairPanel && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-md border border-border space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Beds</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={repairBedroomsInput}
                            onChange={(e) => setRepairBedroomsInput(e.target.value)}
                            data-testid="input-repair-beds-mobile"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Baths</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={repairBathroomsInput}
                            onChange={(e) => setRepairBathroomsInput(e.target.value)}
                            data-testid="input-repair-baths-mobile"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Sqft</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={repairSqftInput}
                            onChange={(e) => setRepairSqftInput(e.target.value)}
                            data-testid="input-repair-sqft-mobile"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const b = parseFloat(repairBedroomsInput);
                            const ba = parseFloat(repairBathroomsInput);
                            const s = parseFloat(repairSqftInput);
                            const newBeds = (!isNaN(b) && b > 0) ? b : null;
                            const newBaths = (!isNaN(ba) && ba > 0) ? ba : null;
                            const newSqft = (!isNaN(s) && s > 0) ? s : null;
                            if (newBeds !== null) setRepairBedrooms(newBeds);
                            if (newBaths !== null) setRepairBathrooms(newBaths);
                            if (newSqft !== null) setRepairSqft(newSqft);
                            setShowRepairPanel(false);
                            const appliedBeds = newBeds ?? bedrooms;
                            const appliedBaths = newBaths ?? bathrooms;
                            const appliedSqft = newSqft ?? sqft;
                            setTimeout(() => searchCompsWithOverride(appliedBeds, appliedBaths, appliedSqft), 0);
                          }}
                          data-testid="button-apply-repair-mobile"
                        >
                          Apply
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRepairBedrooms(null);
                            setRepairBathrooms(null);
                            setRepairSqft(null);
                            setRepairBedroomsInput("");
                            setRepairBathroomsInput("");
                            setRepairSqftInput("");
                            setShowRepairPanel(false);
                          }}
                          data-testid="button-reset-repair-mobile"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Search Settings */}
          <div className="rounded-md border border-border">
            <CollapsibleSection title="Search Settings" defaultOpen={true}>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Radius</Label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {([0.5, 1, 2, 3, 5] as RadiusOption[]).map((r) => (
                      <Button
                        key={r}
                        type="button"
                        size="sm"
                        variant={effectiveRadius === r ? "default" : "outline"}
                        onClick={() => {
                          if (r !== effectiveRadius) {
                            lockedSelectionRef.current =
                              selectedCompIndices.size >= 1
                                ? new Set(
                                    Array.from(selectedCompIndices)
                                      .map((i) => compsData?.comps[i])
                                      .filter(Boolean)
                                      .map((c) => compKey(c as SoldPropertyComp)),
                                  )
                                : null;
                            setSearchRadius(r);
                            setSearchDateRange(180);
                            if (compsData) setTimeout(() => searchCompsWithOptions(r, 180), 0);
                          }
                        }}
                        disabled={isSearchingComps}
                        data-testid={`button-radius-${r}-mobile`}
                      >
                        {r === 0.5 ? "½" : r} mi
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Sales window</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([180, 270, 365] as DateRangeOption[]).map((days) => (
                      <Button
                        key={days}
                        type="button"
                        size="sm"
                        variant={effectiveDateRange === days ? "default" : "outline"}
                        onClick={() => {
                          if (days !== searchDateRange) {
                            lockedSelectionRef.current =
                              selectedCompIndices.size >= 1
                                ? new Set(
                                    Array.from(selectedCompIndices)
                                      .map((i) => compsData?.comps[i])
                                      .filter(Boolean)
                                      .map((c) => compKey(c as SoldPropertyComp)),
                                  )
                                : null;
                            setSearchDateRange(days);
                            if (compsData) setTimeout(() => searchCompsWithOptions(searchRadius, days), 0);
                          }
                        }}
                        disabled={isSearchingComps}
                        data-testid={`button-date-range-${days}-mobile`}
                      >
                        {days === 180 ? "6 mo" : days === 270 ? "9 mo" : "12 mo"}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={searchComps}
                    disabled={isSearchingComps || !city || !state}
                    data-testid="button-search-comps-mobile"
                  >
                    {isSearchingComps ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-1.5" />
                        Search Comps
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddCompForm((v) => !v)}
                    data-testid="button-toggle-add-comp-mobile"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Comp
                  </Button>
                </div>

                {(radiusWasExpanded || dateRangeWasExpanded) && (() => {
                  const fmtRadius = (r: number) => (r === 1 ? "1 mile" : `${r} miles`);
                  const fmtDate = (d: number) =>
                    d === 365 ? "12 months" : d === 270 ? "9 months" : `${d} days`;
                  const parts: string[] = [];
                  if (radiusWasExpanded && actualRadiusUsed !== null) parts.push(`radius to ${fmtRadius(actualRadiusUsed)}`);
                  if (dateRangeWasExpanded && actualDateRangeUsed !== null) parts.push(`date range to ${fmtDate(actualDateRangeUsed)}`);
                  if (parts.length === 0) return null;
                  const joined = parts.length === 1 ? parts[0] : `${parts[0]} and ${parts[1]}`;
                  return (
                    <p className="text-xs text-muted-foreground" data-testid="text-auto-expanded-mobile">
                      Expanded {joined} to find more comps.
                    </p>
                  );
                })()}

                {compsError && (
                  <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">{compsError}</div>
                )}
              </div>
            </CollapsibleSection>
          </div>

          {/* Add Comp Form */}
          {showAddCompForm && (
            <div className="rounded-md border border-border p-3 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Add Comp</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowAddCompForm(false);
                    setCustomCompUrl("");
                    setCustomCompError(null);
                    setManualCompError(null);
                    setShowManualForm(false);
                  }}
                  data-testid="button-close-add-comp-mobile"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Add from Zillow URL</Label>
                <Input
                  type="url"
                  placeholder="https://www.zillow.com/homedetails/..."
                  value={customCompUrl}
                  onChange={(e) => setCustomCompUrl(e.target.value)}
                  data-testid="input-custom-comp-url-mobile"
                />
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  onClick={addCustomComp}
                  disabled={isAddingCustomComp || !customCompUrl.trim()}
                  data-testid="button-add-comp-submit-mobile"
                >
                  {isAddingCustomComp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add from URL"}
                </Button>
                {customCompError && <p className="text-xs text-destructive">{customCompError}</p>}
              </div>

              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">Or enter manually</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setShowManualForm((v) => !v);
                  setManualCompError(null);
                }}
                data-testid="button-toggle-manual-form-mobile"
              >
                {showManualForm ? "Cancel Manual Entry" : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Enter Comp Manually
                  </>
                )}
              </Button>

              {showManualForm && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Street Address</Label>
                    <Input
                      placeholder="123 Main St"
                      value={manualComp.address}
                      onChange={(e) => setManualComp({ ...manualComp, address: e.target.value })}
                      data-testid="input-manual-comp-address-mobile"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">City</Label>
                      <Input
                        value={manualComp.city}
                        onChange={(e) => setManualComp({ ...manualComp, city: e.target.value })}
                        data-testid="input-manual-comp-city-mobile"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">State</Label>
                        <Input
                          maxLength={2}
                          value={manualComp.state}
                          onChange={(e) => setManualComp({ ...manualComp, state: e.target.value.toUpperCase() })}
                          data-testid="input-manual-comp-state-mobile"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Zip</Label>
                        <Input
                          value={manualComp.zipCode}
                          onChange={(e) => setManualComp({ ...manualComp, zipCode: e.target.value })}
                          data-testid="input-manual-comp-zip-mobile"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Beds</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={manualComp.bedrooms}
                        onChange={(e) => setManualComp({ ...manualComp, bedrooms: e.target.value })}
                        data-testid="input-manual-comp-beds-mobile"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Baths</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={manualComp.bathrooms}
                        onChange={(e) => setManualComp({ ...manualComp, bathrooms: e.target.value })}
                        data-testid="input-manual-comp-baths-mobile"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sqft</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={manualComp.sqft}
                        onChange={(e) => setManualComp({ ...manualComp, sqft: e.target.value })}
                        data-testid="input-manual-comp-sqft-mobile"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Sale Price</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={manualComp.salePrice}
                          onChange={(e) =>
                            setManualComp({ ...manualComp, salePrice: e.target.value.replace(/[^0-9.]/g, "") })
                          }
                          className="pl-7"
                          data-testid="input-manual-comp-price-mobile"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sale Date</Label>
                      <Input
                        type="date"
                        value={manualComp.saleDate}
                        onChange={(e) => setManualComp({ ...manualComp, saleDate: e.target.value })}
                        data-testid="input-manual-comp-date-mobile"
                      />
                    </div>
                  </div>
                  {manualCompError && <p className="text-xs text-destructive">{manualCompError}</p>}
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={addManualComp}
                    data-testid="button-add-manual-comp-submit-mobile"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Manual Comp
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Non-disclosure messaging */}
          {compsData && isNonDisclosure && !isSearchingComps && (() => {
            const count = compsData.comps.length;
            if (count <= 1) {
              return (
                <div className="rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">
                        {stateName} is a non-disclosure state
                      </p>
                      <p>
                        Sale prices are not publicly recorded in {stateName}. This limits both the number of comps available and the accuracy of prices shown, which may significantly affect your ARV estimate.
                      </p>
                      <p>
                        If you have comps from your realtor or MLS, use the <strong>+ Add Comp</strong> button to add them manually. The ARV Helper can still calculate your ARV and generate a branded Comp Report for {companyName}.
                      </p>
                      <p>
                        <strong>PropStream</strong> provides MLS-backed sale prices and off-market property data across all 50 states, including non-disclosure states like {stateName}.{" "}
                        <a href={propStreamUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                          Start your free 7-day trial →
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              );
            } else if (count <= 5) {
              return (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-md px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>{stateName} is a non-disclosure state.</strong> The number of available comps and accuracy of sale prices may be limited.{" "}
                    <a href={propStreamUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                      Start your free 7-day trial →
                    </a>
                  </p>
                </div>
              );
            } else {
              return (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Note: <strong>{stateName} is a non-disclosure state.</strong> Sale prices and comp availability may be limited.{" "}
                    <a href={propStreamUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                      Start your free 7-day trial →
                    </a>
                  </p>
                </div>
              );
            }
          })()}

          {/* Too-few-comps message */}
          {compsData && compsData.comps.length < 3 && !isSearchingComps && (
            <div
              className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2"
              data-testid="text-too-few-comps-message-mobile"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Not enough comparable sales were found in this area. Try expanding the date range or radius above, or add your own comps using + Add Comp.
                {compsData.comps.length > 0 && (
                  <> However, {compsData.comps.length} {compsData.comps.length === 1 ? "property was" : "properties were"} returned below — you may be able to manually select suitable comps.</>
                )}
              </p>
            </div>
          )}

          {/* No auto-select warning */}
          {compsData && compsData.comps.length >= 3 && selectedCompIndices.size === 0 && !isSearchingComps && (
            <div
              className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2"
              data-testid="text-no-auto-select-warning-mobile"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {compsData.comps.length} comparable sales were found but the system could not automatically identify the best matches. Please manually select the comps most similar to your subject property.
              </p>
            </div>
          )}

          {/* Insufficient selected warning */}
          {compsData &&
            compsData.comps.length >= 3 &&
            selectedCompIndices.size > 0 &&
            selectedCompIndices.size < 3 &&
            (compsData.searchStats?.suitableCount ?? 0) < 3 && (
              <div
                className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2"
                data-testid="text-insufficient-comps-warning-mobile"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Only {selectedCompIndices.size} suitable comp{selectedCompIndices.size !== 1 ? "s" : ""} found. Consider expanding your search, or supplement with your own comp research.
                </p>
              </div>
            )}

          {wideRangeWarning && (
            <div
              className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2"
              data-testid="text-wide-range-warning-mobile"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">{wideRangeWarning}</p>
            </div>
          )}

          {hasRepairOverride && compsData && (
            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Results are based on the modified property profile.
              </p>
            </div>
          )}
          {hasRepairOverride && !compsData && (
            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Property profile modified. Tap Search Comps to update results.
              </p>
            </div>
          )}

          {/* Comparable Sales — comp cards */}
          {compsData && compsData.comps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Comparable Sales ({compsData.comps.length})
                </h3>
                <span className="text-xs text-muted-foreground">
                  {selectedCompIndices.size} selected
                </span>
              </div>

              <div className="space-y-2">
                {sortedCompsWithIndices.map(({ comp, originalIndex }) => {
                  const isFlagged = !!(
                    comp.outlierFlag ||
                    comp.distressedFlag ||
                    (comp as any).borderlineFlag ||
                    (comp as any).cityMismatch
                  );
                  const isSelected = selectedCompIndices.has(originalIndex);
                  const isExpanded = expandedCompIndex === originalIndex;
                  return (
                    <Card
                      key={originalIndex}
                      className={`overflow-hidden ${isSelected ? "border-primary" : ""}${isFlagged && !isSelected ? " opacity-90" : ""}`}
                      data-testid={`card-comp-${originalIndex}-mobile`}
                    >
                      <CardContent className="p-0">
                        <div className="flex items-start gap-2 p-3">
                          <div
                            className="pt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleCompSelected(originalIndex)}
                              data-testid={`checkbox-comp-${originalIndex}-mobile`}
                            />
                          </div>
                          <button
                            type="button"
                            className="flex-1 text-left"
                            onClick={() => setExpandedCompIndex(isExpanded ? null : originalIndex)}
                            data-testid={`button-expand-comp-${originalIndex}-mobile`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  {isFlagged && (
                                    comp.outlierFlag || comp.distressedFlag ? (
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                    ) : (comp as any).borderlineFlag ? (
                                      <AlertCircle className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                                    ) : (
                                      <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                                    )
                                  )}
                                  <div className="font-medium text-sm truncate">{comp.address}</div>
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {comp.city}, {comp.state}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-semibold text-primary text-sm">
                                  {formatCurrency(comp.salePrice)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {(comp as any).isPending ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending
                                    </Badge>
                                  ) : (
                                    formatDate(comp.saleDate)
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Home className="h-3 w-3" />
                                {comp.bedrooms}/{comp.bathrooms}
                              </span>
                              <span>{comp.sqft.toLocaleString()} sqft</span>
                              <span>${comp.pricePerSqft}/sqft</span>
                              <span>
                                {comp.distanceFromSubject && comp.distanceFromSubject > 0
                                  ? `${comp.distanceFromSubject.toFixed(1)} mi`
                                  : "—"}
                              </span>
                              <span className="ml-auto flex items-center gap-1 text-foreground">
                                {isExpanded ? (
                                  <>
                                    Hide <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    Details <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </span>
                            </div>
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-border bg-muted/40 p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {comp.yearBuilt && (
                                <div>
                                  <div className="text-muted-foreground">Year Built</div>
                                  <div className="font-medium">{comp.yearBuilt}</div>
                                </div>
                              )}
                              {comp.lotSize && (
                                <div>
                                  <div className="text-muted-foreground">Lot Size</div>
                                  <div className="font-medium">{comp.lotSize.toLocaleString()} sqft</div>
                                </div>
                              )}
                              {comp.propertyType && (
                                <div>
                                  <div className="text-muted-foreground">Type</div>
                                  <div className="font-medium">{comp.propertyType}</div>
                                </div>
                              )}
                              {comp.similarityScore !== undefined && (
                                <div>
                                  <div className="text-muted-foreground">Match Score</div>
                                  <div className="font-medium">{comp.similarityScore}/100</div>
                                </div>
                              )}
                            </div>
                            {(comp.distressedFlag || comp.outlierFlag || (comp as any).borderlineFlag || (comp as any).cityMismatch) && (
                              <div className="space-y-1 text-xs text-amber-800 dark:text-amber-200">
                                {comp.distressedFlag && (
                                  <p>Price is significantly below the area median — likely an as-is or distressed sale. Verify before using.</p>
                                )}
                                {comp.outlierFlag && (
                                  <p>Price is significantly above the area median — likely a renovated sale. Verify before using.</p>
                                )}
                                {(comp as any).borderlineFlag && (
                                  <p>Price may be too low or too high to be a reliable comp. Verify before using.</p>
                                )}
                                {(comp as any).cityMismatch && (
                                  <p>Located in {comp.city}, not {city}. Verify before using.</p>
                                )}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const url = `https://www.zillow.com/homes/${encodeURIComponent(
                                    `${comp.address} ${comp.city} ${comp.state}`
                                      .replace(/\s+/g, "-")
                                      .replace(/[^a-zA-Z0-9-]/g, ""),
                                  )}_rb/`;
                                  window.open(url, "_blank");
                                }}
                                data-testid={`button-comp-zillow-${originalIndex}-mobile`}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Zillow
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(originalIndex);
                                }}
                                data-testid={`button-edit-comp-${originalIndex}-mobile`}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* PropStream callout */}
              {(() => {
                const lowComps = !!compsData && (compsData.searchStats?.suitableCount ?? 0) < 3;
                return (
                  <Card
                    className={lowComps ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-primary/20"}
                    data-testid="card-propstream-permanent-mobile"
                  >
                    <CardContent className="p-3">
                      <p className="text-sm text-foreground flex items-start gap-2">
                        {lowComps && (
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span>
                          Find more comps with PropStream — 160M+ properties nationwide. MLS-backed sales data, off-market properties, and advanced comp tools.{" "}
                          <a
                            href={propStreamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-bold"
                            data-testid="link-propstream-permanent-mobile"
                          >
                            Start your free 7-day trial →
                          </a>
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}
        </div>
      </main>

      {/* Fixed ARV result footer */}
      {compsData && compsData.comps.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 pt-3 pb-4 z-[10002]"
          data-testid="footer-arv-result-mobile"
        >
          <p className="text-xs text-muted-foreground">Suggested ARV</p>
          <p
            className="text-2xl font-bold text-primary"
            data-testid="text-suggested-arv-mobile"
          >
            {selectedArvData.arv ? formatCurrency(selectedArvData.arv) : "N/A"}
          </p>
          <p className="text-xs text-muted-foreground whitespace-nowrap truncate">
            {selectedArvData.count >= 2 && selectedArvData.avgPricePerSqft !== null
              ? `$${selectedArvData.avgPricePerSqft}/sqft × ${effectiveSqft.toLocaleString()} sqft — ${selectedArvData.count} comps`
              : "Select at least 2 comps to calculate ARV"}
          </p>
          <div className="border-t border-border my-2" />
          <div className="flex gap-2">
            <div className="flex-1 [&>button]:w-full">
              <CompReportPdf
                subjectAddress={address}
                subjectCity={city}
                subjectState={state}
                subjectZip={zipCode}
                subjectBeds={bedrooms}
                subjectBaths={bathrooms}
                subjectSqft={sqft}
                subjectYearBuilt={yearBuilt}
                subjectLat={propertyLatitude}
                subjectLng={propertyLongitude}
                suggestedArv={selectedArvData.arv}
                avgPricePerSqft={selectedArvData.avgPricePerSqft}
                selectedComps={(compsData?.comps || []).filter((_, i) => selectedCompIndices.has(i))}
              />
            </div>
            <Button
              type="button"
              className="flex-1 text-sm"
              onClick={handleApply}
              disabled={!selectedArvData.arv}
              data-testid="button-use-suggested-arv-mobile"
            >
              Use This ARV
            </Button>
          </div>
        </div>
      )}

      {/* Edit Comp Dialog */}
      <Dialog open={editingCompIndex !== null} onOpenChange={(open) => !open && setEditingCompIndex(null)}>
        <DialogContent className="sm:max-w-md z-[10002]">
          <DialogHeader>
            <DialogTitle>Edit Comparable</DialogTitle>
            <DialogDescription>
              Correct the price or property type if the data is inaccurate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price-mobile">Sale Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-price-mobile"
                  type="text"
                  value={editFormValues.salePrice}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    setEditFormValues((prev) => ({ ...prev, salePrice: value }));
                  }}
                  className="pl-9"
                  placeholder="Enter price"
                  data-testid="input-edit-comp-price-mobile"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-property-type-mobile">Property Type</Label>
              <Select
                value={editFormValues.propertyType}
                onValueChange={(value) =>
                  setEditFormValues((prev) => ({ ...prev, propertyType: value }))
                }
              >
                <SelectTrigger id="edit-property-type-mobile" data-testid="select-edit-comp-property-type-mobile">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent className="z-[10003]">
                  <SelectItem value="Single Family">Single Family</SelectItem>
                  <SelectItem value="Townhouse">Townhouse</SelectItem>
                  <SelectItem value="Condo">Condo</SelectItem>
                  <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                  <SelectItem value="Manufactured">Manufactured</SelectItem>
                  <SelectItem value="Land">Land</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingCompIndex(null)}
              data-testid="button-cancel-edit-comp-mobile"
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveCompEdit} data-testid="button-save-edit-comp-mobile">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ArvQuotaExhaustedModal
        open={showArvQuotaModal}
        onOpenChange={setShowArvQuotaModal}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
