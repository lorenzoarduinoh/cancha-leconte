'use client';

import React from 'react';

export function ReloadButton() {
  return (
    <button 
      onClick={() => window.location.reload()} 
      className="btn btn--primary"
    >
      Intentar nuevamente
    </button>
  );
}