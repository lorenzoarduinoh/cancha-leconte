'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin login
    router.push('/admin/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <LoadingSpinner size="lg" message="Redirigiendo al panel de administración..." />
    </div>
  );
}
