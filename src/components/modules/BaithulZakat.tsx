import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ZakatTransaction {
  id: string;
  type: "collection" | "distribution";
  amount: number;
  date: string;
  donor_name: string | null;
  recipient_name: string | null;
  purpose: string | null;
  method: string | null;
  notes: string | null;
  family_id: string | null;
  created_at: string;
}

interface Family {
  id: string;
  family_name: string;
  address: string | null;
  phone: string | null;
  root_no: string | null;
  zakat_status: string | null;
}

export function BaithulZakat() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<ZakatTransaction[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "collection" | "distribution">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ZakatTransaction | null>(null);

  const [formData, setFormData] = useState({
    type: "collection" as "collection" | "distribution",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    donor_name: "",
    recipient_name: "",
    purpose: "",
    method: "cash",
    notes: "",
    family_id: "",
  });

  const [stats, setStats] = useState({
    collected: 0,
    distributed: 0,
    balance: 0,
  });

  useEffect(() => {
    loadTransactions();
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from("families")
        .select("id, family_name, address, phone, root_no, zakat_status")
        .order("family_name");
      if (error) throw error;
      setFamilies((data || []) as Family[]);
    } catch (error: any) {
      console.error("Error loading families:", error);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("zakat_transactions")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      
      const txns = (data || []) as ZakatTransaction[];
      setTransactions(txns);
      
      // Calculate stats
      const collected = txns
        .filter((t) => t.type === "collection")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const distributed = txns
        .filter((t) => t.type === "distribution")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      setStats({
        collected,
        distributed,
        balance: collected - distributed,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleFamilySelect = (familyId: string) => {
    const selectedFamily = families.find(f => f.id === familyId);
    if (selectedFamily) {
      setFormData(prev => ({
        ...prev,
        family_id: familyId,
        donor_name: prev.type === "collection" ? selectedFamily.family_name : prev.donor_name,
        recipient_name: prev.type === "distribution" ? selectedFamily.family_name : prev.recipient_name,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        donor_name: formData.type === "collection" ? formData.donor_name : null,
        recipient_name: formData.type === "distribution" ? formData.recipient_name : null,
        purpose: formData.purpose || null,
        method: formData.method,
        notes: formData.notes || null,
        family_id: formData.family_id || null,
      };

      if (editing) {
        const { error } = await supabase
          .from("zakat_transactions")
          .update(submitData)
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Success", description: "Transaction updated successfully" });
      } else {
        const { error } = await supabase.from("zakat_transactions").insert([submitData]);
        if (error) throw error;
        toast({ title: "Success", description: "Transaction recorded successfully" });
      }
      setDialogOpen(false);
      resetForm();
      loadTransactions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (txn: ZakatTransaction) => {
    setEditing(txn);
    setFormData({
      type: txn.type,
      amount: txn.amount.toString(),
      date: txn.date,
      donor_name: txn.donor_name || "",
      recipient_name: txn.recipient_name || "",
      purpose: txn.purpose || "",
      method: txn.method || "cash",
      notes: txn.notes || "",
      family_id: txn.family_id || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const { error } = await supabase.from("zakat_transactions").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Transaction deleted successfully" });
      loadTransactions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      type: "collection",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      donor_name: "",
      recipient_name: "",
      purpose: "",
      method: "cash",
      notes: "",
      family_id: "",
    });
    setEditing(null);
  };

  // Filter families by zakat status based on transaction type
  const getFilteredFamilies = () => {
    if (formData.type === "collection") {
      // For collections, show families with "given" status (donors)
      return families.filter(f => f.zakat_status === "given");
    } else {
      // For distributions, show families with "taker" status (recipients)
      return families.filter(f => f.zakat_status === "taker");
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.donor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.purpose?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "all" || t.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Baithul Zakat</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Transaction</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Transaction" : "Record New Transaction"}</DialogTitle>
              <DialogDescription>Enter transaction details below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Transaction Type *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formData.type === "collection" ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, type: "collection", family_id: "", donor_name: "", recipient_name: "" })}
                    className="w-full"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />Collection
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === "distribution" ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, type: "distribution", family_id: "", donor_name: "", recipient_name: "" })}
                    className="w-full"
                  >
                    <TrendingDown className="mr-2 h-4 w-4" />Distribution
                  </Button>
                </div>
              </div>

              {/* Family Selection */}
              <div className="space-y-2">
                <Label>Select from Family (Optional)</Label>
                <SearchableSelect
                  options={getFilteredFamilies().map(f => ({ 
                    value: f.id, 
                    label: `${f.family_name}${f.root_no ? ` (${f.root_no})` : ""}` 
                  }))}
                  value={formData.family_id}
                  onValueChange={handleFamilySelect}
                  placeholder={formData.type === "collection" ? "Select Zakat Donor family..." : "Select Zakat Recipient family..."}
                  searchPlaceholder="Search family..."
                  emptyMessage={formData.type === "collection" 
                    ? "No families with 'Zakat Given' status found" 
                    : "No families with 'Zakat Taker' status found"}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.type === "collection" 
                    ? "Shows families marked as 'Zakat Given' in Data Collection" 
                    : "Shows families marked as 'Zakat Taker' in Data Collection"}
                </p>
              </div>

              {/* Show selected family details */}
              {formData.family_id && (() => {
                const selectedFamily = families.find(f => f.id === formData.family_id);
                return selectedFamily && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Root:</span> {selectedFamily.root_no || "N/A"}</p>
                    <p><span className="text-muted-foreground">Address:</span> {selectedFamily.address || "N/A"}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selectedFamily.phone || "N/A"}</p>
                  </div>
                );
              })()}

              {formData.type === "collection" && (
                <div className="space-y-2">
                  <Label htmlFor="donor_name">Donor Name</Label>
                  <Input
                    id="donor_name"
                    value={formData.donor_name}
                    onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
                    placeholder="Enter donor name"
                  />
                </div>
              )}

              {formData.type === "distribution" && (
                <div className="space-y-2">
                  <Label htmlFor="recipient_name">Recipient Name</Label>
                  <Input
                    id="recipient_name"
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                    placeholder="Enter recipient name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (Rs.) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Method</Label>
                <SearchableSelect
                  options={[
                    { value: "cash", label: "Cash" },
                    { value: "bank_transfer", label: "Bank Transfer" },
                    { value: "cheque", label: "Cheque" },
                  ]}
                  value={formData.method}
                  onValueChange={(v) => setFormData({ ...formData, method: v })}
                  placeholder="Select method"
                  searchPlaceholder="Search..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Input
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g., Medical assistance, Education"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full">
                {editing ? "Update Transaction" : "Record Transaction"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">Rs. {stats.collected.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Distributed</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">Rs. {stats.distributed.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Rs. {stats.balance.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="collection">Collections</TabsTrigger>
          <TabsTrigger value="distribution">Distributions</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="mb-4 shadow-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name or purpose..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0"
            />
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground">No transactions found</p>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={txn.type === "collection" ? "default" : "secondary"}
                        className={txn.type === "collection" ? "bg-green-600" : "bg-red-600 text-white"}
                      >
                        {txn.type === "collection" ? "Collection" : "Distribution"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{txn.method}</span>
                    </div>
                    <p className="font-medium">
                      {txn.type === "collection" ? txn.donor_name || "Anonymous" : txn.recipient_name || "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(txn.date).toLocaleDateString()}
                      {txn.purpose && ` • ${txn.purpose}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`font-bold ${txn.type === "collection" ? "text-green-700" : "text-red-700"}`}>
                      {txn.type === "collection" ? "+" : "-"} Rs. {Number(txn.amount).toLocaleString()}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(txn)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(txn.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
