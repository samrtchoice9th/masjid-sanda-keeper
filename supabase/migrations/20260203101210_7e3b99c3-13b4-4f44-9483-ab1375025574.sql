-- Add new columns to families table for the unified data model
ALTER TABLE public.families 
  ADD COLUMN IF NOT EXISTS whatsapp_no text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS sanda_card_number text,
  ADD COLUMN IF NOT EXISTS sanda_amount_type text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS sanda_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zakat_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS family_head_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL;

-- Add family_id to donations table (for linking donations to families)
ALTER TABLE public.donations 
  ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.families(id) ON DELETE CASCADE;

-- Add family_id to zakat_transactions table (for linking zakat to families)
ALTER TABLE public.zakat_transactions
  ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.families(id) ON DELETE SET NULL;

-- Migrate existing donors to families table
-- Each donor becomes a family with one member (the head)
DO $$
DECLARE
  donor_record RECORD;
  new_family_id uuid;
  new_member_id uuid;
BEGIN
  FOR donor_record IN SELECT * FROM public.donors LOOP
    -- Create family from donor
    INSERT INTO public.families (
      family_name, 
      address, 
      phone, 
      root_no, 
      whatsapp_no,
      sanda_card_number,
      sanda_amount_type,
      sanda_amount,
      total_members
    ) VALUES (
      donor_record.name,
      donor_record.address,
      donor_record.phone,
      donor_record.root_no,
      donor_record.whatsapp_no,
      donor_record.card_number,
      COALESCE(donor_record.payment_frequency, 'monthly'),
      COALESCE(donor_record.monthly_sanda_amount, 0),
      1
    )
    RETURNING id INTO new_family_id;
    
    -- Create family member (head) from donor
    INSERT INTO public.family_members (
      family_id,
      name,
      relationship
    ) VALUES (
      new_family_id,
      donor_record.name,
      'Head'
    )
    RETURNING id INTO new_member_id;
    
    -- Set the family head
    UPDATE public.families 
    SET family_head_id = new_member_id 
    WHERE id = new_family_id;
    
    -- Update donations to link to the new family
    UPDATE public.donations 
    SET family_id = new_family_id 
    WHERE donor_id = donor_record.id;
  END LOOP;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_families_sanda_card ON public.families(sanda_card_number);
CREATE INDEX IF NOT EXISTS idx_donations_family_id ON public.donations(family_id);
CREATE INDEX IF NOT EXISTS idx_zakat_transactions_family_id ON public.zakat_transactions(family_id);