import React from 'react';

const getAuthenticatedUserName = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const candidates = [
    window.__PORTAL_USER__?.name,
    window.__ENTRA_USER__?.name,
    window.__MSAL_ACCOUNT__?.name,
    window.__USER__?.name,
    window.localStorage?.getItem('portalUserName')
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim()) || '';
};

const AuthButton = () => {
  const displayName = getAuthenticatedUserName();

  if (!displayName) {
    return <p className="signin-text">Signed in</p>;
  }

  return <p className="signin-text">Signed in as {displayName}</p>;
};

export default AuthButton;
