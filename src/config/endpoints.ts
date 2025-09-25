// Firebase Functions Cloud Run Endpoints Configuration
export const FIREBASE_ENDPOINTS = {
  // OTP Functions
  VERIFY_EMAIL_OTP: 'https://verifyuseremailotphttp-ivtinaswgq-uc.a.run.app',
  RESEND_EMAIL_OTP: 'https://resenduseremailotphttp-ivtinaswgq-uc.a.run.app',
  
  // Solana Functions
  SOLANA_CREATE_INTENT: 'https://solanacreateintent-ivtinaswgq-uc.a.run.app',
  SOLANA_CONFIRM_CORS: 'https://solanaconfirmcors-ivtinaswgq-uc.a.run.app',
  
  // Referral Functions
  REFERRAL_VALIDATE: 'https://referralvalidate-ivtinaswgq-uc.a.run.app',
} as const;

// Helper function to make authenticated requests to Firebase Functions
export const makeAuthenticatedRequest = async (
  url: string, 
  options: RequestInit = {},
  token?: string
): Promise<Response> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};
