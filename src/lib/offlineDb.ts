// IndexedDB helper for Offline Civic Reporting and Sync
const DB_NAME = "CivicHero_Offline_DB";
const DB_VERSION = 1;
const STORE_NAME = "offline_reports";

export function initOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB failed to open:", event);
      reject(new Error("Could not open IndexedDB database."));
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

export async function addOfflineReport(report: any): Promise<number> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({ ...report, createdAtLocal: new Date().toISOString() });

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = (err) => {
      console.error("Error adding report to IndexedDB:", err);
      reject(err);
    };
  });
}

export async function getOfflineReports(): Promise<any[]> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = (err) => {
      reject(err);
    };
  });
}

export async function clearOfflineReports(): Promise<void> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (err) => {
      reject(err);
    };
  });
}

export async function deleteOfflineReport(id: number): Promise<void> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (err) => {
      reject(err);
    };
  });
}
