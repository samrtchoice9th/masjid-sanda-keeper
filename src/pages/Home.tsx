import { useState, useEffect } from "react";
import { FileText, Phone, CreditCard, CheckCircle, XCircle, LogOut, Users, DollarSign, TrendingUp, Plus, Edit, Trash2, Search, ArrowLeft, Download, Home, Wallet, MessageCircle, MapPin, Briefcase, HandHeart } from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { generateSandaReceipt, generateWhatsAppReceiptText, shareReceiptViaWhatsApp } from "@/utils/receiptGenerator";
import { Dashboard } from "@/components/Dashboard";
import { DataCollection } from "@/components/modules/DataCollection";
import { BaithulZakat } from "@/components/modules/BaithulZakat";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AdminView = "dashboard" | "sanda-donations" | "data-collection" | "baithul-zakat";

interface Family {
  id: string;
  family_name: string;
  address: string | null;
  phone: string | null;
  root_no: string | null;
  whatsapp_no: string | null;
  sanda_card_number: string | null;
  sanda_amount_type: string | null;
  sanda_amount: number | null;
  zakat_status: string | null;
}

export default function HomePage() {
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
  const [family, setFamily] = useState<Family | null>(null);
  const [allFamilies, setAllFamilies] = useState<Family[]>([]);
  const [filteredFamilies, setFilteredFamilies] = useState<Family[]>([]);
  const [paidMonths, setPaidMonths] = useState<number[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [lookupFamilyMembers, setLookupFamilyMembers] = useState<any[]>([]);
  const [lookupZakatTransactions, setLookupZakatTransactions] = useState<any[]>([]);
  const [lookupDonationHistory, setLookupDonationHistory] = useState<any[]>([]);

  // Admin state
  const [adminView, setAdminView] = useState<AdminView>("dashboard");
  const [stats, setStats] = useState({ totalFamilies: 0, totalDonations: 0, monthlyTotal: 0 });
  const [recentDonations, setRecentDonations] = useState<any[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [donationDialogOpen, setDonationDialogOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<any>(null);

  // Form data
  const [donationFormData, setDonationFormData] = useState({
    family_id: "", amount: "", date: new Date().toISOString().split("T")[0],
    method: "cash", year: new Date().getFullYear().toString(), months_paid: [] as number[],
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2024 + 2 }, (_, i) => 2024 + i);

  // Fetch all families on mount
  useEffect(() => {
    fetchAllFamilies();
  }, []);

  // Load admin data when authenticated
  useEffect(() => {
    if (user && isAdmin) {
      loadStats();
      loadRecentDonations();
      loadFamilies();
      loadDonations();
    }
  }, [user, isAdmin]);

  const fetchAllFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from("families")
        .select("id, family_name, address, phone, root_no, whatsapp_no, sanda_card_number, sanda_amount_type, sanda_amount, zakat_status")
        .not("sanda_card_number", "is", null)
        .order("sanda_card_number");
      if (error) throw error;
      setAllFamilies((data || []) as Family[]);
    } catch (error: any) {
      console.error("Error fetching families:", error);
    }
  };

  // Filter families by root
  useEffect(() => {
    if (selectedRoot) {
      const filtered = allFamilies.filter(f => f.root_no === selectedRoot);
      setFilteredFamilies(filtered);
    } else {
      setFilteredFamilies([]);
    }
    setSelectedCardNumber("");
    setFamily(null);
    setPaidMonths([]);
  }, [selectedRoot, allFamilies]);

  // Fetch family details when card is selected
  useEffect(() => {
    if (selectedCardNumber) handleCardSelection();
    else { setFamily(null); setPaidMonths([]); }
  }, [selectedCardNumber]);

  // Fetch paid months when year is selected
  useEffect(() => {
    if (selectedYear && family) fetchPaidMonthsForYear();
    else setPaidMonths([]);
  }, [selectedYear, family]);

  const handleCardSelection = async () => {
    setLookupLoading(true);
    setNotFound(false);
    setLookupFamilyMembers([]);
    setLookupZakatTransactions([]);
    setLookupDonationHistory([]);
    try {
      const { data: familyData, error } = await supabase
        .from("families")
        .select("id, family_name, address, phone, root_no, whatsapp_no, sanda_card_number, sanda_amount_type, sanda_amount, zakat_status")
        .eq("sanda_card_number", selectedCardNumber)
        .maybeSingle();
      if (error) throw error;
      if (!familyData) { setNotFound(true); return; }
      setFamily(familyData as Family);
      
      // Fetch additional data in parallel
      const [membersResult, zakatResult, donationsResult] = await Promise.all([
        supabase.from("family_members").select("*").eq("family_id", familyData.id).order("created_at"),
        supabase.from("zakat_transactions").select("*").eq("family_id", familyData.id).order("date", { ascending: false }),
        supabase.from("donations").select("*").eq("family_id", familyData.id).order("date", { ascending: false }),
      ]);
      
      setLookupFamilyMembers(membersResult.data || []);
      setLookupZakatTransactions(zakatResult.data || []);
      setLookupDonationHistory(donationsResult.data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLookupLoading(false);
    }
  };

  const fetchPaidMonthsForYear = async () => {
    if (!family || !selectedYear) return;
    try {
      const { data, error } = await supabase.from("donations").select("months_paid")
        .eq("family_id", family.id).eq("year", parseInt(selectedYear));
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
      const { count: familiesCount } = await supabase
        .from("families")
        .select("*", { count: "exact", head: true })
        .not("sanda_card_number", "is", null);
      const { count: donationsCount } = await supabase.from("donations").select("*", { count: "exact", head: true });
      const firstDayOfMonth = new Date(); firstDayOfMonth.setDate(1); firstDayOfMonth.setHours(0, 0, 0, 0);
      const { data: monthlyData } = await supabase.from("donations").select("amount").gte("date", firstDayOfMonth.toISOString());
      const monthlyTotal = monthlyData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
      setStats({ totalFamilies: familiesCount || 0, totalDonations: donationsCount || 0, monthlyTotal });
    } catch (error) { console.error("Error loading stats:", error); }
  };

  const loadRecentDonations = async () => {
    try {
      const { data } = await supabase.from("donations")
        .select(`*, families:family_id (family_name, sanda_card_number, root_no, phone, address, sanda_amount_type)`)
        .order("created_at", { ascending: false }).limit(5);
      setRecentDonations(data || []);
    } catch (error) { console.error("Error loading recent donations:", error); }
  };

  const loadFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from("families")
        .select("id, family_name, address, phone, root_no, whatsapp_no, sanda_card_number, sanda_amount_type, sanda_amount, zakat_status")
        .not("sanda_card_number", "is", null)
        .order("sanda_card_number");
      if (error) throw error;
      setFamilies((data || []) as Family[]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const loadDonations = async () => {
    try {
      const { data, error } = await supabase.from("donations")
        .select(`*, families:family_id (family_name, sanda_card_number, root_no, phone, address, sanda_amount_type)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDonations(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Donation CRUD
  const handleDonationSubmit = async (e: React.FormEvent, generateReceipt: boolean = false) => {
    e.preventDefault();
    try {
      const submitData = {
        family_id: donationFormData.family_id,
        donor_id: donationFormData.family_id, // Keep for backward compatibility
        amount: parseFloat(donationFormData.amount),
        date: donationFormData.date,
        method: donationFormData.method,
        year: parseInt(donationFormData.year),
        months_paid: donationFormData.months_paid,
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
      
      // Generate receipt if requested
      if (generateReceipt) {
        const selectedFamily = families.find(f => f.id === donationFormData.family_id);
        if (selectedFamily) {
          await generateSandaReceipt({
            donorName: selectedFamily.family_name,
            cardNumber: selectedFamily.sanda_card_number || "",
            rootNo: selectedFamily.root_no,
            phone: selectedFamily.phone,
            address: selectedFamily.address,
            amount: parseFloat(donationFormData.amount),
            date: donationFormData.date,
            method: donationFormData.method,
            year: parseInt(donationFormData.year),
            monthsPaid: donationFormData.months_paid,
            paymentFrequency: selectedFamily.sanda_amount_type || "monthly",
          });
        }
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

  // Generate receipt for existing donation
  const handleDownloadReceipt = async (donation: any) => {
    const familyInfo = donation.families || families.find((f: Family) => f.id === donation.family_id);
    if (!familyInfo) {
      toast({ title: "Error", description: "Family information not found", variant: "destructive" });
      return;
    }
    
    await generateSandaReceipt({
      donorName: familyInfo.family_name,
      cardNumber: familyInfo.sanda_card_number || "",
      rootNo: familyInfo.root_no,
      phone: familyInfo.phone,
      address: familyInfo.address,
      amount: Number(donation.amount),
      date: donation.date,
      method: donation.method,
      year: donation.year,
      monthsPaid: donation.months_paid || [],
      paymentFrequency: familyInfo.sanda_amount_type || "monthly",
    });
    
    toast({ title: "Success", description: "Receipt downloaded successfully" });
  };

  // Send receipt via WhatsApp
  const handleWhatsAppReceipt = (donation: any) => {
    const familyInfo = donation.families || families.find((f: Family) => f.id === donation.family_id);
    if (!familyInfo) {
      toast({ title: "Error", description: "Family information not found", variant: "destructive" });
      return;
    }
    
    const receiptText = generateWhatsAppReceiptText({
      donorName: familyInfo.family_name,
      cardNumber: familyInfo.sanda_card_number || "",
      rootNo: familyInfo.root_no,
      amount: Number(donation.amount),
      date: donation.date,
      method: donation.method,
      year: donation.year,
      monthsPaid: donation.months_paid || [],
    });
    
    shareReceiptViaWhatsApp(familyInfo.whatsapp_no, receiptText);
    toast({ title: "Opening WhatsApp", description: familyInfo.whatsapp_no ? "Sending to family's WhatsApp number" : "Please select a contact" });
  };

  // Handle Save & WhatsApp from form
  const handleSaveAndWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        family_id: donationFormData.family_id,
        donor_id: donationFormData.family_id,
        amount: parseFloat(donationFormData.amount),
        date: donationFormData.date,
        method: donationFormData.method,
        year: parseInt(donationFormData.year),
        months_paid: donationFormData.months_paid,
      };
      
      const { error } = await supabase.from("donations").insert([submitData]);
      if (error) throw error;
      toast({ title: "Success", description: "Donation recorded successfully" });
      
      // Send via WhatsApp
      const selectedFamily = families.find(f => f.id === donationFormData.family_id);
      if (selectedFamily) {
        const receiptText = generateWhatsAppReceiptText({
          donorName: selectedFamily.family_name,
          cardNumber: selectedFamily.sanda_card_number || "",
          rootNo: selectedFamily.root_no,
          amount: parseFloat(donationFormData.amount),
          date: donationFormData.date,
          method: donationFormData.method,
          year: parseInt(donationFormData.year),
          monthsPaid: donationFormData.months_paid,
        });
        
        shareReceiptViaWhatsApp(selectedFamily.whatsapp_no, receiptText);
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
      family_id: d.family_id || d.donor_id,
      amount: d.amount?.toString() || "",
      date: d.date || new Date().toISOString().split("T")[0],
      method: d.method || "cash",
      year: d.year?.toString() || new Date().getFullYear().toString(),
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
    setDonationFormData({ family_id: "", amount: "", date: new Date().toISOString().split("T")[0], method: "cash", year: new Date().getFullYear().toString(), months_paid: [] });
    setEditingDonation(null);
  };

  const toggleMonthPaid = (month: number) => {
    const selectedFamily = families.find(f => f.id === donationFormData.family_id);
    const monthlyRate = selectedFamily?.sanda_amount || 0;
    const isYearly = selectedFamily?.sanda_amount_type === "yearly";
    
    setDonationFormData(prev => {
      const newMonthsPaid = prev.months_paid.includes(month) 
        ? prev.months_paid.filter(m => m !== month)
        : [...prev.months_paid, month].sort((a, b) => a - b);
      
      const newAmount = isYearly 
        ? monthlyRate 
        : monthlyRate * newMonthsPaid.length;
      
      return {
        ...prev,
        months_paid: newMonthsPaid,
        amount: newAmount.toString()
      };
    });
  };

  const filteredDonationsList = donations.filter(d => 
    d.families?.family_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.families?.sanda_card_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="public">Check Family Details</TabsTrigger>
            <TabsTrigger value="admin">Admin Panel</TabsTrigger>
          </TabsList>

          {/* PUBLIC LOOKUP TAB */}
          <TabsContent value="public">
            <div className="mx-auto max-w-2xl">
              <div className="mb-6 text-center">
                <h2 className="mb-2 text-2xl sm:text-3xl font-bold text-foreground">Check Family Details</h2>
                <p className="text-sm sm:text-base text-muted-foreground">Select your root and card number to view your family details and payment history</p>
              </div>

              <Card className="mb-6 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Lookup Family Record</CardTitle>
                  <CardDescription>Select your root number and card number below</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Root No.</label>
                    <SearchableSelect
                      options={["Root-1", "Root-2", "Root-3", "Root-4", "Root-5", "Root-6"].map(root => ({ value: root, label: root }))}
                      value={selectedRoot}
                      onValueChange={setSelectedRoot}
                      placeholder="Select Root No."
                      searchPlaceholder="Search root..."
                    />
                  </div>

                  {selectedRoot && (
                    <div>
                      <label className="mb-2 block text-sm font-medium">Card No.</label>
                      <SearchableSelect
                        options={filteredFamilies.map(f => ({ value: f.sanda_card_number || "", label: `${f.sanda_card_number} - ${f.family_name}` }))}
                        value={selectedCardNumber}
                        onValueChange={setSelectedCardNumber}
                        placeholder="Select Card No."
                        searchPlaceholder="Search card or name..."
                      />
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

              {family && (
                <Card className="shadow-card">
                  <CardContent className="p-0">
                    <Accordion type="multiple" defaultValue={["family-info"]} className="w-full">
                      {/* Section 1: Family Information */}
                      <AccordionItem value="family-info" className="border-b">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Family Information</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium text-sm">{family.family_name}</p></div>
                            </div>
                            <div className="flex items-start gap-2">
                              <CreditCard className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <div><p className="text-xs text-muted-foreground">Card Number</p><p className="font-medium text-sm">{family.sanda_card_number}</p></div>
                            </div>
                            {family.root_no && (
                              <div className="flex items-start gap-2">
                                <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                <div><p className="text-xs text-muted-foreground">Root No.</p><p className="font-medium text-sm">{family.root_no}</p></div>
                              </div>
                            )}
                            {family.phone && (
                              <div className="flex items-start gap-2">
                                <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium text-sm">{family.phone}</p></div>
                              </div>
                            )}
                            {family.whatsapp_no && (
                              <div className="flex items-start gap-2">
                                <MessageCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                <div><p className="text-xs text-muted-foreground">WhatsApp</p><p className="font-medium text-sm">{family.whatsapp_no}</p></div>
                              </div>
                            )}
                            {family.address && (
                              <div className="flex items-start gap-2 sm:col-span-2">
                                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                <div><p className="text-xs text-muted-foreground">Address</p><p className="font-medium text-sm">{family.address}</p></div>
                              </div>
                            )}
                            {family.zakat_status && family.zakat_status !== "none" && (
                              <div className="flex items-start gap-2">
                                <HandHeart className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Zakat Status</p>
                                  <Badge variant={family.zakat_status === "given" ? "default" : "secondary"} className="mt-0.5">
                                    {family.zakat_status === "given" ? "Zakat Giver" : family.zakat_status === "taker" ? "Zakat Taker" : family.zakat_status}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Section 2: Family Members */}
                      <AccordionItem value="family-members" className="border-b">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold">Family Members</span>
                            <Badge variant="outline" className="ml-2">{lookupFamilyMembers.length}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          {lookupFamilyMembers.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-4">No family members recorded</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Name</TableHead>
                                    <TableHead className="text-xs">Relation</TableHead>
                                    <TableHead className="text-xs">Gender</TableHead>
                                    <TableHead className="text-xs">Age</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {lookupFamilyMembers.map((member) => (
                                    <TableRow key={member.id}>
                                      <TableCell className="text-sm font-medium">{member.name}</TableCell>
                                      <TableCell className="text-sm">{member.relationship || "-"}</TableCell>
                                      <TableCell className="text-sm">{member.gender || "-"}</TableCell>
                                      <TableCell className="text-sm">{member.age || "-"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>

                      {/* Section 3: Sanda Payment Details */}
                      <AccordionItem value="sanda-details" className="border-b">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Sanda Payment Details</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Payment Type</p>
                                <Badge variant="outline" className="mt-1">
                                  {family.sanda_amount_type === "yearly" ? "Yearly" : "Monthly"}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {family.sanda_amount_type === "yearly" ? "Yearly Amount" : "Monthly Amount"}
                                </p>
                                <p className="font-semibold text-sm">Rs. {family.sanda_amount ? Number(family.sanda_amount).toLocaleString() : 'N/A'}</p>
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs text-muted-foreground mb-2 block">Select Year to View Payments</Label>
                              <SearchableSelect
                                options={years.map(y => ({ value: y.toString(), label: y.toString() }))}
                                value={selectedYear}
                                onValueChange={setSelectedYear}
                                placeholder="Select Year"
                                searchPlaceholder="Search year..."
                              />
                            </div>

                            {selectedYear && (
                              <div className="space-y-4">
                                {/* Paid Months */}
                                <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900 dark:bg-green-950/50">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Paid Months ({paidMonths.length})</span>
                                  </div>
                                  {paidMonths.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No payments recorded for {selectedYear}</p>
                                  ) : (
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                      {paidMonths.map(m => (
                                        <div key={m} className="rounded border border-green-300 bg-green-100 p-1.5 text-center dark:border-green-800 dark:bg-green-900">
                                          <p className="text-xs font-medium text-green-700 dark:text-green-300">{monthNames[m - 1]}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Unpaid Months */}
                                <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/50">
                                  <div className="flex items-center gap-2 mb-2">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <span className="text-sm font-medium text-red-700 dark:text-red-300">Unpaid Months ({unpaidMonths.length})</span>
                                  </div>
                                  {unpaidMonths.length === 0 ? (
                                    <p className="text-sm text-green-600">All months paid!</p>
                                  ) : (
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                      {unpaidMonths.map(m => (
                                        <div key={m} className="rounded border border-red-300 bg-red-100 p-1.5 text-center dark:border-red-800 dark:bg-red-900">
                                          <p className="text-xs font-medium text-red-700 dark:text-red-300">{monthNames[m - 1]}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Total Paid Summary */}
                                {paidMonths.length > 0 && (
                                  <div className="rounded-lg bg-muted/50 p-3">
                                    <p className="text-xs text-muted-foreground">Total Paid ({selectedYear})</p>
                                    <p className="text-lg font-bold text-primary">
                                      Rs. {family.sanda_amount_type === "yearly" 
                                        ? Number(family.sanda_amount || 0).toLocaleString()
                                        : (Number(family.sanda_amount || 0) * paidMonths.length).toLocaleString()
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Section 4: Baithul Zakat History */}
                      <AccordionItem value="zakat-history">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center gap-2">
                            <HandHeart className="h-4 w-4 text-emerald-500" />
                            <span className="font-semibold">Baithul Zakat History</span>
                            {lookupZakatTransactions.length > 0 && (
                              <Badge variant="outline" className="ml-2">{lookupZakatTransactions.length}</Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          {lookupZakatTransactions.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-4">No zakat transactions recorded for this family</p>
                          ) : (
                            <div className="space-y-4">
                              {/* Zakat Summary */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/50">
                                  <p className="text-xs text-muted-foreground">Total Given</p>
                                  <p className="text-lg font-bold text-emerald-600">
                                    Rs. {lookupZakatTransactions
                                      .filter(t => t.type === "collection")
                                      .reduce((sum, t) => sum + Number(t.amount), 0)
                                      .toLocaleString()}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/50">
                                  <p className="text-xs text-muted-foreground">Total Received</p>
                                  <p className="text-lg font-bold text-blue-600">
                                    Rs. {lookupZakatTransactions
                                      .filter(t => t.type === "distribution")
                                      .reduce((sum, t) => sum + Number(t.amount), 0)
                                      .toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {/* Transaction List */}
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Recent Transactions</p>
                                <div className="space-y-2">
                                  {lookupZakatTransactions.slice(0, 5).map((t) => (
                                    <div key={t.id} className="flex items-center justify-between rounded-lg border p-2.5">
                                      <div className="flex items-center gap-2">
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                          t.type === "collection" 
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" 
                                            : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                        }`}>
                                          {t.type === "collection" ? "+" : "-"}
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium">
                                            {t.type === "collection" ? "Given" : "Received"}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                          </p>
                                        </div>
                                      </div>
                                      <p className={`font-semibold ${
                                        t.type === "collection" ? "text-emerald-600" : "text-blue-600"
                                      }`}>
                                        Rs. {Number(t.amount).toLocaleString()}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
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
                      <h2 className="text-2xl font-bold">Masjid Management</h2>
                      <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</Button>
                    </div>

                    {/* Dashboard Summary Cards */}
                    <Dashboard />

                    {/* Module Navigation Cards */}
                    <h3 className="text-lg font-semibold mt-8 mb-4">Modules</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card 
                        className="cursor-pointer shadow-card transition-all hover:shadow-lg border-l-4 border-l-primary" 
                        onClick={() => setAdminView("sanda-donations")}
                      >
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Wallet className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">Sanda Donation</CardTitle>
                              <CardDescription>Record & manage donations</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                      <Card 
                        className="cursor-pointer shadow-card transition-all hover:shadow-lg border-l-4 border-l-blue-500" 
                        onClick={() => setAdminView("data-collection")}
                      >
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                              <Home className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                              <CardTitle className="text-base">All Data</CardTitle>
                              <CardDescription>Family & member records</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                      <Card 
                        className="cursor-pointer shadow-card transition-all hover:shadow-lg border-l-4 border-l-emerald-500" 
                        onClick={() => setAdminView("baithul-zakat")}
                      >
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                              <TrendingUp className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                              <CardTitle className="text-base">Baithul Zakat</CardTitle>
                              <CardDescription>Zakat collection & distribution</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </div>

                    {/* Recent Donations */}
                    <Card className="shadow-card mt-6">
                      <CardHeader><CardTitle>Recent Sanda Donations</CardTitle><CardDescription>Latest 5 donation records</CardDescription></CardHeader>
                      <CardContent>
                        {recentDonations.length === 0 ? (
                          <p className="text-center text-muted-foreground">No donations yet</p>
                        ) : (
                          <div className="space-y-3">
                            {recentDonations.map(d => (
                              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                                <div>
                                  <p className="font-medium">{d.families?.family_name}</p>
                                  <p className="text-sm text-muted-foreground">{d.families?.sanda_card_number} • {new Date(d.date).toLocaleDateString()}</p>
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

                {/* Sanda Donations View */}
                {adminView === "sanda-donations" && (
                  <>
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => setAdminView("dashboard")}><ArrowLeft className="h-4 w-4" /></Button>
                        <h2 className="text-2xl font-bold">Manage Sanda Donations</h2>
                      </div>
                      <Dialog open={donationDialogOpen} onOpenChange={(open) => { setDonationDialogOpen(open); if (!open) resetDonationForm(); }}>
                        <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Record Sanda</Button></DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{editingDonation ? "Edit Donation" : "Record New Sanda"}</DialogTitle>
                            <DialogDescription>Select a family to record their Sanda payment</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={(e) => handleDonationSubmit(e, false)} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="family_id">Family *</Label>
                              <SearchableSelect
                                options={families.map(f => ({ 
                                  value: f.id, 
                                  label: `${f.sanda_card_number} - ${f.family_name}${f.sanda_amount_type === "yearly" ? " (Yearly)" : ""}` 
                                }))}
                                value={donationFormData.family_id}
                                onValueChange={v => {
                                  const selectedFamily = families.find(f => f.id === v);
                                  const isYearly = selectedFamily?.sanda_amount_type === "yearly";
                                  const monthlyRate = selectedFamily?.sanda_amount || 0;
                                  
                                  const newMonthsPaid = isYearly ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [];
                                  const newAmount = isYearly ? monthlyRate : 0;
                                  
                                  setDonationFormData({ 
                                    ...donationFormData, 
                                    family_id: v,
                                    amount: newAmount.toString(),
                                    months_paid: newMonthsPaid
                                  });
                                }}
                                placeholder="Select Family"
                                searchPlaceholder="Search by card or name..."
                              />
                            </div>

                            {/* Show selected family details */}
                            {donationFormData.family_id && (() => {
                              const selectedFamily = families.find(f => f.id === donationFormData.family_id);
                              return selectedFamily && (
                                <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                                  <p><span className="text-muted-foreground">Root:</span> {selectedFamily.root_no}</p>
                                  <p><span className="text-muted-foreground">Address:</span> {selectedFamily.address || "N/A"}</p>
                                  <p><span className="text-muted-foreground">Phone:</span> {selectedFamily.phone || "N/A"}</p>
                                  <p><span className="text-muted-foreground">{selectedFamily.sanda_amount_type === "yearly" ? "Yearly" : "Monthly"} Amount:</span> Rs. {Number(selectedFamily.sanda_amount || 0).toLocaleString()}</p>
                                </div>
                              );
                            })()}

                            <div className="space-y-2"><Label htmlFor="amount">Amount (Rs.) *</Label><Input id="amount" type="number" value={donationFormData.amount} onChange={e => setDonationFormData({ ...donationFormData, amount: e.target.value })} required /></div>
                            <div className="space-y-2"><Label htmlFor="date">Date *</Label><Input id="date" type="date" value={donationFormData.date} onChange={e => setDonationFormData({ ...donationFormData, date: e.target.value })} required /></div>
                            <div className="space-y-2">
                              <Label htmlFor="method">Method</Label>
                              <SearchableSelect
                                options={[
                                  { value: "cash", label: "Cash" },
                                  { value: "bank_transfer", label: "Bank Transfer" },
                                  { value: "cheque", label: "Cheque" }
                                ]}
                                value={donationFormData.method}
                                onValueChange={v => setDonationFormData({ ...donationFormData, method: v })}
                                placeholder="Select method"
                                searchPlaceholder="Search method..."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="year">Year</Label>
                              <SearchableSelect
                                options={years.map(y => ({ value: y.toString(), label: y.toString() }))}
                                value={donationFormData.year}
                                onValueChange={v => setDonationFormData({ ...donationFormData, year: v })}
                                placeholder="Select year"
                                searchPlaceholder="Search year..."
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Months Paid</Label>
                                {(() => {
                                  const selectedFamily = families.find(f => f.id === donationFormData.family_id);
                                  return selectedFamily?.sanda_amount_type === "yearly" ? (
                                    <Badge variant="secondary" className="text-xs">Full Year Payment</Badge>
                                  ) : null;
                                })()}
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {monthNames.map((m, i) => {
                                  const selectedFamily = families.find(f => f.id === donationFormData.family_id);
                                  const isYearly = selectedFamily?.sanda_amount_type === "yearly";
                                  return (
                                    <Button 
                                      key={i} 
                                      type="button" 
                                      variant={donationFormData.months_paid.includes(i + 1) ? "default" : "outline"} 
                                      size="sm" 
                                      onClick={() => !isYearly && toggleMonthPaid(i + 1)}
                                      disabled={isYearly}
                                      className={isYearly ? "opacity-80" : ""}
                                    >
                                      {m}
                                    </Button>
                                  );
                                })}
                              </div>
                              {donationFormData.family_id && donationFormData.months_paid.length > 0 && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {(() => {
                                    const selectedFamily = families.find(f => f.id === donationFormData.family_id);
                                    const rate = selectedFamily?.sanda_amount || 0;
                                    const isYearly = selectedFamily?.sanda_amount_type === "yearly";
                                    if (isYearly) {
                                      return `Yearly payment: Rs. ${Number(rate).toLocaleString()}`;
                                    }
                                    return `Rs. ${Number(rate).toLocaleString()} × ${donationFormData.months_paid.length} month(s) = Rs. ${(Number(rate) * donationFormData.months_paid.length).toLocaleString()}`;
                                  })()}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button type="submit" className="flex-1">{editingDonation ? "Update Donation" : "Record Donation"}</Button>
                              {!editingDonation && (
                                <>
                                  <Button 
                                    type="button" 
                                    variant="secondary" 
                                    onClick={(e) => handleDonationSubmit(e, true)}
                                    className="flex items-center gap-2"
                                  >
                                    <Download className="h-4 w-4" />
                                    Save & Receipt
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={handleSaveAndWhatsApp}
                                    className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                    Save & WhatsApp
                                  </Button>
                                </>
                              )}
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Card className="mb-4 shadow-card">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Search className="h-5 w-5 text-muted-foreground" />
                          <Input placeholder="Search by family name or card number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border-0 focus-visible:ring-0" />
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
                                  <p className="font-medium">{d.families?.family_name}</p>
                                  <p className="text-sm text-muted-foreground">{d.families?.sanda_card_number} • {new Date(d.date).toLocaleDateString()}</p>
                                  <p className="text-xs text-muted-foreground">{d.method} • Year: {d.year}</p>
                                  {d.months_paid?.length > 0 && (
                                    <p className="text-xs text-primary">Months: {d.months_paid.map((m: number) => monthNames[m - 1]).join(", ")}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <p className="font-bold text-primary">Rs. {Number(d.amount).toLocaleString()}</p>
                                  <div className="flex gap-2">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="outline" size="icon" onClick={() => handleDownloadReceipt(d)}>
                                            <Download className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Download Receipt</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button 
                                            variant="outline" 
                                            size="icon" 
                                            onClick={() => handleWhatsAppReceipt(d)}
                                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                          >
                                            <MessageCircle className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {d.families?.whatsapp_no ? "Send via WhatsApp" : "Send via WhatsApp (no number saved)"}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
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

                {/* Data Collection Module */}
                {adminView === "data-collection" && (
                  <div>
                    <div className="mb-6 flex items-center gap-4">
                      <Button variant="outline" size="icon" onClick={() => setAdminView("dashboard")}><ArrowLeft className="h-4 w-4" /></Button>
                    </div>
                    <DataCollection />
                  </div>
                )}

                {/* Baithul Zakat Module */}
                {adminView === "baithul-zakat" && (
                  <div>
                    <div className="mb-6 flex items-center gap-4">
                      <Button variant="outline" size="icon" onClick={() => setAdminView("dashboard")}><ArrowLeft className="h-4 w-4" /></Button>
                    </div>
                    <BaithulZakat />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
