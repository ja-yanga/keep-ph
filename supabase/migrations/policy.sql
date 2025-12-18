CREATE POLICY USER_KYC_DOCUMENTS_POLICY
ON storage.objects
FOR ALL
USING (bucket_id = 'user-kyc-documents' AND owner = auth.uid());