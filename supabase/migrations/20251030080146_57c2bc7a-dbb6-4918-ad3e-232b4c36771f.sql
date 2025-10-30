-- Add root_no and monthly_sanda_amount to donors table
ALTER TABLE public.donors 
ADD COLUMN IF NOT EXISTS root_no text,
ADD COLUMN IF NOT EXISTS monthly_sanda_amount numeric;

-- Add year and months_paid to donations table for tracking monthly sanda
ALTER TABLE public.donations
ADD COLUMN IF NOT EXISTS year integer,
ADD COLUMN IF NOT EXISTS months_paid integer[];