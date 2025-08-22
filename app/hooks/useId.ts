'use client';

import { useId as reactUseId } from 'react';

// Use React's built-in useId hook which is SSR-safe
export const useId = reactUseId;