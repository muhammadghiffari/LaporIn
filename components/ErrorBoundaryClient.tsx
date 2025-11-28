'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const ErrorBoundary = dynamic(() => import('./ErrorBoundary'), {
  ssr: false,
  loading: () => null,
});

interface Props {
  children: ReactNode;
}

export default function ErrorBoundaryClient({ children }: Props) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}


