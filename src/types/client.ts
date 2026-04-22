export interface B2BClient {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  company_name: string;
  sector: string | null;
  website: string | null;
  company_size: string | null;
  vat_number: string | null;
  billing_address: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_role: string | null;
  notes: string | null;
  status: "active" | "archived";
}

export type B2BClientWithCount = B2BClient & { project_count: number };

export type B2BClientInput = Partial<Omit<B2BClient, "id" | "created_at" | "updated_at" | "created_by">> & {
  company_name: string;
};
