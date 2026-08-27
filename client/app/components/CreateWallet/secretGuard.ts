// Shared, React-free helpers for guarding an unsaved Stellar secret key.
//
// A freshly generated secret key is effectively unrecoverable: it is created
// in the browser and never sent anywhere, so if the user navigates away,
// refreshes, or closes the tab before saving it, the wallet is lost forever.
// These helpers back the acknowledgement + `beforeunload` guard used by
// CreateWallet.tsx, and are kept dependency-free so they can be unit tested.

export const ACKNOWLEDGEMENT_LABEL =
  "I have saved my secret key in a secure location";

// True while a secret exists that the user has not yet confirmed saving.
// Once this is false the wallet is no longer at risk from navigation.
export function secretAtRisk(secret: string, acknowledged: boolean): boolean {
  return Boolean(secret) && !acknowledged;
}

// Builds a `beforeunload` handler that triggers the browser's native
// "Leave site?" prompt only while `isAtRisk()` returns true. Modern browsers
// ignore any custom message, so this uses the standard no-text form:
// `preventDefault()` plus assigning `returnValue`.
export function createBeforeUnloadHandler(
  isAtRisk: () => boolean
): (event: BeforeUnloadEvent) => void {
  return (event: BeforeUnloadEvent) => {
    if (!isAtRisk()) return;
    event.preventDefault();
    event.returnValue = "";
  };
}
