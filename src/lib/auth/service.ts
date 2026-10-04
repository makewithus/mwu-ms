import { NextRequest } from 'next/server';

export function verifyServiceToken(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const serviceSecret = process.env.CENTRAL_ADMIN_SERVICE_SECRET;

  if (!serviceSecret) {
    console.error("CENTRAL_ADMIN_SERVICE_SECRET is not configured.");
    return false;
  }

  if (authHeader === `Bearer ${serviceSecret}`) {
    return true;
  }
  
  return false;
}
