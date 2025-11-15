import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import type { LoanCriteria } from "@shared/schema";

interface Step6CriteriaSelectionProps {
  onContinue: (useDefault: boolean, primary?: LoanCriteria, secondary?: LoanCriteria) => void;
}

export default function Step6CriteriaSelection({ onContinue }: Step6CriteriaSelectionProps) {
  const [useDefaultCriteria, setUseDefaultCriteria] = useState<boolean | null>(null);
  const [primaryCriteria, setPrimaryCriteria] = useState<LoanCriteria | null>(null);
  const [secondaryCriteria, setSecondaryCriteria] = useState<LoanCriteria | null>(null);

  const criteriaOptions: Array<{ value: LoanCriteria; label: string; description: string }> = [
    {
      value: 'profit',
      label: 'Highest Net Profit',
      description: 'Maximize your total profit on this deal'
    },
    {
      value: 'out-of-pocket',
      label: 'Lowest Out-of-Pocket',
      description: 'Minimize cash needed upfront'
    },
    {
      value: 'fastest',
      label: 'Fastest Loan',
      description: 'Close quickly on your property'
    }
  ];

  const handleCriteriaSelection = (criteria: LoanCriteria, level: 'primary' | 'secondary' | 'none') => {
    if (level === 'none') {
      if (primaryCriteria === criteria) setPrimaryCriteria(null);
      if (secondaryCriteria === criteria) setSecondaryCriteria(null);
      return;
    }

    if (level === 'primary') {
      if (secondaryCriteria === criteria) setSecondaryCriteria(null);
      setPrimaryCriteria(criteria);
    } else {
      if (primaryCriteria === criteria) setPrimaryCriteria(null);
      setSecondaryCriteria(criteria);
    }
  };

  const getCriteriaLevel = (criteria: LoanCriteria): 'primary' | 'secondary' | 'none' => {
    if (primaryCriteria === criteria) return 'primary';
    if (secondaryCriteria === criteria) return 'secondary';
    return 'none';
  };

  const handleContinue = () => {
    if (useDefaultCriteria === true) {
      onContinue(true);
    } else if (useDefaultCriteria === false) {
      onContinue(false, primaryCriteria || undefined, secondaryCriteria || undefined);
    }
  };

  const canContinue = useDefaultCriteria !== null && 
    (useDefaultCriteria === true || (primaryCriteria !== null || secondaryCriteria !== null));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            You're almost there! One last question:
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm">
              Our default calculations will show you three loans using the following criteria:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm ml-4">
              <li>The loan with the <strong>highest net profit</strong></li>
              <li>The loan with the <strong>lowest out-of-pocket</strong></li>
              <li>A loan that can <strong>close really fast</strong></li>
            </ol>
            
            <div className="pt-4 border-t">
              <p className="font-medium mb-4">Would you like to change this and focus on different criteria?</p>
              
              <RadioGroup
                value={useDefaultCriteria === null ? undefined : useDefaultCriteria ? "no" : "yes"}
                onValueChange={(value) => {
                  setUseDefaultCriteria(value === "no");
                  if (value === "no") {
                    setPrimaryCriteria(null);
                    setSecondaryCriteria(null);
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no" data-testid="radio-default-criteria" />
                  <Label htmlFor="no" className="cursor-pointer">No, use default criteria</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="yes" data-testid="radio-custom-criteria" />
                  <Label htmlFor="yes" className="cursor-pointer">Yes, let me customize</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {useDefaultCriteria === false && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-1">
                <p className="font-medium">Which criteria would you like to focus on?</p>
                <p className="text-xs text-muted-foreground">
                  Select one Primary and optionally one Secondary criterion. 
                  We'll show 2 loans matching your Primary and 1 matching your Secondary.
                </p>
              </div>

              <div className="space-y-4">
                {criteriaOptions.map((option) => {
                  const level = getCriteriaLevel(option.value);
                  const isPrimaryDisabled = primaryCriteria !== null && primaryCriteria !== option.value;
                  const isSecondaryDisabled = secondaryCriteria !== null && secondaryCriteria !== option.value;
                  
                  return (
                    <Card key={option.value} className={level !== 'none' ? 'border-primary' : ''}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{option.label}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={level === 'primary' ? 'default' : 'outline'}
                              onClick={() => handleCriteriaSelection(option.value, level === 'primary' ? 'none' : 'primary')}
                              disabled={isPrimaryDisabled}
                              data-testid={`button-primary-${option.value}`}
                            >
                              Primary
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={level === 'secondary' ? 'default' : 'outline'}
                              onClick={() => handleCriteriaSelection(option.value, level === 'secondary' ? 'none' : 'secondary')}
                              disabled={isSecondaryDisabled}
                              data-testid={`button-secondary-${option.value}`}
                            >
                              Secondary
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCriteriaSelection(option.value, 'none')}
                              disabled={level === 'none'}
                              data-testid={`button-none-${option.value}`}
                            >
                              None
                            </Button>
                          </div>
                        </div>
                        
                        {level !== 'none' && (
                          <div className="mt-2">
                            <Badge variant={level === 'primary' ? 'default' : 'secondary'}>
                              {level === 'primary' ? 'Primary Criterion' : 'Secondary Criterion'}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleContinue}
              disabled={!canContinue}
              data-testid="button-continue-to-results"
            >
              Continue to Results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
