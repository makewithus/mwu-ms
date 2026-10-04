export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card text-center p-8 w-full max-w-md">
        <h1 className="page-title mb-4">Unauthorized</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>You do not have permission to view this page.</p>
        <a href="/dashboard" className="btn btn-danger">
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
