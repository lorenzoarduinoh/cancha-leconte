'use client';

import React from 'react';

export function ReloadButton() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <button 
      onClick={handleReload}
      className="btn btn--primary"
    >
      Intentar nuevamente
    </button>
  );
}