import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { T_TransformedKycDetails } from "@/utils/transform/kyc-details";
import { T_TransformedAddress } from "@/utils/transform/address";

type T_User = {
  kycDetails: {
    kyc: T_TransformedKycDetails | null;
    error: string | null;
    success: string | null;
    loading: boolean;
  };
  addressDetails: {
    addresses: T_TransformedAddress[];
    error: string | null;
    success: string | null;
    loading: boolean;
  };
};

const initialState: T_User = {
  kycDetails: {
    kyc: null,
    error: null,
    success: null,
    loading: false,
  },
  addressDetails: {
    addresses: [],
    error: null,
    success: null,
    loading: false,
  },
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setKycDetails: (state, action) => {
      return {
        ...state,
        kycDetails: {
          ...state.kycDetails,
          kyc: {
            ...state.kycDetails.kyc,
            ...action.payload,
          },
        },
      };
    },
    setAddressDetails: (state, action) => {
      return {
        ...state,
        addressDetails: {
          ...state.addressDetails,
          addresses: action.payload,
        },
      };
    },
    setKycDetailsError: (
      state,
      action: PayloadAction<T_User["kycDetails"]["error"]>,
    ) => {
      state.kycDetails.error = action.payload;
    },
    setKycDetailsSuccess: (
      state,
      action: PayloadAction<T_User["kycDetails"]["success"]>,
    ) => {
      state.kycDetails.success = action.payload;
    },
    setKycDetailsLoading: (
      state,
      action: PayloadAction<T_User["kycDetails"]["loading"]>,
    ) => {
      state.kycDetails.loading = action.payload;
    },
    setAddressDetailsError: (
      state,
      action: PayloadAction<T_User["addressDetails"]["error"]>,
    ) => {
      state.addressDetails.error = action.payload;
    },
    setAddressDetailsSuccess: (
      state,
      action: PayloadAction<T_User["addressDetails"]["success"]>,
    ) => {
      state.addressDetails.success = action.payload;
    },
    setAddressDetailsLoading: (
      state,
      action: PayloadAction<T_User["addressDetails"]["loading"]>,
    ) => {
      state.addressDetails.loading = action.payload;
    },
  },
});

export const {
  setKycDetails,
  setKycDetailsError,
  setKycDetailsSuccess,
  setKycDetailsLoading,
  setAddressDetails,
  setAddressDetailsError,
  setAddressDetailsSuccess,
  setAddressDetailsLoading,
} = userSlice.actions;

export default userSlice.reducer;
