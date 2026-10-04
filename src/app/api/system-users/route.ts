import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { requirePermission, requireAdmin } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageSystemUsers'); 
  // Wait, if they don't have canManageSystemUsers, they might still be able to VIEW them if they are a manager?
  // User prompt: "Manager can login to the admin portal (but restrict creating user means Restriction in creating other manager)"
  // So maybe managers can see the users list? Let's just allow anyone with dashboard access to view, or just restrict to canManageSystemUsers.
  // Actually, I will just let anyone authenticated see them, or just admins.
  // Let's require them to be at least logged in, but we'll filter via the query.
  
  if (!auth.authorized) {
    // Let's check if they are at least authenticated
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const snap = await adminDb.collection('users')
      .where('role', 'in', ['SUPER_ADMIN', 'ADMIN', 'MANAGER'])
      .get();
      
    const users = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only admins/super_admins can create system users.
    const auth = await requirePermission(req, 'canManageSystemUsers');
    if (!auth.authorized) return NextResponse.json({ error: "Only administrators can create system users." }, { status: 403 });

    const data = await req.json();
    if (!data.email || !data.password || !data.name || !data.role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(data.role)) {
      return NextResponse.json({ error: "Invalid role for system user" }, { status: 400 });
    }

    // 1. Create the user in Firebase Auth
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: data.email,
        password: data.password,
        displayName: data.name,
      });
    } catch (error: any) {
      if (error.code === "auth/email-already-exists") {
        return NextResponse.json({ error: "A user with this email already exists." }, { status: 400 });
      }
      throw error;
    }

    // 2. Add to users collection
    const userDoc = {
      email: data.email,
      name: data.name,
      role: data.role,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    
    await adminDb.collection('users').doc(userRecord.uid).set(userDoc);

    // 3. Audit Log
    await adminDb.collection('auditLogs').add({
      timestamp: new Date().toISOString(),
      actorId: auth.uid,
      actorEmail: auth.email,
      actorRole: auth.role,
      action: 'CREATE_SYSTEM_USER',
      entityType: 'USER',
      entityId: userRecord.uid,
      description: `Created new system user ${data.email} with role ${data.role}`,
      module: 'Central Admin',
    });

    return NextResponse.json({ message: "System user created successfully", uid: userRecord.uid });
  } catch (error: any) {
    console.error("Error creating system user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requirePermission(req, 'canManageSystemUsers');
    if (!auth.authorized) return NextResponse.json({ error: "Only administrators can update system users." }, { status: 403 });

    const data = await req.json();
    const { id, name, role, status } = data;

    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (role) updates.role = role;
    if (status) updates.status = status;

    await adminDb.collection('users').doc(id).update(updates);

    if (name) {
      await adminAuth.updateUser(id, { displayName: name });
    }
    if (status) {
      // In Firebase Auth, disabled true/false controls login access
      await adminAuth.updateUser(id, { disabled: status.toLowerCase() === 'inactive' });
    }

    await adminDb.collection('auditLogs').add({
      timestamp: new Date().toISOString(),
      actorId: auth.uid,
      actorEmail: auth.email,
      actorRole: auth.role,
      action: 'UPDATE_SYSTEM_USER',
      entityType: 'USER',
      entityId: id,
      description: `Updated system user ${id}: ${JSON.stringify(updates)}`,
      module: 'Central Admin',
    });

    return NextResponse.json({ message: "System user updated successfully" });
  } catch (error: any) {
    console.error("Error updating system user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requirePermission(req, 'canManageSystemUsers');
    if (!auth.authorized) return NextResponse.json({ error: "Only administrators can delete system users." }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    // 1. Delete from Firestore
    await adminDb.collection('users').doc(id).delete();
    
    // 2. Delete from Firebase Auth
    await adminAuth.deleteUser(id);

    // 3. Audit Log
    await adminDb.collection('auditLogs').add({
      timestamp: new Date().toISOString(),
      actorId: auth.uid,
      actorEmail: auth.email,
      actorRole: auth.role,
      action: 'DELETE_SYSTEM_USER',
      entityType: 'USER',
      entityId: id,
      description: `Deleted system user ${id}`,
      module: 'Central Admin',
    });

    return NextResponse.json({ message: "System user deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting system user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
