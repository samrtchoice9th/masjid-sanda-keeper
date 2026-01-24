import { useState, useEffect } from "react";
import { FileText, Phone, CreditCard, CheckCircle, XCircle, LogOut, Users, DollarSign, TrendingUp, Plus, Edit, Trash2, Search, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type AdminView = "dashboard" | "donors" | "donations";

export default function Home() {
  const [activeTab, setActiveTab] = useState("public");
  const { toast } = useToast();
  const { user, isAdmin, signIn, signUp, signOut, loading: authLoading } = useAuth();

  // Auth form state
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Public lookup state
  const [selectedRoot, setSelectedRoot] = useState("");
  const [selectedCardNumber, setSelectedCardNumber] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [donor, setDonor] = useState<any>(null);
  const [allDonors, setAllDonors] = useState<any[]>([]);
  const [filteredDonors, setFilteredDonors] = useState<any[]>([]);
  const [paidMonths, setPaidMonths] = useState<number[]>([]);
  const [notFound, setNotFound] = useState(false);

  // Admin state
  const [adminView, setAdminView] = useState<AdminView>("dashboard");
  const [stats, setStats] = useState({ totalDonors: 0, totalDonations: 0, monthlyTotal: 0 });
  const [recentDonations, setRecentDonations] = useState<any[]>([]);
  const [donors, setDonors] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [donorDialogOpen, setDonorDialogOpen] = useState(false);
  const [donationDialogOpen, setDonationDialogOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState<any>(null);
  const [editingDonation, setEditingDonation] = useState<any>(null);

  // Form data
  const [donorFormData, setDonorFormData] = useState({
    name: "", root_no: "", card_number: "", phone: "",
    monthly_sanda_amount: "", address: "", nic_or_id: "", status: "active",
  });
  const [donationFormData, setDonationFormData] = useState({
    donor_id: "", amount: "", date: new Date().toISOString().split("T")[0],
    method: "cash", year: new Date().getFullYear().toString(), months_paid: [] as number[],
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2024 + 2 }, (_, i) => 2024 + i);

  // Fetch all donors on mount
  useEffect(() => {
    fetchAllDonors();
  }, []);

  // Load admin data when authenticated
  useEffect(() => {
    if (user && isAdmin) {
      loadStats();
      loadRecentDonations();
      loadDonors();
      loadDonations();
    }
  }, [user, isAdmin]);

  const fetchAllDonors = async () => {
    try {
      const { data, error } = await supabase.from("donors").select("*").order("card_number");
      if (error) throw error;
      setAllDonors(data || []);
    } catch (error: any) {
      console.error("Error fetching donors:", error);
    }
  };

  // Filter donors by root
  useEffect(() => {
    if (selectedRoot) {
      const filtered = allDonors.filter(d => d.root_no === selectedRoot);
      setFilteredDonors(filtered);
    } else {
      setFilteredDonors([]);
    }
    setSelectedCardNumber("");
    setDonor(null);
    setPaidMonths([]);
  }, [selectedRoot, allDonors]);

  // Fetch donor details when card is selected
  useEffect(() => {
    if (selectedCardNumber) handleCardSelection();
    else { setDonor(null); setPaidMonths([]); }
  }, [selectedCardNumber]);

  // Fetch paid months when year is selected
  useEffect(() => {
    if (selectedYear && donor) fetchPaidMonths();
    else setPaidMonths([]);
  }, [selectedYear, donor]);

  const handleCardSelection = async () => {
    setLookupLoading(true);
    setNotFound(false);
    try {
      const { data: donorData, error } = await supabase.from("donors").select("*").eq("card_number", selectedCardNumber).maybeSingle();
      if (error) throw error;
      if (!donorData) { setNotFound(true); return; }
      setDonor(donorData);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLookupLoading(false);
    }
  };

  const fetchPaidMonths = async () => {
    if (!donor || !selectedYear) return;
    try {
      const { data, error } = await supabase.from("donations").select("months_paid")
        .eq("donor_id", donor.id).eq("year", parseInt(selectedYear)).eq("method", "sanda");
      if (error) throw error;
      const allPaidMonths: number[] = [];
      data?.forEach(d => { if (d.months_paid) allPaidMonths.push(...d.months_paid); });
      setPaidMonths([...new Set(allPaidMonths)].sort((a, b) => a - b));
    } catch (error: any) {
      console.error("Error fetching paid months:", error);
    }
  };

  const unpaidMonths = Array.from({ length: 12 }, (_, i) => i + 1).filter(m => !paidMonths.includes(m));

  // Auth handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    try {
      const result = authMode === "signin" 
        ? await signIn(authEmail, authPassword)
        : await signUp(authEmail, authPassword);
      if (result.error) throw result.error;
      if (authMode === "signup") {
        toast({ title: "Success", description: "Account created! You can now sign in." });
        setAuthMode("signin");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Admin data loaders
  const loadStats = async () => {
    try {
      const { count: donorsCount } = await supabase.from("donors").select("*", { count: "exact", head: true });
      const { count: donationsCount } = await supabase.from("donations").select("*", { count: "exact", head: true });
      const firstDayOfMonth = new Date(); firstDayOfMonth.setDate(1); firstDayOfMonth.setHours(0, 0, 0, 0);
      const { data: monthlyData } = await supabase.from("donations").select("amount").gte("date", firstDayOfMonth.toISOString());
      const monthlyTotal = monthlyData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      setStats({ totalDonors: donorsCount || 0, totalDonations: donationsCount || 0, monthlyTotal });
    } catch (error) { console.error("Error loading stats:", error); }
  };

  const loadRecentDonations = async () => {
    try {
      const { data } = await supabase.from("donations")
        .select(`*, donors (name, card_number)`)
        .order("created_at", { ascending: false }).limit(5);
      setRecentDonations(data || []);
    } catch (error) { console.error("Error loading recent donations:", error); }
  };

  const loadDonors = async () => {
    try {
      const { data, error } = await supabase.from("donors").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setDonors(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const loadDonations = async () => {
    try {
      const { data, error } = await supabase.from("donations")
        .select(`*, donors (name, card_number)`).order("created_at", { ascending: false });
      if (error) throw error;
      setDonations(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Donor CRUD
  const handleDonorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = { ...donorFormData, monthly_sanda_amount: donorFormData.monthly_sanda_amount ? parseFloat(donorFormData.monthly_sanda_amount) : null };
      if (editingDonor) {
        const { error } = await supabase.from("donors").update(submitData).eq("id", editingDonor.id);
        if (error) throw error;
        toast({ title: "Success", description: "Donor updated successfully" });
      } else {
        const { error } = await supabase.from("donors").insert([submitData]);
        if (error) throw error;
        toast({ title: "Success", description: "Donor added successfully" });
      }
      setDonorDialogOpen(false);
      resetDonorForm();
      loadDonors();
      loadStats();
      fetchAllDonors();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditDonor = (d: any) => {
    setEditingDonor(d);
    setDonorFormData({
      name: d.name, root_no: d.root_no || "", card_number: d.card_number, phone: d.phone || "",
      monthly_sanda_amount: d.monthly_sanda_amount?.toString() || "", address: d.address || "",
      nic_or_id: d.nic_or_id || "", status: d.status || "active",
    });
    setDonorDialogOpen(true);
  };

  const handleDeleteDonor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this donor?")) return;
    try {
      const { error } = await supabase.from("donors").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Donor deleted successfully" });
      loadDonors();
      loadStats();
      fetchAllDonors();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetDonorForm = () => {
    setDonorFormData({ name: "", root_no: "", card_number: "", phone: "", monthly_sanda_amount: "", address: "", nic_or_id: "", status: "active" });
    setEditingDonor(null);
  };

  // Donation CRUD
  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        donor_id: donationFormData.donor_id, amount: parseFloat(donationFormData.amount),
        date: donationFormData.date, method: donationFormData.method,
        year: parseInt(donationFormData.year), months_paid: donationFormData.months_paid,
      };
      if (editingDonation) {
        const { error } = await supabase.from("donations").update(submitData).eq("id", editingDonation.id);
        if (error) throw error;
        toast({ title: "Success", description: "Donation updated successfully" });
      } else {
        const { error } = await supabase.from("donations").insert([submitData]);
        if (error) throw error;
        toast({ title: "Success", description: "Donation recorded successfully" });
      }
      setDonationDialogOpen(false);
      resetDonationForm();
      loadDonations();
      loadRecentDonations();
      loadStats();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditDonation = (d: any) => {
    setEditingDonation(d);
    setDonationFormData({
      donor_id: d.donor_id, amount: d.amount?.toString() || "", date: d.date || new Date().toISOString().split("T")[0],
      method: d.method || "cash", year: d.year?.toString() || new Date().getFullYear().toString(),
      months_paid: d.months_paid || [],
    });
    setDonationDialogOpen(true);
  };

  const handleDeleteDonation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this donation?")) return;
    try {
      const { error } = await supabase.from("donations").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Donation deleted successfully" });
      loadDonations();
      loadRecentDonations();
      loadStats();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetDonationForm = () => {
    setDonationFormData({ donor_id: "", amount: "", date: new Date().toISOString().split("T")[0], method: "cash", year: new Date().getFullYear().toString(), months_paid: [] });
    setEditingDonation(null);
  };

  const toggleMonthPaid = (month: number) => {
    setDonationFormData(prev => ({
      ...prev,
      months_paid: prev.months_paid.includes(month) 
        ? prev.months_paid.filter(m => m !== month)
        : [...prev.months_paid, month].sort((a, b) => a - b)
    }));
  };

  const filteredDonorsList = donors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.card_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDonationsList = donations.filter(d => 
    d.donors?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.donors?.card_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="public">Check Sanda</TabsTrigger>
            <TabsTrigger value="admin">Admin Panel</TabsTrigger>
          </TabsList>

          {/* PUBLIC LOOKUP TAB */}
          <TabsContent value="public">
            <div className="mx-auto max-w-2xl">
              <div className="mb-6 text-center">
                <h2 className="mb-2 text-2xl sm:text-3xl font-bold text-foreground">Check Your Sanda</h2>
                <p className="text-sm sm:text-base text-muted-foreground">Select your root and card number to view your payment history</p>
              </div>

              <Card className="mb-6 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Lookup Sanda Record</CardTitle>
                  <CardDescription>Select your root number and card number below</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Root No.</label>
                    <Select value={selectedRoot} onValueChange={setSelectedRoot}>
                      <SelectTrigger><SelectValue placeholder="Select Root No." /></SelectTrigger>
                      <SelectContent>
                        {["Root-1", "Root-2", "Root-3", "Root-4", "Root-5", "Root-6"].map(root => (
                          <SelectItem key={root} value={root}>{root}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRoot && (
                    <div>
                      <label className="mb-2 block text-sm font-medium">Card No.</label>
                      <Select value={selectedCardNumber} onValueChange={setSelectedCardNumber}>
                        <SelectTrigger><SelectValue placeholder="Select Card No." /></SelectTrigger>
                        <SelectContent>
                          {filteredDonors.map(d => (
                            <SelectItem key={d.id} value={d.card_number}>{d.card_number} - {d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {notFound && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="pt-6 text-center">
                    <p className="text-destructive">Card number not found. Please contact Masjid admin.</p>
                  </CardContent>
                </Card>
              )}

              {donor && (
                <>
                  <Card className="mb-4 shadow-card">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                      <CardTitle className="text-lg">Donor Information</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-primary mt-0.5" />
                          <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium text-sm">{donor.name}</p></div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CreditCard className="h-4 w-4 text-primary mt-0.5" />
                          <div><p className="text-xs text-muted-foreground">Card Number</p><p className="font-medium text-sm">{donor.card_number}</p></div>
                        </div>
                        {donor.phone && (
                          <div className="flex items-start gap-2">
                            <Phone className="h-4 w-4 text-primary mt-0.5" />
                            <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium text-sm">{donor.phone}</p></div>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-primary mt-0.5" />
                          <div><p className="text-xs text-muted-foreground">Monthly Sanda Amount</p><p className="font-medium text-sm">Rs. {donor.monthly_sanda_amount ? Number(donor.monthly_sanda_amount).toLocaleString() : 'N/A'}</p></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="mb-4 shadow-card">
                    <CardHeader><CardTitle className="text-lg">Select Year</CardTitle></CardHeader>
                    <CardContent>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                        <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {selectedYear && (
                    <>
                      <Card className="mb-4 shadow-card">
                        <CardHeader className="bg-gradient-to-r from-green-500/10 to-green-500/5">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <CheckCircle className="h-4 w-4 text-green-600" />Paid Months ({selectedYear})
                          </CardTitle>
                          <CardDescription>{paidMonths.length} month(s) paid</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                          {paidMonths.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground">No payments recorded for this year</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              {paidMonths.map(m => (
                                <div key={m} className="rounded-lg border border-green-200 bg-green-50 p-2 text-center dark:border-green-900 dark:bg-green-950">
                                  <p className="font-medium text-sm text-green-700 dark:text-green-300">{monthNames[m - 1]}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="shadow-card">
                        <CardHeader className="bg-gradient-to-r from-red-500/10 to-red-500/5">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <XCircle className="h-4 w-4 text-red-600" />Unpaid Months ({selectedYear})
                          </CardTitle>
                          <CardDescription>{unpaidMonths.length} month(s) unpaid</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                          {unpaidMonths.length === 0 ? (
                            <p className="text-center text-sm text-green-600">All months paid!</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              {unpaidMonths.map(m => (
                                <div key={m} className="rounded-lg border border-red-200 bg-red-50 p-2 text-center dark:border-red-900 dark:bg-red-950">
                                  <p className="font-medium text-sm text-red-700 dark:text-red-300">{monthNames[m - 1]}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* ADMIN TAB */}
          <TabsContent value="admin">
            {!user ? (
              /* Login Form */
              <div className="mx-auto max-w-md">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>{authMode === "signin" ? "Admin Sign In" : "Create Account"}</CardTitle>
                    <CardDescription>
                      {authMode === "signin" ? "Enter your credentials to access admin panel" : "Create a new admin account"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAuth} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={authSubmitting}>
                        {authSubmitting ? "Please wait..." : (authMode === "signin" ? "Sign In" : "Sign Up")}
                      </Button>
                    </form>
                    <div className="mt-4 text-center">
                      <button type="button" className="text-sm text-primary hover:underline" onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}>
                        {authMode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : !isAdmin ? (
              <Card className="mx-auto max-w-md">
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">You don't have admin access.</p>
                  <Button variant="outline" className="mt-4" onClick={signOut}>Sign Out</Button>
                </CardContent>
              </Card>
            ) : (
              /* Admin Dashboard */
              <div>
                {adminView === "dashboard" && (
                  <>
                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="text-2xl font-bold">Admin Dashboard</h2>
                      <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</Button>
                    </div>

                    <div className="mb-6 grid gap-4 md:grid-cols-3">
                      <Card className="shadow-card">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
                          <Users className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{stats.totalDonors}</div></CardContent>
                      </Card>
                      <Card className="shadow-card">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{stats.totalDonations}</div></CardContent>
                      </Card>
                      <Card className="shadow-card">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium">This Month</CardTitle>
                          <DollarSign className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">Rs. {stats.monthlyTotal.toLocaleString()}</div></CardContent>
                      </Card>
                    </div>

                    <div className="mb-6 grid gap-4 md:grid-cols-2">
                      <Card className="cursor-pointer shadow-card transition-all hover:shadow-lg" onClick={() => setAdminView("donors")}>
                        <CardHeader><CardTitle>Manage Donors</CardTitle><CardDescription>Add, edit, and view donor information</CardDescription></CardHeader>
                      </Card>
                      <Card className="cursor-pointer shadow-card transition-all hover:shadow-lg" onClick={() => setAdminView("donations")}>
                        <CardHeader><CardTitle>Manage Donations</CardTitle><CardDescription>Record and track all donations</CardDescription></CardHeader>
                      </Card>
                    </div>

                    <Card className="shadow-card">
                      <CardHeader><CardTitle>Recent Donations</CardTitle><CardDescription>Latest 5 donation records</CardDescription></CardHeader>
                      <CardContent>
                        {recentDonations.length === 0 ? (
                          <p className="text-center text-muted-foreground">No donations yet</p>
                        ) : (
                          <div className="space-y-3">
                            {recentDonations.map(d => (
                              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                                <div>
                                  <p className="font-medium">{d.donors?.name}</p>
                                  <p className="text-sm text-muted-foreground">{d.donors?.card_number} • {new Date(d.date).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-primary">Rs. {Number(d.amount).toLocaleString()}</p>
                                  <p className="text-sm text-muted-foreground">{d.method}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                {adminView === "donors" && (
                  <>
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => setAdminView("dashboard")}><ArrowLeft className="h-4 w-4" /></Button>
                        <h2 className="text-2xl font-bold">Manage Donors</h2>
                      </div>
                      <Dialog open={donorDialogOpen} onOpenChange={(open) => { setDonorDialogOpen(open); if (!open) resetDonorForm(); }}>
                        <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Donor</Button></DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{editingDonor ? "Edit Donor" : "Add New Donor"}</DialogTitle>
                            <DialogDescription>Fill in the donor information below</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleDonorSubmit} className="space-y-4">
                            <div className="space-y-2"><Label htmlFor="name">Name *</Label><Input id="name" value={donorFormData.name} onChange={e => setDonorFormData({ ...donorFormData, name: e.target.value })} required /></div>
                            <div className="space-y-2">
                              <Label htmlFor="root_no">Root No. *</Label>
                              <Select value={donorFormData.root_no} onValueChange={v => setDonorFormData({ ...donorFormData, root_no: v })}>
                                <SelectTrigger><SelectValue placeholder="Select Root No." /></SelectTrigger>
                                <SelectContent>{["Root-1", "Root-2", "Root-3", "Root-4", "Root-5", "Root-6"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2"><Label htmlFor="card_number">Card No. *</Label><Input id="card_number" value={donorFormData.card_number} onChange={e => setDonorFormData({ ...donorFormData, card_number: e.target.value })} placeholder="CARD-12345" required /></div>
                            <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={donorFormData.phone} onChange={e => setDonorFormData({ ...donorFormData, phone: e.target.value })} placeholder="+94-77-xxxxxxx" /></div>
                            <div className="space-y-2"><Label htmlFor="monthly_sanda_amount">Monthly Sanda Amount (Rs.) *</Label><Input id="monthly_sanda_amount" type="number" value={donorFormData.monthly_sanda_amount} onChange={e => setDonorFormData({ ...donorFormData, monthly_sanda_amount: e.target.value })} required /></div>
                            <div className="space-y-2"><Label htmlFor="address">Address</Label><Input id="address" value={donorFormData.address} onChange={e => setDonorFormData({ ...donorFormData, address: e.target.value })} /></div>
                            <div className="space-y-2"><Label htmlFor="nic_or_id">NIC / ID</Label><Input id="nic_or_id" value={donorFormData.nic_or_id} onChange={e => setDonorFormData({ ...donorFormData, nic_or_id: e.target.value })} /></div>
                            <div className="space-y-2">
                              <Label htmlFor="status">Status</Label>
                              <Select value={donorFormData.status} onValueChange={v => setDonorFormData({ ...donorFormData, status: v })}>
                                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                              </Select>
                            </div>
                            <Button type="submit" className="w-full">{editingDonor ? "Update Donor" : "Add Donor"}</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Card className="mb-4 shadow-card">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Search className="h-5 w-5 text-muted-foreground" />
                          <Input placeholder="Search by name or card number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border-0 focus-visible:ring-0" />
                        </div>
                      </CardHeader>
                    </Card>

                    <Card className="shadow-card">
                      <CardHeader><CardTitle>All Donors ({filteredDonorsList.length})</CardTitle></CardHeader>
                      <CardContent>
                        {filteredDonorsList.length === 0 ? (
                          <p className="text-center text-muted-foreground">No donors found</p>
                        ) : (
                          <div className="space-y-3">
                            {filteredDonorsList.map(d => (
                              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                                <div>
                                  <p className="font-medium">{d.name}</p>
                                  <p className="text-sm text-muted-foreground">{d.root_no && `${d.root_no} • `}{d.card_number}{d.phone && ` • ${d.phone}`}</p>
                                  {d.monthly_sanda_amount && <p className="text-xs text-primary font-semibold">Monthly Sanda: Rs. {Number(d.monthly_sanda_amount).toLocaleString()}</p>}
                                  <Badge variant={d.status === "active" ? "default" : "secondary"} className="mt-1">{d.status || "active"}</Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="icon" onClick={() => handleEditDonor(d)}><Edit className="h-4 w-4" /></Button>
                                  <Button variant="outline" size="icon" onClick={() => handleDeleteDonor(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                {adminView === "donations" && (
                  <>
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => setAdminView("dashboard")}><ArrowLeft className="h-4 w-4" /></Button>
                        <h2 className="text-2xl font-bold">Manage Donations</h2>
                      </div>
                      <Dialog open={donationDialogOpen} onOpenChange={(open) => { setDonationDialogOpen(open); if (!open) resetDonationForm(); }}>
                        <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Donation</Button></DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{editingDonation ? "Edit Donation" : "Record New Donation"}</DialogTitle>
                            <DialogDescription>Fill in the donation details below</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleDonationSubmit} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="donor_id">Donor *</Label>
                              <Select value={donationFormData.donor_id} onValueChange={v => {
                                const selectedDonor = donors.find(d => d.id === v);
                                setDonationFormData({ 
                                  ...donationFormData, 
                                  donor_id: v,
                                  amount: selectedDonor?.monthly_sanda_amount?.toString() || donationFormData.amount
                                });
                              }}>
                                <SelectTrigger><SelectValue placeholder="Select Donor" /></SelectTrigger>
                                <SelectContent>{donors.map(d => <SelectItem key={d.id} value={d.id}>{d.card_number} - {d.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2"><Label htmlFor="amount">Amount (Rs.) *</Label><Input id="amount" type="number" value={donationFormData.amount} onChange={e => setDonationFormData({ ...donationFormData, amount: e.target.value })} required /></div>
                            <div className="space-y-2"><Label htmlFor="date">Date *</Label><Input id="date" type="date" value={donationFormData.date} onChange={e => setDonationFormData({ ...donationFormData, date: e.target.value })} required /></div>
                            <div className="space-y-2">
                              <Label htmlFor="method">Method</Label>
                              <Select value={donationFormData.method} onValueChange={v => setDonationFormData({ ...donationFormData, method: v })}>
                                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="year">Year</Label>
                              <Select value={donationFormData.year} onValueChange={v => setDonationFormData({ ...donationFormData, year: v })}>
                                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                                <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Months Paid</Label>
                              <div className="grid grid-cols-4 gap-2">
                                {monthNames.map((m, i) => (
                                  <Button key={i} type="button" variant={donationFormData.months_paid.includes(i + 1) ? "default" : "outline"} size="sm" onClick={() => toggleMonthPaid(i + 1)}>{m}</Button>
                                ))}
                              </div>
                            </div>
                            <Button type="submit" className="w-full">{editingDonation ? "Update Donation" : "Record Donation"}</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Card className="mb-4 shadow-card">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Search className="h-5 w-5 text-muted-foreground" />
                          <Input placeholder="Search by donor name or card number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border-0 focus-visible:ring-0" />
                        </div>
                      </CardHeader>
                    </Card>

                    <Card className="shadow-card">
                      <CardHeader><CardTitle>All Donations ({filteredDonationsList.length})</CardTitle></CardHeader>
                      <CardContent>
                        {filteredDonationsList.length === 0 ? (
                          <p className="text-center text-muted-foreground">No donations found</p>
                        ) : (
                          <div className="space-y-3">
                            {filteredDonationsList.map(d => (
                              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                                <div>
                                  <p className="font-medium">{d.donors?.name}</p>
                                  <p className="text-sm text-muted-foreground">{d.donors?.card_number} • {new Date(d.date).toLocaleDateString()}</p>
                                  <p className="text-xs text-muted-foreground">{d.method} • Year: {d.year}</p>
                                  {d.months_paid?.length > 0 && (
                                    <p className="text-xs text-primary">Months: {d.months_paid.map((m: number) => monthNames[m - 1]).join(", ")}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <p className="font-bold text-primary">Rs. {Number(d.amount).toLocaleString()}</p>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="icon" onClick={() => handleEditDonation(d)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon" onClick={() => handleDeleteDonation(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
