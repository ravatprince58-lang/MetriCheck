export type AccessRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  organization: string;
  phone: string;
  productName: string;
  brandName: string;
  status: AccessRequestStatus;
  createdAt: string;
}

const STORAGE_KEY =
  'metricheck_inspector_access_requests';

function getStorage(): AccessRequest[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);

    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

function saveStorage(
  requests: AccessRequest[]
): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(requests)
  );

  window.dispatchEvent(
    new Event('metricheck-access-request-updated')
  );
}

export interface CreateAccessRequestInput {
  name: string;
  email: string;
  organization: string;
  phone: string;
  productName: string;
  brandName: string;
}

export function createAccessRequest(
  data: CreateAccessRequestInput
): AccessRequest {
  const requests = getStorage();

  const request: AccessRequest = {
    id:
      'inspector-' +
      Date.now() +
      '-' +
      Math.random()
        .toString(36)
        .substring(2, 8),

    name: data.name.trim(),
    email: data.email.trim(),
    organization: data.organization.trim(),
    phone: data.phone.trim(),
    productName: data.productName.trim(),
    brandName: data.brandName.trim(),

    status: 'pending',

    createdAt:
      new Date().toISOString(),
  };

  saveStorage([
    request,
    ...requests,
  ]);

  return request;
}

export function getAccessRequests(): AccessRequest[] {
  return getStorage();
}

export function getPendingAccessRequests(): AccessRequest[] {
  return getStorage().filter(
    (request) =>
      request.status === 'pending'
  );
}

export function updateAccessRequestStatus(
  id: string,
  status: AccessRequestStatus
): AccessRequest | null {
  const requests = getStorage();

  let updated: AccessRequest | null = null;

  const newRequests = requests.map(
    (request) => {
      if (request.id !== id) {
        return request;
      }

      updated = {
        ...request,
        status,
      };

      return updated;
    }
  );

  if (!updated) {
    return null;
  }

  saveStorage(newRequests);

  return updated;
}

export function deleteAccessRequest(
  id: string
): boolean {
  const requests = getStorage();

  const newRequests = requests.filter(
    (request) =>
      request.id !== id
  );

  if (
    newRequests.length ===
    requests.length
  ) {
    return false;
  }

  saveStorage(newRequests);

  return true;
}

export function deleteAllAccessRequests(): void {
  localStorage.removeItem(
    STORAGE_KEY
  );

  window.dispatchEvent(
    new Event(
      'metricheck-access-request-updated'
    )
  );
}