import { useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Pencil, Check, X } from "lucide-react";

export default function Profile() {
  const { user, logout, refetchUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    fullName: "",
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const startEditing = () => {
    setEditForm({
      username: user?.username || "",
      fullName: user?.profile?.fullName || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({ username: "", fullName: "" });
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      await apiRequest("PATCH", "/api/user/profile", {
        username: editForm.username,
        fullName: editForm.fullName,
      });
      
      await refetchUser();
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">My Profile</h1>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              Logout
            </Button>
          </div>

          <div className="grid gap-6">
            <Card data-testid="card-profile-info">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </div>
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={startEditing}
                    data-testid="button-edit-profile"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={saveChanges}
                      disabled={isSaving}
                      data-testid="button-save-profile"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={cancelEditing}
                      disabled={isSaving}
                      data-testid="button-cancel-edit"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        data-testid="input-username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={editForm.fullName}
                        onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        placeholder="Enter your full name"
                        data-testid="input-fullname"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email (cannot be changed)</Label>
                      <p className="text-sm mt-1 break-all" data-testid="text-email-readonly">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Username</p>
                      <p className="text-base sm:text-lg break-words" data-testid="text-username">
                        {user.username}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-base sm:text-lg break-all" data-testid="text-email">
                        {user.email}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                      <p className="text-base sm:text-lg break-words" data-testid="text-fullname">
                        {user.profile?.fullName || "Not set"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Subscription Status</p>
                      <p className="text-base sm:text-lg capitalize" data-testid="text-subscription-status">
                        {(user.subscriptionStatus || "inactive").replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-referral-code">
              <CardHeader>
                <CardTitle>Your Referral Code</CardTitle>
                <CardDescription>
                  Share this code to give friends 1 month free trial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <code 
                    className="text-xl sm:text-2xl font-bold bg-muted px-4 py-2 rounded-md break-all"
                    data-testid="text-referral-code"
                  >
                    {user.referralCode || "N/A"}
                  </code>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (user.referralCode) {
                        navigator.clipboard.writeText(user.referralCode);
                        toast({
                          title: "Copied!",
                          description: "Referral code copied to clipboard",
                        });
                      }
                    }}
                    data-testid="button-copy-referral"
                    disabled={!user.referralCode}
                  >
                    Copy Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLocation("/deal-analysis")}
                  data-testid="button-new-analysis"
                >
                  Start New Deal Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
