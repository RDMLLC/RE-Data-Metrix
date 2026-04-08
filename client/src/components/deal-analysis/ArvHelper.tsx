import { useState, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { WizardFormData } from "./DealAnalysisWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  Home,
  MapPin,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  Clock,
  Pencil,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ArvQuotaExhaustedModal from "./ArvQuotaExhaustedModal";
import CompReportPdf from "./CompReportPdf";

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
}

interface CompsSearchResponse {
  comps: SoldPropertyComp[];
  suggestedArv: number | null;
  weightedAvgPricePerSqft?: number;
  message?: string;
}

interface ArvHelperProps {
  form: UseFormReturn<WizardFormData>;
  onClose: () => void;
}

export default function ArvHelper({ form, onClose }: ArvHelperProps) {
  const { toast } = useToast();

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

  const [isSearchingComps, setIsSearchingComps] = useState(false);
  const [compsData, setCompsData] = useState<CompsSearchResponse | null>(null);
  const [expandedCompIndex, setExpandedCompIndex] = useState<number | null>(null);
  const [compsError, setCompsError] = useState<string | null>(null);

  type RadiusOption = 0.5 | 1 | 2 | 3 | 5;
  const [searchRadius, setSearchRadius] = useState<RadiusOption>(0.5);

  type DateRangeOption = 180 | 270 | 365;
  const [searchDateRange, setSearchDateRange] = useState<DateRangeOption>(180);

  const [selectedCompIndices, setSelectedCompIndices] = useState<Set<number>>(new Set());
  const [showArvQuotaModal, setShowArvQuotaModal] = useState(false);

  const [showAddCompForm, setShowAddCompForm] = useState(false);
  const [customCompUrl, setCustomCompUrl] = useState("");
  const [isAddingCustomComp, setIsAddingCustomComp] = useState(false);
  const [customCompError, setCustomCompError] = useState<string | null>(null);

  const [pendingProperties, setPendingProperties] = useState<SoldPropertyComp[]>([]);
  const [isSearchingPending, setIsSearchingPending] = useState(false);
  const [showPendingProperties, setShowPendingProperties] = useState(false);

  const [editingCompIndex, setEditingCompIndex] = useState<number | null>(null);
  const [editFormValues, setEditFormValues] = useState<{
    salePrice: string;
    propertyType: string;
  }>({ salePrice: "", propertyType: "" });

  type SortField = "distance" | "salePrice" | "saleDate" | "pricePerSqft" | "sqft";
  type SortDirection = "asc" | "desc";
  const [compsSortField, setCompsSortField] = useState<SortField>("distance");
  const [compsSortDirection, setCompsSortDirection] = useState<SortDirection>("asc");

  type DateFilter = "all" | "6" | "9";
  const [compsDateFilter] = useState<DateFilter>("all");

  const filterCutoffDate = useMemo(() => {
    const date = new Date();
    if (compsDateFilter === "6") date.setMonth(date.getMonth() - 6);
    else if (compsDateFilter === "9") date.setMonth(date.getMonth() - 9);
    return date.getTime();
  }, [compsDateFilter]);

  const outlierDetection = useMemo(() => {
    if (!compsData || compsData.comps.length < 2) {
      return {
        outlierIndices: new Set<number>(),
        excludedComps: [] as { comp: SoldPropertyComp; originalIndex: number; reason: string }[],
      };
    }
    const pricesPerSqft = compsData.comps.map((c) => c.pricePerSqft).sort((a, b) => a - b);
    const midIndex = Math.floor(pricesPerSqft.length / 2);
    const medianPricePerSqft =
      pricesPerSqft.length % 2 === 0
        ? (pricesPerSqft[midIndex - 1] + pricesPerSqft[midIndex]) / 2
        : pricesPerSqft[midIndex];
    const outlierThreshold = medianPricePerSqft * 5;
    const outlierIndices = new Set<number>();
    const excludedComps: { comp: SoldPropertyComp; originalIndex: number; reason: string }[] = [];
    compsData.comps.forEach((comp, index) => {
      if (comp.pricePerSqft > outlierThreshold) {
        outlierIndices.add(index);
        excludedComps.push({
          comp,
          originalIndex: index,
          reason: `$${comp.pricePerSqft.toLocaleString()}/sqft exceeds normal range (median: $${Math.round(medianPricePerSqft).toLocaleString()}/sqft)`,
        });
      }
    });
    return { outlierIndices, excludedComps, medianPricePerSqft };
  }, [compsData]);

  const sortedCompsWithIndices = useMemo(() => {
    if (!compsData || !compsData.comps.length) return [];
    let compsWithIndices = compsData.comps.map((comp, originalIndex) => ({
      comp,
      originalIndex,
    }));
    compsWithIndices = compsWithIndices.filter(
      ({ originalIndex }) => !outlierDetection.outlierIndices.has(originalIndex)
    );
    if (compsDateFilter !== "all") {
      compsWithIndices = compsWithIndices.filter(({ comp }) => {
        const saleDate = new Date(comp.saleDate).getTime();
        return saleDate >= filterCutoffDate;
      });
    }
    return compsWithIndices.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (compsSortField) {
        case "salePrice":
          aVal = a.comp.salePrice;
          bVal = b.comp.salePrice;
          break;
        case "saleDate":
          aVal = new Date(a.comp.saleDate).getTime();
          bVal = new Date(b.comp.saleDate).getTime();
          break;
        case "pricePerSqft":
          aVal = a.comp.pricePerSqft;
          bVal = b.comp.pricePerSqft;
          break;
        case "sqft":
          aVal = a.comp.sqft;
          bVal = b.comp.sqft;
          break;
        case "distance":
        default:
          aVal = a.comp.distanceFromSubject ?? 999;
          bVal = b.comp.distanceFromSubject ?? 999;
          break;
      }
      let diff = aVal - bVal;
      if (diff === 0) {
        const aDate = new Date(a.comp.saleDate).getTime();
        const bDate = new Date(b.comp.saleDate).getTime();
        diff = bDate - aDate;
      }
      return compsSortDirection === "asc" ? diff : -diff;
    });
  }, [compsData, compsSortField, compsSortDirection, compsDateFilter, filterCutoffDate, outlierDetection]);

  const toggleSort = (field: SortField) => {
    if (compsSortField === field) {
      setCompsSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setCompsSortField(field);
      setCompsSortDirection(field === "distance" ? "asc" : "desc");
    }
  };

  const calculateSelectedArv = () => {
    if (!compsData || compsData.comps.length === 0)
      return { arv: null, avgPricePerSqft: null, count: 0 };
    const visibleOriginalIndices = new Set(sortedCompsWithIndices.map((item) => item.originalIndex));
    const selectedComps = compsData.comps.filter(
      (_, index) => selectedCompIndices.has(index) && visibleOriginalIndices.has(index)
    );
    if (selectedComps.length === 0) return { arv: null, avgPricePerSqft: null, count: 0 };
    const totalSalePrice = selectedComps.reduce((sum, comp) => sum + comp.salePrice, 0);
    const totalSqft = selectedComps.reduce((sum, comp) => sum + comp.sqft, 0);
    const avgPricePerSqft = Math.round(totalSalePrice / totalSqft);
    const calculatedArv = Math.round(avgPricePerSqft * sqft);
    return { arv: calculatedArv, avgPricePerSqft, count: selectedComps.length };
  };

  const selectedArvData = calculateSelectedArv();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    if (dateStr.toLowerCase() === "pending") return "Pending";
    try {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (usMatch) {
        return `${months[parseInt(usMatch[1], 10) - 1]} ${parseInt(usMatch[2], 10)}, ${usMatch[3]}`;
      }
      const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return `${months[parseInt(isoMatch[2], 10) - 1]} ${parseInt(isoMatch[3], 10)}, ${isoMatch[1]}`;
      }
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const extractApiError = (error: any, fallback: string): string => {
    try {
      const jsonMatch = error?.message?.match(/\d+:\s*(.+)/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        if (data.error) return data.error;
      }
    } catch {}
    return fallback;
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
    try {
      const response = await apiRequest("POST", "/api/comps/search", {
        address, city, state, zipCode, bedrooms, bathrooms, sqft, propertyType,
        subjectLat: propertyLatitude, subjectLng: propertyLongitude,
        radiusMiles: searchRadius, saleDateRangeDays: searchDateRange,
      });
      const data = await response.json();
      setCompsData(data);
      if (data.comps && data.comps.length > 0) {
        setSelectedCompIndices(new Set(data.comps.map((_: SoldPropertyComp, i: number) => i)));
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
    setIsSearchingComps(true);
    setCompsError(null);
    setCompsData(null);
    try {
      const response = await apiRequest("POST", "/api/comps/search", {
        address, city, state, zipCode, bedrooms, bathrooms, sqft, propertyType,
        subjectLat: propertyLatitude, subjectLng: propertyLongitude,
        radiusMiles: radius, saleDateRangeDays: dateRange,
      });
      const data = await response.json();
      setCompsData(data);
      if (data.comps && data.comps.length > 0) {
        setSelectedCompIndices(new Set(data.comps.map((_: SoldPropertyComp, i: number) => i)));
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

  const searchPendingProperties = async () => {
    if (!city || !state) return;
    setIsSearchingPending(true);
    try {
      const response = await apiRequest("POST", "/api/comps/search-pending", {
        city, state, zipCode, bedrooms, bathrooms, sqft, propertyType,
        subjectLat: propertyLatitude, subjectLng: propertyLongitude,
      });
      const data = await response.json();
      const pendingWithFlag = (data.pendingProperties || []).map((p: SoldPropertyComp) => ({
        ...p, isPending: true, saleDate: "Pending",
      }));
      setPendingProperties(pendingWithFlag);
      setShowPendingProperties(true);
    } catch (error: any) {
      console.error("Pending search error:", error);
    } finally {
      setIsSearchingPending(false);
    }
  };

  const addPendingToComps = (pending: SoldPropertyComp) => {
    if (!compsData) return;
    const alreadyAdded = compsData.comps.some(
      (c) => c.address.toLowerCase() === pending.address.toLowerCase()
    );
    if (alreadyAdded) return;
    const newComp: SoldPropertyComp = { ...pending, isPending: true, isManuallyAdded: true };
    setCompsData({ ...compsData, comps: [...compsData.comps, newComp] });
    setSelectedCompIndices((prev) => {
      const newSet = new Set(prev);
      newSet.add(compsData.comps.length);
      return newSet;
    });
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
        setShowAddCompForm(false);
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

  return (
    <>
      <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
        {/* Beta Notice */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          This ARV calculator is in beta. We are working to refine it. Thank you for your patience and understanding.
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Find Comparable Sales</h4>
            <p className="text-xs text-muted-foreground">
              Search for recently sold properties similar to yours to estimate ARV
            </p>
            {address && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mt-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    {address}, {city}, {state} {zipCode}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {bedrooms && bathrooms && (
                    <span className="flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      {bedrooms}/{bathrooms}
                    </span>
                  )}
                  {sqft && <span className="flex items-center gap-1">{sqft.toLocaleString()} sqft</span>}
                  {yearBuilt && <span className="flex items-center gap-1">{yearBuilt}</span>}
                  {lotSize && <span className="flex items-center gap-1">{lotSize.toLocaleString()} sqft lot</span>}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    const zillowAddress = `${address} ${city} ${state} ${zipCode}`
                      .replace(/\s+/g, "-")
                      .replace(/[,#]/g, "");
                    window.open(`https://www.zillow.com/homes/${encodeURIComponent(zillowAddress)}_rb/`, "_blank");
                  }}
                  data-testid="button-view-subject-zillow"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View on Zillow
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Radius selector */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground" data-testid="label-radius">Radius:</span>
              {([0.5, 1, 2, 3, 5] as RadiusOption[]).map((radius) => (
                <Button
                  key={radius}
                  type="button"
                  size="sm"
                  variant={searchRadius === radius ? "default" : "outline"}
                  onClick={() => {
                    if (radius !== searchRadius) {
                      setSearchRadius(radius);
                      if (compsData) setTimeout(() => searchCompsWithOptions(radius, searchDateRange), 0);
                    }
                  }}
                  disabled={isSearchingComps}
                  data-testid={`button-radius-${radius}`}
                >
                  {radius === 0.5 ? "½" : radius} mi
                </Button>
              ))}
            </div>
            {/* Date range selector */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground" data-testid="label-date-range">Sales:</span>
              {([180, 270, 365] as DateRangeOption[]).map((days) => (
                <Button
                  key={days}
                  type="button"
                  size="sm"
                  variant={searchDateRange === days ? "default" : "outline"}
                  onClick={() => {
                    if (days !== searchDateRange) {
                      setSearchDateRange(days);
                      if (compsData) setTimeout(() => searchCompsWithOptions(searchRadius, days), 0);
                    }
                  }}
                  disabled={isSearchingComps}
                  data-testid={`button-date-range-${days}`}
                >
                  {days === 180 ? "6" : days === 270 ? "9" : "12"} mo
                </Button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={searchComps}
              disabled={isSearchingComps || !city || !state}
              data-testid="button-search-comps"
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
              size="sm"
              variant="outline"
              onClick={() => setShowAddCompForm(!showAddCompForm)}
              data-testid="button-add-comp"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Comp
            </Button>
          </div>
        </div>

        {/* Add Custom Comp Form */}
        {showAddCompForm && (
          <div className="p-3 bg-muted/50 rounded-md border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Add Comp from Zillow</h4>
                <p className="text-xs text-muted-foreground">
                  Paste a Zillow property URL to add it as a comparable
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAddCompForm(false);
                  setCustomCompUrl("");
                  setCustomCompError(null);
                }}
                data-testid="button-close-add-comp-form"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://www.zillow.com/homedetails/..."
                value={customCompUrl}
                onChange={(e) => setCustomCompUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (customCompUrl.trim() && !isAddingCustomComp) addCustomComp();
                  }
                }}
                className="flex-1"
                data-testid="input-custom-comp-url"
              />
              <Button
                type="button"
                size="sm"
                onClick={addCustomComp}
                disabled={isAddingCustomComp || !customCompUrl.trim()}
                data-testid="button-add-comp-submit"
              >
                {isAddingCustomComp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
            {customCompError && <p className="text-xs text-destructive">{customCompError}</p>}
          </div>
        )}

        {/* Pending Properties Section */}
        {showPendingProperties && pendingProperties.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Pending Sales ({pendingProperties.length})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Properties under contract but not yet closed. Click to add as comp.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPendingProperties(false)}
                data-testid="button-close-pending"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingProperties.map((pending, index) => {
                const alreadyAdded = compsData?.comps.some(
                  (c) => c.address.toLowerCase() === pending.address.toLowerCase()
                );
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-background rounded border text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{pending.address}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                        <span>{formatCurrency(pending.salePrice)}</span>
                        <span>{pending.bedrooms}/{pending.bathrooms}</span>
                        <span>{pending.sqft.toLocaleString()} sqft</span>
                        <span>${pending.pricePerSqft}/sqft</span>
                        {pending.distanceFromSubject && (
                          <span>{pending.distanceFromSubject.toFixed(1)} mi</span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={alreadyAdded ? "secondary" : "default"}
                      onClick={() => !alreadyAdded && addPendingToComps(pending)}
                      disabled={alreadyAdded}
                      className="ml-2 shrink-0"
                      data-testid={`button-add-pending-${index}`}
                    >
                      {alreadyAdded ? "Added" : "Add"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showPendingProperties && pendingProperties.length === 0 && !isSearchingPending && (
          <div className="p-3 bg-muted/50 rounded-md border text-center text-sm text-muted-foreground">
            No pending sales found in this area.
          </div>
        )}

        {/* Search criteria summary */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="bg-muted px-2 py-1 rounded">
            <MapPin className="h-3 w-3 inline mr-1" />
            {city}, {state} {zipCode}
          </span>
          <span className="bg-muted px-2 py-1 rounded">
            <Home className="h-3 w-3 inline mr-1" />
            {bedrooms} bed, {bathrooms} bath
          </span>
          <span className="bg-muted px-2 py-1 rounded">{sqft.toLocaleString()} sqft (±20%)</span>
          {propertyType && (
            <span className="bg-muted px-2 py-1 rounded">
              {propertyType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          )}
        </div>

        {/* Error message */}
        {compsError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{compsError}</div>
        )}

        {/* Comps Results */}
        {compsData && compsData.comps.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm text-muted-foreground">
                  Showing {sortedCompsWithIndices.length} of {compsData.comps.length} comps
                  {outlierDetection.excludedComps.length > 0 && (
                    <span className="text-amber-600"> ({outlierDetection.excludedComps.length} excluded)</span>
                  )}
                </span>
                {outlierDetection.excludedComps.length > 0 && (
                  <span className="text-xs text-amber-600" data-testid="text-outliers-excluded">
                    Data anomaly: {outlierDetection.excludedComps[0].comp.address.split(",")[0]}
                    {outlierDetection.excludedComps.length > 1 &&
                      ` +${outlierDetection.excludedComps.length - 1} more`}
                  </span>
                )}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => toggleSort("salePrice")}
                    data-testid="sort-sale-price"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Sale Price
                      {compsSortField === "salePrice" ? (
                        compsSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => toggleSort("saleDate")}
                    data-testid="sort-sale-date"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Sold
                      {compsSortField === "saleDate" ? (
                        compsSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Bed/Bath</TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => toggleSort("sqft")}
                    data-testid="sort-sqft"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Sqft
                      {compsSortField === "sqft" ? (
                        compsSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => toggleSort("pricePerSqft")}
                    data-testid="sort-price-per-sqft"
                  >
                    <div className="flex items-center justify-end gap-1">
                      $/Sqft
                      {compsSortField === "pricePerSqft" ? (
                        compsSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => toggleSort("distance")}
                    data-testid="sort-distance"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Distance
                      {compsSortField === "distance" ? (
                        compsSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCompsWithIndices.map(({ comp, originalIndex }) => (
                  <>
                    <TableRow
                      key={originalIndex}
                      className="cursor-pointer hover-elevate"
                      onClick={() =>
                        setExpandedCompIndex(expandedCompIndex === originalIndex ? null : originalIndex)
                      }
                      data-testid={`row-comp-${originalIndex}`}
                    >
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedCompIndices.has(originalIndex)}
                          onCheckedChange={() => {
                            setSelectedCompIndices((prev) => {
                              const newSet = new Set(prev);
                              if (newSet.has(originalIndex)) newSet.delete(originalIndex);
                              else newSet.add(originalIndex);
                              return newSet;
                            });
                          }}
                          data-testid={`checkbox-comp-${originalIndex}`}
                        />
                      </TableCell>
                      <TableCell className="w-8">
                        {expandedCompIndex === originalIndex ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        <div>{comp.address}</div>
                        <div className="text-xs text-muted-foreground">
                          {comp.city}, {comp.state}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(comp.salePrice)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
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
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {comp.bedrooms}/{comp.bathrooms}
                      </TableCell>
                      <TableCell className="text-right text-sm">{comp.sqft.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">${comp.pricePerSqft}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {comp.distanceFromSubject !== undefined
                          ? `${comp.distanceFromSubject.toFixed(1)} mi`
                          : "—"}
                      </TableCell>
                    </TableRow>
                    {expandedCompIndex === originalIndex && (
                      <TableRow key={`${originalIndex}-details`}>
                        <TableCell colSpan={9} className="bg-muted/50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  {(comp as any).isPending ? "Status:" : "Sale Date:"}
                                </span>
                                <div className="font-medium">
                                  {(comp as any).isPending ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending (List Price)
                                    </Badge>
                                  ) : (
                                    formatDate(comp.saleDate)
                                  )}
                                </div>
                              </div>
                              {comp.yearBuilt && (
                                <div>
                                  <span className="text-muted-foreground">Year Built:</span>
                                  <div className="font-medium">{comp.yearBuilt}</div>
                                </div>
                              )}
                              {comp.lotSize && (
                                <div>
                                  <span className="text-muted-foreground">Lot Size:</span>
                                  <div className="font-medium">{comp.lotSize.toLocaleString()} sqft</div>
                                </div>
                              )}
                              {comp.propertyType && (
                                <div>
                                  <span className="text-muted-foreground">Type:</span>
                                  <div className="font-medium">{comp.propertyType}</div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-sm">
                                <span className="text-muted-foreground">View on Zillow:</span>
                                <div className="font-medium">
                                  <a
                                    href={`https://www.zillow.com/homes/${encodeURIComponent(`${comp.address} ${comp.city} ${comp.state}`.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, ""))}_rb/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                    data-testid={`link-comp-zillow-${originalIndex}`}
                                  >
                                    View Property
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(originalIndex);
                                }}
                                data-testid={`button-edit-comp-${originalIndex}`}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>

            {/* Insufficient comps warning */}
            {compsData.comps.length > 0 && compsData.comps.length < 3 && (
              <div
                className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3"
                data-testid="text-insufficient-comps-warning"
              >
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Insufficient comps found. Try expanding your criteria or consider subscribing to Propstream.{" "}
                  <a
                    href="https://trial.propstreampro.com/redatametrix/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                    data-testid="link-propstream-trial-insufficient"
                  >
                    Use this link to get a 7-day free trial.
                  </a>
                </p>
              </div>
            )}

            {/* Suggested ARV */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Based on {selectedArvData.count} comparable sale{selectedArvData.count !== 1 ? "s" : ""}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Weighted Avg: ${selectedArvData.avgPricePerSqft || 0}/sqft × {sqft.toLocaleString()} sqft
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Suggested ARV</div>
                  <div className="text-2xl font-bold text-primary" data-testid="text-suggested-arv">
                    {selectedArvData.arv ? formatCurrency(selectedArvData.arv) : "N/A"}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <CompReportPdf
                  subjectAddress={address}
                  subjectCity={city}
                  subjectState={state}
                  subjectZip={zipCode}
                  subjectBeds={bedrooms}
                  subjectBaths={bathrooms}
                  subjectSqft={sqft}
                  subjectYearBuilt={form.watch("yearBuilt")}
                  suggestedArv={selectedArvData.arv}
                  avgPricePerSqft={selectedArvData.avgPricePerSqft}
                  selectedComps={(compsData?.comps || []).filter((_, index) =>
                    selectedCompIndices.has(index)
                  )}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (selectedArvData.arv) {
                      form.setValue("arv", selectedArvData.arv);
                      form.setValue("estimatedValue", selectedArvData.arv);
                      toast({
                        title: "ARV Applied",
                        description: `Est. Market Value set to ${formatCurrency(selectedArvData.arv)}`,
                      });
                      onClose();
                    }
                  }}
                  disabled={!selectedArvData.arv}
                  data-testid="button-use-suggested-arv"
                >
                  Use This ARV
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* No results message */}
        {compsData && compsData.comps.length === 0 && (
          <div className="text-center py-6 text-muted-foreground" data-testid="text-no-comps-message">
            <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No comparable sales found in this area.</p>
            <p className="text-xs mt-2">
              Try expanding your search radius
              {searchRadius < 5
                ? ` to ${searchRadius === 0.5 ? "1 mile" : searchRadius === 1 ? "2 miles" : searchRadius === 2 ? "3 miles" : "5 miles"}`
                : ""}
              {" "}or adjusting the time range, or consider subscribing to Propstream.{" "}
              <a
                href="https://trial.propstreampro.com/redatametrix/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                data-testid="link-propstream-trial"
              >
                Use this link to get a 7-day free trial.
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Edit Comp Dialog */}
      <Dialog open={editingCompIndex !== null} onOpenChange={(open) => !open && setEditingCompIndex(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Comparable</DialogTitle>
            <DialogDescription>
              Correct the price or property type if the data is inaccurate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Sale Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-price"
                  type="text"
                  value={editFormValues.salePrice}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    setEditFormValues((prev) => ({ ...prev, salePrice: value }));
                  }}
                  className="pl-9"
                  placeholder="Enter price"
                  data-testid="input-edit-comp-price"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-property-type">Property Type</Label>
              <Select
                value={editFormValues.propertyType}
                onValueChange={(value) =>
                  setEditFormValues((prev) => ({ ...prev, propertyType: value }))
                }
              >
                <SelectTrigger id="edit-property-type" data-testid="select-edit-comp-property-type">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
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
              data-testid="button-cancel-edit-comp"
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveCompEdit} data-testid="button-save-edit-comp">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ArvQuotaExhaustedModal open={showArvQuotaModal} onOpenChange={setShowArvQuotaModal} />
    </>
  );
}
