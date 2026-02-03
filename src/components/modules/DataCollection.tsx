import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Users, ChevronDown, ChevronUp, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Family {
  id: string;
  family_name: string;
  address: string | null;
  phone: string | null;
  root_no: string | null;
  total_members: number;
  notes: string | null;
  whatsapp_no: string | null;
  occupation: string | null;
  sanda_card_number: string | null;
  sanda_amount_type: string | null;
  sanda_amount: number | null;
  zakat_status: string | null;
  family_head_id: string | null;
  created_at: string;
}

interface FamilyMember {
  id: string;
  family_id: string;
  name: string;
  age: number | null;
  gender: string | null;
  relationship: string | null;
  occupation: string | null;
  created_at: string;
}

export function DataCollection() {
  const { toast } = useToast();
  const [families, setFamilies] = useState<Family[]>([]);
  const [members, setMembers] = useState<Record<string, FamilyMember[]>>({});
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);

  // Family form - now starts with first member data
  const [familyFormData, setFamilyFormData] = useState({
    address: "",
    phone: "",
    root_no: "",
    notes: "",
    whatsapp_no: "",
    occupation: "",
    sanda_card_number: "",
    sanda_amount_type: "monthly",
    sanda_amount: "",
    zakat_status: "none",
    // First member (head) data
    head_name: "",
    head_gender: "",
    head_age: "",
  });

  const [memberFormData, setMemberFormData] = useState({
    name: "",
    age: "",
    gender: "",
    relationship: "",
    occupation: "",
  });

  useEffect(() => {
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from("families")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFamilies((data || []) as Family[]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const loadMembers = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMembers((prev) => ({ ...prev, [familyId]: data || [] }));
    } catch (error: any) {
      console.error("Error loading members:", error);
    }
  };

  const handleToggleFamily = async (familyId: string) => {
    if (expandedFamily === familyId) {
      setExpandedFamily(null);
    } else {
      setExpandedFamily(familyId);
      if (!members[familyId]) {
        await loadMembers(familyId);
      }
    }
  };

  const handleFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFamily) {
        // Update existing family
        const { error } = await supabase
          .from("families")
          .update({
            address: familyFormData.address || null,
            phone: familyFormData.phone || null,
            root_no: familyFormData.root_no || null,
            notes: familyFormData.notes || null,
            whatsapp_no: familyFormData.whatsapp_no || null,
            occupation: familyFormData.occupation || null,
            sanda_card_number: familyFormData.sanda_card_number || null,
            sanda_amount_type: familyFormData.sanda_amount_type,
            sanda_amount: familyFormData.sanda_amount ? parseFloat(familyFormData.sanda_amount) : null,
            zakat_status: familyFormData.zakat_status,
          })
          .eq("id", editingFamily.id);
        if (error) throw error;
        toast({ title: "Success", description: "Family updated successfully" });
      } else {
        // Create new family with first member as head
        // Step 1: Create the family with head's name as family_name
        const { data: newFamily, error: familyError } = await supabase
          .from("families")
          .insert([{
            family_name: familyFormData.head_name,
            address: familyFormData.address || null,
            phone: familyFormData.phone || null,
            root_no: familyFormData.root_no || null,
            notes: familyFormData.notes || null,
            whatsapp_no: familyFormData.whatsapp_no || null,
            occupation: familyFormData.occupation || null,
            sanda_card_number: familyFormData.sanda_card_number || null,
            sanda_amount_type: familyFormData.sanda_amount_type,
            sanda_amount: familyFormData.sanda_amount ? parseFloat(familyFormData.sanda_amount) : null,
            zakat_status: familyFormData.zakat_status,
            total_members: 1,
          }])
          .select()
          .single();
        
        if (familyError) throw familyError;

        // Step 2: Create the head member
        const { data: newMember, error: memberError } = await supabase
          .from("family_members")
          .insert([{
            family_id: newFamily.id,
            name: familyFormData.head_name,
            gender: familyFormData.head_gender || null,
            age: familyFormData.head_age ? parseInt(familyFormData.head_age) : null,
            relationship: "Head",
            occupation: familyFormData.occupation || null,
          }])
          .select()
          .single();

        if (memberError) throw memberError;

        // Step 3: Update family with head member ID
        const { error: updateError } = await supabase
          .from("families")
          .update({ family_head_id: newMember.id })
          .eq("id", newFamily.id);

        if (updateError) throw updateError;

        toast({ title: "Success", description: "Family added successfully" });
      }
      setFamilyDialogOpen(false);
      resetFamilyForm();
      loadFamilies();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditFamily = (family: Family) => {
    setEditingFamily(family);
    setFamilyFormData({
      address: family.address || "",
      phone: family.phone || "",
      root_no: family.root_no || "",
      notes: family.notes || "",
      whatsapp_no: family.whatsapp_no || "",
      occupation: family.occupation || "",
      sanda_card_number: family.sanda_card_number || "",
      sanda_amount_type: family.sanda_amount_type || "monthly",
      sanda_amount: family.sanda_amount?.toString() || "",
      zakat_status: family.zakat_status || "none",
      head_name: family.family_name,
      head_gender: "",
      head_age: "",
    });
    setFamilyDialogOpen(true);
  };

  const handleDeleteFamily = async (id: string) => {
    if (!confirm("Are you sure? This will also delete all family members.")) return;
    try {
      const { error } = await supabase.from("families").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Family deleted successfully" });
      loadFamilies();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetFamilyForm = () => {
    setFamilyFormData({ 
      address: "", 
      phone: "", 
      root_no: "", 
      notes: "",
      whatsapp_no: "",
      occupation: "",
      sanda_card_number: "",
      sanda_amount_type: "monthly",
      sanda_amount: "",
      zakat_status: "none",
      head_name: "",
      head_gender: "",
      head_age: "",
    });
    setEditingFamily(null);
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamilyId) return;
    try {
      const submitData = {
        ...memberFormData,
        family_id: selectedFamilyId,
        age: memberFormData.age ? parseInt(memberFormData.age) : null,
      };
      
      if (editingMember) {
        const { error } = await supabase
          .from("family_members")
          .update(submitData)
          .eq("id", editingMember.id);
        if (error) throw error;
        toast({ title: "Success", description: "Member updated successfully" });
      } else {
        const { error } = await supabase.from("family_members").insert([submitData]);
        if (error) throw error;
        
        // Update family total_members count
        const family = families.find(f => f.id === selectedFamilyId);
        if (family) {
          await supabase
            .from("families")
            .update({ total_members: (family.total_members || 0) + 1 })
            .eq("id", selectedFamilyId);
        }
        
        toast({ title: "Success", description: "Member added successfully" });
      }
      setMemberDialogOpen(false);
      resetMemberForm();
      loadMembers(selectedFamilyId);
      loadFamilies();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    setSelectedFamilyId(member.family_id);
    setMemberFormData({
      name: member.name,
      age: member.age?.toString() || "",
      gender: member.gender || "",
      relationship: member.relationship || "",
      occupation: member.occupation || "",
    });
    setMemberDialogOpen(true);
  };

  const handleDeleteMember = async (member: FamilyMember) => {
    if (!confirm("Are you sure you want to delete this member?")) return;
    try {
      const { error } = await supabase.from("family_members").delete().eq("id", member.id);
      if (error) throw error;
      
      // Update family total_members count
      const family = families.find(f => f.id === member.family_id);
      if (family && family.total_members > 0) {
        await supabase
          .from("families")
          .update({ total_members: family.total_members - 1 })
          .eq("id", member.family_id);
      }
      
      toast({ title: "Success", description: "Member deleted successfully" });
      loadMembers(member.family_id);
      loadFamilies();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSetFamilyHead = async (familyId: string, memberId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from("families")
        .update({ 
          family_head_id: memberId,
          family_name: memberName 
        })
        .eq("id", familyId);
      if (error) throw error;
      toast({ title: "Success", description: "Family head updated" });
      loadFamilies();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetMemberForm = () => {
    setMemberFormData({ name: "", age: "", gender: "", relationship: "", occupation: "" });
    setEditingMember(null);
    setSelectedFamilyId(null);
  };

  const openAddMemberDialog = (familyId: string) => {
    setSelectedFamilyId(familyId);
    setMemberDialogOpen(true);
  };

  const getZakatStatusBadge = (status: string | null) => {
    switch (status) {
      case "given":
        return <Badge className="bg-green-600 text-white">Zakat Given</Badge>;
      case "taker":
        return <Badge className="bg-amber-600 text-white">Zakat Taker</Badge>;
      default:
        return null;
    }
  };

  const filteredFamilies = families.filter(
    (f) =>
      f.family_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.root_no && f.root_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.sanda_card_number && f.sanda_card_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Data Collection</h2>
        <Dialog open={familyDialogOpen} onOpenChange={(open) => { setFamilyDialogOpen(open); if (!open) resetFamilyForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Family</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFamily ? "Edit Family" : "Add New Family"}</DialogTitle>
              <DialogDescription>
                {editingFamily ? "Update family information below" : "Enter the family head's information to create a new family"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFamilySubmit} className="space-y-4">
              {/* Head Member Section - Only for new families */}
              {!editingFamily && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-4">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    <Label className="font-semibold text-primary">Family Head (First Member)</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="head_name">Name *</Label>
                    <Input
                      id="head_name"
                      value={familyFormData.head_name}
                      onChange={(e) => setFamilyFormData({ ...familyFormData, head_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="head_gender">Gender</Label>
                      <SearchableSelect
                        options={[
                          { value: "Male", label: "Male" },
                          { value: "Female", label: "Female" },
                        ]}
                        value={familyFormData.head_gender}
                        onValueChange={(v) => setFamilyFormData({ ...familyFormData, head_gender: v })}
                        placeholder="Select gender"
                        searchPlaceholder="Search..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="head_age">Age</Label>
                      <Input
                        id="head_age"
                        type="number"
                        value={familyFormData.head_age}
                        onChange={(e) => setFamilyFormData({ ...familyFormData, head_age: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Family Details Section */}
              <div className="space-y-4">
                <Label className="font-semibold">Family Details</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="root_no">Root No.</Label>
                  <SearchableSelect
                    options={["Root-1", "Root-2", "Root-3", "Root-4", "Root-5", "Root-6"].map((r) => ({ value: r, label: r }))}
                    value={familyFormData.root_no}
                    onValueChange={(v) => setFamilyFormData({ ...familyFormData, root_no: v })}
                    placeholder="Select Root No."
                    searchPlaceholder="Search root..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={familyFormData.address}
                    onChange={(e) => setFamilyFormData({ ...familyFormData, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={familyFormData.phone}
                      onChange={(e) => setFamilyFormData({ ...familyFormData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_no">WhatsApp No.</Label>
                    <Input
                      id="whatsapp_no"
                      value={familyFormData.whatsapp_no}
                      onChange={(e) => setFamilyFormData({ ...familyFormData, whatsapp_no: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={familyFormData.occupation}
                    onChange={(e) => setFamilyFormData({ ...familyFormData, occupation: e.target.value })}
                  />
                </div>
              </div>

              {/* Sanda Section */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                <Label className="font-semibold">Sanda Information</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="sanda_card_number">Sanda Card Number</Label>
                  <Input
                    id="sanda_card_number"
                    value={familyFormData.sanda_card_number}
                    onChange={(e) => setFamilyFormData({ ...familyFormData, sanda_card_number: e.target.value })}
                    placeholder="e.g., 01, 02, 03..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sanda_amount_type">Amount Type</Label>
                    <SearchableSelect
                      options={[
                        { value: "monthly", label: "Monthly" },
                        { value: "yearly", label: "Yearly" },
                      ]}
                      value={familyFormData.sanda_amount_type}
                      onValueChange={(v) => setFamilyFormData({ ...familyFormData, sanda_amount_type: v })}
                      placeholder="Select type"
                      searchPlaceholder="Search..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sanda_amount">
                      {familyFormData.sanda_amount_type === "yearly" ? "Yearly Amount (Rs.)" : "Monthly Amount (Rs.)"}
                    </Label>
                    <Input
                      id="sanda_amount"
                      type="number"
                      value={familyFormData.sanda_amount}
                      onChange={(e) => setFamilyFormData({ ...familyFormData, sanda_amount: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Zakat Status Section */}
              <div className="space-y-2">
                <Label htmlFor="zakat_status">Baithul Zakat Status</Label>
                <SearchableSelect
                  options={[
                    { value: "none", label: "None" },
                    { value: "given", label: "Zakat Given (Donor)" },
                    { value: "taker", label: "Zakat Taker (Recipient)" },
                  ]}
                  value={familyFormData.zakat_status}
                  onValueChange={(v) => setFamilyFormData({ ...familyFormData, zakat_status: v })}
                  placeholder="Select status"
                  searchPlaceholder="Search..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={familyFormData.notes}
                  onChange={(e) => setFamilyFormData({ ...familyFormData, notes: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full">
                {editingFamily ? "Update Family" : "Add Family"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={(open) => { setMemberDialogOpen(open); if (!open) resetMemberForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit Member" : "Add Family Member"}</DialogTitle>
            <DialogDescription>Enter member information below</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMemberSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member_name">Name *</Label>
              <Input
                id="member_name"
                value={memberFormData.name}
                onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <SearchableSelect
                  options={[
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                  ]}
                  value={memberFormData.gender}
                  onValueChange={(v) => setMemberFormData({ ...memberFormData, gender: v })}
                  placeholder="Select gender"
                  searchPlaceholder="Search..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={memberFormData.age}
                  onChange={(e) => setMemberFormData({ ...memberFormData, age: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <SearchableSelect
                options={[
                  { value: "Head", label: "Head" },
                  { value: "Wife", label: "Wife" },
                  { value: "Husband", label: "Husband" },
                  { value: "Son", label: "Son" },
                  { value: "Daughter", label: "Daughter" },
                  { value: "Father", label: "Father" },
                  { value: "Mother", label: "Mother" },
                  { value: "Brother", label: "Brother" },
                  { value: "Sister", label: "Sister" },
                  { value: "Other", label: "Other" },
                ]}
                value={memberFormData.relationship}
                onValueChange={(v) => setMemberFormData({ ...memberFormData, relationship: v })}
                placeholder="Select relationship"
                searchPlaceholder="Search..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={memberFormData.occupation}
                onChange={(e) => setMemberFormData({ ...memberFormData, occupation: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">
              {editingMember ? "Update Member" : "Add Member"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="mb-4 shadow-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, root number, or card number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0"
            />
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>All Families ({filteredFamilies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFamilies.length === 0 ? (
            <p className="text-center text-muted-foreground">No families found</p>
          ) : (
            <div className="space-y-3">
              {filteredFamilies.map((family) => (
                <div key={family.id} className="rounded-lg border border-border">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => handleToggleFamily(family.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{family.family_name}</p>
                        {getZakatStatusBadge(family.zakat_status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {family.root_no && `${family.root_no} • `}
                        {family.sanda_card_number && `Card: ${family.sanda_card_number} • `}
                        {family.address || "No address"}
                      </p>
                      {(family.phone || family.whatsapp_no) && (
                        <p className="text-sm text-muted-foreground">
                          {family.phone && `📞 ${family.phone}`}
                          {family.phone && family.whatsapp_no && " • "}
                          {family.whatsapp_no && `📱 ${family.whatsapp_no}`}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {family.total_members || 0} members
                        </Badge>
                        {family.sanda_amount && (
                          <Badge variant="outline" className="text-xs">
                            {family.sanda_amount_type === "yearly" ? "Yearly" : "Monthly"}: Rs. {Number(family.sanda_amount).toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); handleEditFamily(family); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteFamily(family.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      {expandedFamily === family.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {expandedFamily === family.id && (
                    <div className="border-t border-border p-4 bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Family Members</p>
                          {family.family_head_id && (
                            <Badge variant="outline" className="text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Head Selected
                            </Badge>
                          )}
                        </div>
                        <Button size="sm" onClick={() => openAddMemberDialog(family.id)}>
                          <Plus className="mr-1 h-3 w-3" />Add Member
                        </Button>
                      </div>
                      {members[family.id]?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No members added yet</p>
                      ) : (
                        <div className="space-y-2">
                          {members[family.id]?.map((member) => (
                            <div
                              key={member.id}
                              className={`flex items-center justify-between rounded-md border p-3 ${
                                family.family_head_id === member.id ? "border-primary bg-primary/5" : "border-border bg-background"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{member.name}</p>
                                  {family.family_head_id === member.id && (
                                    <Badge className="text-xs bg-primary">
                                      <Crown className="h-3 w-3 mr-1" />
                                      Head
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {member.relationship && `${member.relationship}`}
                                  {member.gender && ` • ${member.gender}`}
                                  {member.age && ` • ${member.age} years`}
                                  {member.occupation && ` • ${member.occupation}`}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {family.family_head_id !== member.id && (
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => handleSetFamilyHead(family.id, member.id, member.name)}
                                    title="Set as Family Head"
                                  >
                                    <Crown className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditMember(member)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDeleteMember(member)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
