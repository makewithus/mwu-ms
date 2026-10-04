import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '../firebase/admin';
import { Role, hasPermission } from './rbac';

export async function verifyApiRequest(req: NextRequest): Promise<{ authorized: false; error: string } | { authorized: true; uid: string; role: Role; email?: string }> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('API Verification Error: Missing or invalid authorization header', authHeader);
      return { authorized: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err: any) {
      console.log('API Verification Error: Failed to verify ID token:', err.message);
      throw err;
    }
    
    // Fetch the user's role from the central DB
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return { authorized: false, error: 'User record not found in database' };
    }

    const userData = userDoc.data();
    return { 
      authorized: true, 
      uid: decodedToken.uid,
      role: userData?.role as Role,
      email: decodedToken.email
    };
  } catch (error) {
    console.error('API Verification Error:', error);
    return { authorized: false, error: 'Failed to verify token' };
  }
}

export async function requirePermission(req: NextRequest, permission: keyof typeof import('./rbac').RolePermissions.SUPER_ADMIN): Promise<{ authorized: false; error: string } | { authorized: true; uid: string; role: Role; email?: string }> {
  const result = await verifyApiRequest(req);
  
  if (!result.authorized) {
    return result;
  }

  if (!result.role) {
    return { authorized: false, error: 'Unauthorized: Missing role' };
  }

  if (!hasPermission(result.role, permission)) {
    return { authorized: false, error: 'Insufficient permissions' };
  }

  return result;
}
