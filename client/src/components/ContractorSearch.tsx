import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Phone, Globe, Mail, Loader2, HardHat, Info, Search, Building2 } from "lucide-react";
import type { ServiceRegion, Contractor } from "@shared/schema";

const US_STATES = [
  { code: "GA", name: "Georgia" },
];

interface ContractorSearchProps {
  isBlurred?: boolean;
}

export default function ContractorSearch({ isBlurred = false }: ContractorSearchProps) {
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");

  const { data: regions, isLoading: regionsLoading } = useQuery<ServiceRegion[]>({
    queryKey: ["/api/service-regions", { state: selectedState }],
    enabled: !!selectedState,
  });

  const { data: contractors, isLoading: contractorsLoading } = useQuery<Contractor[]>({
    queryKey: ["/api/contractors/search", { regionId: selectedRegion }],
    enabled: !!selectedRegion,
  });

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setSelectedRegion("");
  };

  const handleRegionChange = (value: string) => {
    setSelectedRegion(value);
  };

  const selectedRegionData = regions?.find(r => r.id === selectedRegion);

  return (
    <div className={`space-y-6 ${isBlurred ? 'blur-sm pointer-events-none select-none' : ''}`}>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <HardHat className="h-6 w-6 text-accent" />
          <h2 className="text-2xl font-bold">Find General Contractors</h2>
        </div>
        <p className="text-muted-foreground">
          Search for vetted general contractors by your property location
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-accent" />
            Search by Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Select value={selectedState} onValueChange={handleStateChange}>
                <SelectTrigger data-testid="select-state">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(state => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                Service Region
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Contractors work in specific metro areas. Select the region where your property is located.</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Select 
                value={selectedRegion} 
                onValueChange={handleRegionChange}
                disabled={!selectedState || regionsLoading}
              >
                <SelectTrigger data-testid="select-region">
                  <SelectValue placeholder={
                    !selectedState 
                      ? "Select a state first" 
                      : regionsLoading 
                        ? "Loading regions..." 
                        : "Select a region"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {regions?.map(region => (
                    <SelectItem key={region.id} value={region.id}>
                      <div className="flex items-center gap-2">
                        <span>{region.name}</span>
                        {region.keyCities && region.keyCities.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Includes: {region.keyCities.join(", ")}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedRegionData && selectedRegionData.keyCities && selectedRegionData.keyCities.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center pt-2">
              <span className="text-sm text-muted-foreground">Key cities in this region:</span>
              {selectedRegionData.keyCities.map(city => (
                <Badge key={city} variant="secondary" className="text-xs">
                  {city}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {contractorsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <span className="ml-2 text-muted-foreground">Searching contractors...</span>
        </div>
      )}

      {selectedRegion && !contractorsLoading && contractors && contractors.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Contractors Found</h3>
            <p className="text-muted-foreground">
              We don't have any contractors listed for this region yet.
              Check back soon as we're constantly adding new partners.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedRegion && !contractorsLoading && contractors && contractors.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <HardHat className="h-5 w-5 text-accent" />
            Available Contractors ({contractors.length})
          </h3>
          <div className="grid gap-4">
            {contractors.map(contractor => (
              <ContractorCard key={contractor.id} contractor={contractor} />
            ))}
          </div>
        </div>
      )}

      {!selectedRegion && !contractorsLoading && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Location</h3>
            <p className="text-muted-foreground">
              Choose a state and service region to find contractors in your area
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ContractorCard({ contractor }: { contractor: Contractor }) {
  return (
    <Card className="hover-elevate" data-testid={`card-contractor-${contractor.id}`}>
      <CardContent className="py-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="text-lg font-semibold" data-testid={`text-contractor-name-${contractor.id}`}>
                {contractor.name}
              </h4>
              {contractor.companyName && (
                <span className="text-sm text-muted-foreground">
                  ({contractor.companyName})
                </span>
              )}
            </div>
            
            {contractor.description && (
              <p className="text-sm text-muted-foreground mb-3" data-testid={`text-contractor-description-${contractor.id}`}>
                {contractor.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              {contractor.specialties && contractor.specialties.length > 0 && contractor.specialties.map(specialty => (
                <Badge key={specialty} variant="outline" className="text-xs">
                  {specialty}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {contractor.licenseNumber && (
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  <span>License: {contractor.licenseNumber}</span>
                </div>
              )}
              {contractor.isInsured && (
                <Badge variant="secondary" className="text-xs">Insured</Badge>
              )}
              {contractor.isBonded && (
                <Badge variant="secondary" className="text-xs">Bonded</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {contractor.phone && (
              <Button
                variant="outline"
                size="sm"
                asChild
                data-testid={`button-phone-${contractor.id}`}
              >
                <a href={`tel:${contractor.phone}`}>
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </a>
              </Button>
            )}
            {contractor.email && (
              <Button
                variant="outline"
                size="sm"
                asChild
                data-testid={`button-email-${contractor.id}`}
              >
                <a href={`mailto:${contractor.email}`}>
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </a>
              </Button>
            )}
            {contractor.website && (
              <Button
                variant="outline"
                size="sm"
                asChild
                data-testid={`button-website-${contractor.id}`}
              >
                <a href={contractor.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4 mr-1" />
                  Website
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
