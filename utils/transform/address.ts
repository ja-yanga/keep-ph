// Address Type Definition
export type T_Address = {
  user_address_id: string;
  user_id: string;
  user_address_label: string;
  user_address_line1: string;
  user_address_line2?: string | null;
  user_address_city: string;
  user_address_region: string;
  user_address_postal: string;
  user_address_is_default: boolean;
  user_address_created_at: string;
};

// Transformed Address Type
export type T_TransformedAddress = {
  id: string;
  userId: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postal: string;
  isDefault: boolean;
  createdAt: string;
};

// Transform function
export const transformAddress = (data: T_Address): T_TransformedAddress => {
  return {
    id: data.user_address_id || "",
    userId: data.user_id || "",
    label: data.user_address_label || "",
    line1: data.user_address_line1 || "",
    line2: data.user_address_line2 ?? null,
    city: data.user_address_city || "",
    region: data.user_address_region || "",
    postal: data.user_address_postal || "",
    isDefault: data.user_address_is_default ?? false,
    createdAt: data.user_address_created_at || "",
  };
};
