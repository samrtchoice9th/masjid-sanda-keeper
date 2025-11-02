import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Edit, Trash2, Search, Send } from "lucide-react";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AdminDonors() {
  const [donors, setDonors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    root_no: "",
    card_number: "",
    phone: "",
    monthly_sanda_amount: "",
    address: "",
    nic_or_id: "",
    whatsapp_no: "",
    status: "active",
  });
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDonors();
  }, []);

  const loadDonors = async () => {
    try {
      const { data, error } = await supabase
        .from("donors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDonors(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const submitData = {
        ...formData,
        monthly_sanda_amount: formData.monthly_sanda_amount ? parseFloat(formData.monthly_sanda_amount) : null,
      };

      if (editingDonor) {
        const { error } = await supabase
          .from("donors")
          .update(submitData)
          .eq("id", editingDonor.id);

        if (error) throw error;
        toast({ title: "Success", description: "Donor updated successfully" });
      } else {
        const { error } = await supabase
          .from("donors")
          .insert([submitData]);

        if (error) throw error;
        toast({ title: "Success", description: "Donor added successfully" });
      }

      setDialogOpen(false);
      resetForm();
      loadDonors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (donor: any) => {
    setEditingDonor(donor);
    setFormData({
      name: donor.name,
      root_no: donor.root_no || "",
      card_number: donor.card_number,
      phone: donor.phone || "",
      monthly_sanda_amount: donor.monthly_sanda_amount?.toString() || "",
      address: donor.address || "",
      nic_or_id: donor.nic_or_id || "",
      whatsapp_no: donor.whatsapp_no || "",
      status: donor.status || "active",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this donor?")) return;

    try {
      const { error } = await supabase
        .from("donors")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Donor deleted successfully" });
      loadDonors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      root_no: "",
      card_number: "",
      phone: "",
      monthly_sanda_amount: "",
      address: "",
      nic_or_id: "",
      whatsapp_no: "",
      status: "active",
    });
    setEditingDonor(null);
  };

  const handleSendReminder = async (donorId: string, donorName: string) => {
    setSendingReminder(donorId);
    try {
      const { data, error } = await supabase.functions.invoke('send-sanda-reminders', {
        body: { donorId }
      });

      if (error) throw error;

      toast({
        title: "Reminder Sent",
        description: `WhatsApp reminder sent to ${donorName}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const filteredDonors = donors.filter(
    (donor) =>
      donor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donor.card_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Manage Donors</h1>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Donor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDonor ? "Edit Donor" : "Add New Donor"}</DialogTitle>
                <DialogDescription>Fill in the donor information below</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="root_no">Root No. *</Label>
                  <Select
                    value={formData.root_no}
                    onValueChange={(value) => setFormData({ ...formData, root_no: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Root No." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Root-1">Root-1</SelectItem>
                      <SelectItem value="Root-2">Root-2</SelectItem>
                      <SelectItem value="Root-3">Root-3</SelectItem>
                      <SelectItem value="Root-4">Root-4</SelectItem>
                      <SelectItem value="Root-5">Root-5</SelectItem>
                      <SelectItem value="Root-6">Root-6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card_number">Card No. *</Label>
                  <Input
                    id="card_number"
                    value={formData.card_number}
                    onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
                    placeholder="CARD-12345"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+94-77-xxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_sanda_amount">Monthly Sanda Amount (Rs.) *</Label>
                  <Input
                    id="monthly_sanda_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthly_sanda_amount}
                    onChange={(e) => setFormData({ ...formData, monthly_sanda_amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nic_or_id">NIC / ID</Label>
                  <Input
                    id="nic_or_id"
                    value={formData.nic_or_id}
                    onChange={(e) => setFormData({ ...formData, nic_or_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_no">WhatsApp Number (with country code)</Label>
                  <Input
                    id="whatsapp_no"
                    placeholder="+94771234567"
                    value={formData.whatsapp_no}
                    onChange={(e) => setFormData({ ...formData, whatsapp_no: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {editingDonor ? "Update Donor" : "Add Donor"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6 shadow-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name or card number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 focus-visible:ring-0"
              />
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>All Donors ({filteredDonors.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDonors.length === 0 ? (
              <p className="text-center text-muted-foreground">No donors found</p>
            ) : (
              <div className="space-y-3">
                {filteredDonors.map((donor) => (
                  <div
                    key={donor.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="font-medium">{donor.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {donor.root_no && `${donor.root_no} • `}
                        {donor.card_number}
                        {donor.phone && ` • ${donor.phone}`}
                      </p>
                      {donor.monthly_sanda_amount && (
                        <p className="text-xs text-primary font-semibold">
                          Monthly Sanda: Rs. {Number(donor.monthly_sanda_amount).toLocaleString()}
                        </p>
                      )}
                      {donor.address && (
                        <p className="text-xs text-muted-foreground">{donor.address}</p>
                      )}
                      {donor.whatsapp_no && (
                        <p className="text-xs text-muted-foreground">WhatsApp: {donor.whatsapp_no}</p>
                      )}
                      <Badge variant={donor.status === "active" ? "default" : "secondary"} className="mt-1">
                        {donor.status || "active"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(donor)}
                        title="Edit Donor"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleSendReminder(donor.id, donor.name)}
                        disabled={!donor.whatsapp_no || sendingReminder === donor.id}
                        title="Send WhatsApp Reminder"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(donor.id)}
                        title="Delete Donor"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
