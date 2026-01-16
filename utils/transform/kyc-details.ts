// Based on the transform pattern in notification.ts:
// - Define a raw input type
// - Define a transformed output type
// - Export a transformKycDetails function

export type T_RawKycDetails = {
  user?: {
    users_id?: string;
    users_email?: string | null;
    users_avatar_url?: string | null;
    [key: string]: unknown;
  };
  user_id?: string;
  user_kyc_id?: string;
  user_kyc_status?: string | null;
  user_kyc_id_number?: string | null;
  user_kyc_last_name?: string | null;
  user_kyc_created_at?: string | null;
  user_kyc_first_name?: string | null;
  user_kyc_updated_at?: string | null;
  user_kyc_id_back_url?: string | null;
  user_kyc_verified_at?: string | null;
  user_kyc_id_front_url?: string | null;
  user_kyc_submitted_at?: string | null;
  user_kyc_date_of_birth?: string | null;
  user_kyc_rejected_reason?: string | null;
  user_kyc_id_document_type?: string | null;
  user_kyc_agreements_accepted?: boolean;
  [key: string]: unknown;
};

export type T_TransformedKycDetails = {
  user: {
    id: string;
    email: string;
    avatarUrl: string | null;
  };
  id: string;
  status: string | null;
  idNumber: string | null;
  firstName: string;
  lastName: string;
  createdAt: string | null;
  updatedAt: string | null;
  verifiedAt: string | null;
  submittedAt: string | null;
  dateOfBirth: string | null;
  rejectedReason: string | null;
  idDocumentType: string | null;
  idFrontUrl: string | null;
  idBackUrl: string | null;
  agreementsAccepted: boolean;
};

export const transformKycDetails = (
  kycObj: T_RawKycDetails,
): T_TransformedKycDetails => {
  const first =
    kycObj.user_kyc_first_name ??
    kycObj.user_kyc_firstName ??
    kycObj.first_name ??
    kycObj.firstName ??
    "";
  const last =
    kycObj.user_kyc_last_name ??
    kycObj.user_kyc_lastName ??
    kycObj.last_name ??
    kycObj.lastName ??
    "";
  const email = (kycObj.user?.users_email as string) ?? "";
  const avatar_url = (kycObj.user?.users_avatar_url as string) ?? "";
  return {
    user: {
      id: (kycObj.user?.users_id as string) || (kycObj.user_id as string) || "",
      email: email,
      avatarUrl: avatar_url,
    },
    id: (kycObj.user_kyc_id as string) || "",
    firstName: first as string,
    lastName: last as string,
    status: kycObj.user_kyc_status ?? null,
    idNumber: kycObj.user_kyc_id_number ?? null,
    createdAt: kycObj.user_kyc_created_at ?? null,
    updatedAt: kycObj.user_kyc_updated_at ?? null,
    verifiedAt: kycObj.user_kyc_verified_at ?? null,
    submittedAt: kycObj.user_kyc_submitted_at ?? null,
    dateOfBirth: kycObj.user_kyc_date_of_birth ?? null,
    rejectedReason: kycObj.user_kyc_rejected_reason ?? null,
    idDocumentType: kycObj.user_kyc_id_document_type ?? null,
    idFrontUrl: kycObj.user_kyc_id_front_url ?? null,
    idBackUrl: kycObj.user_kyc_id_back_url ?? null,
    agreementsAccepted: !!kycObj.user_kyc_agreements_accepted,
  };
};
